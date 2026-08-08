'use client';

// src/components/features/galeri/AlbumGrid.tsx
import AlbumCard, { type AlbumWithCover } from './AlbumCard';
import { Images } from 'lucide-react';

interface AlbumGridProps {
  albums: AlbumWithCover[];
  onAlbumClick: (album: AlbumWithCover) => void;
}

export default function AlbumGrid({ albums, onAlbumClick }: AlbumGridProps) {
  if (albums.length === 0) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
        <Images size={48} className="text-amber-300 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-600">Belum ada album</p>
        <p className="text-sm text-slate-500 mt-1">Album foto kegiatan akan ditampilkan di sini.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {albums.map(album => (
        <AlbumCard key={album.id} album={album} onClick={() => onAlbumClick(album)} />
      ))}
    </div>
  );
}
