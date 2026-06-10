// src/app/api/raport/admin-list/route.ts
// GET: Ambil daftar raport untuk Kabid/Sekretaris
// - Mengembalikan raport yang dikelompokkan berdasarkan kelas
// - Hanya bisa diakses oleh Kabid dan Sekretaris

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  if (session.user.role !== 'Kabid' && session.user.role !== 'Sekretaris') {
    return NextResponse.json(
      { message: 'Hanya Kabid dan Sekretaris yang dapat mengakses halaman ini.' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const periode = searchParams.get('periode')?.trim();
    const classId = searchParams.get('class_id')?.trim();

    const supabase = createServerClient();

    // Fetch raport dengan join ke santri, classes, dan users (teacher)
    let query = supabase
      .from('raport_tahfidz')
      .select(`
        id, student_id, teacher_id, periode, tahun_ajaran, juz, catatan,
        nama_guru_kelas, niy_guru_kelas,
        tahsin_metode, tahsin_buku, tahsin_halaman,
        created_at, updated_at,
        santri ( id, nama, nisn, assigned_teacher_id, classes ( id, name ) ),
        users ( id, name )
      `)
      .order('created_at', { ascending: false });

    if (periode) {
      query = query.ilike('periode', `%${periode}%`);
    }

    if (classId) {
      // Filter by class_id through santri relation
      const { data: santriInClass } = await supabase
        .from('santri')
        .select('id')
        .eq('class_id', classId);
      const santriIds = (santriInClass ?? []).map((s: any) => s.id);
      if (santriIds.length === 0) {
        return NextResponse.json({ data: [], classes: [] }, { status: 200 });
      }
      query = query.in('student_id', santriIds);
    }

    const { data, error } = await query as any;

    if (error) {
      console.error('Supabase fetch admin raport error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data raport.', error: error.message },
        { status: 500 }
      );
    }

    // Group by class
    const classMap = new Map<string, {
      class_id: string;
      class_name: string;
      raports: typeof data;
      count: number;
    }>();

    for (const raport of data ?? []) {
      const className = raport.santri?.classes?.name ?? 'Tanpa Kelas';
      const classId = raport.santri?.classes?.id ?? 'no-class';

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          class_id: classId,
          class_name: className,
          raports: [],
          count: 0,
        });
      }

      const group = classMap.get(classId)!;
      group.raports.push(raport);
      group.count++;
    }

    // Convert to array and sort by class name
    const classes = Array.from(classMap.values()).sort((a, b) =>
      a.class_name.localeCompare(b.class_name)
    );

    return NextResponse.json({
      data: data ?? [],
      classes,
    }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/raport/admin-list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
