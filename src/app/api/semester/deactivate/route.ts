// src/app/api/semester/deactivate/route.ts
// POST: Nonaktifkan semua semester (tidak ada semester aktif)
//       Ketika tidak ada semester aktif, sistem penilaian tidak bisa jalan.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('semester_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    if (error) {
      console.error('Supabase deactivate semester error:', error);
      return NextResponse.json({ message: 'Gagal menonaktifkan semester.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Semester berhasil dinonaktifkan. Semua sistem penilaian (absensi, input jurnal, dll) tidak dapat digunakan sampai semester baru diaktifkan.',
    }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/semester/deactivate:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
