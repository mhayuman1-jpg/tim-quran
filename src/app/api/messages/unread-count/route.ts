import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const role = session.user.role;

    let query = supabase
      .from('messages')
      .select('id')
      .eq('is_read', false);

    // Kabid only sees unread messages from wali
    if (role === 'Kabid' || role === 'Sekretaris') {
      query = query.eq('sender_type', 'wali');
    }

    // Wali murid sees unread replies from kabid
    if (role === 'Wali_Murid') {
      const santriId = session.user.santri_id;
      if (!santriId) {
        return NextResponse.json({ count: 0 }, { status: 200 });
      }
      query = query.eq('santri_id', santriId).eq('sender_type', 'kabid');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Unread count error:', JSON.stringify(error));
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    return NextResponse.json({ count: data?.length ?? 0 }, { status: 200 });
  } catch (error) {
    console.error('Unread count API error:', error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
