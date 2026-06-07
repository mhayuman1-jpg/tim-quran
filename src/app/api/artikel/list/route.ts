export const dynamic = 'force-dynamic';
// src/app/api/artikel/list/route.ts
// GET: Ambil daftar artikel
// - published=true  → halaman publik, tanpa auth, hanya artikel yang sudah diterbitkan
// - tanpa param     → panel admin (auth required), semua artikel

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const supabase = createServerClient();

    if (publishedOnly) {
      // Halaman publik — tanpa autentikasi, hanya artikel yang diterbitkan
      const { data, error } = await supabase
        .from('artikel')
        .select(`
          id,
          judul,
          slug,
          konten,
          cover_url,
          is_published,
          published_at,
          created_at,
          updated_at,
          users:author_id ( name )
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching public artikel:', error);
        return NextResponse.json(
          { message: 'Gagal mengambil daftar artikel.', error: error.message },
          { status: 500 }
        );
      }

      const result = (data ?? []).map((item: Record<string, unknown>) => {
        const usersField = item.users as { name: string } | null;
        return {
          id: item.id,
          judul: item.judul,
          slug: item.slug,
          konten: item.konten,
          cover_url: item.cover_url,
          is_published: item.is_published,
          published_at: item.published_at,
          created_at: item.created_at,
          updated_at: item.updated_at,
          author_name: usersField?.name ?? 'Unknown',
        };
      });

      return NextResponse.json({ data: result }, { status: 200 });
    }

    // Panel admin — wajib autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('artikel')
      .select(`
        id,
        judul,
        slug,
        cover_url,
        is_published,
        published_at,
        created_at,
        updated_at,
        users:author_id ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching admin artikel:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil daftar artikel.', error: error.message },
        { status: 500 }
      );
    }

    const result = (data ?? []).map((item: Record<string, unknown>) => {
      const usersField = item.users as { name: string } | null;
      return {
        id: item.id,
        judul: item.judul,
        slug: item.slug,
        cover_url: item.cover_url,
        is_published: item.is_published,
        published_at: item.published_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        author_name: usersField?.name ?? 'Unknown',
      };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/artikel/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
