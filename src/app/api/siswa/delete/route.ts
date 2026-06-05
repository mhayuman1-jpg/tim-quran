// src/app/api/siswa/delete/route.ts
// DELETE: Hapus santri berdasarkan id

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Ambil id dari body request
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID siswa wajib disediakan' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Untuk Tim_Quran: pastikan hanya bisa hapus siswa yang menjadi tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const { data: existing, error: fetchError } = await supabase
        .from('santri')
        .select('assigned_teacher_id')
        .eq('id', id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ message: 'Data siswa tidak ditemukan' }, { status: 404 });
      }
      if (existing.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('santri')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete santri error:', error);
      return NextResponse.json(
        { message: 'Gagal menghapus data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Data siswa berhasil dihapus.' });
  } catch (error) {
    console.error('Route error /api/siswa/delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
