// src/app/api/pengaturan/photo/route.ts
// PUT: update photo_url untuk user yang sedang login
// Body: { photo_url: string }
// Auth: semua user yang sudah login (Kabid atau Tim_Quran)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
  }

  const { photo_url } = await request.json();

  const supabase = createServerClient();
  const { error } = await supabase
    .from('users')
    .update({ photo_url, updated_at: new Date().toISOString() })
    .eq('id', session.user.id);

  if (error) {
    console.error('Update photo error (pengaturan):', error);
    return NextResponse.json({ message: 'Gagal memperbarui foto.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Foto profil berhasil diperbarui.' }, { status: 200 });
}
