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
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id')?.trim();

    if (!classId) {
      return NextResponse.json({ message: 'Parameter class_id diperlukan.' }, { status: 400 });
    }

    let query = supabase
      .from('santri')
      .select('id, nama, nisn, juz_terakhir')
      .eq('class_id', classId)
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (filterByTeacher) {
      query = query.eq('assigned_teacher_id', teacherId);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Riwayat catatan students fetch error:', error);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    return NextResponse.json({ data: students ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Riwayat catatan students API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
