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
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ message: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    let santriId: string | undefined;
    if (role === 'Wali_Murid') {
      santriId = (session.user as any).santri_id;
    } else {
      santriId = body.santri_id;
    }

    if (!santriId) {
      return NextResponse.json({ message: 'santri_id diperlukan' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('messages').insert({
      santri_id: santriId,
      sender_type: role === 'Wali_Murid' ? 'wali' : 'kabid',
      sender_id: session.user.id,
      sender_name: session.user.name ?? (role === 'Wali_Murid' ? 'Wali' : 'Admin'),
      message,
      is_read: false,
    });

    if (error) {
      console.error('Send message error:', error);
      return NextResponse.json({ message: 'Gagal mengirim pesan' }, { status: 500 });
    }

    emitMessageUpdate();
    return NextResponse.json({ message: 'Pesan terkirim' }, { status: 201 });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
