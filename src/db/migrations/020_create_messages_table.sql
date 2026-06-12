-- Migration: Create messages table for parent-kabid communication
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id     uuid        NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  sender_type   text        NOT NULL CHECK (sender_type IN ('wali', 'kabid')),
  sender_id     text        NOT NULL,
  sender_name   text        NOT NULL,
  message       text        NOT NULL,
  is_read       boolean     NOT NULL DEFAULT false,
  replied_by    uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  reply         text,
  replied_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_santri_id_idx ON public.messages (santri_id);
CREATE INDEX IF NOT EXISTS messages_sender_type_idx ON public.messages (sender_type);
CREATE INDEX IF NOT EXISTS messages_is_read_idx ON public.messages (is_read);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages (created_at DESC);
