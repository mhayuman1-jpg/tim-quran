export const dynamic = 'force-dynamic';
// src/app/api/artikel/update/route.ts
// PUT (Kabid only): Update artikel, toggle is_published (set/unset published_at)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Hanya Kabid yang boleh mengupdate artikel
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan. Hanya Kabid yang dapat mengubah artikel.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, judul, konten, cover_url, is_published } = body;

    // Validasi id wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID artikel wajib diisi' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek apakah artikel ada
    const { data: existing, error: checkError } = await supabase
      .from('artikel')
      .select('id, is_published, published_at')
      .eq('id', id.trim())
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Artikel tidak ditemukan' },
        { status: 404 }
      );
    }

    // Bangun payload update — hanya field yang disertakan dalam request
     
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (judul !== undefined) {
      if (typeof judul !== 'string' || judul.trim() === '') {
        return NextResponse.json(
          { message: 'Judul artikel tidak boleh kosong' },
          { status: 400 }
        );
      }
      updatePayload.judul = judul.trim();
    }

    if (konten !== undefined) {
      if (typeof konten !== 'string' || konten.trim() === '') {
        return NextResponse.json(
          { message: 'Konten artikel tidak boleh kosong' },
          { status: 400 }
        );
      }
      updatePayload.konten = konten.trim();
    }

    if (cover_url !== undefined) {
      updatePayload.cover_url = cover_url?.trim() || null;
    }

    // Toggle is_published — atur published_at sesuai kondisi
    if (is_published !== undefined) {
      const nowPublished = Boolean(is_published);
      updatePayload.is_published = nowPublished;

      if (nowPublished && !existing.published_at) {
        // Terbitkan → set published_at ke sekarang
        updatePayload.published_at = new Date().toISOString();
      } else if (!nowPublished) {
        // Cabut terbit → hapus published_at
        updatePayload.published_at = null;
      }
      // Jika sudah published dan masih published → biarkan published_at lama
    }

    const { data, error } = await supabase
      .from('artikel')
      .update(updatePayload)
      .eq('id', id.trim())
      .select('id, judul, slug, cover_url, is_published, published_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase error updating artikel:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui artikel.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Artikel berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/artikel/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
