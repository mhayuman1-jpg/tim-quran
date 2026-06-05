// src/app/api/pengaturan/profile/route.ts
// PUT: Update nama lengkap user, return data terbaru

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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

    const body = await request.json();
    const { name } = body;

    // Validasi field wajib
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { message: 'Nama wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Update nama user
    const { data, error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)
      .select('id, name, email, role, status')
      .single();

    if (error) {
      console.error('Supabase error updating profile:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui profil.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Profil berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/pengaturan/profile:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
