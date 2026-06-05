// src/types/index.ts
// Semua TypeScript types untuk Tim Qur'an Website

export type UserRole = 'Kabid' | 'Tim_Quran' | 'Sekretaris';
export type UserStatus = 'Aktif' | 'Nonaktif';
export type Gender = 'Laki-laki' | 'Perempuan';
export type AttendanceStatus = 'Hadir' | 'Tidak Hadir' | 'Izin' | 'Sakit';
export type TahsinMetode = 'Wafa' | 'IWR' | 'Al-Quran';
export type AnnouncementTarget = 'Guru' | 'Siswa' | 'Orang Tua' | 'Semua';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at?: string;
}

export interface Santri {
  id: string;
  nisn: string;
  nama: string;
  gender: Gender;
  tanggal_lahir?: string;
  class_id?: string;
  juz_terakhir: number;
  qr_code: string;
  photo_url?: string;
  assigned_teacher_id?: string;
  status: 'Aktif' | 'Nonaktif';
  created_at?: string;
  updated_at?: string;
  // Joined relation
  classes?: { id: string; name: string } | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  scanned_at: string;
  scanned_by?: string;
}

export interface Hafalan {
  id: string;
  student_id: string;
  teacher_id: string;
  tanggal: string;
  surah_juz: string;
  halaman?: number;
  catatan?: string;
  created_at?: string;
}

export interface Tahsin {
  id: string;
  student_id: string;
  teacher_id: string;
  tanggal: string;
  metode: TahsinMetode;
  buku?: string;
  halaman?: number;
  catatan?: string;
  created_at?: string;
}

export interface RaportQuran {
  id: string;
  student_id: string;
  teacher_id: string;
  periode: string;
  makhroj?: number;
  tajwid?: number;
  lancar?: number;
  buku_surah?: string;
  halaman?: number;
  catatan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RekapBulanan {
  id: string;
  uploader_id: string;
  periode: string;
  file_name: string;
  file_url: string;
  file_type: 'excel' | 'pdf';
  uploaded_at: string;
}

export interface Pengumuman {
  id: string;
  author_id: string;
  judul: string;
  isi: string;
  target: AnnouncementTarget;
  created_at: string;
  updated_at?: string;
}

export interface Artikel {
  id: string;
  author_id: string;
  judul: string;
  slug: string;
  konten: string;
  cover_url?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}
