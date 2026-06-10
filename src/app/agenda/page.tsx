// src/app/agenda/page.tsx — Halaman Agenda Publik

import { Calendar, Clock, MapPin } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

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
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agenda')
      .select('*')
      .eq('is_published', true)
      .order('tanggal', { ascending: true });

    if (error) {
      console.error('[AgendaPage] Supabase error:', error.message);
      return { upcoming: [], past: [] };
    }

    const agendaList: Agenda[] = Array.isArray(data) ? data : [];
    return {
      upcoming: agendaList.filter(a => a.tanggal >= today),
      past: agendaList.filter(a => a.tanggal < today).reverse(),
    };
  } catch (error) {
    console.error('[AgendaPage] Fetch error:', error);
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
    <div className={`flex gap-5 items-start p-6 rounded-3xl border transition-all hover:shadow-xl ${
      past
        ? 'bg-white border-amber-100/80 opacity-95'
        : 'bg-white border-amber-100 hover:border-amber-400/50'
    }`}>
      {/* Tanggal badge */}
      <div className={`shrink-0 rounded-3xl text-center p-4 min-w-[72px] ${
        past ? 'bg-amber-100/90' : 'bg-gradient-to-br from-amber-500 to-amber-500'
      }`}>
        <p className="text-slate-900 text-2xl font-bold leading-none">
          {new Date(ag.tanggal).getDate()}
        </p>
        <p className="text-slate-900/90 text-xs font-semibold mt-0.5">
          {new Date(ag.tanggal).toLocaleDateString('id-ID', { month: 'short' })}
        </p>
        <p className="text-slate-900/70 text-[11px]">
          {new Date(ag.tanggal).getFullYear()}
        </p>
      </div>

      {/* Konten */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 text-base mb-2">{ag.judul}</h3>
        {ag.deskripsi && (
          <p className="text-slate-600 text-sm leading-relaxed mb-4">{ag.deskripsi}</p>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar size={12} className="shrink-0 text-amber-600" />
            {formatTanggal(ag.tanggal)}
          </span>
          {waktu && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="shrink-0 text-amber-600" />
              {waktu} WIB
            </span>
          )}
          {ag.lokasi && (
            <span className="flex items-center gap-1.5">
              <MapPin size={12} className="shrink-0 text-amber-600" />
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
    <div className="bg-amber-50 min-h-screen text-slate-800">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-white py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-600 text-sm font-semibold mb-4 border-amber-200 bg-white/80">
          Jadwal Kegiatan
        </span>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Agenda</h1>
        <p className="text-slate-700 text-lg max-w-2xl mx-auto">
          Event dan kegiatan mendatang yang dapat kamu ikuti bersama Tim Qur&apos;an.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        {/* Akan Datang */}
        <div>
          <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-5 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            Akan Datang
          </h2>
          {upcoming.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-amber-100">
              <Calendar size={40} className="text-amber-600 mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Belum ada agenda mendatang.</p>
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
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-5 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
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
