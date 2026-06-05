// src/app/api/tahsin/add/route.ts
// POST: Simpan catatan tahsin baru
// - teacher_id otomatis dari session
// - Validasi field wajib: student_id, tanggal, metode, buku, halaman
// - Tim_Quran hanya bisa tambah tahsin untuk siswa yang menjadi tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import type { TahsinMetode } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_METODE: TahsinMetode[] = ['Wafa', 'IWR', 'Al-Quran'];

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
    const { student_id, tanggal, metode, buku, halaman, catatan } = body;

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
    if (!metode || !VALID_METODE.includes(metode as TahsinMetode)) {
      return NextResponse.json(
        { message: `Metode wajib diisi. Pilihan: ${VALID_METODE.join(', ')}.` },
        { status: 400 }
      );
    }
    if (!buku || typeof buku !== 'string' || buku.trim() === '') {
      return NextResponse.json(
        { message: 'Buku wajib diisi.' },
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

    // RBAC: Tim_Quran hanya bisa tambah tahsin untuk siswa tanggung jawabnya
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
      metode: metode as TahsinMetode,
      buku: buku.trim(),
      halaman: halamanNum,
    };

    if (catatan && typeof catatan === 'string' && catatan.trim() !== '') {
      insertData.catatan = catatan.trim();
    }

    const { data, error } = await supabase
      .from('tahsin')
      .insert([insertData])
      .select(
        `id, student_id, teacher_id, tanggal, metode, buku, halaman, catatan, created_at,
         santri ( id, nama ),
         users ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase insert tahsin error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan catatan tahsin.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Tahsin berhasil disimpan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/tahsin/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
