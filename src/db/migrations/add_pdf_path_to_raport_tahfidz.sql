-- Migration: Tambah kolom pdf_path ke tabel raport_tahfidz
-- Kolom ini menyimpan path relatif ke Supabase Storage (bucket "raports")
-- setelah PDF berhasil di-generate dan di-upload oleh Playwright.
-- Nilai null berarti PDF belum pernah di-generate / sudah diinvalidasi karena raport diedit.

ALTER TABLE raport_tahfidz
  ADD COLUMN IF NOT EXISTS pdf_path TEXT DEFAULT NULL;

-- Indeks untuk mempercepat pengecekan apakah PDF sudah ada
CREATE INDEX IF NOT EXISTS idx_raport_tahfidz_pdf_path
  ON raport_tahfidz (id)
  WHERE pdf_path IS NOT NULL;

-- Pastikan bucket "raports" telah dibuat di Supabase Dashboard > Storage
-- dengan pengaturan:
--   - Bucket Name: raports
--   - Public: FALSE (gunakan signed URL, bukan public URL)
--   - Allowed MIME types: application/pdf
--   - Max file size: 20 MB
