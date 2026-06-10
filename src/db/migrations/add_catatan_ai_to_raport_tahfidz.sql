-- 013_add_catatan_ai_to_raport_tahfidz.sql
-- Menambah kolom catatan_ai untuk menyimpan catatan ustadz/ah yang di-generate oleh AI

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'raport_tahfidz' AND column_name = 'catatan_ai'
  ) THEN
    ALTER TABLE raport_tahfidz ADD COLUMN catatan_ai TEXT DEFAULT '';
  END IF;
END $$;
