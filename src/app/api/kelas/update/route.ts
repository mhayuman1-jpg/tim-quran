export const dynamic = 'force-dynamic';
// src/app/api/kelas/update/route.ts
// PUT: Update nama kelas
// - Cascade update otomatis via FK (handled by database)
// - Return 409 jika nama duplikat

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

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

    // Hanya Kabid yang boleh akses
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name } = body;

    // Validasi field wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID kelas wajib diisi' },
        { status: 400 }
      );
    }
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { message: 'Nama kelas wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek apakah kelas ada
    const { data: existing, error: checkError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Kelas tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update kelas
    const { data, error } = await supabase
      .from('classes')
      .update({ name: name.trim() })
      .eq('id', id)
      .select('id, name, created_at')
      .single();

    if (error) {
      // Kode 23505 = unique_violation (nama duplikat)
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Nama kelas sudah digunakan' },
          { status: 409 }
        );
      }
      console.error('Supabase update class error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui data kelas.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Kelas berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/kelas/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
