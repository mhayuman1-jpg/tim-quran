'use client';

// src/app/galeri/GaleriClient.tsx
import { useState } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import AlbumGrid from '@/components/features/galeri/AlbumGrid';
import LightboxModal, { type GaleriPhoto } from '@/components/features/galeri/LightboxModal';
import { type AlbumWithCover } from '@/components/features/galeri/AlbumCard';
import { toImageUrl } from '@/lib/storage/urls';

interface Props {
  albums: AlbumWithCover[];
  uncategorized: GaleriPhoto[];
}

export default function GaleriClient({ albums, uncategorized }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<GaleriPhoto[]>([]);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const openAlbum = async (album: AlbumWithCover) => {
    // Fetch photos for this album
    try {
      const res = await fetch(`/api/website/galeri?all=true`);
      const j = await res.json();
      const allPhotos: any[] = j.data ?? [];
      const albumPhotos: GaleriPhoto[] = allPhotos
        .filter((p: any) => p.album_id === album.id && p.is_published)
        .map((p: any) => ({ id: p.id, judul: p.judul, foto_url: p.foto_url }));

      if (albumPhotos.length === 0) return;
      setLightboxPhotos(albumPhotos);
      setLightboxTitle(album.judul);
      setLightboxOpen(true);
    } catch {
      // silently fail
    }
  };

  const hasContent = albums.length > 0 || uncategorized.length > 0;

  return (
    <div className="bg-amber-50 min-h-screen text-slate-800">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-white py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-600 text-sm font-semibold mb-4 border-amber-500/20 bg-amber-500/10">
          Dokumentasi
        </span>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Galeri Kegiatan</h1>
        <p className="text-slate-700 text-lg max-w-xl mx-auto">
          Kumpulan foto kegiatan dan dokumentasi aktivitas Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {/* Albums Section */}
        <section>
          <AlbumGrid albums={albums} onAlbumClick={openAlbum} />
        </section>

        {/* Uncategorized Photos (backward compat) */}
        {uncategorized.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Foto Lainnya</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {uncategorized.map(item => (
                <div key={item.id} className="group overflow-hidden rounded-3xl bg-white shadow-lg border border-amber-100 hover:shadow-amber-900/5 transition-all">
                  <div className="relative aspect-[4/3] bg-amber-100">
                    <Image
                      src={toImageUrl(item.foto_url) || ''}
                      alt={item.judul}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-semibold text-slate-900">{item.judul}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Combined empty state */}
        {!hasContent && (
          <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
            <Camera size={48} className="text-amber-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-600">Belum ada foto galeri</p>
            <p className="text-sm text-slate-500 mt-1">Foto kegiatan akan ditampilkan di sini.</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <LightboxModal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={lightboxPhotos}
        albumTitle={lightboxTitle}
      />
    </div>
  );
}
