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
    const { class_id, nama_guru_kelas, niy_guru_kelas } = await request.json();
    if (!class_id) return NextResponse.json({ message: 'class_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('classes')
      .update({ nama_guru_kelas: nama_guru_kelas || null, niy_guru_kelas: niy_guru_kelas || null })
      .eq('id', class_id)
      .select('id, name, nama_guru_kelas, niy_guru_kelas')
      .single();

    if (error) {
      console.error('[update-teacher-info] Supabase error:', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Informasi guru kelas berhasil disimpan.', data }, { status: 200 });
  } catch (err) {
    console.error('[update-teacher-info] Unexpected error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
