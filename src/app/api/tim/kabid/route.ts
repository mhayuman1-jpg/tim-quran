// GET: Ambil nama user dengan role Kabid (untuk tanda tangan raport)
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'Kabid')
      .eq('status', 'Aktif')
      .limit(1)
      .single();

    if (error || !data) return NextResponse.json({ name: null }, { status: 200 });
    return NextResponse.json({ id: data.id, name: data.name }, { status: 200 });
  } catch {
    return NextResponse.json({ name: null }, { status: 200 });
  }
}
