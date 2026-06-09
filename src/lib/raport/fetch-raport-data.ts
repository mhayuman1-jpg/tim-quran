import { createServerClient } from '@/lib/supabase/server';

const HEADER_SELECT = `
  id, student_id, teacher_id, periode, tahun_ajaran, juz, catatan,
  nama_guru_kelas, niy_guru_kelas, nama_kabid, niy_kabid, nama_kepala_sekolah, niy_kepala_sekolah,
  tahsin_metode, tahsin_buku, tahsin_halaman, tahsin_makhroj, tahsin_kelancaran, tahsin_adab, tahsin_catatan,
  html_custom, pdf_path,
  created_at, updated_at,
  santri ( id, nama, nisn, classes ( id, name ) ),
  users ( id, name )
`;

export interface RaportDetailRow {
  id?: string;
  urutan: number;
  nama_surah: string;
  makhroj?: string | null;
  tajwid?: string | null;
  lancar?: string | null;
}

export interface RaportExportData {
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
  html_custom?: string | null;
  pdf_path?: string | null;
  lokasi?: string | null;
  tanggal?: string | null;
  created_at?: string;
  santri?: {
    nama: string;
    nisn: string;
    classes?: { name: string } | null;
  } | null;
  users?: { name: string } | null;
  raport_tahfidz_detail?: RaportDetailRow[];
}

export interface ProfilExportData {
  nama_lembaga?: string;
  nama_sekolah?: string;
  logo_url?: string | null;
  logo_sekolah_url?: string | null;
  alamat?: string | null;
}

export async function fetchRaportForExport(raportId: string): Promise<{
  raport: RaportExportData;
  profil: ProfilExportData | null;
}> {
  const supabase = createServerClient();

  const [raportResult, profilResult] = await Promise.all([
    supabase
      .from('raport_tahfidz')
      .select(`${HEADER_SELECT}, raport_tahfidz_detail ( * )`)
      .eq('id', raportId)
      .single(),
    supabase.from('profil_website').select('*').limit(1).maybeSingle(),
  ]);

  if (raportResult.error || !raportResult.data) {
    throw new Error('Raport tidak ditemukan.');
  }

  return {
    raport: raportResult.data as unknown as RaportExportData,
    profil: (profilResult.data as ProfilExportData | null) ?? null,
  };
}
