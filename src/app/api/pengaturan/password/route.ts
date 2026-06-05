// src/app/api/pengaturan/password/route.ts
// PUT: Verifikasi kata sandi lama dengan bcrypt, update ke hash baru
// Return 400 jika kata sandi lama salah atau konfirmasi tidak cocok

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

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
    const { old_password, new_password, confirm_password } = body;

    // Validasi field wajib
    if (!old_password || typeof old_password !== 'string' || old_password.trim() === '') {
      return NextResponse.json(
        { message: 'Kata sandi lama wajib diisi' },
        { status: 400 }
      );
    }

    if (!new_password || typeof new_password !== 'string' || new_password.trim() === '') {
      return NextResponse.json(
        { message: 'Kata sandi baru wajib diisi' },
        { status: 400 }
      );
    }

    if (!confirm_password || typeof confirm_password !== 'string' || confirm_password.trim() === '') {
      return NextResponse.json(
        { message: 'Konfirmasi kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi panjang password minimal 6 karakter
    if (new_password.length < 6) {
      return NextResponse.json(
        { message: 'Kata sandi baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Validasi konfirmasi password cocok
    if (new_password !== confirm_password) {
      return NextResponse.json(
        { message: 'Konfirmasi kata sandi tidak sesuai' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Ambil password hash saat ini dari database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', session.user.id)
      .single();

    if (fetchError || !user) {
      console.error('Supabase error fetching user:', fetchError);
      return NextResponse.json(
        { message: 'Gagal mengambil data pengguna.' },
        { status: 500 }
      );
    }

    // Verifikasi kata sandi lama dengan bcrypt
    const passwordMatch = await bcrypt.compare(old_password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: 'Kata sandi lama tidak sesuai' },
        { status: 400 }
      );
    }

    // Hash password baru
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password di database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Supabase error updating password:', updateError);
      return NextResponse.json(
        { message: 'Gagal memperbarui kata sandi.', error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Kata sandi berhasil diperbarui.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/pengaturan/password:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
