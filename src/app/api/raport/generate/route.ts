// src/app/api/raport/generate/route.ts
// GET: Generate data raport otomatis dari riwayat hafalan & tahsin siswa
// Query: student_id, tahun_ajaran (opsional), periode (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { SURAH_PER_JUZ } from '@/lib/surahData';

export const dynamic = 'force-dynamic';

function sanitizeSurahName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

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
    let hafalanQuery = supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, teacher_id, users(name)')
      .eq('student_id', studentId);

    if (startDate) {
      hafalanQuery = hafalanQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      hafalanQuery = hafalanQuery.lte('tanggal', endDate);
    }

    const { data: hafalanData, error: hErr } = await hafalanQuery.order('tanggal', { ascending: false });

    if (hErr) return NextResponse.json({ message: hErr.message }, { status: 500 });

    // ── 2. Ambil data tahsin siswa ─────────────────────────────────────────
    let tahsinQuery = supabase
      .from('tahsin')
      .select('id, tanggal, metode, makhroj, kelancaran, adab, buku, halaman, catatan, teacher_id, updated_at, users(name)')
      .eq('student_id', studentId);

    if (startDate) {
      tahsinQuery = tahsinQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      tahsinQuery = tahsinQuery.lte('tanggal', endDate);
    }

    const { data: tahsinData, error: tErr } = await tahsinQuery.order('updated_at', { ascending: false });

    if (tErr) return NextResponse.json({ message: tErr.message }, { status: 500 });

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

    const { data: attendanceData, error: aErr } = await attendanceQuery;

    if (aErr) return NextResponse.json({ message: aErr.message }, { status: 500 });

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
    for (let j = 1; j <= 30; j++) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      for (let idx = 0; idx < surahsInJuz.length; idx++) {
        const key = sanitizeSurahName(surahsInJuz[idx].nama);
        if (!surahOrderMap.has(key)) {
          surahOrderMap.set(key, j * 1000 + idx);
        }
      }
    }
    surahEntries.sort((a, b) => {
      const orderA = surahOrderMap.get(sanitizeSurahName(a.nama_surah)) ?? 999999;
      const orderB = surahOrderMap.get(sanitizeSurahName(b.nama_surah)) ?? 999999;
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
    const studentSurahs = new Set<string>();
    for (const h of (hafalanData ?? [])) {
      if (h.surah_juz) {
        studentSurahs.add(sanitizeSurahName(h.surah_juz));
      }
    }

    let detectedJuz: number | null = null;
    let maxMatches = 0;

    for (let j = 1; j <= 30; j++) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      let matches = 0;
      for (const s of surahsInJuz) {
        if (studentSurahs.has(sanitizeSurahName(s.nama))) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedJuz = j;
      }
    }

    // Jika tidak ada kecocokan, ambil juz_terakhir dari data santri
    if (detectedJuz === null) {
      const { data: santri } = await supabase
        .from('santri')
        .select('juz_terakhir')
        .eq('id', studentId)
        .maybeSingle();
      if (santri?.juz_terakhir) {
        detectedJuz = santri.juz_terakhir;
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
