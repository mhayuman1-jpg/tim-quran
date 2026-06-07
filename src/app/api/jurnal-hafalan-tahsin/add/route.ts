// src/app/api/jurnal-hafalan-tahsin/add/route.ts
// POST: Simpan jurnal hafalan + tahsin harian sekaligus
// - Setiap baris surah disimpan ke tabel hafalan
// - Penilaian tahsin disimpan ke tabel tahsin
// - Tim_Quran hanya dapat menambahkan untuk siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import type { TahsinMetode } from '@/types';
import type { NilaiTahfidz } from '@/lib/surahData';

const VALID_METODE: TahsinMetode[] = ['Wafa', 'IWR', 'Al-Quran'];
const VALID_RATING: NilaiTahfidz[] = ['✓', 'A', 'B', 'C', 'D', ''];

interface DetailRow {
  nama_surah: string;
  makhroj?: NilaiTahfidz;
  tajwid?: NilaiTahfidz;
  lancar?: NilaiTahfidz;
  buku?: string;
  halaman?: number;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
  }

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
    if (!Array.isArray(detail) || detail.length === 0) {
      return NextResponse.json({ message: 'Minimal satu baris hafalan harus diisi.' }, { status: 400 });
    }

    const detailRows: DetailRow[] = detail;

    if (!tahsin_metode || !VALID_METODE.includes(tahsin_metode as TahsinMetode)) {
      return NextResponse.json({ message: `Metode tahsin wajib diisi. Pilihan: ${VALID_METODE.join(', ')}.` }, { status: 400 });
    }
    if (!tahsin_buku || typeof tahsin_buku !== 'string' || tahsin_buku.trim() === '') {
      return NextResponse.json({ message: 'Buku tahsin wajib diisi.' }, { status: 400 });
    }
    const tahsinHalamanNum = Number(tahsin_halaman);
    if (isNaN(tahsinHalamanNum) || tahsinHalamanNum < 1) {
      return NextResponse.json({ message: 'Halaman tahsin harus berupa angka positif.' }, { status: 400 });
    }
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

    const hafalanRecords = detailRows.map((row, index) => {
      if (!row || typeof row !== 'object') {
        throw new Error(`Baris ${index + 1} detail hafalan tidak valid.`);
      }
      if (!row.nama_surah || typeof row.nama_surah !== 'string' || row.nama_surah.trim() === '') {
        throw new Error(`Nama surah baris ${index + 1} wajib diisi.`);
      }
      if (row.halaman === undefined || row.halaman === null) {
        throw new Error(`Halaman baris ${index + 1} wajib diisi.`);
      }
      const halamanNum = Number(row.halaman);
      if (!Number.isInteger(halamanNum) || halamanNum < 1) {
        throw new Error(`Halaman baris ${index + 1} harus berupa angka positif.`);
      }
      return {
        student_id: student_id.trim(),
        teacher_id: teacherId,
        tanggal,
        surah_juz: row.nama_surah.trim(),
        halaman: halamanNum,
        catatan: null,
        makhroj: typeof row.makhroj === 'string' && VALID_RATING.includes(row.makhroj) ? row.makhroj : null,
        tajwid: typeof row.tajwid === 'string' && VALID_RATING.includes(row.tajwid) ? row.tajwid : null,
        lancar: typeof row.lancar === 'string' && VALID_RATING.includes(row.lancar) ? row.lancar : null,
        buku: typeof row.buku === 'string' && row.buku.trim() !== '' ? row.buku.trim() : null,
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

    const tahsinData: Record<string, unknown> = {
      student_id: student_id.trim(),
      teacher_id: teacherId,
      tanggal,
      metode: tahsin_metode as TahsinMetode,
      buku: tahsin_buku.trim(),
      halaman: tahsinHalamanNum,
      makhroj: tahsinMakhroj,
      kelancaran: tahsinKelancaran,
      adab: tahsinAdab,
      catatan: typeof tahsin_catatan === 'string' && tahsin_catatan.trim() !== '' ? tahsin_catatan.trim() : null,
    };

    const { error: tahsinError } = await supabase.from('tahsin').insert([tahsinData]);
    if (tahsinError) {
      console.error('Supabase insert tahsin error:', tahsinError);
      return NextResponse.json({ message: 'Data tahsin berhasil disimpan, namun gagal menyimpan catatan tahsin.', error: tahsinError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Jurnal Hafalan & Tahsin berhasil disimpan.' }, { status: 201 });
  } catch (error) {
    console.error('Route error /api/jurnal-hafalan-tahsin/add:', error);
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
