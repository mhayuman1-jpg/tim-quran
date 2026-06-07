-- ==============================================================================
-- SETUP ULANG SUPABASE DARI AWAL
-- STEP 1: DELETE SEMUA TABLES (CASCADE untuk hapus dependency)
-- STEP 2: CREATE SEMUA TABLES DARI AWAL DENGAN URUTAN YANG BENAR
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 1: DROP SEMUA TABLES (HATI-HATI - INI AKAN MENGHAPUS SEMUA DATA)
-- ──────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.raport_tahfidz_detail CASCADE;
DROP TABLE IF EXISTS public.raport_tahfidz CASCADE;
DROP TABLE IF EXISTS public.galeri CASCADE;
DROP TABLE IF EXISTS public.artikel CASCADE;
DROP TABLE IF EXISTS public.pengumuman CASCADE;
DROP TABLE IF EXISTS public.rekap_bulanan CASCADE;
DROP TABLE IF EXISTS public.raport_quran CASCADE;
DROP TABLE IF EXISTS public.tahsin CASCADE;
DROP TABLE IF EXISTS public.hafalan CASCADE;
DROP TABLE IF EXISTS public.attendances CASCADE;
DROP TABLE IF EXISTS public.profil_website CASCADE;
DROP TABLE IF EXISTS public.program CASCADE;
DROP TABLE IF EXISTS public.agenda CASCADE;
DROP TABLE IF EXISTS public.santri CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ──────────────────────────────────────────────────────────────────────────
-- STEP 2: CREATE SEMUA TABLES DENGAN URUTAN YANG BENAR
-- ──────────────────────────────────────────────────────────────────────────

-- ============ TABEL 1: USERS (Independent) ============
CREATE TABLE public.users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  email         text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  role          text        NOT NULL CHECK (role IN ('Kabid', 'Tim_Quran', 'Sekretaris', 'Bendahara')),
  status        text        NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  photo_url     text,
  niy           text,
  nip           text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx  ON public.users (email);
CREATE INDEX IF NOT EXISTS users_role_idx   ON public.users (role);
CREATE INDEX IF NOT EXISTS users_status_idx ON public.users (status);

-- ============ TABEL 2: CLASSES (Independent) ============
CREATE TABLE public.classes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  teacher1_id uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  teacher2_id uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS classes_name_idx ON public.classes (name);
CREATE INDEX IF NOT EXISTS classes_teacher1_idx ON public.classes (teacher1_id);
CREATE INDEX IF NOT EXISTS classes_teacher2_idx ON public.classes (teacher2_id);

-- ============ TABEL 3: SANTRI (References: classes) ============
CREATE TABLE public.santri (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nisn                text        UNIQUE,
  nama                text        NOT NULL,
  gender              text,
  tanggal_lahir       date,
  class_id            uuid        REFERENCES public.classes(id) ON DELETE SET NULL,
  juz_terakhir        int         DEFAULT 30,
  qr_code             text        UNIQUE,
  status              text        NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  photo_url           text,
  assigned_teacher_id uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS santri_class_id_idx              ON public.santri (class_id);
CREATE INDEX IF NOT EXISTS santri_assigned_teacher_id_idx   ON public.santri (assigned_teacher_id);
CREATE INDEX IF NOT EXISTS santri_status_idx                ON public.santri (status);
CREATE UNIQUE INDEX IF NOT EXISTS santri_nisn_key           ON public.santri (nisn);
CREATE UNIQUE INDEX IF NOT EXISTS santri_qr_code_key        ON public.santri (qr_code);

-- ============ TABEL 4: ATTENDANCES (References: santri, users) ============
CREATE TABLE public.attendances (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  status      text        NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Tidak Hadir', 'Izin', 'Sakit')),
  scanned_at  timestamptz,
  scanned_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS attendances_student_id_idx ON public.attendances (student_id);
CREATE INDEX IF NOT EXISTS attendances_date_idx       ON public.attendances (date);
CREATE INDEX IF NOT EXISTS attendances_scanned_by_idx ON public.attendances (scanned_by);

-- ============ TABEL 5: HAFALAN (References: santri, users) ============
CREATE TABLE public.hafalan (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  tanggal     date        NOT NULL,
  surah_juz   text        NOT NULL,
  halaman     int,
  makhroj     text,
  tajwid      text,
  lancar      text,
  buku        text,
  catatan     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hafalan_student_id_idx ON public.hafalan (student_id);
CREATE INDEX IF NOT EXISTS hafalan_teacher_id_idx ON public.hafalan (teacher_id);
CREATE INDEX IF NOT EXISTS hafalan_tanggal_idx    ON public.hafalan (tanggal);

-- ============ TABEL 6: TAHSIN (References: santri, users) ============
CREATE TABLE public.tahsin (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  tanggal     date        NOT NULL,
  metode      text        NOT NULL CHECK (metode IN ('Wafa', 'IWR', 'Al-Quran')),
  buku        text,
  halaman     int,
  makhroj     text,
  kelancaran  text,
  adab        text,
  catatan     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tahsin_student_id_idx ON public.tahsin (student_id);
CREATE INDEX IF NOT EXISTS tahsin_teacher_id_idx ON public.tahsin (teacher_id);
CREATE INDEX IF NOT EXISTS tahsin_tanggal_idx    ON public.tahsin (tanggal);

-- ============ TABEL 7: RAPORT_QURAN (References: santri, users) ============
CREATE TABLE public.raport_quran (
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

-- ============ TABEL 8: SEMESTER_SETTINGS (References: none) ============
CREATE TABLE public.semester_settings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_name text        NOT NULL,
  end_date      date        NOT NULL,
  notes         text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS semester_settings_is_active_idx ON public.semester_settings (is_active);
CREATE INDEX IF NOT EXISTS semester_settings_end_date_idx ON public.semester_settings (end_date);
CREATE INDEX IF NOT EXISTS semester_settings_created_at_idx ON public.semester_settings (created_at DESC);

-- ============ TABEL 9: JUZ_TEMPLATES (References: none) ============
CREATE TABLE IF NOT EXISTS public.juz_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  juz         int         NOT NULL CHECK (juz BETWEEN 1 AND 30),
  title       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juz)
);

CREATE TABLE IF NOT EXISTS public.juz_template_surahs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  juz_template_id uuid        NOT NULL REFERENCES public.juz_templates(id) ON DELETE CASCADE,
  urutan          int         NOT NULL DEFAULT 1,
  nama_surah      text        NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juz_template_id, urutan)
);

CREATE INDEX IF NOT EXISTS juz_templates_juz_idx ON public.juz_templates (juz);
CREATE INDEX IF NOT EXISTS juz_template_surahs_juz_template_id_idx ON public.juz_template_surahs (juz_template_id);

-- ============ TABEL 10: RAPORT_TAHFIDZ (References: santri, users) ============
CREATE TABLE public.raport_tahfidz (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  teacher_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  periode              text        NOT NULL,
  tahun_ajaran         text        NOT NULL,
  juz                  integer,
  catatan              text,
  nama_guru_kelas      text,
  niy_guru_kelas       text,
  nama_kabid           text,
  niy_kabid            text,
  nama_kepala_sekolah  text,
  niy_kepala_sekolah   text,
  tahsin_metode        text,
  tahsin_buku          text,
  tahsin_halaman       text,
  tahsin_makhroj       text,
  tahsin_kelancaran    text,
  tahsin_adab          text,
  tahsin_catatan       text,
  created_at           timestamptz DEFAULT NOW(),
  updated_at           timestamptz DEFAULT NOW(),
  UNIQUE(student_id, periode)
);

CREATE INDEX IF NOT EXISTS raport_tahfidz_student_idx ON public.raport_tahfidz(student_id);
CREATE INDEX IF NOT EXISTS raport_tahfidz_periode_idx ON public.raport_tahfidz(periode);

-- ============ TABEL 9: RAPORT_TAHFIDZ_DETAIL (References: raport_tahfidz) ============
CREATE TABLE public.raport_tahfidz_detail (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  raport_id       uuid        NOT NULL REFERENCES public.raport_tahfidz(id) ON DELETE CASCADE,
  urutan          integer     NOT NULL DEFAULT 1,
  nama_surah      text        NOT NULL,
  makhroj         text,
  tajwid          text,
  lancar          text,
  wafa_buku       text,
  wafa_halaman    text,
  created_at      timestamptz DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS raport_tahfidz_detail_raport_idx ON public.raport_tahfidz_detail(raport_id);

-- ============ TABEL 10: REKAP_BULANAN (References: users) ============
CREATE TABLE public.rekap_bulanan (
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

-- ============ TABEL 11: PENGUMUMAN (References: users) ============
CREATE TABLE public.pengumuman (
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

-- ============ TABEL 12: ARTIKEL (References: users) ============
CREATE TABLE public.artikel (
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

-- ============ TABEL 13: PROFIL_WEBSITE (Independent) ============
CREATE TABLE public.profil_website (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lembaga       text        NOT NULL DEFAULT 'Tim Qur''an',
  deskripsi          text,
  visi               text,
  misi               text[],
  logo_url           text,
  logo_sekolah_url   text,
  nama_sekolah       text,
  alamat             text,
  email              text,
  telepon            text,
  instagram          text,
  facebook           text,
  youtube            text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ============ TABEL 14: PROGRAM (Independent) ============
CREATE TABLE public.program (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text        NOT NULL,
  deskripsi   text,
  icon        text        DEFAULT 'BookOpen',
  urutan      int         DEFAULT 0,
  is_active   bool        NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============ TABEL 15: AGENDA (References: users) ============
CREATE TABLE public.agenda (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul           text        NOT NULL,
  deskripsi       text,
  tanggal         date        NOT NULL,
  waktu_mulai     time,
  waktu_selesai   time,
  lokasi          text,
  is_published    bool        NOT NULL DEFAULT true,
  created_by      uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_tanggal_idx     ON public.agenda (tanggal);
CREATE INDEX IF NOT EXISTS agenda_published_idx   ON public.agenda (is_published);
CREATE INDEX IF NOT EXISTS agenda_created_by_idx  ON public.agenda (created_by);

-- ============ TABEL 16: GALERI (References: users) ============
CREATE TABLE public.galeri (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul       text        NOT NULL,
  deskripsi   text,
  foto_url    text        NOT NULL,
  urutan      int         DEFAULT 0,
  is_published bool       NOT NULL DEFAULT true,
  created_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS galeri_urutan_idx      ON public.galeri (urutan);
CREATE INDEX IF NOT EXISTS galeri_published_idx   ON public.galeri (is_published);
CREATE INDEX IF NOT EXISTS galeri_created_by_idx  ON public.galeri (created_by);

-- Seed default Kabid admin account dan profil website awal
INSERT INTO public.users (name, email, password_hash, role, status, created_at, updated_at)
VALUES (
  'Administrator Kabid',
  'kabid@timquran.id',
  '$2b$10$qTSCaoSUUNXCMZ8UHS/Psuv8bqFfuo6vdy4K9AtGRoztNRZYWC4tW',
  'Kabid',
  'Aktif',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profil_website (nama_lembaga, deskripsi, visi, misi, alamat, email, telepon, instagram, facebook, youtube, created_at, updated_at)
SELECT
  'Tim Qur''an',
  'Program Tahfidz dan Tahsin Al-Qur''an yang berdedikasi mencetak generasi Qur''ani berakhlak mulia.',
  'Menjadi lembaga Tahfidz & Tahsin terdepan.',
  ARRAY['Pembelajaran berkualitas', 'Mencetak hafidz berakhlak'],
  'Jl. Contoh No. 1, Jakarta',
  'info@timquran.id',
  '+62 811 1234 5678',
  '@timquran',
  'https://facebook.com/timquran',
  'https://youtube.com/timquran',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.profil_website);

-- ──────────────────────────────────────────────────────────────────────────
-- SELESAI: Database sudah siap dari awal
-- ──────────────────────────────────────────────────────────────────────────
