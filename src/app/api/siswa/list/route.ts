// src/app/api/siswa/list/route.ts
// GET: Ambil semua santri dengan join ke classes
// - Filter by assigned_teacher_id jika role Tim_Quran (data isolation)
// - Support query param `search` untuk filter nama (case-insensitive)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';
import { shuffleArray } from '@/lib/shuffle';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const classId = searchParams.get('class_id')?.trim() ?? '';
    const noSort = searchParams.get('no_sort') === '1';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Lazy auto-distribute: jika guru punya kelas tapi siswa belum di-assign, distribusikan otomatis
    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const classIds = await getTeacherClassIds(supabase, teacherId);
      const targetClassIds = classId ? [classId] : classIds;

      for (const cid of targetClassIds) {
        // Cek apakah ada siswa di kelas ini yang belum di-assign ke siapapun
        const { data: unassigned } = await supabase
          .from('santri')
          .select('id')
          .eq('class_id', cid)
          .eq('status', 'Aktif')
          .is('assigned_teacher_id', null);

        if (unassigned && unassigned.length > 0) {
          // Ambil guru yang mengampu kelas ini
          const { data: kelas } = await supabase
            .from('classes')
            .select('teacher1_id, teacher2_id, teacher3_id')
            .eq('id', cid)
            .single();

          const activeTeachers = kelas
            ? [kelas.teacher1_id, kelas.teacher2_id, kelas.teacher3_id].filter(Boolean)
            : [];

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

    // Mulai query dengan join ke tabel classes
    let query = supabase
      .from('santri')
      .select(
        `id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir,
         qr_code, photo_url, assigned_teacher_id, status, created_at, updated_at,
         classes ( id, name )`,
        { count: 'exact' }
      );

    if (!noSort) {
      query = query.order('nama', { ascending: true });
    } else {
      query = query.order('id', { ascending: true });
    }
    query = query.range(offset, offset + limit - 1);

    // Data isolation: Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya
    // Juga berlaku untuk Kabid/Sekretaris dalam Mode Mengajar
    // Filter via assigned_teacher_id ATAU via kelas yang diampu (teacher1/2/3_id)
    // Jika class_id diberikan, hanya tampilkan siswa yang diassign ke guru ini (strict)
    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const classIds = await getTeacherClassIds(supabase, teacherId);
      query = applyTeacherSantriFilter(query, teacherId, classIds, classId);
    }

    // Filter berdasarkan class_id jika ada
    if (classId) {
      query = query.eq('class_id', classId);
    }

    // Filter berdasarkan nama jika ada query `search`
    if (search) {
      query = query.ilike('nama', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch santri error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count ?? data?.length ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Route error /api/siswa/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
