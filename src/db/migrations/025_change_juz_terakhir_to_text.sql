-- Migration 025: Ubah juz_terakhir dari int4 ke text
-- Agar bisa menyimpan format bebas seperti "Juz 30, 29, & 1"

ALTER TABLE public.santri
  ALTER COLUMN juz_terakhir TYPE text
  USING juz_terakhir::text;
