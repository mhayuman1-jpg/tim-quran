-- Tambahkan kolom yang dibutuhkan oleh aplikasi pada tabel public.santri
ALTER TABLE public.santri
ADD COLUMN IF NOT EXISTS nisn text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS qr_code text,
ADD COLUMN IF NOT EXISTS class_id uuid,
ADD COLUMN IF NOT EXISTS juz_terakhir int4 DEFAULT 30,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Aktif',
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Buat tabel kelas jika belum ada
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher1_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  teacher2_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS classes_teacher1_idx ON public.classes(teacher1_id);
CREATE INDEX IF NOT EXISTS classes_teacher2_idx ON public.classes(teacher2_id);

-- Tambahkan relasi foreign key dari santri ke classes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'santri'
      AND c.conname = 'santri_class_id_fkey'
  ) THEN
    ALTER TABLE public.santri
    ADD CONSTRAINT santri_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id);
  END IF;
END
$$;

-- Index unik untuk menghindari duplikasi
CREATE UNIQUE INDEX IF NOT EXISTS santri_nisn_key ON public.santri (nisn);
CREATE UNIQUE INDEX IF NOT EXISTS santri_qr_code_key ON public.santri (qr_code);
