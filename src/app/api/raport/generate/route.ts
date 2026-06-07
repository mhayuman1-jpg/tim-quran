// src/app/api/raport/generate/route.ts
// GET: Generate data raport otomatis dari riwayat hafalan & tahsin siswa
// Query: student_id, tahun_ajaran (opsional), periode (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id')?.trim();
  if (!studentId) return NextResponse.json({ message: 'student_id wajib.' }, { status: 400 });

  const supabase = createServerClient();

  try {
    // ── 1. Ambil data hafalan siswa ────────────────────────────────────────
    const { data: hafalanData, error: hErr } = await supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, catatan, teacher_id, users(name)')
      .eq('student_id', studentId)
      .order('tanggal', { ascending: false });

    if (hErr) return NextResponse.json({ message: hErr.message }, { status: 500 });

    // ── 2. Ambil data tahsin siswa ─────────────────────────────────────────
    const { data: tahsinData, error: tErr } = await supabase
      .from('tahsin')
      .select('id, tanggal, metode, buku, halaman, catatan, teacher_id, users(name)')
      .eq('student_id', studentId)
      .order('tanggal', { ascending: false });

    if (tErr) return NextResponse.json({ message: tErr.message }, { status: 500 });

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
          makhroj: '',
          tajwid: '',
          lancar: '✓', // sudah hafal
          wafa_buku: '',
          wafa_halaman: h.halaman ? String(h.halaman) : '',
          tanggal: h.tanggal,
        });
      }
    }

    // Tambahkan data tahsin ke surah yang ada (update nilai)
    for (const t of (tahsinData ?? [])) {
      const buku = t.buku?.trim();
      const hal  = t.halaman ? String(t.halaman) : '';
      // Coba cocokkan dengan surah yang sudah ada, atau tambah sebagai entry sendiri
      if (buku) {
        // Update wafa_buku pada semua surah yang belum punya nilai
        surahMap.forEach((v, k) => {
          if (!v.wafa_buku) {
            surahMap.set(k, { ...v, wafa_buku: buku, wafa_halaman: hal });
          }
        });
      }
    }

    const detailSurah = Array.from(surahMap.values()).map((s, i) => ({
      ...s,
      urutan: i + 1,
    }));

    // ── 4. Ambil catatan terbaru dari hafalan ──────────────────────────────
    const latestCatatan = hafalanData?.find(h => h.catatan?.trim())?.catatan ?? '';

    // ── 5. Summary tahsin ──────────────────────────────────────────────────
    const tahsinSummary = (tahsinData ?? []).slice(0, 10).map(t => ({
      tanggal: t.tanggal,
      metode: t.metode,
      buku: t.buku,
      halaman: t.halaman,
      catatan: t.catatan,
    }));

    // ── 6. Statistik ──────────────────────────────────────────────────────
    const totalHafalan = hafalanData?.length ?? 0;
    const totalTahsin  = tahsinData?.length  ?? 0;
    const surahHafal   = detailSurah.length;

    return NextResponse.json({
      data: {
        detail_surah: detailSurah,
        catatan_terbaru: latestCatatan,
        tahsin_summary: tahsinSummary,
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
