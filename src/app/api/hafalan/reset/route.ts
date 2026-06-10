// src/app/api/hafalan/reset/route.ts
// POST : Reset jurnal hafalan untuk siswa tertentu (hapus semua atau berdasarkan tanggal)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const { student_id, date_from, date_to } = body;

    if (!student_id) {
      return NextResponse.json({ message: 'student_id wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from('hafalan')
      .delete()
      .eq('student_id', student_id);

    // Filter by date range if provided
    if (date_from) {
      query = query.gte('tanggal', date_from);
    }
    if (date_to) {
      query = query.lte('tanggal', date_to);
    }

    // Tim_Quran only can reset their own records
    if (session.user.role === 'Tim_Quran') {
      query = query.eq('teacher_id', session.user.id);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Hafalan reset error:', error);
      return NextResponse.json({ message: 'Gagal mereset jurnal.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Berhasil mereset ${count ?? 0} catatan hafalan.`,
      deleted_count: count ?? 0,
    }, { status: 200 });
  } catch (err) {
    console.error('[hafalan reset]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
