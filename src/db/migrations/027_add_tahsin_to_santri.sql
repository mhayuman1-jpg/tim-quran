-- Simpan tingkat tahsin terkini sebagai bagian dari profil siswa.
ALTER TABLE public.santri
  ADD COLUMN IF NOT EXISTS tahsin_metode TEXT,
  ADD COLUMN IF NOT EXISTS tahsin_buku TEXT;