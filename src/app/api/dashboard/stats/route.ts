// src/app/api/dashboard/stats/route.ts
// GET: return statistik dashboard dalam satu response:
//   - total santri aktif
//   - persentase kehadiran hari ini (hadir/total aktif Ã— 100, boleh >100%)
//   - ringkasan juz (count per juz_terakhir)
//   - jumlah Tim_Quran aktif

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    // 1. Total santri aktif
    const { count: totalSantriAktif, error: santriError } = await supabase
      .from('santri')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Aktif');

    if (santriError) {
      console.error('Fetch total santri error:', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data santri.' },
        { status: 500 }
      );
    }

    const totalAktif = totalSantriAktif ?? 0;

    // 2. Jumlah santri hadir hari ini
    const { count: totalHadir, error: hadirError } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'Hadir');

    if (hadirError) {
      console.error('Fetch attendance hari ini error:', hadirError);
      return NextResponse.json(
        { message: 'Gagal mengambil data kehadiran hari ini.' },
        { status: 500 }
      );
    }

    // Hitung persentase kehadiran â€” tampilkan apa adanya meski >100%
    const hadirHariIni = totalHadir ?? 0;
    const persentaseKehadiran =
      totalAktif > 0
        ? parseFloat(((hadirHariIni / totalAktif) * 100).toFixed(2))
        : 0;

    // 3. Ringkasan juz: count per juz_terakhir untuk santri aktif
    const { data: santriJuz, error: juzError } = await supabase
      .from('santri')
      .select('juz_terakhir')
      .eq('status', 'Aktif');

    if (juzError) {
      console.error('Fetch ringkasan juz error:', juzError);
      return NextResponse.json(
        { message: 'Gagal mengambil data ringkasan juz.' },
        { status: 500 }
      );
    }

    // Agregasi count per juz_terakhir
    const juzMap: Record<number, number> = {};
    for (const row of santriJuz ?? []) {
      const juz = row.juz_terakhir as number;
      juzMap[juz] = (juzMap[juz] ?? 0) + 1;
    }
    const ringkasanJuz = Object.entries(juzMap)
      .map(([juz, count]) => ({ juz: Number(juz), count }))
      .sort((a, b) => a.juz - b.juz);

    // 4. Jumlah Tim_Quran aktif
    const { count: totalTim, error: timError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'Tim_Quran')
      .eq('status', 'Aktif');

    if (timError) {
      console.error('Fetch Tim_Quran error:', timError);
      return NextResponse.json(
        { message: 'Gagal mengambil data Tim Qur\'an.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        totalSantriAktif: totalAktif,
        kehadiranHariIni: {
          hadir: hadirHariIni,
          total: totalAktif,
          persentase: persentaseKehadiran,
        },
        ringkasanJuz,
        jumlahTimAktif: totalTim ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
