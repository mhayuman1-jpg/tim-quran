-- Migration 008: Tambah kolom guru ke tabel classes
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS teacher1_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher2_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS classes_teacher1_idx ON public.classes(teacher1_id);
CREATE INDEX IF NOT EXISTS classes_teacher2_idx ON public.classes(teacher2_id);
