import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== 'Kabid' && role !== 'Sekretaris') {
    return NextResponse.json({ message: 'Tidak memiliki akses' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { message_id, reply } = body;

    if (!message_id || !reply?.trim()) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('messages')
      .update({
        reply: reply.trim(),
        replied_by: session.user.id,
        replied_at: new Date().toISOString(),
        is_read: false,
      })
      .eq('id', message_id);

    if (error) {
      console.error('Reply message error:', error);
      return NextResponse.json({ message: 'Gagal membalas pesan' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Balasan berhasil dikirim' }, { status: 200 });
  } catch (error) {
    console.error('Reply message API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
