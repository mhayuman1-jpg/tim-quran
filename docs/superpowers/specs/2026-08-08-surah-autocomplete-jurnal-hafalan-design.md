# Desain: Autocomplete Surah pada Jurnal Hafalan

**Tanggal:** 2026-08-08
**Status:** Approved
**Lingkup:** Frontend-only — 1 file berubah

## Ringkasan

Mengganti field input teks bebas "Surah / Juz" pada form Jurnal Tahfidz (`TahfidzForm`) menjadi input dengan `<datalist>` HTML5. Guru dapat mengetik untuk mencari atau langsung memilih dari daftar 114 surah Al-Quran. Input tetap bebas — guru tetap bisa mengetik manual untuk variasi seperti "An-Naba' 1-20" atau "Juz 30".

## Motivasi

- **Saat ini:** Field `surah_juz` adalah input teks bebas — guru harus mengetik manual nama surah setiap kali
- **Masalah:** Rawan typo, inkonsistensi penulisan (misal: "An Naba" vs "An-Naba'" vs "Annaba"), lambat untuk input berulang
- **Tujuan:** Mempercepat input, mengurangi kesalahan ketik, menjaga konsistensi data

## Pendekatan

**Pendekatan A: Input + Datalist (Native HTML5)** — dipilih karena:
- Nol dependensi baru
- User tetap bisa mengetik manual
- Keyboard-friendly, accessible default
- Data surah (`SURAH_ALQURAN_LIST`) sudah tersedia di `src/lib/surahData.ts`

## Desain Teknis

### File yang Diubah

| File | Aksi |
|------|------|
| `src/components/features/tahfidz/TahfidzForm.tsx` | Ganti `<Input>` surah_juz dengan `<input>` + `<datalist>` |

### File yang Tidak Diubah

| File | Alasan |
|------|--------|
| `src/lib/surahData.ts` | `SURAH_ALQURAN_LIST` sudah ada (array 114 surah) |
| `src/app/api/tahfidz/add/route.ts` | Tetap terima string bebas |
| `src/app/api/tahfidz/update/route.ts` | Tetap terima string bebas |
| `src/app/api/tahfidz/list/route.ts` | Tidak terpengaruh |
| `src/components/features/tahfidz/TahfidzHistory.tsx` | Render teks apa adanya |
| `src/types/index.ts` | Tidak ada perubahan tipe data |

### Detail Perubahan

**Lokasi:** `TahfidzForm.tsx`, baris 195-203 (field Surah / Juz saat ini)

**Sebelum:**
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

**Sesudah:**
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

### Perilaku

| Aksi Pengguna | Hasil |
|---------------|-------|
| Ketik "an n" | Dropdown browser muncul: "An Naba'", "An Nazi'at", "An Nas", dll. |
| Pilih dari dropdown | Nilai surah langsung terisi |
| Ketik manual tanpa pilih | Tetap bisa — "An-Naba' 1-20", "Juz 30", dll. |
| Kosongkan & submit | Validasi: "Surah / Juz wajib diisi." |
| Hapus karakter | Dropdown menyesuaikan filter |

### Styling

Mengikuti pattern yang sudah ada di form yang sama — class Tailwind yang identik dengan `<select>` element untuk siswa, makhroj, tajwid, dan kelancaran.

### Browser Compatibility

`<datalist>` didukung semua browser modern: Chrome 20+, Firefox 4+, Safari 12.1+, Edge 12+.

## Validasi & Testing

### Manual Test Cases

1. **Pilih dari dropdown:** Buka form → ketik "Na" → pilih "An Naba'" → simpan → muncul di riwayat dengan nilai "An Naba'"
2. **Ketik manual:** Buka form → ketik "An-Naba' 1-20" (tanpa pilih dropdown) → simpan → muncul di riwayat
3. **Ketik Juz:** Buka form → ketik "Juz 30" → simpan → muncul di riwayat
4. **Kosong:** Buka form → kosongkan field → submit → error "Surah / Juz wajib diisi."
5. **Edit:** Edit entri yang sudah ada → field terisi nilai sebelumnya → dropdown tetap berfungsi

## Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| `<datalist>` tidak bisa di-styling (native browser) | Diterima — UX cukup baik di semua browser modern |
| Nama surah di `SURAH_ALQURAN_LIST` mungkin beda ejaan dengan yang biasa diketik guru | Input tetap bebas — guru bisa mengetik sendiri jika ejaan di list berbeda |
| Performa dengan 114 `<option>` | Diabaikan — 114 elemen ringan, render instan |
