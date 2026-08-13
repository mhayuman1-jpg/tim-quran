-- Migrasi: ubah messages menjadi tabel thread pesan
-- Backfill reply lama -> baris pesan admin, lalu drop kolom reply/replied_by/replied_at
-- Idempoten: hanya jalan bila kolom reply masih ada.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reply'
  ) THEN
    INSERT INTO public.messages (santri_id, sender_type, sender_id, sender_name, message, is_read, created_at)
    SELECT
      m.santri_id,
      'kabid',
      COALESCE(m.replied_by::text, ''),
      COALESCE(u.name, 'Admin'),
      m.reply,
      true,
      m.replied_at
    FROM public.messages m
    LEFT JOIN public.users u ON u.id = m.replied_by
    WHERE m.reply IS NOT NULL AND m.reply <> '';

    ALTER TABLE public.messages DROP COLUMN IF EXISTS reply;
    ALTER TABLE public.messages DROP COLUMN IF EXISTS replied_by;
    ALTER TABLE public.messages DROP COLUMN IF EXISTS replied_at;
  END IF;
END $$;
