# 🚀 INSTRUKSI DEPLOY KE VERCEL - STEP BY STEP

## Status Persiapan ✅
- [x] Build lokal: **Berhasil**
- [x] Vercel CLI: **Terinstall**
- [x] Konfigurasi vercel.json: **Sudah dibuat**
- [ ] Login ke Vercel: **Tunggu instruksi di bawah**
- [ ] Deploy: **Siap dilakukan**

---

## 📋 Step 1: Siapkan Vercel Account & Environment Variables

### Jika belum punya akun Vercel:
1. Buka https://vercel.com/signup
2. Daftar (bisa pakai GitHub account)

### Siapkan Environment Variables:
Ambil dari file `.env.local` yang sudah ada:

```env
NEXTAUTH_URL=https://tim-quran.vercel.app  # (akan berubah sesuai domain Vercel)
NEXTAUTH_SECRET=<copy dari .env.local>
NEXT_PUBLIC_SUPABASE_URL=<copy dari .env.local>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copy dari .env.local>
SUPABASE_SERVICE_ROLE_KEY=<copy dari .env.local>
```

Jika NEXTAUTH_SECRET belum ada, generate dengan:
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([guid]::NewGuid().ToString()))
```

---

## 🔐 Step 2: Login ke Vercel CLI

Buka PowerShell dan jalankan:

```powershell
vercel login
```

Ini akan:
1. Membuka browser dan menampilkan halaman login Vercel
2. Klik "Continue" untuk authorize
3. Browser akan menutup otomatis setelah sukses

---

## 🎯 Step 3: Deploy Project

Dari folder proyek, jalankan:

```powershell
cd "C:\Users\OPHIR\Pictures\KABID2026\tim-quran"
vercel --prod
```

### Menjawab Pertanyaan Deploy:

| Pertanyaan | Jawaban |
|-----------|---------|
| **Set up and deploy \`/path/to/project\`?** | `Y` atau tekan Enter |
| **Which scope do you want to deploy to?** | Pilih nama Anda / Organization |
| **Link to existing project?** | `N` (untuk project baru) |
| **What's your project's name?** | `tim-quran` (bisa sesuaikan) |
| **In which directory is your code located?** | Tekan Enter (default `.`) |

### Setelah Deploy Success:
Vercel akan menampilkan:
```
✓ Project linked to [your-project]
✓ Inspect: https://vercel.com/[team]/tim-quran/[deployment-id]
✓ Production: https://tim-quran.vercel.app
```

**Catat URL production yang diberikan!** (misal: `https://tim-quran.vercel.app`)

---

## 🔧 Step 4: Set Environment Variables di Vercel

Setelah deploy pertama, environment variables perlu diset di dashboard Vercel:

### Via CLI:
```powershell
vercel env add NEXTAUTH_URL
# Masukkan: https://tim-quran.vercel.app (URL dari step 3)

vercel env add NEXTAUTH_SECRET
# Masukkan: <secret key dari .env.local>

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Masukkan: <URL dari .env.local>

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Masukkan: <key dari .env.local>

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Masukkan: <key dari .env.local>
```

### Atau Via Dashboard:
1. Buka https://vercel.com/dashboard
2. Klik project "tim-quran"
3. Tab "Settings" → "Environment Variables"
4. Tambahkan 5 variables di atas

---

## ✅ Step 5: Redeploy dengan Environment Variables

```powershell
vercel --prod
```

Kali ini produksi akan berjalan dengan environment variables yang benar.

---

## 🧪 Step 6: Verifikasi Deploy

1. **Buka URL production**: https://tim-quran.vercel.app
2. **Test Login**: Coba login dengan credentials yang ada
3. **Test Features**:
   - Buka Dashboard
   - Lihat Monthly Recap Template
   - Test download PDF/Excel di Raport
4. **Cek Logs** (jika ada error):
   - Dashboard Vercel → Project → Deployments
   - Klik deployment terbaru → Logs

---

## 📝 Command Shortcuts

| Tujuan | Command |
|--------|---------|
| Deploy Preview | `vercel` |
| Deploy Production | `vercel --prod` |
| Lihat Logs | `vercel logs` |
| List Environment Vars | `vercel env ls` |
| Hapus Environment Var | `vercel env rm VAR_NAME` |

---

## 🆘 Troubleshooting

### ❌ Error: "No GitHub token found"
**Solusi**: Jangan perlu GitHub token untuk deploy via CLI. Abaikan.

### ❌ Error: "ECONNREFUSED" atau timeout saat deploy
**Solusi**: 
- Cek koneksi internet
- Coba `vercel --prod` lagi
- Tunggu beberapa saat lalu retry

### ❌ Error: "Missing environment variables"
**Solusi**: Pastikan semua 5 environment variables sudah di-set di Vercel Dashboard

### ❌ Login loop di aplikasi
**Solusi**: Ubah `NEXTAUTH_URL` ke URL production yang benar (cek di dashboard Vercel)

### ❌ Build error di Vercel
**Solusi**:
- Cek `Logs` di dashboard Vercel
- Verifikasi semua package di `package.json` ada
- Coba `npm run build` lokal lagi

---

## 📊 Monitoring Setelah Deploy

1. **Vercel Analytics**: https://vercel.com/dashboard
   - Lihat performance, traffic, deployments

2. **Application Logs**:
   ```powershell
   vercel logs --prod
   ```

3. **Redeploy Jika Ada Update**:
   ```powershell
   vercel --prod
   ```

---

## 🎉 Selesai!

Aplikasi **Tim Qur'an** sudah live di production Vercel! 

**Berikutnya** (optional):
- Setup custom domain (Settings → Domains)
- Configure automatic deployments dengan GitHub
- Setup monitoring/alerts untuk errors

---

**Butuh bantuan?** Kembali ke instruksi sebelumnya atau cek: https://vercel.com/docs
