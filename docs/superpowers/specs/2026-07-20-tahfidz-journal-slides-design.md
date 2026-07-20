# Desain Fitur Slide Jurnal Tahfidz

Tanggal: 2026-07-20

## Tujuan

Menambahkan kemampuan pada form Jurnal Hafalan agar satu jurnal harian dapat berisi beberapa template juz dalam bentuk slide. Contoh: siswa murajaah 2 juz, maka slide pertama berisi Juz 30 dan slide kedua berisi Juz 29.

Perubahan dibatasi pada fitur jurnal hafalan sesuai permintaan. Bagian Tahsin tetap satu/global dan tidak dibuat per slide.

## Kondisi Saat Ini

Form jurnal hafalan di `src/components/features/tahsin/JurnalHafalanTahsinForm.tsx` saat ini hanya memiliki satu dropdown `Template Juz`. Saat user memilih satu juz, seluruh baris surah dari juz tersebut dimasukkan ke satu array `detail` dan ditampilkan dalam satu tabel.

Endpoint `src/app/api/jurnal-hafalan-tahsin/add/route.ts` sudah menerima `detail: JurnalDetailRow[]` dan menyimpan setiap baris ke tabel `hafalan`. Struktur API dan database saat ini sudah cukup untuk menyimpan banyak baris hafalan, sehingga fitur slide tidak perlu mengubah API atau database.

## Keputusan Desain

Gunakan pendekatan state berbasis slide di sisi frontend, lalu flatten ke bentuk `detail` saat submit.

```ts
interface JournalSlide {
  juz: number;
  rows: JurnalDetailRow[];
}
```

State form hafalan akan menyimpan beberapa slide:

```ts
slides = [
  { juz: 30, rows: [/* template surah Juz 30 */] },
  { juz: 29, rows: [/* template surah Juz 29 */] },
]
```

Saat submit, semua `rows` dari semua slide digabung menjadi satu array `detail` agar payload tetap kompatibel dengan endpoint yang sudah ada.

## UX Form Hafalan

Bagian Hafalan menampilkan navigasi slide di atas tabel:

```text
[Juz 30] [Juz 29] [+ Tambah Slide]

Template Juz: Juz 30
Tabel penilaian surah untuk slide aktif
```

Perilaku UI:

1. Setiap slide merepresentasikan satu juz.
2. Tab slide menampilkan label `Juz <nomor>`.
3. Klik tab mengganti slide aktif.
4. Tombol `+ Tambah Slide` menampilkan pilihan juz yang belum dipakai.
5. Setelah user memilih juz, slide baru dibuat dari template `SURAH_PER_JUZ[juz]`.
6. Slide baru dimasukkan di depan agar juz terbaru tampil lebih dulu.
7. Contoh Juz 30 dan Juz 29: slide 1 = Juz 30, slide 2 = Juz 29.
8. Setiap slide memiliki tabel penilaian sendiri: Surah, Makhroj, Tajwid, Lancar, Ayat, dan tombol hapus baris.
9. Bagian Tahsin tetap satu/global di bawah bagian Hafalan.

## Operasi Slide

### Tambah Slide

`addSlide(juz)`:

1. Ambil template dari `SURAH_PER_JUZ[juz]`.
2. Buat `JournalSlide` baru.
3. Masukkan slide baru di posisi depan.
4. Jadikan slide baru sebagai active slide.
5. Jangan tampilkan juz yang sudah dipakai di pilihan tambah slide.

### Ganti Template pada Slide Aktif

`fillTemplateFromJuz(slideIndex, juz)`:

1. Replace `rows` slide aktif dengan template juz baru.
2. Update label slide menjadi juz baru.
3. Hindari memilih juz yang sudah dipakai oleh slide lain.

### Edit Row

`updateSlideRow(slideIndex, rowIndex, field, value)`:

Mengubah nilai pada row di slide aktif tanpa memengaruhi slide lain.

### Tambah/Hapus Row

- `addRow(slideIndex)` menambah baris kosong pada slide aktif.
- `removeRow(slideIndex, rowIndex)` menghapus baris dari slide aktif.
- Minimal tetap ada satu row dalam slide.

### Hapus Slide

`removeSlide(slideIndex)`:

1. Hapus slide yang dipilih.
2. Minimal harus tersisa satu slide.
3. Jika slide aktif dihapus, pindahkan active index ke slide terdekat.

## Submit dan Kompatibilitas API

Payload submit tetap memakai field `detail` seperti saat ini:

```ts
const detail = slides.flatMap((slide) => slide.rows);

onSubmit({
  ...form,
  detail,
});
```

Tidak ada perubahan pada endpoint:

- `src/app/api/jurnal-hafalan-tahsin/add/route.ts`
- `src/app/api/hafalan/add/route.ts`

Tidak ada perubahan database.

## Load Existing Journal

Ketika form memuat data jurnal yang sudah ada dari `/api/jurnal-hafalan-tahsin/add?student_id=...&tanggal=...`, data hafalan yang diterima tetap berbentuk flat array.

Untuk rekonstruksi slide:

1. Cocokkan `surah_juz` setiap row dengan template `SURAH_PER_JUZ`.
2. Group row berdasarkan juz yang paling cocok.
3. Jika row tidak cocok dengan template manapun, masukkan ke slide manual.
4. Urutkan slide dari juz terbesar ke terkecil agar juz terbaru tampil di depan.

Agar matching lebih mudah dan tetap lokal di frontend, tambahkan helper kecil di `src/lib/surahData.ts`:

```ts
getJuzForSurahName(name: string): number | null
```

Helper ini hanya membaca `SURAH_PER_JUZ` dan tidak mengubah struktur data utama.

## Validasi

Validasi tetap sama secara konsep:

1. `student_id` wajib ada.
2. `tanggal` wajib valid.
3. Jika mode mencakup Hafalan, minimal satu slide harus memiliki minimal satu row.
4. Setiap row yang dikirim harus memiliki `nama_surah`.
5. Jika mode mencakup Tahsin, validasi Tahsin tetap seperti sekarang.

Sebelum submit, validasi dilakukan terhadap semua rows dari semua slides.

## File yang Akan Diubah

1. `src/components/features/tahsin/JurnalHafalanTahsinForm.tsx`
   - Tambah state `slides` dan `activeSlideIndex`.
   - Ubah UI dropdown single template menjadi slide tabs + tombol tambah slide.
   - Ubah operasi row agar scoped ke slide aktif.
   - Flatten slides menjadi `detail` saat submit.

2. `src/lib/surahData.ts`
   - Tambah helper `getJuzForSurahName` untuk membantu rekonstruksi slide dari existing data.

Tidak ada file lain yang perlu diubah untuk implementasi inti.

## Yang Sengaja Tidak Diubah

- API route jurnal hafalan/tahsin.
- Database schema.
- Bagian Riwayat Hafalan.
- Bagian Tahsin global.
- Print raport.
- Render PDF raport.
- Sidebar, layout, atau fitur absensi.

## Testing Manual

Skenario yang perlu dicek:

1. Buka modal Tambah Jurnal Hafalan.
2. Tambah slide Juz 30.
3. Tambah slide Juz 29.
4. Pastikan tab Juz 30 tampil sebelum Juz 29.
5. Isi nilai pada Juz 30 dan Juz 29.
6. Submit jurnal.
7. Pastikan data tersimpan tanpa error.
8. Buka kembali jurnal pada siswa dan tanggal yang sama.
9. Pastikan data lama muncul kembali dalam slide yang sesuai.
10. Pastikan Tahsin tetap satu/global dan tidak berubah perilakunya.

## Batasan

Karena database tidak menyimpan field juz per row, rekonstruksi slide dari data existing menggunakan pencocokan nama surah. Untuk nama surah manual yang tidak cocok dengan template, row akan ditempatkan pada slide manual agar data tidak hilang.
