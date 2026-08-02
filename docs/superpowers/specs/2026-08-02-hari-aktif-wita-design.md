# Desain: Hari Aktif Tahfidz & Tahsin (Senin–Kamis) + Zona Waktu WITA (Dompu, NTB)

Tanggal: 2026-08-02
Status: Disetujui

## Ringkasan

Sistem saat ini tidak konsisten dalam menentukan hari aktif tahfidz/tahsin:

- `wali/progres` sudah mengecualikan Jumat(5)/Sabtu(6)/Minggu(0)
- `landing/monthly-progress` menghitung tahfidz Senin–Jumat dan tahsin hanya Senin–Rabu
- `rekap/semester`, `absensi/bulanan`, `laporan/tim` menghitung hari aktif dari data absensi tanpa filter hari
- API input hanya menolak hari libur, tidak menolak Jumat–Minggu

**Aturan final yang disetujui:**

1. Hari aktif tahfidz & tahsin = **Senin–Kamis** (getDay 1–4)
2. Jumat, Sabtu, Minggu (getDay 5, 6, 0) → **input ditolak** (error 400) dan **tidak dihitung** di semua statistik
3. Semua penentuan "hari ini"/tanggal memakai zona waktu **Asia/Makassar (WITA)** — zona Dompu, Nusa Tenggara Barat
4. Absensi (scan & kabid-mark) juga diblokir di Jumat–Minggu agar data konsisten dan % kehadiran tidak >100%

## Arsitektur

### 1. File baru `src/lib/time.ts` — sumber kebenaran waktu

```ts
export const APP_TIMEZONE = 'Asia/Makassar'; // WITA — Dompu, NTB
export function todayStr(): string;          // YYYY-MM-DD versi WITA
export function dateToStrWITA(date: Date): string; // ganti .toISOString().split('T')[0]
export function getWeekday(dateStr: string): number; // 0=Minggu .. 6=Sabtu
```

Catatan: `new Date('YYYY-MM-DD')` di-parse sebagai UTC tengah malam; tanggalnya sama di semua zona, sehingga `getWeekday` aman untuk string tanggal.

### 2. File baru `src/lib/activeDays.ts`

```ts
export const TAHFIDZ_DAYS = [1, 2, 3, 4]; // Senin–Kamis
export const TAHSIN_DAYS = [1, 2, 3, 4];
export function isActiveDay(dateStr: string): boolean;
export function requireActiveDay(dateStr): { ok: boolean; error?: Response };
```

- `requireActiveDay` mengembalikan Response 400 dengan pesan:
  *"Hari aktif tahfidz/tahsin adalah Senin s.d. Kamis. Tidak dapat melakukan aktivitas mengajar pada hari Jumat, Sabtu, atau Minggu."*
- Pola `{ok, error}` sama seperti `requireNoHoliday` di `src/lib/holiday.ts`

## Perubahan Per File

### Blokir input (pasang setelah `requireNoHoliday`)

| File | Perubahan |
|---|---|
| `src/app/api/hafalan/add/route.ts` | `requireActiveDay(tanggal)` |
| `src/app/api/tahsin/add/route.ts` | `requireActiveDay(tanggal)` |
| `src/app/api/jurnal-hafalan-tahsin/add/route.ts` | `requireActiveDay(tanggal)` |
| `src/app/api/absensi/scan/route.ts` | `requireActiveDay(tanggalHariIni)` |
| `src/app/api/absensi/kabid-mark/route.ts` | `requireActiveDay(tanggal)` |

### Filter statistik (exclude Jumat–Minggu)

| File | Perubahan |
|---|---|
| `src/app/api/landing/monthly-progress/route.ts` | `TAHSIN_DAYS` → `[1,2,3,4]`; target tahfidz dihitung Senin–Kamis (ganti `countWeekdays`); tahsin record di luar hari aktif di-skip; bulan berjalan pakai WITA |
| `src/app/api/absensi/bulanan/route.ts` | `totalHariAktif`: exclude tanggal dengan getDay 0/5/6 di samping hari libur |
| `src/app/api/laporan/tim/route.ts` | `distinctDates`: exclude weekend |
| `src/app/api/rekap/semester/route.ts` | `totalActiveDays`: exclude weekend |
| `src/app/api/wali/progres/route.ts` | sudah benar; hanya perbaiki zona waktu (lihat bawah) |

### Perbaikan zona waktu WITA

| File | Perubahan |
|---|---|
| `src/app/api/wali/progres/route.ts` | `startDate` (Minggu ini) dihitung dari `todayStr()` WITA, bukan `new Date()` + `toISOString()` |
| `src/app/api/landing/monthly-progress/route.ts` | range 6 bulan dari tanggal WITA |
| `src/app/api/website/agenda/route.ts` | `today` → `todayStr()` |
| `src/app/api/ai/catatan-generate/route.ts` | `startDate` → `dateToStrWITA` |
| `src/app/api/raport/generate/route.ts` | `startDate` → `dateToStrWITA` |
| `src/components/features/tahfidz/TahfidzForm.tsx` | default tanggal → `todayStr()` |
| `src/components/features/tahsin/TahsinForm.tsx` | default tanggal → `todayStr()` |
| `src/components/features/hafalan/HafalanForm.tsx` | default tanggal → `todayStr()` |
| `src/components/features/tahsin/JurnalHafalanTahsinForm.tsx` | default tanggal → `todayStr()` |
| `src/app/(dashboard)/absensi/page.tsx` | `toDateInputValue(new Date())` → WITA |
| `src/app/(dashboard)/absensi/monitoring/page.tsx` | default `to`/`d` → WITA |
| `src/app/wali/dashboard/page.tsx` | `setChartFrom`/`seninIni` → WITA |
| `src/app/(dashboard)/kalender-libur/page.tsx` | `today` → WITA |
| `src/app/agenda/page.tsx` | `today` → `todayStr()` |
| `src/app/(dashboard)/website/page.tsx` | `today` → `todayStr()` |
| `src/app/page.tsx` | `today` (landing) → WITA |

Catatan: `updated_at: new Date().toISOString()` di API tidak diubah — timestamp DB tetap ISO UTC (standar).

### UI teks

| File | Perubahan |
|---|---|
| `src/components/features/charts/StudentProgressChart.tsx` | "Tahfidz — Fleksibel" → "Tahfidz — Senin–Kamis"; "Tahsin — Senin, Selasa, Rabu" → "Tahsin — Senin–Kamis"; "3× per minggu (Sen–Rab)" → "4× per minggu (Sen–Kam)"; teks deskripsi jadwal disesuaikan |

## Error Handling

- Input di hari non-aktif → 400 `{ message: "Hari aktif tahfidz/tahsin adalah Senin s.d. Kamis. ..." }`
- Prioritas urutan cek di route: sesi → semester aktif → hari libur → hari aktif
- Helper `requireActiveDay` murni sync (tidak butuh supabase) karena hanya membaca getDay dari string tanggal

## Verifikasi

- Tidak ada test runner di repo (Playwright hanya untuk PDF)
- Verifikasi: `npm run build` sukses; eslint diabaikan saat build
- Uji manual: input hafalan/tahsin/scan dengan tanggal Jumat–Minggu → ditolak; cek `landing/monthly-progress`, `absensi/bulanan`, `rekap/semester` tidak lagi menghitung weekend
