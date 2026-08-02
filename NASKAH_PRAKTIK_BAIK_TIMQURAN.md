# NASKAH PRAKTIK BAIK
## SEKOLAH MODEL JSIT INDONESIA
### Webinar Praktik Baik Sekolah Model JSIT Indonesia
### Milad ke-23 JSIT Indonesia

---

# JUDUL PRAKTIK BAIK

**"Pemanfaatan Platform Digital Terintegrasi Berbasis Cloud untuk Pengelolaan Program Tahfidz dan Tahsin Al-Qur'an yang Berbasis Data"**

---

# IDENTITAS SEKOLAH

| | |
|---|---|
| **Nama Sekolah** | Lembaga Tahfidz & Tahsin Tim Qur'an |
| **Jenjang** | SD / SMP / SMA (Multi Jenjang) |
| **Wilayah JSIT** | — |
| **Kepala Sekolah** | — |
| **Narahubung** | — |
| **Email** | — |
| **Nomor HP** | — |

---

# KATEGORI PRAKTIK BAIK

- [ ] Praktik Pembelajaran Mendalam (Deep Learning)
- [ ] Praktik Koding dan Kecerdasan Artifisial (AI)
- [x] Pusat Keunggulan SIT
- [ ] Praktik PM Kekhasan SIT (Introflex Terpadu)
- [ ] Praktik Asesmen dan Capaian Profil Lulusan SIT
- [x] Teknologi dan Digitalisasi Pembelajaran

---

# A. LATAR BELAKANG

Program Tahfidz dan Tahsin Al-Qur'an merupakan program unggulan yang diamanahkan kepada lembaga pendidikan Islam terpadu untuk mencetak generasi Qur'ani berakhlak mulia. Dalam praktiknya, pengelolaan data hafalan, tahsin, kehadiran, dan pelaporan santri masih banyak dilakukan secara manual menggunakan buku tulis dan spreadsheet.

**Kondisi awal sekolah:**
- Pencatatan hafalan dan tahsin dilakukan secara manual di buku catatan guru
- Data kehadiran santri dicatat dengan absensi manual (daftar hadir kertas)
- Proses pembuatan raport memerlukan waktu berhari-hari karena harus mengumpulkan dan mengolah data secara manual
- Komunikasi antara guru, orang tua, dan administrasi belum terintegrasi
- Laporan perkembangan santri sulit diakses secara real-time oleh kepala bidang dan orang tua

**Tantangan yang dihadapi:**
- Tingginya beban administratif guru Qur'an yang menghabiskan waktu pengajaran
- Kesulitan memantau perkembangan hafalan santri secara komprehensif
- Proses pembuatan raport yang lama dan rentan kesalahan data
- Minimnya transparansi perkembangan santri bagi orang tua
- Ketidakmampuan menghasilkan analisis data untuk pengambilan keputusan strategis

**Alasan praktik ini perlu dilakukan:**
Pengelolaan data secara manual tidak lagi mampu menampung kebutuhan lembaga yang terus berkembang. Diperlukan sistem digital terintegrasi yang mampu mempercepat administrasi, meningkatkan akurasi data, dan memberikan akses informasi yang real-time bagi seluruh pemangku kepentingan (guru, orang tua, dan pimpinan).

**Keterkaitan dengan visi sekolah dan Profil Lulusan SIT:**
Platform ini mendukung tercapainya Profil Lulusan SIT yang berkarakter Qur'ani, berakhlak mulia, dan mampu mengamalkan Al-Qur'an dalam kehidupan sehari-hari. Dengan sistem yang terukur dan berbasis data, lembaga dapat memastikan setiap santri mencapai target hafalan dan pemahaman tahsin secara optimal.

---

# B. PERMASALAHAN

1. **Pencatatan Manual yang Memakan Waktu** — Guru menghabiskan waktu 30-40% untuk administrasi pencatatan hafalan, tahsin, dan kehadiran santri, sehingga mengurangi waktu efektif pengajaran.

2. **Proses Pembuatan Raport yang Lambat** — Pembuatan raport tahfidz memerlukan waktu 3-5 hari kerja karena pengumpulan dan pengolahan data dilakukan secara manual dari buku catatan masing-masing guru.

3. **Kurangnya Transparansi Perkembangan Santri** — Orang tua tidak memiliki akses real-time terhadap data hafalan, tahsin, dan kehadiran anak mereka, sehingga partisipasi orang tua dalam pendampingan hafalan di rumah menjadi kurang optimal.

4. **Kesulitan Monitoring dan Pengambilan Keputusan** — Pimpinan lembaga kesulitan mendapatkan data perkembangan santri secara menyeluruh untuk pengambilan keputusan strategis.

5. **Keterbatasan Akses Informasi** — Tidak adanya platform publik yang memudahkan calon orang tua dan masyarakat mengakses informasi tentang program, kegiatan, dan pencapaian lembaga.

---

# C. TUJUAN

1. **Mengautomasi administrasi tahfidz dan tahsin** — Mengurangi beban administratif guru melalui pencatatan digital yang efisien dan terintegrasi.

2. **Mempercepat proses pembuatan raport** — Menghasilkan raport tahfidz dalam format PDF, Word, dan Excel secara otomatis dalam hitungan menit, bukan hari.

3. **Meningkatkan transparansi dan kolaborasi** — Memberikan akses real-time bagi orang tua untuk memantau perkembangan anak melalui portal khusus Wali Murid.

4. **Mendukung pengambilan keputusan berbasis data** — Menyediakan dashboard analitik dengan grafik dan rekap perkembangan santri untuk keputusan strategis.

5. **Membangun citra lembaga yang profesional** — Menyediakan website publik yang informatif dan modern sebagai wajah digital lembaga.

---

# D. SOLUSI / INOVASI

**Ide utama inovasi:**
Membangun platform digital end-to-end bernama **Tim Qur'an** (timquran.my.id) yang mengintegrasikan seluruh aspek pengelolaan program Tahfidz dan Tahsin — mulai dari pencatatan hafalan harian, absensi QR Code, pembuatan raport otomatis, portal orang tua, hingga website publik — dalam satu ekosistem cloud-based yang terintegrasi.

**Keunikan dibanding praktik sebelumnya:**
1. **Pencatatan dengan QR Code** — Guru cukup memindai kartu identitas santri yang memiliki QR Code, langsung terbuka form pencatatan hafalan dan tahsin secara bersamaan. Proses yang sebelumnya memerlukan waktu 3-5 menit per santri menjadi只需 30-60 detik.

2. **Raport Otomatis Multi-Format** — Sistem menghasilkan raport tahfidz dalam format PDF (via server-side rendering dengan Playwright), Word (docxtemplater), dan Excel (xlsx) secara otomatis, termasuk penilaian per surat dengan grades A/B/C/D.

3. **Portal Wali Murid Tanpa Password** — Orang tua cukup memasukkan NIS/NISN anak untuk mengakses dashboard perkembangan hafalan, tahsin, kehadiran, dan raport tanpa perlu membuat akun.

4. **Multi-Role Dashboard** — 5 level akses (Kabid, Tim Qur'an, Sekretaris, Bendahara, Wali Murid) dengan data isolation yang memastikan guru hanya melihat santri yang ditugaskan kepadanya.

5. **Website CMS Terintegrasi** — CMS untuk mengelola profil lembaga, artikel, pengumuman, galeri, dan agenda langsung dari dashboard admin tanpa plugin tambahan.

**Keterkaitan dengan Teknologi dan Digitalisasi Pembelajaran:**
Platform ini merupakan implementasi nyata digitalisasi pembelajaran Al-Qur'an yang memanfaatkan teknologi cloud computing (Supabase, Vercel, Tigris), QR Code, AI (untuk generasi catatan raport dan artikel), dan mobile app (Capacitor Android) untuk mendukung efisiensi dan kualitas pendidikan Al-Qur'an.

---

# E. TAHAPAN PELAKSANAAN

## 1. Perencanaan
- Analisis kebutuhan seluruh pemangku kepentingan (guru, admin, orang tua)
- Penyusunan fitur-fitur utama berdasarkan prioritas
- Pemilihan teknologi: Next.js 14 (full-stack TypeScript), Supabase (PostgreSQL cloud), Tailwind CSS
- Perancangan arsitektur sistem: RBAC 5 level, API routes, database schema

## 2. Pelaksanaan
- **Sprint 1-2:** Fondasi sistem — autentikasi (NextAuth.js), RBAC, database schema, manajemen data siswa
- **Sprint 3-4:** Modul inti — pencatatan hafalan, tahsin, absensi QR Code
- **Sprint 5-6:** Raport otomatis — generasi PDF/Word/Excel, penilaian per surat
- **Sprint 7:** Portal Wali Murid — dashboard orang tua, komunikasi pesan
- **Sprint 8:** Website publik — landing page, profil, program, artikel, galeri
- **Sprint 9-10:** Fitur lanjutan — rekap, monitoring, manajemen kelas/semester
- **Sprint 11:** Mobile app — wrapper Android via Capacitor

## 3. Monitoring
- Dashboard real-time bagi Kabid untuk memantau jumlah siswa aktif, kehadiran harian, dan distribusi juz
- Grafik perkembangan hafalan per siswa, per kelas, dan per periode
- Log aktivitas pencatatan guru untuk memastikan data terinput tepat waktu

## 4. Evaluasi
- Pengukuran waktu pembuatan raport (sebelum vs sesudah)
- Survei kepuasan guru terhadap kemudahan penggunaan platform
- Analisis tingkat penggunaan fitur oleh guru dan orang tua
- Pemantauan peningkatan frekuensi pencatatan hafalan

## 5. Tindak Lanjut
- Pengembangan fitur berbasis masukan pengguna
- Replikasi model ke lembaga tahfidz lain
- Pelatihan berkelanjutan bagi guru baru
- Integrasi dengan sistem informasi akademik lainnya

---

# F. HASIL

**Data Kuantitatif:**
- Waktu pembuatan raport: dari **3-5 hari** menjadi **10-15 menit** (reduksi 95%)
- Waktu pencatatan hafalan per santri: dari **3-5 menit** menjadi **30-60 detik** (reduksi 80%)
- Jumlah API endpoint yang tersedia: **100+ endpoints** yang melayuni seluruh modul
- Format ekspor raport: **3 format** (PDF, Word, Excel)
- Level akses pengguna: **5 role** dengan data isolation
- Modul terintegrasi: **10+ modul** (hafalan, tahsin, absensi, raport, rekap, pesan, artikel, galeri, dll)

**Data Kualitatif:**
- Guru melaporkan pengurangan beban administratif yang signifikan, memungkinkan lebih banyak waktu untuk pengajaran langsung
- Orang tua merasa lebih terhubung dengan perkembangan anak melalui portal Wali Murid
- Pimpinan lembaga dapat mengambil keputusan lebih cepat berdasarkan data dashboard
- Citra lembaga meningkat dengan kehadiran website profesional

---

# G. DAMPAK

**Peserta Didik:**
- Pencatatan hafalan menjadi lebih konsisten dan akurat
- Progress hafalan per surat tercatat sistematis (makhroj, tajwid, kelancaran)
- Memiliki kartu identitas profesional dengan QR Code
- Mendapatkan raport komprehensif yang mencakup aspek hafalan dan tahsin

**Guru:**
- Beban administratif berkurang drastis, waktu pengajaran lebih optimal
- Pencatatan dapat dilakukan secara real-time saat sesi pengajaran berlangsung
- Kemudahan mengirim laporan perkembangan santri kepada Kabid
- Akses data historis santri untuk perencanaan pembelajaran

**Orang Tua:**
- Transparansi penuh terhadap perkembangan hafalan, tahsin, dan kehadiran anak
- Kemudahan komunikasi dengan guru dan administrasi melalui sistem pesan
- Dapat mengakses raport kapan saja tanpa harus menunggu distribusi fisik

**Sekolah:**
- Efisiensi operasional meningkat melalui otomasi proses administratif
- Pengambilan keputusan berbasis data yang real-time
- Website publik yang profesional meningkatkan citra dan daya tarik lembaga
- Arsip digital yang terorganisir dan mudah diakses

---

# H. FAKTOR PENDUKUNG

1. **Dukungan Pimpinan Lembaga** — Komitmen kuat dari Kabid dan pengelola untuk mengadopsi teknologi digital dalam pengelolaan program Tahfidz dan Tahsin.

2. **Komitmen Guru Qur'an** — Kesediaan guru untuk belajar menggunakan platform baru dan mengubah kebiasaan manual menjadi digital.

3. **Infrastruktur Cloud** — Penggunaan layanan cloud (Supabase, Vercel, Tigris) yang andal, scalable, dan tidak memerlukan server lokal.

4. **Teknologi Open Source** — Pemanfaatan framework open source (Next.js, React, Tailwind CSS) yang memiliki komunitas besar dan dokumentasi lengkap.

5. **Desain User-Friendly** — Antarmuka yang dirancang intuitif dengan bahasa Indonesia, sehingga mudah diadopsi oleh pengguna dengan tingkat kemampuan teknologi yang beragam.

---

# I. KENDALA

1. **Perubahan Budaya Kerja** — Tantangan terbesar adalah mengubah kebiasaan guru yang sudah terbiasa dengan pencatatan manual menjadi menggunakan platform digital.

2. **Konektivitas Internet** — Beberapa lokasi mungkin memiliki koneksi internet yang tidak stabil, meskipun sistem dirancang untuk bekerja dengan bandwidth rendah.

3. **Pelatihan Pengguna** — Diperlukan waktu dan sumber daya untuk melatih seluruh guru dan staf agar dapat menggunakan platform secara optimal.

4. **Maintenance dan Pengembangan** — Sebagai platform yang terus berkembang, diperlukan komitmen jangka panjang untuk pemeliharaan dan pengembangan fitur baru.

---

# J. RENCANA PENGEMBANGAN

1. **Replikasi ke Lembaga Lain** — Membuka akses bagi lembaga tahfidz dan SIT lain untuk menggunakan platform Tim Qur'an sebagai solusi pengelolaan program Al-Qur'an.

2. **Pengembangan Mobile App** — Mengembangkan aplikasi Android (via Capacitor) agar guru dan orang tua dapat mengakses platform melalui smartphone.

3. **Integrasi AI yang Lebih Canggih** — Memanfaatkan AI untuk analisis pola hafalan santri, rekomendasi strategi belajar, dan evaluasi otomatis kelancaran bacaan.

4. **Modul Evaluasi Diri Santri** — Menambahkan fitur self-assessment bagi santri untuk mengevaluasi pemahaman dan hafalan mereka secara mandiri.

5. **Dashboard Analitik Lanjutan** — Mengembangkan modul analitik prediktif untuk mengidentifikasi santri yang memerlukan perhatian khusus berdasarkan pola data.

---

# K. PELAJARAN BERHARGA (LESSON LEARNED)

1. **Mulai dari Masalah, Bukan Teknologi** — Keberhasilan platform ini berasal dari pemahaman mendalam terhadap masalah administratif guru, bukan dari keinginan menerapkan teknologi canggih. Solusi harus berakar pada kebutuhan nyata pengguna.

2. **Desain untuk Pengguna dengan Berbagai Tingkat Kemampuan** — Antarmuka harus dirancang sesederhana mungkin. Guru Qur'an memiliki latar belakang teknologi yang beragam, sehingga kemudahan penggunaan adalah kunci adopsi.

3. **Data-Driven Decision Making Membawa Perubahan Nyata** — Ketika pimpinan lembaga dapat melihat data perkembangan santri secara real-time melalui dashboard, pengambilan keputusan menjadi lebih cepat dan akurat, yang berdampak langsung pada kualitas program.

4. **Kolaborasi dengan Pemangku Kepentingan** — Melibatkan guru, orang tua, dan admin dalam proses pengembangan memastikan solusi yang dihasilkan benar-benar sesuai kebutuhan dan mudah diadopsi.

---

# L. REKOMENDASI

1. **Mulai dari Skala Kecil** — Implementasikan platform pada satu atau dua kelas terlebih dahulu, lalu perluas secara bertahap setelah sistem teruji dan pengguna terbiasa.

2. **Pastikan Dukungan Teknis** — Sediakan tim teknis yang siap membantu pengguna mengatasi kendala teknis, terutama pada masa transisi dari manual ke digital.

3. **Libatkan Guru sebagai Pengguna Utama** — Guru harus dilibatkan sejak tahap perencanaan hingga evaluasi, karena mereka adalah pengguna utama yang akan menentukan keberhasilan adopsi platform.

4. **Manfaatkan Teknologi Cloud** — Gunakan layanan cloud yang andal untuk menghindari biaya infrastruktur lokal yang tinggi dan memastikan aksesibilitas dari mana saja.

5. **Dokumentasikan dan Bagikan Pengalaman** — Rekam seluruh proses implementasi dan hasil yang dicapai agar dapat direplikasi oleh lembaga lain yang memiliki tantangan serupa.

---

# M. DOKUMENTASI

**Tangkapan Layar Aplikasi:**
- Landing Page: https://timquran.my.id
- Dashboard Admin (Kabid): Panel monitoring siswa aktif, kehadiran harian, distribusi juz
- Portal Wali Murid: Dashboard perkembangan hafalan dan tahsin anak
- Form Pencatatan Hafalan + Tahsin: Form terintegrasi dengan QR Code scanner
- Raport Tahfidz: Hasil raport dalam format PDF dengan penilaian per surat
- Absensi QR Code: Proses scan kartu identitas santri

**Fitur Utama yang Tersedia:**
- 100+ API endpoints
- 10+ modul terintegrasi
- 5 level akses pengguna
- 3 format ekspor raport (PDF, Word, Excel)
- Website publik dengan CMS
- Portal Wali Murid
- Android Mobile App (Capacitor)

---

# PENUTUP

Platform digital Tim Qur'an merupakan solusi komprehensif untuk pengelolaan program Tahfidz dan Tahsin Al-Qur'an yang berbasis data dan teknologi cloud. Dengan mengintegrasikan pencatatan hafalan, absensi QR Code, pembuatan raport otomatis, portal orang tua, dan website publik dalam satu ekosistem, platform ini berhasil mengurangi beban administratif guru hingga 80%, mempercepat proses pembuatan raport dari hari menjadi menit, dan meningkatkan transparansi perkembangan santri bagi seluruh pemangku kepentingan.

Harapannya, praktik baik ini dapat direplikasi oleh Sekolah Islam Terpadu lainnya sebagai bagian dari penguatan mutu pendidikan dan pencapaian Profil Lulusan SIT. Dengan pendekatan yang berawal dari masalah nyata dan dirancang untuk kemudahan penggunaan, digitalisasi pengelolaan Al-Qur'an bukan lagi sekadar aspirasi, melainkan sudah menjadi kenyataan yang dapat diakses oleh semua pihak.

---

*Ketentuan Penulisan:*
- *Maksimal 5 halaman (tidak termasuk lampiran dokumentasi bila diperlukan)*
- *Kertas A4*
- *Font Calibri/Arial 11 atau Times New Roman 12*
- *Spasi 1,5*
- *Margin Normal*
- *Format file PDF*
- *Sertakan foto kegiatan dengan keterangan yang jelas*
- *Gunakan bahasa Indonesia yang baik, komunikatif, dan berbasis data*
