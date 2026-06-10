export const dynamic = 'force-dynamic';
// src/app/api/absensi/export/route.ts
// GET: Export data absensi bulanan ke Excel
// Query: month=YYYY-MM (wajib), class_id (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeAttendanceRows } from '@/lib/attendance';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';
import * as xlsx from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM
  const classId = searchParams.get('class_id');

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ message: 'Parameter month wajib (YYYY-MM)' }, { status: 400 });
  }

  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  try {
    const supabase = createServerClient();

    // Ambil santri
    let santriQ = supabase
      .from('santri')
      .select('id, nama, nisn, classes(name)')
      .eq('status', 'Aktif')
      .order('nama');

    if (shouldFilterByTeacher((session.user as any).role, request)) {
      const teacherId = getTeacherFilterId((session.user as any).role, request, (session.user as any).id);
      santriQ = santriQ.eq('assigned_teacher_id', teacherId);
    }
    if (classId) santriQ = santriQ.eq('class_id', classId);

    const { data: santriList } = await santriQ;
    if (!santriList?.length) {
      return NextResponse.json({ message: 'Tidak ada data siswa.' }, { status: 404 });
    }

    // Ambil absensi bulan ini
    const santriIds = santriList.map((s: any) => s.id);
    const { data: attendances } = await supabase
      .from('attendances')
      .select('id, santri_id, student_id, date, status')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    const normalizedAttendances = normalizeAttendanceRows(attendances ?? []).filter(
      (attendance: any) => attendance.santri_id && santriIds.includes(attendance.santri_id)
    );

    // Kumpulkan semua tanggal unik yang ada data
    const allDatesSet = new Set(normalizedAttendances.map((a: any) => a.date));
    const allDates = Array.from(allDatesSet).sort();

    // Build attendance map: santri_id → date → status
    const attMap = new Map<string, Map<string, string>>();
    for (const a of normalizedAttendances as any[]) {
      if (!attMap.has(a.santri_id)) attMap.set(a.santri_id, new Map());
      attMap.get(a.santri_id)!.set(a.date, a.status);
    }

    // Build Excel
    const wb = xlsx.utils.book_new();

    // Header row
    const headers = ['No', 'NISN', 'Nama', 'Kelas', ...allDates.map((d: string) => d.slice(5)), 'Hadir', 'Total'];
    const rows: (string | number)[][] = [];

    for (let i = 0; i < santriList.length; i++) {
      const s = santriList[i] as any;
      const row: (string | number)[] = [
        i + 1,
        s.nisn,
        s.nama,
        s.classes?.name ?? '—',
      ];
      let hadir = 0;
      for (const d of allDates) {
        const status = attMap.get(s.id)?.get(d);
        if (status === 'Hadir') { row.push('H'); hadir++; }
        else if (status) { row.push('A'); }
        else row.push('');
      }
      row.push(hadir, allDates.length);
      rows.push(row);
    }

    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 28 }, { wch: 12 },
      ...allDates.map(() => ({ wch: 6 })),
      { wch: 8 }, { wch: 8 },
    ];
    xlsx.utils.book_append_sheet(wb, ws, `Absensi ${month}`);

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="absensi_${month}.xlsx"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
