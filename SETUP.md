# Setup Guide — Tim Qur'an Website

Panduan lengkap untuk menyiapkan database, storage, dan environment variables sebelum menjalankan aplikasi.

---

## Prasyarat

- Akun [Supabase](https://supabase.com) dengan project aktif
- Node.js 18+ dan npm/yarn
- File `.env.local` di root project (lihat bagian Environment Variables)

---

## 1. Jalankan SQL Migrations

Buka **Supabase Dashboard → SQL Editor**, lalu jalankan kedua file berikut secara berurutan.

### Step 1 — Buat tabel baru

Salin dan jalankan seluruh isi file:

```
src/lib/supabase/migrations/001_create_tables.sql
```

File ini membuat tabel-tabel berikut (aman dijalankan ulang):

| Tabel | Deskripsi |
|---|---|
| `users` | Akun pengguna dashboard (Kabid & Tim_Quran) |
| `attendances` | Catatan absensi harian siswa via QR |
| `hafalan` | Setoran hafalan harian |
| `tahsin` | Sesi tahsin harian |
| `raport_quran` | Raport penilaian per periode |
| `rekap_bulanan` | Metadata file rekap yang diunggah |
| `pengumuman` | Pengumuman untuk audiens tertentu |
| `artikel` | Artikel untuk halaman publik |

### Step 2 — Update tabel santri

Salin dan jalankan seluruh isi file:

```
src/lib/supabase/migrations/002_update_santri.sql
```

File ini menambahkan kolom berikut ke tabel `santri` yang sudah ada (aman dijalankan ulang):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `tanggal_lahir` | `date` | Tanggal lahir siswa |
| `photo_url` | `text` | URL foto profil siswa |
| `assigned_teacher_id` | `uuid` | FK ke `users(id)` — guru pembimbing |
| `updated_at` | `timestamptz` | Waktu update terakhir |

> **Catatan:** Jika tabel `santri` belum ada sama sekali, lihat file `supabase-schema.sql` di root project untuk skema dasarnya, lalu jalankan migration 001 dan 002 setelahnya.

### Step 5 — Tambah logo sekolah ke profil website

Salin dan jalankan seluruh isi file:

```
src/lib/supabase/migrations/005_add_logo_sekolah.sql
```

File ini menambahkan kolom berikut ke tabel `profil_website` (aman dijalankan ulang):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `logo_sekolah_url` | `text` | URL logo sekolah/yayasan — tampil di kiri header ID Card |
| `nama_sekolah` | `text` | Nama sekolah/yayasan — tampil di footer ID Card |

### Step 6 — Tabel galeri foto kegiatan

Salin dan jalankan seluruh isi file:

```
src/lib/supabase/migrations/006_galeri.sql
```

File ini membuat tabel berikut (aman dijalankan ulang):

| Tabel | Deskripsi |
|---|---|
| `galeri` | Foto-foto dokumentasi kegiatan yang tampil di halaman publik |

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `uuid` | Primary key |
| `judul` | `text` | Judul/keterangan foto |
| `deskripsi` | `text` | Deskripsi opsional |
| `foto_url` | `text` | URL foto di Supabase Storage |
| `urutan` | `int` | Urutan tampil (ascending) |
| `is_published` | `boolean` | Tampil di website publik |

---

## 2. Setup Supabase Storage Bucket

File rekap bulanan (Excel/PDF) disimpan di Supabase Storage. Ikuti langkah berikut:

1. Buka **Supabase Dashboard → Storage**
2. Klik **New bucket**
3. Isi nama bucket: `rekap`
4. Pilih **Private** (bukan public) agar hanya bisa diakses via signed URL
5. Klik **Create bucket**

### Konfigurasi RLS Storage (opsional tapi disarankan)

Di **Storage → rekap → Policies**, tambahkan policy:

```sql
-- Izinkan authenticated user upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rekap');

-- Izinkan authenticated user download
CREATE POLICY "Allow authenticated download"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'rekap');
```

---

## 3. Environment Variables

Buat file `.env.local` di root project dengan isi berikut:

```env
# URL project Supabase
# Dapatkan di: Supabase Dashboard → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Anon key (public) — untuk operasi client-side
# Dapatkan di: Supabase Dashboard → Settings → API → anon public
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# Service Role key (rahasia) — untuk API routes server-side
# Dapatkan di: Supabase Dashboard → Settings → API → service_role secret
# JANGAN expose ke client-side atau commit ke git
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Secret untuk signing JWT NextAuth — gunakan string acak panjang
# Generate: openssl rand -base64 32
NEXTAUTH_SECRET=ganti_dengan_string_acak_yang_panjang

# URL aplikasi (gunakan http://localhost:3000 untuk development)
NEXTAUTH_URL=http://localhost:3000

# Email (Resend) — untuk notifikasi ke anggota Tim Qur'an
# Dapatkan API key gratis di: https://resend.com
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@domain-anda.com
```

> **Penting:** Pastikan `.env.local` sudah ada di `.gitignore`. Jangan commit file ini ke repositori.

---

## 4. Buat Akun Kabid Pertama

Setelah migration selesai, buat akun Kabid secara manual melalui Supabase SQL Editor:

```sql
-- Ganti nilai email, name, dan password_hash sesuai kebutuhan
-- Password hash di bawah adalah contoh untuk password: "password123"
-- Generate hash baru dengan: node -e "const b=require('bcryptjs');b.hash('passwordmu',10).then(console.log)"
INSERT INTO public.users (name, email, password_hash, role, status)
VALUES (
  'Nama Kabid',
  'kabid@example.com',
  '$2a$10$GANTI_DENGAN_HASH_BCRYPT_YANG_VALID',
  'Kabid',
  'Aktif'
);
```

Setelah akun Kabid dibuat, login ke dashboard dan tambahkan akun Tim_Quran melalui menu **Tim Qur'an**.

---

## 5. Jalankan Aplikasi

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## Urutan Setup Lengkap (Ringkasan)

```
1. Buat project Supabase
2. Jalankan supabase-schema.sql (jika santri & classes belum ada)
3. Jalankan 001_create_tables.sql di SQL Editor
4. Jalankan 002_update_santri.sql di SQL Editor
5. Jalankan 005_add_logo_sekolah.sql di SQL Editor
6. Jalankan 006_galeri.sql di SQL Editor
7. Buat Storage bucket "rekap" (Private)
8. Salin .env.local dan isi dengan kredensial Supabase
9. Buat akun Kabid pertama via SQL Editor
10. npm install && npm run dev
11. Login dengan akun Kabid dan mulai gunakan aplikasi
```
