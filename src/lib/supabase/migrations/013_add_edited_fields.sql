-- 013_add_edited_fields.sql
-- Menambahkan kolom edited_fields (JSONB) pada tabel hafalan dan tahsin
-- untuk melacak timestamp edit per-field.
-- Contoh isi: {"makhroj": "2026-06-10T14:30:00Z", "tajwid": "2026-06-11T09:00:00Z"}

ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS edited_fields JSONB DEFAULT '{}';
ALTER TABLE tahsin ADD COLUMN IF NOT EXISTS edited_fields JSONB DEFAULT '{}';
