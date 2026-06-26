'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/absensi/monitoring/page.tsx
// Halaman monitoring absensi dengan grafik kehadiran harian.
// Flow: grid kartu kelas → pilih kelas → tampilkan grafik untuk kelas tersebut.
// Hanya untuk Kabid — Tim_Quran akan di-redirect oleh middleware.

import React, { useCallback, useEffect, useState } from 'react';
import nextDynamic from 'next/dynamic';
import { RefreshCw, TrendingUp, ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/toast';
import type { ChartDataPoint, DateRange } from '@/components/features/charts/AttendanceChart';

// ─── Dynamic import — SSR dimatikan karena Recharts menggunakan browser APIs ──

const AttendanceChart = nextDynamic(
  () => import('@/components/features/charts/AttendanceChart'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full flex items-center justify-center" style={{ height: 320 }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Memuat grafik…</p>
        </div>
      </div>
    ),
  }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts.map(Number);
  try {
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitoringAbsensiPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Default: 30 hari terakhir
  const defaultTo = toDateInputValue(new Date());
  const defaultFrom = toDateInputValue(daysAgo(29));

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: daysAgo(29),
    to: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  // Kelas state
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [kelasList, setKelasList] = useState<{ id: string; name: string; jumlah_siswa: number }[]>([]);
  const [kelasLoading, setKelasLoading] = useState(true);

  const today = toDateInputValue(new Date());

  // Redirect jika bukan Kabid
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.user?.role !== 'Kabid') {
      router.replace('/dashboard?error=forbidden');
    }
  }, [mounted, session, sessionStatus, router]);

  // Fetch kelas list
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetch('/api/kelas/list')
      .then((r) => r.json())
      .then((j) => { setKelasList(j.data ?? []); setKelasLoading(false); })
      .catch(() => setKelasLoading(false));
  }, [sessionStatus]);

  const fetchData = useCallback(
    async (from: string, to: string, classId?: string) => {
      if (!from || !to) return;
      setLoading(true);
      setFetched(false);
      try {
        const url = classId
          ? `/api/absensi/monitoring?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&class_id=${classId}`
          : `/api/absensi/monitoring?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) {
          toast.error(json.message ?? 'Gagal memuat data monitoring.');
          setChartData([]);
        } else {
          setChartData(json.data ?? []);
          setDateRange({
            from: new Date(from + 'T00:00:00'),
            to: new Date(to + 'T00:00:00'),
          });
        }
      } catch {
        toast.error('Terjadi kesalahan saat memuat data monitoring.');
        setChartData([]);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    },
    [toast]
  );

  const handleLoad = () => {
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) {
      toast.error('Tanggal awal tidak boleh lebih besar dari tanggal akhir.');
      return;
    }
    fetchData(fromDate, toDate, selectedClass?.id);
  };

  const handlePreset = (days: number) => {
    const newTo = toDateInputValue(new Date());
    const newFrom = toDateInputValue(daysAgo(days - 1));
    setFromDate(newFrom);
    setToDate(newTo);
    fetchData(newFrom, newTo, selectedClass?.id);
  };

  // Loading sesi atau belum mounting
  if (!mounted || sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session || session.user?.role !== 'Kabid') {
    return null;
  }

  // ─── View 1: Grid Kelas ────────────────────────────────────────────────────

  if (selectedClass === null) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="text-amber-600" size={24} />
              Monitoring Absensi
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Pilih kelas untuk melihat grafik monitoring kehadiran.
            </p>
          </div>
        </div>

        {kelasLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : kelasList.length === 0 ? (
          <div className="text-center py-16 text-slate-400">Belum ada kelas terdaftar.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {kelasList.map((kelas) => (
              <button
                key={kelas.id}
                onClick={() => {
                  setSelectedClass({ id: kelas.id, name: kelas.name });
                  fetchData(defaultFrom, defaultTo, kelas.id);
                }}
                className="group bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-amber-300 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                >
                  <TrendingUp size={18} className="text-white" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">{kelas.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{kelas.jumlah_siswa} siswa</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── View 2: Monitoring per Kelas ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            onClick={() => { setSelectedClass(null); setFetched(false); setChartData([]); }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Semua Kelas
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="text-amber-600" size={24} />
            Monitoring — {selectedClass.name}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Grafik kehadiran siswa harian berdasarkan rentang tanggal yang dipilih.
          </p>
        </div>
      </div>

      {/* Kartu kontrol dan grafik */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="from-date" className="block text-sm font-medium text-slate-700 mb-1">
                Dari Tanggal
              </label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                max={today}
                onChange={(e) => setFromDate(e.target.value)}
                className="block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="to-date" className="block text-sm font-medium text-slate-700 mb-1">
                Sampai Tanggal
              </label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                min={fromDate}
                max={today}
                onChange={(e) => setToDate(e.target.value)}
                className="block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <Button
              variant="primary"
              leftIcon={<RefreshCw size={14} />}
              onClick={handleLoad}
              loading={loading}
              disabled={!fromDate || !toDate}
            >
              Tampilkan
            </Button>

            {/* Preset buttons */}
            <div className="flex gap-2 ml-auto">
              {[
                { label: '7 Hari', days: 7 },
                { label: '30 Hari', days: 30 },
                { label: '90 Hari', days: 90 },
              ].map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => handlePreset(preset.days)}
                  disabled={loading}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Informasi periode */}
        {fetched && fromDate && toDate && (
          <div className="px-6 pt-4">
            <p className="text-sm text-slate-500">
              Menampilkan data kehadiran{' '}
              <span className="font-medium text-slate-700">{formatDateDisplay(fromDate)}</span>
              {' '}–{' '}
              <span className="font-medium text-slate-700">{formatDateDisplay(toDate)}</span>
              {chartData.length > 0 && (
                <span className="text-slate-400"> ({chartData.length} hari)</span>
              )}
            </p>
          </div>
        )}

        {/* Grafik */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="w-full flex items-center justify-center" style={{ height: 320 }}>
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Memuat data…</p>
              </div>
            </div>
          ) : (
            <AttendanceChart data={chartData} dateRange={dateRange} />
          )}
        </div>
      </div>
    </div>
  );
}
