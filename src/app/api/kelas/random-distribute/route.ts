export const dynamic = 'force-dynamic';
// POST: Acak pembagian siswa aktif di semua kelas ke guru1/guru2/guru3 yang ter-assign
// Siswa di-shuffle secara acak terlebih dahulu, lalu dibagi merata ke setiap guru per kelas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

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
        .select('id')
        .eq('class_id', kelas.id)
        .eq('status', 'Aktif');

      if (!siswaList || siswaList.length === 0) continue;

      // Acak urutan siswa
      const shuffledIds = shuffleArray(siswaList.map((s: { id: string }) => s.id));

      const distribusi: Record<string, number> = {};

      if (activeTeachers.length === 0) {
        // Tidak ada guru: reset assigned_teacher_id ke null
        await supabase.from('santri').update({ assigned_teacher_id: null }).in('id', shuffledIds);
        distribusi['(tanpa guru)'] = shuffledIds.length;
      } else if (activeTeachers.length === 1) {
        // 1 guru: semua siswa ke guru itu
        await supabase.from('santri').update({ assigned_teacher_id: activeTeachers[0] }).in('id', shuffledIds);
        distribusi[activeTeachers[0]] = shuffledIds.length;
      } else {
        // 2-3 guru: bagi rata secara acak (sudah di-shuffle)
        const chunkSize = Math.ceil(shuffledIds.length / activeTeachers.length);
        const updates = activeTeachers.map((teacherId, i) => {
          const chunk = shuffledIds.slice(i * chunkSize, (i + 1) * chunkSize);
          distribusi[teacherId] = chunk.length;
          return chunk.length > 0
            ? supabase.from('santri').update({ assigned_teacher_id: teacherId }).in('id', chunk)
            : Promise.resolve({ data: null, error: null });
        });
        await Promise.all(updates);
      }

      results.push({ kelas: kelas.name, total_siswa: shuffledIds.length, distribusi });
    }

    return NextResponse.json({
      message: `Berhasil mengacak pembagian siswa di ${results.length} kelas.`,
      data: results,
    }, { status: 200 });
  } catch (err) {
    console.error('[random-distribute] Error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
