# Surah Autocomplete Jurnal Hafalan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti input teks bebas "Surah / Juz" di form Jurnal Tahfidz menjadi input dengan `<datalist>` autocomplete dari 114 surah Al-Quran.

**Architecture:** Perubahan frontend-only pada satu komponen. Gunakan `<input>` native HTML5 dengan `<datalist>` berisi 114 surah dari `SURAH_ALQURAN_LIST` yang sudah tersedia di `src/lib/surahData.ts`. Input tetap bebas — guru bisa mengetik manual di luar daftar.

**Tech Stack:** React, TypeScript, Tailwind CSS, HTML5 Datalist API

## Global Constraints

- Nol dependensi baru
- Tidak boleh mengubah API routes, database schema, atau tipe data
- Field tetap bisa diisi manual (bukan select ketat)
- Styling konsisten dengan form field lain di komponen yang sama

---

### Task 1: Ganti Input surah_juz dengan input + datalist autocomplete

**Files:**
- Modify: `src/components/features/tahfidz/TahfidzForm.tsx` — import (baris 17) dan field surah_juz (baris 195-203)

**Interfaces:**
- Consumes: `SURAH_ALQURAN_LIST` dari `@/lib/surahData` (sudah ada, array `string[]`)
- Produces: Tidak ada perubahan interface — `TahfidzFormData.surah_juz` tetap `string`

- [ ] **Step 1: Tambahkan `SURAH_ALQURAN_LIST` ke import**

Di baris 17, ubah:

```tsx
import { NILAI_TANPA_HAFAL, NILAI_LANCAR } from '@/lib/surahData';
```

Menjadi:

```tsx
import { NILAI_TANPA_HAFAL, NILAI_LANCAR, SURAH_ALQURAN_LIST } from '@/lib/surahData';
```

- [ ] **Step 2: Ganti field Surah / Juz**

Hapus blok `<Input>` untuk surah_juz (baris 195-203):

```tsx
      <Input
        label="Surah / Juz"
        required
        value={form.surah_juz}
        onChange={(e) => set('surah_juz', e.target.value)}
        error={errors.surah_juz}
        placeholder="Contoh: Juz 30 / An-Naba'"
        disabled={loading}
      />
```

Ganti dengan:

```tsx
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">
          Surah / Juz <span className="text-red-500">*</span>
        </label>
        <input
          list="surah-datalist"
          type="text"
          value={form.surah_juz}
          onChange={(e) => set('surah_juz', e.target.value)}
          placeholder="Ketik atau pilih surah... (contoh: An-Naba' 1-20)"
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        />
        <datalist id="surah-datalist">
          {SURAH_ALQURAN_LIST.map((surah) => (
            <option key={surah} value={surah} />
          ))}
        </datalist>
        {errors.surah_juz && (
          <p className="text-xs text-red-600" role="alert">{errors.surah_juz}</p>
        )}
      </div>
```

- [ ] **Step 3: Build dan verifikasi tidak ada error kompilasi**

```bash
npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 4: Build Next.js**

```bash
npx next build
```

Expected: Build berhasil tanpa error.

- [ ] **Step 5: Commit**

```bash
git add src/components/features/tahfidz/TahfidzForm.tsx
git commit -m "feat: tambahkan autocomplete surah pada form jurnal hafalan

Ganti input teks bebas Surah/Juz dengan input + datalist HTML5
yang menampilkan 114 surah Al-Quran dari SURAH_ALQURAN_LIST.
Input tetap bebas — guru bisa mengetik manual di luar daftar.

Co-Authored-By: Claude <noreply@anthropic.com>"
```
