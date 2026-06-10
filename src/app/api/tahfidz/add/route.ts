// src/app/api/tahfidz/add/route.ts
// POST: Simpan catatan tahfidz baru
// - teacher_id otomatis dari session
// - Validasi field wajib: student_id, tanggal, surah_juz, makhroj, tajwid, lancar
// - Tim_Quran hanya bisa tambah untuk siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import type { NilaiTahfidz } from '@/lib/surahData';

export const dynamic = 'force-dynamic';
const VALID_NILAI: NilaiTahfidz[] = ['✓', 'A', 'B', 'C', 'D', 'L', 'TL'];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { student_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan } = body;

    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      return NextResponse.json({ message: 'student_id wajib diisi.' }, { status: 400 });
    }
    if (!tanggal || typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json({ message: 'Tanggal wajib diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }
    if (!surah_juz || typeof surah_juz !== 'string' || surah_juz.trim() === '') {
      return NextResponse.json({ message: 'Surah / Juz wajib diisi.' }, { status: 400 });
    }
    if (!VALID_NILAI.includes(makhroj)) {
      return NextResponse.json({ message: 'Penilaian makhroj tidak valid.' }, { status: 400 });
    }
    if (!VALID_NILAI.includes(tajwid)) {
      return NextResponse.json({ message: 'Penilaian tajwid tidak valid.' }, { status: 400 });
    }
    if (!VALID_NILAI.includes(lancar)) {
      return NextResponse.json({ message: 'Penilaian kelancaran tidak valid.' }, { status: 400 });
    }
    if (halaman !== undefined && halaman !== null) {
      const halamanNum = Number(halaman);
      if (isNaN(halamanNum) || halamanNum < 1) {
        return NextResponse.json({ message: 'Halaman harus berupa angka positif.' }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    if (session.user.role === 'Tim_Quran') {
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('id', student_id.trim())
        .single();

      if (santriError || !santri) {
        return NextResponse.json({ message: 'Siswa tidak ditemukan.' }, { status: 404 });
      }
      if (santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Anda tidak memiliki akses untuk siswa ini.' }, { status: 403 });
      }
    }

    const insertData: Record<string, unknown> = {
      student_id: student_id.trim(),
      teacher_id: session.user.id,
      tanggal,
      surah_juz: surah_juz.trim(),
      makhroj,
      tajwid,
      lancar,
    };
    if (halaman !== undefined && halaman !== null) insertData.halaman = Number(halaman);
    if (catatan && typeof catatan === 'string' && catatan.trim() !== '') {
      insertData.catatan = catatan.trim();
    }

    const { data, error } = await supabase
      .from('tahfidz')
      .insert([insertData])
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, created_at,
         santri ( id, nama ),
         users ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase insert tahfidz error:', error);
      return NextResponse.json({ message: 'Gagal menyimpan catatan tahfidz.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tahfidz berhasil disimpan.', data }, { status: 201 });
  } catch (error) {
    console.error('Route error /api/tahfidz/add:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
