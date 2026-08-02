export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const filterByTeacher = shouldFilterByTeacher(session.user.role, request);
    const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);

    let query = supabase
      .from('classes')
      .select('id, name')
      .order('name', { ascending: true });

    if (filterByTeacher) {
      query = query.or(`teacher1_id.eq.${teacherId},teacher2_id.eq.${teacherId},teacher3_id.eq.${teacherId}`);
    }

    const { data: classes, error } = await query;

    if (error) {
      console.error('Riwayat catatan classes fetch error:', error);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
    }

    const classIds = (classes ?? []).map(c => c.id);
    const classStudentCounts: Record<string, number> = {};

    if (classIds.length > 0) {
      let countQuery = supabase
        .from('santri')
        .select('class_id')
        .eq('status', 'Aktif')
        .in('class_id', classIds);

      if (filterByTeacher) {
        countQuery = countQuery.eq('assigned_teacher_id', teacherId);
      }

      const { data: counts } = await countQuery;
      for (const s of counts ?? []) {
        if (s.class_id) {
          classStudentCounts[s.class_id] = (classStudentCounts[s.class_id] ?? 0) + 1;
        }
      }
    }

    const result = (classes ?? []).map(k => ({
      id: k.id,
      name: k.name,
      jumlah_siswa: classStudentCounts[k.id] ?? 0,
    }));

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Riwayat catatan classes API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
