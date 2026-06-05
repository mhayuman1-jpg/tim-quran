// src/app/api/raport/list/route.ts
// GET: Ambil daftar raport
// - Filter by student_id dan/atau periode (opsional)
// - Tim_Quran hanya bisa lihat raport siswa yang menjadi tanggung jawabnya
// - Kabid bisa lihat semua raport

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const periode = searchParams.get('periode')?.trim();

    const supabase = createServerClient();

    // Query raport dengan join ke santri dan users (teacher)
    let query = supabase
      .from('raport_quran')
      .select(
        `id, student_id, teacher_id, periode,
         makhroj, tajwid, lancar, buku_surah, halaman, catatan,
         created_at, updated_at,
         santri ( id, nama, nisn, assigned_teacher_id, classes ( id, name ) ),
         users ( id, name )`
      )
      .order('created_at', { ascending: false });

    // Filter by student_id jika diberikan
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    // Filter by periode jika diberikan
    if (periode) {
      query = query.eq('periode', periode);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch raport error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data raport.', error: error.message },
        { status: 500 }
      );
    }

    // Data isolation: Tim_Quran hanya bisa lihat raport siswa yang menjadi tanggung jawabnya
    let filteredData = data ?? [];
    if (session.user.role === 'Tim_Quran') {
      filteredData = filteredData.filter((item: any) => {
        return item.santri?.assigned_teacher_id === session.user.id;
      });
    }

    return NextResponse.json({ data: filteredData }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/raport/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
