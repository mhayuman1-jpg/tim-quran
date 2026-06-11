-- 019: Add teacher3_id, nama_guru_kelas, niy_guru_kelas to classes
-- Tim Quran adalah guru tahsin/tahfidz, bukan guru kelas
-- Guru kelas diisi manual (nama teks) untuk keperluan raport

ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher3_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS nama_guru_kelas text;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS niy_guru_kelas text;

CREATE INDEX IF NOT EXISTS classes_teacher3_idx ON public.classes(teacher3_id);
