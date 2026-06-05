// src/lib/surahData.ts
// Data daftar surah per juz untuk template raport tahfidz

export type NilaiTahfidz = '✓' | 'A' | 'B' | 'C' | 'D' | '';

export const NILAI_OPTIONS: { value: NilaiTahfidz; label: string; color: string }[] = [
  { value: '✓', label: '✓ (Hafal)',       color: 'text-emerald-700 bg-emerald-50' },
  { value: 'A', label: 'A (Sangat Baik)', color: 'text-blue-700 bg-blue-50' },
  { value: 'B', label: 'B (Baik)',        color: 'text-indigo-700 bg-indigo-50' },
  { value: 'C', label: 'C (Cukup Baik)', color: 'text-amber-700 bg-amber-50' },
  { value: 'D', label: 'D (Kurang Baik)', color: 'text-red-700 bg-red-50' },
  { value: '',  label: '— (Kosong)',      color: 'text-slate-400 bg-slate-50' },
];

export function getNilaiColor(nilai: string | null | undefined): string {
  if (!nilai) return 'text-slate-300';
  if (nilai === '✓') return 'text-emerald-600 font-bold';
  if (nilai === 'A') return 'text-blue-600 font-bold';
  if (nilai === 'B') return 'text-indigo-600 font-bold';
  if (nilai === 'C') return 'text-amber-600 font-bold';
  if (nilai === 'D') return 'text-red-600 font-bold';
  return 'text-slate-600';
}

export interface SurahTemplate {
  nama: string;
}

// Daftar surah per juz — bisa dipilih sebagai template
export const SURAH_PER_JUZ: Record<number, SurahTemplate[]> = {
  28: [
    { nama: 'Al Mujadilah' },
    { nama: 'Al Hasyr' },
    { nama: 'Al Mumtahanah' },
    { nama: 'Ash Shaff' },
    { nama: 'Al Jumuah' },
    { nama: 'Al Munafiqun' },
    { nama: 'At Taghabun' },
    { nama: 'At Talaq' },
    { nama: 'At Tahrim' },
  ],
  29: [
    { nama: 'Al Mulk' },
    { nama: 'Al Qolam' },
    { nama: 'Al Haqqah' },
    { nama: "Al Ma'arij" },
    { nama: 'Nuh' },
    { nama: 'Al Jinn' },
    { nama: 'Al Muzammil' },
    { nama: 'Al Muddassir' },
    { nama: 'Al Qiyamah' },
    { nama: 'Al Insan (1-20)' },
    { nama: 'Al Mursalat' },
  ],
  30: [
    { nama: "An Naba'" },
    { nama: "An Nazi'at" },
    { nama: "'Abasa" },
    { nama: 'At Takwir' },
    { nama: 'Al Infitar' },
    { nama: 'Al Mutaffifin' },
    { nama: 'Al Insyiqaq' },
    { nama: 'Al Buruj' },
    { nama: 'At Tariq' },
    { nama: "Al A'la" },
    { nama: 'Al Ghasyiyah' },
    { nama: 'Al Fajr' },
    { nama: 'Al Balad' },
    { nama: 'Asy Syams' },
    { nama: 'Al Lail' },
    { nama: 'Ad Dhuha' },
    { nama: 'Al Insyirah' },
    { nama: 'At Tin' },
    { nama: 'Al Alaq' },
    { nama: 'Al Qadr' },
    { nama: 'Al Bayyinah' },
    { nama: 'Az Zalzalah' },
    { nama: 'Al Adiyat' },
    { nama: "Al Qari'ah" },
    { nama: 'At Takasur' },
    { nama: 'Al Ashr' },
    { nama: 'Al Humazah' },
    { nama: 'Al Fil' },
    { nama: 'Quraisy' },
    { nama: "Al Ma'un" },
    { nama: 'Al Kautsar' },
    { nama: 'Al Kafirun' },
    { nama: 'An Nasr' },
    { nama: 'Al Lahab' },
    { nama: 'Al Ikhlas' },
    { nama: 'Al Falaq' },
    { nama: 'An Naas' },
  ],
};

// Semua juz yang tersedia sebagai template
export const JUZ_TERSEDIA = Object.keys(SURAH_PER_JUZ).map(Number).sort((a, b) => a - b);
