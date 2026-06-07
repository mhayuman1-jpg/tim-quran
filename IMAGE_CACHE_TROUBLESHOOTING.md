# Troubleshooting: Gambar Tidak Tampil Setelah Upload

## Masalah

Gambar sudah berhasil upload ke Supabase Storage, tapi tampilan di website tidak berubah. Masih menampilkan placeholder atau gambar lama.

## Penyebab

Ada 3 level caching yang bisa bikin gambar tidak langsung tampil:

1. **Browser Cache** — Browser menyimpan gambar lama
2. **Next.js ISR Cache** — Halaman ter-cache di server (revalidate 0 = tidak pernah revalidate)
3. **Database tidak ter-update** — URL di `profil_website` belum tersimpan dengan benar

---

## Solusi 1: Clear Browser Cache (Immediate)

### Cepat: Hard Refresh
```
Tekan: Ctrl+Shift+R  (Windows/Linux)
atau   Cmd+Shift+R   (Mac)
```

### Lengkap: Clear All Cache
1. **DevTools** → F12
2. **Network** tab
3. Checklist: ✓ "Disable cache"
4. Hard refresh: Ctrl+Shift+R
5. Tutup DevTools

### Via Browser Settings
- **Chrome**: Settings → Privacy → Clear browsing data → Images and files
- **Firefox**: Preferences → Privacy → Clear Data → Cache

---

## Solusi 2: Verifikasi Database URL (Database Level)

Pastikan URL di Supabase sudah ter-update:

1. **Buka Supabase Dashboard** → Database
2. Cari tabel `profil_website`
3. Lihat kolom `logo_url` dan `logo_sekolah_url`
4. **URL seharusnya**: `https://xxx.supabase.co/storage/v1/object/public/assets/logo/[filename]`

**Jika masih lama:**
- Kembali ke dashboard **Kelola Website** 
- Klik **Upload ulang** image
- Tunggu toast "Tersimpan otomatis" muncul

---

## Solusi 3: Tunggu Revalidation Selesai (Server Cache)

### Sebelum Fix
`revalidate = 0` artinya halaman **tidak pernah** di-revalidate setelah build. Jadi gambar lama ter-cache selamanya.

### Setelah Fix ✅
`revalidate = 60` artinya halaman akan **revalidate setiap 60 detik**. Gambar baru akan tampil paling lama dalam 1 menit.

**Cara mempercepat:**
- Tunggu ~60 detik setelah upload
- Lalu hard refresh (Ctrl+Shift+R)

---

## Solusi 4: Cache Busting (Client Level)

Kode sudah di-update dengan **automatic cache-busting query parameter**:

```
Gambar lama:  https://xxx.supabase.co/storage/v1/object/public/assets/logo/default.svg
Gambar baru:  https://xxx.supabase.co/storage/v1/object/public/assets/logo/default.svg?t=123456
```

Query parameter `?t=` berisi timestamp menit saat ini, jadi berubah setiap menit.

### File yang di-update:
- ✅ [src/app/page.tsx](src/app/page.tsx) — Landing page revalidate setiap 60 detik
- ✅ [src/components/layout/PublicNavbar.tsx](src/components/layout/PublicNavbar.tsx) — Navbar auto cache-bust setiap menit
- ✅ [src/app/api/website/profil/route.ts](src/app/api/website/profil/route.ts) — GET endpoint `force-dynamic` (fetch fresh data)

---

## Checklist Debugging

Jika gambar **masih** tidak tampil setelah mencoba semua solusi:

### 1. Verifikasi API Response
```javascript
// Buka DevTools Console (F12 → Console)
fetch('https://[project].supabase.co/rest/v1/profil_website?select=*',
  {
    headers: {
      'apikey': 'YOUR_ANON_KEY',
      'Authorization': 'Bearer YOUR_ANON_KEY'
    }
  }
).then(r => r.json()).then(d => console.log(d))
```
Lihat apakah `logo_url` menunjuk ke file baru.

### 2. Cek URL di Network Tab
```
DevTools → Network → Cari request ke Supabase URL
Lihat Response tab → Apakah logo_url sudah baru?
```

### 3. Direct Access to Image
Coba akses URL gambar langsung di browser:
```
https://jrvbjgjmgncqjnxpzgtl.supabase.co/storage/v1/object/public/assets/logo/[filename]
```
Jika gambar tidak muncul → Bucket permission atau file tidak ada.

### 4. Check Browser Console Errors
```
DevTools → Console tab
Cari error merah tentang 403 Forbidden atau 404 Not Found
```

---

## Jika Masih Error

### Error: 403 Forbidden
**Penyebab**: Bucket permission tidak public
**Fix**: Supabase Dashboard → Storage → bucket `assets` → Settings → Public: ON

### Error: 404 Not Found
**Penyebab**: File tidak ada di storage atau path salah
**Fix**: Upload ulang di dashboard Kelola Website

### Error: CORS Issues
**Penyebab**: Browser memblok request lintas domain
**Fix**: Sudah dikonfigurasi di `next.config.mjs` → tidak perlu di-fix

---

## Timeline Perubahan

| No | Waktu | Status | File |
|---|---|---|---|
| 1 | Upload di dashboard | ✅ Auto-save 5 menit | `/api/website/profil` |
| 2 | Gambar di storage | ✅ Instant | Supabase Storage |
| 3 | DB ter-update | ✅ 10 detik | `profil_website` table |
| 4 | Navbar + landing page | ⏳ 1 menit | Next.js revalidate setiap 60s |
| 5 | Browser cache update | ⏳ Instant - 60s | Client-side cache-bust |

**Total waktu**: 1-2 menit hingga semua tempat ter-update.

---

## Prevention Tips

1. **Always check browser console** — ada warning? Fix sekarang juga
2. **Hard refresh setelah upload** — jangan andalkan auto-refresh
3. **Verifikasi di dashboard Supabase** — pastikan file benar-benar terupload
4. **Cek Network tab** — lihat HTTP status code setiap request

---

## Pertanyaan Umum

**Q: Kenapa perlu cache-busting?**
A: Agar browser dan Next.js tidak cache gambar lama. Dengan `?t=timestamp`, setiap URL terlihat unik.

**Q: Bagaimana kalau di production?**
A: Proses sama. Revalidate `60s` berarti perubahan tampil maksimal 1 menit.

**Q: Bisa dipercepat?**
A: Iya, ubah `revalidate = 60` jadi `revalidate = 10` di `page.tsx` untuk revalidate setiap 10 detik (lebih aman untuk production).

---

## Next: Gunakan OnDemand ISR (Advanced)

Jika ingin perubahan **instant tanpa menunggu 60 detik**, gunakan On-Demand ISR:

```typescript
// Di /api/revalidate endpoint
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const tag = req.nextUrl.searchParams.get('tag');
  revalidateTag(tag);
  return NextResponse.json({ revalidated: true });
}
```

Saat user upload → call endpoint ini → halaman revalidate instant.

Ini bisa dikonfigurasi di `handleLogoUpload()` function untuk result yang lebih instant.
