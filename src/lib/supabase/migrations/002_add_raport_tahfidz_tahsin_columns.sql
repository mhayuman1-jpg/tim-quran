-- ============================================================
-- Migration: Tambahkan kolom penilaian tahsin ke tabel raport_tahfidz
-- ============================================================

ALTER TABLE public.raport_tahfidz
  ADD COLUMN IF NOT EXISTS tahsin_metode text,
  ADD COLUMN IF NOT EXISTS tahsin_buku text,
  ADD COLUMN IF NOT EXISTS tahsin_halaman text,
  ADD COLUMN IF NOT EXISTS tahsin_makhroj text,
  ADD COLUMN IF NOT EXISTS tahsin_kelancaran text,
  ADD COLUMN IF NOT EXISTS tahsin_adab text,
  ADD COLUMN IF NOT EXISTS tahsin_catatan text;
