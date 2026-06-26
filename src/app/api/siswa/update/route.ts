// src/app/api/siswa/update/route.ts
// PUT: Update data santri berdasarkan id
// - Validasi field yang diterima
// - Return data santri terbaru setelah update

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
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
    const { id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir, status, assigned_teacher_id, photo_url } = body;

    // Validasi id
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ message: 'ID siswa wajib disediakan' }, { status: 400 });
    }

    // Validasi field yang diberikan jika ada
    if (nisn !== undefined && (typeof nisn !== 'string' || nisn.trim() === '')) {
      return NextResponse.json({ message: 'NIS/NISN tidak boleh kosong' }, { status: 400 });
    }
    if (nama !== undefined && (typeof nama !== 'string' || nama.trim() === '')) {
      return NextResponse.json({ message: 'Nama tidak boleh kosong' }, { status: 400 });
    }
    if (gender !== undefined && gender !== 'Laki-laki' && gender !== 'Perempuan') {
      return NextResponse.json(
        { message: 'Jenis kelamin harus Laki-laki atau Perempuan' },
        { status: 400 }
      );
    }
    if (juz_terakhir !== undefined) {
      const juzNum = Number(juz_terakhir);
      if (isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
        return NextResponse.json(
          { message: 'Juz terakhir harus berupa angka antara 1 dan 30' },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Untuk Tim_Quran: pastikan hanya bisa edit siswa yang menjadi tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const { data: existing, error: fetchError } = await supabase
        .from('santri')
        .select('assigned_teacher_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ message: 'Data siswa tidak ditemukan' }, { status: 404 });
      }
      if (existing.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
      }
    }

    // Bangun objek update hanya dari field yang diberikan
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (nisn !== undefined) updateData.nisn = nisn.trim();
    if (nama !== undefined) updateData.nama = nama.trim();
    if (gender !== undefined) updateData.gender = gender;
    if (tanggal_lahir !== undefined) updateData.tanggal_lahir = tanggal_lahir;
    if (class_id !== undefined) updateData.class_id = class_id;
    if (juz_terakhir !== undefined) updateData.juz_terakhir = Number(juz_terakhir);
    if (status !== undefined) updateData.status = status;
    if (photo_url !== undefined) updateData.photo_url = photo_url;
    // Hanya Kabid yang bisa mengubah assigned_teacher_id
    if (assigned_teacher_id !== undefined && session.user.role === 'Kabid') {
      updateData.assigned_teacher_id = assigned_teacher_id || null;
    }

    const { data, error } = await supabase
      .from('santri')
      .update(updateData)
      .eq('id', id)
      .select(`id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir, qr_code, status, assigned_teacher_id, photo_url, updated_at, classes ( id, name )`)
      .single();

    if (error) {
      // Unique violation untuk NIS/NISN
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'NIS/NISN sudah terdaftar' },
          { status: 409 }
        );
      }
      console.error('Supabase update santri error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui data siswa.', error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ message: 'Data siswa tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Data siswa berhasil diperbarui.', data });
  } catch (error) {
    console.error('Route error /api/siswa/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
