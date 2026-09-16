import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';
import * as xlsx from 'xlsx';

export const dynamic = 'force-dynamic';

const METODE_TAHSIN = ['IWR', 'Wafa', 'Al-Quran'] as const;

function normalizeTahsinBook(metode: string, buku: string | null): string {
  const bookName = buku?.trim() ?? '';
  if (metode === 'IWR' && /^[1-4]$/.test(bookName)) return `Jilid ${bookName}`;
  return bookName || 'Tanpa jilid/surah';
}

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const classId = searchParams.get('class_id')?.trim() ?? '';

    let studentQuery = supabase
      .from('santri')
      .select('id, nama, nisn, class_id, juz_terakhir')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const classIds = await getTeacherClassIds(supabase, teacherId);
      studentQuery = applyTeacherSantriFilter(studentQuery, teacherId, classIds, classId);
    }

    if (classId) studentQuery = studentQuery.eq('class_id', classId);
    if (search) studentQuery = studentQuery.ilike('nama', `%${search}%`);

    const { data: students, error: studentsError } = await studentQuery;
    if (studentsError) return NextResponse.json({ message: studentsError.message }, { status: 500 });

    const studentList = students ?? [];
    const studentIds = studentList.map((student) => student.id);
    const classIds = Array.from(new Set(studentList.map((student) => student.class_id).filter(Boolean)));
    const { data: classes, error: classesError } = classIds.length > 0
      ? await supabase.from('classes').select('id, name').in('id', classIds)
      : { data: [], error: null };

    if (classesError) return NextResponse.json({ message: classesError.message }, { status: 500 });

    const classNameById = new Map((classes ?? []).map((kelas) => [kelas.id, kelas.name]));
    const { data: tahsinData, error: tahsinError } = studentIds.length > 0
      ? await supabase.rpc('latest_tahsin_for_students', { student_ids: studentIds })
      : { data: [], error: null };

    if (tahsinError) return NextResponse.json({ message: tahsinError.message }, { status: 500 });

    const latestTahsinByStudent = new Map<string, { metode: string; buku: string | null; tanggal: string }>();
    for (const tahsin of tahsinData ?? []) {
      latestTahsinByStudent.set(tahsin.student_id, tahsin);
    }

    const tahfidzRows: Array<[string, string, string, string]> = [];
    const tahsinRows: Array<[string, string, string, string, string, string]> = [];
    const tahfidzTotals = new Map<string, number>();
    const tahsinTotals = new Map<string, number>();
    let withoutTahsinJournal = 0;

    for (const student of studentList) {
      const kelas = classNameById.get(student.class_id) ?? 'Tanpa Kelas';
      const juz = student.juz_terakhir?.trim() || 'Belum diisi';
      tahfidzRows.push([juz, student.nama, student.nisn, kelas]);
      tahfidzTotals.set(juz, (tahfidzTotals.get(juz) ?? 0) + 1);

      const tahsin = latestTahsinByStudent.get(student.id);
      if (!tahsin || !METODE_TAHSIN.includes(tahsin.metode as typeof METODE_TAHSIN[number])) {
        withoutTahsinJournal += 1;
        continue;
      }

      const buku = normalizeTahsinBook(tahsin.metode, tahsin.buku);
      tahsinRows.push([tahsin.metode, buku, student.nama, student.nisn, kelas, tahsin.tanggal]);
      tahsinTotals.set(tahsin.metode, (tahsinTotals.get(tahsin.metode) ?? 0) + 1);
    }

    tahfidzRows.sort((left, right) => left[0].localeCompare(right[0], 'id', { numeric: true }) || left[1].localeCompare(right[1], 'id'));
    tahsinRows.sort((left, right) => left[0].localeCompare(right[0], 'id') || left[1].localeCompare(right[1], 'id') || left[2].localeCompare(right[2], 'id'));

    const summaryRows: Array<Array<string | number>> = [
      ['Evaluasi Tahfidz & Tahsin Siswa'],
      ['Total Siswa Aktif', studentList.length],
      [],
      ['Tahfidz berdasarkan Juz Saat Ini', 'Total Siswa'],
      ...Array.from(tahfidzTotals.entries())
        .sort((left, right) => left[0].localeCompare(right[0], 'id', { numeric: true }))
        .map(([juz, total]) => [`Juz ${juz}`, total]),
      [],
      ['Tahsin berdasarkan Jurnal Terbaru', 'Total Siswa'],
      ...METODE_TAHSIN.map((metode) => [metode, tahsinTotals.get(metode) ?? 0]),
      ['Belum ada jurnal tahsin', withoutTahsinJournal],
    ];

    const workbook = xlsx.utils.book_new();
    const summarySheet = xlsx.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 36 }, { wch: 14 }];
    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

    const tahfidzSheet = xlsx.utils.aoa_to_sheet([
      ['Juz Saat Ini', 'Nama Siswa', 'NIS/NISN', 'Kelas'],
      ...tahfidzRows,
    ]);
    tahfidzSheet['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 18 }];
    xlsx.utils.book_append_sheet(workbook, tahfidzSheet, 'Detail Tahfidz');

    const tahsinSheet = xlsx.utils.aoa_to_sheet([
      ['Metode Tahsin', 'Jilid / Surah', 'Nama Siswa', 'NIS/NISN', 'Kelas', 'Tanggal Jurnal Terbaru'],
      ...tahsinRows,
    ]);
    tahsinSheet['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 24 }];
    xlsx.utils.book_append_sheet(workbook, tahsinSheet, 'Detail Tahsin');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = `evaluasi_tahfidz_tahsin_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Route error /api/siswa/evaluasi-export:', error);
    return NextResponse.json({ message: 'Gagal membuat Excel evaluasi.' }, { status: 500 });
  }
}