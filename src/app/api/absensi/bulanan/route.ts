export const dynamic = 'force-dynamic';
// src/app/api/absensi/bulanan/route.ts
// GET: terima query params `month` (1-12) dan `year` (YYYY).
// Return rekap kehadiran per santri: jumlah hadir, total hari aktif, persentase.
// Total hari aktif = jumlah tanggal distinct yang memiliki SETIDAKNYA satu record
// absensi dalam bulan tersebut di seluruh santri.
// Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya.

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

  try {
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month')?.trim();
    const yearParam = searchParams.get('year')?.trim();

    const month = parseInt(monthParam ?? '', 10);
    const year = parseInt(yearParam ?? '', 10);

    if (
      !monthParam ||
      !yearParam ||
      isNaN(month) ||
      isNaN(year) ||
      month < 1 ||
      month > 12 ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json(
        { message: 'Parameter `month` (1-12) dan `year` (YYYY) wajib diisi dengan benar.' },
        { status: 400 }
      );
    }

    // Format range tanggal: YYYY-MM-01 s.d. YYYY-MM-last
    const monthStr = String(month).padStart(2, '0');
    const dateFrom = `${year}-${monthStr}-01`;
    // Akhir bulan: mulai bulan berikutnya minus satu hari
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateTo = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const classId = searchParams.get('class_id')?.trim();

    const supabase = createServerClient();

    // 1. Ambil semua santri aktif (filter per Tim_Quran jika perlu)
    let santriQuery = supabase
      .from('santri')
      .select('id, nama, nisn, gender, classes(name)')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (session.user.role === 'Tim_Quran') {
      santriQuery = santriQuery.eq('assigned_teacher_id', session.user.id);
    }

    if (classId) {
      santriQuery = santriQuery.eq('class_id', classId);
    }

    const { data: santriList, error: santriError } = await santriQuery;

    if (santriError) {
      console.error('Fetch santri error (bulanan):', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data santri.' },
        { status: 500 }
      );
    }

    if (!santriList || santriList.length === 0) {
      return NextResponse.json({ data: [], month, year, totalHariAktif: 0 }, { status: 200 });
    }

    const santriIds = (santriList as any[]).map((s) => s.id);

    // 2. Ambil semua records absensi 'Hadir' dalam rentang bulan untuk santri yang relevan
    const { data: attendances, error: attendError } = await supabase
      .from('attendances')
      .select('santri_id, date')
      .eq('status', 'Hadir')
      .gte('date', dateFrom)
      .lt('date', dateTo)
      .in('santri_id', santriIds);

    if (attendError) {
      console.error('Fetch attendances error (bulanan):', attendError);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi.' },
        { status: 500 }
      );
    }

    const records: { santri_id: string; date: string }[] = attendances ?? [];

    // 3. Hitung total hari aktif = distinct dates yang punya SETIDAKNYA satu record
    const uniqueDates = new Set(records.map((r) => r.date));
    const totalHariAktif = uniqueDates.size;

    // 4. Hitung jumlah hadir per santri
    const hadiMap: Record<string, number> = {};
    for (const r of records) {
      hadiMap[r.santri_id] = (hadiMap[r.santri_id] ?? 0) + 1;
    }

    // 5. Susun rekap per santri
    const data = (santriList as any[]).map((s) => {
      const jumlahHadir = hadiMap[s.id] ?? 0;
      const persentase =
        totalHariAktif > 0
          ? Math.round((jumlahHadir / totalHariAktif) * 10000) / 100
          : 0;

      return {
        id: s.id,
        nisn: s.nisn,
        nama: s.nama,
        gender: s.gender,
        kelas: s.classes?.name ?? '—',
        jumlahHadir,
        totalHariAktif,
        persentase,
      };
    });

    return NextResponse.json({ data, month, year, totalHariAktif }, { status: 200 });
  } catch (error) {
    console.error('Bulanan API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
