// src/app/api/wali/progres/route.ts
// GET: Ambil data progres siswa untuk wali murid (berdasarkan santri_id dari session)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getRecordScoreAverage, normalizeDateStr } from '@/lib/surahData';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'Wali_Murid') {
    return NextResponse.json(
      { message: 'Akses ditolak. Silakan login sebagai Wali Murid.' },
      { status: 401 }
    );
  }

  const santriId = session.user.santri_id;
  if (!santriId) {
    return NextResponse.json(
      { message: 'Data santri tidak ditemukan pada akun ini.' },
      { status: 404 }
    );
  }

  try {
    const supabase = createServerClient();

    // Ambil data santri
    const { data: santri, error: santriErr } = await supabase
      .from('santri')
      .select('id, nisn, nama, gender, tanggal_lahir, status, classes ( id, name )')
      .eq('id', santriId)
      .single();

    if (santriErr || !santri) {
      return NextResponse.json(
        { message: 'Data santri tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Ambil seluruh riwayat hafalan yang sudah dinilai, terbaru lebih dulu
    const { data: hafalanRaw } = await supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, teacher_id, users!hafalan_teacher_id_fkey(name)')
      .eq('student_id', santriId)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    const hafalan = (hafalanRaw ?? []).filter((h) =>
      h.lancar || h.makhroj || h.tajwid
    ).map((h: any) => ({
      ...h,
      nama_pengajar: h.users?.name ?? null,
      users: undefined,
    }));

    // Ambil seluruh riwayat tahsin yang sudah dinilai, terbaru lebih dulu
    const { data: tahsinRaw } = await supabase
      .from('tahsin')
      .select('id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan, teacher_id, users!tahsin_teacher_id_fkey(name)')
      .eq('student_id', santriId)
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    const tahsin = (tahsinRaw ?? []).filter((t) =>
      t.makhroj || t.kelancaran || t.adab
    ).map((t: any) => ({
      ...t,
      nama_pengajar: t.users?.name ?? null,
      users: undefined,
    }));

    // Tentukan rentang tanggal untuk grafik (Senin - Minggu) — WITA (Asia/Makassar)
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const todayWitaStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());
    let startDate: Date;
    if (fromParam) {
      startDate = new Date(fromParam + 'T00:00:00Z');
    } else {
      startDate = new Date(todayWitaStr + 'T00:00:00Z');
      const day = startDate.getUTCDay();
      startDate.setUTCDate(startDate.getUTCDate() - (day === 0 ? 6 : day - 1));
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Ambil data hari libur dalam rentang
    const { data: holidays } = await supabase
      .from('holiday_calendar')
      .select('date, keterangan')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    const holidayMap: Record<string, string> = {};
    (holidays ?? []).forEach((h: any) => {
      holidayMap[normalizeDateStr(h.date)] = h.keterangan;
    });

    const { data: allHafalan } = await supabase
      .from('hafalan')
      .select('id, tanggal, makhroj, tajwid, lancar')
      .eq('student_id', santriId)
      .gte('tanggal', startDateStr)
      .lte('tanggal', endDateStr)
      .order('tanggal', { ascending: true });

    const { data: allTahsin } = await supabase
      .from('tahsin')
      .select('id, tanggal, makhroj, kelancaran, adab')
      .eq('student_id', santriId)
      .gte('tanggal', startDateStr)
      .lte('tanggal', endDateStr)
      .order('tanggal', { ascending: true });

    // Ambil raport quran
    const { data: raport } = await supabase
      .from('raport_quran')
      .select('id, periode, makhroj, tajwid, lancar, catatan')
      .eq('student_id', santriId)
      .order('created_at', { ascending: false });

    // Ambil ringkasan absensi (bulan berjalan) — WITA
    const firstDay = todayWitaStr.slice(0, 7) + '-01';
    const { data: absensi } = await supabase
      .from('attendances')
      .select('status')
      .eq('santri_id', santriId)
      .gte('date', firstDay);

    // Hitung ringkasan
    const totalHafalanGraded = (hafalanRaw ?? []).filter((h) =>
      h.lancar || h.makhroj || h.tajwid
    ).length;
    const totalTahsinGraded = (tahsinRaw ?? []).filter((t) =>
      t.makhroj || t.kelancaran || t.adab
    ).length;

    const ringkasan = {
      total_hafalan: totalHafalanGraded,
      total_tahsin: totalTahsinGraded,
      total_absensi: absensi?.length ?? 0,
      absensi_hadir: absensi?.filter(a => a.status === 'Hadir').length ?? 0,
    };

    // Rata-rata kartu: seluruh catatan berpenilaian (bukan hanya minggu ini)
    const hafalanAllScores = (hafalanRaw ?? [])
      .map((h: any) => getRecordScoreAverage(h.makhroj, h.tajwid, h.lancar))
      .filter((v): v is number => v !== null);
    const tahsinAllScores = (tahsinRaw ?? [])
      .map((t: any) => getRecordScoreAverage(t.makhroj, t.kelancaran, t.adab))
      .filter((v): v is number => v !== null);

    // Build data per tanggal untuk grafik 7 hari
    const chartHafalanPerDate: Record<string, { total: number; count: number }> = {};
    const chartTahsinPerDate: Record<string, { total: number; count: number }> = {};

    (allHafalan ?? []).forEach((h: any) => {
      const avg = getRecordScoreAverage(h.makhroj, h.tajwid, h.lancar);
      if (avg === null) return;
      const dateKey = normalizeDateStr(h.tanggal);
      if (!chartHafalanPerDate[dateKey]) chartHafalanPerDate[dateKey] = { total: 0, count: 0 };
      chartHafalanPerDate[dateKey].total += avg;
      chartHafalanPerDate[dateKey].count += 1;
    });

    (allTahsin ?? []).forEach((t: any) => {
      const avg = getRecordScoreAverage(t.makhroj, t.kelancaran, t.adab);
      if (avg === null) return;
      const dateKey = normalizeDateStr(t.tanggal);
      if (!chartTahsinPerDate[dateKey]) chartTahsinPerDate[dateKey] = { total: 0, count: 0 };
      chartTahsinPerDate[dateKey].total += avg;
      chartTahsinPerDate[dateKey].count += 1;
    });

    // Generate array 7 hari
    const chartData: { tanggal: string; label: string; tahfidz: number; tahsin: number; keterangan?: string; isWeekend: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
      const hData = chartHafalanPerDate[dateStr];
      const tData = chartTahsinPerDate[dateStr];
      const dow = d.getUTCDay();
      const isWeekend = dow === 5 || dow === 6 || dow === 0;
      const kabidKeterangan = holidayMap[dateStr];
      const tahfidzScore = hData ? Math.round(hData.total / hData.count) : 0;
      const tahsinScore = tData ? Math.round(tData.total / tData.count) : 0;
      chartData.push({
        tanggal: dateStr,
        label,
        tahfidz: tahfidzScore,
        tahsin: tahsinScore,
        keterangan: kabidKeterangan
          ?? (isWeekend && tahfidzScore === 0 && tahsinScore === 0 ? 'Libur Akhir Pekan' : undefined),
        isWeekend,
      });
    }

    const rataRataTahfidz = hafalanAllScores.length > 0
      ? Math.round(hafalanAllScores.reduce((a, b) => a + b, 0) / hafalanAllScores.length)
      : 0;
    const rataRataTahsin = tahsinAllScores.length > 0
      ? Math.round(tahsinAllScores.reduce((a, b) => a + b, 0) / tahsinAllScores.length)
      : 0;

    const isMingguIni = !fromParam;

    return NextResponse.json({
      santri,
      hafalan: hafalan ?? [],
      tahsin: tahsin ?? [],
      raport: raport ?? [],
      ringkasan,
      chartData,
      rataRataTahfidz,
      rataRataTahsin,
      startDate: startDateStr,
      endDate: endDateStr,
      isMingguIni,
    });
  } catch (error) {
    console.error('Route error /api/wali/progres:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
