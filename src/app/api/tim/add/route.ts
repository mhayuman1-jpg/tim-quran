// src/app/api/tim/add/route.ts
// POST: Buat akun Tim_Quran baru
// - Hash password dengan bcrypt
// - Kirim welcome email via Resend
// - Return 409 jika email duplikat

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/email';

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

    // Hanya Kabid yang boleh akses
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password } = body;

    // Validasi field wajib
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { message: 'Nama wajib diisi' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { message: 'Email wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { message: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.trim() === '') {
      return NextResponse.json(
        { message: 'Kata sandi wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi panjang password minimal 6 karakter
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Kata sandi minimal 6 karakter' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Hash password dengan bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user baru dengan role Tim_Quran
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password_hash: passwordHash,
          role: 'Tim_Quran',
          status: 'Aktif',
        },
      ])
      .select('id, name, email, role, status, created_at')
      .single();

    if (error) {
      // Kode 23505 = unique_violation (email duplikat)
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Email sudah terdaftar' },
          { status: 409 }
        );
      }
      console.error('Supabase insert user error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan data anggota Tim Qur\'an.', error: error.message },
        { status: 500 }
      );
    }

    // Kirim welcome email (non-blocking — error tidak gagalkan request)
    const loginUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/login`;
    try {
      await sendWelcomeEmail({
        to: email.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        loginUrl,
      });
    } catch (emailErr) {
      console.error('[tim/add] Gagal kirim email:', emailErr);
    }

    return NextResponse.json(
      { message: 'Anggota Tim Qur\'an berhasil ditambahkan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/tim/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
