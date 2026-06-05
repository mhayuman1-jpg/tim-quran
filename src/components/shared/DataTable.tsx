'use client';

// src/components/shared/DataTable.tsx
// Tabel generik dengan kolom yang dapat dikonfigurasi, loading skeleton, dan empty state.

import React from 'react';
import { Inbox } from 'lucide-react';

export interface ColumnDef<T> {
  /** Key unik kolom */
  key: string;
  /** Header label */
  header: string;
  /** Render cell; jika tidak diberikan, akses data[key] secara langsung */
  render?: (row: T, index: number) => React.ReactNode;
  /** Alignment cell (default: 'left') */
  align?: 'left' | 'center' | 'right';
  /** Lebar kolom, e.g. '10%', '120px' */
  width?: string;
  /** Class tambahan untuk <th> */
  headerClassName?: string;
  /** Class tambahan untuk <td> */
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  /** Callback untuk mendapatkan key unik per baris */
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Jumlah baris skeleton saat loading (default: 5) */
  skeletonRows?: number;
  /** Pesan saat data kosong */
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  /** Class tambahan untuk <table> */
  className?: string;
  /** Class tambahan untuk <tr> header */
  headerRowClassName?: string;
  /** Class tambahan untuk tiap <tr> data */
  rowClassName?: (row: T, index: number) => string;
  /** Callback klik baris */
  onRowClick?: (row: T) => void;
}

function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

// Skeleton row untuk loading state
function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'Tidak ada data yang tersedia.',
  emptyIcon,
  className = '',
  headerRowClassName = '',
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
      <table
        className={['w-full text-sm text-slate-700 border-collapse', className].join(' ')}
      >
        {/* Header */}
        <thead>
          <tr
            className={[
              'bg-slate-50 border-b border-slate-200',
              headerRowClassName,
            ].join(' ')}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={[
                  'px-4 py-3 font-semibold text-slate-600 whitespace-nowrap',
                  alignClass(col.align),
                  col.headerClassName ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            // Skeleton rows
            Array.from({ length: skeletonRows }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))
          ) : data.length === 0 ? (
            // Empty state
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-slate-400"
              >
                <div className="flex flex-col items-center gap-2">
                  {emptyIcon ?? (
                    <Inbox size={32} className="text-slate-300" />
                  )}
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            // Data rows
            data.map((row, index) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={[
                  'bg-white transition-colors',
                  onRowClick
                    ? 'cursor-pointer hover:bg-emerald-50'
                    : 'hover:bg-slate-50',
                  rowClassName ? rowClassName(row, index) : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={[
                      'px-4 py-3 whitespace-nowrap',
                      alignClass(col.align),
                      col.cellClassName ?? '',
                    ].join(' ')}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
