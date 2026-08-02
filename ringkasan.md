# Ringkasan Teknis — Tim Qur'an (Persiapan APK Android)

> Dokumen ini dibuat berdasarkan analisis source code tanpa mengubah, menghapus, atau membuat file lain.
> Generated: 2026-07-22

---

## 1. Identitas Proyek

- **Nama proyek:** Tim Qur'an (`tim-quran`, appId: `com.timquran.app`)
- **Tujuan utama:** Platform digital untuk mengelola program Tahfidz & Tahsin Al-Qur'an — memantau hafalan, tajwid, kehadiran, dan perkembangan santri secara real-time
- **Jenis aplikasi saat ini:** Web application (Next.js 14) dengan wrapper Android via Capacitor, deployed di Vercel
- **Fitur-fitur utama:**
  - Dashboard admin dengan statistik real-time (kehadiran, juz, santri aktif)
  - Manajemen data siswa/santri (CRUD, import/export Excel, foto profil)
  - Pencatatan hafalan & tahsin per surah (dengan metode Wafa, IWR, Al-Quran)
  - Sistem raport Tahfidz V2 (header/detail per surah, grade A/B/C/D)
  - Generate PDF raport via Playwright Chromium headless
  - Absensi dengan QR code scanning (kamera)
  - Monitoring kehadiran real-time (Kabid)
  - Upload/download rekap bulanan (Excel)
  - Manajemen pengumuman, artikel, testimoni
  - Website publik (profil, program, galeri, agenda)
  - Login Wali Murid (berbasis NIS/NISN tanpa password)
  - Sistem pesan antar-role
  - Kalender libur, semester settings
  - Role-based access control (RBAC): Kabid, Tim_Quran, Sekretaris, Bendahara, Wali_Murid
  - Mode mengajar (view-as-teacher untuk Kabid/Sekretaris)
- **Target pengguna:** Staf lembaga Tahfidz/Tahsin (Kabid, Guru/Tim_Quran, Sekretaris, Bendahara) dan Wali Murid (orang tua santri)

---

## 2. Teknologi yang Digunakan

| Aspek | Teknologi |
|---|---|
| **Bahasa pemrograman** | TypeScript (full-stack), SQL (PostgreSQL) |
| **Framework** | Next.js 14 (App Router) |
| **Frontend** | React 18, Tailwind CSS 3.4, Lucide React, Recharts, SWR, TipTap, html5-qrcode, react-to-print, html-to-image |
| **Backend** | NextAuth v4, bcryptjs, @supabase/ssr, @supabase/supabase-js, @aws-sdk/client-s3, @tigrisdata/storage, Playwright, Resend, docx, xlsx, jspdf, qrcode, tesseract.js |
| **Mobile wrapper** | Capacitor 8.4.1 (@capacitor/core, @capacitor/cli, @capacitor/android) |
| **Runtime/SDK** | Node.js (v18+ recommended), Java 17 (Android build), Android minSdk 24 / compileSdk 36 / targetSdk 36, AGP 8.13.0 |
| **Package manager** | npm |
| **Database** | PostgreSQL via Supabase (cloud-hosted) |
| **Backend hosting** | Vercel (serverless) |
| **Frontend hosting** | Vercel (Next.js) |
| **Storage** | Tigris S3-compatible (`t3.storage.dev`) — utama; Supabase Storage — overlap/legacy |
| **Autentikasi** | NextAuth v4 (Credentials Provider + Bearer HMAC token untuk mobile), JWT 24 jam, RPC `auth_user()` via pgcrypto |
| **Email** | Resend API |
| **Analytics** | Vercel Analytics + SpeedInsights |

### Environment Variables

| Variabel | Keamanan | Fungsi |
|---|---|---|
| `NEXTAUTH_SECRET` | RAHASIA | JWT signing secret |
| `NEXTAUTH_URL` | Semi-publik | Base URL untuk NextAuth callback |
| `NEXT_PUBLIC_SUPABASE_URL` | Publik | URL proyek Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publik | Anon/public key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | RAHASIA | Service role key (bypasses RLS) |
| `TIGRIS_STORAGE_ACCESS_KEY_ID` | RAHASIA | Tigris S3 access key |
| `TIGRIS_STORAGE_SECRET_ACCESS_KEY` | RAHASIA | Tigris S3 secret key |
| `RESEND_API_KEY` | RAHASIA | Resend email API key |
| `RESEND_FROM_EMAIL` | Semi-publik | Alamat pengirim email |
| `CAPACITOR_SERVER_URL` | Opsional | URL server untuk Capacitor dev mode |
| `VERCEL_URL` | Opsional | Otomatis dari Vercel deployment |
| `NODE_ENV` | Internal | Menentukan path Chromium (production/dev) |

---

## 3. Struktur Proyek

```
tim-quran-cloning/
├── android/                          # Capacitor Android wrapper
│   ├── app/
│   │   ├── build.gradle              # Build config, signing, ABI splits
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml   # Permissions, activity config
│   │   │   └── res/                  # Splash, icons, themes
│   │   └── timquran-release.keystore # Signing keystore (RAHASIA)
│   ├── build.gradle                  # Top-level Gradle config (AGP 8.13.0)
│   ├── variables.gradle              # SDK versions, library versions
│   └── gradle/                       # Gradle wrapper
├── public/                           # Static assets
│   ├── assets/                       # Logo, gambar statis
│   ├── audio/                        # File audio
│   ├── default-assets/               # Default fallback assets
│   ├── favicon.png                   # App icon (512x512)
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker
│   └── pdf.worker.mjs                # PDF.js worker
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (auth)/                   # Auth pages (login, role-select)
│   │   │   └── auth/login/           # Login page
│   │   ├── (dashboard)/              # Authenticated dashboard (25 halaman)
│   │   │   ├── absensi/              # Attendance management
│   │   │   ├── admin/                # Admin pages
│   │   │   ├── dashboard-guru/       # Teacher dashboard view
│   │   │   ├── dashboard/            # Main dashboard + sub-pages
│   │   │   ├── hafalan/              # Memorization records
│   │   │   ├── kelas/                # Class management
│   │   │   ├── keuangan/             # Finance
│   │   │   ├── laporan*/             # Reports & recap
│   │   │   ├── raport/               # Report cards
│   │   │   ├── rekap/                # Monthly recap
│   │   │   ├── scan/                 # QR scan attendance
│   │   │   ├── semester/             # Semester settings
│   │   │   ├── siswa/                # Student management
│   │   │   ├── tahfidz/              # Tahfidz records
│   │   │   ├── tahsin/               # Tahsin records
│   │   │   ├── tim/                  # Teacher team management
│   │   │   └── website/              # Website content management
│   │   ├── (print)/                  # Print layout (raport)
│   │   ├── api/                      # API routes (28 groups, 30+ endpoints)
│   │   │   ├── absensi/              # 7 endpoints
│   │   │   ├── raport/               # 9 endpoints
│   │   │   ├── siswa/                # 8 endpoints
│   │   │   ├── images/[...key]/      # S3/Tigris image proxy
│   │   │   ├── auth/                 # NextAuth route handler
│   │   │   └── ...                   # 23+ other API groups
│   │   ├── agenda/                   # Public agenda
│   │   ├── artikel/                  # Public articles
│   │   ├── galeri/                   # Public gallery
│   │   ├── info/                     # Public info
│   │   ├── layout.tsx                # Root layout (fonts, metadata, PWA)
│   │   ├── page.tsx                  # Landing page (687 baris)
│   │   ├── pengumuman/               # Public announcements
│   │   ├── profil/                   # Public profile
│   │   ├── program/                  # Public programs
│   │   └── wali/                     # Wali Murid portal
│   ├── components/
│   │   ├── features/                 # Feature components (10 direktori)
│   │   │   ├── artikel/              # Article generator
│   │   │   ├── charts/               # Attendance & progress charts
│   │   │   ├── hafalan/              # Hafalan forms
│   │   │   ├── qr-scanner/           # QR code scanner
│   │   │   ├── raport/               # Raport components
│   │   │   ├── siswa/                # Student management UI
│   │   │   ├── tahfidz/              # Tahfidz forms
│   │   │   └── tahsin/               # Tahsin forms
│   │   ├── layout/                   # Layout components
│   │   │   ├── DashboardShell.tsx     # Dashboard wrapper
│   │   │   ├── Header.tsx            # Top header
│   │   │   ├── Sidebar.tsx           # Role-based sidebar (21 menu items)
│   │   │   └── PublicNavbar.tsx       # Public navigation
│   │   ├── shared/                   # Shared components (8 file)
│   │   │   ├── DataTable.tsx          # Reusable data table
│   │   │   ├── RichTextEditor.tsx     # TipTap rich text
│   │   │   ├── ImageUpload.tsx        # Image upload widget
│   │   │   └── StudentIDCard.tsx      # Student ID card
│   │   ├── ui/                       # Primitives (Button, Input, Modal, Badge)
│   │   └── Navbar.tsx
│   ├── db/migrations/                # DB migrations 014+ (raport V2, fixes)
│   ├── hooks/                        # React hooks
│   │   ├── useSession.ts             # Auth session wrapper
│   │   ├── useRole.ts                # Role-based helpers
│   │   ├── useViewMode.tsx           # View-as-teacher mode
│   │   └── useMobileDetection.ts     # Mobile device detection
│   ├── lib/                          # Shared libraries
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── api-auth.ts               # API auth (session + mobile token)
│   │   ├── rbac.ts                   # RBAC helpers
│   │   ├── supabase/
│   │   │   ├── server.ts             # Service role client (bypasses RLS)
│   │   │   ├── client.ts             # Browser client (respects RLS)
│   │   │   ├── server-client.ts      # SSR client with retry logic
│   │   │   ├── pdf-generator.ts
│   │   │   └── migrations/           # DB migrations 001-013
│   │   ├── storage/
│   │   │   ├── tigris.ts             # S3-compatible storage wrapper
│   │   │   └── urls.ts               # Tigris key → proxy URL helper
│   │   ├── raport/                   # Raport generation (11 file)
│   │   │   ├── playwright-pdf.ts      # PDF via Playwright Chromium
│   │   │   ├── pdf-storage.ts         # PDF upload/download to Tigris
│   │   │   ├── raport-html-template.ts# HTML template
│   │   │   └── docx-renderer.ts       # DOCX generation
│   │   ├── email.ts                  # Resend email service
│   │   ├── excel.ts                  # Excel import/export
│   │   ├── surahData.ts              # Quran surah data
│   │   └── semester.ts               # Semester helpers
│   ├── styles/
│   │   └── raport-print.css          # Print-specific styles
│   └── types/
│       ├── index.ts                  # TypeScript interfaces (12 tipe)
│       └── next-auth.d.ts            # NextAuth type augmentation
├── capacitor.config.ts               # Capacitor configuration
├── next.config.mjs                   # Next.js configuration
├── package.json                      # Dependencies & scripts
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
├── vercel.json                       # Vercel deployment config
├── supabase-schema.sql               # Supplementary schema
├── .env.local                        # Environment variables (RAHASIA)
├── eslint.config.cjs                 # ESLint config
└── postcss.config.js                 # PostCSS config
```

### Penjelasan Folder Utama

| Folder | Fungsi |
|---|---|
| `android/` | Capacitor Android wrapper — build Gradle, manifest, keystore, resource Android |
| `public/` | Aset statis: favicon, manifest PWA, service worker, audio, default assets |
| `src/app/` | Halaman dan route Next.js App Router (16 grup publik + 25 dashboard + 28 API) |
| `src/components/` | Komponen React: 10 feature groups, 4 layout, 8 shared, 4 UI primitives |
| `src/lib/` | Library shared: autentikasi, RBAC, Supabase clients, storage, raport, email, Excel |
| `src/db/migrations/` | Migrasi database PostgreSQL versi 014+ |
| `src/lib/supabase/migrations/` | Migrasi database versi 001-013 |
| `src/hooks/` | React custom hooks: session, role, view mode, mobile detection |
| `src/types/` | Definisi TypeScript interfaces dan type augmentation |
| `docs/` | Dokumentasi dan spesifikasi desain |

---

## 4. Cara Menjalankan Proyek

### Persyaratan Instalasi
- Node.js v18+ (recommended)
- npm
- Chromium/Chrome (untuk Playwright PDF generation)
- Android Studio + Android SDK (untuk build APK)
- Java 17 (untuk Gradle Android build)

### Perintah Instalasi Dependency
```bash
npm install          # otomatis menjalankan: npx playwright install chromium
```

### Perintah Menjalankan Aplikasi
```bash
npm run dev          # next dev → http://localhost:3000
```

### Perintah Build
```bash
npm run build        # next build → output ke folder 'out/'
```

### Perintah Build Android
```bash
npm run cap:sync             # sync Capacitor → npx cap sync android
npm run android:build        # build + copy + gradlew assembleRelease
npm run android:debug        # build + copy + gradlew assembleDebug
npm run android:build:aab    # build + copy + gradlew bundleRelease (Play Store)
npm run android:build:quick  # copy + gradlew assembleRelease -x lint
npm run android:install      # gradlew installDebug
```

### Port
- `localhost:3000` — Next.js development server

### Kebutuhan Internet
- **SANGAT Bergantung pada internet** — seluruh data tersimpan di cloud (Supabase, Tigris, Resend)
- Tidak ada operasi offline-first atau local database
- Server backend berjalan di Vercel (serverless), bukan server lokal

---

## 5. File Konfigurasi Penting

### `capacitor.config.ts`
```typescript
appId: 'com.timquran.app'
appName: "Tim Qur'an"
webDir: 'out'                    // folder output static Next.js
server.url: 'https://timquran.my.id'  // remote URL mode
android.backgroundColor: '#fcfbf9'
// SplashScreen, StatusBar, Keyboard plugins dikonfigurasi
// Navigasi diizinkan: timquran.my.id, *.supabase.co, *.storage.dev, localhost
```

### `next.config.mjs`
```javascript
eslint: { ignoreDuringBuilds: true }      // eslint diabaikan saat build
serverComponentsExternalPackages: ['playwright-core', '@sparticuz/chromium']
// Image remote patterns: *.supabase.co, placehold.co, images.unsplash.com, timquran.my.id
// CORS headers untuk API routes (mendukung mobile app)
```

### `android/app/build.gradle`
```groovy
applicationId "com.timquran.app"
versionCode 2, versionName "1.0.1"
// ABI splits: arm64-v8a, armeabi-v7a, x86_64 + universal
// Release signing: timquran-release.keystore
// ProGuard enabled (minify + shrink resources)
// Java 17 compatibility
```

### `android/variables.gradle`
```groovy
minSdkVersion = 24          // Android 7.0
compileSdkVersion = 36
targetSdkVersion = 36
cordovaAndroidVersion = '14.0.1'
```

### `package.json` (scripts penting)
```json
"dev": "next dev",
"build": "next build",
"cap:sync": "npx cap sync android",
"cap:copy": "npx cap copy android",
"android:build": "npm run build && npx cap copy android && cd android && ./gradlew assembleRelease --no-daemon",
"android:debug": "npm run build && npx cap copy android && cd android && ./gradlew assembleDebug --no-daemon",
"android:build:aab": "npm run build && npx cap copy android && cd android && ./gradlew bundleRelease --no-daemon"
```

### `tailwind.config.js`
```javascript
// Custom colors: brand (amber), islamic (green), premium (warm brown)
// Custom fonts: Outfit (sans/display), Amiri (arabic)
// 11+ custom animations (fade, slide, bounce, glow, arabesque spin)
// Plugin: @tailwindcss/typography
```

---

## 6. Arsitektur Aplikasi

### Alur Frontend → Backend

```
[Android APK / Browser]
    │
    ├── Server Components ──→ Supabase PostgreSQL (query langsung dari server)
    │
    └── Client Components ──→ SWR ──→ API Routes (/api/*) ──→ Supabase (service role)
                                                          ──→ Tigris S3 (file operations)
```

1. **Server Components** (React 18) query Supabase langsung dari server — contoh: landing page mengambil data dari 8 tabel secara paralel
2. **Client Components** menggunakan **SWR** untuk fetch data dari API Routes (`/api/*`)
3. **API Routes** memverifikasi session via `getApiSession()` atau `getServerSession()`, lalu query Supabase menggunakan service role key
4. **Capacitor APK** memuat URL web deployed (`https://timquran.my.id`) di WebView

### Alur Penyimpanan & Pengambilan Data
- **Write:** Client → API Route → Supabase (database) atau Tigris (file via S3 SDK)
- **Read:** Client → SWR fetch → API Route → Supabase query → response JSON
- **File images:** Tigris key → proxy `/api/images/[bucket]/[key]` → streaming response dari S3
- **PDF raport:** Generate via Playwright (headless Chromium) → upload ke Tigris → presigned URL (15 menit)

### Business Logic
- **Server-side:** Semua business logic di API Routes dan lib helpers
- **RBAC & Data Isolation:** `src/lib/rbac.ts` — teacher filter, mode mengajar
- **Autentikasi:** `src/lib/auth.ts` (NextConfig), `src/lib/api-auth.ts` (session + mobile token)

### Routing/Navigasi
- **Route groups:** `(auth)` — minimal layout; `(dashboard)` — DashboardShell + Sidebar; `(print)` — minimal layout
- **Middleware:** Proteksi route berdasarkan role (Kabid-only, Manajemen-only)
- **Sidebar:** 21 menu items, filter per role, sync dari dynamic navigation config

### Pengelolaan State
- **Server state:** SWR (stale-while-revalidate)
- **Auth state:** NextAuth session (JWT cookie)
- **Client state:** React useState/useContext lokal
- **View mode:** `useViewMode` hook (Kabid bisa lihat sebagai guru tertentu)

### Autentikasi & Hak Akses
- **Web:** NextAuth Credentials Provider → JWT session cookie → middleware route protection
- **Mobile:** HMAC-signed Bearer token → `verifyMobileToken()` di `api-auth.ts`
- **RBAC:** 5 role — Kabid, Tim_Quran, Sekretaris, Bendahara, Wali_Murid
- **Data Isolation:** Tim_Quran hanya lihat siswa yang diampu (via `assigned_teacher_id`)

### Upload/Download File
- **Upload:** Client → API route → Tigris S3 via `storageUpload()`
- **Download:** Client → API route → `storagePresignedUrl()` → presigned URL 15 menit
- **Image proxy:** `/api/images/[bucket]/[key]` → streaming dari S3 (cache 1 jam)
- **PDF export:** Playwright generates → upload to Tigris → presigned download URL

---

## 7. Database

- **Jenis:** PostgreSQL via Supabase (cloud-hosted)
- **Lokasi:** Cloud (bukan lokal)

### Tabel Utama

| Tabel | Fungsi |
|---|---|
| `users` | Pengguna sistem (id, email, name, role, status, password_hash, photo_url) |
| `santri` | Data siswa (id, nisn, nama, gender, class_id, juz_terakhir, qr_code) |
| `classes` | Kelas (id, name, teacher1_id, teacher2_id, teacher3_id, wali_kelas_id) |
| `attendances` | Kehadiran (student_id, date, status, scanned_at, scanned_by) |
| `hafalan` | Catatan hafalan (student_id, teacher_id, tanggal, surah_juz, makhroj, tajwid, lancar) |
| `tahsin` | Catatan tahsin (metode: Wafa/IWR/Al-Quran, buku, halaman) |
| `raport_quran` | Raport lama (nilai integer 0-100) |
| `raport_tahfidz` | Raport V2 header (per siswa per periode, nama penandatangan) |
| `raport_tahfidz_detail` | Raport V2 detail per surah (grade A/B/C/D, wafa) |
| `semester_settings` | Pengaturan semester |
| `rekap_bulanan` | Upload rekap bulanan (file URL) |
| `pengumuman` | Pengumuman (target: Guru/Siswa/Orang Tua/Semua) |
| `artikel` | Artikel/blog |
| `juz_templates` + `juz_template_surahs` | Template juz |

Tabel tambahan (migrasi lanjutan): `galeri`, `profil_website`, `program`, `agenda`, `navigation_items`, `testimonials`, `messages`, `holiday_calendar`, `jurnal_hafalan_tahsin`.

### Catatan Penting
- Database berjalan di cloud (Supabase), bukan lokal
- Database **tidak bisa digunakan langsung di Android** — seluruh query melewati API Routes
- **Migrasi ke Android:** Tidak ada risiko migrasi karena APK hanya WebView. Jika ingin native Android, semua endpoint API perlu diakses via HTTP.

---

## 8. Ketergantungan pada Sistem Operasi

| Aspek | Ketergantungan | Kompatibilitas Android |
|---|---|---|
| File system lokal | Tidak digunakan untuk data — semua di cloud | Kompatibel |
| Chromium headless | Playwright + @sparticuz/chromium untuk PDF | Hanya di server (tidak di device) |
| Shell/CLI | `gradlew` untuk Android build | Build-time saja |
| Printer | Tidak ada integrasi printer langsung | Kompatibel |
| Kamera | html5-qrcode via browser API | Kompatibel di WebView |
| Penyimpanan perangkat | Tidak ada — semua cloud storage | Kompatibel |
| WebSocket | Tidak ada — poll via SWR | Kompatibel |
| Port server lokal | `localhost:3000` untuk development | Hanya dev mode |
| Path absolut | Tidak ada path absolut hard-coded | Kompatibel |
| Browser API | html5-qrcode, localStorage, navigator.clipboard | Kompatibel di WebView |
| Background service | Tidak ada (serverless) | Kompatibel |
| Capacitor plugins | SplashScreen, StatusBar, Keyboard | Sudah kompatibel |

**Fitur yang tidak kompatibel dengan Android:**
- Playwright PDF generation **tidak bisa berjalan di Android device** — hanya di server
- Service worker (`sw.js`) — perilaku di WebView Capacitor berbeda dari browser asli

---

## 9. Kesiapan Menjadi APK

### Pendekatan: Capacitor (SUDAH TERIMPLEMENTASI)

**Proyek sudah memiliki konfigurasi Capacitor yang lengkap:**
1. Folder `android/` sudah ada dengan build config, manifest, keystore
2. `capacitor.config.ts` sudah dikonfigurasi — app ID `com.timquran.app`, server URL pointing ke `https://timquran.my.id`
3. Android build scripts sudah ada di `package.json` (6 script)
4. `AndroidManifest.xml` sudah lengkap — permissions, FileProvider, hardware features
5. Signing keystore sudah ada (`timquran-release.keystore`)
6. ABI splits sudah dikonfigurasi — arm64-v8a, armeabi-v7a, x86_64 + universal
7. `ANDROID_OPTIMIZATION_GUIDE.md` menunjukkan optimasi mobile sudah dilakukan
8. Manifest PWA sudah ada — standalone display, portrait orientation
9. APK berfungsi sebagai WebView wrapper — memuat URL deployed, semua logic tetap di server

**Status:** APK sudah bisa di-build. Mode `server.url` menunjukkan APK memuat dari URL remote, sehingga berfungsi sebagai thin client.

**Alternatif yang TIDAK direkomendasikan:**
- Rewrite ke Flutter/React Native — terlalu mahal, buang seluruh kodebase
- PWA/TWA — Capacitor sudah lebih powerful
- WebView manual — Capacitor sudah melakukan ini dengan lebih baik

---

## 10. Fitur yang Perlu Diubah

| Fitur/Komponen | Kondisi Saat Ini | Kompatibilitas Android | Perubahan yang Dibutuhkan | Kesulitan |
|---|---|---|---|---|
| Autentikasi | NextAuth cookie + Bearer token HMAC | Kompatibel | Tidak perlu — mobile token sudah ada | Rendah |
| Dashboard & Sidebar | Responsive Tailwind CSS | Kompatibel | Sudah dioptimasi | Rendah |
| QR Scanner | html5-qrcode browser camera API | Kompatibel di WebView | Sudah berfungsi — test di device | Rendah |
| PDF Raport | Playwright Chromium headless (server) | Tidak kompatibel di device | Sudah di-handle via server API | Rendah |
| Image Proxy | `/api/images/` streaming dari Tigris | Kompatibel | Tidak perlu perubahan | Rendah |
| File Upload | Upload via API ke Tigris S3 | Kompatibel | Tidak perlu perubahan | Rendah |
| Excel Import/Export | Server-side xlsx | Kompatibel | Tidak perlu perubahan | Rendah |
| Push Notifications | Belum diimplementasi | Perlu penambahan | Tambah Firebase Cloud Messaging + Capacitor Push | Sedang |
| Offline Support | Tidak ada — full online | Tidak kompatibel | Tambah service worker caching / local cache | Tinggi |
| Rich Text Editor | TipTap browser-based | Kompatibel di WebView | Test di WebView, mungkin adjust touch | Sedang |
| Role-Based Menu | 21 menu, filter per role | Kompatibel | Tidak perlu perubahan | Rendah |
| Wali Murid Login | NIS/NISN tanpa password | Kompatibel | Tidak perlu perubahan | Rendah |
| Email Service | Resend API server-side | Kompatibel | Tidak perlu perubahan | Rendah |
| Splash Screen | Sudah dikonfigurasi di Capacitor | Kompatibel | Sudah ada — bisa optimasi further | Rendah |
| App Icon | favicon.png (512x512) | Kompatibel | Mungkin perlu adaptive icon | Rendah |
| Deep Linking | Tidak ada | Perlu penambahan | Tambah Capacitor App plugin + universal links | Sedang |
| Camera Permission | Sudah ada di manifest (optional) | Kompatibel | Sudah ada | Rendah |
| Network Detection | Tidak ada handling offline | Tidak kompatibel | Tambah connectivity detection + offline UI | Sedang |

---

## 11. Risiko dan Kendala

1. **Backend harus tetap aktif:** APK adalah WebView wrapper — tanpa server Vercel + Supabase + Tigris aktif, aplikasi tidak berfungsi. Tidak ada offline mode.

2. **Playwright Chromium di server:** PDF generation membutuhkan Chromium headless. Di Vercel serverless menggunakan `@sparticuz/chromium`. Risiko: cold start lambat, timeout.

3. **Database cloud-only:** Semua data di Supabase cloud. Tanpa internet, aplikasi completely unusable.

4. **Keamanan keystore:** Password keystore (`timquran123`) hard-coded di `build.gradle` — **sangat tidak aman** jika di-commit ke repo public. Juga, keystore file ada di dalam repo.

5. **SUPABASE_SERVICE_ROLE_KEY di server:** Key bypass RLS — semua API routes pakai service role. Risiko: API route yang tidak authenticate dengan baik bisa mengekspos data.

6. **Capacitor remote mode:** APK memuat `https://timquran.my.id` setiap kali dibuka. Jika server down/lambat, UX terganggu. Alternatives: bundled mode (`webDir: 'out'`).

7. **WebView limitations:**
   - Service worker behavior tidak konsisten di WebView
   - localStorage/cookie bisa dibersihkan oleh Android OS
   - Memory pressure di device low-end (largeHeap sudah aktif)

8. **Responsive design:** Sudah dioptimasi, namun perlu testing di berbagai ukuran layar (375px - 412px).

9. **Tidak ada background sync:** Ketika user close app, semua state hilang.

10. **API rate limiting:** Belum diketahui apakah ada — SWR polling di sidebar (30 detik) bisa membebani server.

---

## 12. Rekomendasi Implementasi

Karena proyek **sudah memiliki konfigurasi Capacitor yang lengkap**, langkah berfokus pada penyelesaian build dan optimasi.

### Langkah 1: Persiapan Proyek
- Pastikan `.env.local` berisi semua environment variables yang valid
- Pastikan Node.js v18+ dan Android Studio + SDK terinstall
- Jalankan `npm install` (termasuk `npx playwright install chromium`)
- Verifikasi `npm run dev` berjalan normal di `localhost:3000`

### Langkah 2: Verifikasi Arsitektur
- Pastikan website deployed dan accessible di `https://timquran.my.id`
- Capacitor config sudah pointing ke URL deployed — APK akan memuat dari sana
- Backend (Vercel), Database (Supabase), Storage (Tigris) harus aktif

### Langkah 3: Penyesuaian Tampilan (Opsional)
- Review `ANDROID_OPTIMIZATION_GUIDE.md` — touch targets, safe area, responsive
- Test UI di Chrome DevTools mobile mode sebelum build APK
- Pertimbangkan adaptive icon untuk Android

### Langkah 4: Integrasi Backend/Database
- Sudah terintegrasi penuh — tidak ada perubahan yang dibutuhkan

### Langkah 5: Konfigurasi Android
- Review `capacitor.config.ts` — pastikan `server.url` pointing ke production URL
- Review `android/app/build.gradle` — pastikan signing config benar
- **PERINGATAN:** Password keystore harus diganti untuk production release

### Langkah 6: Permission Android
- Sudah dikonfigurasi: INTERNET, CAMERA, VIBRATE, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE
- Jika ingin push notifications: tambah FCM + permission `POST_NOTIFICATIONS` (Android 13+)

### Langkah 7: Build APK Debug
```bash
npm run android:debug
# Output: android/app/build/outputs/apk/debug/
```

### Langkah 8: Pengujian
- Install APK di device/emulator: `npm run android:install`
- Test login, navigasi, QR scan, data siswa, raport
- Test di minimal 3 device berbeda
- Test koneksi lambat dan offline

### Langkah 9: Build APK Release
```bash
npm run android:build
# Output: android/app/build/outputs/apk/release/ (multiple APK per ABI)
```

### Langkah 10: Penandatanganan APK/AAB
- Signing sudah dikonfigurasi di `build.gradle`
- Untuk Play Store: `npm run android:build:aab` (bundle AAB)
- **SANGAT DIREKOMENDASIKAN:** Generate keystore baru dengan password kuat

---

## 13. Informasi yang Masih Dibutuhkan

1. **Versi Node.js yang digunakan** — tidak ada `.nvmrc` atau `engines` di `package.json`
2. **Apakah website production (`timquran.my.id`) sudah deployed dan stabil?**
3. **Apakah push notifications dibutuhkan?** — `google-services.json` belum ada, FCM belum dikonfigurasi
4. **Apakah offline mode dibutuhkan?** — saat ini full online
5. **APK standalone (bundled) atau remote mode (WebView ke URL)?** — saat ini remote mode
6. **Testing requirements?** — tidak ada test runner/unit tests
7. **Apakah keystore production sudah di-backup dengan aman?** — keystore saat ini di dalam repo
8. **Firebase project untuk push notifications?** — belum dikonfigurasi
9. **Deep linking / universal links?** — belum ada
10. **Fitur native Android tambahan (background sync, widget)?** — belum ada rencana

---

## 14. Ringkasan untuk AI Lain

```
PROYEK: Tim Qur'an (com.timquran.app)
TIPE: Web app (Next.js 14) + Android wrapper (Capacitor 8.4.1)

TEKNOLOGI:
- Frontend: React 18, Next.js 14 App Router, TypeScript, Tailwind CSS 3.4
- Backend: Next.js API Routes (serverless di Vercel), 28 API route groups, 30+ endpoint
- Database: PostgreSQL via Supabase (cloud) — ~15 tabel utama
- Auth: NextAuth v4 (Credentials + HMAC Bearer token untuk mobile)
- Storage: Tigris S3-compatible (assets, PDF, rekap, foto profil) + Supabase Storage (overlap)
- Email: Resend API
- PDF: Playwright Chromium headless (server-side)
- RBAC: 5 role (Kabid, Tim_Quran, Sekretaris, Bendahara, Wali_Murid) + data isolation

STRUKTUR:
- src/app/ — halaman (16 public + 25 dashboard + 28 API groups)
- src/components/ — komponen (10 feature groups, 8 shared, 4 UI primitives)
- src/lib/ — library (auth, RBAC, Supabase clients, Tigris storage, raport generation)
- android/ — Capacitor Android wrapper (sudah lengkap: build config, manifest, keystore)

CARA KERJA:
- APK = WebView wrapper yang memuat https://timquran.my.id
- Semua logic berjalan di server Vercel (API routes + server components)
- Database query via Supabase service role key (bypasses RLS)
- File storage via Tigris S3 (presigned URLs)
- QR scanner menggunakan html5-qrcode (browser camera API)
- PDF raport di-generate di server via Playwright, disimpan di Tigris, diunduh via presigned URL

DEPENDENSI PENTING:
- @capacitor/core, @capacitor/android, @capacitor/cli (8.4.1)
- @supabase/supabase-js, @supabase/ssr
- next-auth (4.24), bcryptjs
- @aws-sdk/client-s3, @tigrisdata/storage (Tigris S3)
- playwright, @sparticuz/chromium (PDF)
- resend (email), xlsx, docx, jspdf, html5-qrcode, recharts, swr

KETERGANTUNGAN OS:
- Chromium headless hanya di server (tidak bisa di Android device)
- Tidak ada file system lokal yang digunakan
- Tidak ada shell/CLI di runtime
- Camera API via html5-qrcode (compatible di WebView)

HAMBATAN MENUJU ANDROID:
- SUDAH TERKONFIGURASI — Capacitor + android/ folder sudah ada
- APK berfungsi sebagai WebView wrapper (remote mode ke timquran.my.id)
- Tidak ada offline mode — 100% bergantung pada internet
- Push notifications belum diimplementasi (perlu Firebase)
- Keystore password hard-coded di build.gradle (security risk)

PENDEKATAN APK: Capacitor (SUDAH TERIMPLEMENTASI)
- Mode: Remote server (APK memuat URL deployed)
- Build: npm run android:build
- Signing: Timquran keystore (perlu diganti untuk production)

FILE PERLU DIPERIKSA LEBIH LANJUT:
- capacitor.config.ts (server URL, navigasi)
- android/app/build.gradle (signing config, keystore password)
- android/app/src/main/AndroidManifest.xml (permissions)
- src/lib/api-auth.ts (mobile token verification)
- .env.local (semua env vars harus valid)
- src/lib/raport/playwright-pdf.ts (PDF generation flow)

LANGKAH IMPLEMENTASI BERIKUTNYA:
1. Verifikasi production deployment (timquran.my.id aktif)
2. Build APK debug: npm run android:debug
3. Test di device Android
4. Ganti keystore password untuk production
5. Build APK release: npm run android:build
6. (Opsional) Tambah push notifications via Firebase
7. (Opsional) Tambah offline caching strategy
8. Publish ke Google Play Store (AAB format)
```
