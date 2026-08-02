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
    const studentId = searchParams.get('student_id')?.trim();

    if (!studentId) {
      return NextResponse.json({ message: 'Parameter student_id diperlukan.' }, { status: 400 });
    }

    if (filterByTeacher) {
      const { data: student } = await supabase
        .from('santri')
        .select('id')
        .eq('id', studentId)
        .eq('assigned_teacher_id', teacherId)
        .single();

      if (!student) {
        return NextResponse.json({ message: 'Siswa tidak ditemukan.' }, { status: 404 });
      }
    }

    const { data: hafalan } = await supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, buku, catatan, created_at')
      .eq('student_id', studentId)
      .not('catatan', 'is', null)
      .neq('catatan', '')
      .order('tanggal', { ascending: false });

    const { data: tahsin } = await supabase
      .from('tahsin')
      .select('id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan, created_at')
      .eq('student_id', studentId)
      .not('catatan', 'is', null)
      .neq('catatan', '')
      .order('tanggal', { ascending: false });

    const combined = [
      ...(hafalan ?? []).map(h => ({ ...h, type: 'hafalan' as const })),
      ...(tahsin ?? []).map(t => ({ ...t, type: 'tahsin' as const })),
    ].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    return NextResponse.json({ data: combined }, { status: 200 });
  } catch (error) {
    console.error('Riwayat catatan notes API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
