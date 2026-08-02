-- 024_change_tahfidz_halaman_to_text.sql
-- Mengubah kolom halaman di tabel tahfidz dari int ke text
-- agar bisa menerima input bebas seperti "1-20", "ayat 1-5", dll.
-- Catatan: tabel tahfidz sempat di-drop di migration 010 dan mungkin
-- dibuat ulang. Migration ini hanya berjalan jika kolom masih integer.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tahfidz' AND column_name = 'halaman' AND data_type = 'integer'
  ) THEN
    ALTER TABLE tahfidz ALTER COLUMN halaman TYPE TEXT USING halaman::TEXT;
  END IF;
END $$;
