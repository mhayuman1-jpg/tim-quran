'use client';

// src/components/features/tahfidz/TahfidzHistory.tsx
// Tabel riwayat tahfidz harian dengan filter tanggal

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Pencil } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getNilaiColor } from '@/lib/surahData';
import type { Tahfidz } from '@/types';

interface TahfidzHistoryProps {
  studentId?: string;
  onEdit?: (tahfidz: Tahfidz) => void;
  refreshKey?: number;
}

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

export default function TahfidzHistory({
  studentId,
  onEdit,
  refreshKey = 0,
}: TahfidzHistoryProps) {
  const [data, setData] = useState<Tahfidz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTahfidz = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (studentId) params.set('student_id', studentId);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`/api/tahfidz/list?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.message ?? 'Gagal mengambil data tahfidz.');
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
  }, [studentId, dateFrom, dateTo]);

  useEffect(() => {
    fetchTahfidz();
  }, [fetchTahfidz, refreshKey]);

  const columns: ColumnDef<Tahfidz>[] = [
    {
      key: 'tanggal',
      header: 'Tanggal',
      width: '120px',
      render: (row) => (
        <span className="text-slate-600 whitespace-nowrap">{formatDate(row.tanggal)}</span>
      ),
    },
    {
      key: 'nama_siswa',
      header: 'Nama Siswa',
      render: (row) => (
        <span className="font-medium text-slate-800">{(row as any).santri?.nama ?? '—'}</span>
      ),
    },
    {
      key: 'surah_juz',
      header: 'Surah / Juz',
      render: (row) => <span className="text-slate-700">{row.surah_juz || '—'}</span>,
    },
    {
      key: 'makhroj',
      header: 'Makhroj',
      width: '110px',
      render: (row) => <span className={getNilaiColor(row.makhroj)}>{row.makhroj || '—'}</span>,
    },
    {
      key: 'tajwid',
      header: 'Tajwid',
      width: '110px',
      render: (row) => <span className={getNilaiColor(row.tajwid)}>{row.tajwid || '—'}</span>,
    },
    {
      key: 'lancar',
      header: 'Kelancaran',
      width: '120px',
      render: (row) => <span className={getNilaiColor(row.lancar)}>{row.lancar || '—'}</span>,
    },
    {
      key: 'halaman',
      header: 'Halaman',
      align: 'center',
      width: '90px',
      render: (row) => <span className="text-slate-600">{row.halaman ?? '—'}</span>,
    },
    {
      key: 'catatan',
      header: 'Catatan',
      render: (row) => (
        <span className="text-slate-500 text-xs max-w-xs truncate block" title={row.catatan ?? ''}>
          {row.catatan || <em className="text-slate-300">—</em>}
        </span>
      ),
    },
  ];

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
          aria-label={`Edit tahfidz ${row.surah_juz}`}
        >
          Edit
        </Button>
      ),
    });
  }

  return (
    <div className="space-y-4">
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

      {error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          emptyMessage="Belum ada catatan tahfidz."
          rowKey={(row) => row.id}
        />
      )}
    </div>
  );
}
