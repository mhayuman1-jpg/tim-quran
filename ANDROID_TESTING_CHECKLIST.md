# Android Testing Checklist — Tim Qur'an Pengajar

> Checklist pengujian manual untuk memastikan aplikasi berfungsi di perangkat Android.

---

## Sebelum Testing

- [ ] APK debug (com.timquran.pengajar) terinstall di perangkat Android
- [ ] Koneksi internet aktif (WiFi atau data seluler)
- [ ] Backend (timquran.my.id) online
- [ ] Akun pengajar (Tim_Quran) tersedia
- [ ] QR code siswa tersedia (cetak/digital)

---

## 1. Autentikasi

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 1.1 | Login berhasil | Masukkan email & password valid | Masuk ke Dashboard | ⬜ |
| 1.2 | Password salah | Masukkan password salah | Error "Email atau password salah" | ⬜ |
| 1.3 | Email tidak ditemukan | Masukkan email tidak terdaftar | Error "Email atau password salah" | ⬜ |
| 1.4 | Akun nonaktif | Masukkan akun dinonaktifkan | Error "Akun tidak aktif" | ⬜ |
| 1.5 | Role tidak diizinkan | Login dengan Wali_Murid | Error "Anda tidak memiliki izin" | ⬜ |
| 1.6 | Token expired | Biarkan aplikasi lama, lalu coba akses | Redirect ke halaman login | ⬜ |
| 1.7 | Logout | Tekan tombol Logout | Kembali ke halaman login | ⬜ |
| 1.8 | Restore session | Login → tutup aplikasi → buka lagi | Langsung masuk Dashboard | ⬜ |

## 2. Dashboard

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 2.1 | Tampilan dashboard | Setelah login | Kartu statistik muncul: total santri, kehadiran hari ini, ringkasan juz, recent hafalan/tahsin | ⬜ |
| 2.2 | Pull-to-refresh | Tarik ke bawah pada dashboard | Data ter-refresh | ⬜ |
| 2.3 | Data kosong | Jika belum ada data | Empty state muncul dengan icon dan pesan | ⬜ |

## 3. Navigasi

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 3.1 | Bottom nav | Tap Beranda, Absensi, Hafalan, Profil | Berpindah halaman sesuai tab | ⬜ |
| 3.2 | Navigasi drawer (jika ada) | Geser dari kiri atau tap menu | Drawer terbuka dengan menu | ⬜ |

## 4. Daftar Kelas

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 4.1 | Lihat kelas | Buka menu kelas | Hanya kelas yang diampu muncul | ⬜ |
| 4.2 | Tap kelas | Tap salah satu kelas | Buka detail kelas (siswa dalam kelas) | ⬜ |

## 5. Daftar Siswa

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 5.1 | Lihat siswa | Buka menu siswa | Daftar siswa muncul dengan foto, nama, kelas | ⬜ |
| 5.2 | Filter kelas | Pilih filter kelas | Hanya siswa kelas tersebut muncul | ⬜ |
| 5.3 | Cari siswa | Ketik nama siswa | Hasil filter sesuai nama | ⬜ |
| 5.4 | Tap siswa | Tap salah satu siswa | Buka halaman detail siswa | ⬜ |
| 5.5 | Pull-to-refresh | Tarik ke bawah | Data siswa ter-refresh | ⬜ |

## 6. Detail Siswa

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 6.1 | Informasi siswa | Buka detail siswa | NISN, nama, gender, kelas, juz terakhir, status muncul | ⬜ |
| 6.2 | Foto siswa | Jika punya foto | Foto profil tampil | ⬜ |

## 7. Absensi

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 7.1 | Pilih kelas absensi | Tap tombol atau dropdown kelas | Daftar siswa muncul | ⬜ |
| 7.2 | Pilih tanggal | Tap date picker | Pilih tanggal yang valid | ⬜ |
| 7.3 | Ubah status manual | Tap status siswa | Status berubah (Hadir/Sakit/Izin/Alpa) | ⬜ |
| 7.4 | Simpan absensi | Tap Simpan | Data tersimpan, notifikasi sukses | ⬜ |
| 7.5 | Absensi duplikat | Simpan absensi untuk tanggal sama | Error atau update data yang sama | ⬜ |
| 7.6 | Lihat history | Buka riwayat absensi | Data absensi per tanggal tampil | ⬜ |

## 8. QR Scanner

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 8.1 | Permission kamera | Pertama kali buka scanner | Muncul dialog izin kamera | ⬜ |
| 8.2 | Scan valid QR | Scan QR code siswa valid | Notifikasi sukses, data absensi tersimpan | ⬜ |
| 8.3 | Scan QR invalid | Scan QR code tidak dikenal | Notifikasi gagal | ⬜ |
| 8.4 | Scan berulang | Scan QR yang sama dua kali | Deteksi duplikat, notifikasi sudah absen | ⬜ |
| 8.5 | Kamera tidak tersedia | Di emulator tanpa kamera | Pesan error kamera tidak tersedia | ⬜ |
| 8.6 | Permission ditolak | Tolak izin kamera | Pesan dan tombol buka Settings | ⬜ |
| 8.7 | Lanjut scan setelah sukses | Tap tombol scan berikutnya | Kamera aktif lagi | ⬜ |

## 9. Hafalan

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 9.1 | Form hafalan | Buka form input hafalan | Form muncul dengan field: surah/juz, halaman, makhroj, tajwid, lancar, catatan | ⬜ |
| 9.2 | Validasi form | Submit form kosong | Error validasi muncul | ⬜ |
| 9.3 | Simpan hafalan | Isi lengkap dan simpan | Data tersimpan, notifikasi sukses | ⬜ |
| 9.4 | Riwayat hafalan | Buka riwayat hafalan | Daftar hafalan per siswa, per tanggal | ⬜ |
| 9.5 | Filter tanggal | Pilih rentang tanggal | Riwayat terfilter | ⬜ |
| 9.6 | Riwayat kosong | Jika belum ada data | Empty state muncul | ⬜ |

## 10. Tahsin

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 10.1 | Form tahsin | Buka form input tahsin | Form muncul dengan field: metode, buku, halaman, makhroj, kelancaran, adab, catatan | ⬜ |
| 10.2 | Simpan tahsin | Isi lengkap dan simpan | Data tersimpan, notifikasi sukses | ⬜ |
| 10.3 | Riwayat tahsin | Buka riwayat tahsin | Daftar tahsin per siswa | ⬜ |
| 10.4 | Riwayat kosong | Jika belum ada data | Empty state muncul | ⬜ |

## 11. Raport

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 11.1 | Daftar raport | Buka menu raport | Daftar raport per kelas dan siswa | ⬜ |
| 11.2 | Detail raport | Tap raport | Detail nilai per surah muncul | ⬜ |
| 11.3 | Generate PDF | Tap tombol Generate PDF | Proses generate, loading state muncul | ⬜ |
| 11.4 | Download PDF | Setelah PDF siap | PDF terdownload | ⬜ |
| 11.5 | Buka PDF | Tap hasil download | PDF terbuka di viewer | ⬜ |
| 11.6 | URL expired | Coba buka PDF lama | Error URL kedaluwarsa, generate ulang | ⬜ |

## 12. Rekap

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 12.1 | Rekap semester | Buka menu rekap | Pilih kelas, data rekap tampil | ⬜ |
| 12.2 | Download Excel | Tap download | File Excel terdownload | ⬜ |

## 13. Pengumuman

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 13.1 | Lihat pengumuman | Buka menu pengumuman | Daftar pengumuman muncul | ⬜ |
| 13.2 | Pull-to-refresh | Tarik ke bawah | Pengumuman ter-refresh | ⬜ |
| 13.3 | Empty state | Jika belum ada pengumuman | Empty state muncul | ⬜ |

## 14. Pesan

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 14.1 | Lihat pesan | Buka menu pesan | Daftar pesan muncul | ⬜ |
| 14.2 | Pull-to-refresh | Tarik ke bawah | Pesan ter-refresh | ⬜ |
| 14.3 | Empty state | Jika belum ada pesan | Empty state muncul | ⬜ |

## 15. Kalender

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 15.1 | Lihat kalender | Buka menu kalender | Kalender libur/event muncul | ⬜ |
| 15.2 | Scroll | Geser ke bawah | Data lebih lengkap muncul | ⬜ |

## 16. Profil

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 16.1 | Lihat profil | Buka tab Profil | Nama, email, role, foto muncul | ⬜ |
| 16.2 | Logout | Tap Logout | Token dihapus, kembali ke login | ⬜ |

## 17. Error & Offline

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 17.1 | Tidak ada internet | Matikan WiFi/data | Pesan error "Tidak ada koneksi internet" | ⬜ |
| 17.2 | Timeout | Server lambat | Pesan error "Waktu habis" setelah timeout | ⬜ |
| 17.3 | Server error 500 | Backend error | Pesan error "Server sedang sibuk" | ⬜ |
| 17.4 | Token invalid | Hapus manual token di storage | Redirect ke login | ⬜ |
| 17.5 | Stack trace | Coba trigger error | Tidak ada stack trace yang muncul | ⬜ |

## 18. Performance

| No | Skenario | Langkah | Hasil Diharapkan | Status |
|----|----------|---------|------------------|--------|
| 18.1 | Cold start | Tutup aplikasi, buka lagi | < 5 detik ke halaman login | ⬜ |
| 18.2 | Scroll smooth | Scroll daftar 100+ siswa | Tidak ada lag atau jank | ⬜ |
| 18.3 | Memory | Buka semua fitur berturut-turut | Tidak crash | ⬜ |
| 18.4 | Ukuran aplikasi | Cek di Settings → Apps | APK release ≤ 100 MB | ✅ 75.2 MB |
