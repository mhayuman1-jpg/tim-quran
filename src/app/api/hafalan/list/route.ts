// src/app/api/hafalan/list/route.ts
// GET: Ambil riwayat hafalan
// - Filter by student_id (opsional) dan date range (opsional)
// - Tim_Quran hanya bisa lihat hafalan siswa yang menjadi tanggung jawabnya
// - Kabid bisa lihat semua hafalan

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';
import { shuffleArray } from '@/lib/shuffle';
import { SURAH_PER_JUZ } from '@/lib/surahData';

// ── Template position lookup ────────────────────────────────────────────────
// Map nama surah normalized → posisi global di template (juz*1000 + idx)
// Iterasi dari Juz 30→1 agar template Juz 30 (lengkap) override Juz 25-27 (parsial)
const TEMPLATE_POSITION = new Map<string, number>();
for (let j = 30; j >= 1; j--) {
  const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
  for (let idx = 0; idx < surahsInJuz.length; idx++) {
    const key = surahsInJuz[idx].nama.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!TEMPLATE_POSITION.has(key)) {
      TEMPLATE_POSITION.set(key, j * 1000 + idx);
    }
  }
}

function getTemplatePosition(surahName: string): number {
  const key = surahName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return TEMPLATE_POSITION.get(key) ?? 999999;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

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
    // NOTE: Tidak pakai .order()/.range() di query, karena sort_order di DB
    // tidak konsisten (record lama vs baru punya nilai berbeda). Semua sorting
    // dan pagination dilakukan di JS setelah re-sort berdasarkan template.
    let query = supabase
      .from('hafalan')
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, buku, created_at, edited_fields, sort_order,
         santri ( id, nama, assigned_teacher_id ),
         users!hafalan_teacher_id_fkey ( id, name )`,
        { count: 'exact' }
      );

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

    // ── Re-sort berdasarkan urutan template ──────────────────────────────────
    // Agar urutan surah selalu sesuai template meskipun sort_order di DB salah/null
    // Sort GLOBAL berdasarkan posisi surah di template (bukan per tanggal)
    filteredData.sort((a, b) => {
      const posA = getTemplatePosition(a.surah_juz ?? '');
      const posB = getTemplatePosition(b.surah_juz ?? '');
      if (posA !== posB) return posA - posB;
      // Fallback: sort by sort_order, then created_at
      const soA = a.sort_order ?? 999999;
      const soB = b.sort_order ?? 999999;
      if (soA !== soB) return soA - soB;
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });

    // ── Pagination setelah re-sort ───────────────────────────────────────────
    const total = count ?? filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
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
