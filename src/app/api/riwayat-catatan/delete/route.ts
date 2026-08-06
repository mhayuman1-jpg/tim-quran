export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

interface DeleteItem {
  id: string;
  type: 'hafalan' | 'tahsin';
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { items } = (await request.json()) as { items: DeleteItem[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: 'Parameter items diperlukan.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const filterByTeacher = shouldFilterByTeacher(session.user.role, request);
    const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);

    const hafalanIds = items.filter(i => i.type === 'hafalan').map(i => i.id);
    const tahsinIds = items.filter(i => i.type === 'tahsin').map(i => i.id);

    if (hafalanIds.length > 0) {
      let hQuery = supabase.from('hafalan').delete().in('id', hafalanIds);
      if (filterByTeacher) hQuery = hQuery.eq('teacher_id', teacherId);
      const { error } = await hQuery;
      if (error) {
        console.error('Riwayat catatan bulk delete hafalan error:', error);
        return NextResponse.json({ message: 'Gagal menghapus catatan hafalan.', error: error.message }, { status: 500 });
      }
    }

    if (tahsinIds.length > 0) {
      let tQuery = supabase.from('tahsin').delete().in('id', tahsinIds);
      if (filterByTeacher) tQuery = tQuery.eq('teacher_id', teacherId);
      const { error } = await tQuery;
      if (error) {
        console.error('Riwayat catatan bulk delete tahsin error:', error);
        return NextResponse.json({ message: 'Gagal menghapus catatan tahsin.', error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ message: `${items.length} catatan berhasil dihapus.` }, { status: 200 });
  } catch (error) {
    console.error('Riwayat catatan delete API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
