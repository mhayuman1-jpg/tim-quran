// src/app/api/tim/update-photo/route.ts
// PUT: Update photo_url anggota Tim_Quran
// Body: { id: string, photo_url: string }
// Auth: Kabid only

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  // Validasi session: hanya Kabid yang boleh akses
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'Kabid') {
    return NextResponse.json({ message: 'Akses ditolak' }, { status: 403 });
  }

  const { id, photo_url } = await request.json();

  // Validasi id wajib ada
  if (!id) {
    return NextResponse.json({ message: 'ID wajib diisi' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Update photo_url hanya untuk user dengan role Tim_Quran
  const { error } = await supabase
    .from('users')
    .update({ photo_url, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Supabase error updating photo:', error);
    return NextResponse.json({ message: 'Gagal memperbarui foto.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Foto profil berhasil diperbarui.' }, { status: 200 });
}
