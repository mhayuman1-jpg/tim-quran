// src/app/api/dashboard/jilid-pembelajaran/route.ts
// GET: Ambil daftar Jilid pembelajaran (admin - untuk Kabid)
// POST: Tambah Jilid baru

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireAuth(request, ['Kabid']);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('jilid_pembelajaran')
      .select('*, pembelajaran_al_quran(id)')
      .order('urutan', { ascending: true });

    if (error) throw error;

    const result = (data || []).map((jilid: any) => {
      const videos = jilid.pembelajaran_al_quran || [];
      const { pembelajaran_al_quran: _pembelajaran_al_quran, ...rest } = jilid;
      return { ...rest, jumlah_video: videos.length };
    });

    return NextResponse.json({
      data: result,
      error: null,
    });
  } catch (err: any) {
    console.error('[GET /api/dashboard/jilid-pembelajaran] Error:', err?.message);
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
    const { nama, deskripsi, urutan, is_active } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json(
        { success: false, message: 'Nama jilid wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('jilid_pembelajaran')
      .insert({
        nama: String(nama).trim(),
        deskripsi: deskripsi || null,
        urutan: urutan ?? 0,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[POST /api/dashboard/jilid-pembelajaran] Error:', err?.message);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Gagal menambah data' },
      { status: 500 }
    );
  }
}
