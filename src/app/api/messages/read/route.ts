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
      return NextResponse.json({ message: 'Message ID tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', message_id);

    if (error) {
      console.error('Mark read error:', error);
      return NextResponse.json({ message: 'Gagal menandai pesan' }, { status: 500 });
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 });
  } catch (error) {
    console.error('Mark read API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
