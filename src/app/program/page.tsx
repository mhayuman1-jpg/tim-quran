// src/app/program/page.tsx — Halaman Program Publik

import { BookOpen, Users, Star, Mic, Globe, Heart, Shield, Award } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import ProgramCard from '@/components/program/ProgramCard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Program — Tim Qur\'an',
  description: 'Program unggulan Tahfidz dan Tahsin Al-Qur\'an.',
};

interface Program {
  id: string;
  nama: string;
  deskripsi: string;
  icon: string;
  urutan: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Users, Star, Mic, Globe, Heart, Shield, Award,
};

async function getPrograms(): Promise<Program[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('program')
      .select('*')
      .eq('is_active', true)
      .order('urutan', { ascending: true });

    if (error) {
      console.error('[ProgramPage] Supabase error:', error.message);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('[ProgramPage] Fetch error:', error);
    return [];
  }
}

const CARD_STYLES = [
  { border: 'border-slate-700', icon: 'from-sky-500 to-cyan-400', bg: 'bg-slate-900' },
  { border: 'border-slate-700', icon: 'from-indigo-500 to-sky-500', bg: 'bg-slate-900' },
  { border: 'border-slate-700', icon: 'from-cyan-500 to-sky-600', bg: 'bg-slate-900' },
  { border: 'border-slate-700', icon: 'from-slate-500 to-indigo-500', bg: 'bg-slate-900' },
  { border: 'border-slate-700', icon: 'from-emerald-500 to-cyan-500', bg: 'bg-slate-900' },
  { border: 'border-slate-700', icon: 'from-sky-500 to-indigo-500', bg: 'bg-slate-900' },
];

export default async function ProgramPage() {
  const programs = await getPrograms();

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-cyan-200 text-sm font-semibold mb-4 border-cyan-500/20 bg-cyan-500/10">
          Program Kami
        </span>
        <h1 className="text-4xl font-bold text-white mb-4">Program Pembelajaran</h1>
        <p className="text-cyan-100/75 text-lg max-w-xl mx-auto">
          Program unggulan untuk membimbing santri menghafal dan membaca Al-Qur&apos;an dengan metode terbaik.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {programs.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen size={48} className="text-stone-200 mx-auto mb-4" />
            <p className="text-lg font-semibold text-stone-400">Belum ada program</p>
            <p className="text-sm text-stone-400 mt-1">Program akan ditampilkan setelah diaktifkan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map((p, i) => {
              const IconComp = ICON_MAP[p.icon] || BookOpen;
              const s = CARD_STYLES[i % CARD_STYLES.length];
              return (
                <ProgramCard
                  key={p.id}
                  id={p.id}
                  nama={p.nama}
                  deskripsi={p.deskripsi}
                  icon={p.icon}
                  badgeColor={s.icon}
                  borderClass={s.border}
                  backgroundClass={s.bg}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
