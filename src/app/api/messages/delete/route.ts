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
    const { message_id } = body;

    if (!message_id) {
      return NextResponse.json({ message: 'message_id diperlukan' }, { status: 400 });
    }

    const supabase = createServerClient();
    const role = (session.user as any).role;

    // Fetch the message first
    const { data: msg, error: fetchError } = await supabase
      .from('messages')
      .select('id, sender_type, sender_id, santri_id')
      .eq('id', message_id)
      .single();

    if (fetchError || !msg) {
      return NextResponse.json({ message: 'Pesan tidak ditemukan' }, { status: 404 });
    }

    // Authorization: wali can delete their own messages, kabid can delete any
    if (role === 'Kabid') {
      // Kabid can delete any message
    } else if (msg.sender_type === 'wali' && msg.sender_id === session.user.id) {
      // Wali can only delete their own messages
    } else {
      return NextResponse.json({ message: 'Tidak diizinkan menghapus pesan ini' }, { status: 403 });
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message_id);

    if (error) {
      console.error('Delete message error:', error);
      return NextResponse.json({ message: 'Gagal menghapus pesan' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pesan berhasil dihapus' });
  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
