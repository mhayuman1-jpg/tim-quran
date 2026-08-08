// src/lib/holiday.ts
// Helper untuk mengecek apakah tanggal tertentu adalah hari libur.
// Digunakan di API routes absensi, hafalan, tahsin, dan jurnal.

import { SupabaseClient } from '@supabase/supabase-js';

export interface HolidayRecord {
  id: string;
  date: string; // YYYY-MM-DD
  keterangan: string;
  tipe: string;
  created_by: string | null;
  created_at: string;
}

/**
 * Cek apakah satu tanggal adalah hari libur.
 */
export async function isHoliday(
  supabase: SupabaseClient,
  date: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('holiday_calendar')
    .select('id')
    .eq('date', date)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[holiday] Error checking holiday:', error);
    return false;
  }

  return !!data;
}

/**
 * Cek apakah tanggal libur, dengan Return { ok, error? } pattern
 * seperti requireActiveSemester. Digunakan di API routes POST/scan.
 *
 * Kabid (Kepala Bidang) dapat menambahkan/mengedit jurnal kapanpun,
 * termasuk saat hari libur — bypass otomatis jika userRole === 'Kabid'.
 *
 * Cara pakai di API route:
 *   const holidayCheck = await requireNoHoliday(supabase, tanggal, session.user.role);
 *   if (holidayCheck.error) return holidayCheck.error;
 */
export async function requireNoHoliday(
  supabase: SupabaseClient,
  date: string,
  userRole?: string
): Promise<{ ok: boolean; error?: Response }> {
  // Kabid bypass: dapat menambahkan jurnal kapanpun, termasuk hari libur
  if (userRole === 'Kabid') {
    return { ok: true };
  }

  const { data, error } = await supabase
    .from('holiday_calendar')
    .select('keterangan')
    .eq('date', date)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[holiday] Error checking holiday:', error);
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ message: 'Gagal memeriksa status hari libur.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  if (data) {
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ message: `Hari ini adalah hari libur: ${data.keterangan}. Tidak dapat melakukan aktivitas mengajar.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { ok: true };
}

/**
 * Ambil semua tanggal libur dalam rentang tanggal tertentu.
 * Berguna untuk menghitung total hari aktif (total hari - hari libur).
 */
export async function getHolidaysInRange(
  supabase: SupabaseClient,
  dateFrom: string,
  dateTo: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('holiday_calendar')
    .select('date')
    .gte('date', dateFrom)
    .lte('date', dateTo);

  if (error) {
    console.error('[holiday] Error fetching holidays in range:', error);
    return [];
  }

  return (data ?? []).map((r: any) => r.date);
}

/**
 * Cek apakah ada hari libur pada tanggal tertentu, mengembalikan info lengkap.
 */
export async function getHolidayInfo(
  supabase: SupabaseClient,
  date: string
): Promise<HolidayRecord | null> {
  const { data, error } = await supabase
    .from('holiday_calendar')
    .select('*')
    .eq('date', date)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as HolidayRecord;
}
