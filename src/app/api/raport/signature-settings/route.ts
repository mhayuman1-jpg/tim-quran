// src/app/api/raport/signature-settings/route.ts
// GET : ambil pengaturan nama/NIY Kabid & Kepala Sekolah yang tersimpan (cukup diisi sekali).
// PUT : simpan/perbarui pengaturan tersebut — dipanggil otomatis saat guru menyimpan raport.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ROW_ID = 'default';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('raport_signature_settings')
      .select('nama_kabid, niy_kabid, nama_kepala_sekolah, niy_kepala_sekolah')
      .eq('id', ROW_ID)
      .maybeSingle();

    if (error) {
      console.error('Signature settings GET error:', error);
      return NextResponse.json({ message: 'Gagal mengambil pengaturan.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? null }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/raport/signature-settings:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { nama_kabid, niy_kabid, nama_kepala_sekolah, niy_kepala_sekolah } = body;

    const update: Record<string, unknown> = { id: ROW_ID, updated_at: new Date().toISOString() };
    if (nama_kabid !== undefined) update.nama_kabid = nama_kabid?.trim() || null;
    if (niy_kabid !== undefined) update.niy_kabid = niy_kabid?.trim() || null;
    if (nama_kepala_sekolah !== undefined) update.nama_kepala_sekolah = nama_kepala_sekolah?.trim() || null;
    if (niy_kepala_sekolah !== undefined) update.niy_kepala_sekolah = niy_kepala_sekolah?.trim() || null;

    const supabase = createServerClient();
    const { error } = await supabase.from('raport_signature_settings').upsert(update, { onConflict: 'id' });

    if (error) {
      console.error('Signature settings PUT error:', error);
      return NextResponse.json({ message: 'Gagal menyimpan pengaturan.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pengaturan berhasil disimpan.' }, { status: 200 });
  } catch (error) {
    console.error('Route error PUT /api/raport/signature-settings:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
