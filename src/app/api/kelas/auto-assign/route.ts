import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
  try {
    const supabase = createServerClient();
    const { data: teachers } = await supabase.from('users').select('id, name').eq('role', 'Tim_Quran').eq('status', 'Aktif');
    if (!teachers || teachers.length === 0) return NextResponse.json({ message: "Tidak ada anggota Tim Qur'an aktif." }, { status: 400 });
    const { data: classes, error: classesError } = await supabase.from('classes').select('id, name');
    if (classesError) {
      console.error('[auto-assign] Supabase classes query error:', classesError);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.', error: classesError.message }, { status: 500 });
    }
    if (!classes || classes.length === 0) return NextResponse.json({ message: 'Tidak ada kelas.' }, { status: 200 });

    // Distribusi guru ke kelas secara round-robin (maks 3 guru per kelas)
    const teacherCount = teachers.length;
    const updates = classes.map((kelas, i) => {
      const t1 = teachers[i % teacherCount];
      const t2 = teachers[(i + 1) % teacherCount];
      const t3 = teachers.length >= 3 ? teachers[(i + 2) % teacherCount] : null;
      const t3Id = t3 && t3.id !== t1.id && t3.id !== t2.id ? t3.id : null;
      return { id: kelas.id, teacher1_id: t1.id, teacher2_id: t1.id === t2.id ? null : t2.id, teacher3_id: t3Id };
    });

    // Update kelas
    await Promise.all(updates.map(u =>
      supabase.from('classes').update({
        teacher1_id: u.teacher1_id,
        teacher2_id: u.teacher2_id,
        teacher3_id: u.teacher3_id,
      }).eq('id', u.id)
    ));

    // Bagi rata siswa per kelas ke guru yang diampu
    const results: { kelas: string; siswa: number; guru: number }[] = [];
    for (const u of updates) {
      const { data: siswaList } = await supabase
        .from('santri')
        .select('id')
        .eq('class_id', u.id)
        .eq('status', 'Aktif');

      if (!siswaList || siswaList.length === 0) continue;

      const ids = siswaList.map((s: any) => s.id);
      const activeTeachers = [u.teacher1_id, u.teacher2_id, u.teacher3_id].filter(Boolean);

      if (activeTeachers.length === 0) continue;

      if (activeTeachers.length === 1) {
        // 1 guru: semua siswa ke guru itu
        await supabase.from('santri').update({ assigned_teacher_id: activeTeachers[0] }).in('id', ids);
      } else {
        // 2-3 guru: bagi rata siswa
        const chunkSize = Math.ceil(ids.length / activeTeachers.length);
        const assigns = activeTeachers.map((teacherId, i) => {
          const chunk = ids.slice(i * chunkSize, (i + 1) * chunkSize);
          return chunk.length > 0
            ? supabase.from('santri').update({ assigned_teacher_id: teacherId }).in('id', chunk)
            : Promise.resolve({ data: null, error: null });
        });
        await Promise.all(assigns);
      }

      results.push({ kelas: u.id, siswa: ids.length, guru: activeTeachers.length });
    }

    return NextResponse.json({
      message: `${updates.length} kelas berhasil ditetapkan gurunya. Siswa dibagi rata ke ${teacherCount} guru.`,
      detail: results,
    }, { status: 200 });
  } catch { return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 }); }
}
