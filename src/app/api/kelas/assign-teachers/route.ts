import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
  try {
    const { class_id, teacher1_id, teacher2_id } = await request.json();
    if (!class_id) return NextResponse.json({ message: 'class_id wajib diisi' }, { status: 400 });
    if (teacher1_id && teacher2_id && teacher1_id === teacher2_id) {
      return NextResponse.json({ message: 'Guru 1 dan Guru 2 tidak boleh sama.' }, { status: 400 });
    }

    const supabase = createServerClient();

    const teacherIds = [teacher1_id, teacher2_id].filter(
      (id): id is string => typeof id === 'string' && id.trim() !== ''
    );

    if (teacherIds.length > 0) {
      const { data: teachers, error: teacherFetchError } = await supabase
        .from('users')
        .select('id, role, status')
        .in('id', teacherIds);

      if (teacherFetchError) {
        console.error('[assign-teachers] Supabase error fetching users:', teacherFetchError);
        return NextResponse.json({ message: 'Gagal memverifikasi guru.', error: teacherFetchError.message }, { status: 500 });
      }

      const missingIds = teacherIds.filter(
        (id) => !(teachers ?? []).some((teacher) => teacher.id === id)
      );
      if (missingIds.length > 0) {
        return NextResponse.json(
          { message: `Guru tidak ditemukan: ${missingIds.join(', ')}` },
          { status: 404 }
        );
      }

      const inactive = (teachers ?? []).filter((teacher) => teacher.status !== 'Aktif');
      if (inactive.length > 0) {
        return NextResponse.json(
          { message: `Guru belum aktif: ${inactive.map((teacher) => teacher.id).join(', ')}` },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase.from('classes')
      .update({ teacher1_id: teacher1_id || null, teacher2_id: teacher2_id || null })
      .eq('id', class_id)
      .select('id, name')
      .single();

    if (error) {
      console.error('[assign-teachers] Supabase update error:', error);
      const message = String(error.message || '').toLowerCase();
      if (message.includes('teacher1_id') || message.includes('teacher2_id')) {
        return NextResponse.json({
          message: 'Kolom teacher1_id atau teacher2_id tidak ditemukan di tabel classes. Jalankan migrasi schema untuk menambahkan kolom ini.',
          detail: error.details ?? null,
        }, { status: 500 });
      }
      return NextResponse.json({ message: error.message, detail: error.details ?? null }, { status: 500 });
    }

    const t1 = teacher1_id || null;
    const t2 = teacher2_id || null;

    if (t1 || t2) {
      const { data: siswaList } = await supabase
        .from('santri')
        .select('id')
        .eq('class_id', class_id)
        .eq('status', 'Aktif');

      if (siswaList && siswaList.length > 0) {
        const assignedTeacher = t1 || t2;

        if (t1 && t2) {
          const ids = siswaList.map((s: any) => s.id);
          const half = Math.ceil(ids.length / 2);
          const first = ids.slice(0, half);
          const second = ids.slice(half);

          await Promise.all([
            first.length > 0
              ? supabase.from('santri').update({ assigned_teacher_id: t1 }).in('id', first)
              : Promise.resolve({ data: null, error: null }),
            second.length > 0
              ? supabase.from('santri').update({ assigned_teacher_id: t2 }).in('id', second)
              : Promise.resolve({ data: null, error: null }),
          ]);
        } else {
          const ids = siswaList.map((s: any) => s.id);
          await supabase
            .from('santri')
            .update({ assigned_teacher_id: assignedTeacher })
            .in('id', ids);
        }
      }
    }

    return NextResponse.json({ message: 'Guru berhasil ditetapkan.', data }, { status: 200 });
  } catch (err) {
    console.error('[assign-teachers] Unexpected error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
