# Instruksi Migration: Tambah `photo_url` ke Tabel `users`

## Overview

Migration ini menambah kolom `photo_url` (TEXT, nullable) ke tabel `users` di Supabase,
dan membuat bucket `profile-photos` di Supabase Storage untuk menyimpan foto profil anggota tim.

---

## Langkah 1 — Jalankan SQL Migration di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Buka menu **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Paste dan jalankan query berikut:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
```

6. Klik **Run** (atau tekan `Ctrl+Enter`)
7. Pastikan tidak ada error. Output yang diharapkan: `Success. No rows returned.`

---

## Langkah 2 — Buat Bucket `profile-photos` di Supabase Storage

1. Di Supabase Dashboard, buka menu **Storage** di sidebar kiri
2. Klik tombol **New Bucket**
3. Isi form dengan pengaturan berikut:

   | Setting | Nilai |
   |---------|-------|
   | **Name** | `profile-photos` |
   | **Public bucket** | ✅ Centang (public = true) |
   | **File size limit** | `5` MB (5242880 bytes) |
   | **Allowed MIME types** | `image/jpeg, image/png, image/webp, image/gif` |

4. Klik **Create Bucket**

---

## Langkah 3 — (Opsional) Tambah Storage Policy

Jika bucket perlu policy akses yang lebih ketat (misalnya hanya user terautentikasi yang bisa upload), tambah policy berikut di **Storage > profile-photos > Policies**:

```sql
-- Allow authenticated users to upload their own photos
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow public read access
CREATE POLICY "Public read access for profile photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Allow users to update/delete their own photos
CREATE POLICY "Users can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos');
```

---

## Verifikasi

Setelah migration selesai, verifikasi dengan menjalankan query ini di SQL Editor:

```sql
-- Cek kolom photo_url sudah ada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'photo_url';
```

Output yang diharapkan:
```
column_name | data_type | is_nullable
photo_url   | text      | YES
```

---

## Catatan

- Kolom `photo_url` menyimpan URL publik dari Supabase Storage
- Format URL: `https://<project-ref>.supabase.co/storage/v1/object/public/profile-photos/<path>`
- Bucket `profile-photos` bersifat **public** agar foto bisa ditampilkan tanpa autentikasi
- Maksimal ukuran file: **5 MB**
- Format yang diizinkan: **JPEG, PNG, WebP, GIF**
