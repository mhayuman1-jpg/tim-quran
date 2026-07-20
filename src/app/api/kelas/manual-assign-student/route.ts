import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });

  try {
    const { class_id, student_id, teacher_id } = await request.json();
    if (!class_id || !student_id || !teacher_id) {
      return NextResponse.json({ message: 'class_id, student_id, dan teacher_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: student, error: studentError } = await supabase
      .from('santri')
      .select('class_id, assigned_teacher_id')
      .eq('id', student_id)
      .single();

    if (studentError) return NextResponse.json({ message: 'Gagal menemukan siswa' }, { status: 404 });
    if (student.class_id !== class_id) {
      return NextResponse.json({ message: 'Siswa tidak perteneca ke kelas ini' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('santri')
      .update({ assigned_teacher_id: teacher_id })
      .eq('id', student_id);

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Siswa berhasil ditetapkan ke guru.' }, { status: 200 });
  } catch (error) {
    console.error('manual-assign-student route error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan' }, { status: 500 });
  }
}