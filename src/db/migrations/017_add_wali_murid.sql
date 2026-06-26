-- 017_add_wali_murid.sql
-- Tabel wali_murid: menghubungkan orang tua/wali dengan santri
-- Wali login menggunakan NIS (nomor induk wali, bisa berbeda dengan NIS/NISN santri)

CREATE TABLE IF NOT EXISTS public.wali_murid (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nis         text        UNIQUE NOT NULL,           -- NIS untuk login wali
  nama_wali   text        NOT NULL,
  kontak      text,
  santri_id   uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wali_murid_nis ON public.wali_murid (nis);
CREATE INDEX IF NOT EXISTS idx_wali_murid_santri_id ON public.wali_murid (santri_id);
