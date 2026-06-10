-- 014_change_halaman_to_text.sql
-- Mengubah kolom halaman dari int ke text agar bisa menerima input bebas (angka, huruf, simbol)
-- Contoh: "1-5", "ayat 1-5", "hal. 10-15"

DO $$
BEGIN
  -- Ubah halaman di tabel hafalan
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hafalan' AND column_name = 'halaman' AND data_type = 'integer'
  ) THEN
    ALTER TABLE hafalan ALTER COLUMN halaman TYPE TEXT USING halaman::TEXT;
  END IF;

  -- Ubah halaman di tabel tahsin
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tahsin' AND column_name = 'halaman' AND data_type = 'integer'
  ) THEN
    ALTER TABLE tahsin ALTER COLUMN halaman TYPE TEXT USING halaman::TEXT;
  END IF;
END $$;
