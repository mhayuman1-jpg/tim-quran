// src/app/api/tim/delete/route.ts
// DELETE: Hapus anggota Tim_Quran

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID anggota wajib diisi' },
        { status: 400 }
      );
    }

    if (session.user.id === id.trim()) {
      return NextResponse.json(
        { message: 'Tidak dapat menghapus akun sendiri' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id.trim())
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    if (targetUser.role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: 'Hanya akun Tim Qur\'an yang dapat dihapus' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id.trim());

    if (error) {
      console.error('Supabase delete user error:', error);
      return NextResponse.json(
        { message: 'Gagal menghapus anggota.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Anggota berhasil dihapus.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/tim/delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
