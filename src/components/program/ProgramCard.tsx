'use client';

import { useState } from 'react';
import { BookOpen, Users, Star, Mic, Globe, Heart, Shield, Award } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Users,
  Star,
  Mic,
  Globe,
  Heart,
  Shield,
  Award,
};

interface ProgramCardProps {
  id: string;
  nama: string;
  deskripsi: string;
  icon: string;
  badgeColor: string;
  borderClass: string;
  backgroundClass: string;
}

export default function ProgramCard({ id, nama, deskripsi, icon, badgeColor, borderClass, backgroundClass }: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false);
  const IconComp = ICON_MAP[icon] || BookOpen;

  return (
    <div
      id={`program-${id}`}
      className={`group flex min-h-[300px] flex-col rounded-3xl border ${borderClass} ${backgroundClass} p-6 shadow-lg shadow-slate-950/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className={`w-14 h-14 rounded-3xl ${badgeColor} shadow-lg shadow-slate-950/30 flex items-center justify-center`}>
          <IconComp size={26} className="text-white" />
        </div>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.24em] text-sky-300/80">Program</span>
      </div>

      <div className="flex-1">
        <h2 className="font-semibold text-white text-xl mb-3">{nama}</h2>
        <p className={`text-slate-300 text-sm leading-relaxed ${expanded ? '' : 'line-clamp-4'}`}>
          {deskripsi}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 transition group-hover:text-cyan-300"
        aria-expanded={expanded}
      >
        {expanded ? 'Tutup deskripsi' : 'Pelajari lebih lanjut'}
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80 text-slate-200">→</span>
      </button>
    </div>
  );
}
