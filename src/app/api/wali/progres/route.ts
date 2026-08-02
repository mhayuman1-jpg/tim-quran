// src/app/api/wali/progres/route.ts
// GET: Ambil data progres siswa untuk wali murid (berdasarkan santri_id dari session)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { todayStr, dateToStrWITA } from '@/lib/time';

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

  function scoreToNumber(val?: string): number | null {
    if (!val) return null;
    const map: Record<string, number> = {
      'A': 95, 'B': 80, 'C': 65, 'D': 50,
      'L': 90, 'KL': 60, 'TL': 30, '✓': 75,
      'Baik': 80, 'Sangat Baik': 95, 'Perlu Perbaikan': 50,
    };
    if (map[val]) return map[val];
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
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

    // Ambil riwayat hafalan (10 terbaru yang sudah dinilai) beserta nama pengajar
    const { data: hafalanRaw } = await supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, teacher_id, users!hafalan_teacher_id_fkey(name)')
      .eq('student_id', santriId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    // Filter: hanya tampilkan yang sudah ada penilaian
    const hafalan = (hafalanRaw ?? []).filter((h) =>
      h.lancar || h.makhroj || h.tajwid
    ).slice(0, 10).map((h: any) => ({
      ...h,
      nama_pengajar: h.users?.name ?? null,
      users: undefined,
    }));

    // Ambil riwayat tahsin (10 terbaru yang sudah dinilai) beserta nama pengajar
    const { data: tahsinRaw } = await supabase
      .from('tahsin')
      .select('id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan, teacher_id, users!tahsin_teacher_id_fkey(name)')
      .eq('student_id', santriId)
      .order('created_at', { ascending: false });

    // Filter: hanya tampilkan yang sudah ada penilaian
    const tahsin = (tahsinRaw ?? []).filter((t) =>
      t.makhroj || t.kelancaran || t.adab
    ).slice(0, 10).map((t: any) => ({
      ...t,
      nama_pengajar: t.users?.name ?? null,
      users: undefined,
    }));

    // Tentukan rentang tanggal untuk grafik (Senin - Minggu)
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    let startDate: Date;
    if (fromParam) {
      startDate = new Date(fromParam + 'T00:00:00Z');
    } else {
      startDate = new Date(todayStr() + 'T00:00:00Z');
      const day = startDate.getUTCDay();
      startDate.setUTCDate(startDate.getUTCDate() - (day === 0 ? 6 : day - 1));
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const startDateStr = dateToStrWITA(startDate);
    const endDateStr = dateToStrWITA(endDate);

    // Ambil data hari libur dalam rentang
    const { data: holidays } = await supabase
      .from('holiday_calendar')
      .select('date, keterangan')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    const holidayMap: Record<string, string> = {};
    (holidays ?? []).forEach((h: any) => {
      holidayMap[h.date] = h.keterangan;
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

    // Ambil ringkasan absensi (bulan berjalan)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: absensi } = await supabase
      .from('attendances')
      .select('status')
      .eq('student_id', santriId)
      .gte('date', firstDay);

    // Hitung ringkasan
    const ringkasan = {
      total_hafalan: hafalan.length,
      total_tahsin: tahsin.length,
      total_absensi: absensi?.length ?? 0,
      absensi_hadir: absensi?.filter(a => a.status === 'Hadir').length ?? 0,
    };

    // Hitung rata-rata tahfidz & tahsin 7 hari terakhir

    // Build data per tanggal untuk 7 hari terakhir
    const chartHafalanPerDate: Record<string, { total: number; count: number }> = {};
    const chartTahsinPerDate: Record<string, { total: number; count: number }> = {};

    (allHafalan ?? []).forEach((h: any) => {
      const scores = [scoreToNumber(h.makhroj), scoreToNumber(h.tajwid), scoreToNumber(h.lancar)].filter(s => s !== null) as number[];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (!chartHafalanPerDate[h.tanggal]) chartHafalanPerDate[h.tanggal] = { total: 0, count: 0 };
        chartHafalanPerDate[h.tanggal].total += avg;
        chartHafalanPerDate[h.tanggal].count += 1;
      }
    });

    (allTahsin ?? []).forEach((t: any) => {
      const scores = [scoreToNumber(t.makhroj), scoreToNumber(t.kelancaran), scoreToNumber(t.adab)].filter(s => s !== null) as number[];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (!chartTahsinPerDate[t.tanggal]) chartTahsinPerDate[t.tanggal] = { total: 0, count: 0 };
        chartTahsinPerDate[t.tanggal].total += avg;
        chartTahsinPerDate[t.tanggal].count += 1;
      }
    });

    // Generate array 7 hari
    const chartData: { tanggal: string; label: string; tahfidz: number; tahsin: number; keterangan?: string; isWeekend: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = dateToStrWITA(d);
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });
      const hData = chartHafalanPerDate[dateStr];
      const tData = chartTahsinPerDate[dateStr];
      const isWeekend = d.getUTCDay() === 5 || d.getUTCDay() === 6 || d.getUTCDay() === 0;
      const kabidKeterangan = holidayMap[dateStr];
      chartData.push({
        tanggal: dateStr,
        label,
        tahfidz: isWeekend ? 0 : (hData ? Math.round(hData.total / hData.count) : 0),
        tahsin: isWeekend ? 0 : (tData ? Math.round(tData.total / tData.count) : 0),
        keterangan: isWeekend ? (kabidKeterangan || 'Libur Akhir Pekan') : kabidKeterangan,
        isWeekend,
      });
    }

    // Rata-rata keseluruhan 7 hari
    const allHafalanAvgs = chartData.map(c => c.tahfidz).filter(v => v > 0);
    const allTahsinAvgs = chartData.map(c => c.tahsin).filter(v => v > 0);
    const rataRataTahfidz = allHafalanAvgs.length > 0
      ? Math.round(allHafalanAvgs.reduce((a, b) => a + b, 0) / allHafalanAvgs.length)
      : 0;
    const rataRataTahsin = allTahsinAvgs.length > 0
      ? Math.round(allTahsinAvgs.reduce((a, b) => a + b, 0) / allTahsinAvgs.length)
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
