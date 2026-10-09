-- =============================================================================
-- Migration 031: Jilid Pembelajaran
-- Kelompok/jilid untuk materi pembelajaran Al-Qur'an.
-- Alur: Kabid membuat Jilid terlebih dahulu, lalu mengupload video (judul +
-- deskripsi) ke dalam jilid tersebut.
-- =============================================================================

-- Tabel Jilid
CREATE TABLE IF NOT EXISTS public.jilid_pembelajaran (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          text        NOT NULL,
  deskripsi     text,
  urutan        int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jilid_pembelajaran_urutan_idx ON public.jilid_pembelajaran (urutan ASC);
CREATE INDEX IF NOT EXISTS jilid_pembelajaran_is_active_idx ON public.jilid_pembelajaran (is_active);

-- Tambah kolom jilid_id ke tabel pembelajaran_al_quran
-- (ON DELETE CASCADE: menghapus jilid akan menghapus video di dalamnya)
ALTER TABLE public.pembelajaran_al_quran
  ADD COLUMN IF NOT EXISTS jilid_id uuid
  REFERENCES public.jilid_pembelajaran (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS pembelajaran_al_quran_jilid_id_idx ON public.pembelajaran_al_quran (jilid_id);

-- RLS Policies untuk tabel jilid
ALTER TABLE public.jilid_pembelajaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read jilid" ON public.jilid_pembelajaran;
CREATE POLICY "Allow public read jilid" ON public.jilid_pembelajaran
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Allow Kabid write jilid" ON public.jilid_pembelajaran;
CREATE POLICY "Allow Kabid write jilid" ON public.jilid_pembelajaran
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role = 'Kabid'
    )
  );

-- Trigger updated_at untuk tabel jilid
CREATE OR REPLACE FUNCTION public.update_jilid_pembelajaran_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trigger_update_jilid_pembelajaran_updated_at ON public.jilid_pembelajaran;
CREATE TRIGGER trigger_update_jilid_pembelajaran_updated_at
  BEFORE UPDATE ON public.jilid_pembelajaran
  FOR EACH ROW EXECUTE FUNCTION public.update_jilid_pembelajaran_updated_at();

-- Catatan: Tidak ada seed data. Jilid dan video ditambahkan melalui
-- menu "Jilid Pembelajaran" dan "Pembelajaran AL Qur'an" di dashboard Kabid.
