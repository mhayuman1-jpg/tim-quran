import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// GET: publik (all=true) atau hanya published
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let q = supabase
      .from('galeri')
      .select('*')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    if (!all) q = q.eq('is_published', true);

    const { data, error } = await q;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// POST: tambah foto (Kabid only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { judul, deskripsi, foto_url, urutan, is_published } = body;
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!foto_url?.trim()) return NextResponse.json({ message: 'Foto wajib diupload.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('galeri')
      .insert([{ judul: judul.trim(), deskripsi: deskripsi || null, foto_url, urutan: urutan ?? 0, is_published: is_published ?? true }])
      .select('*').single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Foto berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// PUT: edit foto (Kabid only)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, judul, deskripsi, foto_url, urutan, is_published } = body;
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('galeri')
      .update({ judul, deskripsi: deskripsi || null, foto_url, urutan, is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*').single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Foto berhasil diperbarui.', data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// DELETE: hapus foto (Kabid only)
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('galeri').delete().eq('id', id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ message: 'Foto berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
