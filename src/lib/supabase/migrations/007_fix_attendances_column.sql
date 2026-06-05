-- Migration 007: Rename student_id → santri_id di tabel attendances
ALTER TABLE public.attendances RENAME COLUMN student_id TO santri_id;
DROP INDEX IF EXISTS attendances_student_id_idx;
CREATE INDEX IF NOT EXISTS attendances_santri_id_idx ON public.attendances (santri_id);
