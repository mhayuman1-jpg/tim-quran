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

const ICON_GRADIENT_MAP: Record<string, string> = {
  'from-amber-500 to-amber-400': 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'from-indigo-500 to-amber-500': 'linear-gradient(135deg, #6366f1, #f59e0b)',
  'from-amber-500 to-amber-600': 'linear-gradient(135deg, #f59e0b, #d97706)',
  'from-slate-500 to-indigo-500': 'linear-gradient(135deg, #64748b, #6366f1)',
  'from-amber-500 to-indigo-500': 'linear-gradient(135deg, #f59e0b, #6366f1)',
};

export default function ProgramCard({ id, nama, deskripsi, icon, badgeColor, borderClass, backgroundClass }: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false);
  const IconComp = ICON_MAP[icon] || BookOpen;
  const iconBg = ICON_GRADIENT_MAP[badgeColor] || 'linear-gradient(135deg, #f59e0b, #fbbf24)';

  return (
    <div
      id={`program-${id}`}
      className={`group flex min-h-[300px] flex-col rounded-3xl border ${borderClass} ${backgroundClass} p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
      style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.06)' }}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div
          className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg"
          style={{ background: iconBg, boxShadow: '0 4px 16px rgba(245,158,11,0.2)' }}>
          <IconComp size={26} className="text-white" />
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em]"
          style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' }}>
          Program
        </span>
      </div>

      <div className="flex-1">
        <h2 className="font-semibold text-slate-900 text-xl mb-3">{nama}</h2>
        <p className="text-slate-600 text-sm leading-relaxed" style={expanded ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {deskripsi}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold transition"
        style={{ color: '#d97706' }}
        aria-expanded={expanded}
      >
        {expanded ? 'Tutup deskripsi' : 'Pelajari lebih lanjut'}
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full"
          style={{ background: '#fef3c7', color: '#d97706' }}>
          →
        </span>
      </button>
    </div>
  );
}
