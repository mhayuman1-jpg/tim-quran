'use client';

// src/components/ui/Badge.tsx
// Badge dengan variant warna: green=Aktif, red=Nonaktif, blue=info, yellow=warning, gray=netral

type BadgeVariant = 'green' | 'red' | 'blue' | 'yellow' | 'gray' | 'orange';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-emerald-100 text-emerald-700 ring-emerald-200',
  red:    'bg-red-100 text-red-700 ring-red-200',
  blue:   'bg-blue-100 text-blue-700 ring-blue-200',
  yellow: 'bg-yellow-100 text-yellow-700 ring-yellow-200',
  orange: 'bg-orange-100 text-orange-700 ring-orange-200',
  gray:   'bg-slate-100 text-slate-600 ring-slate-200',
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
      return 'green';
    case 'Nonaktif':
      return 'red';
    case 'Hadir':
      return 'green';
    case 'Tidak Hadir':
      return 'red';
    case 'Izin':
    case 'Sakit':
      return 'yellow';
    default:
      return 'blue';
  }
}
