'use client';

// src/app/(dashboard)/absensi/page.tsx
// Halaman Data Absensi dengan flow berbasis kelas:
// 1. Grid kartu kelas (dari /api/kelas/list)
// 2. Klik kelas → view tab Harian/Bulanan untuk kelas tersebut

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, BarChart3, RefreshCw, Download, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge, { getStatusBadgeVariant } from '@/components/ui/Badge';
import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import { useToast } from '@/lib/toast';
import { useViewMode } from '@/hooks/useViewMode';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbsensiHarian {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  kelas: string;
  status: 'Hadir' | 'Tidak Hadir';
}

interface AbsensiBulanan {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  kelas: string;
  jumlahHadir: number;
  totalHariAktif: number;
  persentase: number;
}

type TabKey = 'harian' | 'bulanan';

interface TabProps {
  showToast: (type: 'success' | 'error', msg: string) => void;
  classId: string;
  className: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTanggal(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const BULAN_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ─── Tab Harian ───────────────────────────────────────────────────────────────

const HARIAN_COLUMNS: ColumnDef<AbsensiHarian>[] = [
  {
    key: 'no',
    header: 'No',
    align: 'center',
    width: '48px',
    render: (_, i) => <span className="text-slate-400">{i + 1}</span>,
  },
  { key: 'nisn', header: 'NIS/NISN', width: '130px' },
  {
    key: 'nama',
    header: 'Nama Siswa',
    render: (row) => <span className="font-medium text-slate-800">{row.nama}</span>,
  },
  {
    key: 'gender',
    header: 'Jenis Kelamin',
    align: 'center',
    width: '130px',
    render: (row) => (
      <Badge variant={row.gender === 'Laki-laki' ? 'blue' : 'orange'}>
        {row.gender}
      </Badge>
    ),
  },
  { key: 'kelas', header: 'Kelas', align: 'center', width: '110px' },
  {
    key: 'status',
    header: 'Status',
    align: 'center',
    width: '130px',
    render: (row) => (
      <Badge variant={getStatusBadgeVariant(row.status)}>{row.status}</Badge>
    ),
  },
];

function TabHarian({ showToast, classId }: TabProps) {
  const { viewAsRole, viewAsTeacherId } = useViewMode();
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);
  const today = toDateInputValue(new Date());
  const [date, setDate] = useState(today);
  const [data, setData] = useState<AbsensiHarian[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchHarian = useCallback(
    async (d: string) => {
      if (!d) return;
      setLoading(true);
      setFetched(false);
      try {
        const url = `/api/absensi/harian?date=${encodeURIComponent(d)}` +
        (classId ? `&class_id=${classId}` : '');
        const res = await fetch(url, { headers: viewHeaders });
        const json = await res.json();
        if (!res.ok) {
          showToast('error', json.message ?? 'Gagal memuat data absensi harian.');
          setData([]);
        } else {
          setData(json.data ?? []);
        }
      } catch {
        showToast('error', 'Terjadi kesalahan saat memuat data absensi harian.');
        setData([]);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    },
    [showToast, classId, viewHeaders]
  );

  useEffect(() => {
    fetchHarian(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchHarian]);

  const jumlahHadir = data.filter((d) => d.status === 'Hadir').length;
  const jumlahTidakHadir = data.filter((d) => d.status === 'Tidak Hadir').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="date-picker" className="block text-sm font-medium text-slate-700 mb-1">
            Pilih Tanggal
          </label>
          <input
            id="date-picker"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <Button
          variant="primary"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => fetchHarian(date)}
          loading={loading}
          disabled={!date}
        >
          Tampilkan
        </Button>
      </div>

      {fetched && date && (
        <p className="text-sm text-slate-500">
          Data absensi untuk{' '}
          <span className="font-medium text-slate-700">{formatTanggal(date)}</span>
        </p>
      )}

      {fetched && data.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-amber-700">Hadir</span>
            <span className="text-lg font-bold text-amber-800">{jumlahHadir}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-red-600">Tidak Hadir</span>
            <span className="text-lg font-bold text-red-700">{jumlahTidakHadir}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-700">{data.length}</span>
          </div>
        </div>
      )}

      <DataTable<AbsensiHarian>
        columns={HARIAN_COLUMNS}
        data={data}
        rowKey={(row) => row.id}
        loading={loading}
        skeletonRows={6}
        emptyMessage={
          fetched
            ? 'Tidak ada data siswa untuk tanggal ini.'
            : 'Pilih tanggal dan klik Tampilkan untuk melihat data.'
        }
      />
    </div>
  );
}

// ─── Tab Bulanan ──────────────────────────────────────────────────────────────

const BULANAN_COLUMNS: ColumnDef<AbsensiBulanan>[] = [
  {
    key: 'no',
    header: 'No',
    align: 'center',
    width: '48px',
    render: (_, i) => <span className="text-slate-400">{i + 1}</span>,
  },
  { key: 'nisn', header: 'NIS/NISN', width: '130px' },
  {
    key: 'nama',
    header: 'Nama Siswa',
    render: (row) => <span className="font-medium text-slate-800">{row.nama}</span>,
  },
  {
    key: 'gender',
    header: 'Jenis Kelamin',
    align: 'center',
    width: '130px',
    render: (row) => (
      <Badge variant={row.gender === 'Laki-laki' ? 'blue' : 'orange'}>
        {row.gender}
      </Badge>
    ),
  },
  { key: 'kelas', header: 'Kelas', align: 'center', width: '110px' },
  {
    key: 'jumlahHadir',
    header: 'Hadir',
    align: 'center',
    width: '80px',
    render: (row) => (
      <span className="font-semibold text-amber-700">{row.jumlahHadir}</span>
    ),
  },
  {
    key: 'totalHariAktif',
    header: 'Hari Aktif',
    align: 'center',
    width: '100px',
    render: (row) => <span className="text-slate-600">{row.totalHariAktif}</span>,
  },
  {
    key: 'persentase',
    header: 'Persentase',
    align: 'center',
    width: '120px',
    render: (row) => {
      const pct = row.persentase;
      const variant = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
      return <Badge variant={variant}>{pct.toFixed(1)}%</Badge>;
    },
  },
];

function TabBulanan({ showToast, classId }: TabProps) {
  const { viewAsRole, viewAsTeacherId } = useViewMode();
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<AbsensiBulanan[]>([]);
  const [totalHariAktif, setTotalHariAktif] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchBulanan = useCallback(
    async (m: number, y: number) => {
      setLoading(true);
      setFetched(false);
      try {
        const url = `/api/absensi/bulanan?month=${m}&year=${y}&class_id=${classId}`;
        const res = await fetch(url, { headers: viewHeaders });
        const json = await res.json();
        if (!res.ok) {
          showToast('error', json.message ?? 'Gagal memuat rekap absensi bulanan.');
          setData([]);
          setTotalHariAktif(0);
        } else {
          setData(json.data ?? []);
          setTotalHariAktif(json.totalHariAktif ?? 0);
        }
      } catch {
        showToast('error', 'Terjadi kesalahan saat memuat rekap absensi bulanan.');
        setData([]);
        setTotalHariAktif(0);
      } finally {
        setLoading(false);
        setFetched(true);
      }
    },
    [showToast, classId, viewHeaders]
  );

  useEffect(() => {
    fetchBulanan(now.getMonth() + 1, now.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchBulanan]);

  const thisYear = now.getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => thisYear - 2 + i);

  const rataPersentase =
    data.length > 0
      ? Math.round((data.reduce((sum, d) => sum + d.persentase, 0) / data.length) * 10) / 10
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="month-picker" className="block text-sm font-medium text-slate-700 mb-1">
            Bulan
          </label>
          <select
            id="month-picker"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {BULAN_NAMES.map((b, i) => (
              <option key={i + 1} value={i + 1}>{b}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year-picker" className="block text-sm font-medium text-slate-700 mb-1">
            Tahun
          </label>
          <select
            id="year-picker"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="block rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => fetchBulanan(month, year)}
          loading={loading}
        >
          Tampilkan
        </Button>

        <Button
          variant="secondary"
          leftIcon={<Download size={14} />}
          onClick={() => {
            const mm = String(month).padStart(2, '0');
            const a = document.createElement('a');
            a.href = `/api/absensi/export?month=${year}-${mm}&class_id=${classId}`;
            a.download = `absensi-${year}-${mm}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
        >
          Export Excel
        </Button>
      </div>

      {fetched && (
        <p className="text-sm text-slate-500">
          Rekap kehadiran bulan{' '}
          <span className="font-medium text-slate-700">
            {BULAN_NAMES[month - 1]} {year}
          </span>
          {totalHariAktif > 0 && (
            <> · <span className="font-medium text-slate-700">{totalHariAktif} hari aktif</span></>
          )}
        </p>
      )}

      {fetched && data.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Total Siswa</span>
            <span className="text-lg font-bold text-slate-700">{data.length}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-slate-500">Hari Aktif</span>
            <span className="text-lg font-bold text-slate-700">{totalHariAktif}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-amber-600">Rata-rata Kehadiran</span>
            <span className="text-lg font-bold text-amber-700">{rataPersentase}%</span>
          </div>
        </div>
      )}

      <DataTable<AbsensiBulanan>
        columns={BULANAN_COLUMNS}
        data={data}
        rowKey={(row) => row.id}
        loading={loading}
        skeletonRows={6}
        emptyMessage={
          fetched
            ? 'Tidak ada data siswa untuk periode ini.'
            : 'Pilih bulan dan tahun lalu klik Tampilkan untuk melihat rekap.'
        }
      />

      {fetched && data.some((d) => d.persentase === 0) && (
        <p className="text-xs text-slate-400">
          * Siswa dengan persentase 0% tidak memiliki catatan kehadiran pada periode ini.
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AbsensiPage() {
  const { toast } = useToast();
  const { viewAsRole, viewAsTeacherId } = useViewMode();
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole]);

  const [activeTab, setActiveTab] = useState<TabKey>('harian');
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [kelasList, setKelasList] = useState<{ id: string; name: string; jumlah_siswa: number }[]>([]);
  const [kelasLoading, setKelasLoading] = useState(true);

  const showToast = useCallback(
    (type: 'success' | 'error', msg: string) => {
      if (type === 'success') toast.success(msg);
      else toast.error(msg);
    },
    [toast]
  );

  useEffect(() => {
    fetch('/api/kelas/list', { headers: viewHeaders })
      .then((r) => r.json())
      .then((j) => { setKelasList(j.data ?? []); setKelasLoading(false); })
      .catch(() => setKelasLoading(false));
  }, [viewHeaders]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'harian', label: 'Harian', icon: <CalendarDays size={16} /> },
    { key: 'bulanan', label: 'Bulanan', icon: <BarChart3 size={16} /> },
  ];

  // ─── View 1: Grid Kelas ────────────────────────────────────────────────────

  if (selectedClass === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Absensi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pilih kelas untuk melihat data absensi.</p>
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
                onClick={() => setSelectedClass({ id: kelas.id, name: kelas.name })}
                className="group bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-indigo-300 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <span className="text-white font-bold text-sm">{kelas.name.charAt(0)}</span>
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

  // ─── View 2: Absensi per Kelas ─────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div>
        <button
          onClick={() => setSelectedClass(null)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Semua Kelas
        </button>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Absensi — {selectedClass.name}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Lihat rekap kehadiran siswa secara harian maupun bulanan.
        </p>
      </div>

      {/* Kartu utama */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab navigation */}
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.key
                  ? 'text-amber-700 border-amber-600 bg-amber-50/40'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50',
              ].join(' ')}
              aria-selected={activeTab === tab.key}
              role="tab"
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'harian' && (
            <TabHarian
              showToast={showToast}
              classId={selectedClass.id}
              className={selectedClass.name}
            />
          )}
          {activeTab === 'bulanan' && (
            <TabBulanan
              showToast={showToast}
              classId={selectedClass.id}
              className={selectedClass.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
