// src/app/agenda/page.tsx — Halaman Agenda Publik

import { Calendar, Clock, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Agenda — Tim Qur\'an',
  description: 'Jadwal dan agenda kegiatan Tim Qur\'an.',
};

interface Agenda {
  id: string;
  judul: string;
  deskripsi: string;
  tanggal: string;
  waktu_mulai?: string | null;
  waktu_selesai?: string | null;
  lokasi?: string | null;
  is_published: boolean;
}

async function getAgenda(): Promise<{ upcoming: Agenda[]; past: Agenda[] }> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agenda?select=*&is_published=eq.true&order=tanggal.asc`;
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return { upcoming: [], past: [] };
    const data: Agenda[] = await res.json();
    return {
      upcoming: data.filter(a => a.tanggal >= today),
      past: data.filter(a => a.tanggal < today).reverse(),
    };
  } catch {
    return { upcoming: [], past: [] };
  }
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatWaktu(t?: string | null) {
  return t ? t.slice(0, 5) : null;
}

function AgendaCard({ ag, past = false }: { ag: Agenda; past?: boolean }) {
  const mulai = formatWaktu(ag.waktu_mulai);
  const selesai = formatWaktu(ag.waktu_selesai);
  const waktu = mulai ? (selesai ? `${mulai} – ${selesai}` : mulai) : null;

  return (
    <div className={`flex gap-5 items-start p-6 rounded-2xl border transition-all hover:shadow-md ${
      past
        ? 'bg-stone-50 border-stone-100 opacity-70'
        : 'bg-white border-amber-100 hover:border-amber-300'
    }`}>
      {/* Tanggal badge */}
      <div className={`shrink-0 rounded-xl text-center p-3 min-w-[64px] ${
        past ? 'bg-stone-200' : 'bg-gradient-to-br from-amber-400 to-orange-400'
      }`}>
        <p className="text-white text-2xl font-bold leading-none">
          {new Date(ag.tanggal).getDate()}
        </p>
        <p className="text-white/80 text-xs font-medium mt-0.5">
          {new Date(ag.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
        </p>
        <p className="text-white/60 text-xs">
          {new Date(ag.tanggal).getFullYear()}
        </p>
      </div>

      {/* Konten */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-stone-800 text-base mb-1">{ag.judul}</h3>
        {ag.deskripsi && (
          <p className="text-stone-500 text-sm leading-relaxed mb-3">{ag.deskripsi}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-stone-400">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0 text-amber-500" />
            {formatTanggal(ag.tanggal)}
          </span>
          {waktu && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0 text-amber-500" />
              {waktu} WIB
            </span>
          )}
          {ag.lokasi && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-amber-500" />
              {ag.lokasi}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function AgendaPage() {
  const { upcoming, past } = await getAgenda();

  return (
    <div className="bg-amber-50 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-stone-900 via-amber-950 to-orange-900 py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-300 text-sm font-semibold mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }}>
          Jadwal Kegiatan
        </span>
        <h1 className="text-4xl font-bold text-white mb-4">Agenda</h1>
        <p className="text-amber-100/70 text-lg max-w-xl mx-auto">
          Event dan kegiatan mendatang yang dapat kamu ikuti bersama Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {/* Akan Datang */}
        <div>
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            Akan Datang
          </h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-amber-100">
              <Calendar size={40} className="text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">Belum ada agenda mendatang.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map(ag => <AgendaCard key={ag.id} ag={ag} />)}
            </div>
          )}
        </div>

        {/* Sudah Lewat */}
        {past.length > 0 && (
          <div>
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-stone-400" />
              Sudah Berlalu
            </h2>
            <div className="space-y-4">
              {past.map(ag => <AgendaCard key={ag.id} ag={ag} past />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
