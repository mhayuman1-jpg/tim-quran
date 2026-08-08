'use client';

// src/components/features/galeri/AlbumCard.tsx
import Image from 'next/image';
import { Images } from 'lucide-react';
import { toImageUrl } from '@/lib/storage/urls';

export interface AlbumWithCover {
  id: string;
  judul: string;
  deskripsi?: string;
  cover_url: string | null;
  foto_count: number;
  first_photo_url?: string;
}

interface AlbumCardProps {
  album: AlbumWithCover;
  onClick: () => void;
}

export default function AlbumCard({ album, onClick }: AlbumCardProps) {
  const coverSrc = album.cover_url
    ? toImageUrl(album.cover_url)
    : album.first_photo_url
      ? toImageUrl(album.first_photo_url)
      : null;

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-3xl overflow-hidden bg-white shadow-lg border border-amber-100 hover:shadow-xl hover:shadow-amber-900/5 hover:scale-[1.02] transition-all duration-300"
    >
      <div className="aspect-[4/3] relative bg-amber-100">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={album.judul}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Images size={48} className="text-amber-300" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-white font-bold text-lg leading-tight">{album.judul}</h3>
          <p className="text-white/70 text-sm mt-1">{album.foto_count} foto</p>
        </div>
      </div>
    </div>
  );
}
