import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profil_website')
      .select('*')
      .single();
    if (error) {
      return NextResponse.json({ message: 'Gagal mengambil profil.' }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const supabase = createServerClient();

    // Check if profil exists
    const { data: existing } = await supabase.from('profil_website').select('id').single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('profil_website')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      result = data;
    } else {
      const { data, error } = await supabase
        .from('profil_website')
        .insert([body])
        .select('*')
        .single();
      if (error) return NextResponse.json({ message: error.message }, { status: 500 });
      result = data;
    }

    return NextResponse.json({ message: 'Profil berhasil diperbarui.', data: result }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
