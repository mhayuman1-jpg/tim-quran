-- Ambil satu jurnal tahsin terbaru per siswa untuk evaluasi dan ekspor.
CREATE INDEX IF NOT EXISTS tahsin_student_latest_idx
  ON public.tahsin (student_id, tanggal DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.latest_tahsin_for_students(student_ids UUID[])
RETURNS TABLE (
  student_id UUID,
  metode TEXT,
  buku TEXT,
  tanggal DATE
)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (t.student_id)
    t.student_id,
    t.metode,
    t.buku,
    t.tanggal
  FROM public.tahsin AS t
  WHERE t.student_id = ANY(student_ids)
  ORDER BY t.student_id, t.tanggal DESC, t.created_at DESC;
$$;