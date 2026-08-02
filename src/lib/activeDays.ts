// src/lib/activeDays.ts
// Hari aktif tahfidz/tahsin: Senin s.d. Kamis. Jumat, Sabtu, Minggu = libur mengajar.

import { getWeekday } from '@/lib/time';

// 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
export const TAHFIDZ_DAYS = [1, 2, 3, 4];
export const TAHSIN_DAYS = [1, 2, 3, 4];

export const ACTIVE_DAY_ERROR_MESSAGE =
  'Hari aktif tahfidz/tahsin adalah Senin s.d. Kamis. Tidak dapat melakukan aktivitas mengajar pada hari Jumat, Sabtu, atau Minggu.';

/** Cek apakah tanggal (YYYY-MM-DD) adalah hari aktif. */
export function isActiveDay(dateStr: string): boolean {
  return TAHFIDZ_DAYS.includes(getWeekday(dateStr));
}

/** Return {ok} atau {ok:false, error: Response 400} — pola sama seperti requireNoHoliday. */
export function requireActiveDay(dateStr: string): { ok: boolean; error?: Response } {
  if (!isActiveDay(dateStr)) {
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ message: ACTIVE_DAY_ERROR_MESSAGE }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { ok: true };
}
