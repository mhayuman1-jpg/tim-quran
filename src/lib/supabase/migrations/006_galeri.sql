-- =============================================================================
-- Migration 006: Tabel galeri foto kegiatan
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.galeri (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul       text        NOT NULL,
  deskripsi   text,
  foto_url    text        NOT NULL,
  urutan      int         NOT NULL DEFAULT 0,
  is_published boolean    NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS galeri_urutan_idx ON public.galeri(urutan, created_at DESC);
