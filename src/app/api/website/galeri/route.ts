import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { storageUpload } from '@/lib/storage/tigris';

export const dynamic = 'force-dynamic';

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

// POST: tambah foto (Kabid only) — supports JSON single & multipart multi-upload
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  const contentType = request.headers.get('content-type') || '';

  // ── Multipart multi-upload ──
  if (contentType.includes('multipart/form-data')) {
    return handleMultiUpload(request);
  }

  // ── JSON single-upload (backward compatible) ──
  return handleSingleUpload(request);
}

async function handleSingleUpload(request: NextRequest) {
  try {
    const body = await request.json();
    const { judul, deskripsi, foto_url, urutan, is_published, album_id } = body;
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!foto_url?.trim()) return NextResponse.json({ message: 'Foto wajib diupload.' }, { status: 400 });

    const supabase = createServerClient();

    // Validate album_id if provided
    if (album_id) {
      const { data: album } = await supabase.from('album').select('id').eq('id', album_id).maybeSingle();
      if (!album) return NextResponse.json({ message: 'Album tidak ditemukan.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('galeri')
      .insert([{
        judul: judul.trim(),
        deskripsi: deskripsi || null,
        foto_url,
        urutan: urutan ?? 0,
        is_published: is_published ?? true,
        album_id: album_id || null,
      }])
      .select('*').single();

    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    // Invalidate landing page and galeri page so website shows latest changes
    try { revalidatePath('/'); revalidatePath('/galeri'); } catch (e) { console.warn('revalidatePath failed', e); }

    return NextResponse.json({ message: 'Foto berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

async function handleMultiUpload(request: NextRequest) {
  try {
    const formData = await request.formData();
    const albumId = formData.get('album_id') as string | null;

    if (!albumId) {
      return NextResponse.json({ message: 'album_id wajib diisi.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Validate album exists
    const { data: album } = await supabase.from('album').select('id').eq('id', albumId).maybeSingle();
    if (!album) {
      return NextResponse.json({ message: 'Album tidak ditemukan.' }, { status: 404 });
    }

    // Collect files from formData
    const files: File[] = [];
    Array.from(formData.entries()).forEach(([key, value]) => {
      if (key.startsWith('files') && value instanceof File) {
        files.push(value);
      }
    });

    if (files.length === 0) {
      return NextResponse.json({ message: 'Minimal satu file wajib diupload.' }, { status: 400 });
    }

    const results: Array<{ judul: string; foto_url: string; error?: string }> = [];
    const bucket = 'timquran-assets';
    const folder = 'galeri';

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ judul: file.name, foto_url: '', error: 'Format tidak didukung' });
        continue;
      }

      // Validate size
      if (file.size > MAX_SIZE_BYTES) {
        results.push({ judul: file.name, foto_url: '', error: `Ukuran > ${MAX_SIZE_MB}MB` });
        continue;
      }

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await storageUpload(bucket, fileName, buffer, file.type);

        const fotoUrl = `/api/images/${bucket}/${fileName}`;

        const { error: insertErr } = await supabase.from('galeri').insert([{
          judul: file.name.replace(/\.[^.]+$/, ''),
          foto_url: fotoUrl,
          album_id: albumId,
          urutan: 0,
          is_published: true,
        }]);

        if (insertErr) {
          results.push({ judul: file.name, foto_url: fotoUrl, error: insertErr.message });
        } else {
          results.push({ judul: file.name, foto_url: fotoUrl });
        }
      } catch (uploadErr: any) {
        results.push({ judul: file.name, foto_url: '', error: uploadErr?.message || 'Upload gagal' });
      }
    }

    try { revalidatePath('/'); revalidatePath('/galeri'); } catch {}

    const inserted = results.filter(r => !r.error).length;
    return NextResponse.json({
      message: `${inserted} dari ${files.length} foto berhasil diupload.`,
      inserted,
      total: files.length,
      photos: results,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan saat upload.' }, { status: 500 });
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

    // Revalidate landing and galeri pages
    try { revalidatePath('/'); revalidatePath('/galeri'); } catch (e) { console.warn('revalidatePath failed', e); }

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

    // Revalidate landing and galeri pages
    try { revalidatePath('/'); revalidatePath('/galeri'); } catch (e) { console.warn('revalidatePath failed', e); }

    return NextResponse.json({ message: 'Foto berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
