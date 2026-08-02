# MOBILE_API_CONTRACT.md — Kontrak API untuk Flutter Tim Qur'an Pengajar

> Dokumen ini mendefinisikan kontrak API yang harus dipenuhi untuk aplikasi Flutter.
> Endpoint yang ditandai **[PERLU PERUBAHAN]** harus diperbaiki di Tahap 2 sebelum Flutter dapat menggunakannya.

---

## 1. Autentikasi

### 1.1 POST `/api/auth/mobile-login` — Login Mobile

**Status: [PERLU PERUBAHAN]** — Role restriction dan format respons

**Request:**
```json
POST /api/auth/mobile-login
Content-Type: application/json

{
  "email": "guru@example.com",
  "password": "password123"
}
```

**Response Sukses (200):**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 86400,
    "user": {
      "id": "uuid-string",
      "name": "Nama Guru",
      "email": "guru@example.com",
      "role": "Tim_Quran",
      "photoUrl": "https://..."
    }
  }
}
```

**Response Gagal (401):**
```json
{
  "success": false,
  "message": "Email atau password salah.",
  "errorCode": "INVALID_CREDENTIALS"
}
```

**Response Akun Nonaktif (403):**
```json
{
  "success": false,
  "message": "Akun Anda tidak aktif. Hubungi administrator.",
  "errorCode": "ACCOUNT_INACTIVE"
}
```

**Response Role Tidak Diizinkan (403):**
```json
{
  "success": false,
  "message": "Akun Anda tidak memiliki akses ke aplikasi pengajar.",
  "errorCode": "ROLE_NOT_ALLOWED"
}
```

**Perubahan yang dibutuhkan:**
1. Tambah validasi role: hanya `Tim_Quran`, `Kabid`, `Sekretaris` yang boleh login
2. Normalisasi format response: gunakan `accessToken` bukan `api_token`
3. Tambah `expiresIn` dalam detik
4. Tambah `photoUrl` di response user
5. Tambah `message` field
6. Hapus `console.log` yang mencakup email dan password length
7. Validasi `status === 'Nonaktif'` di cabang RPC auth_user

---

### 1.2 GET `/api/auth/mobile-profile` — Profil Mobile

**Status: [BARU]** — Belum ada endpoint ini

**Request:**
```
GET /api/auth/mobile-profile
Authorization: Bearer <access_token>
```

**Response Sukses (200):**
```json
{
  "success": true,
  "message": "Profil berhasil diambil",
  "data": {
    "id": "uuid-string",
    "name": "Nama Guru",
    "email": "guru@example.com",
    "role": "Tim_Quran",
    "photoUrl": "https://...",
    "status": "Aktif"
  }
}
```

---

## 2. Header Autentikasi

Semua request ke endpoint yang dilindungi harus menyertakan:
```
Authorization: Bearer <access_token>
```

Untuk Kabid/Sekretaris dalam Mode Mengajar:
```
Authorization: Bearer <access_token>
x-view-mode: teaching
x-view-as-teacher-id: <teacher_uuid>
```

---

## 3. Format Response Standar

### Response Sukses:
```json
{
  "success": true,
  "message": "Deskripsi singkat",
  "data": {}
}
```

### Response Gagal:
```json
{
  "success": false,
  "message": "Pesan yang aman untuk pengguna",
  "errorCode": "ERROR_CODE"
}
```

### Code Error yang Digunakan:
| Kode | HTTP Status | Deskripsi |
|------|-------------|-----------|
| `INVALID_CREDENTIALS` | 401 | Email/password salah |
| `TOKEN_EXPIRED` | 401 | Token kedaluwarsa |
| `TOKEN_INVALID` | 401 | Token tidak valid |
| `SESSION_REQUIRED` | 401 | Tidak ada token |
| `ACCOUNT_INACTIVE` | 403 | Akun nonaktif |
| `ROLE_NOT_ALLOWED` | 403 | Role tidak diizinkan |
| `FORBIDDEN` | 403 | Tidak punya akses ke resource |
| `NOT_FOUND` | 404 | Resource tidak ditemukan |
| `VALIDATION_ERROR` | 400 | Validasi gagal |
| `DUPLICATE` | 409 | Data duplikat |
| `SERVER_ERROR` | 500 | Kesalahan server |

---

## 4. Endpoint Guru (Memerlukan Bearer Token)

### 4.1 Dashboard

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/dashboard/stats-guru` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**Query Parameters:** Tidak ada

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSantriAktif": 15,
    "kehadiranHariIni": {
      "hadir": 12,
      "total": 15,
      "persentase": 80.0
    },
    "ringkasanJuz": [
      { "juz": 29, "count": 8 },
      { "juz": 30, "count": 7 }
    ],
    "recentHafalan": [],
    "recentTahsin": []
  }
}
```

---

### 4.2 Kelas

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/kelas/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Kelas 1A",
      "jumlah_siswa": 15,
      "teacher1": { "id": "uuid", "name": "Guru 1", "email": "..." },
      "teacher2": null,
      "teacher3": null
    }
  ]
}
```

---

### 4.3 Siswa

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/siswa/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/siswa/update` | PUT | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**GET Query Parameters:**
- `search` (string, opsional) — Filter nama
- `class_id` (string, opsional) — Filter kelas
- `limit` (int, default 100, max 500)
- `offset` (int, default 0)

**GET Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nisn": "001234",
      "nama": "Ahmad",
      "gender": "Laki-laki",
      "tanggal_lahir": "2015-01-01",
      "class_id": "uuid",
      "juz_terakhir": 30,
      "qr_code": "ABC123",
      "photo_url": "...",
      "assigned_teacher_id": "uuid",
      "status": "Aktif",
      "classes": { "id": "uuid", "name": "Kelas 1A" }
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

**PUT Request:**
```json
{
  "id": "uuid",
  "juz_terakhir": 29,
  "photo_url": "https://..."
}
```

**PUT Response:**
```json
{
  "success": true,
  "message": "Data siswa berhasil diperbarui.",
  "data": { ... }
}
```

---

### 4.4 Absensi

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/absensi/scan` | POST | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/absensi/harian` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/absensi/today` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**POST /api/absensi/scan:**
```json
Request:  { "qr_code": "ABC123" }
Response: { "success": true, "message": "Absen berhasil!", "data": { "nama": "Ahmad", "id": "uuid" } }
```

**GET /api/absensi/harian?date=2026-07-22&class_id=uuid:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nisn": "001234",
      "nama": "Ahmad",
      "gender": "Laki-laki",
      "kelas": "Kelas 1A",
      "status": "Hadir"
    }
  ],
  "date": "2026-07-22"
}
```

---

### 4.5 Hafalan

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/hafalan/add` | POST | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/hafalan/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/hafalan/update` | PUT | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**POST /api/hafalan/add:**
```json
{
  "student_id": "uuid",
  "tanggal": "2026-07-22",
  "surah_juz": "Ad-Duha",
  "halaman": 5,
  "makhroj": "A",
  "tajwid": "B",
  "lancar": "A",
  "catatan": "Alhamdulillah"
}
```

---

### 4.6 Tahsin

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/tahsin/add` | POST | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/tahsin/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**POST /api/tahsin/add:**
```json
{
  "student_id": "uuid",
  "tanggal": "2026-07-22",
  "metode": "Wafa",
  "buku": "Iqra 3",
  "halaman": 10,
  "makhroj": "A",
  "kelancaran": "B",
  "adab": "A",
  "catatan": ""
}
```

---

### 4.7 Jurnal Hafalan & Tahsin

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/jurnal-hafalan-tahsin/add` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/jurnal-hafalan-tahsin/add` | POST | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**GET Query:** `?student_id=uuid&tanggal=2026-07-22`

**POST Body:**
```json
{
  "student_id": "uuid",
  "tanggal": "2026-07-22",
  "detail": [
    { "nama_surah": "Ad-Duha", "makhroj": "A", "tajwid": "B", "lancar": "A" }
  ],
  "tahsin_metode": "Wafa",
  "tahsin_buku": "Iqra 3",
  "tahsin_halaman": "10",
  "tahsin_makhroj": "A",
  "tahsin_kelancaran": "B",
  "tahsin_adab": "A",
  "tahsin_catatan": ""
}
```

---

### 4.8 Raport

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/raport/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/raport/tahfidz` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/raport/tahfidz` | POST | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/raport/tahfidz` | PUT | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/raport/generate` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |
| `/api/raport/render-pdf` | GET | **[PERLU PERUBAHAN]** | Bearer | Tim_Quran, Kabid*, Sekretaris* |

**GET /api/raport/render-pdf?raportId=uuid&filename=raport.pdf**
- Returns: Redirect (302) ke signed URL atau streaming PDF
- Flutter harus handle redirect dan download

---

### 4.9 Rekap

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/rekap/semester` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua (filtered by teacher) |
| `/api/rekap/download` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua (filtered by teacher) |

**GET /api/rekap/download?periode=2026-07&format=excel**
- Returns: File binary (Excel atau PDF)

---

### 4.10 Pengumuman

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/pengumuman/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "judul": "Libur Nasional",
      "isi": "...",
      "target": "Semua",
      "created_by": "uuid",
      "created_by_name": "Kabid",
      "created_at": "2026-07-22T..."
    }
  ]
}
```

---

### 4.11 Pesan

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/messages/list` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |
| `/api/messages/send` | POST | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |
| `/api/messages/unread-count` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |

---

### 4.12 Kalender Libur

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/kalender-libur` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |

**GET Query:** `?year=2026&month=7`

---

### 4.13 Upload & Gambar

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/upload` | POST | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |
| `/api/images/[...key]` | GET | ✅ Siap | Tanpa Auth | Publik |

**POST /api/upload?bucket=timquran-profile-photos&folder=profile**
- Body: multipart/form-data dengan field `file`
- Returns: `{ url: "/api/images/timquran-profile-photos/profile/..." }`

**GET /api/images/timquran-assets/logo/default.svg**
- Returns: File binary (gambar)
- ✅ Sudah bisa diakses tanpa auth dari Flutter

---

### 4.14 Semester

| Endpoint | Method | Status | Auth | Role |
|----------|--------|--------|------|------|
| `/api/semester/config` | GET | **[PERLU PERUBAHAN]** | Bearer | Semua authenticated |

---

## 5. Catatan Penting

### 5.1 Mode Mengajar (Kabid/Sekretaris)
Ketika Kabid atau Sekretaris menggunakan mode mengajar, Flutter harus mengirim header tambahan:
```
x-view-mode: teaching
x-view-as-teacher-id: <teacher_uuid>
```

### 5.2 Data Isolation
Backend memastikan pengajar hanya melihat data yang diizinkan. Parameter dari Flutter tidak dipercaya — backend memvalidasi semuanya berdasarkan token.

### 5.3 Signing Method
Token menggunakan HMAC-SHA256 (bukan RSA). Secret = NEXTAUTH_SECRET. Format JWT standar: `header.payload.signature`. Base64url encoding.

### 5.4 Token Expiry
Token berlaku 24 jam (86400 detik). Tidak ada refresh token — user harus login ulang.
