// src/app/api/raport/list/route.ts
// GET: Ambil daftar raport
// - Filter by student_id dan/atau periode (opsional)
// - Tim_Quran hanya bisa lihat raport siswa yang menjadi tanggung jawabnya
// - Kabid bisa lihat semua raport

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

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
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Filter teacher di DB level (bukan JS post-filter)
    let teacherFilterId: string | null = null;
    if (shouldFilterByTeacher(session.user.role, request)) {
      teacherFilterId = getTeacherFilterId(session.user.role, request, session.user.id);
    }

    // Query raport dengan join ke santri dan users (teacher)
    let query = supabase
      .from('raport_quran')
      .select(
        `id, student_id, teacher_id, periode,
         makhroj, tajwid, lancar, buku_surah, halaman, catatan,
         created_at, updated_at,
         santri ( id, nama, nisn, assigned_teacher_id, classes ( id, name ) ),
         users ( id, name )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by student_id jika diberikan
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    // Filter by periode jika diberikan
    if (periode) {
      query = query.eq('periode', periode);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch raport error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data raport.', error: error.message },
        { status: 500 }
      );
    }

    // Data isolation: Tim_Quran hanya bisa lihat raport siswa yang menjadi tanggung jawabnya
    let filteredData = data ?? [];
    if (teacherFilterId) {
      filteredData = filteredData.filter((item: any) => {
        return item.santri?.assigned_teacher_id === teacherFilterId;
      });
    }

    return NextResponse.json({
      data: filteredData,
      pagination: {
        total: count ?? filteredData.length,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/raport/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
