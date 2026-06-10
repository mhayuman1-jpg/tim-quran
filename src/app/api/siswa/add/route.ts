// src/app/api/siswa/add/route.ts
// POST: Tambah santri baru
// - Validasi semua field wajib
// - Generate UUID untuk qr_code via crypto.randomUUID()
// - Return 409 jika NISN duplikat

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir, status, photo_url, assigned_teacher_id } = body;

    // Validasi field wajib
    if (!nisn || typeof nisn !== 'string' || nisn.trim() === '') {
      return NextResponse.json({ message: 'NISN wajib diisi' }, { status: 400 });
    }
    if (!nama || typeof nama !== 'string' || nama.trim() === '') {
      return NextResponse.json({ message: 'Nama wajib diisi' }, { status: 400 });
    }
    if (!gender || (gender !== 'Laki-laki' && gender !== 'Perempuan')) {
      return NextResponse.json(
        { message: 'Jenis kelamin wajib diisi (Laki-laki atau Perempuan)' },
        { status: 400 }
      );
    }
    if (juz_terakhir === undefined || juz_terakhir === null) {
      return NextResponse.json({ message: 'Juz terakhir wajib diisi' }, { status: 400 });
    }
    const juzNum = Number(juz_terakhir);
    if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
      return NextResponse.json(
        { message: 'Juz terakhir harus berupa angka antara 1 dan 30' },
        { status: 400 }
      );
    }

    // Generate QR code unik sebagai UUID
    const qr_code = crypto.randomUUID();

    const supabase = createServerClient();

    const insertData: Record<string, unknown> = {
      nisn: nisn.trim(),
      nama: nama.trim(),
      gender,
      juz_terakhir: juzNum,
      qr_code,
      status: status ?? 'Aktif',
    };

    // Field opsional
    if (tanggal_lahir) insertData.tanggal_lahir = tanggal_lahir;
    if (class_id) insertData.class_id = class_id;
    if (photo_url) insertData.photo_url = photo_url;

    // Penugasan guru
    if (session.user.role === 'Kabid' && assigned_teacher_id) {
      insertData.assigned_teacher_id = assigned_teacher_id;
    } else if (session.user.role === 'Tim_Quran') {
      insertData.assigned_teacher_id = session.user.id;
    }

    const { data, error } = await supabase
      .from('santri')
      .insert([insertData])
      .select(`id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir, qr_code, status, assigned_teacher_id, photo_url, created_at`)
      .single();

    if (error) {
      // Kode 23505 = unique_violation (NISN duplikat)
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'NISN sudah terdaftar' },
          { status: 409 }
        );
      }
      console.error('Supabase insert santri error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Siswa berhasil ditambahkan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/siswa/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
