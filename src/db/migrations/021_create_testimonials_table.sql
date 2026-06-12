-- 021_create_testimonials_table.sql
-- Tabel testimoni dari wali murid alumni (tanpa login)

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_name TEXT NOT NULL,
  child_name TEXT NOT NULL,
  batch TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk fetch testimoni yang sudah di-approve
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(is_approved, created_at DESC);
