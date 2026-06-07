'use client';

import React, { useRef, useState } from 'react';
import {
  Upload, Download, CheckCircle2, XCircle,
  FileSpreadsheet, AlertTriangle, X,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface ImportDetailRow {
  row: number;
  nisn?: string;
  nama?: string;
  status: 'berhasil' | 'gagal';
  alasan?: string;
}

interface ImportSummary {
  total: number;
  berhasil: number;
  gagal: number;
}

type ImportPhase = 'idle' | 'uploading' | 'done' | 'error';
type FilterView = 'semua' | 'berhasil' | 'gagal';

interface ImportExcelModalProps {
  open: boolean;
  onClose: () => void;
  onImportDone: () => void;
}

export default function ImportExcelModal({ open, onClose, onImportDone }: ImportExcelModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [detail, setDetail] = useState<ImportDetailRow[]>([]);
  const [filterView, setFilterView] = useState<FilterView>('semua');
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const reset = () => {
    setPhase('idle');
    setSelectedFile(null);
    setErrorMessage('');
    setSummary(null);
    setDetail([]);
    setFilterView('semua');
  };

  const handleClose = () => {
    if (phase === 'done' && summary && summary.berhasil > 0) onImportDone();
    reset();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setErrorMessage('Hanya file .xlsx atau .xls yang didukung.');
      setPhase('error');
      return;
    }
    setSelectedFile(file);
    setPhase('idle');
    setErrorMessage('');
    setSummary(null);
    setDetail([]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setPhase('uploading');
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch('/api/siswa/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) { setErrorMessage(json.message ?? 'Gagal import.'); setPhase('error'); return; }
      setSummary(json.ringkasan ?? null);
      setDetail(json.detail ?? []);
      setPhase('done');
    } catch {
      setErrorMessage('Terjadi kesalahan jaringan. Coba lagi.');
      setPhase('error');
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await fetch('/api/siswa/template');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_import_siswa.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Gagal mengunduh template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Export baris gagal ke Excel
  const handleExportGagal = async () => {
    const gagalRows = detail.filter(d => d.status === 'gagal');
    if (gagalRows.length === 0) return;

    const { utils, write } = await import('xlsx');
    const data = gagalRows.map(r => ({
      Baris: r.row,
      NISN: r.nisn || '',
      Nama: r.nama || '',
      Alasan: r.alasan || '',
    }));
    const ws = utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 28 }, { wch: 50 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Data Gagal');
    const buf = write(wb, { type: 'buffer', bookType: 'xlsx' });
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_gagal.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDone = phase === 'done';
  const isUploading = phase === 'uploading';

  const filteredDetail = detail.filter(d =>
    filterView === 'semua' ? true :
    filterView === 'berhasil' ? d.status === 'berhasil' :
    d.status === 'gagal'
  );

  const pct = summary && summary.total > 0
    ? Math.round((summary.berhasil / summary.total) * 100)
    : 0;

  return (
    <Modal open={open} onClose={handleClose} title="Import Data Siswa dari Excel" size="xl" closeOnBackdrop={!isUploading}>
      <div className="space-y-5">

        {/* Download template */}
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
          <FileSpreadsheet size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">Template Excel tersedia</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Download template yang sudah berisi contoh data, panduan pengisian, dan daftar kelas.
            </p>
          </div>
          <Button size="sm" variant="secondary" leftIcon={<Download size={13} />}
            onClick={handleDownloadTemplate} loading={downloadingTemplate}>
            Download Template
          </Button>
        </div>

        {/* File picker */}
        {!isDone && (
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih File Excel</label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-emerald-400 bg-emerald-50'
                  : selectedFile
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet size={28} className="text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-emerald-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPhase('idle'); }}
                    className="ml-4 text-slate-400 hover:text-slate-600"
                    aria-label="Hapus file"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={28} className="text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Klik atau drag & drop file di sini</p>
                  <p className="text-xs text-slate-400 mt-1">Format .xlsx atau .xls · Maks. 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
            />
          </div>
        )}

        {/* Error */}
        {phase === 'error' && errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            {errorMessage}
          </div>
        )}

        {/* Uploading progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Mengimport data...</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-emerald-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Result */}
        {isDone && summary && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-3xl font-bold text-slate-700">{summary.total}</p>
                <p className="text-xs text-slate-500 mt-1">Total Data</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-3xl font-bold text-emerald-700">{summary.berhasil}</p>
                <p className="text-xs text-emerald-600 mt-1">Berhasil Diimpor</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{summary.gagal}</p>
                <p className="text-xs text-red-500 mt-1">Gagal</p>
              </div>
            </div>

            {/* Progress bar */}
            {summary.total > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tingkat keberhasilan</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Filter + export */}
            {detail.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  {(['semua', 'berhasil', 'gagal'] as FilterView[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterView(f)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                        filterView === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {f} {f !== 'semua' && `(${f === 'berhasil' ? summary.berhasil : summary.gagal})`}
                    </button>
                  ))}
                </div>
                {summary.gagal > 0 && (
                  <Button size="sm" variant="secondary" leftIcon={<Download size={13} />} onClick={handleExportGagal}>
                    Export Gagal
                  </Button>
                )}
              </div>
            )}

            {/* Detail table */}
            {detail.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">Baris</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">NISN</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">Nama</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">Status</th>
                      <th className="px-3 py-2 text-left text-slate-500 font-semibold">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDetail.map((row) => (
                      <tr key={row.row} className={row.status === 'berhasil' ? 'bg-white' : 'bg-red-50/50'}>
                        <td className="px-3 py-2 text-slate-400">{row.row}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{row.nisn || '—'}</td>
                        <td className="px-3 py-2 text-slate-700 font-medium">{row.nama || '—'}</td>
                        <td className="px-3 py-2">
                          {row.status === 'berhasil' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 size={13} /> Berhasil
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                              <XCircle size={13} /> Gagal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{row.alasan || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-1">
          <div>
            {isDone && summary && summary.berhasil > 0 && (
              <button onClick={reset} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Import file lain
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isUploading}>
              {isDone ? 'Selesai' : 'Batal'}
            </Button>
            {!isDone && (
              <Button variant="primary" leftIcon={<Upload size={15} />}
                onClick={handleImport} loading={isUploading} disabled={!selectedFile}>
                Import Sekarang
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
