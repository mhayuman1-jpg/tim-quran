-- =============================================================================
-- Migration 001: Buat Tabel Baru
-- Jalankan file ini di Supabase SQL Editor
-- Aman dijalankan ulang karena menggunakan CREATE TABLE IF NOT EXISTS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabel: users
-- Menyimpan akun pengguna dashboard (Kabid dan Tim_Quran)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  role          text        NOT NULL CHECK (role IN ('Kabid', 'Tim_Quran')),
  status        text        NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx  ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx   ON public.users (role);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users (status);

-- -----------------------------------------------------------------------------
-- Tabel: attendances
-- Menyimpan catatan absensi harian siswa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendances (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  status      text        NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Tidak Hadir', 'Izin', 'Sakit')),
  scanned_at  timestamptz,
  scanned_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS attendances_student_id_idx ON public.attendances (student_id);
CREATE INDEX IF NOT EXISTS attendances_date_idx       ON public.attendances (date);
CREATE INDEX IF NOT EXISTS attendances_scanned_by_idx ON public.attendances (scanned_by);

-- -----------------------------------------------------------------------------
-- Tabel: hafalan
-- Menyimpan catatan setoran hafalan harian siswa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hafalan (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  tanggal     date        NOT NULL,
  surah_juz   text        NOT NULL,
  halaman     int,
  catatan     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hafalan_student_id_idx ON public.hafalan (student_id);
CREATE INDEX IF NOT EXISTS hafalan_teacher_id_idx ON public.hafalan (teacher_id);
CREATE INDEX IF NOT EXISTS hafalan_tanggal_idx    ON public.hafalan (tanggal);

-- -----------------------------------------------------------------------------
-- Tabel: tahsin
-- Menyimpan catatan sesi tahsin harian siswa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tahsin (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  tanggal     date        NOT NULL,
  metode      text        NOT NULL CHECK (metode IN ('Wafa', 'IWR', 'Al-Quran')),
  buku        text,
  halaman     int,
  catatan     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tahsin_student_id_idx ON public.tahsin (student_id);
CREATE INDEX IF NOT EXISTS tahsin_teacher_id_idx ON public.tahsin (teacher_id);
CREATE INDEX IF NOT EXISTS tahsin_tanggal_idx    ON public.tahsin (tanggal);

-- -----------------------------------------------------------------------------
-- Tabel: raport_quran
-- Menyimpan raport penilaian Qur'an per periode
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.raport_quran (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  periode     text        NOT NULL,
  makhroj     int         CHECK (makhroj BETWEEN 0 AND 100),
  tajwid      int         CHECK (tajwid  BETWEEN 0 AND 100),
  lancar      int         CHECK (lancar  BETWEEN 0 AND 100),
  buku_surah  text,
  halaman     int,
  catatan     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, periode)
);

CREATE INDEX IF NOT EXISTS raport_quran_student_id_idx ON public.raport_quran (student_id);
CREATE INDEX IF NOT EXISTS raport_quran_teacher_id_idx ON public.raport_quran (teacher_id);
CREATE INDEX IF NOT EXISTS raport_quran_periode_idx    ON public.raport_quran (periode);

-- -----------------------------------------------------------------------------
-- Tabel: rekap_bulanan
-- Menyimpan metadata file rekap bulanan yang diunggah ke Storage
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rekap_bulanan (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id   uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  uploader_name text,
  periode       text        NOT NULL,
  file_name     text,
  file_url      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rekap_bulanan_uploader_id_idx ON public.rekap_bulanan (uploader_id);
CREATE INDEX IF NOT EXISTS rekap_bulanan_periode_idx     ON public.rekap_bulanan (periode);

-- -----------------------------------------------------------------------------
-- Tabel: pengumuman
-- Menyimpan pengumuman yang ditujukan ke audiens tertentu
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pengumuman (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul       text        NOT NULL,
  isi         text        NOT NULL,
  target      text        NOT NULL CHECK (target IN ('Guru', 'Siswa', 'Orang Tua', 'Semua')),
  created_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pengumuman_created_by_idx ON public.pengumuman (created_by);
CREATE INDEX IF NOT EXISTS pengumuman_target_idx     ON public.pengumuman (target);
CREATE INDEX IF NOT EXISTS pengumuman_created_at_idx ON public.pengumuman (created_at DESC);

-- -----------------------------------------------------------------------------
-- Tabel: artikel
-- Menyimpan artikel yang dapat diterbitkan ke halaman publik
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artikel (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul        text        NOT NULL,
  konten       text,
  slug         text        NOT NULL UNIQUE,
  cover_url    text,
  is_published bool        NOT NULL DEFAULT false,
  published_at timestamptz,
  author_id    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artikel_slug_idx         ON public.artikel (slug);
CREATE INDEX IF NOT EXISTS artikel_is_published_idx ON public.artikel (is_published);
CREATE INDEX IF NOT EXISTS artikel_author_id_idx    ON public.artikel (author_id);
CREATE INDEX IF NOT EXISTS artikel_published_at_idx ON public.artikel (published_at DESC);
