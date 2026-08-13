import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { emitMessageUpdate } from '@/lib/message-events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const role = session.user.role;
    const santriId =
      role === 'Wali_Murid' ? (session.user as any).santri_id : body.santri_id;

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const supabase = createServerClient();
    const targetSender = role === 'Wali_Murid' ? 'kabid' : 'wali';

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('santri_id', santriId)
      .eq('sender_type', targetSender);

    if (error) {
      console.error('Mark read error:', error);
      return NextResponse.json({ message: 'Gagal menandai pesan' }, { status: 500 });
    }

    emitMessageUpdate();
    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
