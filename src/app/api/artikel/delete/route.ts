// src/app/api/artikel/delete/route.ts
// DELETE (Kabid only): Hapus artikel

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

    // Hanya Kabid yang boleh menghapus artikel
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan. Hanya Kabid yang dapat menghapus artikel.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    // Validasi field wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID artikel wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek apakah artikel ada
    const { data: existing, error: checkError } = await supabase
      .from('artikel')
      .select('id, judul')
      .eq('id', id.trim())
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Artikel tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hapus artikel
    const { error: deleteError } = await supabase
      .from('artikel')
      .delete()
      .eq('id', id.trim());

    if (deleteError) {
      console.error('Supabase error deleting artikel:', deleteError);
      return NextResponse.json(
        { message: 'Gagal menghapus artikel.', error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Artikel berhasil dihapus.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/artikel/delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
