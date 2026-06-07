# Panduan Deploy ke Vercel

## 📋 Prasyarat
- Akun Vercel (buat di https://vercel.com)
- Repository GitHub (sudah terkoneksi dengan proyek)
- Vercel CLI (opsional, untuk deploy dari lokal)

## 🚀 Cara 1: Deploy via GitHub (Recommended)

### 1. Push Kode ke GitHub
```bash
cd "C:\Users\OPHIR\Pictures\KABID2026\tim-quran"
git add .
git commit -m "Fix: Add type corrections and Vercel config for deployment"
git push origin main
```

### 2. Connect Repository di Vercel
1. Buka https://vercel.com/dashboard
2. Klik "Add New" → "Project"
3. Pilih "Import Git Repository"
4. Cari repository "tim-quran" dan klik "Import"
5. Pilih framework: **Next.js** (akan terdeteksi otomatis)

### 3. Konfigurasi Environment Variables
Setelah import, di halaman "Configure Project":

1. Klik **Environment Variables**
2. Tambahkan variabel berikut (dari `.env.local`):
   - `NEXTAUTH_URL`: `https://yourdomain.vercel.app` (sesuaikan dengan domain Anda)
   - `NEXTAUTH_SECRET`: (copy dari .env.local)
   - `NEXT_PUBLIC_SUPABASE_URL`: (copy dari .env.local)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (copy dari .env.local)
   - `SUPABASE_SERVICE_ROLE_KEY`: (copy dari .env.local)

3. Klik **Deploy**

---

## 🔧 Cara 2: Deploy via Vercel CLI (Local)

### 1. Install Vercel CLI (jika belum)
```bash
npm install -g vercel
```

### 2. Login ke Vercel
```bash
vercel login
```

### 3. Deploy Project
```bash
cd "C:\Users\OPHIR\Pictures\KABID2026\tim-quran"
vercel --prod
```

Saat pertama kali, akan ditanya:
- **Set up and deploy?** → `Y`
- **Which scope?** → Pilih akun personal atau organization
- **Detected project settings?** → Tekan Enter untuk default
- **Environment variables?** → Isi sesuai instruksi di atas

---

## 🔑 Catatan Penting Environment Variables

Untuk mendapatkan nilai environment variables:

1. **NEXTAUTH_SECRET**: Generate dengan:
   ```bash
   openssl rand -base64 32
   ```
   Atau copy dari `.env.local` jika sudah ada

2. **SUPABASE Variables**: Copy dari https://supabase.com
   - Project Settings → API
   - Salin `URL` dan `Anon Key`
   - Salin `Service Role Key` dari "Service Role" tab

3. **NEXTAUTH_URL**: Akan diberikan oleh Vercel setelah deploy pertama (format: `https://[project-name].vercel.app`)

---

## 📦 Struktur Deploy

Vercel akan secara otomatis:
- Menjalankan `npm ci` (install dependencies)
- Menjalankan `npm run build` (build Next.js)
- Menjalankan `npm run start` di production

---

## ✅ Verifikasi Deploy Berhasil

1. Buka URL yang diberikan Vercel (e.g., `https://tim-quran.vercel.app`)
2. Verifikasi halaman login berfungsi
3. Login dan test fitur-fitur utama
4. Periksa console (Vercel Dashboard → Logs) untuk error

---

## 🔄 Update Setelah Deploy

Setiap kali ada perubahan kode:
```bash
git add .
git commit -m "Your message"
git push origin main
```

Vercel akan otomatis rebuild dan redeploy dalam beberapa menit.

---

## 🆘 Troubleshooting

### Build Error: "MODULE_NOT_FOUND"
**Solusi**: Pastikan `vercel.json` benar dan semua dependencies ada di `package.json`

### Deploy Timeout
**Solusi**: Tingkatkan timeout di Vercel Project Settings

### Environment Variable tidak terdeteksi
**Solusi**: 
1. Verifikasi nama variable sesuai (case-sensitive)
2. Trigger redeploy di Vercel Dashboard

---

**Status**: ✅ Siap Deploy!
- ✅ Build local: Berhasil
- ✅ vercel.json: Sudah dibuat
- ⏳ Tunggu push ke GitHub dan connect di Vercel
