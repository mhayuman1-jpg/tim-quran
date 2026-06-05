-- =============================================================================
-- Migration 002: Update Tabel santri
-- Jalankan file ini di Supabase SQL Editor SETELAH 001_create_tables.sql
-- Aman dijalankan ulang karena menggunakan ADD COLUMN IF NOT EXISTS
-- =============================================================================

-- Tambahkan kolom tanggal_lahir jika belum ada
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS tanggal_lahir date;

-- Tambahkan kolom photo_url jika belum ada
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Tambahkan kolom assigned_teacher_id jika belum ada
-- FK ke users(id), SET NULL jika guru dihapus
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS assigned_teacher_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Tambahkan kolom updated_at jika belum ada
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Index untuk assigned_teacher_id agar query filter per Tim_Quran efisien
CREATE INDEX IF NOT EXISTS santri_assigned_teacher_id_idx
  ON public.santri (assigned_teacher_id);
