// src/lib/time.ts
// Sumber kebenaran waktu aplikasi — zona WITA (Asia/Makassar), Dompu, NTB.

export const APP_TIMEZONE = 'Asia/Makassar';

/** Tanggal hari ini dalam format YYYY-MM-DD versi WITA. */
export function todayStr(): string {
  return dateToStrWITA(new Date());
}

/** Konversi Date ke string YYYY-MM-DD versi WITA (pengganti .toISOString().split('T')[0]). */
export function dateToStrWITA(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIMEZONE }).format(date);
}

/** Index hari dalam seminggu (0=Minggu .. 6=Sabtu) untuk string tanggal YYYY-MM-DD. */
export function getWeekday(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}
