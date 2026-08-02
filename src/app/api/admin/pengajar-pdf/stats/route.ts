import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
    }

    const supabase = createServerClient();

    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('role', ['Tim_Quran', 'Sekretaris', 'Bendahara'])
      .eq('status', 'Aktif')
      .order('name', { ascending: true });

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      return NextResponse.json({ message: 'Gagal mengambil data pengajar.' }, { status: 500 });
    }

    const teacherIds = (teachers ?? []).map((t: any) => t.id);

    const [studentsResult, classesResult] = await Promise.all([
      supabase
        .from('santri')
        .select('assigned_teacher_id')
        .eq('status', 'Aktif')
        .in('assigned_teacher_id', teacherIds.length > 0 ? teacherIds : ['00000000-0000-0000-0000-000000000000']),
      supabase
        .from('classes')
        .select('id, name, teacher1_id, teacher2_id, teacher3_id')
        .order('name', { ascending: true }),
    ]);

    const { data: students, error: studentsError } = studentsResult;
    const { data: classes, error: classesError } = classesResult;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    for (const s of students ?? []) {
      const tid = s.assigned_teacher_id;
      if (tid) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    }

    const classMap: Record<string, string[]> = {};
    for (const c of classes ?? []) {
      for (const tid of [c.teacher1_id, c.teacher2_id, c.teacher3_id]) {
        if (tid) {
          if (!classMap[tid]) classMap[tid] = [];
          classMap[tid].push(c.name);
        }
      }
    }

    const stats = (teachers ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      email: t.email || '',
      role: t.role,
      studentCount: counts[t.id] || 0,
      classNames: classMap[t.id] ?? [],
    }));

    return NextResponse.json({ data: stats }, { status: 200 });
  } catch (error) {
    console.error('Error fetching pengajar stats:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
