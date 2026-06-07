'use client';

// src/app/(dashboard)/raport/page.tsx
// Halaman Raport Tahfidz — tampilkan preview langsung + inline edit

import React, { useState, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, ClipboardList, Trash2, Printer, ChevronLeft, FileDown } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import RaportTahfidzForm, { type RaportTahfidzFormData } from '@/components/features/raport/RaportTahfidzForm';
import RaportTahfidzPrintable, { type RaportTahfidzData, type DetailSurahData } from '@/components/features/raport/RaportTahfidzPrintable';
import { useRole } from '@/hooks/useRole';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RaportRow {
  id: string;
  periode: string;
  tahun_ajaran: string;
  juz?: number | null;
  catatan?: string | null;
  nama_guru_kelas?: string | null;
  niy_guru_kelas?: string | null;
  nama_kabid?: string | null;
  niy_kabid?: string | null;
  nama_kepala_sekolah?: string | null;
  niy_kepala_sekolah?: string | null;
  tahsin_metode?: string | null;
  tahsin_buku?: string | null;
  tahsin_halaman?: string | null;
  tahsin_makhroj?: string | null;
  tahsin_kelancaran?: string | null;
  tahsin_adab?: string | null;
  tahsin_catatan?: string | null;
  created_at?: string;
  santri?: {
    id: string;
    nama: string;
    nisn: string;
    classes?: { id: string; name: string } | null;
  } | null;
  users?: { id: string; name: string } | null;
  raport_tahfidz_detail?: DetailSurahData[];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportPage() {
  const { isKabid } = useRole();
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'xlsx' | null>(null);

  // ── States ────────────────────────────────────────────────────────────────
  const [raportList, setRaportList] = useState<RaportRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filterPeriode, setFilterPeriode] = useState('');

  // Selected raport for preview
  const [selected, setSelected] = useState<RaportRow | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [inlineEdit, setInlineEdit] = useState(false);
  const [inlineDraft, setInlineDraft] = useState<Partial<RaportTahfidzData> & { detail?: DetailSurahData[] }>({});

  // Form modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<RaportTahfidzFormData> | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_${selected?.santri?.nama ?? 'Siswa'}_${selected?.periode ?? ''}`,
    pageStyle: `
      @page { size: 210mm 330mm; margin: 12mm; }
      @media print { body { margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    `,
  });

  // ── Download PDF ──────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!printRef.current || !selected || downloadingFormat) return;
    setDownloadingFormat('pdf');
    try {
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      const element = printRef.current;

      // Make the hidden print portal renderable for html-to-image by temporarily
      // toggling a class on body that forces the portal to be visible off-screen.
      document.body.classList.add('render-print-temp');
      // wait a frame so styles apply
      await new Promise(requestAnimationFrame);

      const rect = element.getBoundingClientRect();
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });

      // cleanup temporary class
      document.body.classList.remove('render-print-temp');

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar untuk PDF'));
      });

      const pdf = new jsPDF({ unit: 'mm', format: [210, 330] });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      // Calculate image size in mm keeping aspect ratio
      const ratio = img.width / img.height || 1;
      const imgWidth = usableWidth;
      const imgHeight = imgWidth / ratio;

      // Number of pages required
      const totalPages = Math.max(1, Math.ceil(imgHeight / usableHeight));

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();
        // y offset in image coordinates -> how much we need to shift the image up
        const yOffset = page * usableHeight;
        // draw the same large image, shifted so the correct slice appears on the page
        const positionY = margin - yOffset;
        pdf.addImage(dataUrl, 'PNG', margin, positionY, imgWidth, imgHeight);
      }

      const filename = `Raport_${selected.santri?.nama ?? 'Siswa'}_${selected.periode ?? 'Undated'}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Gagal mengunduh PDF. Silakan coba lagi.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  // ── Download Excel ────────────────────────────────────────────────────────
  const handleDownloadExcel = async () => {
    if (!selected || downloadingFormat) return;
    setDownloadingFormat('xlsx');
    try {
      const XLSX = await import('xlsx');
      
      // Prepare data for Excel
      const details = selected.raport_tahfidz_detail ?? [] as DetailSurahData[];
      const rows = [
        ['RAPORT TAHFIDZ & TAHSIN'],
        [],
        ['Data Siswa'],
        ['Nama Siswa', selected.santri?.nama ?? '—'],
        ['NISN', selected.santri?.nisn ?? '—'],
        ['Kelas', selected.santri?.classes?.name ?? '—'],
        [],
        ['Data Raport'],
        ['Periode', selected.periode ?? '—'],
        ['Tahun Ajaran', selected.tahun_ajaran ?? '—'],
        ['Juz', selected.juz ?? '—'],
        ['Catatan', selected.catatan ?? '—'],
        [],
        ['Data Tahsin'],
        ['Metode', selected.tahsin_metode ?? '—'],
        ['Buku', selected.tahsin_buku ?? '—'],
        ['Halaman', selected.tahsin_halaman ?? '—'],
        ['Makhroj', selected.tahsin_makhroj ?? '—'],
        ['Kelancaran', selected.tahsin_kelancaran ?? '—'],
        ['Adab', selected.tahsin_adab ?? '—'],
        ['Catatan', selected.tahsin_catatan ?? '—'],
        [],
        ['Detail Surah'],
        ['Urutan', 'Nama Surah', 'Makhroj', 'Tajwid', 'Lancar', 'Wafa Buku', 'Wafa Halaman'],
        ...details.map((d: DetailSurahData) => [
          d.urutan ?? '',
          d.nama_surah ?? '',
          d.makhroj ?? '',
          d.tajwid ?? '',
          d.lancar ?? '',
          d.wafa_buku ?? '',
          d.wafa_halaman ?? '',
        ]),
        [],
        ['Tandatangan'],
        ['Guru Kelas', selected.nama_guru_kelas ?? '—'],
        ['NIY', selected.niy_guru_kelas ?? '—'],
        [],
        ['Kabid', selected.nama_kabid ?? '—'],
        ['NIY', selected.niy_kabid ?? '—'],
        [],
        ['Kepala Sekolah', selected.nama_kepala_sekolah ?? '—'],
        ['NIY', selected.niy_kepala_sekolah ?? '—'],
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 },
      ];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Raport');
      
      const filename = `Raport_${selected.santri?.nama ?? 'Siswa'}_${selected.periode ?? 'Undated'}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Gagal mengunduh Excel. Silakan coba lagi.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchRaport = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    setSearched(true);
    setSelected(null);
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

  // ── Select raport (load full detail) ────────────────────────────────────────
  const handleSelect = async (row: RaportRow) => {
    setSelectedLoading(true);
    try {
      const res = await fetch(`/api/raport/tahfidz?id=${row.id}`);
      const json = await res.json();
      setSelected(json.data ?? row);
      setInlineDraft({});
      setInlineEdit(false);
    } catch {
      setSelected(row);
      setInlineDraft({});
      setInlineEdit(false);
    } finally {
      setSelectedLoading(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async (row: RaportRow) => {
    setFormError(null);
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
      niy_guru_kelas: full.niy_guru_kelas ?? '',
      nama_kabid: full.nama_kabid ?? '',
      niy_kabid: full.niy_kabid ?? '',
      nama_kepala_sekolah: full.nama_kepala_sekolah ?? '',
      niy_kepala_sekolah: full.niy_kepala_sekolah ?? '',
      tahsin_metode: full.tahsin_metode ?? '',
      tahsin_buku: full.tahsin_buku ?? '',
      tahsin_halaman: full.tahsin_halaman ?? '',
      tahsin_makhroj: full.tahsin_makhroj ?? '',
      tahsin_kelancaran: full.tahsin_kelancaran ?? '',
      tahsin_adab: full.tahsin_adab ?? '',
      tahsin_catatan: full.tahsin_catatan ?? '',
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

  // ── Submit ────────────────────────────────────────────────────────────────
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
      if (!res.ok) { setFormError(json.message ?? 'Gagal menyimpan.'); return; }
      setFormSuccess(id ? 'Raport berhasil diperbarui.' : 'Raport berhasil disimpan.');
      setFormOpen(false);
      fetchRaport();
      // Jika sedang preview, reload
      if (selected && id === selected.id) {
        const r = await fetch(`/api/raport/tahfidz?id=${id}`);
        const j = await r.json();
        setSelected(j.data ?? selected);
      }
    } catch {
      setFormError('Terjadi kesalahan.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/raport/tahfidz', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      });
      if (!res.ok) { const j = await res.json(); alert(j.message); return; }
      if (selected?.id === deleteId) setSelected(null);
      setDeleteId(null);
      fetchRaport();
    } catch {
      alert('Gagal menghapus.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const currentPreviewRaport: RaportTahfidzData | null = selected ? {
    ...selected,
    ...inlineDraft,
    raport_tahfidz_detail: inlineDraft.detail ?? selected.raport_tahfidz_detail,
  } : selected;

  const handleInlineFieldChange = (field: keyof RaportTahfidzData, value: string | null) => {
    setInlineDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleInlineDetailChange = (index: number, field: keyof DetailSurahData, value: string | null) => {
    setInlineDraft(prev => {
      const currentDetail = prev.detail ?? selected?.raport_tahfidz_detail ?? [];
      const updated = currentDetail.map((row, i) => i === index ? { ...row, [field]: value } : row);
      return { ...prev, detail: updated };
    });
  };

  const handleInlineAddRow = () => {
    setInlineDraft(prev => {
      const currentDetail = prev.detail ?? selected?.raport_tahfidz_detail ?? [];
      const nextRow: DetailSurahData = {
        urutan: currentDetail.length + 1,
        nama_surah: '',
        makhroj: '',
        tajwid: '',
        lancar: '',
        wafa_buku: '',
        wafa_halaman: '',
      };
      return { ...prev, detail: [...currentDetail, nextRow] };
    });
  };

  const handleInlineRemoveRow = (index: number) => {
    setInlineDraft(prev => {
      const currentDetail = prev.detail ?? selected?.raport_tahfidz_detail ?? [];
      const updated = currentDetail.filter((_, i) => i !== index).map((row, i) => ({ ...row, urutan: i + 1 }));
      return { ...prev, detail: updated };
    });
  };

  const handleSaveInline = async () => {
    if (!selected) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const body = { id: selected.id, ...inlineDraft };
      const res = await fetch('/api/raport/tahfidz', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.message ?? 'Gagal menyimpan perubahan.');
        return;
      }
      setSelected(json.data ?? selected);
      setInlineDraft({});
      setInlineEdit(false);
      setFormSuccess('Perubahan berhasil disimpan.');
      setTimeout(() => setFormSuccess(null), 3000);
    } catch {
      setFormError('Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-emerald-600" />
            Raport Tahfidz & Tahsin
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Penilaian hafalan dan tahsin Al-Qur'an per surah — format resmi siap cetak.</p>
        </div>
        <Button variant="primary" leftIcon={<Plus size={16} />}
          onClick={() => { setEditingId(null); setEditingData(null); setFormError(null); setFormOpen(true); }}>
          Buat Raport
        </Button>
      </div>

      {formSuccess && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex justify-between">
          <span>{formSuccess}</span>
          <button onClick={() => setFormSuccess(null)}>✕</button>
        </div>
      )}

      {/* Layout: list kiri + preview kanan */}
      <div className="flex gap-5 items-start">

        {/* ── KIRI: Daftar Raport ── */}
        <div className="w-80 shrink-0 space-y-3">
          {/* Filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <input
              type="text"
              value={filterPeriode}
              onChange={e => setFilterPeriode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchRaport()}
              placeholder="Filter periode..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button variant="primary" leftIcon={<Search size={14} />} onClick={fetchRaport} loading={listLoading} className="w-full justify-center">
              Tampilkan
            </Button>
            {listError && <p className="text-xs text-red-600">{listError}</p>}
          </div>

          {/* List */}
          {searched && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {listLoading ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : raportList.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">Tidak ada raport ditemukan.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {raportList.map(row => {
                    const isActive = selected?.id === row.id;
                    return (
                      <div key={row.id}
                        onClick={() => handleSelect(row)}
                        className={`p-3 cursor-pointer transition-colors hover:bg-emerald-50 ${isActive ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{row.santri?.nama ?? '—'}</p>
                            <p className="text-xs text-slate-500">{row.santri?.classes?.name ?? '—'} · {row.periode}</p>
                            <p className="text-xs text-slate-400">{row.tahun_ajaran}{row.juz ? ` · Juz ${row.juz}` : ''}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={e => { e.stopPropagation(); handleEdit(row); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                              <Edit2 size={13} />
                            </button>
                            {isKabid() && (
                              <button onClick={e => { e.stopPropagation(); setDeleteId(row.id); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!searched && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <ClipboardList size={36} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Tekan Tampilkan untuk melihat raport.</p>
              <Button variant="secondary" className="mt-3" onClick={fetchRaport}>Tampilkan Semua</Button>
            </div>
          )}
        </div>

        {/* ── KANAN: Preview Raport ── */}
        <div className="flex-1 min-w-0">
          {selectedLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          ) : selected ? (
            <div className="space-y-4">
              {/* Action bar */}
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelected(null)}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    <ChevronLeft size={16} /> Kembali
                  </button>
                  <div className="w-px h-5 bg-slate-200" />
                  <p className="text-sm font-semibold text-slate-700">
                    {selected.santri?.nama} — {selected.periode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={inlineEdit ? 'secondary' : 'ghost'} leftIcon={<Edit2 size={14} />} onClick={() => setInlineEdit(p => !p)}>
                    {inlineEdit ? 'Batal Edit Langsung' : 'Edit Langsung'}
                  </Button>
                  {inlineEdit && (
                    <Button variant="primary" leftIcon={<Edit2 size={14} />} onClick={handleSaveInline} loading={formSubmitting}>
                      Simpan Perubahan
                    </Button>
                  )}
                  <Button variant="primary" leftIcon={<Printer size={14} />} onClick={() => handlePrint()}>
                    Cetak
                  </Button>
                  <Button variant="secondary" leftIcon={<FileDown size={14} />} onClick={handleDownloadPdf} loading={downloadingFormat === 'pdf'}>
                    Download PDF
                  </Button>
                  <Button variant="secondary" leftIcon={<FileDown size={14} />} onClick={handleDownloadExcel} loading={downloadingFormat === 'xlsx'}>
                    Download Excel
                  </Button>
                </div>
              </div>

              {/* Preview card — this is also the print target */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div>
                  {currentPreviewRaport && (
                    <RaportTahfidzPrintable
                      raport={currentPreviewRaport}
                      hideButtons
                      contentRef={printRef}
                      inlineEdit={inlineEdit}
                      onInlineChange={handleInlineFieldChange}
                      onInlineDetailChange={handleInlineDetailChange}
                      onInlineAddRow={handleInlineAddRow}
                      onInlineRemoveRow={handleInlineRemoveRow}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
              <ClipboardList size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Pilih raport dari daftar di kiri</p>
              <p className="text-slate-400 text-sm mt-1">Preview akan tampil di sini secara langsung.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        open={formOpen}
        onClose={() => { if (!formSubmitting) { setFormOpen(false); setEditingId(null); setEditingData(null); setFormError(null); } }}
        title={editingId ? 'Edit Raport Tahfidz' : 'Buat Raport Tahfidz Baru'}
        size="xl"
        closeOnBackdrop={!formSubmitting}
      >
        {formError && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">{formError}</div>
        )}
        <RaportTahfidzForm
          editingId={editingId}
          initialData={editingData}
          loading={formSubmitting}
          onSubmit={handleFormSubmit}
          onCancel={() => { setFormOpen(false); setEditingId(null); setEditingData(null); setFormError(null); }}
        />
      </Modal>

      {/* Konfirmasi Hapus */}
      <Modal open={Boolean(deleteId)} onClose={() => { if (!deleteLoading) setDeleteId(null); }} title="Hapus Raport" size="sm">
        <p className="text-sm text-slate-600 mb-5">Yakin ingin menghapus raport ini? Semua data surah akan ikut terhapus.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={deleteLoading}>Batal</Button>
          <Button variant="primary" loading={deleteLoading} onClick={handleDelete}
            className="!bg-red-600 hover:!bg-red-700">Hapus</Button>
        </div>
      </Modal>
    </div>
  );
}
