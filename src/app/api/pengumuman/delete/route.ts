// src/app/api/pengumuman/delete/route.ts
// DELETE: Hapus pengumuman â€” hanya Kabid yang boleh menghapus

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

    // Hanya Kabid yang boleh menghapus pengumuman
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan. Hanya Kabid yang dapat menghapus pengumuman.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    // Validasi field wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID pengumuman wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek apakah pengumuman ada
    const { data: existing, error: checkError } = await supabase
      .from('pengumuman')
      .select('id, judul')
      .eq('id', id.trim())
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Pengumuman tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hapus pengumuman
    const { error: deleteError } = await supabase
      .from('pengumuman')
      .delete()
      .eq('id', id.trim());

    if (deleteError) {
      console.error('Supabase error deleting pengumuman:', deleteError);
      return NextResponse.json(
        { message: 'Gagal menghapus pengumuman.', error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Pengumuman berhasil dihapus.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/pengumuman/delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
