// src/lib/surahData.ts
// Data daftar surah per juz untuk template raport tahfidz

export type NilaiTahfidz = '✓' | 'A' | 'B' | 'C' | 'D' | 'L' | 'TL' | '';

export const NILAI_OPTIONS: { value: NilaiTahfidz; label: string; color: string }[] = [
  { value: '✓', label: '✓ (Hafal)',       color: 'text-amber-700 bg-amber-50' },
  { value: 'A', label: 'A (Sangat Baik)', color: 'text-blue-700 bg-blue-50' },
  { value: 'B', label: 'B (Baik)',        color: 'text-indigo-700 bg-indigo-50' },
  { value: 'C', label: 'C (Cukup Baik)', color: 'text-amber-700 bg-amber-50' },
  { value: 'D', label: 'D (Kurang Baik)', color: 'text-red-700 bg-red-50' },
  { value: '',  label: '— (Kosong)',      color: 'text-slate-400 bg-slate-50' },
];

export const NILAI_TANPA_HAFAL: { v: NilaiTahfidz; label: string; cls: string }[] = [
  { v: '', label: '—', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
  { v: 'A', label: 'A', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { v: 'B', label: 'B', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { v: 'C', label: 'C', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { v: 'D', label: 'D', cls: 'bg-red-50 text-red-700 border-red-200' },
];

export const NILAI_LANCAR: { v: NilaiTahfidz; label: string; cls: string }[] = [
  { v: '', label: '—', cls: 'bg-slate-50 text-slate-400 border-slate-200' },
  { v: 'L', label: 'L', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { v: 'TL', label: 'TL', cls: 'bg-red-50 text-red-700 border-red-200' },
];

export function getNilaiColor(nilai: string | null | undefined): string {
  if (!nilai) return 'text-slate-300';
  if (nilai === '✓') return 'text-amber-600 font-bold';
  if (nilai === 'A') return 'text-blue-600 font-bold';
  if (nilai === 'B') return 'text-indigo-600 font-bold';
  if (nilai === 'C') return 'text-amber-600 font-bold';
  if (nilai === 'D') return 'text-red-600 font-bold';
  if (nilai === 'L') return 'text-amber-600 font-bold';
  if (nilai === 'TL') return 'text-red-600 font-bold';
  return 'text-slate-600';
}

export interface SurahTemplate {
  nama: string;
}

// Daftar surah per juz — bisa dipilih sebagai template
export const SURAH_PER_JUZ: Record<number, SurahTemplate[]> = {
  1: [
    { nama: 'Al Fatihah 1-7' },
    { nama: 'Al Baqarah 1-16' },
    { nama: 'Al Baqarah 17-29' },
    { nama: 'Al Baqarah 30-48' },
    { nama: 'Al Baqarah 49-61' },
    { nama: 'Al Baqarah 62-76' },
    { nama: 'Al Baqarah 78-88' },
    { nama: 'Al Baqarah 89-101' },
    { nama: 'Al Baqarah 102-112' },
    { nama: 'Al Baqarah 113-126' },
    { nama: 'Al Baqarah 127-141' },
  ],
  2: [
    { nama: 'Al Baqarah' },
    { nama: 'Ali Imran' },
  ],
  3: [
    { nama: 'Ali Imran' },
    { nama: 'An Nisa' },
  ],
  4: [
    { nama: 'An Nisa' },
    { nama: 'Al Maidah' },
  ],
  5: [
    { nama: 'Al Maidah' },
    { nama: 'Al Anam' },
  ],
  6: [
    { nama: 'Al Araf' },
    { nama: 'Al Anfal' },
  ],
  7: [
    { nama: 'At Taubah' },
    { nama: 'Hud' },
  ],
  8: [
    { nama: 'Hud' },
    { nama: 'Yunus' },
  ],
  9: [
    { nama: 'Yunus' },
    { nama: 'Hud' },
    { nama: 'Yusuf' },
  ],
  10: [
    { nama: 'Yusuf' },
    { nama: 'Ar Rad' },
    { nama: 'Ibrahim' },
    { nama: 'Al Hijr' },
    { nama: 'An Nahl' },
  ],
  11: [
    { nama: 'An Nahl' },
    { nama: 'Al Isra' },
    { nama: 'Al Kahf' },
    { nama: 'Maryam' },
    { nama: 'Ta Ha' },
  ],
  12: [
    { nama: 'Ta Ha' },
    { nama: 'Al Anbiya' },
    { nama: 'Al Hajj' },
  ],
  13: [
    { nama: "Al Mu'minun" },
    { nama: 'An Nur' },
  ],
  14: [
    { nama: 'Al Furqan' },
    { nama: 'An Naml' },
  ],
  15: [
    { nama: 'Al Qasas' },
    { nama: 'Al Ankabut' },
    { nama: 'Ar Rum' },
  ],
  16: [
    { nama: 'Luqman' },
    { nama: 'As Sajdah' },
    { nama: 'Al Ahzab' },
  ],
  17: [
    { nama: 'Saba' },
    { nama: 'Fatir' },
    { nama: 'Ya Sin' },
    { nama: 'As Saffat' },
  ],
  18: [
    { nama: 'Sad' },
    { nama: 'Az Zumar' },
    { nama: 'Ghafir' },
  ],
  19: [
    { nama: 'Fussilat' },
    { nama: 'Ash Shura' },
    { nama: 'Az Zukhruf' },
  ],
  20: [
    { nama: 'Ad Dukhan' },
    { nama: 'Al Jathiyah' },
    { nama: 'Al Ahqaf' },
  ],
  21: [
    { nama: 'Muhammad' },
    { nama: 'Al Fath' },
    { nama: 'Al Hujurat' },
    { nama: 'Qaf' },
  ],
  22: [
    { nama: 'Az Zariyat' },
    { nama: 'At Tur' },
    { nama: 'An Najm' },
    { nama: 'Al Qamar' },
    { nama: 'Ar Rahman' },
    { nama: 'Al Waqiah' },
    { nama: 'Al Hadid' },
  ],
  23: [
    { nama: 'Al Mujadilah' },
    { nama: 'Al Hasyr' },
    { nama: 'Al Mumtahanah' },
    { nama: 'As Saff' },
    { nama: 'Al Jumuah' },
    { nama: 'Al Munafiqun' },
    { nama: 'At Taghabun' },
    { nama: 'At Talaq' },
    { nama: 'At Tahrim' },
  ],
  24: [
    { nama: 'Al Mulk' },
    { nama: 'Al Qalam' },
    { nama: 'Al Haqqah' },
    { nama: "Al Ma'arij" },
    { nama: 'Nuh' },
    { nama: 'Al Jinn' },
    { nama: 'Al Muzammil' },
    { nama: 'Al Muddassir' },
    { nama: 'Al Qiyamah' },
  ],
  25: [
    { nama: 'Al Insan' },
    { nama: 'Al Mursalat' },
    { nama: "An Naba'" },
    { nama: "An Nazi'at" },
    { nama: 'Abasa' },
    { nama: 'At Takwir' },
    { nama: 'Al Infitar' },
    { nama: 'Al Mutaffifin' },
    { nama: 'Al Insyiqaq' },
    { nama: 'Al Buruj' },
    { nama: 'At Tariq' },
    { nama: "Al A'la" },
  ],
  26: [
    { nama: 'Al Ghashiyah' },
    { nama: 'Al Fajr' },
    { nama: 'Al Balad' },
    { nama: 'Asy Syams' },
    { nama: 'Al Lail' },
    { nama: 'Ad Duha' },
    { nama: 'Ash Sharh' },
    { nama: 'At Tin' },
    { nama: 'Al Alaq' },
  ],
  27: [
    { nama: 'Al Qadr' },
    { nama: 'Al Bayyinah' },
    { nama: 'Az Zalzalah' },
    { nama: 'Al Adiyat' },
    { nama: "Al Qari'ah" },
    { nama: 'At Takatsur' },
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
    { nama: 'An Nas' },
  ],
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
