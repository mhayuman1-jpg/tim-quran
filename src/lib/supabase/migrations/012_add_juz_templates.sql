-- Migration 012: Tambahkan template juz untuk generate otomatis daftar surah
-- dan populate contoh template untuk Juz 28-30.

CREATE TABLE IF NOT EXISTS public.juz_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  juz         int         NOT NULL CHECK (juz BETWEEN 1 AND 30),
  title       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juz)
);

CREATE TABLE IF NOT EXISTS public.juz_template_surahs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  juz_template_id uuid        NOT NULL REFERENCES public.juz_templates(id) ON DELETE CASCADE,
  urutan          int         NOT NULL DEFAULT 1,
  nama_surah      text        NOT NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (juz_template_id, urutan)
);

CREATE INDEX IF NOT EXISTS juz_templates_juz_idx ON public.juz_templates (juz);
CREATE INDEX IF NOT EXISTS juz_template_surahs_juz_template_id_idx ON public.juz_template_surahs (juz_template_id);

-- Data template Juz 28-30 agar bisa langsung digunakan untuk generate otomatis
INSERT INTO public.juz_templates (juz, title)
VALUES
  (28, 'Juz 28'),
  (29, 'Juz 29'),
  (30, 'Juz 30')
ON CONFLICT (juz) DO NOTHING;

WITH inserted_juz AS (
  SELECT id, juz FROM public.juz_templates WHERE juz IN (28, 29, 30)
),
rows AS (
  SELECT
    ij.id AS juz_template_id,
    vals.urutan,
    vals.nama_surah,
    vals.notes
  FROM inserted_juz ij
  JOIN (VALUES
    (28, 1, 'Al Mujadilah', NULL),
    (28, 2, 'Al Hasyr', NULL),
    (28, 3, 'Al Mumtahanah', NULL),
    (28, 4, 'Ash Shaff', NULL),
    (28, 5, 'Al Jumuah', NULL),
    (28, 6, 'Al Munafiqun', NULL),
    (28, 7, 'At Taghabun', NULL),
    (28, 8, 'At Talaq', NULL),
    (28, 9, 'At Tahrim', NULL),
    (29, 1, 'Al Mulk', NULL),
    (29, 2, 'Al Qolam', NULL),
    (29, 3, 'Al Haqqah', NULL),
    (29, 4, 'Al Ma''arij', NULL),
    (29, 5, 'Nuh', NULL),
    (29, 6, 'Al Jinn', NULL),
    (29, 7, 'Al Muzammil', NULL),
    (29, 8, 'Al Muddassir', NULL),
    (29, 9, 'Al Qiyamah', NULL),
    (29, 10, 'Al Insan (1-20)', NULL),
    (29, 11, 'Al Mursalat', NULL),
    (30, 1, 'An Naba''', NULL),
    (30, 2, 'An Nazi''at', NULL),
    (30, 3, '''Abasa', NULL),
    (30, 4, 'At Takwir', NULL),
    (30, 5, 'Al Infitar', NULL),
    (30, 6, 'Al Mutaffifin', NULL),
    (30, 7, 'Al Insyiqaq', NULL),
    (30, 8, 'Al Buruj', NULL),
    (30, 9, 'At Tariq', NULL),
    (30, 10, 'Al A''la', NULL),
    (30, 11, 'Al Ghasyiyah', NULL),
    (30, 12, 'Al Fajr', NULL),
    (30, 13, 'Al Balad', NULL),
    (30, 14, 'Asy Syams', NULL),
    (30, 15, 'Al Lail', NULL),
    (30, 16, 'Ad Dhuha', NULL),
    (30, 17, 'Al Insyirah', NULL),
    (30, 18, 'At Tin', NULL),
    (30, 19, 'Al Alaq', NULL),
    (30, 20, 'Al Qadr', NULL),
    (30, 21, 'Al Bayyinah', NULL),
    (30, 22, 'Az Zalzalah', NULL),
    (30, 23, 'Al Adiyat', NULL),
    (30, 24, 'Al Qari''ah', NULL),
    (30, 25, 'At Takasur', NULL),
    (30, 26, 'Al Ashr', NULL),
    (30, 27, 'Al Humazah', NULL),
    (30, 28, 'Al Fil', NULL),
    (30, 29, 'Quraisy', NULL),
    (30, 30, 'Al Ma''un', NULL),
    (30, 31, 'Al Kautsar', NULL),
    (30, 32, 'Al Kafirun', NULL),
    (30, 33, 'An Nasr', NULL),
    (30, 34, 'Al Lahab', NULL),
    (30, 35, 'Al Ikhlas', NULL),
    (30, 36, 'Al Falaq', NULL),
    (30, 37, 'An Naas', NULL)
  ) AS vals(juz, urutan, nama_surah, notes)
  ON ij.juz = vals.juz
)
INSERT INTO public.juz_template_surahs (juz_template_id, urutan, nama_surah, notes)
SELECT r.juz_template_id, r.urutan, r.nama_surah, r.notes
FROM rows r
LEFT JOIN public.juz_template_surahs existing
  ON existing.juz_template_id = r.juz_template_id
  AND existing.urutan = r.urutan
WHERE existing.id IS NULL;
