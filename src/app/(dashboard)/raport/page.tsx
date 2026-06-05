'use client';

// src/app/(dashboard)/raport/page.tsx
// Halaman Raport Qur'an:
// - Daftar raport siswa dengan filter periode
// - Form penilaian (modal) — tambah atau edit
// - Deteksi duplikat otomatis → switch ke mode edit
// - Preview dan cetak raport (modal)

import React, { useState, useCallback } from 'react';
import { FileText, Plus, Search, Eye, Edit2, ClipboardList } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import RaportForm, { type RaportFormData } from '@/components/features/raport/RaportForm';
import RaportPrintable, { type RaportData } from '@/components/features/raport/RaportPrintable';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RaportRow {
  id: string;
  periode: string;
  makhroj?: number | null;
  tajwid?: number | null;
  lancar?: number | null;
  buku_surah?: string | null;
  halaman?: number | null;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
  santri?: {
    id: string;
    nama: string;
    nisn: string;
    classes?: { id: string; name: string } | null;
  } | null;
  users?: { id: string; name: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function avgScore(row: RaportRow): number | null {
  const scores = [row.makhroj, row.tajwid, row.lancar].filter(
    (v): v is number => v !== undefined && v !== null
  );
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function ScoreBadge({ value }: { value?: number | null }) {
  if (value === undefined || value === null) {
    return <span className="text-slate-400 text-sm">—</span>;
  }
  const cls =
    value >= 80
      ? 'bg-emerald-100 text-emerald-700'
      : value >= 60
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {value}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportPage() {
  // ── State: list ─────────────────────────────────────────────────────────
  const [raportList, setRaportList] = useState<RaportRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // ── State: filter ───────────────────────────────────────────────────────
  const [filterPeriode, setFilterPeriode] = useState('');

  // ── State: modal form tambah/edit ────────────────────────────────────────
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitialData, setEditingInitialData] = useState<Partial<RaportFormData> | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ── State: modal preview/print ───────────────────────────────────────────
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printingRaport, setPrintingRaport] = useState<RaportData | null>(null);

  // ── Fetch raport list ────────────────────────────────────────────────────
  const fetchRaport = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (filterPeriode.trim()) params.set('periode', filterPeriode.trim());

      const res = await fetch(`/api/raport/list?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setListError(json.message ?? 'Gagal mengambil data raport.');
        setRaportList([]);
        return;
      }

      setRaportList(json.data ?? []);
    } catch {
      setListError('Terjadi kesalahan. Silakan coba lagi.');
      setRaportList([]);
    } finally {
      setListLoading(false);
    }
  }, [filterPeriode]);

  // ── Buka modal tambah ────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setEditingInitialData(null);
    setFormError(null);
    setFormModalOpen(true);
  };

  // ── Buka modal edit ──────────────────────────────────────────────────────
  const handleOpenEdit = (row: RaportRow) => {
    setEditingId(row.id);
    setEditingInitialData({
      student_id: row.santri?.id ?? '',
      periode: row.periode,
      makhroj: row.makhroj ?? '',
      tajwid: row.tajwid ?? '',
      lancar: row.lancar ?? '',
      buku_surah: row.buku_surah ?? '',
      halaman: row.halaman ?? '',
      catatan: row.catatan ?? '',
    });
    setFormError(null);
    setFormModalOpen(true);
  };

  // ── Tutup modal form ─────────────────────────────────────────────────────
  const handleCloseForm = () => {
    if (formSubmitting) return;
    setFormModalOpen(false);
    setEditingId(null);
    setEditingInitialData(null);
    setFormError(null);
  };

  // ── Duplikat terdeteksi → switch ke mode edit ────────────────────────────
  const handleDuplicateDetected = (existingId: string, existingData: any) => {
    setEditingId(existingId);
    setEditingInitialData({
      student_id: existingData.santri?.id ?? existingData.student_id ?? '',
      periode: existingData.periode ?? '',
      makhroj: existingData.makhroj ?? '',
      tajwid: existingData.tajwid ?? '',
      lancar: existingData.lancar ?? '',
      buku_surah: existingData.buku_surah ?? '',
      halaman: existingData.halaman ?? '',
      catatan: existingData.catatan ?? '',
    });
  };

  // ── Submit form ──────────────────────────────────────────────────────────
  const handleFormSubmit = async (formData: RaportFormData, id?: string) => {
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (id) {
        // Mode edit → PUT /api/raport/save
        const res = await fetch('/api/raport/save', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            makhroj: formData.makhroj !== '' ? formData.makhroj : null,
            tajwid: formData.tajwid !== '' ? formData.tajwid : null,
            lancar: formData.lancar !== '' ? formData.lancar : null,
            buku_surah: formData.buku_surah || null,
            halaman: formData.halaman !== '' ? formData.halaman : null,
            catatan: formData.catatan || null,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setFormError(json.message ?? 'Gagal memperbarui raport.');
          return;
        }

        setFormSuccess('Raport berhasil diperbarui.');
        setFormModalOpen(false);
        fetchRaport();
      } else {
        // Mode tambah → POST /api/raport/save
        const res = await fetch('/api/raport/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: formData.student_id,
            periode: formData.periode,
            makhroj: formData.makhroj !== '' ? formData.makhroj : null,
            tajwid: formData.tajwid !== '' ? formData.tajwid : null,
            lancar: formData.lancar !== '' ? formData.lancar : null,
            buku_surah: formData.buku_surah || null,
            halaman: formData.halaman !== '' ? formData.halaman : null,
            catatan: formData.catatan || null,
          }),
        });

        const json = await res.json();

        // 409 = duplikat → switch ke edit mode otomatis
        if (res.status === 409 && json.duplicate && json.data) {
          handleDuplicateDetected(json.data.id, json.data);
          setFormError(
            'Raport untuk siswa dan periode ini sudah ada. Form telah beralih ke mode edit.'
          );
          return;
        }

        if (!res.ok) {
          setFormError(json.message ?? 'Gagal menyimpan raport.');
          return;
        }

        setFormSuccess('Raport berhasil disimpan.');
        setFormModalOpen(false);
        fetchRaport();
      }
    } catch {
      setFormError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Preview / cetak raport ───────────────────────────────────────────────
  const handlePreview = (row: RaportRow) => {
    setPrintingRaport(row as RaportData);
    setPrintModalOpen(true);
  };

  // ─── Kolom tabel ──────────────────────────────────────────────────────────
  const columns: ColumnDef<RaportRow>[] = [
    {
      key: 'siswa',
      header: 'Siswa',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800">{row.santri?.nama ?? '—'}</p>
          <p className="text-xs text-slate-400">{row.santri?.nisn ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'kelas',
      header: 'Kelas',
      render: (row) => row.santri?.classes?.name ?? '—',
    },
    {
      key: 'periode',
      header: 'Periode',
      render: (row) => (
        <span className="font-medium text-slate-700">{row.periode}</span>
      ),
    },
    {
      key: 'makhroj',
      header: 'Makhroj',
      align: 'center',
      render: (row) => <ScoreBadge value={row.makhroj} />,
    },
    {
      key: 'tajwid',
      header: 'Tajwid',
      align: 'center',
      render: (row) => <ScoreBadge value={row.tajwid} />,
    },
    {
      key: 'lancar',
      header: 'Kelancaran',
      align: 'center',
      render: (row) => <ScoreBadge value={row.lancar} />,
    },
    {
      key: 'rata',
      header: 'Rata-rata',
      align: 'center',
      render: (row) => <ScoreBadge value={avgScore(row)} />,
    },
    {
      key: 'aksi',
      header: 'Aksi',
      align: 'center',
      render: (row) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handlePreview(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Lihat & Cetak"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header halaman ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-600" />
            Raport Qur'an
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Penilaian capaian siswa per periode.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenAdd}
        >
          Buat Raport
        </Button>
      </div>

      {/* ── Notifikasi sukses ────────────────────────────────────────────────── */}
      {formSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
          <span>{formSuccess}</span>
          <button
            onClick={() => setFormSuccess(null)}
            className="ml-4 text-emerald-500 hover:text-emerald-700 font-medium"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Filter & Search ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-800">Cari Raport</h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={filterPeriode}
              onChange={(e) => setFilterPeriode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchRaport()}
              placeholder="Filter periode, misal: Semester 1 2024"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <Button
            variant="primary"
            leftIcon={<Search size={16} />}
            onClick={fetchRaport}
            loading={listLoading}
          >
            Tampilkan
          </Button>
        </div>

        {listError && (
          <p className="text-sm text-red-600">{listError}</p>
        )}
      </div>

      {/* ── Tabel raport ────────────────────────────────────────────────────── */}
      {searched && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-slate-800">
              Daftar Raport
              {filterPeriode && (
                <span className="text-slate-400 font-normal text-sm ml-2">
                  — {filterPeriode}
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400">
              {raportList.length} data
            </span>
          </div>

          <DataTable
            columns={columns}
            data={raportList}
            rowKey={(row) => row.id}
            loading={listLoading}
            emptyMessage="Tidak ada raport yang ditemukan."
            emptyIcon={<FileText size={32} className="text-slate-300" />}
          />
        </div>
      )}

      {/* ── Empty state sebelum search ───────────────────────────────────────── */}
      {!searched && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileText size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">
            Gunakan filter di atas untuk menampilkan raport, atau tekan "Tampilkan" untuk melihat semua.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={fetchRaport}
          >
            Tampilkan Semua
          </Button>
        </div>
      )}

      {/* ── Modal form tambah/edit ───────────────────────────────────────────── */}
      <Modal
        open={formModalOpen}
        onClose={handleCloseForm}
        title={editingId ? 'Edit Raport' : 'Buat Raport Baru'}
        size="lg"
        closeOnBackdrop={!formSubmitting}
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {formError}
          </div>
        )}
        <RaportForm
          editingId={editingId}
          initialData={editingInitialData}
          loading={formSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
          onDuplicateDetected={handleDuplicateDetected}
        />
      </Modal>

      {/* ── Modal preview / cetak ────────────────────────────────────────────── */}
      <Modal
        open={printModalOpen}
        onClose={() => { setPrintModalOpen(false); setPrintingRaport(null); }}
        title="Preview Raport"
        size="lg"
      >
        {printingRaport && (
          <RaportPrintable raport={printingRaport} />
        )}
      </Modal>
    </div>
  );
}
