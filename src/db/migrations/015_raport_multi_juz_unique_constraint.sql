-- Migration: Ganti unique constraint raport_tahfidz dari (student_id, periode) ke (student_id, periode, juz)
-- Agar satu siswa bisa punya beberapa raport per periode (satu per juz)
-- Jalankan manual di Supabase SQL Editor

-- 1. Drop constraint lama
ALTER TABLE raport_tahfidz
  DROP CONSTRAINT IF EXISTS raport_tahfidz_student_id_periode_key;

-- 2. Tambah constraint baru (student_id + periode + juz)
ALTER TABLE raport_tahfidz
  ADD CONSTRAINT raport_tahfidz_student_id_periode_juz_key
  UNIQUE (student_id, periode, juz);
