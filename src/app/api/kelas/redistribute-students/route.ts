export const dynamic = 'force-dynamic';
// POST: Bagi rata siswa aktif di semua kelas ke guru1/guru2/guru3 yang ter-assign
// Bisa dipanggil kapan saja (setelah import siswa, setelah assign guru, dll)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shuffleArray } from '@/lib/shuffle';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });

  try {
    const supabase = createServerClient();
    const body = await request.json().catch(() => ({}));
    const { class_id } = body as { class_id?: string };

    // Ambil kelas (spesifik atau semua)
    let classesQuery = supabase.from('classes').select('id, name, teacher1_id, teacher2_id, teacher3_id');
    if (class_id) classesQuery = classesQuery.eq('id', class_id);
    const { data: classes, error: cErr } = await classesQuery;
    if (cErr) return NextResponse.json({ message: 'Gagal mengambil data kelas.', error: cErr.message }, { status: 500 });
    if (!classes || classes.length === 0) return NextResponse.json({ message: 'Tidak ada kelas ditemukan.' }, { status: 404 });

    const results: { kelas: string; total_siswa: number; distribusi: Record<string, number> }[] = [];

    for (const kelas of classes) {
      const activeTeachers = [kelas.teacher1_id, kelas.teacher2_id, kelas.teacher3_id].filter(Boolean);

      // Ambil siswa aktif di kelas ini
      const { data: siswaList } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('class_id', kelas.id)
        .eq('status', 'Aktif')
        .order('nama');

      if (!siswaList || siswaList.length === 0) continue;

      const ids = shuffleArray(siswaList.map((s: any) => s.id));
      const distribusi: Record<string, number> = {};

      if (activeTeachers.length === 0) {
        // Tidak ada guru: reset assigned_teacher_id ke null
        await supabase.from('santri').update({ assigned_teacher_id: null }).in('id', ids);
        distribusi['(tanpa guru)'] = ids.length;
      } else if (activeTeachers.length === 1) {
        // 1 guru: semua siswa ke guru itu
        await supabase.from('santri').update({ assigned_teacher_id: activeTeachers[0] }).in('id', ids);
        distribusi[activeTeachers[0]] = ids.length;
      } else {
        // 2-3 guru: interleave selang-seling (sudah di-shuffle)
        const numT = activeTeachers.length;
        const updates = activeTeachers.map((teacherId, ti) => {
          const chunk = ids.filter((_: string, i: number) => i % numT === ti);
          distribusi[teacherId] = chunk.length;
          return chunk.length > 0
            ? supabase.from('santri').update({ assigned_teacher_id: teacherId }).in('id', chunk)
            : Promise.resolve({ data: null, error: null });
        });
        await Promise.all(updates);
      }

      results.push({ kelas: kelas.name, total_siswa: ids.length, distribusi });
    }

    return NextResponse.json({
      message: `Berhasil distribusi siswa di ${results.length} kelas.`,
      data: results,
    }, { status: 200 });
  } catch (err) {
    console.error('[redistribute-students] Error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
