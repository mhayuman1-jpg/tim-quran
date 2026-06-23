// src/app/api/hafalan/list/route.ts
// GET: Ambil riwayat hafalan
// - Filter by student_id (opsional) dan date range (opsional)
// - Tim_Quran hanya bisa lihat hafalan siswa yang menjadi tanggung jawabnya
// - Kabid bisa lihat semua hafalan

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';
import { shuffleArray } from '@/lib/shuffle';

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
    const classId = searchParams.get('class_id')?.trim();
    const dateFrom = searchParams.get('date_from')?.trim();
    const dateTo = searchParams.get('date_to')?.trim();

    const supabase = createServerClient();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Filter teacher di DB level (bukan JS post-filter)
    let teacherFilterId: string | null = null;
    if (shouldFilterByTeacher(session.user.role, request)) {
      teacherFilterId = getTeacherFilterId(session.user.role, request, session.user.id);

      // Lazy auto-distribute: jika ada siswa unassigned di kelas yang punya guru, distribusikan otomatis
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id, teacher1_id, teacher2_id, teacher3_id')
        .or(`teacher1_id.eq.${teacherFilterId},teacher2_id.eq.${teacherFilterId},teacher3_id.eq.${teacherFilterId}`);

      for (const kelas of teacherClasses ?? []) {
        const { data: unassigned } = await supabase
          .from('santri')
          .select('id')
          .eq('class_id', kelas.id)
          .eq('status', 'Aktif')
          .is('assigned_teacher_id', null);

        if (unassigned && unassigned.length > 0) {
          const activeTeachers = [kelas.teacher1_id, kelas.teacher2_id, kelas.teacher3_id].filter(Boolean);
          if (activeTeachers.length > 0) {
            const ids = shuffleArray(unassigned.map((s: any) => s.id));
            const numT = activeTeachers.length;
            await Promise.all(
              activeTeachers.map((tid: string, ti: number) => {
                const chunk = ids.filter((_: string, i: number) => i % numT === ti);
                return chunk.length > 0
                  ? supabase.from('santri').update({ assigned_teacher_id: tid }).in('id', chunk)
                  : Promise.resolve({ data: null, error: null });
              })
            );
          }
        }
      }
    }

    // Query hafalan dengan join ke santri dan users (teacher)
    // Urutkan berdasarkan sort_order agar urutan surah tetap sesuai template
    let query = supabase
      .from('hafalan')
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, buku, created_at, edited_fields, sort_order,
         santri ( id, nama, assigned_teacher_id ),
         users ( id, name )`,
        { count: 'exact' }
      )
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    // Filter by student_id jika diberikan
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    // Filter by class_id: get student IDs in the class, then filter
    if (classId) {
      const { data: classStudents } = await supabase
        .from('santri')
        .select('id')
        .eq('class_id', classId)
        .eq('is_active', true);
      const studentIds = (classStudents ?? []).map(s => s.id);
      if (studentIds.length === 0) {
        return NextResponse.json({ data: [], pagination: { total: 0, limit, offset, hasMore: false } }, { status: 200 });
      }
      query = query.in('student_id', studentIds);
    }

    // Filter date range
    if (dateFrom) {
      query = query.gte('tanggal', dateFrom);
    }
    if (dateTo) {
      query = query.lte('tanggal', dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch hafalan error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data hafalan.', error: error.message },
        { status: 500 }
      );
    }

    // Data isolation: Tim_Quran hanya bisa lihat hafalan siswa yang menjadi tanggung jawabnya
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
    console.error('Route error /api/hafalan/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
