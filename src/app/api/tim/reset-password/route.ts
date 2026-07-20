// src/app/api/tim/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const DEFAULT_PASSWORD = '123456';

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

    // Hash password default 123456
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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

    return NextResponse.json(
      {
        message: `Password ${user.name} berhasil direset ke ${DEFAULT_PASSWORD}.`,
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
