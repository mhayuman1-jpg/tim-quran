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
    // Group by nama surah, ambil yang terbaru
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
      if (!surahMap.has(surahName)) {
        surahMap.set(surahName, {
          nama_surah: surahName,
          makhroj: h.makhroj || '',
          tajwid: h.tajwid || '',
          lancar: h.lancar || '',
          wafa_buku: '',
          wafa_halaman: h.halaman ? String(h.halaman) : '',
          tanggal: h.tanggal,
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
        const key = normalizeSurahName(surahsInJuz[idx].nama);
        if (!surahOrderMap.has(key)) {
          surahOrderMap.set(key, j * 1000 + idx);
        }
      }
    }
    surahEntries.sort((a, b) => {
      const orderA = surahOrderMap.get(normalizeSurahName(a.nama_surah)) ?? 999999;
      const orderB = surahOrderMap.get(normalizeSurahName(b.nama_surah)) ?? 999999;
      return orderA - orderB;
    });

    const detailSurah = surahEntries.map((s, i) => ({
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
    // Kumpulkan surah siswa (normalized) — map normalized → original
    const studentSurahNormToOriginal = new Map<string, string>();
    for (const h of (hafalanData ?? [])) {
      if (h.surah_juz) {
        const norm = normalizeSurahName(h.surah_juz);
        if (!studentSurahNormToOriginal.has(norm)) {
          studentSurahNormToOriginal.set(norm, h.surah_juz.trim());
        }
      }
    }

    // Detect ALL juz with matches using normalized names
    const juzMatchCounts: { juz: number; matches: number }[] = [];
    for (let j = 1; j <= 30; j++) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      let matches = 0;
      for (const s of surahsInJuz) {
        if (studentSurahNormToOriginal.has(normalizeSurahName(s.nama))) {
          matches++;
        }
      }
      if (matches > 0) {
        juzMatchCounts.push({ juz: j, matches });
      }
    }
    // Sort by matches descending
    juzMatchCounts.sort((a, b) => b.matches - a.matches);

    let detectedJuz: number | null = null;
    let maxMatches = 0;
    for (const jc of juzMatchCounts) {
      if (jc.matches > maxMatches) {
        maxMatches = jc.matches;
        detectedJuz = jc.juz;
      }
    }

    // Build juz_groups using greedy exclusive assignment:
    // Each surah is assigned to exactly ONE juz (the best match),
    // preventing false-positive juz groups from overlapping surah names.
    // Uses normalized names to handle spelling variations between juz templates.
    const juzGroups: { juz: number; detail: typeof detailSurah; matches: number }[] = [];
    const assignedSurahs = new Set<string>(); // track normalized surah keys already assigned

    for (const jc of juzMatchCounts) {
      const surahsInJuz: SurahTemplate[] = SURAH_PER_JUZ[jc.juz] ?? [];
      const juzNormKeys = new Set(surahsInJuz.map((sj: SurahTemplate) => normalizeSurahName(sj.nama)));
      // Only include surahs that belong to this juz AND haven't been assigned yet
      const groupDetail = detailSurah.filter((s) => {
        const key = normalizeSurahName(s.nama_surah);
        if (assignedSurahs.has(key)) return false;
        return juzNormKeys.has(key);
      });
      if (groupDetail.length > 0) {
        // Mark these surahs as assigned
        for (const s of groupDetail) {
          assignedSurahs.add(normalizeSurahName(s.nama_surah));
        }
        juzGroups.push({
          juz: jc.juz,
          detail: groupDetail.map((d, i) => ({ ...d, urutan: i + 1 })),
          matches: groupDetail.length,
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
    if (detectedJuz === null) {
      const { data: santriJuz } = await supabase
        .from('santri')
        .select('juz_terakhir')
        .eq('id', studentId)
        .maybeSingle();
      if (santriJuz?.juz_terakhir) {
        const match = String(santriJuz.juz_terakhir).match(/\d+/);
        detectedJuz = match ? parseInt(match[0], 10) : null;
        // Add as single juz group (only unassigned surahs)
        if (detectedJuz) {
          const surahsInJuz: SurahTemplate[] = SURAH_PER_JUZ[detectedJuz] ?? [];
          const fallbackNormKeys = new Set(surahsInJuz.map((sj: SurahTemplate) => normalizeSurahName(sj.nama)));
          const groupDetail = detailSurah.filter((s) => {
            const key = normalizeSurahName(s.nama_surah);
            if (assignedSurahs.has(key)) return false;
            return fallbackNormKeys.has(key);
          });
          if (groupDetail.length > 0) {
            for (const s of groupDetail) {
              assignedSurahs.add(normalizeSurahName(s.nama_surah));
            }
            juzGroups.push({
              juz: detectedJuz,
              detail: groupDetail.map((d, i) => ({ ...d, urutan: i + 1 })),
              matches: groupDetail.length,
            });
          }
        }
      }
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
