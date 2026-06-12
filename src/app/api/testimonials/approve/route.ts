import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// POST: Approve or reject a testimonial
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'Kabid') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { testimonial_id, action } = body;

    if (!testimonial_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Data tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    if (action === 'approve') {
      const { error } = await supabase
        .from('testimonials')
        .update({ is_approved: true })
        .eq('id', testimonial_id);

      if (error) {
        console.error('Approve testimonial error:', error);
        return NextResponse.json({ message: 'Gagal menyetujui testimoni' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Testimoni berhasil disetujui' });
    } else {
      // Reject = delete
      const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', testimonial_id);

      if (error) {
        console.error('Delete testimonial error:', error);
        return NextResponse.json({ message: 'Gagal menghapus testimoni' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Testimoni berhasil dihapus' });
    }
  } catch (error) {
    console.error('Testimonial action error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
