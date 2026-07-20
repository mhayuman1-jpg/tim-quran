'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/absensi/kabid-mark/page.tsx
// Halaman untuk Kabid menandai siswa hadir.
// Flow: pilih kelas → pilih siswa → tandai hadir.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, CheckCircle, RefreshCw, UserCheck, Search,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KelasItem {
  id: string;
  name: string;
  jumlah_siswa: number;
}

interface SantriItem {
  id: string;
  nama: string;
  nisn: string;
  gender: string;
  guru: string;
  status: 'Hadir' | 'Tidak Hadir';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KabidMarkPage() {
  const { toast } = useToast();

  const showToast = useCallback(
    (type: 'success' | 'error', msg: string) => {
      if (type === 'success') toast.success(msg);
      else toast.error(msg);
    },
    [toast]
  );

  const [selectedClass, setSelectedClass] = useState<KelasItem | null>(null);
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [kelasLoading, setKelasLoading] = useState(true);

  // Fetch kelas
  useEffect(() => {
    setKelasLoading(true);
    fetch('/api/kelas/list')
      .then((r) => r.json())
      .then((j) => { setKelasList(j.data ?? []); setKelasLoading(false); })
      .catch(() => setKelasLoading(false));
  }, []);

  // ─── View 1: Grid Kelas ────────────────────────────────────────────────────

  if (selectedClass === null) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tandai Hadir</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pilih kelas, lalu pilih siswa yang ingin ditandai hadir.
          </p>
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
                onClick={() => setSelectedClass(kelas)}
                className="group bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-amber-300 hover:shadow-md transition-all hover:-translate-y-1"
              >
                <div
                  className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
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

  // ─── View 2: Pilih Siswa ──────────────────────────────────────────────────

  return (
    <KabidMarkSiswa
      kelas={selectedClass}
      onBack={() => setSelectedClass(null)}
      showToast={showToast}
    />
  );
}

// ─── View 2: Pilih Siswa Component ────────────────────────────────────────────

function KabidMarkSiswa({
  kelas,
  onBack,
  showToast,
}: {
  kelas: KelasItem;
  onBack: () => void;
  showToast: (type: 'success' | 'error', msg: string) => void;
}) {
  const [santriList, setSantriList] = useState<SantriItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmModal, setConfirmModal] = useState(false);
  const [lastResult, setLastResult] = useState<{ marked: number; skipped: number } | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch(`/api/absensi/kabid-mark?class_id=${kelas.id}`);
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat data siswa.');
        setSantriList([]);
      } else {
        setSantriList(json.data ?? []);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat data siswa.');
      setSantriList([]);
    } finally {
      setLoading(false);
    }
  }, [kelas.id, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Filter search
  const filteredList = useMemo(() => {
    if (!search.trim()) return santriList;
    const q = search.toLowerCase();
    return santriList.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q)
    );
  }, [santriList, search]);

  // Belum hadir list
  const belumHadir = useMemo(
    () => santriList.filter((s) => s.status === 'Tidak Hadir'),
    [santriList]
  );
  const sudahHadir = useMemo(
    () => santriList.filter((s) => s.status === 'Hadir'),
    [santriList]
  );

  // Toggle select
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select all belum hadir
  const selectAllBelumHadir = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = belumHadir.every((s) => next.has(s.id));
      if (allSelected) {
        belumHadir.forEach((s) => next.delete(s.id));
      } else {
        belumHadir.forEach((s) => next.add(s.id));
      }
      return next;
    });
  }, [belumHadir]);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setConfirmModal(false);
    try {
      const res = await fetch('/api/absensi/kabid-mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal menandai absensi.');
      } else {
        showToast('success', json.message ?? 'Absensi berhasil ditandai.');
        setLastResult({ marked: json.marked, skipped: json.skipped });
        setSelected(new Set());
        fetchStudents();
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat menandai absensi.');
    } finally {
      setSubmitting(false);
    }
  }, [selected, showToast, fetchStudents]);

  const allBelumHadirSelected = belumHadir.length > 0 && belumHadir.every((s) => selected.has(s.id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Semua Kelas
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tandai Hadir — {kelas.name}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Pilih siswa yang ingin ditandai hadir hari ini.
            </p>
          </div>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} />}
            onClick={fetchStudents}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <CheckCircle size={18} className="text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {lastResult.marked} siswa berhasil ditandai hadir.
            </p>
            {lastResult.skipped > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">
                {lastResult.skipped} siswa dilewati (sudah absen).
              </p>
            )}
          </div>
          <button onClick={() => setLastResult(null)} className="text-amber-500 hover:text-amber-700">
            ×
          </button>
        </div>
      )}

      {/* Summary + search */}
      {!loading && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-amber-700">Hadir</span>
              <span className="text-sm font-bold text-amber-800">{sudahHadir.length}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-red-600">Belum Hadir</span>
              <span className="text-sm font-bold text-red-700">{belumHadir.length}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <span className="text-xs font-semibold text-slate-500">Total</span>
              <span className="text-sm font-bold text-slate-700">{santriList.length}</span>
            </div>
          </div>

          <div className="relative sm:ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent w-full sm:w-56"
            />
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && filteredList.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Action bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllBelumHadir}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                  allBelumHadirSelected
                    ? 'bg-amber-100 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {allBelumHadirSelected ? 'Batal Pilih Semua' : 'Pilih Semua Belum Hadir'}
              </button>
              {selected.size > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  {selected.size} siswa dipilih
                </span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<UserCheck size={14} />}
              onClick={() => setConfirmModal(true)}
              disabled={selected.size === 0 || submitting}
              loading={submitting}
            >
              Tandai Hadir
            </Button>
          </div>

          {/* Header */}
          <div className="grid grid-cols-[40px_1fr_120px_100px_100px] gap-3 px-4 py-2.5 text-xs font-semibold text-slate-500 border-b border-slate-100">
            <span className="text-center">✓</span>
            <span>Nama Siswa</span>
            <span className="hidden sm:block">NISN</span>
            <span className="text-center">Guru</span>
            <span className="text-center">Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
            {filteredList.map((s) => {
              const isHadir = s.status === 'Hadir';
              const isSelected = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`grid grid-cols-[40px_1fr_120px_100px_100px] gap-3 px-4 py-3 items-center cursor-pointer transition-colors ${
                    isSelected ? 'bg-amber-50' : isHadir ? 'bg-green-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(s.id)}
                      disabled={isHadir}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-800 truncate">{s.nama}</span>
                  <span className="text-xs text-slate-500 hidden sm:block">{s.nisn}</span>
                  <span className="text-xs text-slate-500 text-center truncate">{s.guru}</span>
                  <div className="text-center">
                    {isHadir ? (
                      <Badge variant="green">Hadir</Badge>
                    ) : (
                      <Badge variant="red">Belum</Badge>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && filteredList.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          {search ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Tidak ada siswa di kelas ini.'}
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        open={confirmModal}
        onClose={() => !submitting && setConfirmModal(false)}
        title="Konfirmasi Tandai Hadir"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Tandai <strong>{selected.size} siswa</strong> dari kelas{' '}
            <strong>{kelas.name}</strong> sebagai hadir hari ini?
          </p>
          <p className="text-xs text-slate-400">
            Siswa yang sudah absen akan dilewati.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmModal(false)} disabled={submitting}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              Ya, Tandai Hadir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
