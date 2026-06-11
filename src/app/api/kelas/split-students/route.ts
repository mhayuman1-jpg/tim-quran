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

    // Ambil kelas dan teacher IDs
    const { data: kelas, error: kelasError } = await supabase
      .from('classes')
      .select('id, name, teacher1_id, teacher2_id, teacher3_id')
      .eq('id', classId)
      .single();

    if (kelasError || !kelas) {
      return NextResponse.json({ message: 'Kelas tidak ditemukan.' }, { status: 404 });
    }

    const teachers = [kelas.teacher1_id, kelas.teacher2_id, kelas.teacher3_id].filter(Boolean);
    if (teachers.length === 0) {
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

    // Bagi siswa merata ke semua guru
    const numTeachers = teachers.length;
    const chunkSize = Math.ceil(ids.length / numTeachers);
    const updates = teachers.map((teacherId, i) => {
      const chunk = ids.slice(i * chunkSize, (i + 1) * chunkSize);
      return chunk.length > 0
        ? supabase.from('santri').update({ assigned_teacher_id: teacherId }).in('id', chunk)
        : Promise.resolve({ data: null, error: null });
    });

    const results = await Promise.all(updates);
    const errors = results.filter(r => r && (r as any).error);
    if (errors.length > 0) {
      console.error('[split-students] update errors:', errors);
      return NextResponse.json({ message: 'Gagal membagi siswa ke guru.' }, { status: 500 });
    }

    const counts: Record<string, number> = {};
    teachers.forEach((t, i) => {
      const chunk = ids.slice(i * chunkSize, (i + 1) * chunkSize);
      if (t) counts[t] = chunk.length;
    });

    return NextResponse.json({ message: 'Siswa berhasil dibagi ke guru.', counts }, { status: 200 });
  } catch (error) {
    console.error('split-students route error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
