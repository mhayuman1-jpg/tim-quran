'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Printer, Upload, CreditCard, CheckCircle2, Trash2, Filter, Download, ArrowLeft, Users, BookOpen, FileDown, Loader2 } from 'lucide-react';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/shared/SearchInput';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

import SiswaTable from '@/components/features/siswa/SiswaTable';
import SiswaForm, { SiswaFormData } from '@/components/features/siswa/SiswaForm';
import ImportExcelModal from '@/components/features/siswa/ImportExcelModal';

import type { Santri } from '@/types';
import { useToast } from '@/lib/toast';
import { useRole } from '@/hooks/useRole';
import { useViewMode } from '@/hooks/useViewMode';

export default function SiswaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useRole();
  const { viewAsRole, viewAsTeacherId } = useViewMode();

  // ── Data
  const [data, setData] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; jumlah_siswa?: number }[]>([]);
  const [classFilter, setClassFilter] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');

  // ── Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Santri | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Delete
  const [deleteTarget, setDeleteTarget] = useState<Santri | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Bulk delete
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // ── Import
  const [importOpen, setImportOpen] = useState(false);

  // ── Download PDF
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // ── Print confirm — muncul setelah siswa baru ditambah
  const [printConfirmSiswa, setPrintConfirmSiswa] = useState<Santri | null>(null);

  // ── Fetch
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);

  const fetchSiswa = useCallback(async (q = '', classId = '') => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (classId) params.set('class_id', classId);
      const qs = params.toString();
      const url = qs ? `/api/siswa/list?${qs}` : '/api/siswa/list';
      const res = await fetch(url, { headers: viewHeaders });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal memuat data siswa.'); setData([]); }
      else setData(json.data ?? []);
    } catch { toast.error('Terjadi kesalahan saat memuat data siswa.'); setData([]); }
    finally { setLoading(false); }
  }, [toast, viewHeaders]);

  useEffect(() => {
    fetchSiswa();
    fetch('/api/kelas/list', { headers: viewHeaders })
      .then(r => r.json())
      .then(json => setClasses(json.data ?? []))
      .catch(() => {});
  }, [fetchSiswa, viewHeaders]);

  const handleSearch = (value: string) => { setSearch(value); setSelectedIds([]); fetchSiswa(value, classFilter); };
  const handleClassFilter = (value: string) => { setClassFilter(value); setSelectedIds([]); fetchSiswa(search, value); };

  // ── Teacher mode: class-first view
  const isTeacherMode = role === 'Tim_Quran' || (viewAsRole === 'Tim_Quran');
  const handleSelectClass = (classId: string, className: string) => {
    setSelectedClassName(className);
    setClassFilter(classId);
    fetchSiswa('', classId);
  };
  const handleBackToClasses = () => {
    setSelectedClassName('');
    setClassFilter('');
    setSelectedIds([]);
    fetchSiswa();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (classFilter) params.set('class_id', classFilter);
      const qs = params.toString();
      const url = qs ? `/api/siswa/export?${qs}` : '/api/siswa/export';
      const res = await fetch(url, { headers: viewHeaders });
      if (!res.ok) { toast.error('Gagal mengexport data.'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `data_siswa.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Data berhasil diexport.');
    } catch { toast.error('Terjadi kesalahan saat export.'); }
  };

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
      await fetchSiswa(search, classFilter);

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

  // ── Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const res = await fetch('/api/siswa/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message ?? 'Gagal menghapus siswa.'); return; }
      toast.success(json.message ?? 'Siswa berhasil dihapus.');
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      fetchSiswa(search);
    } catch { toast.error('Terjadi kesalahan saat menghapus siswa.'); }
    finally { setBulkDeleteLoading(false); }
  };

  // ── Print helpers
  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return;
    router.push(`/siswa/print?ids=${selectedIds.join(',')}`);
  };

  const handlePrintOne = (siswa: Santri) => {
    router.push(`/siswa/print?ids=${siswa.id}`);
  };

  const handleDownloadPdfSelected = async () => {
    if (selectedIds.length === 0 || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      // Fetch student data + profile
      const [siswaRes, profilRes] = await Promise.all([
        fetch(`/api/siswa/list?limit=500`),
        fetch('/api/website/profil').catch(() => null),
      ]);

      let profil: { nama_lembaga?: string; logo_url?: string | null; logo_sekolah_url?: string | null; nama_sekolah?: string | null } = {};
      if (profilRes?.ok) {
        const pj = await profilRes.json();
        if (pj.data) profil = pj.data;
      }

      if (!siswaRes.ok) throw new Error('Gagal mengambil data siswa.');
      const json = await siswaRes.json();
      const all: Santri[] = json.data ?? [];
      const idSet = new Set(selectedIds);
      const selected = all.filter(s => idSet.has(s.id));

      if (selected.length === 0) {
        toast.error('Siswa yang dipilih tidak ditemukan.');
        return;
      }

      // Dynamically import components
      const { StudentIDCard } = await import('@/components/shared/StudentIDCard');
      const { generateQRCodeDataURL } = await import('@/lib/qrcode');
      const { toImageUrl } = await import('@/lib/storage/urls');
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');
      const React = await import('react');
      const ReactDOMClient = await import('react-dom/client');

      // Create hidden container
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
      document.body.appendChild(container);

      // Render all cards
      const root = ReactDOMClient.createRoot(container);
      root.render(
        React.createElement('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '24px', padding: '16px' } },
          selected.map(s =>
            React.createElement('div', { key: s.id, id: `bulk-card-${s.id}`, className: 'flex flex-col gap-2 items-start' },
              React.createElement(StudentIDCard, {
                student: {
                  id: s.id,
                  nisn: s.nisn,
                  nama: s.nama,
                  qr_code: s.qr_code,
                  photo_url: s.photo_url,
                  juz_terakhir: s.juz_terakhir,
                  classes: s.classes,
                },
                namaLembaga: profil.nama_lembaga ?? "Tim Qur'an",
                logoUrl: profil.logo_url ?? null,
                logoSekolahUrl: profil.logo_sekolah_url ?? null,
                namaSekolah: profil.nama_sekolah ?? null,
                cardId: `bulk-card-${s.id}`,
              })
            )
          )
        )
      );

      // Wait for rendering + QR code generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // A4 Landscape: 297mm x 210mm, Card: 85mm x 55mm
      const CARD_W = 85, CARD_H = 55;
      const PAGE_W = 297, PAGE_H = 210;
      const GAP = 4; // mm gap between cards
      const COLS = 3, ROWS = 3;
      const MARGIN_X = (PAGE_W - CARD_W * COLS - GAP * (COLS - 1)) / 2;
      const MARGIN_Y = (PAGE_H - CARD_H * ROWS - GAP * (ROWS - 1)) / 2;
      const PER_PAGE = COLS * ROWS;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let i = 0; i < selected.length; i++) {
        const s = selected[i];
        const cardEl = document.getElementById(`bulk-card-${s.id}`);
        if (!cardEl) continue;

        if (i > 0 && i % PER_PAGE === 0) pdf.addPage();

        const dataUrl = await toPng(cardEl, { pixelRatio: 3, skipAutoScale: false, cacheBust: true });

        const pos = i % PER_PAGE;
        const col = pos % COLS;
        const row = Math.floor(pos / COLS);
        const x = MARGIN_X + col * (CARD_W + GAP);
        const y = MARGIN_Y + row * (CARD_H + GAP);
        pdf.addImage(dataUrl, 'PNG', x, y, CARD_W, CARD_H);
      }

      // Cleanup
      root.unmount();
      document.body.removeChild(container);

      const timestamp = new Date().toISOString().slice(0, 10);
      pdf.save(`IDCard_Santri_${timestamp}.pdf`);
      toast.success(`${selected.length} ID Card berhasil diunduh sebagai PDF.`);
    } catch (err) {
      console.error('Gagal download PDF:', err);
      toast.error('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setDownloadingPdf(false);
    }
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
            <>
              <Button
                variant="secondary"
                leftIcon={downloadingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                onClick={handleDownloadPdfSelected}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? 'Membuat PDF...' : `Download PDF (${selectedIds.length})`}
              </Button>
              <Button variant="secondary" leftIcon={<Printer size={15} />} onClick={handlePrintSelected}>
                Cetak ID Card ({selectedIds.length})
              </Button>
              {(role === 'Kabid' || role === 'Sekretaris') && (
                <Button variant="danger" leftIcon={<Trash2 size={15} />} onClick={() => setBulkDeleteOpen(true)}>
                  Hapus ({selectedIds.length})
                </Button>
              )}
            </>
          )}
          {role !== 'Tim_Quran' && (
            <>
              <Button variant="secondary" leftIcon={<Download size={15} />} onClick={handleExport}>
                Export Excel
              </Button>
              <Button variant="secondary" leftIcon={<Upload size={15} />} onClick={() => setImportOpen(true)}>
                Import Excel
              </Button>
              <Button variant="primary" leftIcon={<Plus size={15} />} onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                Tambah Siswa
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search + Filter — only for non-teacher mode or when a class is selected */}
      {(!isTeacherMode || selectedClassName) && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-sm flex-1">
            <SearchInput defaultValue={search} onSearch={handleSearch} placeholder="Cari nama atau NISN siswa..." />
          </div>
          {isTeacherMode && selectedClassName && (
            <Button variant="ghost" leftIcon={<ArrowLeft size={15} />} onClick={handleBackToClasses}>
              Semua Kelas
            </Button>
          )}
          {!isTeacherMode && classes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Filter size={15} className="text-slate-400" />
              <select
                value={classFilter}
                onChange={e => handleClassFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Semua Kelas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Class-first view for Tim_Quran ── */}
      {isTeacherMode && !selectedClassName && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Pilih kelas untuk melihat daftar siswa yang Anda ampu.</p>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl p-5 animate-pulse bg-white border border-slate-100">
                  <div className="h-5 w-24 rounded bg-slate-200 mb-3" />
                  <div className="h-8 w-16 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center">
              <Users size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Belum ada kelas yang ditugaskan kepada Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectClass(c.id, c.name)}
                  className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-amber-400 hover:bg-amber-50 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                      <BookOpen size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.jumlah_siswa ?? 0} siswa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                    Lihat Siswa →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Table (non-teacher mode, or when a class is selected) ── */}
      {(!isTeacherMode || selectedClassName) && (
        <>
          {selectedClassName && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">Kelas:</span>
              <span className="text-sm font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">{selectedClassName}</span>
            </div>
          )}
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
        </>
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
          userRole={role}
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

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => { if (!bulkDeleteLoading) setBulkDeleteOpen(false); }}
        onConfirm={handleBulkDelete}
        title="Hapus Siswa Terpilih"
        message={`Hapus ${selectedIds.length} siswa yang dipilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Semua" loading={bulkDeleteLoading}
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
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-amber-600" />
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
