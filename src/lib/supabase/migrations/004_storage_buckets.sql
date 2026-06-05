-- =============================================================================
-- Migration 004: RLS Policies untuk Supabase Storage bucket "assets"
-- 
-- SEBELUM menjalankan ini:
--   1. Buka Supabase Dashboard → Storage
--   2. Klik "New bucket"
--   3. Nama: assets, centang "Public bucket"
--   4. Klik Save
--
-- Setelah bucket dibuat, jalankan SQL di bawah ini.
-- =============================================================================

-- Hapus policy lama jika ada (agar aman dijalankan ulang)
DROP POLICY IF EXISTS "Public read assets"           ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload assets"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update assets"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete assets"  ON storage.objects;

-- 1. Siapapun bisa membaca/download file publik
CREATE POLICY "Public read assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- 2. User login bisa upload
CREATE POLICY "Authenticated upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- 3. User login bisa update
CREATE POLICY "Authenticated update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');

-- 4. User login bisa hapus
CREATE POLICY "Authenticated delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets');
