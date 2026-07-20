-- ============================================================
-- Migration: Ubah kolom juz dari INTEGER ke TEXT
-- Agar bisa menyimpan nilai multi-juz seperti "29 & 30"
-- ============================================================

ALTER TABLE raport_tahfidz
  ALTER COLUMN juz TYPE TEXT USING juz::TEXT;
