import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { emitMessageUpdate } from '@/lib/message-events';

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { santri_id, message } = body;

    if (!santri_id || !message?.trim()) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from('messages').insert({
      santri_id,
      sender_type: 'wali',
      sender_id: session.user.id,
      sender_name: session.user.name ?? 'Wali Murid',
      message: message.trim(),
    });

    if (error) {
      console.error('Send message error:', error);
      return NextResponse.json({ message: 'Gagal mengirim pesan' }, { status: 500 });
    }

    emitMessageUpdate();

    return NextResponse.json({ message: 'Pesan berhasil dikirim' }, { status: 201 });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
