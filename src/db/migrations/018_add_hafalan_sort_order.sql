-- 018: Tambah kolom sort_order di tabel hafalan
-- Agar urutan surah tetap sesuai template, tidak berubah saat edit

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update sort_order berdasarkan created_at yang sudah ada
UPDATE hafalan SET sort_order = sub.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY student_id, tanggal ORDER BY created_at ASC) as row_num
  FROM hafalan
) sub
WHERE hafalan.id = sub.id;

-- Index untuk performa sorting
CREATE INDEX IF NOT EXISTS idx_hafalan_sort_order ON hafalan (student_id, tanggal, sort_order);
