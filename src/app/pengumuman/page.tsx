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
  Semua: 'bg-cyan-100 text-cyan-900 border-cyan-200',
  Santri: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  'Orang Tua': 'bg-sky-100 text-sky-900 border-sky-200',
  Guru: 'bg-violet-100 text-violet-900 border-violet-200',
};

export default async function PengumumanPage() {
  const list = await getPengumuman();

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-cyan-200 text-sm font-semibold mb-4 border-cyan-500/20 bg-cyan-500/10">
          Info Terkini
        </span>
        <h1 className="text-4xl font-bold text-white mb-4">Pengumuman</h1>
        <p className="text-cyan-100/75 text-lg max-w-xl mx-auto">
          Informasi dan pengumuman terbaru dari Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {list.length === 0 ? (
          <div className="text-center py-24 bg-slate-900 rounded-3xl border border-slate-800">
            <Megaphone size={48} className="text-cyan-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-100">Belum ada pengumuman</p>
            <p className="text-sm text-slate-400 mt-1">Pengumuman akan ditampilkan di sini.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((p) => {
              const colorClass = TARGET_COLORS[p.target] ?? 'bg-slate-800 text-slate-100 border-slate-700';
              return (
                <details key={p.id} className="group bg-slate-900 rounded-3xl border border-slate-800 transition-all hover:border-cyan-400 hover:shadow-xl">
                  <summary className="flex items-center justify-between gap-4 px-7 py-6 cursor-pointer">
                    <div>
                      <h2 className="font-bold text-white text-lg leading-snug">{p.judul}</h2>
                      <p className="text-slate-400 text-sm mt-1">Klik untuk melihat detail pengumuman</p>
                    </div>
                    <span className={`shrink-0 text-xs px-3 py-1 rounded-full border font-medium ${colorClass}`}>
                      {p.target}
                    </span>
                  </summary>
                  <div className="px-7 pb-7 border-t border-slate-800 text-slate-300 space-y-4">
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
