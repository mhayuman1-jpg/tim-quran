-- =============================================================================
-- Migration 005: Tambah kolom logo_sekolah_url ke profil_website
-- Jalankan di Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.profil_website
  ADD COLUMN IF NOT EXISTS logo_sekolah_url text,
  ADD COLUMN IF NOT EXISTS nama_sekolah     text;
