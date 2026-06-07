-- ============================================================
-- Migration: Raport Tahfidz V2
-- Sistem raport berbasis surah per baris, nilai A/B/C/D + centang WAFA
-- ============================================================

-- Tabel raport header (satu per siswa per periode)
CREATE TABLE IF NOT EXISTS raport_tahfidz (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES users(id),
  periode       TEXT NOT NULL,
  tahun_ajaran  TEXT NOT NULL,
  juz           INTEGER,
  catatan       TEXT,
  nama_guru_kelas      TEXT,
  nama_kabid           TEXT,
  nama_kepala_sekolah  TEXT,
  tahsin_metode        TEXT,
  tahsin_buku          TEXT,
  tahsin_halaman       TEXT,
  tahsin_makhroj       TEXT,
  tahsin_kelancaran    TEXT,
  tahsin_adab          TEXT,
  tahsin_catatan       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, periode)
);

-- Tabel detail penilaian per surah
CREATE TABLE IF NOT EXISTS raport_tahfidz_detail (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raport_id       UUID NOT NULL REFERENCES raport_tahfidz(id) ON DELETE CASCADE,
  urutan          INTEGER NOT NULL DEFAULT 1,
  nama_surah      TEXT NOT NULL,           -- misal: "Al Mulk", "Al Ma'arij (1-35)"
  makhroj         TEXT,                    -- nilai: '✓', 'A', 'B', 'C', 'D', atau NULL
  tajwid          TEXT,
  lancar          TEXT,
  wafa_buku       TEXT,                    -- misal: "Wafa 4"
  wafa_halaman    TEXT,                    -- misal: "Tuntas", atau angka halaman
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_raport_tahfidz_student ON raport_tahfidz(student_id);
CREATE INDEX IF NOT EXISTS idx_raport_tahfidz_periode ON raport_tahfidz(periode);
CREATE INDEX IF NOT EXISTS idx_raport_tahfidz_detail_raport ON raport_tahfidz_detail(raport_id);

-- ============================================================
-- Data: Daftar surah default per juz (untuk referensi)
-- Bisa digunakan sebagai template saat membuat raport baru
-- ============================================================
-- Juz 29: Al Mulk, Al Qolam, Al Haaqgoh, Al Ma'arij, Nuh, Al Jinn,
--         Al Muzammil, Al Muddassir, Al Qiyamah, Al Insan 1-20, Al Mursalat
-- Juz 30: An Naba, An Nazi'at, Abasa, At Takwir, Al Infitar, Al Mutaffifin,
--         Al Insyiqaq, Al Buruj, At Tariq, Al A'la, Al Ghasyiyah,
--         Al Fajr, Al Balad, Asy Syams, Al Lail, Adh Dhuha, Al Insyirah,
--         At Tin, Al Alaq, Al Qadr, Al Bayyinah, Az Zalzalah,
--         Al Adiyat, Al Qori'ah, At Takasur, Al Ashr, Al Humazah,
--         Al Fil, Al Quraisy, Al Ma'un, Al Kautsar, Al Kafirun,
--         An Nasr, Al Lahab, Al Ikhlas, Al Falaq, An Naas
