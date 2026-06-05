// src/app/api/tim/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { sendResetPasswordEmail } from '@/lib/email';

function generatePassword(length = 10): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < length; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
    if (!id?.trim()) {
      return NextResponse.json(
        { message: 'ID anggota wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', id.trim())
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }
    if (user.role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: "Hanya akun Tim Qur'an yang dapat direset password-nya" },
        { status: 400 }
      );
    }

    // Generate dan hash password baru
    const newPassword = generatePassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { message: 'Gagal mereset password.' },
        { status: 500 }
      );
    }

    // Kirim email password baru (non-blocking)
    const loginUrl = `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/login`;
    try {
      await sendResetPasswordEmail({
        to: user.email,
        name: user.name,
        newPassword,
        loginUrl,
      });
    } catch (emailErr) {
      console.error('[reset-password] Gagal kirim email:', emailErr);
    }

    return NextResponse.json(
      {
        message: `Password baru telah dikirim ke ${user.email}.`,
        data: { id: user.id, email: user.email, name: user.name },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/tim/reset-password:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
