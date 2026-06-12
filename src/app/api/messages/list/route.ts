import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const role = session.user.role;

    let query = supabase
      .from('messages')
      .select('*, santri(nama, nisn, classes(name))')
      .order('created_at', { ascending: false });

    // Wali murid only sees their own messages
    if (role === 'Wali_Murid') {
      const santriId = (session.user as any).santri_id;
      query = query.eq('santri_id', santriId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('List messages error:', error);
      return NextResponse.json({ message: 'Gagal mengambil pesan' }, { status: 500 });
    }

    return NextResponse.json(data ?? [], { status: 200 });
  } catch (error) {
    console.error('Messages list API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
