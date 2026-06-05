// src/app/(public)/artikel/[slug]/page.tsx
// Detail artikel publik — tanpa autentikasi

import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, User } from 'lucide-react';

interface ArtikelDetail {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  cover_url?: string | null;
  published_at: string;
  author_name: string;
}

async function getArtikelBySlug(slug: string): Promise<ArtikelDetail | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');

    const res = await fetch(`${baseUrl}/api/artikel/list?published=true`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    const artikelList: ArtikelDetail[] = json.data ?? [];

    return artikelList.find((a) => a.slug === slug) ?? null;
  } catch {
    return null;
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

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const artikel = await getArtikelBySlug(params.slug);
  if (!artikel) {
    return { title: 'Artikel tidak ditemukan — Tim Qur\'an' };
  }
  return {
    title: `${artikel.judul} — Tim Qur'an`,
    description: artikel.konten.substring(0, 150),
  };
}

export default async function ArtikelDetailPage({ params }: PageProps) {
  const artikel = await getArtikelBySlug(params.slug);

  if (!artikel) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-700 transition-colors"
        >
          <ArrowLeft size={15} />
          Kembali ke daftar artikel
        </Link>
      </div>

      {/* Cover image */}
      {artikel.cover_url && (
        <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden mb-8 bg-slate-100">
          <Image
            src={artikel.cover_url}
            alt={artikel.judul}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      {/* Article header */}
      <div className="mb-8 space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
          {artikel.judul}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} className="shrink-0" />
            {formatDate(artikel.published_at)}
          </span>
          {artikel.author_name && (
            <span className="flex items-center gap-1.5">
              <User size={14} className="shrink-0" />
              {artikel.author_name}
            </span>
          )}
        </div>

        <hr className="border-slate-200" />
      </div>

      {/* Article content */}
      <article className="prose prose-slate prose-emerald max-w-none">
        {/* Render konten sebagai plain text dengan whitespace dipertahankan */}
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
          {artikel.konten}
        </div>
      </article>

      {/* Footer nav */}
      <div className="mt-12 pt-6 border-t border-slate-200">
        <Link
          href="/artikel"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
        >
          <ArrowLeft size={15} />
          Baca artikel lainnya
        </Link>
      </div>
    </div>
  );
}
