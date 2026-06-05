// src/app/api/artikel/add/route.ts
// POST (Kabid only): Buat artikel baru
// Slug di-generate otomatis dari judul (lowercase, spasi → tanda hubung, hapus karakter spesial)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Generate slug dari judul:
 * - lowercase
 * - spasi/garis bawah/titik → tanda hubung
 * - hapus karakter non-alphanumeric selain tanda hubung
 * - hapus tanda hubung berulang dan di awal/akhir
 */
function generateSlug(judul: string): string {
  return judul
    .toLowerCase()
    .replace(/[\s_\.]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Hanya Kabid yang boleh membuat artikel
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan. Hanya Kabid yang dapat membuat artikel.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { judul, konten, cover_url } = body;

    // Validasi field wajib
    if (!judul || typeof judul !== 'string' || judul.trim() === '') {
      return NextResponse.json(
        { message: 'Judul artikel wajib diisi' },
        { status: 400 }
      );
    }
    if (!konten || typeof konten !== 'string' || konten.trim() === '') {
      return NextResponse.json(
        { message: 'Konten artikel wajib diisi' },
        { status: 400 }
      );
    }

    const trimmedJudul = judul.trim();
    let slug = generateSlug(trimmedJudul);

    if (!slug) {
      return NextResponse.json(
        { message: 'Judul artikel tidak valid untuk dijadikan slug' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Pastikan slug unik — tambahkan timestamp jika sudah ada
    const { data: existingSlug } = await supabase
      .from('artikel')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const { data, error } = await supabase
      .from('artikel')
      .insert({
        judul: trimmedJudul,
        konten: konten.trim(),
        slug,
        cover_url: cover_url?.trim() || null,
        author_id: session.user.id,
        is_published: false,
        published_at: null,
      })
      .select('id, judul, slug, cover_url, is_published, published_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase error inserting artikel:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan artikel.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Artikel berhasil ditambahkan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/artikel/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
