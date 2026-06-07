-- Migration 011: Tambahkan kolom detail pada hafalan / tahsin dan tabel semester_settings
-- Menyimpan nilai makhroj/tajwid/lancar pada hafalan
-- dan nilai makhroj/kelancaran/adab pada tahsin
-- serta konfigurasi semester akhir

ALTER TABLE IF EXISTS public.hafalan
  ADD COLUMN IF NOT EXISTS makhroj text,
  ADD COLUMN IF NOT EXISTS tajwid text,
  ADD COLUMN IF NOT EXISTS lancar text;

ALTER TABLE IF EXISTS public.tahsin
  ADD COLUMN IF NOT EXISTS makhroj text,
  ADD COLUMN IF NOT EXISTS kelancaran text,
  ADD COLUMN IF NOT EXISTS adab text;

CREATE TABLE IF NOT EXISTS public.semester_settings (
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
