// src/app/galeri/page.tsx — Halaman Galeri Publik

import Image from 'next/image';
import { Camera } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { toImageUrl } from '@/lib/storage/urls';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Galeri — Tim Qur\'an',
  description: 'Dokumentasi foto kegiatan Tim Qur\'an.',
};

interface GaleriItem {
  id: string;
  judul: string;
  foto_url: string;
  is_published: boolean;
}

async function getGaleri(): Promise<GaleriItem[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('galeri')
      .select('id,judul,foto_url,is_published')
      .eq('is_published', true)
      .order('urutan', { ascending: true });

    if (error) {
      console.error('[GaleriPage] Supabase error:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[GaleriPage] Fetch error:', error);
    return [];
  }
}

export default async function GaleriPage() {
  const galeri = await getGaleri();

  return (
    <div className="bg-amber-50 min-h-screen text-slate-800">
      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-white py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-600 text-sm font-semibold mb-4 border-amber-500/20 bg-amber-500/10">
          Dokumentasi
        </span>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Galeri</h1>
        <p className="text-slate-700 text-lg max-w-xl mx-auto">
          Kumpulan foto kegiatan dan dokumentasi aktivitas Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {galeri.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
            <Camera size={48} className="text-amber-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-600">Belum ada foto galeri</p>
            <p className="text-sm text-slate-500 mt-1">Foto kegiatan akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galeri.map(item => (
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
                  <h2 className="text-base font-semibold text-slate-900 mb-2">{item.judul}</h2>
                  <p className="text-sm text-slate-500">Foto dokumentasi kegiatan Tim Qur&apos;an.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
