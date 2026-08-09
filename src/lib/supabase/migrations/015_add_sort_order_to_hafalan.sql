-- Migration 015: Tambah kolom sort_order di tabel hafalan
-- Agar urutan surah tetap sesuai template, tidak berubah saat edit

ALTER TABLE IF EXISTS public.hafalan
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update sort_order berdasarkan created_at yang sudah ada
UPDATE public.hafalan
SET sort_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY student_id, tanggal ORDER BY created_at ASC) as row_num
  FROM public.hafalan
) sub
WHERE public.hafalan.id = sub.id;

-- Index untuk performa sorting
CREATE INDEX IF NOT EXISTS idx_hafalan_sort_order ON public.hafalan (student_id, tanggal, sort_order);
