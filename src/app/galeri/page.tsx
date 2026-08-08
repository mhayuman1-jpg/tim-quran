// src/app/galeri/page.tsx — Halaman Galeri Publik (Album + Lightbox)

import { createServerClient } from '@/lib/supabase/server';
import { toImageUrl } from '@/lib/storage/urls';
import GaleriClient from './GaleriClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Galeri — Tim Qur\'an',
  description: 'Dokumentasi foto kegiatan Tim Qur\'an.',
};

interface AlbumRow {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  urutan: number;
  is_published: boolean;
  foto_count: number;
}

interface GaleriRow {
  id: string;
  judul: string;
  foto_url: string;
  album_id: string | null;
}

interface AlbumWithCover {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  foto_count: number;
  first_photo_url?: string;
}

interface GaleriPhoto {
  id: string;
  judul: string;
  foto_url: string;
}

async function getPageData() {
  try {
    const supabase = createServerClient();

    // Fetch published albums with photo count
    const { data: albumData } = await supabase
      .from('album')
      .select('*, galeri(count)')
      .eq('is_published', true)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    const albums: AlbumWithCover[] = [];

    if (albumData) {
      for (const row of albumData) {
        const count = row.galeri?.[0]?.count ?? 0;
        // Skip empty albums if desired, or show them with 0 count
        // Get first photo as fallback cover
        let firstPhotoUrl: string | undefined;
        if (!row.cover_url && count > 0) {
          const { data: firstPhoto } = await supabase
            .from('galeri')
            .select('foto_url')
            .eq('album_id', row.id)
            .eq('is_published', true)
            .order('urutan', { ascending: true })
            .limit(1)
            .maybeSingle();
          firstPhotoUrl = firstPhoto?.foto_url;
        }

        albums.push({
          id: row.id,
          judul: row.judul,
          deskripsi: row.deskripsi,
          cover_url: row.cover_url,
          foto_count: count,
          first_photo_url: firstPhotoUrl,
        });
      }
    }

    // Fetch published uncategorized photos (backward compat)
    const { data: uncategorized } = await supabase
      .from('galeri')
      .select('id, judul, foto_url')
      .eq('is_published', true)
      .is('album_id', null)
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: false });

    return { albums, uncategorized: (uncategorized ?? []) as GaleriPhoto[] };
  } catch (error) {
    console.error('[GaleriPage] Fetch error:', error);
    return { albums: [], uncategorized: [] };
  }
}

export default async function GaleriPage() {
  const { albums, uncategorized } = await getPageData();

  return <GaleriClient albums={albums} uncategorized={uncategorized} />;
}
