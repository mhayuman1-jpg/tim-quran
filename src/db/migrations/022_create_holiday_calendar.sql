-- 022_create_holiday_calendar.sql
-- Tabel kalender libur untuk mengelola hari libur pendidikan.
-- Ketika tanggal ada di tabel ini, sistem absensi dan jurnal
-- tidak menghitung hari tersebut sebagai hari aktif mengajar.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'holiday_calendar'
  ) THEN
    CREATE TABLE public.holiday_calendar (
      id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      date        date        NOT NULL UNIQUE,
      keterangan  text        NOT NULL,
      tipe        text        NOT NULL DEFAULT 'libur_sekolah'
                    CHECK (tipe IN ('libur_nasional', 'libur_sekolah', 'libur_agama', 'lainnya')),
      created_by  uuid        REFERENCES public.users(id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS holiday_calendar_date_idx ON public.holiday_calendar (date);
  END IF;
END $$;
