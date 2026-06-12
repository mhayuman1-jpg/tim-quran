import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// GET: List all testimonials (kabid only)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'Kabid') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch testimonials error:', error);
      return NextResponse.json({ message: 'Gagal memuat testimoni' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Testimonials manage error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
