// src/app/api/tahfidz/list/route.ts
// GET: Ambil riwayat tahfidz harian
// - Filter by student_id (opsional) dan rentang tanggal (opsional)
// - Tim_Quran hanya boleh melihat siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const dateFrom = searchParams.get('date_from')?.trim();
    const dateTo = searchParams.get('date_to')?.trim();

    const supabase = createServerClient();
    let query = supabase
      .from('tahfidz')
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, created_at,
         santri ( id, nama, assigned_teacher_id ),
         users ( id, name )`
      )
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (dateFrom) query = query.gte('tanggal', dateFrom);
    if (dateTo) query = query.lte('tanggal', dateTo);

    const { data, error } = await query;
    if (error) {
      console.error('Supabase fetch tahfidz error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data tahfidz.', error: error.message },
        { status: 500 }
      );
    }

    let filteredData = data ?? [];
    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      filteredData = filteredData.filter((item: any) => {
        return item.santri?.assigned_teacher_id === teacherId;
      });
    }

    return NextResponse.json({ data: filteredData }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/tahfidz/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
