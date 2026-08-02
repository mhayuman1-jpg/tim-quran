export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { TAHFIDZ_DAYS, TAHSIN_DAYS } from '@/lib/activeDays';
import { todayStr } from '@/lib/time';

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getDay();
}

function getNilaiNumeric(nilai: string | null): number {
  if (!nilai) return 0;
  if (nilai === '✓') return 100;
  if (nilai === 'A') return 100;
  if (nilai === 'B') return 80;
  if (nilai === 'C') return 70;
  if (nilai === 'D') return 55;
  if (nilai === 'L') return 100;
  if (nilai === 'KL') return 75;
  if (nilai === 'TL') return 50;
  return 0;
}

function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date(todayStr() + 'T00:00:00');
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    return { label, key };
  });
}

function countExpectedSessions(year: number, month: number, days: number[]): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (days.includes(dow)) count++;
  }
  return count;
}

function clampPercent(value: number): number {
  if (value <= 0) return 0;
  return Math.min(100, Math.max(1, Math.round(value)));
}

export async function GET(_request: NextRequest) {
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

    const { data: tahfidzData, error: tahfidzError } = await supabase
      .from('hafalan')
      .select('tanggal, makhroj, tajwid, lancar')
      .gte('tanggal', fromDate)
      .lt('tanggal', toDate);

    if (tahfidzError) {
      console.error('[Landing] Fetch tahfidz error:', tahfidzError);
      return NextResponse.json({ message: 'Gagal mengambil data tahfidz.' }, { status: 500 });
    }

    const { data: tahsinData, error: tahsinError } = await supabase
      .from('tahsin')
      .select('tanggal, makhroj, kelancaran, adab')
      .gte('tanggal', fromDate)
      .lt('tanggal', toDate);

    if (tahsinError) {
      console.error('[Landing] Fetch tahsin error:', tahsinError);
      return NextResponse.json({ message: 'Gagal mengambil data tahsin.' }, { status: 500 });
    }

    const tahfidzByMonth: Record<string, { count: number; total: number }> = {};
    for (const record of tahfidzData ?? []) {
      const dateStr = String(record.tanggal);
      if (!TAHFIDZ_DAYS.includes(getDayOfWeek(dateStr))) continue;
      const monthKey = dateStr.substring(0, 7);
      const nilai =
        (getNilaiNumeric(record.makhroj) + getNilaiNumeric(record.tajwid) + getNilaiNumeric(record.lancar)) / 3;
      if (!tahfidzByMonth[monthKey]) tahfidzByMonth[monthKey] = { count: 0, total: 0 };
      tahfidzByMonth[monthKey].count += 1;
      tahfidzByMonth[monthKey].total += nilai;
    }

    const tahsinByMonth: Record<string, { count: number; total: number }> = {};
    for (const record of tahsinData ?? []) {
      const dateStr = String(record.tanggal);
      if (!TAHSIN_DAYS.includes(getDayOfWeek(dateStr))) continue;
      const monthKey = dateStr.substring(0, 7);
      const nilai =
        (getNilaiNumeric(record.makhroj) + getNilaiNumeric(record.kelancaran) + getNilaiNumeric(record.adab)) / 3;
      if (!tahsinByMonth[monthKey]) tahsinByMonth[monthKey] = { count: 0, total: 0 };
      tahsinByMonth[monthKey].count += 1;
      tahsinByMonth[monthKey].total += nilai;
    }

    const progressData = months.map((month) => {
      const [y, m] = month.key.split('-').map(Number);
      const expectedTahsin = countExpectedSessions(y, m - 1, TAHSIN_DAYS);
      const totalWeekdays = countExpectedSessions(y, m - 1, TAHFIDZ_DAYS);

      const tahfidzStats = tahfidzByMonth[month.key];
      const tahsinStats = tahsinByMonth[month.key];

      const tahfidzScore = tahfidzStats ? Math.round(tahfidzStats.total / tahfidzStats.count) : 0;
      const tahsinScore = tahsinStats ? Math.round(tahsinStats.total / tahsinStats.count) : 0;

      const tahfidzCompletion = totalWeekdays > 0 ? clampPercent(((tahfidzStats?.count ?? 0) / totalWeekdays) * 100) : 0;
      const tahsinCompletion = expectedTahsin > 0 ? clampPercent(((tahsinStats?.count ?? 0) / expectedTahsin) * 100) : 0;

      return {
        month: month.label,
        tahfidz: clampPercent(tahfidzScore),
        tahsin: clampPercent(tahsinScore),
        tahfidzCompletion,
        tahsinCompletion,
        tahsinSessions: `${tahsinStats?.count ?? 0}/${expectedTahsin}`,
      };
    });

    return NextResponse.json({ data: progressData }, { status: 200 });
  } catch (error) {
    console.error('[Landing] Monthly progress API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
