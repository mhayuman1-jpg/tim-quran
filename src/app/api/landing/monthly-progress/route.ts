export const dynamic = 'force-dynamic';
// src/app/api/landing/monthly-progress/route.ts
// GET: Hitung progres tahfidz dan tahsin per siswa per bulan
// Menghitung rata-rata penilaian dari data harian

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

function getNilaiNumeric(nilai: string | null): number {
  if (!nilai) return 0;
  if (nilai === '✓') return 100;
  if (nilai === 'A') return 85;
  if (nilai === 'B') return 70;
  if (nilai === 'C') return 55;
  if (nilai === 'D') return 40;
  return 0;
}

function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    return { label, key };
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const months = getSixMonthRange();
    const firstMonth = months[0].key;
    const [firstYear, firstMonthNumber] = firstMonth.split('-');
    const fromDate = `${firstYear}-${firstMonthNumber}-01`;

    const lastMonth = months[months.length - 1].key;
    const [lastYear, lastMonthNumber] = lastMonth.split('-');
    const nextLastMonth = new Date(Number(lastYear), Number(lastMonthNumber), 1);
    const toDate = `${nextLastMonth.getFullYear()}-${String(nextLastMonth.getMonth() + 1).padStart(2, '0')}-01`;

    // Ambil semua data tahfidz dalam 6 bulan terakhir
    const { data: tahfidzData, error: tahfidzError } = await supabase
      .from('tahfidz')
      .select('tanggal, makhroj, tajwid, lancar')
      .gte('tanggal', fromDate)
      .lt('tanggal', toDate);

    if (tahfidzError) {
      console.error('[Landing] Fetch tahfidz error:', tahfidzError);
      return NextResponse.json(
        { message: 'Gagal mengambil data tahfidz.' },
        { status: 500 }
      );
    }

    // Ambil semua data tahsin dalam 6 bulan terakhir
    const { data: tahsinData, error: tahsinError } = await supabase
      .from('tahsin')
      .select('tanggal, makhroj, kelancaran, adab')
      .gte('tanggal', fromDate)
      .lt('tanggal', toDate);

    if (tahsinError) {
      console.error('[Landing] Fetch tahsin error:', tahsinError);
      return NextResponse.json(
        { message: 'Gagal mengambil data tahsin.' },
        { status: 500 }
      );
    }

    // Proses tahfidz per bulan
    const tahfidzByMonth: Record<string, { count: number; total: number }> = {};
    for (const record of tahfidzData ?? []) {
      const dateStr = String(record.tanggal);
      const monthKey = dateStr.substring(0, 7);
      const nilai = (
        (getNilaiNumeric(record.makhroj) +
          getNilaiNumeric(record.tajwid) +
          getNilaiNumeric(record.lancar)) /
        3
      );

      if (!tahfidzByMonth[monthKey]) {
        tahfidzByMonth[monthKey] = { count: 0, total: 0 };
      }
      tahfidzByMonth[monthKey].count += 1;
      tahfidzByMonth[monthKey].total += nilai;
    }

    // Proses tahsin per bulan
    const tahsinByMonth: Record<string, { count: number; total: number }> = {};
    for (const record of tahsinData ?? []) {
      const dateStr = String(record.tanggal);
      const monthKey = dateStr.substring(0, 7);
      const nilai = (
        (getNilaiNumeric(record.makhroj) +
          getNilaiNumeric(record.kelancaran) +
          getNilaiNumeric(record.adab)) /
        3
      );

      if (!tahsinByMonth[monthKey]) {
        tahsinByMonth[monthKey] = { count: 0, total: 0 };
      }
      tahsinByMonth[monthKey].count += 1;
      tahsinByMonth[monthKey].total += nilai;
    }

    // Susun data untuk chart
    const progressData = months.map((month) => {
      const tahfidzStats = tahfidzByMonth[month.key];
      const tahsinStats = tahsinByMonth[month.key];

      const tahfidzProgress = tahfidzStats ? Math.round(tahfidzStats.total / tahfidzStats.count) : 0;
      const tahsinProgress = tahsinStats ? Math.round(tahsinStats.total / tahsinStats.count) : 0;

      return {
        month: month.label,
        tahfidz: tahfidzProgress,
        tahsin: tahsinProgress,
      };
    });

    return NextResponse.json({ data: progressData }, { status: 200 });
  } catch (error) {
    console.error('[Landing] Monthly progress API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
