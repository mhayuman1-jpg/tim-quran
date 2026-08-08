'use client';

// src/components/features/galeri/LightboxModal.tsx
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import Fade from 'embla-carousel-fade';
import { toImageUrl } from '@/lib/storage/urls';

export interface GaleriPhoto {
  id: string;
  judul: string;
  foto_url: string;
}

interface LightboxModalProps {
  open: boolean;
  onClose: () => void;
  photos: GaleriPhoto[];
  albumTitle: string;
}

export default function LightboxModal({ open, onClose, photos, albumTitle }: LightboxModalProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'center' },
    [
      Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
      Fade(),
    ]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
      if (e.key === 'ArrowRight') emblaApi?.scrollNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, emblaApi]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Tutup"
      >
        <X size={24} />
      </button>

      {/* Header */}
      <div className="absolute top-4 left-4 z-10 text-white">
        <p className="text-sm font-medium text-white/60">Album</p>
        <h2 className="text-lg font-bold">{albumTitle}</h2>
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium">
        {selectedIndex + 1} / {photos.length}
      </div>

      {/* Carousel */}
      <div className="relative w-full max-w-[90vw] max-h-[70vh]" ref={emblaRef}>
        <div className="flex h-full">
          {photos.map(photo => (
            <div key={photo.id} className="flex-[0_0_100%] min-w-0 flex items-center justify-center">
              <div className="relative w-full aspect-[4/3] max-h-[70vh]">
                <Image
                  src={toImageUrl(photo.foto_url) || ''}
                  alt={photo.judul}
                  fill
                  className="object-contain"
                  sizes="90vw"
                  priority
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Sebelumnya"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Selanjutnya"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === selectedIndex ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Caption */}
      {photos[selectedIndex] && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-white text-sm font-medium bg-black/40 px-4 py-1.5 rounded-full">
          {photos[selectedIndex].judul}
        </div>
      )}
    </div>
  );
}
