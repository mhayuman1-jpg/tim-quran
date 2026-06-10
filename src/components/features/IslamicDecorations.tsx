'use client';

/**
 * Islamic decorative components: calligraphy, ornaments, patterns
 */

export function Bismillah() {
  return (
    <div className="flex flex-col items-center justify-center select-none" dir="rtl">
      <svg width="220" height="64" viewBox="0 0 220 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <text x="110" y="44" textAnchor="middle"
          fontFamily="var(--font-amiri), 'Amiri', 'Traditional Arabic', serif"
          fontSize="38" fontWeight="700" fill="url(#goldGrad)"
          className="animate-fade-in">
          بسم الله الرحمن الرحيم
        </text>
      </svg>
      {/* Small ornamental line */}
      <div className="mt-1 h-[2px] w-32 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />
    </div>
  );
}

export function BismillahSmall() {
  return (
    <div className="select-none" dir="rtl">
      <span
        className="text-xl font-arabic text-amber-600 drop-shadow-sm"
        style={{ fontFamily: 'var(--font-amiri), Amiri, Traditional Arabic, serif' }}
      >
        ﷽
      </span>
    </div>
  );
}

interface OrnamentalDividerProps {
  className?: string;
}

export function OrnamentalDivider({ className = '' }: OrnamentalDividerProps) {
  return (
    <div className={`flex items-center justify-center gap-3 select-none ${className}`}>
      <svg width="60" height="16" viewBox="0 0 60 16" className="opacity-60">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor="currentColor" className="text-amber-400/60" />
          </linearGradient>
        </defs>
        <path d="M0 8 Q15 0 30 8 Q45 16 60 8" stroke="url(#g1)" strokeWidth="1.5" fill="none" />
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" className="text-amber-400/70">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
      </svg>
      <svg width="60" height="16" viewBox="0 0 60 16" className="opacity-60">
        <defs>
          <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" className="text-amber-400/60" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path d="M0 8 Q15 -8 30 8 Q45 24 60 8" stroke="url(#g2)" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  );
}

interface IslamicPatternProps {
  className?: string;
  opacityLight?: boolean;
}

export function IslamicPatternBg({ className = '', opacityLight = false }: IslamicPatternProps) {
  const opClass = opacityLight ? 'opacity-[0.02]' : 'opacity-[0.04]';
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}>
      {/* Overlapping geometric circles */}
      <svg className={`absolute -right-20 -top-20 w-80 h-80 ${opClass}`} viewBox="0 0 400 400">
        <defs>
          <pattern id="islamicPat" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="1" fill="none" className="text-amber-400" />
            <circle cx="40" cy="40" r="20" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-amber-400" />
            <rect x="12" y="12" width="56" height="56" stroke="currentColor" strokeWidth="0.5" fill="none" className="text-amber-400" transform="rotate(45 40 40)" />
            <line x1="12" y1="40" x2="68" y2="40" stroke="currentColor" strokeWidth="0.3" className="text-amber-400" />
            <line x1="40" y1="12" x2="40" y2="68" stroke="currentColor" strokeWidth="0.3" className="text-amber-400" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#islamicPat)" />
      </svg>
      {/* 8-pointed star */}
      <svg className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.02] animate-arabesque-spin`} viewBox="0 0 200 200">
        <polygon points="100,0 123,38 162,50 138,77 150,117 115,105 100,140 85,105 50,117 62,77 38,50 77,38" fill="currentColor" className="text-amber-400" />
      </svg>
    </div>
  );
}

export function CornerOrnament({ className = '' }: IslamicPatternProps) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 40 40">
      <path d="M2 38 L2 2 L38 2" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-amber-400/50" />
      <path d="M6 34 L6 6 L34 6" stroke="currentColor" strokeWidth="0.8" fill="none" className="text-amber-400/30" />
      <circle cx="2" cy="2" r="3" fill="currentColor" className="text-amber-400/40" />
    </svg>
  );
}
