-- ==============================================================================
-- DELETE SEMUA TABLES DI SUPABASE (SAJA, TANPA RECREATE)
-- GUNAKAN INI JIKA INGIN HANYA BERSIHKAN TABLES EXISTING
-- ==============================================================================

DROP TABLE IF EXISTS public.raport_tahfidz_detail CASCADE;
DROP TABLE IF EXISTS public.raport_tahfidz CASCADE;
DROP TABLE IF EXISTS public.galeri CASCADE;
DROP TABLE IF EXISTS public.artikel CASCADE;
DROP TABLE IF EXISTS public.pengumuman CASCADE;
DROP TABLE IF EXISTS public.rekap_bulanan CASCADE;
DROP TABLE IF EXISTS public.raport_quran CASCADE;
DROP TABLE IF EXISTS public.tahsin CASCADE;
DROP TABLE IF EXISTS public.hafalan CASCADE;
DROP TABLE IF EXISTS public.attendances CASCADE;
DROP TABLE IF EXISTS public.profil_website CASCADE;
DROP TABLE IF EXISTS public.program CASCADE;
DROP TABLE IF EXISTS public.agenda CASCADE;
DROP TABLE IF EXISTS public.santri CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Selesai - semua tables sudah dihapus
