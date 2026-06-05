// src/app/api/tim/toggle-status/route.ts
// PUT: Toggle status Aktif/Nonaktif akun Tim_Quran

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
        { message: 'ID anggota wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Ambil status saat ini
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('id, status, role')
      .eq('id', id.trim())
      .single();

    if (fetchError || !currentUser) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    // Pastikan hanya bisa toggle Tim_Quran
    if (currentUser.role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: 'Hanya akun Tim Qur\'an yang dapat diubah statusnya' },
        { status: 400 }
      );
    }

    // Toggle status
    const newStatus = currentUser.status === 'Aktif' ? 'Nonaktif' : 'Aktif';

    const { data, error } = await supabase
      .from('users')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id.trim())
      .select('id, name, email, status')
      .single();

    if (error) {
      console.error('Supabase update user status error:', error);
      return NextResponse.json(
        { message: 'Gagal mengubah status anggota.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `Status berhasil diubah menjadi ${newStatus}.`,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/tim/toggle-status:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
