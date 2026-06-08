-- Kolom HTML kustom untuk editor dokumen raport (TipTap WYSIWYG)
ALTER TABLE public.raport_tahfidz
  ADD COLUMN IF NOT EXISTS html_custom TEXT;
