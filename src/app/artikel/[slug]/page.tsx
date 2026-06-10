// src/app/artikel/[slug]/page.tsx
// Halaman detail artikel publik

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Calendar, User, ArrowLeft, BookOpen } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { toImageUrl } from '@/lib/storage/urls';

export const dynamic = 'force-dynamic';

interface ArtikelDetail {
  id: string;
  judul: string;
  slug: string;
  konten: string;
  cover_url?: string | null;
  published_at: string | null;
  created_at: string;
  users?: { name: string }[] | null;
}

async function getArtikelBySlug(slug: string): Promise<ArtikelDetail | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('artikel')
      .select(`
        id,
        judul,
        slug,
        konten,
        cover_url,
        published_at,
        created_at,
        users:author_id ( name )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .limit(1);

    if (error) {
      console.error('[ArtikelDetailPage] Supabase error:', error.message);
      return null;
    }

    return data?.[0] ?? null;
  } catch (error) {
    console.error('[ArtikelDetailPage] Fetch error:', error);
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

// Konversi plain text lama menjadi HTML terstruktur
function plainTextToHtml(text: string): string {
  const lines = text.split('\n');
  const html: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      html.push(`<p>${paragraphLines.join('<br/>')}</p>`);
      paragraphLines = [];
    }
  };

  // Pola yang terlihat seperti heading (pendek, tidak ada titik di akhir, kapital awal/all-caps)
  const looksLikeHeading = (line: string) => {
    const t = line.trim();
    if (!t) return false;
    if (t.length > 80) return false; // heading tidak panjang
    if (t.endsWith('.') && t.split(' ').length > 6) return false;
    // Kata-kata heading umum
    const headingWords = ['pendahuluan','pengertian','tujuan','manfaat','kesimpulan','program','metode','peran','latar belakang','pembahasan','isi'];
    const lower = t.toLowerCase();
    return headingWords.some(w => lower.startsWith(w)) ||
      (t === t.toUpperCase() && t.length > 3) ||
      (/^[A-Z][a-zA-Z\s]+$/.test(t) && t.split(' ').length <= 5);
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    if (looksLikeHeading(line)) {
      flushParagraph();
      html.push(`<h2>${line}</h2>`);
    } else {
      paragraphLines.push(line);
    }
  }
  flushParagraph();
  return html.join('\n');
}

export default async function ArtikelDetailPage({ params }: { params: { slug: string } }) {
  const artikel = await getArtikelBySlug(params.slug);
  if (!artikel) notFound();

  const authorName = (artikel.users as any)?.[0]?.name ?? null;

  // Deteksi apakah konten HTML atau plain text
  const isHtml = /<[a-z][\s\S]*>/i.test(artikel.konten);
  const kontenHtml = isHtml ? artikel.konten : plainTextToHtml(artikel.konten);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/artikel"
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-amber-400/40 hover:text-slate-900">
          <ArrowLeft size={15} className="text-amber-600" />
          Kembali ke daftar artikel
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white px-4 py-2 text-xs uppercase tracking-[0.32em] text-amber-600">
          <BookOpen size={14} /> Artikel Qur'ani
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[32px] border border-amber-100 bg-white/95 shadow-[0_28px_120px_-50px_rgba(245,158,11,0.45)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative p-8 sm:p-10">
          <div className="mb-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs uppercase tracking-[0.28em] text-amber-600">
              <BookOpen size={14} /> Artikel
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white px-3 py-1 text-xs text-slate-600">
              <Calendar size={14} className="text-amber-600" />
              {formatDate(artikel.published_at ?? artikel.created_at)}
            </span>
            {authorName && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white px-3 py-1 text-xs text-slate-600">
                <User size={14} className="text-amber-600" />
                Oleh <strong className="text-slate-900">{authorName}</strong>
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            {artikel.judul}
          </h1>
          <p className="mt-5 max-w-3xl text-slate-700 leading-relaxed text-lg">
            Artikel ini menjelaskan bagaimana pembelajaran Al-Qur'an dapat berjalan lebih menarik, modern, dan berwawasan anak di lingkungan sekolah.
          </p>
        </div>

        {artikel.cover_url && (
          <div className="relative h-72 sm:h-[28rem] overflow-hidden border-t border-amber-100">
            <Image
              src={toImageUrl(artikel.cover_url) || ''}
              alt={artikel.judul}
              fill
              className="object-cover transition-transform duration-700 ease-out hover:scale-105"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-amber-50/90 via-transparent to-transparent" />
          </div>
        )}
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.42fr]">
        <article className="bg-white rounded-[28px] border border-amber-100 p-8 shadow-inner shadow-amber-900/5">
          <style>{`
            .artikel-konten h1 { font-size: 2rem; font-weight: 800; color: #1e293b; margin: 1.5em 0 0.7em; line-height: 1.2; border-bottom: 2px solid #fef3c7; padding-bottom: 0.35em; }
            .artikel-konten h2 { font-size: 1.7rem; font-weight: 700; color: #334155; margin: 1.6em 0 0.6em; line-height: 1.28; }
            .artikel-konten h3 { font-size: 1.25rem; font-weight: 700; color: #475569; margin: 1.3em 0 0.45em; }
            .artikel-konten p { font-size: 1.02rem; line-height: 1.95; color: #475569; margin: 0 0 1.4em; }
            .artikel-konten p:first-of-type { font-size: 1.05rem; color: #334155; }
            .artikel-konten ul, .artikel-konten ol { padding-left: 1.8em; margin: 1.1em 0 1.6em; color: #475569; }
            .artikel-konten li { line-height: 1.9; margin-bottom: 0.65em; }
            .artikel-konten blockquote { border-left: 4px solid #d97706; padding: 1em 1.2em; margin: 1.6em 0; background: rgba(217,119,6,0.08); border-radius: 0.75rem; font-style: italic; color: #334155; }
            .artikel-konten strong { font-weight: 700; color: #1e293b; }
            .artikel-konten em { font-style: italic; color: #1e293b; }
            .artikel-konten code { background: #fef3c7; color: #1e293b; padding: 0.28em 0.55em; border-radius: 0.45em; font-size: 0.95em; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
            .artikel-konten hr { border: none; border-top: 1px solid #fef3c7; margin: 2.2em 0; }
            .artikel-konten a { color: #d97706; text-decoration: underline; }
            .artikel-konten a:hover { color: #2563eb; }
            .artikel-konten img { max-width: 100%; border-radius: 1rem; margin: 1.4em 0; }
            .artikel-konten mark { background: #fef3c7; color: #334155; padding: 0.14em 0.3em; border-radius: 0.28rem; }
          `}</style>

          <div
            className="artikel-konten"
            dangerouslySetInnerHTML={{ __html: kontenHtml }}
          />
        </article>

        <aside className="hidden lg:block rounded-[28px] border border-amber-100 bg-white p-6 shadow-2xl shadow-amber-900/5">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Highlight</p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">Intisari Artikel</h2>
          <p className="mt-4 text-slate-600 leading-relaxed">Baca setiap bagian dengan nyaman, dari pendahuluan hingga kesimpulan, dengan tampilan fokus yang mendukung pembelajaran Qur'an modern.</p>
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-amber-100 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Kategori</p>
              <p className="mt-2 text-slate-900">Artikel</p>
            </div>
            <div className="rounded-3xl border border-amber-100 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Penulis</p>
              <p className="mt-2 text-slate-900">{authorName ?? 'Tim Qur’an'}</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 border-t border-amber-100 pt-6">
        <Link href="/artikel"
          className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400">
          <ArrowLeft size={14} />
          Lihat Artikel Lainnya
        </Link>
      </div>
    </div>
  );
}
