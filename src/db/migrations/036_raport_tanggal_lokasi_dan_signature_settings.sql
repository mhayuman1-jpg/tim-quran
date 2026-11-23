-- 036: kolom tanggal/lokasi penerimaan raport (sudah bisa diedit inline, tapi belum tersimpan),
-- plus tabel pengaturan tanda tangan (Kabid & Kepala Sekolah) agar cukup diisi sekali.
-- Idempotent — aman dijalankan ulang.

ALTER TABLE raport_tahfidz
  ADD COLUMN IF NOT EXISTS tanggal TEXT,
  ADD COLUMN IF NOT EXISTS lokasi  TEXT;

CREATE TABLE IF NOT EXISTS raport_signature_settings (
  id                     TEXT PRIMARY KEY DEFAULT 'default',
  nama_kabid             TEXT,
  niy_kabid              TEXT,
  nama_kepala_sekolah    TEXT,
  niy_kepala_sekolah     TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verifikasi:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'raport_tahfidz' AND column_name IN ('tanggal', 'lokasi');
--   SELECT * FROM raport_signature_settings;
