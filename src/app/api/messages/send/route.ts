import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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

    return NextResponse.json({ message: 'Pesan berhasil dikirim' }, { status: 201 });
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
