import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// POST: Submit testimoni (public, no auth)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parent_name, child_name, batch, rating, message } = body;

    if (!parent_name?.trim() || !child_name?.trim() || !rating || !message?.trim()) {
      return NextResponse.json({ message: 'Data tidak lengkap' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Rating harus 1-5' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error } = await supabase.from('testimonials').insert({
      parent_name: parent_name.trim(),
      child_name: child_name.trim(),
      batch: batch?.trim() || null,
      rating: Number(rating),
      message: message.trim(),
    });

    if (error) {
      console.error('Submit testimonial error:', error);
      return NextResponse.json({ message: 'Gagal mengirim testimoni' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Terima kasih! Testimoni Anda berhasil dikirim dan menunggu persetujuan admin.' }, { status: 201 });
  } catch (error) {
    console.error('Testimonial API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

// GET: List approved testimonials (public)
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, parent_name, child_name, batch, rating, message, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Fetch testimonials error:', error);
      return NextResponse.json({ message: 'Gagal memuat testimoni' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Testimonials GET error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
