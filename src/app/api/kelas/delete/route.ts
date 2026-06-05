// src/app/api/kelas/delete/route.ts
// DELETE: Hapus kelas
// - Return jumlah siswa terdampak sebelum hapus
// - Siswa dengan class_id ke kelas ini akan di-SET NULL (ON DELETE SET NULL)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Hanya Kabid yang boleh akses
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    // Validasi field wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID kelas wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek apakah kelas ada
    const { data: existing, error: checkError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Kelas tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hitung jumlah siswa terdampak (semua status)
    const { count: jumlahSiswa, error: countError } = await supabase
      .from('santri')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', id);

    if (countError) {
      console.error('Error counting students:', countError);
      return NextResponse.json(
        { message: 'Gagal menghitung siswa terdampak.', error: countError.message },
        { status: 500 }
      );
    }

    // Hapus kelas (siswa akan di-SET NULL otomatis via FK ON DELETE SET NULL)
    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Supabase delete class error:', deleteError);
      return NextResponse.json(
        { message: 'Gagal menghapus kelas.', error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Kelas berhasil dihapus.',
        jumlah_siswa_terdampak: jumlahSiswa ?? 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/kelas/delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
