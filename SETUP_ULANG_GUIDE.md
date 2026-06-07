# Panduan Setup Ulang Supabase dari Awal

## Masalah yang Dihadapi

Error: `Failed to run sql query: ERROR: 42P01: relation "public.santri" does not exist`

**Penyebab:** Migration files tidak lengkap dan tidak ada tabel `santri` serta `classes` yang terdefinisi dengan baik sebelum tabel lain mencoba mereferensikannya.

---

## Solusi 1: Setup Ulang Total (Rekomendasi)

### Langkah 1: Buka Supabase SQL Editor
- Login ke Supabase Dashboard
- Pilih project kamu
- Buka `SQL Editor`

### Langkah 2: Copy & Paste SQL Setup Ulang
Buka file `SQL_SETUP_ULANG.sql` yang sudah dibuat, copy semua kodenya, paste di Supabase SQL Editor, lalu jalankan.

Atau manual:
1. Copy semua kode dari `SQL_SETUP_ULANG.sql`
2. Paste di SQL Editor
3. Klik tombol `Run` atau `Execute`

### Langkah 3: Tunggu hingga selesai
Script akan:
- Drop semua tables (dengan CASCADE untuk hapus dependency)
- Create semua tables dengan urutan yang benar
- Setup index dan foreign key relationships

### Langkah 4: Verifikasi
Di Supabase Dashboard > Database > Tables, kamu sekarang akan lihat:
- `users`
- `classes`
- `santri`
- `attendances`
- `hafalan`
- `tahsin`
- `raport_quran`
- `raport_tahfidz`
- `raport_tahfidz_detail`
- `rekap_bulanan`
- `pengumuman`
- `artikel`
- `profil_website`
- `program`
- `agenda`
- `galeri`

---

## Solusi 2: Hanya Delete Semua Tables (Jika Ingin Preserve Structure)

Jika ingin hanya hapus data tanpa recreate, gunakan `SQL_DELETE_ONLY.sql`:

1. Copy kode dari `SQL_DELETE_ONLY.sql`
2. Paste di Supabase SQL Editor
3. Run

Lalu kamu bisa jalankan migration files lagi dengan urutan yang benar.

---

## Solusi 3: Buat Project Supabase Baru (Paling Aman)

Jika ingin benar-benar bersih tanpa khawatir:

1. Buat project Supabase baru di https://supabase.com
2. Dapatkan URL dan keys baru
3. Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<new-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
   ```
4. Jalankan `SQL_SETUP_ULANG.sql` di project baru
5. Buat bucket `assets` dan set ke public

---

## Checklist Setelah Setup

- [ ] Semua 16 tables berhasil dibuat
- [ ] Bucket `assets` sudah dibuat dan `public`
- [ ] `.env.local` sudah update dengan URL dan keys yang benar
- [ ] Jalankan `npm run dev` - tidak ada error database
- [ ] Upload logo di `Kelola Website` - berhasil tanpa error
- [ ] Logo tampil di Navbar - no broken image

---

## Catatan Penting

### ⚠️ HATI-HATI - INI AKAN MENGHAPUS SEMUA DATA
File `SQL_SETUP_ULANG.sql` dan `SQL_DELETE_ONLY.sql` akan **menghapus semua data permanen**. Pastikan:
- Tidak ada data penting yang belum di-backup
- Kamu yakin ingin setup ulang
- Jalankan di environment yang benar (bukan production tanpa notice)

### 📋 Tabel Structure Baru
Struktur database yang baru sudah memperbaiki:
- ✅ Urutan tabel yang benar (dependencies)
- ✅ Kolom `photo_url` di `users` dan `santri`
- ✅ Kolom `logo_url` dan `logo_sekolah_url` di `profil_website`
- ✅ Foreign key relationships dengan CASCADE/SET NULL yang tepat
- ✅ Unique constraints dan indexes untuk performa

---

## Error Masih Keluar?

Jika masih error setelah menjalankan SQL:

1. **Pastikan tidak ada conflicting script**
   - Jangan jalankan migration files lama bersamaan

2. **Cek koneksi Supabase**
   - Verifikasi `NEXT_PUBLIC_SUPABASE_URL` di `.env.local`
   - Pastikan project sudah aktif

3. **Cek permission/policy**
   - Supabase > Database > Policies
   - Pastikan tidak ada policy yang block CREATE/DROP

4. **Hubungi support Supabase**
   - Jika persistent error di SQL Editor

---

## File-file Terkait

- `SQL_SETUP_ULANG.sql` - Script complete setup database
- `SQL_DELETE_ONLY.sql` - Script hanya delete tables
- `src/lib/supabase/migrations/` - Folder migration files (sudah obsolete setelah setup baru)

Good luck! 🚀
