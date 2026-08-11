// src/app/api/raport/generate/route.ts
// GET: Generate data raport otomatis dari riwayat hafalan & tahsin siswa
// Query: student_id, tahun_ajaran (opsional), periode (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { SURAH_PER_JUZ, type SurahTemplate } from '@/lib/surahData';

export const dynamic = 'force-dynamic';

function sanitizeSurahName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Normalize ejaan berbeda untuk nama surah yang sama di template berbeda
// Contoh: "Al Qolam" (Juz 29) → "Al Qalam" (Juz 24), "Ad Dhuha" → "Ad Duha"
function normalizeSurahName(name: string): string {
  let n = sanitizeSurahName(name);
  // Normalize known spelling variations between juz templates
  n = n.replace(/qolam/g, 'qalam');
  n = n.replace(/dhuha/g, 'duha');
  n = n.replace(/naas/g, 'nas');
  n = n.replace(/takatsur/g, 'takasur');
  n = n.replace(/shaff/g, 'saff');
  return n;
}

// ── Helper pencocokan nama surah antar format ──────────────────────────────
// Masalah asli: jurnal setoran mencatat "An Nisa" + ayat "24-33" (terpisah),
// sedangkan template Juz 5 memakai "An Nisa (24-33)". Keduanya harus dianggap
// potongan yang sama agar nilai makhroj/tajwid/lancar bisa diisi otomatis.

interface DetailRow {
  nama_surah: string;
  makhroj: string;
  tajwid: string;
  lancar: string;
  wafa_buku: string;
  wafa_halaman: string;
  tanggal: string;
  urutan: number;
}

// Kunci "dasar" tanpa angka/rentang: "An Nisa (24-33)", "An Nisa", "An Nisa 24-33"
// → semuanya "annisa"
function baseSurahKey(name: string): string {
  return normalizeSurahName(name).replace(/\d+/g, '');
}

// Ekstrak rentang "X-Y" dari nama surah atau kolom halaman/ayat
function extractRange(str?: string | number | null): string {
  const m = String(str ?? '').trim().match(/(\d+)\s*[-–—]\s*(\d+)/);
  return m ? `${m[1]}-${m[2]}` : '';
}

// Kunci detail: nama dasar + rentang ayat (jika ada) agar potongan surah tetap terpisah.
// Jurnal "An Nisa" + ayat "24-33" → "annisa:24-33", cocok dengan template "An Nisa (24-33)".
function detailKey(name: string, ayat?: string | number | null): string {
  const base = baseSurahKey(name);
  const range = extractRange(name) || extractRange(ayat);
  return range ? `${base}:${range}` : base;
}

// Pilih juz terbaik dari kandidat: jumlah kecocokan terbanyak menang;
// jika imbang, dekati juz_terakhir siswa.
function pickBestJuz(candidates: { juz: number; matches: number }[], fallbackJuz: number | null): number | null {
  if (!candidates.length) return null;
  const max = Math.max(...candidates.map((c) => c.matches));
  const top = candidates.filter((c) => c.matches === max);
  if (top.length > 1 && fallbackJuz !== null) {
    top.sort((a, b) => Math.abs(a.juz - fallbackJuz) - Math.abs(b.juz - fallbackJuz));
  }
  return top[0].juz;
}

// Kelompokkan baris detail yang cocok dengan template juz tertentu:
// 1) nama + rentang persis (mis. jurnal "An Nisa"+"24-33" ↔ template "An Nisa (24-33)")
// 2) fallback nama dasar (semua potongan surah yang sama).
// Nama baris diselaraskan dengan nama template juz.
function buildJuzGroupDetail(juz: number, detailSurah: DetailRow[]): DetailRow[] {
  const templateRows: SurahTemplate[] = SURAH_PER_JUZ[juz] ?? [];
  const exactTemplate = new Map<string, string>(); // detailKey → nama template
  const baseTemplate = new Map<string, string>();   // baseKey → nama template pertama
  for (const s of templateRows) {
    const dk = detailKey(s.nama, '');
    if (!exactTemplate.has(dk)) exactTemplate.set(dk, s.nama);
    const bk = baseSurahKey(s.nama);
    if (!baseTemplate.has(bk)) baseTemplate.set(bk, s.nama);
  }
  return detailSurah
    .filter((s) => {
      const dk = detailKey(s.nama_surah, s.wafa_halaman);
      const bk = baseSurahKey(s.nama_surah);
      return exactTemplate.has(dk) || baseTemplate.has(bk);
    })
    .map((s, i) => {
      const dk = detailKey(s.nama_surah, s.wafa_halaman);
      const bk = baseSurahKey(s.nama_surah);
      const tplName = exactTemplate.get(dk) ?? baseTemplate.get(bk) ?? s.nama_surah;
      return { ...s, nama_surah: tplName, urutan: i + 1 };
    });
}

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id')?.trim();
  if (!studentId) return NextResponse.json({ message: 'student_id wajib.' }, { status: 400 });

  const supabase = createServerClient();

  try {
    // Ambil semester aktif untuk menentukan rentang tanggal pengambilan data jurnal
    const { data: activeSemester } = await supabase
      .from('semester_settings')
      .select('semester_name, end_date')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (activeSemester) {
      endDate = activeSemester.end_date;
      // Cari tanggal akhir dari semester sebelumnya
      const { data: prevSemesters } = await supabase
        .from('semester_settings')
        .select('end_date')
        .lt('end_date', endDate)
        .order('end_date', { ascending: false })
        .limit(1);

      if (prevSemesters && prevSemesters.length > 0) {
        // Tanggal mulai adalah H+1 dari tanggal akhir semester sebelumnya
        const prevEndDate = new Date(prevSemesters[0].end_date);
        prevEndDate.setDate(prevEndDate.getDate() + 1);
        startDate = prevEndDate.toISOString().split('T')[0];
      }
    }

    // ── 1. Ambil data hafalan siswa ────────────────────────────────────────
    const hasSemesterRange = !!(startDate && endDate);
    let hafalanQuery = supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, teacher_id, users!hafalan_teacher_id_fkey(name)')
      .eq('student_id', studentId);

    if (startDate) {
      hafalanQuery = hafalanQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      hafalanQuery = hafalanQuery.lte('tanggal', endDate);
    }

    // eslint-disable-next-line prefer-const
    let { data: hafalanData, error: hErr } = await hafalanQuery
      .order('tanggal', { ascending: false })
      .order('sort_order', { ascending: true, nullsFirst: false });

    if (hErr) return NextResponse.json({ message: hErr.message }, { status: 500 });

    // Fallback: jika filter semester menghasilkan 0 data, ambil tanpa filter tanggal
    if (hasSemesterRange && (!hafalanData || hafalanData.length === 0)) {
      const { data: fallback } = await supabase
        .from('hafalan')
        .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, teacher_id, users!hafalan_teacher_id_fkey(name)')
        .eq('student_id', studentId)
        .order('tanggal', { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false });
      hafalanData = fallback;
    }

    // ── 2. Ambil data tahsin siswa ─────────────────────────────────────────
    let tahsinQuery = supabase
      .from('tahsin')
      .select('id, tanggal, metode, makhroj, kelancaran, adab, buku, halaman, catatan, teacher_id, updated_at, users!tahsin_teacher_id_fkey(name)')
      .eq('student_id', studentId);

    if (startDate) {
      tahsinQuery = tahsinQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      tahsinQuery = tahsinQuery.lte('tanggal', endDate);
    }

    // eslint-disable-next-line prefer-const
    let { data: tahsinData, error: tErr } = await tahsinQuery.order('updated_at', { ascending: false });

    if (tErr) return NextResponse.json({ message: tErr.message }, { status: 500 });

    // Fallback: jika filter semester menghasilkan 0 data, ambil tanpa filter tanggal
    if (hasSemesterRange && (!tahsinData || tahsinData.length === 0)) {
      const { data: fallback } = await supabase
        .from('tahsin')
        .select('id, tanggal, metode, makhroj, kelancaran, adab, buku, halaman, catatan, teacher_id, updated_at, users!tahsin_teacher_id_fkey(name)')
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });
      tahsinData = fallback;
    }

    // ── 3. Ambil data absensi siswa ────────────────────────────────────────
    let attendanceQuery = supabase
      .from('attendances')
      .select('status')
      .eq('student_id', studentId);

    if (startDate) {
      attendanceQuery = attendanceQuery.gte('date', startDate);
    }
    if (endDate) {
      attendanceQuery = attendanceQuery.lte('date', endDate);
    }

    // eslint-disable-next-line prefer-const
    let { data: attendanceData, error: aErr } = await attendanceQuery;

    if (aErr) return NextResponse.json({ message: aErr.message }, { status: 500 });

    // Fallback: jika filter semester menghasilkan 0 data, ambil tanpa filter tanggal
    if (hasSemesterRange && (!attendanceData || attendanceData.length === 0)) {
      const { data: fallback } = await supabase
        .from('attendances')
        .select('status')
        .eq('student_id', studentId);
      attendanceData = fallback;
    }

    // ── 3. Susun detail surah dari hafalan ─────────────────────────────────
    // Group by nama surah + rentang ayat (detailKey), ambil nilai terlengkap dari semua jurnal.
    // detailKey membedakan potongan surah ber-rentang (mis. "An Nisa (24-33)" vs "(34-44)")
    // namun tetap menggabungkan catatan yang sama persis (termasuk jurnal polos "An Nisa").
    const surahMap = new Map<string, {
      nama_surah: string;
      makhroj: string;
      tajwid: string;
      lancar: string;
      wafa_buku: string;
      wafa_halaman: string;
      tanggal: string;
    }>();

    for (const h of (hafalanData ?? [])) {
      const surahName = h.surah_juz?.trim();
      if (!surahName) continue;

      const key = detailKey(surahName, h.halaman);
      const existing = surahMap.get(key);
      if (!existing) {
        // Surah belum ada, masukkan langsung
        surahMap.set(key, {
          nama_surah: surahName,
          makhroj: h.makhroj || '',
          tajwid: h.tajwid || '',
          lancar: h.lancar || '',
          wafa_buku: '',
          wafa_halaman: h.halaman ? String(h.halaman) : '',
          tanggal: h.tanggal,
        });
      } else {
        // Surah sudah ada, update nilai yang kosong dengan nilai dari jurnal ini.
        // Prefer nama berformat template (mengandung "(") sebagai tampilan.
        surahMap.set(key, {
          nama_surah: existing.nama_surah.includes('(') ? existing.nama_surah : surahName,
          makhroj: existing.makhroj || h.makhroj || '',
          tajwid: existing.tajwid || h.tajwid || '',
          lancar: existing.lancar || h.lancar || '',
          wafa_buku: existing.wafa_buku,
          wafa_halaman: existing.wafa_halaman || (h.halaman ? String(h.halaman) : ''),
          tanggal: existing.tanggal, // Pertahankan tanggal dari entry pertama (terbaru)
        });
      }
    }

    // Tambahkan data tahsin ke surah yang ada (update nilai)
    for (const t of (tahsinData ?? [])) {
      const buku = t.buku?.trim();
      // Coba cocokkan dengan surah yang sudah ada, atau tambah sebagai entry sendiri
      if (buku) {
        // Update wafa_buku pada semua surah yang belum punya nilai
        surahMap.forEach((v, k) => {
          if (!v.wafa_buku) {
            surahMap.set(k, { ...v, wafa_buku: buku });
          }
        });
      }
    }

    // Sort detail surah berdasarkan urutan surah di dalam Juz yang terdeteksi
    const surahEntries = Array.from(surahMap.values());
    const surahOrderMap = new Map<string, number>();
    // Iterasi Juz 30→1 agar template Juz 30 (lengkap) override Juz 25-27
    for (let j = 30; j >= 1; j--) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      for (let idx = 0; idx < surahsInJuz.length; idx++) {
        const key = detailKey(surahsInJuz[idx].nama, '');
        if (!surahOrderMap.has(key)) {
          surahOrderMap.set(key, j * 1000 + idx);
        }
      }
    }
    surahEntries.sort((a, b) => {
      const orderA = surahOrderMap.get(detailKey(a.nama_surah, a.wafa_halaman)) ?? 999999;
      const orderB = surahOrderMap.get(detailKey(b.nama_surah, b.wafa_halaman)) ?? 999999;
      return orderA - orderB;
    });

    let detailSurah = surahEntries.map((s, i) => ({
      ...s,
      urutan: i + 1,
    }));

    // ── 4. Ambil catatan terbaru dari hafalan ──────────────────────────────
    const latestCatatan = hafalanData?.find(h => h.catatan?.trim())?.catatan ?? '';

    // ── 5. Summary tahsin ──────────────────────────────────────────────────
    // Ambil data tahsin dari catatan yang paling baru diupdate
    const latestTahsin = tahsinData?.[0] ?? null;
    const tahsinSummary = latestTahsin ? [{
      tanggal: latestTahsin.tanggal,
      metode: latestTahsin.metode,
      makhroj: latestTahsin.makhroj,
      kelancaran: latestTahsin.kelancaran,
      adab: latestTahsin.adab,
      buku: latestTahsin.buku,
      halaman: latestTahsin.halaman,
      catatan: latestTahsin.catatan,
    }] : [];

    // ── 6. Deteksi Juz Otomatis dari Jurnal ────────────────────────────────
    // Kumpulkan key surah siswa — detailKey (nama + rentang) bila tersedia,
    // fallback ke baseKey (nama dasar tanpa angka).
    const studentSurahKeys = new Set<string>();
    for (const h of (hafalanData ?? [])) {
      if (h.surah_juz) {
        studentSurahKeys.add(detailKey(h.surah_juz, h.halaman));
        studentSurahKeys.add(baseSurahKey(h.surah_juz));
      }
    }

    // Detect ALL juz with matches. Exact key (nama + rentang) selalu dihitung,
    // sedangkan base key (nama dasar) dihitung SEKALI per surah — mencegah Juz 5
    // (10 baris "An Nisa (X-Y)" ber-base sama) menang hanya karena inflasi baris.
    const juzMatchCounts: { juz: number; matches: number }[] = [];
    for (let j = 1; j <= 30; j++) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      let matches = 0;
      const seenBase = new Set<string>();
      for (const s of surahsInJuz) {
        const dk = detailKey(s.nama, '');
        const bk = baseSurahKey(s.nama);
        if (studentSurahKeys.has(dk)) {
          matches += 2; // kecocokan eksplisit (rentang) — selalu dihitung
        } else if (studentSurahKeys.has(bk) && !seenBase.has(bk)) {
          matches += 1; // nama dasar saja — hitung sekali per surah
          seenBase.add(bk);
        }
      }
      if (matches > 0) {
        juzMatchCounts.push({ juz: j, matches });
      }
    }

    // Pilih juz: kecocokan terbanyak menang; jika imbang, dekati juz_terakhir siswa.
    // Ambil dulu juz_terakhir untuk tie-break di bawah.
    const { data: santriJuzRow } = await supabase
      .from('santri')
      .select('juz_terakhir')
      .eq('id', studentId)
      .maybeSingle();
    const fallbackJuz = santriJuzRow?.juz_terakhir ? parseInt(String(santriJuzRow.juz_terakhir).match(/\d+/)?.[0] ?? '', 10) : null;

    const detectedJuz = pickBestJuz(juzMatchCounts, fallbackJuz);

    // Build juz_groups using greedy exclusive assignment:
    // Each surah is assigned to exactly ONE juz (the best match),
    // preventing false-positive juz groups from overlapping surah names.
    // Nama surah diselaraskan dengan template juz (mis. "An Nisa" → "An Nisa (24-33)")
    // sehingga nilai jurnal (makhroj/tajwid/lancar) ikut terbawa.
    const juzGroups: { juz: number; detail: typeof detailSurah; matches: number }[] = [];
    const assignedSurahs = new Set<string>(); // track detail keys already assigned

    // Urutkan kandidat juz: kecocokan terbanyak dulu; jika imbang, yang terdekat
    // ke juz_terakhir siswa. Ini memastikan greedy assignment memproses juz
    // terbaik lebih dulu — penting untuk nama polos seperti "An Nisa" yang
    // juga ada di template Juz 3 & 4 (tanpa rentang ayat).
    const sortedJuzCandidates = [...juzMatchCounts].sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (fallbackJuz !== null) {
        return Math.abs(a.juz - fallbackJuz) - Math.abs(b.juz - fallbackJuz);
      }
      return a.juz - b.juz;
    });

    for (const jc of sortedJuzCandidates) {
      // Cocokkan baris yang belum ter-assign dengan template juz ini,
      // lalu selaraskan nama surah ke format template juz.
      const matched = buildJuzGroupDetail(jc.juz, detailSurah).filter(
        (s) => !assignedSurahs.has(detailKey(s.nama_surah, s.wafa_halaman))
      );
      if (matched.length > 0) {
        // Mark these surahs as assigned
        for (const s of matched) {
          assignedSurahs.add(detailKey(s.nama_surah, s.wafa_halaman));
        }
        juzGroups.push({
          juz: jc.juz,
          detail: matched,
          matches: matched.length,
        });
      }
    }

    // Filter phantom juz groups: jika ada group yang terlalu kecil dibanding
    // group terbesar, kemungkinan itu false positive dari template overlap.
    // Threshold: group harus minimal 2 surah ATAU minimal 25% dari group terbesar.
    if (juzGroups.length > 1) {
      const maxGroupSize = Math.max(...juzGroups.map(g => g.detail.length));
      const minThreshold = Math.max(2, Math.ceil(maxGroupSize * 0.25));
      const filteredGroups = juzGroups.filter(g => g.detail.length >= minThreshold);
      // Hanya gunakan hasil filter jika masih ada group tersisa
      if (filteredGroups.length > 0) {
        juzGroups.length = 0;
        for (const g of filteredGroups) juzGroups.push(g);
      }
    }

    // Jika tidak ada kecocokan, ambil juz_terakhir dari data santri
    // (juz_terakhir sudah diambil di atas untuk tie-break deteksi juz)
    if (detectedJuz === null && fallbackJuz !== null) {
      // Add as single juz group (only unassigned surahs), selaraskan nama surah
      const fallbackDetail = buildJuzGroupDetail(fallbackJuz, detailSurah);
      const unassigned = fallbackDetail.filter((s) => !assignedSurahs.has(detailKey(s.nama_surah, s.wafa_halaman)));
      if (unassigned.length > 0) {
        for (const s of unassigned) {
          assignedSurahs.add(detailKey(s.nama_surah, s.wafa_halaman));
        }
        juzGroups.push({
          juz: fallbackJuz,
          detail: unassigned,
          matches: unassigned.length,
        });
      }
    }

    // Selaraskan nama surah di detail_surah (tampilan form/preview) ke template
    // juz terdeteksi — tanpa menghapus baris. Mis. "An Nisa" → "An Nisa (24-33)".
    if (detectedJuz !== null) {
      const tplRows: SurahTemplate[] = SURAH_PER_JUZ[detectedJuz] ?? [];
      const exactTpl = new Map<string, string>();
      const baseTpl = new Map<string, string>();
      for (const s of tplRows) {
        const dk = detailKey(s.nama, '');
        if (!exactTpl.has(dk)) exactTpl.set(dk, s.nama);
        const bk = baseSurahKey(s.nama);
        if (!baseTpl.has(bk)) baseTpl.set(bk, s.nama);
      }
      detailSurah = detailSurah.map((s, i) => {
        const dk = detailKey(s.nama_surah, s.wafa_halaman);
        const bk = baseSurahKey(s.nama_surah);
        const tplName = exactTpl.get(dk) ?? baseTpl.get(bk);
        return tplName
          ? { ...s, nama_surah: tplName, urutan: i + 1 }
          : { ...s, urutan: i + 1 };
      });
    }

    // ── 7. Ringkasan Absensi Kehadiran ────────────────────────────────────
    let attendanceSummary = '';
    if (attendanceData && attendanceData.length > 0) {
      const total = attendanceData.length;
      const hadir = attendanceData.filter(a => a.status === 'Hadir').length;
      const alfa = attendanceData.filter(a => a.status === 'Tidak Hadir').length;
      const pct = Math.round((hadir / total) * 100);
      attendanceSummary = `Kehadiran: ${pct}% (Hadir: ${hadir}, Tidak Hadir: ${alfa}).\n`;
    } else {
      attendanceSummary = 'Kehadiran: 0% (Belum ada data absensi).\n';
    }

    // ── 8. Statistik ──────────────────────────────────────────────────────
    const totalHafalan = hafalanData?.length ?? 0;
    const totalTahsin  = tahsinData?.length  ?? 0;
    const surahHafal   = detailSurah.length;

    // ── 9. Ambil info guru pengajar dari assigned_teacher_id ─────────────────
    let namaGuruKelas = '';
    let niyGuruKelas = '';
    const { data: santri } = await supabase
      .from('santri')
      .select('assigned_teacher_id, class_id')
      .eq('id', studentId)
      .single();
    if (santri?.assigned_teacher_id) {
      const { data: guru } = await supabase
        .from('users')
        .select('name')
        .eq('id', santri.assigned_teacher_id)
        .single();
      if (guru) {
        namaGuruKelas = guru.name ?? '';
      }
      // NIY masih dari kelas (karena users tidak punya kolom niy)
      if (santri.class_id) {
        const { data: kelas } = await supabase
          .from('classes')
          .select('niy_guru_kelas')
          .eq('id', santri.class_id)
          .single();
        if (kelas) {
          niyGuruKelas = kelas.niy_guru_kelas ?? '';
        }
      }
    } else if (santri?.class_id) {
      // Fallback: ambil dari kelas jika tidak ada assigned_teacher_id
      const { data: kelas } = await supabase
        .from('classes')
        .select('nama_guru_kelas, niy_guru_kelas')
        .eq('id', santri.class_id)
        .single();
      if (kelas) {
        namaGuruKelas = kelas.nama_guru_kelas ?? '';
        niyGuruKelas = kelas.niy_guru_kelas ?? '';
      }
    }

    return NextResponse.json({
      data: {
        detail_surah: detailSurah,
        catatan_terbaru: latestCatatan,
        tahsin_summary: tahsinSummary,
        juz: detectedJuz,
        juz_groups: juzGroups,
        kehadiran_summary: attendanceSummary,
        nama_guru_kelas: namaGuruKelas,
        niy_guru_kelas: niyGuruKelas,
        stats: {
          total_hafalan: totalHafalan,
          total_tahsin: totalTahsin,
          surah_hafal: surahHafal,
        },
      }
    }, { status: 200 });

  } catch (err) {
    console.error('[raport/generate]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
