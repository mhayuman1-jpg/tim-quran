import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  const role = session.user.role;
  if (role !== 'Kabid' && role !== 'Sekretaris') {
    return NextResponse.json({ message: 'Tidak memiliki akses' }, { status: 403 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('messages')
      .select('id, santri_id, sender_type, message, is_read, created_at, santri(nama, nisn, classes(name))')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Conversations error:', error);
      return NextResponse.json({ message: 'Gagal mengambil percakapan' }, { status: 500 });
    }

    const map = new Map<string, any>();
    for (const m of data ?? []) {
      if (!map.has(m.santri_id)) {
        map.set(m.santri_id, {
          santri_id: m.santri_id,
          santri: m.santri,
          last_message: m.message,
          last_at: m.created_at,
          unread_count: 0,
        });
      }
      if (m.sender_type === 'wali' && !m.is_read) {
        map.get(m.santri_id).unread_count += 1;
      }
    }

    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
