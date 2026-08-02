# Hari Aktif Tahfidz/Tahsin (Senin–Kamis) + Zona Waktu WITA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Terapkan aturan hari aktif tahfidz/tahsin Senin–Kamis (Jumat/Sabtu/Minggu ditolak saat input dan tidak dihitung di statistik) serta menyeragamkan semua penentuan "hari ini" ke zona waktu WITA (Asia/Makassar — Dompu, NTB).

**Architecture:** Dua helper terpusat baru (`src/lib/time.ts` untuk waktu WITA, `src/lib/activeDays.ts` untuk hari aktif) menjadi satu sumber kebenaran. Semua API input memanggil `requireActiveDay` setelah `requireNoHoliday`; semua route statistik memfilter tanggal weekend; semua default tanggal "hari ini" memakai `todayStr()`.

**Tech Stack:** Next.js 14 App Router, TypeScript, path alias `@/*` → `src/*`.

## Global Constraints

- Tidak ada test runner di repo (Playwright hanya untuk PDF generation). Verifikasi tiap task = `npm run build` sukses + cek diff.
- `npm run lint` selalu exit 0; eslint tidak menghalangi build.
- Bahasa UI/pesan error: Indonesia.
- `updated_at: new Date().toISOString()` di DB **tidak diubah** (timestamps tetap ISO UTC).
- Hari: 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu.
- Hari aktif = getDay **1–4** (Senin–Kamis). Jumat(5), Sabtu(6), Minggu(0) = non-aktif.

---
## Task 1: Helper terpusat `src/lib/time.ts` + `src/lib/activeDays.ts`

**Files:**
- Create: `src/lib/time.ts`
- Create: `src/lib/activeDays.ts`

**Interfaces:**
- Produces (dipakai semua task berikut):
  - `time.ts`: `APP_TIMEZONE: string`, `todayStr(): string`, `dateToStrWITA(date: Date): string`, `getWeekday(dateStr: string): number`
  - `activeDays.ts`: `TAHFIDZ_DAYS: number[]`, `TAHSIN_DAYS: number[]`, `isActiveDay(dateStr: string): boolean`, `requireActiveDay(dateStr: string): { ok: boolean; error?: Response }`, `ACTIVE_DAY_ERROR_MESSAGE: string`

- [ ] **Step 1: Buat `src/lib/time.ts`**

```ts
// src/lib/time.ts
// Sumber kebenaran waktu aplikasi — zona WITA (Asia/Makassar), Dompu, NTB.

export const APP_TIMEZONE = 'Asia/Makassar';

/** Tanggal hari ini dalam format YYYY-MM-DD versi WITA. */
export function todayStr(): string {
  return dateToStrWITA(new Date());
}

/** Konversi Date ke string YYYY-MM-DD versi WITA (pengganti .toISOString().split('T')[0]). */
export function dateToStrWITA(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIMEZONE }).format(date);
}

/** Index hari dalam seminggu (0=Minggu .. 6=Sabtu) untuk string tanggal YYYY-MM-DD. */
export function getWeekday(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCDay();
}
```

Catatan: `new Date('YYYY-MM-DD')` di-parse sebagai UTC tengah malam; dengan `dateToStrWITA` hasilnya tetap tanggal kalender yang sama (00:00 UTC = 08:00 WITA hari yang sama), jadi aman untuk string tanggal.

- [ ] **Step 2: Buat `src/lib/activeDays.ts`**

```ts
// src/lib/activeDays.ts
// Hari aktif tahfidz/tahsin: Senin s.d. Kamis. Jumat, Sabtu, Minggu = libur mengajar.

import { getWeekday } from '@/lib/time';

// 0=Minggu, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis, 5=Jumat, 6=Sabtu
export const TAHFIDZ_DAYS = [1, 2, 3, 4];
export const TAHSIN_DAYS = [1, 2, 3, 4];

export const ACTIVE_DAY_ERROR_MESSAGE =
  'Hari aktif tahfidz/tahsin adalah Senin s.d. Kamis. Tidak dapat melakukan aktivitas mengajar pada hari Jumat, Sabtu, atau Minggu.';

/** Cek apakah tanggal (YYYY-MM-DD) adalah hari aktif. */
export function isActiveDay(dateStr: string): boolean {
  return TAHFIDZ_DAYS.includes(getWeekday(dateStr));
}

/** Return {ok} atau {ok:false, error: Response 400} — pola sama seperti requireNoHoliday. */
export function requireActiveDay(dateStr: string): { ok: boolean; error?: Response } {
  if (!isActiveDay(dateStr)) {
    return {
      ok: false,
      error: new Response(
        JSON.stringify({ message: ACTIVE_DAY_ERROR_MESSAGE }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { ok: true };
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 4: Commit**

```bash
git add src/lib/time.ts src/lib/activeDays.ts
git commit -m "feat: helper waktu WITA dan hari aktif Senin-Kamis"
```

---
## Task 2: Blokir input hafalan, tahsin, jurnal (API)

**Files:**
- Modify: `src/app/api/hafalan/add/route.ts` (setelah `requireNoHoliday` baris 58-60)
- Modify: `src/app/api/tahsin/add/route.ts` (setelah baris 66-68)
- Modify: `src/app/api/jurnal-hafalan-tahsin/add/route.ts` (setelah baris 161-163)

**Interfaces:**
- Consumes: `requireActiveDay` dari `@/lib/activeDays` (Task 1)
- Produces: 3 route menolak input tanggal Jumat–Minggu dengan 400

- [ ] **Step 1: Tambah import di ketiga file**

Tambahkan baris berikut di blok import (bersama import `requireNoHoliday` yang sudah ada):

```ts
import { requireActiveDay } from '@/lib/activeDays';
```

- [ ] **Step 2: Tambahkan cek di `hafalan/add/route.ts`**

Sisipkan tepat setelah blok `requireNoHoliday` (baris 58-60), sebelum blok `if (!teacherId)`:

```ts
    // Cek hari aktif — tolak input di Jumat, Sabtu, Minggu
    const activeDayCheck = requireActiveDay(tanggal);
    if (activeDayCheck.error) return activeDayCheck.error;
```

- [ ] **Step 3: Tambahkan cek di `tahsin/add/route.ts`**

Sisipkan tepat setelah blok `requireNoHoliday` (baris 66-68):

```ts
    // Cek hari aktif — tolak input di Jumat, Sabtu, Minggu
    const activeDayCheck = requireActiveDay(tanggal);
    if (activeDayCheck.error) return activeDayCheck.error;
```

- [ ] **Step 4: Tambahkan cek di `jurnal-hafalan-tahsin/add/route.ts`**

Sisipkan tepat setelah blok `requireNoHoliday` (baris 161-163):

```ts
    // Cek hari aktif — tolak input di Jumat, Sabtu, Minggu
    const activeDayCheck = requireActiveDay(tanggal);
    if (activeDayCheck.error) return activeDayCheck.error;
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/hafalan/add/route.ts src/app/api/tahsin/add/route.ts src/app/api/jurnal-hafalan-tahsin/add/route.ts
git commit -m "feat: blokir input hafalan/tahsin/jurnal di Jumat-Sabtu-Minggu"
```

---
## Task 3: Blokir absensi scan & kabid-mark (API)

**Files:**
- Modify: `src/app/api/absensi/scan/route.ts` (setelah baris 93-95)
- Modify: `src/app/api/absensi/kabid-mark/route.ts` (setelah baris 145-147)

**Interfaces:**
- Consumes: `requireActiveDay` dari `@/lib/activeDays` (Task 1)
- Produces: scan & kabid-mark menolak hari Jumat–Minggu

- [ ] **Step 1: Tambah import di kedua file**

```ts
import { requireActiveDay } from '@/lib/activeDays';
```

- [ ] **Step 2: Cek di `absensi/scan/route.ts`**

`today` sudah dihitung WITA di baris 88-91. Sisipkan tepat setelah blok `requireNoHoliday` (baris 93-95):

```ts
    // 2c. Cek hari aktif — tolak scan di Jumat, Sabtu, Minggu
    const activeDayCheck = requireActiveDay(today);
    if (activeDayCheck.error) return activeDayCheck.error;
```

- [ ] **Step 3: Cek di `absensi/kabid-mark/route.ts`**

`date` sudah ditentukan WITA di baris 135-139. Sisipkan tepat setelah blok `requireNoHoliday` (baris 145-147):

```ts
    // Cek hari aktif — tolak input di Jumat, Sabtu, Minggu
    const activeDayCheck = requireActiveDay(date);
    if (activeDayCheck.error) return activeDayCheck.error;
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/absensi/scan/route.ts src/app/api/absensi/kabid-mark/route.ts
git commit -m "feat: blokir absensi (scan & kabid-mark) di Jumat-Sabtu-Minggu"
```

---
## Task 4: `landing/monthly-progress` — hari aktif Senin–Kamis + WITA

**Files:**
- Modify: `src/app/api/landing/monthly-progress/route.ts`

**Interfaces:**
- Consumes: `TAHFIDZ_DAYS`, `TAHSIN_DAYS` dari `@/lib/activeDays`; `todayStr` dari `@/lib/time` (Task 1)
- Produces: progress tahfidz & tahsin hanya dari sesi Senin–Kamis; target bulanan = Senin–Kamis; range bulan dari WITA

- [ ] **Step 1: Ganti konstanta lokal dengan import**

Hapus baris 6-9 (komentar jadwal + `const TAHSIN_DAYS = [1, 2, 3];`) dan tambahkan import:

```ts
import { TAHFIDZ_DAYS, TAHSIN_DAYS } from '@/lib/activeDays';
import { todayStr } from '@/lib/time';
```

- [ ] **Step 2: Ganti `getSixMonthRange` (baris 29-37) pakai WITA**

```ts
function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date(todayStr() + 'T00:00:00');
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    return { label, key };
  });
}
```

- [ ] **Step 3: Hapus `countWeekdays` dan ganti pemakaiannya**

Hapus fungsi `countWeekdays` (baris 49-57). Di blok `progressData` (baris 122-144), ganti:

```ts
const totalWeekdays = countWeekdays(y, m - 1);
```

menjadi:

```ts
const totalWeekdays = countExpectedSessions(y, m - 1, TAHFIDZ_DAYS);
```

- [ ] **Step 4: Filter record tahfidz ke hari aktif**

Di loop `tahfidzByMonth` (baris 100-108), tambahkan di awal loop:

```ts
      const dateStr = String(record.tanggal);
      if (!TAHFIDZ_DAYS.includes(getDayOfWeek(dateStr))) continue;
```

(baris `const dateStr` di loop tahfidz saat ini ditulis ulang; loop tahsin di baris 111-120 sudah memakai `TAHSIN_DAYS` sehingga otomatis ikut Senin–Kamis.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/landing/monthly-progress/route.ts
git commit -m "feat: landing monthly-progress hitung hari aktif Senin-Kamis + zona WITA"
```

---
## Task 5: Filter weekend di `absensi/bulanan`, `laporan/tim`, `rekap/semester`

**Files:**
- Modify: `src/app/api/absensi/bulanan/route.ts` (baris 114-126)
- Modify: `src/app/api/laporan/tim/route.ts` (baris 137-141 & 158-167)
- Modify: `src/app/api/rekap/semester/route.ts` (baris 150-155 & 163-164)

**Interfaces:**
- Consumes: `isActiveDay` dari `@/lib/activeDays` (Task 1)
- Produces: `total_hari_aktif` dan jumlah hadir hanya menghitung tanggal Senin–Kamis di ketiga laporan

- [ ] **Step 1: Import `isActiveDay` di ketiga file**

```ts
import { isActiveDay } from '@/lib/activeDays';
```

- [ ] **Step 2: `absensi/bulanan/route.ts` — filter numerator & denominator**

Ganti blok baris 114-120:

```ts
    // 4. Hitung total hari aktif = distinct dates yang punya SETIDAKNYA satu record, dikurangi hari libur
    const uniqueDates = new Set(records.map((r) => r.date));
    // Hanya hitung hari yang bukan libur
    let totalHariAktif = 0;
    for (const d of Array.from(uniqueDates)) {
      if (!holidaySet.has(d)) totalHariAktif++;
    }
```

dengan:

```ts
    // 4. Hitung total hari aktif = distinct dates (hanya Senin-Kamis, bukan libur)
    const activeRecords = records.filter((r) => isActiveDay(r.date));
    const uniqueDates = new Set(activeRecords.map((r) => r.date));
    let totalHariAktif = 0;
    for (const d of Array.from(uniqueDates)) {
      if (!holidaySet.has(d)) totalHariAktif++;
    }
```

Kemudian ganti loop `hadiMap` (baris 123-126):

```ts
    const hadiMap: Record<string, number> = {};
    for (const r of activeRecords) {
      hadiMap[r.santri_id] = (hadiMap[r.santri_id] ?? 0) + 1;
    }
```

- [ ] **Step 3: `laporan/tim/route.ts` — filter distinct dates & kehadiran**

Ganti loop baris 137-141:

```ts
    const distinctDates = new Set<string>();
    for (const record of allDates ?? []) {
      if (isActiveDay(record.date as string)) {
        distinctDates.add(record.date as string);
      }
    }
```

Ganti loop baris 159-167 (tambah filter):

```ts
    for (const a of attendanceData ?? []) {
      const sid = a.student_id as string;
      const date = a.date as string;
      if (!isActiveDay(date)) continue;
      if (!attendanceCountMap[sid]) {
        attendanceCountMap[sid] = new Set();
      }
      attendanceCountMap[sid].add(date);
    }
```

- [ ] **Step 4: `rekap/semester/route.ts` — ganti count query dengan fetch dates + filter**

Ganti blok baris 150-155:

```ts
    // Fetch total active days in semester
    const { count: totalActiveDays } = await supabase
      .from('attendances')
      .select('date', { count: 'exact', head: true })
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);
```

dengan:

```ts
    // Fetch total active days in semester (hanya Senin-Kamis)
    const { data: attendanceDates } = await supabase
      .from('attendances')
      .select('date')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);
    const totalActiveDays = new Set(
      (attendanceDates ?? [])
        .map((r: any) => r.date)
        .filter((d: string) => isActiveDay(d))
    ).size;
```

Kemudian filter hadir/tidak hadir per siswa (baris 163-164) agar konsisten:

```ts
      const totalHadir = studentAttendance.filter(a => a.status === 'Hadir' && isActiveDay(a.date)).length;
      const totalTidakHadir = studentAttendance.filter(a => a.status === 'Tidak Hadir' && isActiveDay(a.date)).length;
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/absensi/bulanan/route.ts src/app/api/laporan/tim/route.ts src/app/api/rekap/semester/route.ts
git commit -m "feat: laporan absensi/rekap/laporan-tim tidak menghitung Jumat-Sabtu-Minggu"
```

---
## Task 6: Perbaikan WITA di `wali/progres` dan `website/agenda`

**Files:**
- Modify: `src/app/api/wali/progres/route.ts` (baris 90-104, 186-193)
- Modify: `src/app/api/website/agenda/route.ts` (baris 17)

**Interfaces:**
- Consumes: `todayStr`, `dateToStrWITA` dari `@/lib/time` (Task 1)
- Produces: grafik wali memakai Senin WITA; agenda memakai tanggal WITA

Catatan scope: `api/ai/catatan-generate` dan `api/raport/generate` **tidak diubah** — `end_date` berasal dari string tanggal DB (`YYYY-MM-DD`, di-parse UTC tengah malam), sehingga `prevEndDate.toISOString().split('T')[0]` sudah benar dan tidak bergantung zona.

- [ ] **Step 1: Import di `wali/progres/route.ts`**

```ts
import { todayStr, dateToStrWITA } from '@/lib/time';
```

- [ ] **Step 2: Ganti perhitungan `startDate` (baris 93-104)**

Ganti blok:

```ts
    let startDate: Date;
    if (fromParam) {
      startDate = new Date(fromParam + 'T00:00:00');
    } else {
      startDate = new Date();
      const day = startDate.getDay();
      startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
```

dengan:

```ts
    let startDate: Date;
    if (fromParam) {
      startDate = new Date(fromParam + 'T00:00:00Z');
    } else {
      startDate = new Date(todayStr() + 'T00:00:00Z');
      const day = startDate.getUTCDay();
      startDate.setUTCDate(startDate.getUTCDate() - (day === 0 ? 6 : day - 1));
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const startDateStr = dateToStrWITA(startDate);
    const endDateStr = dateToStrWITA(endDate);
```

- [ ] **Step 3: Ganti loop pembuatan 7 hari (baris 186-193)**

Ganti:

```ts
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const hData = chartHafalanPerDate[dateStr];
      const tData = chartTahsinPerDate[dateStr];
      const isWeekend = d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0;
```

dengan:

```ts
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i);
      const dateStr = dateToStrWITA(d);
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Makassar' });
      const hData = chartHafalanPerDate[dateStr];
      const tData = chartTahsinPerDate[dateStr];
      const isWeekend = d.getUTCDay() === 5 || d.getUTCDay() === 6 || d.getUTCDay() === 0;
```

- [ ] **Step 4: `website/agenda/route.ts` — ganti `today` (baris 17)**

```ts
    if (!all) {
      const today = todayStr();
      query = query.eq('is_published', true).gte('tanggal', today);
    }
```

dengan import `import { todayStr } from '@/lib/time';` ditambahkan di atas.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/wali/progres/route.ts src/app/api/website/agenda/route.ts
git commit -m "fix: waktu WITA untuk grafik wali dan agenda"
```

---
## Task 7: Default tanggal form memakai WITA (frontend)

**Files:**
- Modify: `src/components/features/tahfidz/TahfidzForm.tsx` (baris 79)
- Modify: `src/components/features/tahsin/TahsinForm.tsx` (baris 165)
- Modify: `src/components/features/hafalan/HafalanForm.tsx` (baris 90)
- Modify: `src/components/features/tahsin/JurnalHafalanTahsinForm.tsx` (baris 153)

**Interfaces:**
- Consumes: `todayStr` dari `@/lib/time` (Task 1)
- Produces: default input tanggal = hari ini versi WITA (bukan UTC)

- [ ] **Step 1: Ganti di keempat file**

Tambah import (di blok import masing-masing file):

```ts
import { todayStr } from '@/lib/time';
```

Ganti baris yang berbentuk `const today = new Date().toISOString().split('T')[0];` menjadi:

```ts
  const today = todayStr();
```

(jaga indentasi sesuai konteks file; variabel tetap bernama `today`).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/tahfidz/TahfidzForm.tsx src/components/features/tahsin/TahsinForm.tsx src/components/features/hafalan/HafalanForm.tsx src/components/features/tahsin/JurnalHafalanTahsinForm.tsx
git commit -m "fix: default tanggal form pakai hari ini WITA"
```

---
## Task 8: Halaman frontend memakai WITA

**Files:**
- Modify: `src/app/(dashboard)/absensi/page.tsx` (baris 49-52 helper, 121)
- Modify: `src/app/(dashboard)/absensi/monitoring/page.tsx` (baris 75-76, 93, 163)
- Modify: `src/app/wali/dashboard/page.tsx` (baris 410-452)
- Modify: `src/app/(dashboard)/kalender-libur/page.tsx` (baris 95-96, 141-143)
- Modify: `src/app/agenda/page.tsx` (baris 26)
- Modify: `src/app/(dashboard)/website/page.tsx` (baris 488)
- Modify: `src/app/page.tsx` (baris 47, 100)

**Interfaces:**
- Consumes: `todayStr` dari `@/lib/time` (Task 1)
- Produces: semua "hari ini" di halaman berbasis WITA

- [ ] **Step 1: `absensi/page.tsx`**

Import `todayStr` dari `@/lib/time`. Ganti baris 121 `const today = toDateInputValue(new Date());` → `const today = todayStr();`. Hapus fungsi `toDateInputValue` (baris 49-52) karena tidak terpakai lagi (cek dulu tidak ada pemakaian lain di file — grep `toDateInputValue` di file ini).

- [ ] **Step 2: `absensi/monitoring/page.tsx`**

Import `todayStr` dari `@/lib/time`. Ganti:
- Baris 75: `const defaultTo = toDateInputValue(new Date());` → `const defaultTo = todayStr();`
- Baris 93: `const today = toDateInputValue(new Date());` → `const today = todayStr();`
- Baris 163: `const newTo = toDateInputValue(new Date());` → `const newTo = todayStr();`

Biarkan `toDateInputValue` dan `daysAgo` tetap ada (dipakai baris 76, 164 untuk perhitungan relatif).

- [ ] **Step 3: `wali/dashboard/page.tsx` — handler minggu (baris 410-452)**

Tambah helper di bagian atas file (di luar komponen):

```ts
function todayWITA(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(new Date());
}

function mondayWITA(weeksAgo: number): string {
  const d = new Date(todayWITA() + 'T00:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1) - weeksAgo * 7);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d);
}
```

Ganti handler "Minggu Sebelumnya" (baris 411-421) menjadi:

```tsx
                onClick={() => {
                  if (chartFrom) {
                    const d = new Date(chartFrom + 'T00:00:00Z');
                    d.setUTCDate(d.getUTCDate() - 7);
                    setChartFrom(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d));
                  } else {
                    setChartFrom(mondayWITA(1));
                  }
                }}
```

Ganti handler "Minggu Berikutnya" (baris 440-452) menjadi:

```tsx
                onClick={() => {
                  if (isMingguIni) return;
                  const d = new Date(chartFrom + 'T00:00:00Z');
                  d.setUTCDate(d.getUTCDate() + 7);
                  const next = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d);
                  const seninIniStr = mondayWITA(0);
                  if (next >= seninIniStr) setChartFrom(null);
                  else setChartFrom(next);
                }}
```

- [ ] **Step 4: `kalender-libur/page.tsx`**

Import `todayStr` dari `@/lib/time`. Ganti baris 95-96:

```ts
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
```

menjadi:

```ts
  const todayWITA = todayStr();
```

dan perbarui pemakaiannya di baris 109: `const isToday = dateStr === todayWITA;` (hapus deklarasi `todayStr` lokal — hindari bentrok nama dengan import).

Ganti baris 141-143:

```ts
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(now.getMonth() + 1);
```

menjadi:

```ts
  const now = new Date(todayStr() + 'T00:00:00');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(now.getMonth() + 1);
```

- [ ] **Step 5: `agenda/page.tsx` dan `website/page.tsx`**

Import `todayStr` dari `@/lib/time` di kedua file. Ganti `const today = new Date().toISOString().split('T')[0];` → `const today = todayStr();` di `agenda/page.tsx:26` dan `website/page.tsx:488`.

- [ ] **Step 6: Landing `src/app/page.tsx`**

Import `todayStr` dari `@/lib/time`. Ganti baris 47:

```ts
function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date();
```

menjadi:

```ts
function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date(todayStr() + 'T00:00:00');
```

Ganti baris 100 `const today = new Date().toISOString().split('T')[0];` → `const today = todayStr();`.

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/absensi/page.tsx" "src/app/(dashboard)/absensi/monitoring/page.tsx" src/app/wali/dashboard/page.tsx "src/app/(dashboard)/kalender-libur/page.tsx" src/app/agenda/page.tsx "src/app/(dashboard)/website/page.tsx" src/app/page.tsx
git commit -m "fix: semua default 'hari ini' di frontend memakai WITA"
```

---
## Task 9: Update teks jadwal di `StudentProgressChart`

**Files:**
- Modify: `src/components/features/charts/StudentProgressChart.tsx` (baris 188-207)

- [ ] **Step 1: Ganti teks kartu jadwal**

Ganti baris 189-207 (dua kartu info) dengan:

```tsx
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div style={{ borderRadius: '16px', border: '1px solid #fde68a', background: '#fffbeb', padding: '16px' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>Tahfidz — Senin–Kamis</p>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            Jadwal 4× per minggu (Sen–Kam). Penilaian mencakup makhroj (pengucapan huruf), tajwid (aturan bacaan), dan kelancaran membaca Al-Qur&apos;an. Hari Jumat, Sabtu, dan Minggu tidak ada kegiatan tahfidz.
          </p>
        </div>
        <div style={{ borderRadius: '16px', border: '1px solid #fde68a', background: '#fffbeb', padding: '16px' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>Tahsin — Senin–Kamis</p>
          </div>
          <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
            Jadwal 4× per minggu (Sen–Kam). Penilaian mencakup makhroj, kelancaran, dan adab dalam membaca Al-Qur&apos;an. Kehadiran dihitung terhadap 4 sesi yang diharapkan setiap minggu.
          </p>
        </div>
      </div>
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build sukses.

- [ ] **Step 3: Commit**

```bash
git add src/components/features/charts/StudentProgressChart.tsx
git commit -m "docs(ui): teks jadwal tahfidz/tahsin Senin-Kamis"
```

---
## Self-Review Notes

- Spec memuat `ai/catatan-generate` dan `raport/generate` — diverifikasi saat menulis plan bahwa keduanya aman (aritmatika dari string tanggal DB, bukan `new Date()` hari ini), jadi dikecualikan (YAGNI).
- `isMingguIni` di wali/progres = `!fromParam` (baris 215) — tidak bergantung zona, tidak diubah.
- Filter weekend diterapkan pada numerator DAN denominator (hafalan/hadir/hari-aktif) agar persentase tidak >100% jika ada data lama di weekend.
