-- 015_create_reports_table.sql
-- Tabel laporan otomatis dari Tim Qur'an ke Kabid/Sekretaris

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'reports'
  ) THEN
    CREATE TABLE public.reports (
      id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id      uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      periode         text        NOT NULL,
      tahun_ajaran    text        NOT NULL,
      judul           text        NOT NULL,
      ringkasan       text,
      detail_json     jsonb,
      status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'reviewed')),
      reviewed_by     uuid        REFERENCES public.users(id),
      reviewed_at     timestamptz,
      review_note     text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS reports_teacher_id_idx ON public.reports (teacher_id);
    CREATE INDEX IF NOT EXISTS reports_status_idx     ON public.reports (status);
    CREATE INDEX IF NOT EXISTS reports_periode_idx    ON public.reports (periode);
  END IF;
END $$;
