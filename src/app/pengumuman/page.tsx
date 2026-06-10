import { Megaphone } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pengumuman — Tim Qur\'an',
  description: 'Pengumuman dan informasi terbaru dari Tim Qur\'an.',
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
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pengumuman')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[PengumumanPage] Supabase error:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[PengumumanPage] Fetch error:', error);
    return [];
  }
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

const TARGET_COLORS: Record<string, string> = {
  Semua: 'bg-amber-100 text-amber-900 border-amber-200',
  Santri: 'bg-amber-100 text-amber-900 border-amber-200',
  'Orang Tua': 'bg-amber-100 text-amber-900 border-amber-200',
  Guru: 'bg-violet-100 text-violet-900 border-violet-200',
};

export default async function PengumumanPage() {
  const list = await getPengumuman();

  return (
    <div className="bg-amber-50 min-h-screen text-slate-800">
      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-white py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-600 text-sm font-semibold mb-4 border-amber-500/20 bg-amber-500/10">
          Info Terkini
        </span>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Pengumuman</h1>
        <p className="text-slate-700 text-lg max-w-xl mx-auto">
          Informasi dan pengumuman terbaru dari Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {list.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-amber-100">
            <Megaphone size={48} className="text-amber-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-800">Belum ada pengumuman</p>
            <p className="text-sm text-slate-500 mt-1">Pengumuman akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((p) => {
              const colorClass = TARGET_COLORS[p.target] ?? 'bg-amber-100 text-slate-800 border-amber-100';
              return (
                <details key={p.id} className="group bg-white rounded-3xl border border-amber-100 transition-all hover:border-amber-400 hover:shadow-xl">
                  <summary className="flex items-center justify-between gap-4 px-7 py-6 cursor-pointer">
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg leading-snug">{p.judul}</h2>
                      <p className="text-slate-500 text-sm mt-1">Klik untuk melihat detail pengumuman</p>
                    </div>
                    <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-medium ${colorClass}`}>
                      {p.target}
                    </span>
                  </summary>
                  <div className="px-7 pb-7 border-t border-amber-100 text-slate-600 space-y-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">{p.isi}</p>
                    <p className="text-xs text-slate-500">{formatTanggal(p.created_at)}</p>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
