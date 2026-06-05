'use client';

// src/app/(dashboard)/raport/page.tsx
// Halaman Raport Tahfidz
// - Daftar raport per siswa per periode
// - Form input: pilih siswa, periode, tabel surah per baris (nilai ✓/A/B/C/D + WAFA)
// - Preview & cetak format resmi (mirip contoh raport sekolah)

import React, { useState, useCallback } from 'react';
import { FileText, Plus, Search, Eye, Edit2, ClipboardList, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import DataTable, { type ColumnDef } from '@/components/shared/DataTable';
import RaportTahfidzForm, { type RaportTahfidzFormData } from '@/components/features/raport/RaportTahfidzForm';
import RaportTahfidzPrintable, { type RaportTahfidzData } from '@/components/features/raport/RaportTahfidzPrintable';
import { useRole } from '@/hooks/useRole';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RaportRow {
  id: string;
  periode: string;
  tahun_ajaran: string;
  juz?: number | null;
  catatan?: string | null;
  created_at?: string;
  santri?: {
    id: string;
    nama: string;
    nisn: string;
    classes?: { id: string; name: string } | null;
  } | null;
  users?: { id: string; name: string } | null;
  raport_tahfidz_detail?: any[];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportPage() {
  const { isKabid } = useRole();

  // ── List state ───────────────────────────────────────────────────────────
  const [raportList, setRaportList] = useState<RaportRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filterPeriode, setFilterPeriode] = useState('');

  // ── Form modal ───────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<RaportTahfidzFormData> | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ── Preview modal ────────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<RaportTahfidzData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchRaport = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterPeriode.trim()) params.set('periode', filterPeriode.trim());
      const res = await fetch(`/api/raport/tahfidz?${params}`);
      const json = await res.json();
      if (!res.ok) { setListError(json.message ?? 'Gagal memuat data.'); setRaportList([]); return; }
      setRaportList(json.data ?? []);
    } catch {
      setListError('Terjadi kesalahan. Silakan coba lagi.');
      setRaportList([]);
    } finally {
      setListLoading(false);
    }
  }, [filterPeriode]);

  // ── Open add ─────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setEditingId(null);
    setEditingData(null);
    setFormError(null);
    setFormOpen(true);
  };

  // ── Open edit (fetch detail dulu) ────────────────────────────────────────
  const handleEdit = async (row: RaportRow) => {
    setFormError(null);
    // Fetch detail surah
    const res = await fetch(`/api/raport/tahfidz?id=${row.id}`);
    const json = await res.json();
    const full = json.data ?? row;

    setEditingId(row.id);
    setEditingData({
      student_id: full.santri?.id ?? '',
      periode: full.periode ?? '',
      tahun_ajaran: full.tahun_ajaran ?? '',
      juz: full.juz ?? null,
      catatan: full.catatan ?? '',
      nama_guru_kelas: full.nama_guru_kelas ?? '',
      nama_kabid: full.nama_kabid ?? '',
      nama_kepala_sekolah: full.nama_kepala_sekolah ?? '',
      detail: (full.raport_tahfidz_detail ?? [])
        .sort((a: any, b: any) => a.urutan - b.urutan)
        .map((d: any) => ({
          nama_surah: d.nama_surah ?? '',
          makhroj: d.makhroj ?? '',
          tajwid: d.tajwid ?? '',
          lancar: d.lancar ?? '',
          wafa_buku: d.wafa_buku ?? '',
          wafa_halaman: d.wafa_halaman ?? '',
        })),
    });
    setFormOpen(true);
  };

  // ── Preview ──────────────────────────────────────────────────────────────
  const handlePreview = async (row: RaportRow) => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/raport/tahfidz?id=${row.id}`);
      const json = await res.json();
      setPreviewData(json.data ?? row);
      setPreviewOpen(true);
    } catch {
      setPreviewData(row as RaportTahfidzData);
      setPreviewOpen(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Submit form ──────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: RaportTahfidzFormData, id?: string) => {
    setFormSubmitting(true);
    setFormError(null);
    try {
      const method = id ? 'PUT' : 'POST';
      const body = id ? { id, ...data } : data;
      const res = await fetch('/api/raport/tahfidz', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 409 && json.duplicate) {
        setFormError('Raport periode ini sudah ada. Gunakan tombol Edit untuk mengubahnya.');
        return;
      }
      if (!res.ok) { setFormError(json.message ?? 'Gagal menyimpan raport.'); return; }
      setFormSuccess(id ? 'Raport berhasil diperbarui.' : 'Raport berhasil disimpan.');
      setFormOpen(false);
      fetchRaport();
    } catch {
      setFormError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/raport/tahfidz', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.message); return; }
      setDeleteId(null);
      fetchRaport();
    } catch {
      alert('Gagal menghapus raport.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Kolom tabel ─────────────────────────────────────────────────────────
  const columns: ColumnDef<RaportRow>[] = [
    {
      key: 'siswa', header: 'Siswa',
      render: row => (
        <div>
          <p className="font-medium text-slate-800">{row.santri?.nama ?? '—'}</p>
          <p className="text-xs text-slate-400">{row.santri?.nisn ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'kelas', header: 'Kelas',
      render: row => row.santri?.classes?.name ?? '—',
    },
    {
      key: 'periode', header: 'Periode',
      render: row => (
        <div>
          <p className="font-medium text-slate-700">{row.periode}</p>
          <p className="text-xs text-slate-400">{row.tahun_ajaran}</p>
        </div>
      ),
    },
    {
      key: 'juz', header: 'Juz', align: 'center',
      render: row => row.juz ? (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          Juz {row.juz}
        </span>
      ) : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      key: 'guru', header: 'Guru',
      render: row => <span className="text-sm text-slate-600">{row.users?.name ?? '—'}</span>,
    },
    {
      key: 'aksi', header: 'Aksi', align: 'center',
      render: row => (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => handlePreview(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="Preview & Cetak"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <Edit2 size={15} />
          </button>
          {isKabid() && (
            <button
              onClick={() => setDeleteId(row.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Hapus"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-600" />
            Raport Tahfidz
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Penilaian hafalan Al-Qur&apos;an per surah — format resmi siap cetak.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleAdd}>
          Buat Raport
        </Button>
      </div>

      {/* ── Sukses notification ──────────────────────────────────────────────── */}
      {formSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex justify-between items-center">
          <span>{formSuccess}</span>
          <button onClick={() => setFormSuccess(null)} className="ml-4 text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* ── Filter ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Filter Raport</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={filterPeriode}
            onChange={e => setFilterPeriode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchRaport()}
            placeholder="Filter periode, misal: Semester I"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button variant="primary" leftIcon={<Search size={15} />} onClick={fetchRaport} loading={listLoading}>
            Tampilkan
          </Button>
        </div>
        {listError && <p className="mt-2 text-sm text-red-600">{listError}</p>}
      </div>

      {/* ── Tabel ────────────────────────────────────────────────────────────── */}
      {searched ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Daftar Raport
              {filterPeriode && <span className="text-slate-400 font-normal text-xs ml-2">— {filterPeriode}</span>}
            </h2>
            <span className="text-xs text-slate-400">{raportList.length} data</span>
          </div>
          <DataTable
            columns={columns}
            data={raportList}
            rowKey={r => r.id}
            loading={listLoading}
            emptyMessage="Tidak ada raport ditemukan."
            emptyIcon={<FileText size={32} className="text-slate-300" />}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileText size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Gunakan filter atau tekan Tampilkan untuk melihat semua raport.</p>
          <Button variant="secondary" className="mt-4" onClick={fetchRaport}>Tampilkan Semua</Button>
        </div>
      )}

      {/* ── Modal Form ───────────────────────────────────────────────────────── */}
      <Modal
        open={formOpen}
        onClose={() => { if (!formSubmitting) { setFormOpen(false); setEditingId(null); setEditingData(null); setFormError(null); } }}
        title={editingId ? 'Edit Raport Tahfidz' : 'Buat Raport Tahfidz Baru'}
        size="xl"
        closeOnBackdrop={!formSubmitting}
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
            {formError}
          </div>
        )}
        <RaportTahfidzForm
          editingId={editingId}
          initialData={editingData}
          loading={formSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={() => { setFormOpen(false); setEditingId(null); setEditingData(null); setFormError(null); }}
        />
      </Modal>

      {/* ── Modal Preview ─────────────────────────────────────────────────────── */}
      <Modal
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewData(null); }}
        title="Preview & Cetak Raport"
        size="xl"
      >
        {previewLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : previewData ? (
          <RaportTahfidzPrintable raport={previewData} />
        ) : null}
      </Modal>

      {/* ── Konfirmasi Hapus ──────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(deleteId)}
        onClose={() => { if (!deleteLoading) setDeleteId(null); }}
        title="Hapus Raport"
        size="sm"
      >
        <p className="text-sm text-slate-600 mb-5">
          Yakin ingin menghapus raport ini? Semua data penilaian surah akan ikut terhapus dan tidak bisa dikembalikan.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>Batal</Button>
          <Button
            variant="primary"
            loading={deleteLoading}
            onClick={handleDelete}
            className="!bg-red-600 hover:!bg-red-700"
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  );
}
