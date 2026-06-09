'use client';

// src/app/(dashboard)/rekap/page.tsx
// Halaman Rekap Bulanan
// - Form upload file Excel/PDF dengan pilih periode (bulan/tahun)
// - Tabel daftar rekap dengan metadata dan tombol download
// - Kedua role (Kabid dan Tim_Quran) dapat upload dan melihat rekap

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, Download, FileSpreadsheet, FileText, X, Calendar } from 'lucide-react';

import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toImageUrl } from '@/lib/storage/urls';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RekapItem {
  id: string;
  uploader_id: string;
  uploader_name: string;
  periode: string;
  file_name: string;
  file_url: string;
  signed_url: string | null;
  created_at: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format "2025-01" → "Januari 2025" */
function formatPeriode(periode: string): string {
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const [year, monthStr] = periode.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return periode;
  return `${bulanNames[monthIndex]} ${year}`;
}

/** Format ISO date string to locale date */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Detect file type from filename */
function getFileIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return <FileText size={16} className="text-red-500 shrink-0" />;
  }
  return <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />;
}

/** Build list of months for dropdown */
function buildMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  // Show 24 months: current month + past 23 months
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    options.push({ value, label: formatPeriode(value) });
  }
  return options;
}

// ─── Toast Component ────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={[
            'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm',
            t.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800',
          ].join(' ')}
        >
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Tutup notifikasi"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RekapPage() {
  // ── Data state
  const [data, setData] = useState<RekapItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPeriode, setSelectedPeriode] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Download loading state (per item)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Profil website untuk header laporan
  const [profilData, setProfilData] = useState<{
    nama_lembaga?: string;
    logo_url?: string;
    nama_sekolah?: string;
    logo_sekolah_url?: string;
  } | null>(null);

  // ── Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch rekap list
  const fetchRekap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rekap/list');
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat daftar rekap.');
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat daftar rekap.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRekap();
  }, [fetchRekap]);

  useEffect(() => {
    fetch('/api/website/profil')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) setProfilData(json.data);
      })
      .catch(() => null);
  }, []);

  const latestUpload = data.length > 0 ? data.reduce((latest, item) => {
    return new Date(item.created_at).getTime() > new Date(latest.created_at).getTime() ? item : latest;
  }, data[0]) : null;

  // ── Open upload modal
  const handleOpenUpload = () => {
    setSelectedFile(null);
    setSelectedPeriode('');
    setUploadError('');
    setUploadModalOpen(true);
  };

  // ── File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError('');
  };

  // ── Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError('');
  };

  // ── Submit upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      setUploadError('Pilih file yang akan diunggah terlebih dahulu.');
      return;
    }
    if (!selectedPeriode) {
      setUploadError('Pilih periode (bulan/tahun) terlebih dahulu.');
      return;
    }

    setUploadLoading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('periode', selectedPeriode);

      const res = await fetch('/api/rekap/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.message ?? 'Gagal mengunggah file rekap.');
        return;
      }

      showToast('success', json.message ?? 'File rekap berhasil diunggah.');
      setUploadModalOpen(false);
      setSelectedFile(null);
      setSelectedPeriode('');
      fetchRekap();
    } catch {
      setUploadError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Download rekap
  const handleDownload = async (rekap: RekapItem) => {
    if (!rekap.signed_url) {
      showToast('error', 'URL unduhan tidak tersedia untuk file ini.');
      return;
    }

    setDownloadingId(rekap.id);
    try {
      // Fetch the file to trigger download
      const res = await fetch(rekap.signed_url);
      if (!res.ok) {
        showToast('error', 'Gagal mengunduh file. URL mungkin telah kedaluwarsa.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = rekap.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'Terjadi kesalahan saat mengunduh file.');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Download template file
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/rekap/template');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('error', json.message ?? 'Gagal mengunduh template.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap_Template.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('success', 'Template rekap berhasil diunduh.');
    } catch (err) {
      showToast('error', 'Terjadi kesalahan saat mengunduh template.');
    }
  };

  const monthOptions = buildMonthOptions();

  return (
    <div className="space-y-6">
      {/* ── Page header */}
      <div className="grid gap-5">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid h-20 w-20 place-items-center rounded-3xl border border-slate-200 bg-white">
              {profilData?.logo_sekolah_url ? (
                <Image src={toImageUrl(profilData.logo_sekolah_url) || ''} alt={profilData.nama_sekolah ?? 'Logo Sekolah'} width={72} height={72} className="object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 text-xs">Logo</div>
              )}
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Laporan Resmi</p>
              <h1 className="text-3xl font-bold text-slate-900">Rekap Bulanan</h1>
              <p className="mt-1 text-sm text-slate-600">{profilData?.nama_sekolah ?? 'SDIT Al Hilmi Dompu'}</p>
              <p className="text-sm text-slate-600">{profilData?.nama_lembaga ?? 'Lembaga Pendidikan'}</p>
            </div>

            <div className="grid h-20 w-20 place-items-center rounded-3xl border border-slate-200 bg-white">
              {profilData?.logo_url ? (
                <Image src={toImageUrl(profilData.logo_url) || ''} alt={profilData.nama_lembaga ?? 'Logo Tim'} width={72} height={72} className="object-contain" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 text-xs">Logo</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Periode</p>
              <p className="text-lg font-semibold text-slate-900">{latestUpload ? formatPeriode(latestUpload.periode) : 'Belum tersedia'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Jumlah File Rekap</p>
              <p className="text-lg font-semibold text-slate-900">{data.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Upload Terakhir</p>
              <p className="text-lg font-semibold text-slate-900">{latestUpload ? formatDate(latestUpload.created_at) : '–'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">Unggah Rekap Bulanan</p>
              <p className="text-sm text-slate-500">Isi file rekap yang valid dan pilih periode.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" leftIcon={<Download size={15} />} onClick={handleDownloadTemplate}>
                Unduh Template
              </Button>
              <Button variant="primary" leftIcon={<Upload size={15} />} onClick={handleOpenUpload}>
                Unggah
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm bg-white">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-700 text-white">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Status Rekap Bulanan</p>
              <p className="text-3xl font-semibold text-slate-900">{data.length}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total File</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{data.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Periode Terbaru</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{latestUpload ? formatPeriode(latestUpload.periode) : '–'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Unggahan Terakhir</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{latestUpload ? formatDate(latestUpload.created_at) : '–'}</p>
              {latestUpload && (
                <p className="mt-1 text-sm text-slate-500">{latestUpload.uploader_name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Petunjuk</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>1. Pastikan file rekap menggunakan format resmi.</li>
            <li>2. Periode ditentukan bulan/tahun.</li>
            <li>3. Unduh kembali jika URL kadaluarsa.</li>
          </ul>
        </div>
      </div>

      {/* ── Rekap table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em]">
                  File
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em]">
                  Periode
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em]">
                  Diunggah Oleh
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em]">
                  Tanggal Unggah
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em]">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-48"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-28"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileSpreadsheet size={36} className="opacity-50" />
                      <p className="text-sm font-medium text-slate-500">
                        Belum ada rekap yang diunggah
                      </p>
                      <p className="text-xs">
                        Klik tombol &quot;Unggah Rekap&quot; untuk menambahkan file rekap bulanan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((rekap) => (
                  <tr key={rekap.id} className="hover:bg-slate-50 transition-colors">
                    {/* File name with icon */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 max-w-xs">
                        {getFileIcon(rekap.file_name)}
                        <span
                          className="text-sm text-slate-800 truncate"
                          title={rekap.file_name}
                        >
                          {rekap.file_name}
                        </span>
                      </div>
                    </td>
                    {/* Periode */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span>{formatPeriode(rekap.periode)}</span>
                      </div>
                    </td>
                    {/* Uploader */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{rekap.uploader_name}</span>
                    </td>
                    {/* Upload date */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{formatDate(rekap.created_at)}</span>
                    </td>
                    {/* Download action */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download size={14} />}
                          onClick={() => handleDownload(rekap)}
                          loading={downloadingId === rekap.id}
                          disabled={!rekap.signed_url || downloadingId === rekap.id}
                          title={rekap.signed_url ? 'Unduh file rekap' : 'URL tidak tersedia'}
                        >
                          Unduh
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Total count */}
      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Total {data.length} file rekap
        </p>
      )}

      {/* ── Upload modal */}
      <Modal
        open={uploadModalOpen}
        onClose={() => {
          if (!uploadLoading) setUploadModalOpen(false);
        }}
        title="Unggah Rekap Bulanan"
        size="md"
        closeOnBackdrop={!uploadLoading}
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* Periode selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="periode-select"
              className="block text-sm font-medium text-slate-700"
            >
              Periode (Bulan/Tahun) <span className="text-red-500">*</span>
            </label>
            <select
              id="periode-select"
              value={selectedPeriode}
              onChange={(e) => {
                setSelectedPeriode(e.target.value);
                setUploadError('');
              }}
              disabled={uploadLoading}
              required
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'border-slate-300 bg-white text-slate-900',
              ].join(' ')}
            >
              <option value="">-- Pilih periode --</option>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              File Rekap <span className="text-red-500">*</span>
            </label>

            {selectedFile ? (
              /* File preview */
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                {getFileIcon(selectedFile.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={uploadLoading}
                  className="text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed"
                  aria-label="Hapus file yang dipilih"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              /* Drop zone / file button */
              <div
                onClick={() => !uploadLoading && fileInputRef.current?.click()}
                className={[
                  'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
                  'px-4 py-8 text-center transition-colors',
                  uploadLoading
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                    : 'cursor-pointer border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50',
                ].join(' ')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!uploadLoading) fileInputRef.current?.click();
                  }
                }}
                aria-label="Klik untuk memilih file"
              >
                <Upload size={24} className="text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Klik untuk memilih file
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Format yang didukung: Excel (.xlsx, .xls) atau PDF — maks. 10 MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/pdf"
              onChange={handleFileChange}
              disabled={uploadLoading}
              className="hidden"
              aria-hidden="true"
            />
          </div>

          {/* Error message */}
          {uploadError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {uploadError}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploadLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={uploadLoading}
              leftIcon={!uploadLoading ? <Upload size={15} /> : undefined}
            >
              {uploadLoading ? 'Mengunggah...' : 'Unggah'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
