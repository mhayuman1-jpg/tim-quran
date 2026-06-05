-- Migration: Tambah kolom photo_url ke tabel users
-- Tanggal: 2025
-- Requirements: 3.1, 3.9, 4.1, 4.4

-- Tambah kolom photo_url ke tabel users (jika belum ada)
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
