// src/app/api/hafalan/add/route.ts
// POST: Simpan catatan hafalan baru
// - teacher_id otomatis dari session
// - Validasi field wajib: student_id, tanggal, surah_juz, halaman
// - Tim_Quran hanya bisa tambah hafalan untuk siswa yang menjadi tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { student_id, tanggal, surah_juz, halaman, catatan } = body;

    // Validasi field wajib
    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      return NextResponse.json(
        { message: 'student_id wajib diisi.' },
        { status: 400 }
      );
    }
    if (!tanggal || typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { message: 'Tanggal wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (!surah_juz || typeof surah_juz !== 'string' || surah_juz.trim() === '') {
      return NextResponse.json(
        { message: 'Surah/Juz wajib diisi.' },
        { status: 400 }
      );
    }
    if (halaman === undefined || halaman === null) {
      return NextResponse.json(
        { message: 'Halaman wajib diisi.' },
        { status: 400 }
      );
    }
    const halamanNum = Number(halaman);
    if (isNaN(halamanNum) || halamanNum < 1) {
      return NextResponse.json(
        { message: 'Halaman harus berupa angka positif.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // RBAC: Tim_Quran hanya bisa tambah hafalan untuk siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('id', student_id.trim())
        .single();

      if (santriError || !santri) {
        return NextResponse.json(
          { message: 'Siswa tidak ditemukan.' },
          { status: 404 }
        );
      }

      if (santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk siswa ini.' },
          { status: 403 }
        );
      }
    }

    const insertData: Record<string, unknown> = {
      student_id: student_id.trim(),
      teacher_id: session.user.id,
      tanggal,
      surah_juz: surah_juz.trim(),
      halaman: halamanNum,
    };

    if (catatan && typeof catatan === 'string' && catatan.trim() !== '') {
      insertData.catatan = catatan.trim();
    }

    const { data, error } = await supabase
      .from('hafalan')
      .insert([insertData])
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, catatan, created_at,
         santri ( id, nama ),
         users ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase insert hafalan error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan catatan hafalan.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Hafalan berhasil disimpan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/hafalan/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
