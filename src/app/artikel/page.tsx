// src/app/(public)/artikel/page.tsx
// Daftar artikel publik — tanpa autentikasi
// Tampilkan cover, judul, tanggal terbit; diurutkan terbaru

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, BookOpen } from 'lucide-react';

interface ArtikelPublik {
  id: string;
  judul: string;
  slug: string;
  cover_url?: string | null;
  published_at: string;
  author_name: string;
}

async function getArtikelPublik(): Promise<ArtikelPublik[]> {
  try {
    // Base URL untuk Server Component fetch
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/artikel/list?published=true`, {
      next: { revalidate: 60 }, // revalidate setiap 60 detik
    });

    if (!res.ok) return [];

    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const metadata = {
  title: 'Artikel — Tim Qur\'an',
  description: 'Baca artikel dan berita terbaru seputar program Qur\'an.',
};

export default async function ArtikelPublikPage() {
  const artikelList = await getArtikelPublik();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Artikel</h1>
        <p className="text-slate-500 mt-2">
          Baca artikel dan berita terbaru seputar program Qur&apos;an.
        </p>
      </div>

      {artikelList.length === 0 ? (
        // Empty state
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen size={48} className="text-slate-300 mb-4" />
          <p className="text-lg font-semibold text-slate-500">Belum ada artikel</p>
          <p className="text-sm text-slate-400 mt-1">
            Artikel akan ditampilkan di sini setelah diterbitkan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {artikelList.map((artikel) => (
            <Link
              key={artikel.id}
              href={`/artikel/${artikel.slug}`}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Cover image */}
              <div className="relative h-48 bg-slate-100">
                {artikel.cover_url ? (
                  <Image
                    src={artikel.cover_url}
                    alt={artikel.judul}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen size={36} className="text-slate-300" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h2 className="text-base font-semibold text-slate-800 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                  {artikel.judul}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar size={12} className="shrink-0" />
                  <span>{formatDate(artikel.published_at)}</span>
                </div>
                {artikel.author_name && (
                  <p className="text-xs text-slate-400">
                    Oleh {artikel.author_name}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
