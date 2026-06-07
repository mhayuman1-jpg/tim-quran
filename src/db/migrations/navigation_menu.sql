-- ── Tabel Navigation Menu ─────────────────────────────────────────────────────
-- Menyimpan item menu yang tampil di navbar publik
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  href text NOT NULL,
  urutan int4 NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index untuk sorting
CREATE INDEX IF NOT EXISTS navigation_items_urutan_idx ON public.navigation_items(urutan ASC);
CREATE INDEX IF NOT EXISTS navigation_items_is_active_idx ON public.navigation_items(is_active);

-- Seed default menu items
DELETE FROM public.navigation_items;
INSERT INTO public.navigation_items (label, href, urutan, is_active) VALUES
  ('Beranda', '/', 1, true),
  ('Profil', '/profil', 2, true),
  ('Program', '/program', 3, true),
  ('Galeri', '/galeri', 4, true),
  ('Pengumuman', '/pengumuman', 5, true),
  ('Artikel', '/artikel', 6, true),
  ('Agenda', '/agenda', 7, true)
ON CONFLICT DO NOTHING;

-- RLS Policies
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;

-- Public read access untuk halaman publik
CREATE POLICY "Allow public read" ON public.navigation_items
  FOR SELECT USING (true);

-- Admin write access
CREATE POLICY "Allow admin write" ON public.navigation_items
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM public.users 
      WHERE role = 'Kabid' OR role = 'Admin'
    )
  );
