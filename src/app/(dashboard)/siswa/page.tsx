'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Printer, Upload, CreditCard, CheckCircle2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/shared/SearchInput';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

import SiswaTable from '@/components/features/siswa/SiswaTable';
import SiswaForm, { SiswaFormData } from '@/components/features/siswa/SiswaForm';
import ImportExcelModal from '@/components/features/siswa/ImportExcelModal';

import type { Santri } from '@/types';
import { useToast } from '@/lib/toast';

export default function SiswaPage() {
  const router = useRouter();
  const { toast } = useToast();

  // ── Data
  const [data, setData] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ── Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Santri | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Delete
  const [deleteTarget, setDeleteTarget] = useState<Santri | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Import
  const [importOpen, setImportOpen] = useState(false);

  // ── Print confirm — muncul setelah siswa baru ditambah
  const [printConfirmSiswa, setPrintConfirmSiswa] = useState<Santri | null>(null);

  // ── Fetch
  const fetchSiswa = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const url = q ? `/api/siswa/list?search=${encodeURIComponent(q)}` : '/api/siswa/list';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal memuat data siswa.'); setData([]); }
      else setData(json.data ?? []);
    } catch { toast.error('Terjadi kesalahan saat memuat data siswa.'); setData([]); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchSiswa(); }, [fetchSiswa]);

  const handleSearch = (value: string) => { setSearch(value); fetchSiswa(value); };

  // ── Add / Edit submit
  const handleFormSubmit = async (formData: SiswaFormData) => {
    setFormLoading(true);
    try {
      const isEdit = Boolean(editTarget);
      const res = await fetch(isEdit ? '/api/siswa/update' : '/api/siswa/add', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editTarget!.id } : {}),
          ...formData,
          class_id: formData.class_id || null,
          tanggal_lahir: formData.tanggal_lahir || null,
          photo_url: formData.photo_url || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.message ?? (isEdit ? 'Gagal memperbarui siswa.' : 'Gagal menambah siswa.'));
        return;
      }
      toast.success(json.message ?? (isEdit ? 'Siswa diperbarui.' : 'Siswa ditambahkan.'));
      setFormOpen(false);
      setEditTarget(null);
      await fetchSiswa(search);

      // Setelah tambah siswa baru, tawari cetak ID card
      if (!isEdit && json.data) {
        setPrintConfirmSiswa(json.data as Santri);
      }
    } catch { toast.error('Terjadi kesalahan. Coba lagi.'); }
    finally { setFormLoading(false); }
  };

  // ── Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/siswa/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal menghapus siswa.'); return; }
      toast.success(json.message ?? 'Siswa berhasil dihapus.');
      setDeleteTarget(null);
      setSelectedIds(prev => prev.filter(id => id !== deleteTarget.id));
      fetchSiswa(search);
    } catch { toast.error('Terjadi kesalahan saat menghapus siswa.'); }
    finally { setDeleteLoading(false); }
  };

  // ── Print helpers
  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return;
    router.push(`/siswa/print?ids=${selectedIds.join(',')}`);
  };

  const handlePrintOne = (siswa: Santri) => {
    router.push(`/siswa/print?ids=${siswa.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Siswa</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data siswa — tambah, edit, import Excel, dan cetak ID card.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <Button variant="secondary" leftIcon={<Printer size={15} />} onClick={handlePrintSelected}>
              Cetak ID Card ({selectedIds.length})
            </Button>
          )}
          <Button variant="secondary" leftIcon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
            Import Excel
          </Button>
          <Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => { setEditTarget(null); setFormOpen(true); }}>
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput defaultValue={search} onSearch={handleSearch} placeholder="Cari nama atau NISN siswa..." />
      </div>

      {/* Table */}
      <SiswaTable
        data={data} loading={loading}
        selectedIds={selectedIds} onSelectionChange={setSelectedIds}
        onEdit={s => { setEditTarget(s); setFormOpen(true); }}
        onDelete={s => setDeleteTarget(s)}
        onPrintOne={handlePrintOne}
      />

      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {data.length} siswa{search ? ` · hasil "${search}"` : ''}
        </p>
      )}

      {/* Form modal */}
      <Modal
        open={formOpen}
        onClose={() => { if (!formLoading) { setFormOpen(false); setEditTarget(null); } }}
        title={editTarget ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        size="md" closeOnBackdrop={!formLoading}
      >
        <SiswaForm
          initialData={editTarget} loading={formLoading}
          onSubmit={handleFormSubmit}
          onCancel={() => { if (!formLoading) { setFormOpen(false); setEditTarget(null); } }}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={handleConfirmDelete}
        title="Hapus Siswa"
        message={deleteTarget ? `Hapus siswa "${deleteTarget.nama}" (NISN: ${deleteTarget.nisn})? Tindakan ini tidak dapat dibatalkan.` : ''}
        confirmLabel="Hapus" loading={deleteLoading}
      />

      {/* Import Excel */}
      <ImportExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportDone={() => fetchSiswa(search)}
      />

      {/* ── Dialog: Cetak ID Card setelah siswa baru ditambah ── */}
      {printConfirmSiswa && (
        <Modal
          open={true}
          onClose={() => setPrintConfirmSiswa(null)}
          title="Siswa Berhasil Ditambahkan"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{printConfirmSiswa.nama}</p>
                <p className="text-sm text-slate-500">NISN: {printConfirmSiswa.nisn}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Apakah kamu ingin mencetak ID Card untuk siswa ini sekarang?
            </p>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="ghost" onClick={() => setPrintConfirmSiswa(null)}>
                Nanti Saja
              </Button>
              <Button
                variant="primary"
                leftIcon={<CreditCard size={16} />}
                onClick={() => {
                  const id = printConfirmSiswa.id;
                  setPrintConfirmSiswa(null);
                  router.push(`/siswa/print?ids=${id}`);
                }}
              >
                Cetak ID Card
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
