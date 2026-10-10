export const dynamic = 'force-dynamic';
// GET: Laporan progres siswa per kelas (Kabid / Sekretaris)
// Query: class_id (opsional). Kosong = semua kelas.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { buildStudentProgress } from '@/lib/laporan/student-progress';

const ALLOWED_ROLES = ['Kabid', 'Sekretaris'];

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id')?.trim() || '';
    const supabase = createServerClient();

    let className: string | null = null;
    if (classId) {
      const { data: kelas, error: kelasError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('id', classId)
        .maybeSingle();

      if (kelasError) {
        console.error('Fetch kelas error (laporan kelas):', kelasError);
        return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
      }
      if (!kelas) {
        return NextResponse.json({ message: 'Kelas tidak ditemukan.' }, { status: 404 });
      }
      className = kelas.name;
    }

    let santriQuery = supabase
      .from('santri')
      .select('id, nisn, nama, gender, juz_terakhir, assigned_teacher_id, class_id, classes ( id, name )')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (classId) {
      santriQuery = santriQuery.eq('class_id', classId);
    }

    const { data: santriList, error: santriError } = await santriQuery;
    if (santriError) {
      console.error('Fetch santri error (laporan kelas):', santriError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const { students, summary } = await buildStudentProgress(supabase, santriList ?? []);

    return NextResponse.json(
      {
        class_id: classId || null,
        class_name: className,
        students,
        summary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Laporan kelas API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
