export const dynamic = 'force-dynamic';
// src/app/api/laporan/tim/route.ts
// GET: Laporan progres siswa per Tim_Quran (Kabid only)
// Query param: teacher_id (required)
// Return: daftar siswa yang dibina beserta ringkasan progres
//   - total setoran hafalan
//   - total sesi tahsin
//   - persentase kehadiran
//   - sertakan siswa dengan aktivitas nol

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  // Hanya Kabid yang dapat mengakses
  if (session.user.role !== 'Kabid') {
    return NextResponse.json(
      { message: 'Akses tidak diizinkan.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id')?.trim();

    if (!teacherId) {
      return NextResponse.json(
        { message: 'Parameter teacher_id wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Ambil semua siswa yang dibina oleh teacher_id ini
    const { data: santriList, error: santriError } = await supabase
      .from('santri')
      .select('id, nisn, nama, gender, juz_terakhir, classes ( id, name )')
      .eq('assigned_teacher_id', teacherId)
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (santriError) {
      console.error('Fetch santri error (laporan tim):', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data siswa.' },
        { status: 500 }
      );
    }

    if (!santriList || santriList.length === 0) {
      // Tidak ada siswa yang dibina oleh tim ini
      return NextResponse.json(
        {
          teacher_id: teacherId,
          students: [],
          summary: {
            total_students: 0,
            students_with_hafalan: 0,
            students_with_tahsin: 0,
            students_with_attendance: 0,
          },
        },
        { status: 200 }
      );
    }

    const studentIds = santriList.map((s) => s.id);

    // 2. Hitung total setoran hafalan per siswa
    const { data: hafalanData, error: hafalanError } = await supabase
      .from('hafalan')
      .select('student_id')
      .in('student_id', studentIds);

    if (hafalanError) {
      console.error('Fetch hafalan error (laporan tim):', hafalanError);
      return NextResponse.json(
        { message: 'Gagal mengambil data hafalan.' },
        { status: 500 }
      );
    }

    const hafalanCountMap: Record<string, number> = {};
    for (const h of hafalanData ?? []) {
      const sid = h.student_id as string;
      hafalanCountMap[sid] = (hafalanCountMap[sid] ?? 0) + 1;
    }

    // 3. Hitung total sesi tahsin per siswa
    const { data: tahsinData, error: tahsinError } = await supabase
      .from('tahsin')
      .select('student_id')
      .in('student_id', studentIds);

    if (tahsinError) {
      console.error('Fetch tahsin error (laporan tim):', tahsinError);
      return NextResponse.json(
        { message: 'Gagal mengambil data tahsin.' },
        { status: 500 }
      );
    }

    const tahsinCountMap: Record<string, number> = {};
    for (const t of tahsinData ?? []) {
      const sid = t.student_id as string;
      tahsinCountMap[sid] = (tahsinCountMap[sid] ?? 0) + 1;
    }

    // 4. Hitung total hari aktif (distinct date dari semua absensi di database)
    // Karena kita ingin persentase kehadiran, kita perlu total hari aktif
    // Asumsi: total hari aktif = jumlah distinct date dari semua absensi
    const { data: allDates, error: datesError } = await supabase
      .from('attendances')
      .select('date')
      .order('date', { ascending: true });

    if (datesError) {
      console.error('Fetch dates error (laporan tim):', datesError);
      return NextResponse.json(
        { message: 'Gagal mengambil data kehadiran.' },
        { status: 500 }
      );
    }

    // Hitung distinct dates
    const distinctDates = new Set<string>();
    for (const record of allDates ?? []) {
      distinctDates.add(record.date as string);
    }
    const totalHariAktif = distinctDates.size;

    // 5. Hitung kehadiran per siswa
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendances')
      .select('student_id, date, status')
      .in('student_id', studentIds)
      .eq('status', 'Hadir');

    if (attendanceError) {
      console.error('Fetch attendance error (laporan tim):', attendanceError);
      return NextResponse.json(
        { message: 'Gagal mengambil data kehadiran.' },
        { status: 500 }
      );
    }

    // Hitung distinct date per siswa (berapa hari siswa hadir)
    const attendanceCountMap: Record<string, Set<string>> = {};
    for (const a of attendanceData ?? []) {
      const sid = a.student_id as string;
      const date = a.date as string;
      if (!attendanceCountMap[sid]) {
        attendanceCountMap[sid] = new Set();
      }
      attendanceCountMap[sid].add(date);
    }

    // 6. Gabungkan semua data
    const studentsWithProgress = santriList.map((santri) => {
      const totalHafalan = hafalanCountMap[santri.id] ?? 0;
      const totalTahsin = tahsinCountMap[santri.id] ?? 0;
      const daysPresent = attendanceCountMap[santri.id]?.size ?? 0;
      const persentaseKehadiran =
        totalHariAktif > 0
          ? parseFloat(((daysPresent / totalHariAktif) * 100).toFixed(2))
          : 0;

      return {
        id: santri.id,
        nisn: santri.nisn,
        nama: santri.nama,
        gender: santri.gender,
        juz_terakhir: santri.juz_terakhir,
        kelas: santri.classes ? (santri.classes as any).name : null,
        total_hafalan: totalHafalan,
        total_tahsin: totalTahsin,
        persentase_kehadiran: persentaseKehadiran,
        days_present: daysPresent,
        total_days: totalHariAktif,
      };
    });

    // 7. Hitung summary
    const summary = {
      total_students: studentsWithProgress.length,
      students_with_hafalan: studentsWithProgress.filter((s) => s.total_hafalan > 0).length,
      students_with_tahsin: studentsWithProgress.filter((s) => s.total_tahsin > 0).length,
      students_with_attendance: studentsWithProgress.filter((s) => s.days_present > 0).length,
    };

    return NextResponse.json(
      {
        teacher_id: teacherId,
        students: studentsWithProgress,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Laporan tim API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
