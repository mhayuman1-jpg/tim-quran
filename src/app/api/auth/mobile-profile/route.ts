// src/app/api/auth/mobile-profile/route.ts
// GET: Ambil profil user dari Bearer token (untuk Flutter mobile)
// Menggunakan getAuthenticatedSession (cookie OR Bearer token)

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, status, photo_url')
      .eq('id', session.user.id)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, message: 'Profil tidak ditemukan.', errorCode: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (user.status === 'Nonaktif') {
      return NextResponse.json(
        { success: false, message: 'Akun Anda tidak aktif.', errorCode: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profil berhasil diambil',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoUrl: user.photo_url || null,
        status: user.status,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('[mobile-profile] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server.', errorCode: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
