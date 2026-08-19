// src/app/api/admin/pengajar-pdf/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
    }

    const supabase = createServerClient();

    // 1. Ambil semua pengajar aktif (Tim_Quran, Sekretaris, Bendahara)
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .in('role', ['Tim_Quran', 'Sekretaris', 'Bendahara'])
      .eq('status', 'Aktif')
      .order('name', { ascending: true });

    if (teachersError) {
      console.error('Error fetching teachers for stats:', teachersError);
      return NextResponse.json({ message: 'Gagal mengambil data pengajar.' }, { status: 500 });
    }

    const teacherList = teachers ?? [];
    if (teacherList.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const teacherIds = teacherList.map((t: any) => t.id);

    // 2. Ambil santri aktif yang memiliki assigned_teacher_id, beserta nama kelasnya
    const { data: students, error: studentsError } = await supabase
      .from('santri')
      .select('id, assigned_teacher_id, class_id, classes(name)')
      .eq('status', 'Aktif')
      .in('assigned_teacher_id', teacherIds);

    if (studentsError) {
      console.error('Error fetching students for stats:', studentsError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    // 3. Ambil semua kelas untuk memetakan teacher -> classNames
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, teacher1_id, teacher2_id, teacher3_id')
      .order('name', { ascending: true });

    if (classesError) {
      console.error('Error fetching classes for stats:', classesError);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
    }

    // 4. Bangun classMap: teacherId -> array nama kelas
    const classMap: Record<string, string[]> = {};
    for (const c of classes ?? []) {
      for (const tid of [c.teacher1_id, c.teacher2_id, c.teacher3_id]) {
        if (tid) {
          if (!classMap[tid]) classMap[tid] = [];
          classMap[tid].push(c.name);
        }
      }
    }

    // 5. Hitung jumlah siswa per pengajar
    const studentCountByTeacher: Record<string, number> = {};
    for (const s of students ?? []) {
      const tid = s.assigned_teacher_id;
      if (tid) {
        studentCountByTeacher[tid] = (studentCountByTeacher[tid] || 0) + 1;
      }
    }

    // 6. Susun response sesuai interface TeacherStat di frontend
    const data = teacherList.map((t: any) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      role: t.role,
      studentCount: studentCountByTeacher[t.id] || 0,
      classNames: classMap[t.id] ?? [],
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Admin pengajar-pdf stats error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
