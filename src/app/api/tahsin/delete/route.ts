// src/app/api/tahsin/delete/route.ts
// DELETE: Hapus satu catatan tahsin berdasarkan id

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'id wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    let query = supabase.from('tahsin').delete().eq('id', id);

    if (session.user.role === 'Tim_Quran') {
      query = query.eq('teacher_id', session.user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Tahsin delete error:', error);
      return NextResponse.json({ message: 'Gagal menghapus catatan tahsin.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Catatan tahsin berhasil dihapus.' }, { status: 200 });
  } catch (err) {
    console.error('[tahsin delete]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
