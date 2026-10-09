// src/app/api/dashboard/pembelajaran-al-quran/[id]/route.ts
// PUT: Update video pembelajaran AL Qur'an
// DELETE: Hapus video pembelajaran AL Qur'an

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request, ['Kabid']);
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const body = await request.json();
    const { jilid_id, judul, deskripsi, youtube_url, urutan, is_active } = body;

    if (!jilid_id) {
      return NextResponse.json(
        { success: false, message: 'Jilid wajib dipilih' },
        { status: 400 }
      );
    }

    if (!judul || !youtube_url) {
      return NextResponse.json(
        { success: false, message: 'Judul dan YouTube URL wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi YouTube URL
    if (!isValidYouTubeUrl(youtube_url)) {
      return NextResponse.json(
        { success: false, message: 'URL YouTube tidak valid' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('pembelajaran_al_quran')
      .update({
        jilid_id,
        judul,
        deskripsi: deskripsi || null,
        youtube_url,
        urutan: urutan ?? 0,
        is_active: is_active ?? true,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, message: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[PUT /api/dashboard/pembelajaran-al-quran] Error:', err?.message);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Gagal mengupdate data' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth(request, ['Kabid']);
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { error } = await supabase
      .from('pembelajaran_al_quran')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err: any) {
    console.error('[DELETE /api/dashboard/pembelajaran-al-quran] Error:', err?.message);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}

function isValidYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'www.youtube.com' ||
      parsed.hostname === 'youtube.com' ||
      parsed.hostname === 'youtu.be' ||
      parsed.hostname === 'm.youtube.com'
    );
  } catch {
    return false;
  }
}
