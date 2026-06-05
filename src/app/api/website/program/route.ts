import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const supabase = createServerClient();

    let query = supabase.from('program').select('*').order('urutan', { ascending: true });
    if (!all) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { nama, deskripsi, icon, urutan } = body;
    if (!nama?.trim()) return NextResponse.json({ message: 'Nama program wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('program')
      .insert([{ nama: nama.trim(), deskripsi, icon: icon || 'BookOpen', urutan: urutan || 0 }])
      .select('*')
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Program berhasil ditambahkan.', data }, { status: 201 });
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
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('program')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Program berhasil diperbarui.', data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('program').delete().eq('id', id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Program berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
