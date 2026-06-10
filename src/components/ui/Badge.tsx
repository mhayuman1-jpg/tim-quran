'use client';

// src/components/ui/Badge.tsx
// Badge dengan variant warna: green=Aktif, red=Nonaktif, blue=info, yellow=warning, gray=netral

type BadgeVariant = 'gold' | 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'orange' | 'purple' | 'amber';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  gold:  'bg-amber-100 text-amber-700 ring-amber-200',
  green:  'bg-amber-100 text-amber-700 ring-amber-200',
  red:    'bg-red-100 text-red-700 ring-red-200',
  blue:   'bg-blue-100 text-blue-700 ring-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200',
  gray:   'bg-slate-100 text-slate-600 ring-slate-200',
  purple: 'bg-purple-100 text-purple-700 ring-purple-200',
  amber:  'bg-amber-100 text-amber-700 ring-amber-200',
};

export default function Badge({
  variant = 'gray',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

/**
 * Helper: kembalikan variant Badge berdasarkan status string umum.
 * Contoh: getStatusBadgeVariant('Aktif') → 'green'
 */
export function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Aktif':
      return 'gold';
    case 'Nonaktif':
      return 'red';
    case 'Hadir':
      return 'gold';
    case 'Tidak Hadir':
      return 'red';
    default:
      return 'blue';
  }
}
