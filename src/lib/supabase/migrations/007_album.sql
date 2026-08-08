-- 007_album.sql
-- Tabel album untuk mengelompokkan foto galeri

CREATE TABLE IF NOT EXISTS public.album (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul        text        NOT NULL,
  deskripsi    text,
  cover_url    text,
  urutan       int         NOT NULL DEFAULT 0,
  is_published boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.album ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read album" ON public.album
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.galeri
  ADD COLUMN IF NOT EXISTS album_id uuid REFERENCES public.album(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_galeri_album_id ON public.galeri(album_id);
