# PANDUAN MIGRASI NETLIFY → VERCEL

## Ringkasan Perubahan

### 1. Direct Upload ke Tigris (Hemat Bandwidth)

**Sebelum (lewat Vercel):**
```
User → Vercel Function (/api/upload) → Tigris
       ↓
  Fast Data Transfer (user upload)
  Fast Origin Transfer (Vercel → Tigris)
```

**Sesudah (direct ke Tigris):**
```
User → Tigris (langsung via presigned URL)
       ↓
  TIDAK hitung Vercel limit
```

**File yang diubah:**
- `src/lib/storage/tigris.ts` - Tambah `storagePresignedPutUrl()` & `storagePresignedGetUrl()`
- `src/app/api/upload/presigned/route.ts` - Route baru untuk generate presigned URL
- `src/components/shared/ImageUpload.tsx` - Update untuk direct upload

### 2. Konfigurasi Vercel

**File baru:** `vercel.json`
- Framework: Next.js
- Functions: Max duration untuk render-pdf (60s), export-docx (60s)
- Headers: CORS untuk API routes

### 3. Environment Variables

Set di Vercel Dashboard → Settings → Environment Variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://tim-quran.vercel.app

# Tigris Storage
TIGRIS_STORAGE_ACCESS_KEY_ID=...
TIGRIS_STORAGE_SECRET_ACCESS_KEY=...

# Resend (Email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@timquran.my.id

# Lainnya
NEXT_PUBLIC_AUTH_UNLOCK_CODE=...
OPENCODE_API_KEY=...
```

### 4. Domain Setup

1. Login ke Vercel Dashboard
2. Tambahkan project → Import dari Git
3. Tambahkan Custom Domain: `timquran.my.id`
4. Update DNS di provider domain:
   ```
   Type: CNAME
   Name: @ (atau www)
   Value: cname.vercel-dns.com
   ```
5. Tunggu DNS propagation (1-24 jam)
6. SSL certificate otomatis di-setup oleh Vercel

### 5. Testing Checklist

- [ ] Login (Kabid, Tim_Quran, Wali Murid)
- [ ] Upload foto profil siswa
- [ ] Upload gambar artikel
- [ ] Upload file rekap (Excel/PDF)
- [ ] Render raport PDF
- [ ] Download rekap
- [ ] Cek semua halaman dashboard
- [ ] Cek website public

### 6. Monitoring Usage

Vercel Dashboard → Usage:
- Function Invocations: 1M/bulan (Hobby)
- Fast Data Transfer: 100 GB/bulan (Hobby)
- Fast Origin Transfer: 10 GB/bulan (Hobby)
- Function Duration: 100 GB-Hrs/bulan (Hobby)

**Tips Hemat:**
1. Direct upload sudah menghemat ~30GB/bulan
2. Cache image sudah optimal (7-30 hari)
3. JWT callback perlu di-optimasi (jangan refresh DB tiap request)

### 7. Rollback Plan

Jika ada masalah:
1. Netlify masih aktif (jangan hapus dulu)
2. Update DNS kembali ke Netlify
3. Test semua fungsi
4. Hapus Vercel project setelah konfirmasi stabil

### 8. Cost Analysis

**Hobby (Gratis):**
- Cukup untuk 90% kebutuhan
- Kecuali render PDF (butuh Pro)

**Pro ($20/bulan):**
- Max duration 60s (render PDF jalan)
- Memory 3008 MB
- Bandwidth 1TB
- Support email

**Rekomendasi:**
- Mulai dengan Hobby
- Test render PDF
- Naik ke Pro jika diperlukan

---

## Troubleshooting

### Error: "Function has timed out"
- Naik ke Pro plan (max duration 60s)
- Atau kurangi complexity render PDF

### Error: "Cannot access Tigris"
- Cek environment variables
- Pastikan Tigris credentials valid

### Error: "Image not loading"
- Cek CORS headers
- Pastikan bucket policy benar

### Slow cold start
- Normal untuk Hobby plan
- Pro plan: faster cold starts

---

## Optimasi Lanjutan

### 1. JWT Callback Optimization
```typescript
// Di src/lib/auth.ts, kurangi frequency DB refresh
// Misal: refresh hanya setiap 5 menit, bukan tiap request
```

### 2. Cache Strategy
```typescript
// ISR untuk halaman statis
export const revalidate = 3600; // 1 jam
```

### 3. Image Optimization
```typescript
// next.config.mjs
images: {
  loader: 'vercel', // Gunakan Vercel Image Optimization
  formats: ['image/avif', 'image/webp'],
}
```
