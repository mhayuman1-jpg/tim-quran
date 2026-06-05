import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('artikel')
      .select('id, judul, konten, cover_url, is_published, slug')
      .eq('id', params.id)
      .single();
    if (error || !data) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
