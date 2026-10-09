'use client';

// src/app/wali/pembelajaran-al-quran/page.tsx
// Halaman Wali Murid: menampilkan daftar Jilid, dan saat jilid diklik
// baru menampilkan seluruh video pembelajaran pada jilid tersebut.

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, Play, Video as VideoIcon, ExternalLink, ChevronLeft, Layers } from 'lucide-react';
import type { JilidPembelajaran } from '@/types';

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const embedMatch = parsed.pathname.match(/\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function getThumbnailUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export default function WaliPembelajaranAlQuranPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jilidList, setJilidList] = useState<JilidPembelajaran[]>([]);
  const [selectedJilidId, setSelectedJilidId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/wali/login');
      return;
    }
    if (status !== 'authenticated' || !session?.user?.santri_id) return;
    fetchData();
  }, [status, session, router]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pembelajaran-al-quran');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gagal memuat data');
      }
      const data = await res.json();
      setJilidList(data.data ?? []);
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const selectedJilid = jilidList.find((j) => j.id === selectedJilidId) || null;
  const selectedVideos = selectedJilid?.pembelajaran_al_quran ?? [];

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat materi pembelajaran...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-slate-100">
          <VideoIcon size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Gagal Memuat Data</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Tampilan daftar Jilid ──────────────────────────────────────────────
  if (!selectedJilid) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <VideoIcon size={24} className="text-red-500" />
            Pembelajaran AL Qur&apos;an
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pilih jilid untuk melihat video pembelajaran
          </p>
        </div>

        {jilidList.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 font-semibold mb-1">Belum ada materi pembelajaran</h3>
            <p className="text-slate-500 text-sm">Materi akan ditampilkan di sini setelah ditambahkan oleh pengurus</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jilidList.map((jilid) => {
              const jumlah = jilid.pembelajaran_al_quran?.length ?? 0;
              return (
                <button
                  key={jilid.id}
                  onClick={() => setSelectedJilidId(jilid.id)}
                  className="group text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-emerald-200 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Layers size={22} className="text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-600 transition-colors">
                    {jilid.nama}
                  </h3>
                  {jilid.deskripsi && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{jilid.deskripsi}</p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Play size={12} /> {jumlah} video
                    </span>
                    <span className="text-xs font-medium text-emerald-600">Lihat →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Tampilan video dalam Jilid terpilih ────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => setSelectedJilidId(null)}
          className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-3 transition-colors"
        >
          <ChevronLeft size={16} /> Kembali ke daftar jilid
        </button>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers size={24} className="text-emerald-500" />
          {selectedJilid.nama}
        </h1>
        {selectedJilid.deskripsi && (
          <p className="text-slate-500 text-sm mt-1">{selectedJilid.deskripsi}</p>
        )}
      </div>

      {selectedVideos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm">
          <VideoIcon size={44} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-slate-900 font-semibold mb-1">Belum ada video di jilid ini</h3>
          <p className="text-slate-500 text-sm">Video akan ditampilkan setelah ditambahkan oleh pengurus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedVideos.map((item) => (
            <article
              key={item.id}
              className="group bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                {getThumbnailUrl(item.youtube_url) ? (
                  <Image
                    src={getThumbnailUrl(item.youtube_url)!}
                    alt={item.judul}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoIcon size={32} className="text-red-500" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={item.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-900 shadow-lg hover:bg-slate-50 transition-colors"
                  >
                    <Play size={16} className="text-red-500" />
                    <span>Tonton</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-emerald-600 transition-colors">
                  {item.judul}
                </h3>
                {item.deskripsi && (
                  <p className="text-sm text-slate-500 line-clamp-3">{item.deskripsi}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <VideoIcon size={12} className="text-red-500" />
                    YouTube
                  </span>
                  <a
                    href={item.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Play size={12} />
                    Tonton
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
