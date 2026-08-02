# 🔒 Temuan Keamanan — Audit Integrasi Flutter Mobile

**Proyek:** Tim Qur'an School Management System
**Tanggal Audit:** 22 Juli 2026
**Cakupan:** Audit source code integrasi Flutter mobile app dengan backend Next.js + Supabase

---

## Ringkasan Temuan

| Severity | Jumlah |
|----------|--------|
| 🔴 CRITICAL | 1 |
| 🟠 HIGH | 3 |
| 🟡 MEDIUM | 3 |
| 🔵 LOW | 2 |
| ⚪ INFO | 5 |
| **Total** | **14** |

---

## 🔴 CRITICAL (1)

### F-01: Endpoint Guru Tidak Mendukung Bearer Token Autentikasi

**Lokasi:** Semua endpoint guru (server-side API routes)

**Deskripsi:**
Semua endpoint guru menggunakan `getServerSession()` dari NextAuth yang **hanya mendukung autentikasi berbasis cookie**. Bearer token yang dikirim oleh Flutter **tidak akan dikenali** oleh mekanisme ini.

**Dampak:**
Semua request dari Flutter ke endpoint guru akan gagal dengan status **401 Unauthorized**. Integrasi mobile sepenuhnya tidak berfungsi untuk fitur-fitur terkait guru.

**Kondisi saat ini:**
```typescript
// Semua endpoint guru menggunakan pola ini
const session = await getServerSession(req, res, authOptions);
// ↑ Hanya menerima cookie session, TIDAK menerima Bearer token
```

**Status:** 🔴 Butuh perbaikan segera — blokir seluruh integrasi mobile.

---

## 🟠 HIGH (3)

### F-02: Endpoint mobile-login Tidak Membatasi Role

**Lokasi:** `/api/mobile-login`

**Deskripsi:**
Endpoint mobile-login tidak melakukan validasi terhadap role user yang melakukan login. **Semua role** (termasuk Bendahara, Wali_Murid) berhasil login via mobile, meskipun seharusnya hanya role **Tim_Quran** dan role dengan **mode mengajar** yang diizinkan.

**Dampak:**
Pengguna dengan role yang tidak seharusnya mengakses mobile app dapat login dan menggunakan aplikasi.

**Status:** 🟠 Butuh validasi role sebelum deploy production.

---

### F-03: Console.log Membocorkan Data Sensitif di Production

**Lokasi:** `/api/mobile-login`

**Deskripsi:**
Endpoint mobile-login mengandung `console.log` yang mencatat **email** dan **panjang password** di production environment. Log ini dapat diakses di Vercel logs oleh siapa saja yang memiliki akses ke dashboard Vercel.

**Dampak:**
Pembocoran data sensitif pengguna. Email dan metadata password (panjang) terekspos di log production.

**Status:** 🟠 Hapus console.log sebelum deploy production.

---

### F-04: Format Respons mobile-login Tidak Sesuai Spesifikasi

**Lokasi:** `/api/mobile-login`

**Deskripsi:**
Format respons endpoint mobile-login **berbeda dari spesifikasi API**:

| Field (Aktual) | Field (Spesifikasi) | Status |
|----------------|---------------------|--------|
| `api_token` | `accessToken` | ❌ Nama field berbeda |
| *(tidak ada)* | `expiresIn` | ❌ Field hilang |
| *(tidak ada)* | `photoUrl` | ❌ Field hilang |

**Dampak:**
Flutter app akan gagal parse response karena field name tidak sesuai. Menimbulkan error di client side atau data tidak lengkap.

**Status:** 🟠 Sinkronkan format response dengan spesifikasi API.

---

## 🟡 MEDIUM (3)

### F-05: Tidak Ada Endpoint Profil/Session Mobile Terpisah

**Lokasi:** Backend API

**Deskripsi:**
Tidak tersedia endpoint khusus untuk mengambil informasi profil atau session pengguna mobile. Flutter terpaksa **decode JWT secara manual** untuk mendapatkan info user, atau menggunakan endpoint lain yang belum tersedia.

**Dampak:**
Menambah kompleksitas client-side dan berpotensi menyebabkan inkonsistensi data. Jika struktur JWT berubah di backend, client akan rusak tanpa pemberitahuan.

**Status:** 🟡 Buat endpoint `/api/mobile/profile` atau `/api/mobile/session`.

---

### F-06: Format Response Tidak Konsisten Antar Endpoint

**Lokasi:** Berbagai endpoint API

**Deskripsi:**
Format response **tidak konsisten** di seluruh endpoint:

- Beberapa menggunakan `{ message }`
- Beberapa menggunakan `{ data }`
- Beberapa menggunakan `{ success, message, data }`

**Dampak:**
Flutter perlu menangani berbagai format response yang berbeda-beda. Ini menambah kompleksitas parsing dan meningkatkan risiko error.

**Status:** 🟡 Standarisasi format response untuk semua endpoint.

---

### F-07: Tidak Ada Rate Limiting

**Lokasi:** Semua endpoint, termasuk `/api/mobile-login`

**Deskripsi:**
Tidak terdeteksi adanya mekanisme rate limiting pada endpoint manapun, termasuk mobile-login yang merupakan endpoint autentikasi kritis.

**Dampak:**
Membuka celah serangan brute-force pada endpoint login. Server juga rentan terhadap abuse dan DDoS ringan.

**Status:** 🟡 Implementasikan rate limiting, terutama pada endpoint autentikasi.

---

## 🔵 LOW (2)

### F-08: mobile-login Tidak Memvalidasi Status Akun Aktif

**Lokasi:** `/api/mobile-login` (cabang RPC `auth_user`)

**Deskripsi:**
Endpoint mobile-login tidak memvalidasi apakah akun dalam status **aktif** sebelum generate token. User nonaktif yang berhasil verifikasi RPC akan mendapat token dan bisa login ke mobile app.

**Dampak:**
User yang seharusnya dinonaktifkan masih bisa mengakses mobile app.

**Status:** 🔵 Tambahkan pengecekan status akun aktif setelah verifikasi password.

---

### F-09: Tidak Ada Mekanisme Token Revocation/Blacklist

**Lokasi:** Sistem autentikasi secara umum

**Deskripsi:**
Tidak ada mekanisme untuk mencabut atau memblacklist token. Jika user melakukan logout, **token lama masih valid** selama durasi maxAge (24 jam).

**Dampak:**
Token yang "sudah logout" masih bisa digunakan untuk mengakses endpoint selama masa aktifnya. Risiko ini berkurang untuk mobile app karena token tersimpan lokal, namun tetap perlu diperhatikan untuk skenario pencurian token.

**Status:** 🔵 Pertimbangkan implementasi token blacklist atau refresh token rotation.

---

## ⚪ INFO (5)

### F-10: CORS Headers Hanya Mengizinkan localhost

**Lokasi:** `/api/mobile-login` (CORS headers)

**Deskripsi:**
CORS headers di mobile-login hanya mengizinkan origins `localhost`. Untuk production Flutter app, ini sudah benar — **native app tidak mengalami CORS restrictions** seperti browser.

**Status:** ⚪ Tidak perlu perubahan.

---

### F-11: Password Hashing Menggunakan Mekanisme yang Aman

**Lokasi:** Backend authentication

**Deskripsi:**
Password hashing menggunakan **bcryptjs** dan RPC `auth_user` dengan **pgcrypto**. Kedua mekanisme ini merupakan standar industri yang aman.

**Status:** ⚪ Tidak perlu perubahan.

---

### F-12: Endpoint Images Proxy Tidak Memerlukan Autentikasi

**Lokasi:** `/api/images/[...key]`

**Deskripsi:**
Endpoint proxy gambar tidak memerlukan autentikasi. Ini **sengaja dirancang** agar gambar bisa diakses secara publik. Hanya file di bucket yang diizinkan yang bisa diakses melalui proxy ini.

**Status:** ⚪ Desain yang tepat — tidak perlu perubahan.

---

### F-13: Service Role Key Hanya Digunakan Server-Side

**Lokasi:** Semua endpoint

**Deskripsi:**
Semua endpoint menggunakan service role key di **server-side**. Tidak ada service role key yang dikirim ke client.

**Status:** ⚪ Praktik keamanan yang baik — tidak perlu perubahan.

---

### F-14: NextAuth Session Strategy JWT (maxAge 24 jam)

**Lokasi:** NextAuth configuration

**Deskripsi:**
NextAuth menggunakan session strategy **JWT** dengan `maxAge` **86400 detik (24 jam)**. Ini berarti session cookie expired setelah 24 jam.

**Status:** ⚪ Konfigurasi standar — tidak perlu perubahan.

---

## Rekomendasi Perbaikan

### Prioritas 1 — CRITICAL (Harus diperbaiki sekarang)

1. **[F-01] Implementasikan autentikasi Bearer token di endpoint guru**
   - Buat middleware autentikasi yang mendukung JWT Bearer token untuk request dari mobile app.
   - Contoh implementasi:
     ```typescript
     // middleware.ts atau di dalam route handler
     const authHeader = req.headers.get('authorization');
     if (authHeader?.startsWith('Bearer ')) {
       const token = authHeader.slice(7);
       const decoded = verify(token, JWT_SECRET);
       // Gunakan decoded user info
     } else {
       // Fallback ke getServerSession() untuk web
       const session = await getServerSession(req, res, authOptions);
     }
     ```
   - Buat utility function `verifyMobileToken()` yang bisa digunakan di semua endpoint.

### Prioritas 2 — HIGH (Harus diperbaiki sebelum deploy production)

2. **[F-02] Validasi role di mobile-login**
   - Tambahkan pengecekan role sebelum generate token:
     ```typescript
     const allowedRoles = ['Tim_Quran', ...teachingRoles];
     if (!allowedRoles.includes(user.role)) {
       return res.status(403).json({
         success: false,
         message: 'Role Anda tidak diizinkan untuk mengakses mobile app'
       });
     }
     ```

3. **[F-03] Hapus console.log sensitif**
   - Hapus atau redact semua `console.log` yang mencatat email dan password di endpoint mobile-login.
   - Gunakan structured logging dengan redaction untuk debugging di production.

4. **[F-04] Standarisasi format response mobile-login**
   - Ubah field `api_token` → `accessToken`
   - Tambahkan field `expiresIn` (dalam detik)
   - Tambahkan field `photoUrl` dari profil user

### Prioritas 3 — MEDIUM (Perlu diperbaiki dalam waktu dekat)

5. **[F-05] Buat endpoint profil/session mobile**
   - Buat endpoint `GET /api/mobile/profile` yang mengembalikan data profil user berdasarkan token.
   - Ini mengurangi kebutuhan Flutter untuk decode JWT sendiri.

6. **[F-06] Standarisasi format response**
   - Tentukan format response standar (rekomendasi: `{ success: boolean, message: string, data: any }`).
   - Buat utility function `apiResponse()` untuk konsistensi.
   - Migrasi endpoint yang ada secara bertahap.

7. **[F-07] Implementasikan rate limiting**
   - Gunakan package seperti `express-rate-limit` atau `next-rate-limit`.
   - Terapkan rate limiting khusus pada endpoint autentikasi (misal: 5 attempt per menit per IP).
   - Untuk endpoint lain, gunakan rate limiting umum (misal: 100 request per menit per IP).

### Prioritas 4 — LOW (Perlu diperhatikan)

8. **[F-08] Validasi status akun aktif**
   - Setelah verifikasi password berhasil, cek field `is_active` atau status akun sebelum generate token.
   - Kembalikan error `403` dengan pesan "Akun Anda tidak aktif" jika akun nonaktif.

9. **[F-09] Pertimbangkan token revocation**
   - **Opsi ringan:** Gunakan refresh token — saat logout, hapus refresh token dari database.
   - **Opsi berat:** Implementasikan token blacklist di Redis/Supabase.
   - Untuk mobile app (token tersimpan lokal), opsi ringan sudah cukup memadai.

---

*Document generated by security source code audit — 22 Juli 2026*
