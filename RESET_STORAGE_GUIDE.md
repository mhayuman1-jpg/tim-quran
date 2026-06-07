# Reset Storage Supabase - Panduan

Script `scripts/reset-storage.js` membersihkan bucket `assets` lama dan setup ulang dengan file default.

**📸 Update:** Script sekarang support semua format gambar (JPG, PNG, WebP, GIF, SVG, dll)

## Apa yang dilakukan script:

1. **Hapus semua file** di bucket `assets` Supabase
2. **Upload file default** (placeholder logo dan avatar)
3. **Update database** `profil_website` dengan URL logo baru

## Cara menjalankan:

### Prerequisite:
- `.env.local` sudah ada dengan:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
  ```
- Dependencies sudah install:
  ```bash
  npm install @supabase/supabase-js dotenv
  ```

### Jalankan script:

```bash
# Dari root folder proyek
node scripts/reset-storage.js
```

Atau bisa juga:
```bash
npm run reset:storage
```
(Jika sudah ditambahkan di `package.json`)

## Output yang diharapkan:

```
=====================================
🔧 Reset Supabase Storage - Assets
=====================================
Supabase URL: https://xxx.supabase.co
Bucket: assets

🗑️  Step 1: Membersihkan bucket 'assets'...
✓ 5 file berhasil dihapus.

📤 Step 2: Upload file default ke bucket 'assets'...
✓ logo/default.svg berhasil diupload.
✓ avatar/default.svg berhasil diupload.

📝 Step 3: Update database dengan URL baru...
✓ Database profil_website berhasil diupdate.
  Logo URL: https://xxx.supabase.co/storage/v1/object/public/assets/logo/default.svg

✅ Selesai! Storage sudah di-reset dan dikonfigurasi ulang.
```

## Langkah selanjutnya:

1. Jalankan `npm run dev`
2. Buka http://localhost:3000/dashboard/website
3. Upload logo Tim Qur'an dan Logo Sekolah via UI
4. Verifikasi logo muncul di navbar

## Troubleshooting:

### Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ada
- Pastikan `.env.local` ada di root proyek
- Pastikan variables sudah benar

### Error: Bucket 'assets' tidak ada
- Buka Supabase Dashboard
- Storage → New Bucket → Name: assets → Public: ON → Save

### Error: Permission denied
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` adalah key yang tepat (bukan anon key)
- Key harus punya permission untuk menghapus dan membuat file di storage

## Catatan Keamanan:

- Script ini menggunakan `SUPABASE_SERVICE_ROLE_KEY` (kunci admin)
- Jangan share `.env.local` ke public repo
- Jangan jalankan script ini dari untrusted source

## ⚙️ Mengaktifkan Semua Format Gambar di Bucket

Untuk mendukung semua tipe gambar (bukan hanya SVG), ikuti langkah ini di Supabase Dashboard:

1. **Buka Supabase Dashboard** → Storage
2. **Klik bucket `assets`** → Klik icon **Settings** (⚙️)
3. Di bagian **"Allowed MIME types"**, ada 2 pilihan:
   - **Kosongkan field** (allow semua tipe file)
   - **Atau set ke format spesifik:**
     ```
     image/jpeg, image/png, image/webp, image/gif, image/svg+xml, image/bmp, image/tiff
     ```
4. Klik **Save** dan tunggu proses selesai

### Format gambar yang di-support:
- ✅ JPG/JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ WebP (`.webp`)
- ✅ GIF (`.gif`)
- ✅ SVG (`.svg`)
- ✅ BMP (`.bmp`)
- ✅ TIFF (`.tiff`)

### Upload gambar dengan berbagai format:

Setelah bucket di-config, kamu bisa upload via UI dashboard atau programmatically:

```javascript
// Upload JPG
const { error } = await supabase.storage
  .from('assets')
  .upload('logo/sekolah.jpg', file, {
    contentType: 'image/jpeg',
    upsert: true
  });

// Upload PNG
const { error } = await supabase.storage
  .from('assets')
  .upload('avatar/user.png', file, {
    contentType: 'image/png',
    upsert: true
  });

// Upload WebP
const { error } = await supabase.storage
  .from('assets')
  .upload('foto/kegiatan.webp', file, {
    contentType: 'image/webp',
    upsert: true
  });
```
