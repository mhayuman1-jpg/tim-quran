import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

function requireKabid(session: any) {
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
  return null;
}

// GET: publik atau all=true untuk dashboard
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    let q = supabase
      .from('album')
      .select('*, galeri(count)')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    if (!all) q = q.eq('is_published', true);

    const { data, error } = await q;

    if (error) {
      console.error('[album GET]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const albums = (data ?? []).map((row: any) => ({
      id: row.id,
      judul: row.judul,
      deskripsi: row.deskripsi,
      cover_url: row.cover_url,
      urutan: row.urutan,
      is_published: row.is_published,
      created_at: row.created_at,
      updated_at: row.updated_at,
      foto_count: row.galeri?.[0]?.count ?? 0,
    }));

    return NextResponse.json({ data: albums }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// POST: tambah album (Kabid only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { judul, deskripsi, cover_url, urutan, is_published } = body;

    if (!judul?.trim()) {
      return NextResponse.json({ message: 'Judul album wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('album')
      .insert([{
        judul: judul.trim(),
        deskripsi: deskripsi || null,
        cover_url: cover_url || null,
        urutan: urutan ?? 0,
        is_published: is_published ?? true,
      }])
      .select('*')
      .single();

    if (error) {
      console.error('[album POST]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// PUT: edit album (Kabid only)
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { id, judul, deskripsi, cover_url, urutan, is_published } = body;

    if (!id) return NextResponse.json({ message: 'ID album wajib diisi.' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (judul !== undefined) updates.judul = judul?.trim() || null;
    if (deskripsi !== undefined) updates.deskripsi = deskripsi || null;
    if (cover_url !== undefined) updates.cover_url = cover_url || null;
    if (urutan !== undefined) updates.urutan = urutan;
    if (is_published !== undefined) updates.is_published = is_published;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('album')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[album PUT]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil diperbarui.', data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

// DELETE: hapus album (Kabid only), foto tetap ada (album_id = NULL via FK)
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const kabidCheck = requireKabid(session);
  if (kabidCheck) return kabidCheck;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ message: 'ID album wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('album').delete().eq('id', id);

    if (error) {
      console.error('[album DELETE]', error);
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    return NextResponse.json({ message: 'Album berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
