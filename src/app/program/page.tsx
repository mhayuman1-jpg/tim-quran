// src/app/program/page.tsx — Halaman Program Publik

import { BookOpen, Users, Star, Mic, Globe, Heart, Shield, Award } from 'lucide-react';

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
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/program?select=*&is_active=eq.true&order=urutan.asc`;
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

const CARD_STYLES = [
  { border: 'border-amber-200', icon: 'from-amber-400 to-orange-400', bg: 'bg-amber-50' },
  { border: 'border-orange-200', icon: 'from-orange-400 to-red-400', bg: 'bg-orange-50' },
  { border: 'border-yellow-200', icon: 'from-yellow-400 to-amber-400', bg: 'bg-yellow-50' },
  { border: 'border-red-200', icon: 'from-red-400 to-orange-400', bg: 'bg-red-50' },
  { border: 'border-green-200', icon: 'from-green-400 to-emerald-400', bg: 'bg-green-50' },
  { border: 'border-blue-200', icon: 'from-blue-400 to-indigo-400', bg: 'bg-blue-50' },
];

export default async function ProgramPage() {
  const programs = await getPrograms();

  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-stone-900 via-amber-950 to-orange-900 py-20 px-6 text-center">
        <span className="inline-block px-4 py-1 rounded-full border text-amber-300 text-sm font-semibold mb-4"
          style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' }}>
          Program Kami
        </span>
        <h1 className="text-4xl font-bold text-white mb-4">Program Pembelajaran</h1>
        <p className="text-amber-100/70 text-lg max-w-xl mx-auto">
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
                <div key={p.id}
                  className={`group rounded-2xl p-7 border ${s.border} ${s.bg} hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                  <div className={`w-14 h-14 rounded-2xl mb-5 bg-gradient-to-br ${s.icon} shadow-md flex items-center justify-center`}>
                    <IconComp size={26} className="text-white" />
                  </div>
                  <h2 className="font-bold text-stone-800 text-xl mb-3">{p.nama}</h2>
                  <p className="text-stone-500 leading-relaxed">{p.deskripsi}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
