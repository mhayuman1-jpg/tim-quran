// src/app/api/jurnal-hafalan-tahsin/add/route.ts
// POST: Simpan jurnal hafalan + tahsin harian sekaligus
// - Setiap baris surah disimpan ke tabel hafalan
// - Penilaian tahsin disimpan ke tabel tahsin
// - Tim_Quran hanya dapat menambahkan untuk siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import { requireNoHoliday } from '@/lib/holiday';
import type { TahsinMetode } from '@/types';
import type { NilaiTahfidz } from '@/lib/surahData';
import { SURAH_PER_JUZ } from '@/lib/surahData';

const VALID_METODE: TahsinMetode[] = ['Wafa', 'IWR', 'Al-Quran'];
const VALID_RATING: NilaiTahfidz[] = ['✓', 'A', 'B', 'C', 'D', 'L', 'KL', 'TL', ''];

interface DetailRow {
  nama_surah: string;
  makhroj?: NilaiTahfidz;
  tajwid?: NilaiTahfidz;
  lancar?: NilaiTahfidz;
  buku?: string;
  halaman?: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const tanggal = searchParams.get('tanggal')?.trim();

    if (!studentId || !tanggal) {
      return NextResponse.json({ message: 'student_id dan tanggal wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Ambil data hafalan
    const { data: hafalanData, error: hErr } = await supabase
      .from('hafalan')
      .select('id, surah_juz, halaman, makhroj, tajwid, lancar, buku, catatan, sort_order')
      .eq('student_id', studentId)
      .eq('tanggal', tanggal);

    if (hErr) {
      console.error('Fetch hafalan error:', hErr);
      return NextResponse.json({ message: 'Gagal mengambil data hafalan.', error: hErr.message }, { status: 500 });
    }

    // Re-sort berdasarkan urutan template agar konsisten meskipun sort_order di DB berbeda
    const TEMPLATE_POSITION = new Map<string, number>();
    for (let j = 30; j >= 1; j--) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      for (let idx = 0; idx < surahsInJuz.length; idx++) {
        const key = surahsInJuz[idx].nama.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!TEMPLATE_POSITION.has(key)) TEMPLATE_POSITION.set(key, j * 1000 + idx);
      }
    }
    const sortedHafalan = (hafalanData ?? []).sort((a, b) => {
      const ka = (a.surah_juz ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const kb = (b.surah_juz ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return (TEMPLATE_POSITION.get(ka) ?? 999999) - (TEMPLATE_POSITION.get(kb) ?? 999999);
    });

    // 2. Ambil data tahsin
    const { data: tahsinData, error: tErr } = await supabase
      .from('tahsin')
      .select('id, metode, buku, halaman, makhroj, kelancaran, adab, catatan')
      .eq('student_id', studentId)
      .eq('tanggal', tanggal)
      .limit(1)
      .maybeSingle();

    if (tErr) {
      console.error('Fetch tahsin error:', tErr);
      return NextResponse.json({ message: 'Gagal mengambil data tahsin.', error: tErr.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        hafalan: sortedHafalan,
        tahsin: tahsinData ?? null
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Route GET error /api/jurnal-hafalan-tahsin/add:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const {
      student_id,
      tanggal,
      detail,
      tahsin_metode,
      tahsin_buku,
      tahsin_halaman,
      tahsin_makhroj,
      tahsin_kelancaran,
      tahsin_adab,
      tahsin_catatan,
    } = body;

    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      return NextResponse.json({ message: 'student_id wajib diisi.' }, { status: 400 });
    }
    if (!tanggal || typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json({ message: 'Tanggal wajib diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }

    // detail (hafalan) bersifat opsional - bisa hanya tambah tahsin saja
    // Filter baris yang memiliki nama_surah (abaikan baris kosong)
    const allDetailRows: DetailRow[] = Array.isArray(detail) ? detail : [];
    const detailRows: DetailRow[] = allDetailRows.filter(
      (row) => row && typeof row === 'object' && row.nama_surah && typeof row.nama_surah === 'string' && row.nama_surah.trim() !== ''
    );
    const hasHafalan = detailRows.length > 0;

    // Tahsin bersifat opsional - hanya validate jika ada data tahsin
    const hasTahsinData = tahsin_metode || tahsin_buku || tahsin_halaman || tahsin_makhroj || tahsin_kelancaran || tahsin_adab || tahsin_catatan;

    if (hasTahsinData) {
      if (!tahsin_metode || !VALID_METODE.includes(tahsin_metode as TahsinMetode)) {
        return NextResponse.json({ message: `Metode tahsin wajib diisi. Pilihan: ${VALID_METODE.join(', ')}.` }, { status: 400 });
      }
      if (!tahsin_buku || typeof tahsin_buku !== 'string' || tahsin_buku.trim() === '') {
        return NextResponse.json({ message: 'Buku tahsin wajib diisi.' }, { status: 400 });
      }
    }
    const tahsinHalaman = typeof tahsin_halaman === 'string' ? tahsin_halaman.trim() : (tahsin_halaman ? String(tahsin_halaman) : null);
    const tahsinMakhroj = typeof tahsin_makhroj === 'string' && VALID_RATING.includes(tahsin_makhroj as NilaiTahfidz)
      ? (tahsin_makhroj as NilaiTahfidz)
      : null;
    const tahsinKelancaran = typeof tahsin_kelancaran === 'string' && VALID_RATING.includes(tahsin_kelancaran as NilaiTahfidz)
      ? (tahsin_kelancaran as NilaiTahfidz)
      : null;
    const tahsinAdab = typeof tahsin_adab === 'string' && VALID_RATING.includes(tahsin_adab as NilaiTahfidz)
      ? (tahsin_adab as NilaiTahfidz)
      : null;

    const supabase = createServerClient();

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    // Cek hari libur — tolak input jika tanggal libur
    const holidayCheck = await requireNoHoliday(supabase, tanggal, session.user.role);
    if (holidayCheck.error) return holidayCheck.error;

    if (session.user.role === 'Tim_Quran') {
      const { data: assigned, error: assignedError } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('id', student_id.trim())
        .single();
      if (assignedError || !assigned) {
        return NextResponse.json({ message: 'Siswa tidak ditemukan.' }, { status: 404 });
      }
      if (assigned.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Anda tidak memiliki akses untuk siswa ini.' }, { status: 403 });
      }
    }

    const teacherId = session.user.id ?? null;
    if (!teacherId) {
      return NextResponse.json(
        { message: 'ID pengguna tidak tersedia di sesi. Silakan login ulang.' },
        { status: 401 }
      );
    }

    const { data: teacherRecord, error: teacherError } = await supabase
      .from('users')
      .select('id')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacherRecord) {
      return NextResponse.json(
        {
          message: 'Akun guru tidak ditemukan di tabel users.',
          error: teacherError?.message ?? 'teacher record missing',
          teacherId,
        },
        { status: 500 }
      );
    }

    // Hapus hafalan lama untuk student_id + tanggal ini (agar edit menggantikan data lama)
    if (hasHafalan) {
      await supabase
        .from('hafalan')
        .delete()
        .eq('student_id', student_id.trim())
        .eq('tanggal', tanggal);
    }

    // Insert hafalan — SELALU buat record baru, jangan menimpa riwayat lama
    if (hasHafalan) {
      // ── Hitung sort_order berdasarkan urutan template ──
      // Iterasi Juz 30→1 agar template Juz 30 (lengkap) override Juz 25-27
      const SURAH_POSITION: Record<string, number> = {};
      for (let j = 30; j >= 1; j--) {
        const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
        for (let idx = 0; idx < surahsInJuz.length; idx++) {
          const key = surahsInJuz[idx].nama.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!(key in SURAH_POSITION)) {
            SURAH_POSITION[key] = j * 1000 + idx;
          }
        }
      }

      const hafalanRecords = detailRows.map((row) => {
        const halamanValue = typeof row.halaman === 'string' ? row.halaman.trim() : (row.halaman ? String(row.halaman) : null);
        const surahKey = row.nama_surah.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return {
          student_id: student_id.trim(),
          teacher_id: teacherId,
          tanggal,
          surah_juz: row.nama_surah.trim(),
          halaman: halamanValue || null,
          catatan: null,
          makhroj: typeof row.makhroj === 'string' && VALID_RATING.includes(row.makhroj) ? row.makhroj : null,
          tajwid: typeof row.tajwid === 'string' && VALID_RATING.includes(row.tajwid) ? row.tajwid : null,
          lancar: typeof row.lancar === 'string' && VALID_RATING.includes(row.lancar) ? row.lancar : null,
          buku: typeof row.buku === 'string' && row.buku.trim() !== '' ? row.buku.trim() : null,
          sort_order: SURAH_POSITION[surahKey] ?? 999999,
        };
      });

      const { error: hafalanError } = await supabase.from('hafalan').insert(hafalanRecords);
      if (hafalanError) {
        console.error('Supabase insert hafalan error:', hafalanError);
        return NextResponse.json(
          {
            message: 'Gagal menyimpan data hafalan.',
            error: hafalanError.message,
            hint: hafalanError.details ?? null,
          },
          { status: 500 }
        );
      }
    }

    // Insert / update tahsin hanya jika ada data tahsin
    if (hasTahsinData && tahsin_metode && tahsin_buku) {
      // Hapus tahsin lama untuk student_id + tanggal ini (agar edit menggantikan data lama)
      await supabase
        .from('tahsin')
        .delete()
        .eq('student_id', student_id.trim())
        .eq('tanggal', tanggal);

      const tahsinData: Record<string, unknown> = {
        student_id: student_id.trim(),
        teacher_id: teacherId,
        tanggal,
        metode: tahsin_metode as TahsinMetode,
        buku: tahsin_buku.trim(),
        halaman: tahsinHalaman || null,
        makhroj: tahsinMakhroj,
        kelancaran: tahsinKelancaran,
        adab: tahsinAdab,
        catatan: typeof tahsin_catatan === 'string' && tahsin_catatan.trim() !== '' ? tahsin_catatan.trim() : null,
      };

      const { error: tahsinError } = await supabase.from('tahsin').insert([tahsinData]);
      if (tahsinError) {
        console.error('Supabase insert tahsin error:', tahsinError);
        return NextResponse.json({ message: 'Data hafalan berhasil disimpan, namun gagal menyimpan catatan tahsin.', error: tahsinError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: hasHafalan && hasTahsinData ? 'Jurnal Hafalan & Tahsin berhasil disimpan.' : hasHafalan ? 'Jurnal Hafalan berhasil disimpan.' : 'Jurnal Tahsin berhasil disimpan.' }, { status: 201 });
  } catch (error) {
    console.error('Route error /api/jurnal-hafalan-tahsin/add:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
