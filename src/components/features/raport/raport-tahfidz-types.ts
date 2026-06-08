export interface DetailSurahData {
  id?: string;
  urutan: number;
  nama_surah: string;
  makhroj?: string | null;
  tajwid?: string | null;
  lancar?: string | null;
  wafa_buku?: string | null;
  wafa_halaman?: string | null;
}

export interface RaportTahfidzData {
  id: string;
  periode: string;
  tahun_ajaran: string;
  juz?: number | null;
  catatan?: string | null;
  nama_guru_kelas?: string | null;
  niy_guru_kelas?: string | null;
  nama_kabid?: string | null;
  niy_kabid?: string | null;
  nama_kepala_sekolah?: string | null;
  niy_kepala_sekolah?: string | null;
  tahsin_metode?: string | null;
  tahsin_buku?: string | null;
  tahsin_halaman?: string | null;
  tahsin_makhroj?: string | null;
  tahsin_kelancaran?: string | null;
  tahsin_adab?: string | null;
  tahsin_catatan?: string | null;
  lokasi?: string | null;
  tanggal?: string | null;
  created_at?: string;
  santri?: {
    nama: string;
    nisn: string;
    classes?: { name: string } | null;
  } | null;
  users?: { name: string } | null;
  raport_tahfidz_detail?: DetailSurahData[];
  html_custom?: string | null;
}

export interface ProfilRaportData {
  nama_lembaga?: string;
  nama_sekolah?: string;
  logo_url?: string | null;
  logo_sekolah_url?: string | null;
  alamat?: string | null;
}
