// src/app/api/dashboard/jilid-pembelajaran/[id]/route.ts
// PUT: Update Jilid pembelajaran
// DELETE: Hapus Jilid (video di dalamnya ikut terhapus - ON DELETE CASCADE)

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
      .update({
        nama: String(nama).trim(),
        deskripsi: deskripsi || null,
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
    console.error('[PUT /api/dashboard/jilid-pembelajaran] Error:', err?.message);
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
      .from('jilid_pembelajaran')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err: any) {
    console.error('[DELETE /api/dashboard/jilid-pembelajaran] Error:', err?.message);
    return NextResponse.json(
      { success: false, message: err?.message ?? 'Gagal menghapus data' },
      { status: 500 }
    );
  }
}
