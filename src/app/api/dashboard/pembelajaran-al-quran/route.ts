// src/app/api/dashboard/pembelajaran-al-quran/route.ts
// GET: Ambil daftar video pembelajaran AL Qur'an (admin - untuk Kabid)
// POST: Tambah video pembelajaran AL Qur'an baru (wajib pilih jilid)

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request, ['Kabid']);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const jilidId = request.nextUrl.searchParams.get('jilid_id');

    let query = supabase
      .from('pembelajaran_al_quran')
      .select('*, jilid_pembelajaran(id, nama)')
      .order('urutan', { ascending: true });

    if (jilidId) {
      query = query.eq('jilid_id', jilidId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      error: null,
    });
  } catch (err: any) {
    console.error('[GET /api/dashboard/pembelajaran-al-quran] Error:', err?.message);
    return NextResponse.json(
      { data: null, error: err?.message ?? 'Gagal mengambil data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAuth(request, ['Kabid']);
  if (session instanceof NextResponse) return session;

  try {
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
      .insert({
        jilid_id,
        judul,
        deskripsi: deskripsi || null,
        youtube_url,
        urutan: urutan ?? 0,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[POST /api/dashboard/pembelajaran-al-quran] Error:', err?.message);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Gagal menambah data' },
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
