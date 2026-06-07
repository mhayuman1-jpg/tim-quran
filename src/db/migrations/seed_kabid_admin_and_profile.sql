-- Migration: Seed default Kabid admin account and website profile
-- Pastikan dijalankan dengan hak akses yang sesuai.

-- Buat akun Kabid default jika belum ada
INSERT INTO public.users (name, email, password_hash, role, status, created_at, updated_at)
VALUES (
  'Administrator Kabid',
  'kabid@timquran.id',
  'admin123',
  'Kabid',
  'Aktif',
  now(),
  now()
)
ON CONFLICT (email) DO NOTHING;

-- Buat profil website awal jika belum ada
INSERT INTO public.profil_website (nama_lembaga, deskripsi, visi, misi, alamat, email, telepon, instagram, facebook, youtube, created_at, updated_at)
SELECT
  'Tim Qur''an',
  'Program Tahfidz dan Tahsin Al-Qur''an yang berdedikasi mencetak generasi Qur''ani berakhlak mulia.',
  'Menjadi lembaga Tahfidz & Tahsin terdepan.',
  ARRAY['Pembelajaran berkualitas', 'Mencetak hafidz berakhlak'],
  'Jl. Contoh No. 1, Jakarta',
  'info@timquran.id',
  '+62 811 1234 5678',
  '@timquran',
  'https://facebook.com/timquran',
  'https://youtube.com/timquran',
  now(),
  now()
WHERE NOT EXISTS (SELECT 1 FROM public.profil_website);
