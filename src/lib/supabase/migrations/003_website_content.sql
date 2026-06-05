-- =============================================================================
-- Migration 003: Tabel Konten Website Publik
-- Jalankan di Supabase SQL Editor setelah 001 dan 002
-- =============================================================================

-- Profil website (1 baris, upsert)
CREATE TABLE IF NOT EXISTS public.profil_website (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_lembaga  text        NOT NULL DEFAULT 'Tim Qur''an',
  deskripsi     text,
  visi          text,
  misi          text[],
  logo_url      text,
  alamat        text,
  email         text,
  telepon       text,
  instagram     text,
  youtube       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profil_website (nama_lembaga, deskripsi, visi, misi)
SELECT
  'Tim Qur''an',
  'Program Tahfidz dan Tahsin Al-Qur''an yang berdedikasi mencetak generasi Qur''ani berakhlak mulia.',
  'Menjadi lembaga Tahfidz & Tahsin terdepan yang melahirkan generasi Qur''ani berakhlak mulia.',
  ARRAY[
    'Menyelenggarakan pembelajaran Al-Qur''an yang berkualitas dan menyenangkan',
    'Mencetak hafidz dan hafidzah yang berakhlak mulia',
    'Menggunakan metode pembelajaran modern yang efektif',
    'Membina hubungan harmonis antara santri, guru, dan orang tua'
  ]
WHERE NOT EXISTS (SELECT 1 FROM public.profil_website);

-- Program pembelajaran
CREATE TABLE IF NOT EXISTS public.program (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        text        NOT NULL,
  deskripsi   text,
  icon        text        DEFAULT 'BookOpen',
  urutan      int         DEFAULT 0,
  is_active   bool        NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.program (nama, deskripsi, icon, urutan)
SELECT nama, deskripsi, icon, urutan FROM (VALUES
  ('Tahfidz Al-Qur''an', 'Program menghafal Al-Qur''an 30 juz dengan metode terstruktur dan sistematis.', 'BookOpen', 1),
  ('Tahsin Tilawah', 'Perbaikan bacaan Al-Qur''an meliputi makhroj, tajwid, dan kelancaran.', 'Mic', 2),
  ('Metode Wafa', 'Pembelajaran membaca Al-Qur''an menggunakan metode Wafa yang mudah.', 'Star', 3),
  ('Metode IWR', 'Pembelajaran Al-Qur''an dengan metode Iqra, Wafa, dan Rumus.', 'Users', 4)
) AS v(nama, deskripsi, icon, urutan)
WHERE NOT EXISTS (SELECT 1 FROM public.program);

-- Agenda / event mendatang
CREATE TABLE IF NOT EXISTS public.agenda (
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
