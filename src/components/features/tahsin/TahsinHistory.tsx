'use client';

// src/components/features/tahsin/TahsinHistory.tsx
// Tabel riwayat tahsin dengan filter tanggal
// Kolom: Tanggal, Nama Siswa, Metode, Buku, Halaman, Catatan, (tombol edit)

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Pencil } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import type { TahsinMetode } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TahsinRow {
  id: string;
  student_id: string;
  teacher_id: string;
  tanggal: string;
  metode: TahsinMetode;
  buku?: string | null;
  halaman?: number | null;
  makhroj?: string | null;
  kelancaran?: string | null;
  adab?: string | null;
  catatan?: string | null;
  created_at?: string;
  santri?: { id: string; nama: string } | null;
  users?: { id: string; name: string } | null;
}

interface TahsinHistoryProps {
  /** Filter by student_id (opsional) */
  studentId?: string;
  /** Callback saat tombol edit diklik */
  onEdit?: (tahsin: TahsinRow) => void;
  /** Callback saat nama siswa diklik */
  onSelectStudent?: (student: { id: string; nama: string }) => void;
  /** Key untuk trigger refetch dari parent */
  refreshKey?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Warna badge per metode */
function metodeVariant(metode: TahsinMetode): 'green' | 'blue' | 'red' {
  if (metode === 'Wafa') return 'green';
  if (metode === 'IWR') return 'blue';
  return 'red'; // Al-Quran
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TahsinHistory({
  studentId,
  onEdit,
  onSelectStudent,
  refreshKey = 0,
}: TahsinHistoryProps) {
  const [data, setData] = useState<TahsinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter tanggal
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTahsin = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (studentId) params.set('student_id', studentId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/tahsin/list?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'Gagal mengambil data tahsin.');
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      setError('Terjadi kesalahan saat memuat data.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, dateFrom, dateTo, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTahsin();
  }, [fetchTahsin]);

  // ── Kolom tabel
  const columns: ColumnDef<TahsinRow>[] = [
    {
      key: 'tanggal',
      header: 'Tanggal',
      width: '120px',
      render: (row) => (
        <span className="text-slate-600 whitespace-nowrap">
          {formatDate(row.tanggal)}
        </span>
      ),
    },
  ];

  if (!studentId) {
    columns.push({
      key: 'nama_siswa',
      header: 'Nama Siswa',
      render: (row) => {
        const name = row.santri?.nama ?? '—';
        if (row.santri?.id && onSelectStudent) {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStudent({ id: row.santri!.id, nama: row.santri!.nama });
              }}
              className="text-left font-medium text-slate-800 hover:text-emerald-600 transition-colors"
            >
              {name}
            </button>
          );
        }
        return <span className="font-medium text-slate-800">{name}</span>;
      },
    });
  }

  columns.push(
    {
      key: 'metode',
      header: 'Metode',
      width: '110px',
      render: (row) => (
        <Badge variant={metodeVariant(row.metode)}>
          {row.metode}
        </Badge>
      ),
    },
    {
      key: 'makhroj',
      header: 'Makhroj',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.makhroj || '—'}</span>
      ),
    },
    {
      key: 'kelancaran',
      header: 'Kelancaran',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.kelancaran || '—'}</span>
      ),
    },
    {
      key: 'adab',
      header: 'Adab',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.adab || '—'}</span>
      ),
    },
    {
      key: 'buku',
      header: 'Buku',
      render: (row) => (
        <span className="text-slate-700">{row.buku || <em className="text-slate-300">—</em>}</span>
      ),
    },
    {
      key: 'halaman',
      header: 'Halaman',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.halaman ?? '—'}</span>
      ),
    },
    {
      key: 'catatan',
      header: 'Catatan',
      render: (row) => (
        <span
          className="text-slate-500 text-xs max-w-xs truncate block"
          title={row.catatan ?? ''}
        >
          {row.catatan || <em className="text-slate-300">—</em>}
        </span>
      ),
    },
  );

  // Tambahkan kolom aksi jika ada callback edit
  if (onEdit) {
    columns.push({
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      width: '80px',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          leftIcon={<Pencil size={14} />}
          aria-label={`Edit tahsin ${row.buku}`}
        >
          Edit
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
      {/* Filter tanggal */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 text-slate-500">
          <CalendarDays size={16} />
          <span className="text-sm font-medium">Filter Tanggal:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input
            type="date"
            label="Dari"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            wrapperClassName="min-w-[160px]"
          />
          <Input
            type="date"
            label="Sampai"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            wrapperClassName="min-w-[160px]"
          />
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Reset Filter
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabel */}
      <DataTable
        columns={columns}
        data={data}
        rowKey={(row) => row.id}
        loading={loading}
        skeletonRows={5}
        emptyMessage="Belum ada catatan tahsin."
      />

      {/* Info jumlah data */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Menampilkan {data.length} catatan
        </p>
      )}
    </div>
  );
}
