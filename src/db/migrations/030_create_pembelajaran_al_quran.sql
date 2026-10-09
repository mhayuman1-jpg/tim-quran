-- =============================================================================
-- Migration 030: Tabel Pembelajaran AL Qur'an
-- Menyimpan materi pembelajaran Al-Qur'an (judul + link YouTube) yang dikelola Kabid
-- Ditampilkan di dashboard Wali Murid
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pembelajaran_al_quran (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  judul         text        NOT NULL,
  deskripsi     text,
  youtube_url   text        NOT NULL,
  urutan        int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index untuk sorting dan filtering
CREATE INDEX IF NOT EXISTS pembelajaran_al_quran_urutan_idx ON public.pembelajaran_al_quran (urutan ASC);
CREATE INDEX IF NOT EXISTS pembelajaran_al_quran_is_active_idx ON public.pembelajaran_al_quran (is_active);

-- RLS Policies
ALTER TABLE public.pembelajaran_al_quran ENABLE ROW LEVEL SECURITY;

-- Public read access untuk halaman Wali Murid
DROP POLICY IF EXISTS "Allow public read" ON public.pembelajaran_al_quran;
CREATE POLICY "Allow public read" ON public.pembelajaran_al_quran
  FOR SELECT USING (is_active = true);

-- Admin (Kabid) write access
DROP POLICY IF EXISTS "Allow Kabid write" ON public.pembelajaran_al_quran;
CREATE POLICY "Allow Kabid write" ON public.pembelajaran_al_quran
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role = 'Kabid'
    )
  );

-- Trigger untuk updated_at
CREATE OR REPLACE FUNCTION public.update_pembelajaran_al_quran_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_update_pembelajaran_al_quran_updated_at ON public.pembelajaran_al_quran;
CREATE TRIGGER trigger_update_pembelajaran_al_quran_updated_at
  BEFORE UPDATE ON public.pembelajaran_al_quran
  FOR EACH ROW EXECUTE FUNCTION public.update_pembelajaran_al_quran_updated_at();

-- Catatan: Tidak ada seed data. Materi pembelajaran ditambahkan melalui
-- menu "Pembelajaran AL Qur'an" di dashboard Kabid.