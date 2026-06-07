// src/app/artikel/page.tsx
// Daftar artikel publik - tanpa autentikasi
// Fetch langsung ke Supabase REST API dari server component

import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, User } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Artikel - Tim Qur'an",
  description: "Baca artikel dan berita terbaru seputar program Qur'an.",
};

interface ArtikelPublik {
  id: string;
  judul: string;
  slug: string;
  cover_url?: string | null;
  published_at: string | null;
  created_at: string;
  konten?: string | null;
  users?: { name: string }[] | null;
}

async function getArtikelPublik(): Promise<ArtikelPublik[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('artikel')
      .select(`
        id,
        judul,
        slug,
        cover_url,
        konten,
        published_at,
        created_at,
        users:author_id ( name )
      `)
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('[ArtikelPublikPage] Supabase error:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ArtikelPublikPage] Fetch error:', error);
    return [];
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso ?? '';
  }
}

function getSnippet(konten: string | null | undefined): string {
  if (!konten) return '';
  const plain = konten.replace(/<[^>]+>/g, '').trim();
  return plain.length > 120 ? `${plain.slice(0, 120)}...` : plain;
}

export default async function ArtikelPublikPage() {
  const artikelList = await getArtikelPublik();

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(6,182,212,0.2),transparent_28%)]" />
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1 text-cyan-200 text-sm font-semibold mb-4">
            <BookOpen size={14} /> Artikel
          </span>
          <h1 className="text-4xl font-bold text-white mb-4">Artikel</h1>
          <p className="text-cyan-100/75 text-lg max-w-xl mx-auto">
            Baca artikel dan berita terbaru seputar program Qur'an.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {artikelList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center bg-slate-900 rounded-3xl border border-slate-800">
            <BookOpen size={48} className="text-cyan-300 mb-4" />
            <p className="text-lg font-semibold text-slate-100">Belum ada artikel</p>
            <p className="text-sm text-slate-400 mt-1">Artikel akan ditampilkan di sini setelah diterbitkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {artikelList.map((artikel) => {
              const authorName = (artikel.users as any)?.[0]?.name ?? null;
              return (
                <Link
                  key={artikel.id}
                  href={`/artikel/${artikel.slug}`}
                  className="group overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/95 shadow-xl shadow-slate-950/20 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative h-48 bg-slate-800 overflow-hidden">
                    {artikel.cover_url ? (
                      <Image
                        src={artikel.cover_url}
                        alt={artikel.judul}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen size={36} className="text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-90" />
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-400 uppercase tracking-[0.3em]">
                      <span className="rounded-full bg-slate-800/80 px-3 py-1">Artikel</span>
                      <span className="text-cyan-300">{formatDate(artikel.published_at ?? artikel.created_at)}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-white line-clamp-2 group-hover:text-cyan-300 transition-colors">{artikel.judul}</h2>
                    {artikel.konten && (
                      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">{getSnippet(artikel.konten)}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User size={12} className="shrink-0" />
                      <span>{authorName ?? 'Tim Qur’an'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
