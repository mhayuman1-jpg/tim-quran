// src/app/api/semester/reset/route.ts
// POST: Reset semester — nonaktifkan semua semester, buat semester baru,
//       dan opsional reset data santri (juz_terakhir ke 1)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const body = await request.json();
    const { semester_name, end_date, notes, reset_juz } = body;

    // Validasi input
    if (!semester_name || typeof semester_name !== 'string' || semester_name.trim() === '') {
      return NextResponse.json({ message: 'Nama semester wajib diisi.' }, { status: 400 });
    }
    if (!end_date || typeof end_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return NextResponse.json({ message: 'Tanggal akhir semester harus diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Nonaktifkan semua semester aktif
    const { error: deactivateError } = await supabase
      .from('semester_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Supabase deactivate semester error:', deactivateError);
      return NextResponse.json({ message: 'Gagal menonaktifkan semester sebelumnya.', error: deactivateError.message }, { status: 500 });
    }

    // 2. Buat semester baru
    const { data: newSemester, error: insertError } = await supabase
      .from('semester_settings')
      .insert([{
        semester_name: semester_name.trim(),
        end_date,
        notes: typeof notes === 'string' ? notes.trim() : null,
        is_active: true,
      }])
      .select('id, semester_name, end_date, notes, is_active, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('Supabase insert new semester error:', insertError);
      return NextResponse.json({ message: 'Gagal membuat semester baru.', error: insertError.message }, { status: 500 });
    }

    // 3. Opsional: Reset juz_terakhir semua santri aktif ke 1
    let resetCount = 0;
    if (reset_juz === true) {
      const { data: resetData, error: resetError } = await supabase
        .from('santri')
        .update({ juz_terakhir: 1, updated_at: new Date().toISOString() })
        .eq('status', 'Aktif')
        .select('id');

      if (resetError) {
        console.error('Supabase reset juz error:', resetError);
        // Tidak mengembalikan error fatal — semester sudah terbuat
      } else {
        resetCount = resetData?.length ?? 0;
      }
    }

    return NextResponse.json({
      message: `Semester baru berhasil dibuat${reset_juz ? ` dan ${resetCount} santri direset juz terakhirnya.` : '.'}`,
      data: newSemester,
      reset_count: resetCount,
    }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/semester/reset:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
