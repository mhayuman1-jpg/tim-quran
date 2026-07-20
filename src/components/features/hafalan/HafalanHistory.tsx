'use client';

// src/components/features/hafalan/HafalanHistory.tsx
// Tabel riwayat hafalan dengan filter tanggal
// Tabel terpisah per Juz (slide-like)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { SURAH_PER_JUZ } from '@/lib/surahData';

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

// ─── Juz reverse mapping ──────────────────────────────────────────────────────

// surah name -> possible juz numbers
const SURAH_TO_JUZ: Record<string, number[]> = {};
for (const [juzStr, surahs] of Object.entries(SURAH_PER_JUZ)) {
  const juz = Number(juzStr);
  for (const s of surahs) {
    if (!SURAH_TO_JUZ[s.nama]) SURAH_TO_JUZ[s.nama] = [];
    if (!SURAH_TO_JUZ[s.nama].includes(juz)) SURAH_TO_JUZ[s.nama].push(juz);
  }
}

/**
 * Group hafalan rows by juz.
 * Uses co-occurrence within each date to disambiguate surahs that appear in multiple juz.
 * Returns a sorted Map of juz -> rows, plus an array of ungroupable rows.
 */
function groupDataByJuz(rows: HafalanRow[]): { juzGroups: Map<number, HafalanRow[]>; ungrouped: HafalanRow[] } {
  // Step 1: group by date (use plain object to avoid ES5 Map iteration issues)
  const byDate: Record<string, HafalanRow[]> = {};
  for (const row of rows) {
    if (!byDate[row.tanggal]) byDate[row.tanggal] = [];
    byDate[row.tanggal].push(row);
  }

  // Step 2: for each date, determine juz per row using co-occurrence
  const juzGroups = new Map<number, HafalanRow[]>();
  const ungrouped: HafalanRow[] = [];

  const dateKeys = Object.keys(byDate);
  for (let di = 0; di < dateKeys.length; di++) {
    const dateRows = byDate[dateKeys[di]];
    // For each possible juz, count how many rows in this date group could belong to it
    const juzHitCount = new Map<number, number>();
    const rowPossibleJuz = new Map<string, number[]>();

    for (const row of dateRows) {
      const possible = SURAH_TO_JUZ[row.surah_juz];
      if (possible && possible.length > 0) {
        rowPossibleJuz.set(row.id, possible);
        for (const j of possible) {
          juzHitCount.set(j, (juzHitCount.get(j) ?? 0) + 1);
        }
      }
    }

    // Assign each row to its best juz
    for (const row of dateRows) {
      const possible = rowPossibleJuz.get(row.id);
      if (!possible || possible.length === 0) {
        ungrouped.push(row);
        continue;
      }
      if (possible.length === 1) {
        const juz = possible[0];
        const existing = juzGroups.get(juz) ?? [];
        existing.push(row);
        juzGroups.set(juz, existing);
      } else {
        // Pick the juz with the most hits in this date group; prefer higher juz on tie
        let bestJuz = possible[0];
        let bestCount = juzHitCount.get(bestJuz) ?? 0;
        for (const j of possible) {
          const c = juzHitCount.get(j) ?? 0;
          if (c > bestCount || (c === bestCount && j > bestJuz)) {
            bestJuz = j;
            bestCount = c;
          }
        }
        const existing = juzGroups.get(bestJuz) ?? [];
        existing.push(row);
        juzGroups.set(bestJuz, existing);
      }
    }
  }

  return { juzGroups, ungrouped };
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

  // ── Group data by juz ──
  const { juzGroups, ungrouped } = useMemo(() => {
    if (data.length === 0) return { juzGroups: new Map<number, HafalanRow[]>(), ungrouped: [] };
    return groupDataByJuz(data);
  }, [data]);

  const sortedJuz = useMemo(() => Array.from(juzGroups.keys()).sort((a, b) => a - b), [juzGroups]);

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

      {/* Tabel grouped by Juz */}
      {loading ? (
        <DataTable
          columns={columns}
          data={[]}
          rowKey={(row) => row.id}
          loading={true}
          skeletonRows={5}
          emptyMessage="Memuat data..."
        />
      ) : data.length === 0 ? (
        <DataTable
          columns={columns}
          data={[]}
          rowKey={(row) => row.id}
          loading={false}
          emptyMessage="Belum ada catatan hafalan."
        />
      ) : (
        <>
          {/* Per-juz sections */}
          {sortedJuz.map((juz) => {
            const rows = juzGroups.get(juz)!;
            return (
              <div key={juz} className="rounded-xl border border-amber-200 overflow-hidden">
                <div className="bg-amber-700 px-4 py-2.5 flex items-center gap-2">
                  <span className="text-white font-bold text-sm">Juz {juz}</span>
                  <span className="text-amber-200 text-xs">{rows.length} baris</span>
                </div>
                <DataTable
                  columns={columns}
                  data={rows}
                  rowKey={(row) => row.id}
                  loading={false}
                  emptyMessage={`Tidak ada data untuk Juz ${juz}.`}
                />
              </div>
            );
          })}

          {/* Ungrouped rows */}
          {ungrouped.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-600 px-4 py-2.5 flex items-center gap-2">
                <span className="text-white font-bold text-sm">Lainnya</span>
                <span className="text-slate-300 text-xs">{ungrouped.length} baris</span>
              </div>
              <DataTable
                columns={columns}
                data={ungrouped}
                rowKey={(row) => row.id}
                loading={false}
                emptyMessage="Tidak ada data."
              />
            </div>
          )}
        </>
      )}

      {/* Info jumlah data */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Menampilkan {data.length} catatan{sortedJuz.length > 0 ? ` dalam ${sortedJuz.length} Juz` : ''}
        </p>
      )}
    </div>
  );
}
