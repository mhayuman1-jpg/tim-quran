// src/app/api/absensi/harian/route.ts
// GET: terima query param `date` (YYYY-MM-DD), return daftar semua santri
// beserta status hadir/tidak hadir pada tanggal tersebut.
// Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeAttendanceRows } from '@/lib/attendance';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date')?.trim();

    // Validasi format tanggal YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: 'Parameter `date` wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const classId = searchParams.get('class_id')?.trim();

    const supabase = createServerClient();

    // 1. Ambil semua santri (filter per Tim_Quran jika perlu)
    let santriQuery = supabase
      .from('santri')
      .select('id, nama, nisn, gender, classes(name)')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      santriQuery = santriQuery.eq('assigned_teacher_id', teacherId);
    }

    if (classId) {
      santriQuery = santriQuery.eq('class_id', classId);
    }

    const { data: santriList, error: santriError } = await santriQuery;

    if (santriError) {
      console.error('Fetch santri error (harian):', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data santri.' },
        { status: 500 }
      );
    }

    if (!santriList || santriList.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 2. Ambil records absensi pada tanggal tersebut
    const santriIds = santriList.map((s: any) => s.id);

    const { data: attendances, error: attendError } = await supabase
      .from('attendances')
      .select('id, santri_id, student_id, date, status')
      .eq('date', date);

    if (attendError) {
      console.error('Fetch attendances error (harian):', attendError);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi.' },
        { status: 500 }
      );
    }

    const normalizedAttendances = normalizeAttendanceRows(attendances);

    // 3. Buat map santri_id → status hadir
    const hadir = new Set<string>();
    for (const attendance of normalizedAttendances) {
      if (!attendance.santri_id) continue;
      if (!santriIds.includes(attendance.santri_id)) continue;
      if (attendance.status === 'Hadir') {
        hadir.add(attendance.santri_id);
      }
    }

    // 4. Gabungkan: setiap santri dengan status hadir/tidak hadir
    const result = (santriList as any[]).map((s) => ({
      id: s.id,
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender,
      kelas: s.classes?.name ?? 'â€”',
      status: hadir.has(s.id) ? 'Hadir' : 'Tidak Hadir',
    }));

    return NextResponse.json({ data: result, date }, { status: 200 });
  } catch (error) {
    console.error('Harian API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
