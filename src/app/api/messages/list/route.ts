import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const role = session.user.role;
    const { searchParams } = new URL(request.url);

    let santriId: string | undefined;
    if (role === 'Wali_Murid') {
      santriId = (session.user as any).santri_id;
    } else {
      santriId = searchParams.get('santri_id') || undefined;
    }

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*, santri(nama, nisn, classes(name))')
      .eq('santri_id', santriId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('List messages error:', error);
      return NextResponse.json({ message: 'Gagal mengambil pesan' }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error('Messages list API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
