import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
  try {
    const { class_id, teacher1_id, teacher2_id } = await request.json();
    if (!class_id) return NextResponse.json({ message: 'class_id wajib diisi' }, { status: 400 });
    const supabase = createServerClient();
    const { data, error } = await supabase.from('classes')
      .update({ teacher1_id: teacher1_id || null, teacher2_id: teacher2_id || null })
      .eq('id', class_id).select('id, name').single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Guru berhasil ditetapkan.', data }, { status: 200 });
  } catch { return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 }); }
}
