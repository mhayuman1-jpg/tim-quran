import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
  try {
    const supabase = createServerClient();
    const { data: teachers } = await supabase.from('users').select('id, name').eq('role', 'Tim_Quran').eq('status', 'Aktif');
    if (!teachers || teachers.length === 0) return NextResponse.json({ message: "Tidak ada anggota Tim Qur'an aktif." }, { status: 400 });
    const { data: classes } = await supabase.from('classes').select('id, name, teacher1_id, teacher2_id');
    if (!classes || classes.length === 0) return NextResponse.json({ message: 'Tidak ada kelas.' }, { status: 200 });
    const updates = classes.map((kelas, i) => {
      const t1 = teachers[i % teachers.length];
      const t2 = teachers[(i + 1) % teachers.length];
      return { id: kelas.id, teacher1_id: t1.id, teacher2_id: t1.id === t2.id ? null : t2.id };
    });
    await Promise.all(updates.map(u => supabase.from('classes').update({ teacher1_id: u.teacher1_id, teacher2_id: u.teacher2_id }).eq('id', u.id)));
    return NextResponse.json({ message: `${updates.length} kelas berhasil ditetapkan gurunya.` }, { status: 200 });
  } catch { return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 }); }
}
