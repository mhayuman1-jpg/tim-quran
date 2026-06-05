// src/app/pengumuman/page.tsx — Halaman Pengumuman Publik

import { Megaphone } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Info & Pengumuman — Tim Qur\'an',
  description: 'Pengumuman dan informasi terkini dari Tim Qur\'an.',
};

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  target: string;
  created_at: string;
}

async function getPengumuman(): Promise<Pengumuman[]> {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pengumuman?select=*&order=created_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

const TARGET_COLORS: Record<string, string> = {
  Semua: 'bg-amber-100 text-amber-700 border-amber-200',
  Santri: 'bg-green-100 text-green-700 border-green-200',
  'Orang Tua': 'bg-blue-100 text-blue-700 border-blue-200',
  Guru: 'bg-purple-100 text-purple-700 border-purple-200',
};

export default async function PengumumanPage() {
  const list = await getPengumuman();

  return (
    <div className="bg-amber-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-stone-900 via-amber-950 to-orange-900 py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-300 text-sm font-semibold mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }}>
          Info Terkini
        </span>
        <h1 className="text-4xl font-bold text-white mb-4">Pengumuman</h1>
        <p className="text-amber-100/70 text-lg max-w-xl mx-auto">
          Informasi dan pengumuman terbaru dari Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {list.length === 0 ? (
          <div className="text-center py-24">
            <Megaphone size={48} className="text-stone-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-stone-400">Belum ada pengumuman</p>
            <p className="text-sm text-stone-400 mt-1">Pengumuman akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((p) => {
              const colorClass = TARGET_COLORS[p.target] ?? 'bg-stone-100 text-stone-600 border-stone-200';
              return (
                <div key={p.id}
                  className="bg-white rounded-2xl p-7 border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="font-bold text-stone-800 text-lg leading-snug">{p.judul}</h2>
                    <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-medium ${colorClass}`}>
                      {p.target}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-relaxed mb-4 whitespace-pre-line">{p.isi}</p>
                  <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">{formatTanggal(p.created_at)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
