'use client';

// src/components/features/hafalan/HafalanHistory.tsx
// Tabel riwayat hafalan dengan filter tanggal
// Tabel terpisah per Juz (slide-like)

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { SURAH_PER_JUZ, SURAH_ALQURAN_LIST } from '@/lib/surahData';

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

function getTodayWITA(): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Makassar',
  }).format(new Date());
}

function EditIndicator({ editedFields: _editedFields, field: _field }: { editedFields?: Record<string, string> | null; field: string }) {
  return null;
}

// ─── Juz mapping — tiap surah → tepat satu juz ──────────────────────────────
// Iterasi 30→1: surah yang muncul di banyak juz (misal Juz 25 & 30)
// hanya dipetakan ke juz TERTINGGI (Juz 30), sehingga tidak ambigu.
const SURAH_TO_JUZ: Record<string, number> = {};
for (let j = 30; j >= 1; j--) {
  const surahs = SURAH_PER_JUZ[j] ?? [];
  for (const s of surahs) {
    if (!(s.nama in SURAH_TO_JUZ)) {
      SURAH_TO_JUZ[s.nama] = j;
    }
  }
}

/**
 * Group hafalan rows by juz.
 * Setiap surah dipetakan ke tepat satu juz (yang tertinggi dari template),
 * sehingga tidak perlu co-occurrence disambiguation.
 */
function groupDataByJuz(rows: HafalanRow[]): { juzGroups: Map<number, HafalanRow[]>; ungrouped: HafalanRow[] } {
  const juzGroups = new Map<number, HafalanRow[]>();
  const ungrouped: HafalanRow[] = [];

  for (const row of rows) {
    const juz = SURAH_TO_JUZ[row.surah_juz];
    if (juz !== undefined) {
      const existing = juzGroups.get(juz) ?? [];
      existing.push(row);
      juzGroups.set(juz, existing);
    } else {
      ungrouped.push(row);
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

  const [customSlides, setCustomSlides] = useState<Array<{
    id: number;
    juz: string;
    rows: Array<{ id: number; nama_surah: string; makhroj: string; tajwid: string; lancar: string; halaman: string }>;
  }>>([]);

  const createEmptySlideRow = () => ({
    id: Date.now() + Math.random(),
    nama_surah: '',
    makhroj: '',
    tajwid: '',
    lancar: '',
    halaman: '',
  });

  const handleAddSlideJuz = () => {
    setCustomSlides((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        juz: '',
        rows: [createEmptySlideRow()],
      },
    ]);
  };

  const updateCustomSlideJuz = (slideId: number, juz: string) => {
    setCustomSlides((prev) => prev.map((slide) => {
      if (slide.id !== slideId) return slide;

      if (!juz) {
        return {
          ...slide,
          juz: '',
          rows: [createEmptySlideRow()],
        };
      }

      const templateRows = (SURAH_PER_JUZ[Number(juz)] ?? []).map((surah, index) => ({
        id: Date.now() + index + slideId,
        nama_surah: surah.nama,
        makhroj: '',
        tajwid: '',
        lancar: '',
        halaman: '',
      }));

      return {
        ...slide,
        juz,
        rows: templateRows.length > 0 ? templateRows : [createEmptySlideRow()],
      };
    }));
  };

  const addCustomSlideRow = (slideId: number) => {
    setCustomSlides((prev) => prev.map((slide) => (
      slide.id === slideId ? { ...slide, rows: [...slide.rows, createEmptySlideRow()] } : slide
    )));
  };

  const updateCustomSlideRow = (slideId: number, rowId: number, field: string, value: string) => {
    setCustomSlides((prev) => prev.map((slide) => {
      if (slide.id !== slideId) return slide;
      return {
        ...slide,
        rows: slide.rows.map((row) => (
          row.id === rowId ? { ...row, [field]: value } : row
        )),
      };
    }));
  };

  const removeCustomSlide = (slideId: number) => {
    setCustomSlides((prev) => prev.filter((slide) => slide.id !== slideId));
  };

  const removeCustomSlideRow = (slideId: number, rowId: number) => {
    setCustomSlides((prev) => prev.map((slide) => {
      if (slide.id !== slideId) return slide;
      const nextRows = slide.rows.filter((row) => row.id !== rowId);
      return { ...slide, rows: nextRows.length > 0 ? nextRows : [createEmptySlideRow()] };
    }));
  };

  // Modal Tambah Surah
  const [addSurahOpen, setAddSurahOpen] = useState(false);
  const [addSurahForm, setAddSurahForm] = useState({ surah_juz: '', ayat: '', tanggal: getTodayWITA(), catatan: '' });
  const [addSurahLoading, setAddSurahLoading] = useState(false);
  const [addSurahError, setAddSurahError] = useState<string | null>(null);

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

  const handleAddSurah = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !addSurahForm.surah_juz.trim()) {
      setAddSurahError('Surah / Juz wajib diisi.');
      return;
    }

    setAddSurahLoading(true);
    setAddSurahError(null);

    try {
      const res = await fetch('/api/hafalan/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          tanggal: addSurahForm.tanggal || getTodayWITA(),
          surah_juz: addSurahForm.surah_juz.trim(),
          halaman: addSurahForm.ayat.trim() || null,
          catatan: addSurahForm.catatan.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setAddSurahError(json.message ?? 'Gagal menambahkan surah.');
        return;
      }

      setAddSurahOpen(false);
      setAddSurahForm({ surah_juz: '', ayat: '', tanggal: getTodayWITA(), catatan: '' });
      fetchHafalan();
      onReset?.();
    } catch {
      setAddSurahError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setAddSurahLoading(false);
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

  // ── Deduplicate per surah_juz (keep latest) then group by juz ──
  const { juzGroups, ungrouped } = useMemo(() => {
    if (data.length === 0) return { juzGroups: new Map<number, HafalanRow[]>(), ungrouped: [] };

    // Deduplicate: for each surah_juz, keep only the latest record (by tanggal + created_at)
    const latestBySurah = new Map<string, HafalanRow>();
    for (const row of data) {
      const key = row.surah_juz;
      const existing = latestBySurah.get(key);
      if (!existing) {
        latestBySurah.set(key, row);
      } else {
        // Compare tanggal first, then created_at as tiebreaker
        const rowDate = row.tanggal ?? '';
        const existDate = existing.tanggal ?? '';
        if (rowDate > existDate || (rowDate === existDate && (row.created_at ?? '') > (existing.created_at ?? ''))) {
          latestBySurah.set(key, row);
        }
      }
    }

    return groupDataByJuz(Array.from(latestBySurah.values()));
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
            <div className="flex items-end ml-auto gap-2">
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
              <button
                type="button"
                onClick={handleAddSlideJuz}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
              >
                <Plus size={14} />
                Tambah Slide Juz
              </button>
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

      {customSlides.map((slide, slideIndex) => (
        <div key={slide.id} className="rounded-xl border border-amber-200 overflow-hidden bg-white">
          <div className="bg-amber-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm">Slide {slideIndex + 1}</span>
              {slide.juz && <span className="text-amber-200 text-xs">Juz {slide.juz}</span>}
            </div>
            <button
              type="button"
              onClick={() => removeCustomSlide(slide.id)}
              className="text-amber-200 hover:text-white transition-colors"
              aria-label="Hapus slide"
              title="Hapus slide"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700">Template Juz</label>
              <select
                value={slide.juz}
                onChange={(e) => updateCustomSlideJuz(slide.id, e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">— Pilih Template Juz —</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                  <option key={juz} value={String(juz)}>
                    Juz {juz}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full border-collapse bg-white text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="px-3 py-2 text-left font-semibold w-12">No</th>
                    <th className="px-3 py-2 text-left font-semibold">Surah</th>
                    <th className="px-3 py-2 text-left font-semibold">Makhroj</th>
                    <th className="px-3 py-2 text-left font-semibold">Tajwid</th>
                    <th className="px-3 py-2 text-left font-semibold">Lancar</th>
                    <th className="px-3 py-2 text-left font-semibold">Ayat</th>
                    <th className="px-3 py-2 text-left font-semibold w-12" />
                  </tr>
                </thead>
                <tbody>
                  {slide.rows.map((row, rowIndex) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-3 py-2 text-slate-600">{rowIndex + 1}</td>
                      <td className="px-3 py-2">
                        <input
                          value={row.nama_surah}
                          onChange={(e) => updateCustomSlideRow(slide.id, row.id, 'nama_surah', e.target.value)}
                          placeholder="Nama surah..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.makhroj}
                          onChange={(e) => updateCustomSlideRow(slide.id, row.id, 'makhroj', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">—</option>
                          <option value="L">L</option>
                          <option value="KL">KL</option>
                          <option value="TL">TL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.tajwid}
                          onChange={(e) => updateCustomSlideRow(slide.id, row.id, 'tajwid', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">—</option>
                          <option value="L">L</option>
                          <option value="KL">KL</option>
                          <option value="TL">TL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.lancar}
                          onChange={(e) => updateCustomSlideRow(slide.id, row.id, 'lancar', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">—</option>
                          <option value="L">L</option>
                          <option value="KL">KL</option>
                          <option value="TL">TL</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.halaman}
                          onChange={(e) => updateCustomSlideRow(slide.id, row.id, 'halaman', e.target.value)}
                          placeholder="Ayat..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeCustomSlideRow(slide.id, row.id)}
                          className="text-slate-500 hover:text-red-600 transition-colors"
                          aria-label="Hapus baris"
                          title="Hapus baris"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={() => addCustomSlideRow(slide.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50"
            >
              <Plus size={14} />
              Tambah Baris Surah
            </button>
          </div>
        </div>
      ))}

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
          Menampilkan {Array.from(juzGroups.values()).reduce((sum, rows) => sum + rows.length, 0) + ungrouped.length} surah{sortedJuz.length > 0 ? ` dalam ${sortedJuz.length} Juz` : ''}
        </p>
      )}

      {/* Modal Tambah Surah */}
      <Modal
        open={addSurahOpen}
        onClose={() => { if (!addSurahLoading) setAddSurahOpen(false); }}
        title="Tambah Surah"
        size="sm"
        closeOnBackdrop={!addSurahLoading}
      >
        {addSurahError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {addSurahError}
          </div>
        )}
        <form onSubmit={handleAddSurah} noValidate className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Surah / Juz <span className="text-red-500">*</span>
            </label>
            <input
              list="surah-datalist-add"
              type="text"
              value={addSurahForm.surah_juz}
              onChange={(e) => setAddSurahForm((prev) => ({ ...prev, surah_juz: e.target.value }))}
              placeholder="Ketik atau pilih surah..."
              disabled={addSurahLoading}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              autoFocus
            />
            <datalist id="surah-datalist-add">
              {SURAH_ALQURAN_LIST.map((surah) => (
                <option key={surah} value={surah} />
              ))}
            </datalist>
          </div>

          <Input
            label="Ayat"
            value={addSurahForm.ayat}
            onChange={(e) => setAddSurahForm((prev) => ({ ...prev, ayat: e.target.value }))}
            placeholder="Contoh: 1-5"
            helperText="Opsional"
            disabled={addSurahLoading}
          />

          <Input
            label="Tanggal"
            type="date"
            value={addSurahForm.tanggal}
            onChange={(e) => setAddSurahForm((prev) => ({ ...prev, tanggal: e.target.value }))}
            disabled={addSurahLoading}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
              Catatan <span className="text-xs font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              value={addSurahForm.catatan}
              onChange={(e) => setAddSurahForm((prev) => ({ ...prev, catatan: e.target.value }))}
              rows={3}
              disabled={addSurahLoading}
              placeholder="Catatan singkat..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddSurahOpen(false)}
              disabled={addSurahLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={addSurahLoading}
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
