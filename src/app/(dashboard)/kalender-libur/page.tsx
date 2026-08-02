'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/kalender-libur/page.tsx
// Halaman manajemen hari libur untuk Kabid.
// Kelola tanggal libur sesuai kalender pendidikan.
// Hari libur akan otomatis mempengaruhi sistem absensi dan jurnal.

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CalendarDays, Plus, Trash2, RefreshCw, Filter,
  Sun, GraduationCap, Landmark, Info,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';
import { todayStr } from '@/lib/time';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HolidayItem {
  id: string;
  date: string;
  keterangan: string;
  tipe: string;
  created_by: string | null;
  created_at: string;
}

type TipeOption = 'libur_nasional' | 'libur_sekolah' | 'libur_agama' | 'lainnya';

interface TipeMeta {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const TIPE_MAP: Record<string, TipeMeta> = {
  libur_nasional: {
    label: 'Libur Nasional',
    color: 'text-red-700',
    bgColor: 'bg-red-50 border-red-200',
    icon: <Landmark size={14} />,
  },
  libur_sekolah: {
    label: 'Libur Sekolah',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: <GraduationCap size={14} />,
  },
  libur_agama: {
    label: 'Libur Agama',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: <Sun size={14} />,
  },
  lainnya: {
    label: 'Lainnya',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50 border-slate-200',
    icon: <Info size={14} />,
  },
};

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const HARI_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function formatTanggalLengkap(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const hari = HARI_NAMES[date.getDay()];
  return `${hari}, ${d} ${BULAN_NAMES[m - 1]} ${y}`;
}

// ─── Calendar Grid ─────────────────────────────────────────────────────────────

function CalendarGrid({
  year,
  month,
  selectedDates,
  onToggleDate,
}: {
  year: number;
  month: number;
  selectedDates: string[];
  onToggleDate: (dateStr: string) => void;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayWITA = todayStr();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  return (
    <div className="grid grid-cols-7">
      {cells.map((dateStr, i) => {
        if (!dateStr) return <div key={`empty-${i}`} />;
        const isSelected = selectedDates.includes(dateStr);
        const isToday = dateStr === todayWITA;
        return (
          <button
            key={dateStr}
            type="button"
            onClick={() => onToggleDate(dateStr)}
            className={[
              'relative h-9 text-xs font-medium transition-all',
              'hover:bg-amber-100',
              isSelected
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : isToday
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-700',
            ].join(' ')}
          >
            {Number(dateStr.split('-')[2])}
            {isToday && !isSelected && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KalenderLiburPage() {
  const { toast } = useToast();

  const now = new Date(todayStr() + 'T00:00:00');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(now.getMonth() + 1);

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [openAddModal, setOpenAddModal] = useState(false);
  const [formDates, setFormDates] = useState<string[]>([]);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formTipe, setFormTipe] = useState<TipeOption>('libur_sekolah');
  const [saving, setSaving] = useState(false);

  // Calendar picker state
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Fetch holidays ────────────────────────────────────────────────────────

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('year', String(selectedYear));
      if (selectedMonth) params.set('month', String(selectedMonth));

      const res = await fetch(`/api/kalender-libur?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal memuat data kalender libur.');
        return;
      }
      setHolidays(json.data ?? []);
    } catch {
      toast.error('Terjadi kesalahan saat memuat data kalender libur.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth, toast]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // ── Add holiday ───────────────────────────────────────────────────────────

  const handleAddHoliday = async () => {
    if (formDates.length === 0) {
      toast.error('Pilih minimal satu tanggal hari libur.');
      return;
    }
    if (!formKeterangan.trim()) {
      toast.error('Keterangan wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/kalender-libur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: formDates,
          keterangan: formKeterangan.trim(),
          tipe: formTipe,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menambah hari libur.');
        return;
      }
      toast.success(json.message ?? 'Hari libur berhasil ditambahkan.');
      setOpenAddModal(false);
      setFormDates([]);
      setFormKeterangan('');
      setFormTipe('libur_sekolah');
      await fetchHolidays();
    } catch {
      toast.error('Terjadi kesalahan saat menambah hari libur.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete holiday ────────────────────────────────────────────────────────

  const handleDeleteHoliday = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch('/api/kalender-libur', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? 'Gagal menghapus hari libur.');
        return;
      }
      toast.success(json.message ?? 'Hari libur berhasil dihapus.');
      setConfirmDeleteId(null);
      await fetchHolidays();
    } catch {
      toast.error('Terjadi kesalahan saat menghapus hari libur.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Year/Month options ────────────────────────────────────────────────────

  const yearOptions = useMemo(() => {
    const thisYear = now.getFullYear();
    return Array.from({ length: 6 }, (_, i) => thisYear - 2 + i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  // ── Group holidays by month ───────────────────────────────────────────────

  const holidaysByMonth = useMemo(() => {
    const map = new Map<number, HolidayItem[]>();
    for (const h of holidays) {
      const month = Number(h.date.split('-')[1]);
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(h);
    }
    return map;
  }, [holidays]);

  const totalHolidays = holidays.length;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="text-amber-600" size={24} />
            Kalender Libur
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Atur hari libur sesuai kalender pendidikan. Hari libur otomatis dikecualikan dari perhitungan absensi dan jurnal mengajar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              setFormDates([]);
              setFormKeterangan('');
              setFormTipe('libur_sekolah');
              setCalYear(now.getFullYear());
              setCalMonth(now.getMonth());
              setOpenAddModal(true);
            }}
          >
            Tambah Hari Libur
          </Button>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} />}
            onClick={fetchHolidays}
          >
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* ── Info Box ── */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium">Cara kerja Hari Libur:</p>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
            <li>Sistem absensi tidak akan mencatat ketidakhadiran siswa pada hari libur.</li>
            <li>Jurnal hafalan dan tahsin tidak dapat diinput pada hari libur.</li>
            <li>Rekap absensi bulanan otomatis mengecualikan hari libur dari total hari aktif.</li>
          </ul>
        </div>
      </div>

      {/* ── Filter ── */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="filter-year" className="block text-sm font-medium text-slate-700 mb-1">
            Tahun
          </label>
          <select
            id="filter-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-month" className="block text-sm font-medium text-slate-700 mb-1">
            Bulan
          </label>
          <select
            id="filter-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : '')}
            className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Semua Bulan</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>{BULAN_NAMES[m - 1]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter size={14} className="text-slate-400" />
          <span className="text-sm text-slate-500">
            {totalHolidays} hari libur
          </span>
        </div>
      </div>

      {/* ── Holiday List ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : holidays.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-10 text-center">
          <CalendarDays size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Belum ada hari libur terdaftar</p>
          <p className="text-sm text-slate-400 mt-1">
            Klik &quot;Tambah Hari Libur&quot; untuk mulai mengatur kalender libur.
          </p>
        </div>
      ) : selectedMonth ? (
        // Flat list when a specific month is selected
        <div className="space-y-3">
          {holidays.map((h) => {
            const meta = TIPE_MAP[h.tipe] ?? TIPE_MAP.lainnya;
            return (
              <div
                key={h.id}
                className={`rounded-2xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all hover:shadow-sm`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {formatTanggalLengkap(h.date)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${meta.bgColor} ${meta.color}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{h.keterangan}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDeleteId === h.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-600">Hapus?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={deletingId === h.id}
                        onClick={() => handleDeleteHoliday(h.id)}
                      >
                        Ya
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={14} />}
                      className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => setConfirmDeleteId(h.id)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Grouped by month when "Semua Bulan" is selected
        <div className="space-y-6">
          {monthOptions.map((m) => {
            const monthHolidays = holidaysByMonth.get(m);
            if (!monthHolidays || monthHolidays.length === 0) return null;
            return (
              <div key={m}>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-amber-500" />
                  {BULAN_NAMES[m - 1]} {selectedYear}
                  <span className="text-xs font-normal text-slate-400">({monthHolidays.length} hari libur)</span>
                </h3>
                <div className="space-y-2">
                  {monthHolidays.map((h) => {
                    const meta = TIPE_MAP[h.tipe] ?? TIPE_MAP.lainnya;
                    return (
                      <div
                        key={h.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-sm transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm">
                              {formatTanggalLengkap(h.date)}
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${meta.bgColor} ${meta.color}`}>
                              {meta.icon}
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{h.keterangan}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {confirmDeleteId === h.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-600">Hapus?</span>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={deletingId === h.id}
                                onClick={() => handleDeleteHoliday(h.id)}
                              >
                                Ya
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 size={14} />}
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setConfirmDeleteId(h.id)}
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Modal ── */}
      <Modal
        open={openAddModal}
        onClose={() => setOpenAddModal(false)}
        title="Tambah Hari Libur"
        size="md"
      >
        <div className="space-y-4">
          {/* Calendar Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Tanggal</label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              {/* Month/Year nav */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
                    else setCalMonth(calMonth - 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-slate-800">
                  {BULAN_NAMES[calMonth]} {calYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
                    else setCalMonth(calMonth + 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-slate-100">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-slate-400 py-1.5">{d}</div>
                ))}
              </div>

              {/* Day grid */}
              <CalendarGrid
                year={calYear}
                month={calMonth}
                selectedDates={formDates}
                onToggleDate={(dateStr) => {
                  setFormDates((prev) =>
                    prev.includes(dateStr)
                      ? prev.filter((d) => d !== dateStr)
                      : [...prev, dateStr]
                  );
                }}
              />
            </div>
            {formDates.length > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                {formDates.length} tanggal dipilih
              </p>
            )}
          </div>

          {/* Selected dates chips */}
          {formDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {[...formDates].sort().map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-2 py-1 rounded-full"
                >
                  {formatTanggalLengkap(d)}
                  <button
                    type="button"
                    onClick={() => setFormDates((prev) => prev.filter((x) => x !== d))}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
            <input
              type="text"
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              placeholder="Contoh: Hari Raya Idul Fitri"
              className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Libur</label>
            <select
              value={formTipe}
              onChange={(e) => setFormTipe(e.target.value as TipeOption)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="libur_nasional">Libur Nasional</option>
              <option value="libur_sekolah">Libur Sekolah</option>
              <option value="libur_agama">Libur Agama</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpenAddModal(false)}>
              Batal
            </Button>
            <Button variant="primary" loading={saving} onClick={handleAddHoliday}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
