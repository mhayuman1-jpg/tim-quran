import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface AssignItem {
  student_id: string;
  teacher_id: string;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });

  try {
    const body = await request.json();
    const { class_id, assignments } = body as {
      class_id: string;
      assignments: AssignItem[];
    };

    if (!class_id) {
      return NextResponse.json({ message: 'class_id wajib diisi' }, { status: 400 });
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ message: 'assignments wajib berisi minimal 1 item' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify class exists
    const { data: kelas, error: kelasError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', class_id)
      .single();

    if (kelasError || !kelas) {
      return NextResponse.json({ message: 'Kelas tidak ditemukan' }, { status: 404 });
    }

    // Get valid teacher IDs for this class
    const { data: validTeachers } = await supabase
      .from('classes')
      .select('teacher1_id, teacher2_id, teacher3_id')
      .eq('id', class_id)
      .single();

    const validTeacherIds = [
      validTeachers?.teacher1_id,
      validTeachers?.teacher2_id,
      validTeachers?.teacher3_id,
    ].filter(Boolean) as string[];

    // Validate all teacher_ids are valid for this class
    const invalidAssignments = assignments.filter(a => !validTeacherIds.includes(a.teacher_id));
    if (invalidAssignments.length > 0) {
      return NextResponse.json({
        message: 'Beberapa guru tidak valid untuk kelas ini',
        invalid: invalidAssignments,
      }, { status: 400 });
    }

    // Get all student IDs and verify they belong to this class
    const studentIdSet = new Set<string>();
    assignments.forEach(a => studentIdSet.add(a.student_id));
    const studentIds = Array.from(studentIdSet);
    const { data: students, error: studentError } = await supabase
      .from('santri')
      .select('id, class_id')
      .in('id', studentIds);

    if (studentError) {
      console.error('[manual-assign-batch] student fetch error:', studentError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa' }, { status: 500 });
    }

    const invalidStudents = assignments.filter(a => {
      const s = students?.find(st => st.id === a.student_id);
      return !s || s.class_id !== class_id;
    });

    if (invalidStudents.length > 0) {
      return NextResponse.json({
        message: 'Beberapa siswa tidak valid atau tidak cocok dengan kelas',
        invalid: invalidStudents,
      }, { status: 400 });
    }

    // Group assignments by teacher for efficient batch update
    const teacherAssignments: Record<string, string[]> = {};
    for (const item of assignments) {
      if (!teacherAssignments[item.teacher_id]) {
        teacherAssignments[item.teacher_id] = [];
      }
      teacherAssignments[item.teacher_id].push(item.student_id);
    }

    // Batch update students per teacher
    const updates = Object.entries(teacherAssignments).map(([teacherId, studentIds]) =>
      supabase
        .from('santri')
        .update({ assigned_teacher_id: teacherId })
        .in('id', studentIds)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r && (r as any).error);

    if (errors.length > 0) {
      console.error('[manual-assign-batch] update errors:', errors);
      return NextResponse.json({ message: 'Gagal mengassign siswa ke guru' }, { status: 500 });
    }

    // Count assignments per teacher
    const counts: Record<string, number> = {};
    for (const item of assignments) {
      counts[item.teacher_id] = (counts[item.teacher_id] || 0) + 1;
    }

    // Get teacher names for response
    const { data: teacherNames } = await supabase
      .from('users')
      .select('id, name')
      .in('id', validTeacherIds);

    const teacherNameMap = new Map((teacherNames || []).map(t => [t.id, t.name]));

    return NextResponse.json({
      message: 'Siswa berhasil diassign ke guru.',
      counts: Object.entries(counts).map(([id, count]) => ({
        teacher_id: id,
        teacher_name: teacherNameMap.get(id) || 'Unknown',
        count,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('[manual-assign-batch] route error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}