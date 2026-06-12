'use client';

// src/components/features/hafalan/HafalanHistory.tsx
// Tabel riwayat hafalan dengan filter tanggal
// Kolom: Tanggal, Nama Siswa, Surah/Juz, Halaman, Catatan, (tombol edit)

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HafalanRow {
  id: string;
  student_id: string;
  teacher_id: string;
  tanggal: string;
  surah_juz: string;
  halaman: number;
  makhroj?: string | null;
  tajwid?: string | null;
  lancar?: string | null;
  catatan?: string | null;
  buku?: string | null;
  created_at?: string;
  sort_order?: number;
  edited_fields?: Record<string, string> | null;
  santri?: { id: string; nama: string } | null;
  users?: { id: string; name: string } | null;
}

interface HafalanHistoryProps {
  /** Filter by student_id (opsional) */
  studentId?: string;
  /** Filter by class_id (opsional) */
  classId?: string;
  /** Callback saat tombol edit diklik */
  onEdit?: (hafalan: HafalanRow) => void;
  /** Callback saat tombol hapus diklik */
  onDelete?: (hafalan: HafalanRow) => void;
  /** Callback saat nama siswa diklik */
  onSelectStudent?: (student: { id: string; nama: string }) => void;
  /** Key untuk trigger refetch dari parent */
  refreshKey?: number;
  /** Callback saat reset dilakukan */
  onReset?: () => void;
  /** Callback saat data dimuat, memberikan jumlah record */
  onDataLoaded?: (count: number) => void;
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
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HafalanHistory({
  studentId,
  classId,
  onEdit,
  onDelete,
  onSelectStudent,
  refreshKey = 0,
  onReset,
  onDataLoaded,
}: HafalanHistoryProps) {
  const [data, setData] = useState<HafalanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  // Filter tanggal
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHafalan = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (studentId) params.set('student_id', studentId);
      if (classId) params.set('class_id', classId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/hafalan/list?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'Gagal mengambil data hafalan.');
        setData([]);
        onDataLoaded?.(0);
      } else {
        const fetchedData = json.data ?? [];
        setData(fetchedData);
        onDataLoaded?.(fetchedData.length);
      }
    } catch {
      setError('Terjadi kesalahan saat memuat data.');
      setData([]);
      onDataLoaded?.(0);
    } finally {
      setLoading(false);
    }
  }, [studentId, classId, dateFrom, dateTo, refreshKey, onDataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHafalan();
  }, [fetchHafalan]);

  const handleReset = async () => {
    if (!studentId) return;
    if (!window.confirm('Yakin ingin mereset semua jurnal hafalan siswa ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/hafalan/reset', {
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
      fetchHafalan();
      onReset?.();
    } catch {
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setResetting(false);
    }
  };

  // ── Kolom tabel
  const columns: ColumnDef<HafalanRow>[] = [
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
      key: 'surah_juz',
      header: 'Surah / Juz',
      render: (row) => (
        <span className="text-slate-700">{row.surah_juz}</span>
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
      key: 'tajwid',
      header: 'Tajwid',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.tajwid || '—'}<EditIndicator editedFields={row.edited_fields} field="tajwid" /></span>
      ),
    },
    {
      key: 'lancar',
      header: 'Lancar',
      align: 'center',
      width: '90px',
      render: (row) => (
        <span className="text-slate-600">{row.lancar || '—'}<EditIndicator editedFields={row.edited_fields} field="lancar" /></span>
      ),
    },
    {
      key: 'halaman',
      header: 'Ayat',
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
        <span className="text-slate-500 text-xs max-w-xs truncate block" title={row.catatan ?? ''}>
          {row.catatan || <em className="text-slate-300">—</em>}
          <EditIndicator editedFields={row.edited_fields} field="catatan" />
        </span>
      ),
    },
  );

  // Tambahkan kolom aksi jika ada callback edit atau delete
  if (onEdit || onDelete) {
    columns.push({
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      width: '100px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
              leftIcon={<Pencil size={14} />}
              aria-label={`Edit hafalan ${row.surah_juz}`}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row);
              }}
              leftIcon={<Trash2 size={14} />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              aria-label={`Hapus hafalan ${row.surah_juz}`}
            >
              Hapus
            </Button>
          )}
        </div>
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
        emptyMessage="Belum ada catatan hafalan."
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
