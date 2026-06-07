-- ═══════════════════════════════════════════════════════════════
-- MIGRATION: Tambah kolom NIY + support role Bendahara & Sekretaris
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Cek tipe kolom role di tabel users ───────────────────────
-- Jalankan query ini dulu untuk cek apakah role bertipe TEXT atau USER-DEFINED (enum):
--
--   SELECT column_name, data_type, udt_name
--   FROM information_schema.columns
--   WHERE table_name = 'users' AND column_name = 'role';
--
-- Jika data_type = 'text'          → jalankan bagian A
-- Jika data_type = 'USER-DEFINED'  → jalankan bagian B (enum)

-- ── BAGIAN A: role bertipe TEXT dengan CHECK constraint ──────────
-- Hapus constraint lama dan buat yang baru dengan nilai lengkap:

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('Kabid', 'Tim_Quran', 'Sekretaris', 'Bendahara'));

-- ── BAGIAN B: role bertipe ENUM ──────────────────────────────────
-- Jika menggunakan tipe enum, tambahkan nilai baru:
-- (Uncomment baris di bawah jika diperlukan)
--
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Sekretaris';
-- ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'Bendahara';

-- ── 2. Tambah kolom NIY di tabel raport_tahfidz ─────────────────
ALTER TABLE raport_tahfidz
  ADD COLUMN IF NOT EXISTS niy_guru_kelas      TEXT,
  ADD COLUMN IF NOT EXISTS niy_kabid           TEXT,
  ADD COLUMN IF NOT EXISTS niy_kepala_sekolah  TEXT;

-- ── 3. Verifikasi ────────────────────────────────────────────────
-- Cek kolom NIY berhasil ditambahkan:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'raport_tahfidz' AND column_name LIKE 'niy%';
--
-- Cek constraint role:
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conname = 'users_role_check';
