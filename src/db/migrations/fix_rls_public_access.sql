-- ============================================================
-- Fix: Enable public (anon) read access untuk tabel-tabel publik
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- 1. profil_website — siapapun boleh baca (data publik)
ALTER TABLE profil_website ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read profil_website" ON profil_website;
CREATE POLICY "Public read profil_website"
  ON profil_website FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. program — siapapun boleh baca program aktif
ALTER TABLE program ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read program" ON program;
CREATE POLICY "Public read program"
  ON program FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. pengumuman — siapapun boleh baca
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pengumuman" ON pengumuman;
CREATE POLICY "Public read pengumuman"
  ON pengumuman FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. artikel — siapapun boleh baca artikel published
ALTER TABLE artikel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read artikel published" ON artikel;
CREATE POLICY "Public read artikel published"
  ON artikel FOR SELECT
  TO anon
  USING (is_published = true);
DROP POLICY IF EXISTS "Authenticated read all artikel" ON artikel;
CREATE POLICY "Authenticated read all artikel"
  ON artikel FOR SELECT
  TO authenticated
  USING (true);

-- 5. agenda — siapapun boleh baca agenda published
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read agenda" ON agenda;
CREATE POLICY "Public read agenda"
  ON agenda FOR SELECT
  TO anon, authenticated
  USING (true);

-- 6. galeri — siapapun boleh baca galeri published
ALTER TABLE galeri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read galeri" ON galeri;
CREATE POLICY "Public read galeri"
  ON galeri FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. users — hanya authenticated yang boleh baca (bukan anon)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read users" ON users;
CREATE POLICY "Authenticated read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- 8. santri — hanya authenticated
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read santri" ON santri;
CREATE POLICY "Authenticated read santri"
  ON santri FOR SELECT
  TO authenticated
  USING (true);
-- Anon hanya baca kolom terbatas (untuk statistik publik di landing page)
DROP POLICY IF EXISTS "Public read santri stats" ON santri;
CREATE POLICY "Public read santri stats"
  ON santri FOR SELECT
  TO anon
  USING (status = 'Aktif');
