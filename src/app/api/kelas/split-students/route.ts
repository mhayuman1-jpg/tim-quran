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
    const body = await request.json();
    const classId = body?.class_id as string | undefined;
    if (!classId) return NextResponse.json({ message: 'Parameter class_id wajib.' }, { status: 400 });

    const supabase = createServerClient();

    // Ambil kelas dan pastikan teacher1 & teacher2 ada
    const { data: kelas, error: kelasError } = await supabase
      .from('classes')
      .select('id, name, teacher1_id, teacher2_id')
      .eq('id', classId)
      .single();

    if (kelasError || !kelas) {
      return NextResponse.json({ message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }

    if (!kelas.teacher1_id && !kelas.teacher2_id) {
      return NextResponse.json({ message: 'Pastikan minimal satu guru sudah ditetapkan untuk kelas ini.' }, { status: 400 });
    }

    // Ambil semua siswa aktif di kelas
    const { data: siswaList, error: siswaError } = await supabase
      .from('santri')
      .select('id')
      .eq('class_id', classId)
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (siswaError) {
      console.error('[split-students] fetch students error:', siswaError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const ids = (siswaList ?? []).map((s: any) => s.id);
    if (ids.length === 0) {
      return NextResponse.json({ message: 'Tidak ada siswa di kelas ini.' }, { status: 200 });
    }

    const hasBothTeachers = Boolean(kelas.teacher1_id && kelas.teacher2_id);
    const teacher1 = kelas.teacher1_id;
    const teacher2 = kelas.teacher2_id;

    let results: { teacher1: number; teacher2: number } = { teacher1: 0, teacher2: 0 };

    if (hasBothTeachers) {
      const half = Math.ceil(ids.length / 2);
      const first = ids.slice(0, half);
      const second = ids.slice(half);

      const p1 = first.length > 0
        ? supabase.from('santri').update({ assigned_teacher_id: teacher1 }).in('id', first)
        : Promise.resolve({ data: null, error: null });

      const p2 = second.length > 0
        ? supabase.from('santri').update({ assigned_teacher_id: teacher2 }).in('id', second)
        : Promise.resolve({ data: null, error: null });

      const [r1, r2] = await Promise.all([p1, p2]);

      if ((r1 && (r1 as any).error) || (r2 && (r2 as any).error)) {
        console.error('[split-students] update errors:', (r1 as any).error, (r2 as any).error);
        return NextResponse.json({ message: 'Gagal membagi siswa ke guru.' }, { status: 500 });
      }

      results = { teacher1: first.length, teacher2: second.length };
    } else {
      const assignedTeacher = teacher1 || teacher2;
      const { error: updateError } = await supabase
        .from('santri')
        .update({ assigned_teacher_id: assignedTeacher })
        .in('id', ids);

      if (updateError) {
        console.error('[split-students] update error:', updateError);
        return NextResponse.json({ message: 'Gagal menetapkan guru untuk siswa.' }, { status: 500 });
      }

      results = { teacher1: ids.length, teacher2: 0 };
    }

    return NextResponse.json({ message: 'Siswa berhasil dibagi ke guru.', counts: results }, { status: 200 });
  } catch (error) {
    console.error('split-students route error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
