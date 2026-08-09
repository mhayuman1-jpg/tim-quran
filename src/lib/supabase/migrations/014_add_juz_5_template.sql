-- Migration 014: Tambahkan / perbaiki template Juz 5 (An-Nisa lengkap dengan rentang ayat)

-- Hapus data surah lama untuk Juz 5 (jika ada)
DELETE FROM public.juz_template_surahs
WHERE juz_template_id IN (
  SELECT id FROM public.juz_templates WHERE juz = 5
);

-- Upsert Juz 5
INSERT INTO public.juz_templates (juz, title)
VALUES (5, 'Juz 5')
ON CONFLICT (juz) DO UPDATE SET title = EXCLUDED.title;

-- Insert surah baru
WITH inserted_juz AS (
  SELECT id, juz FROM public.juz_templates WHERE juz = 5
)
INSERT INTO public.juz_template_surahs (juz_template_id, urutan, nama_surah, notes)
SELECT ij.id, vals.urutan, vals.nama_surah, vals.notes
FROM inserted_juz ij
JOIN (VALUES
  (5, 1,  'An Nisa (24-33)',   NULL),
  (5, 2,  'An Nisa (34-44)',   NULL),
  (5, 3,  'An Nisa (45-59)',   NULL),
  (5, 4,  'An Nisa (60-74)',   NULL),
  (5, 5,  'An Nisa (75-86)',   NULL),
  (5, 6,  'An Nisa (87-94)',   NULL),
  (5, 7,  'An Nisa (95-105)',  NULL),
  (5, 8,  'An Nisa (106-121)', NULL),
  (5, 9,  'An Nisa (122-134)', NULL),
  (5, 10, 'An Nisa (135-147)', NULL)
) AS vals(juz, urutan, nama_surah, notes)
ON ij.juz = vals.juz;
