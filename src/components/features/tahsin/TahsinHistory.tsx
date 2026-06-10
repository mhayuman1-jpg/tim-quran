'use client';

// src/components/features/tahsin/TahsinHistory.tsx
// Tabel riwayat tahsin dengan filter tanggal
// Kolom: Tanggal, Nama Siswa, Metode, Buku, Halaman, Catatan, (tombol edit)

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Pencil, RotateCcw } from 'lucide-react';
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
  edited_fields?: Record<string, string> | null;
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
  /** Callback saat reset dilakukan */
  onReset?: () => void;
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

function formatEditTimestamp(isoStr: string): string {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function EditIndicator({ editedFields, field }: { editedFields?: Record<string, string> | null; field: string }) {
  const ts = editedFields?.[field];
  if (!ts) return null;
  return (
    <span className="block text-[10px] text-amber-500 mt-0.5" title={`Terakhir diedit: ${formatEditTimestamp(ts)}`}>
      edit: {formatDate(ts.split('T')[0])}
    </span>
  );
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
  onReset,
}: TahsinHistoryProps) {
  const [data, setData] = useState<TahsinRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

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

  const handleReset = async () => {
    if (!studentId) return;
    if (!window.confirm('Yakin ingin mereset semua jurnal tahsin siswa ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/tahsin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.message ?? 'Gagal mereset jurnal.');
        return;
      }

      alert(json.message ?? 'Jurnal berhasil direset.');
      fetchTahsin();
      onReset?.();
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setResetting(false);
    }
  };

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
              className="text-left font-medium text-slate-800 hover:text-amber-600 transition-colors"
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
        <span className="text-slate-600">{row.makhroj || '—'}<EditIndicator editedFields={row.edited_fields} field="makhroj" /></span>
      ),
    },
    {
      key: 'kelancaran',
      header: 'Kelancaran',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.kelancaran || '—'}<EditIndicator editedFields={row.edited_fields} field="kelancaran" /></span>
      ),
    },
    {
      key: 'adab',
      header: 'Adab',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.adab || '—'}<EditIndicator editedFields={row.edited_fields} field="adab" /></span>
      ),
    },
    {
      key: 'buku',
      header: 'Buku',
      render: (row) => (
        <span className="text-slate-700">{row.buku || <em className="text-slate-300">—</em>}<EditIndicator editedFields={row.edited_fields} field="buku" /></span>
      ),
    },
    {
      key: 'halaman',
      header: 'Halaman',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.halaman ?? '—'}<EditIndicator editedFields={row.edited_fields} field="halaman" /></span>
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
          <EditIndicator editedFields={row.edited_fields} field="catatan" />
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
          {studentId && (
            <div className="flex items-end ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                loading={resetting}
                leftIcon={<RotateCcw size={14} />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Reset Jurnal
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
