'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Newspaper, Eye, EyeOff, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ImageUpload from '@/components/shared/ImageUpload';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ArtikelItem {
  id: string;
  judul: string;
  slug: string;
  cover_url?: string | null;
  is_published: boolean;
  published_at?: string | null;
  author_name: string;
  created_at: string;
  updated_at?: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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

export default function ArtikelPage() {
  // ── Data state
  const [data, setData] = useState<ArtikelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editTarget, setEditTarget] = useState<ArtikelItem | null>(null);

  const [formJudul, setFormJudul] = useState('');
  const [formKonten, setFormKonten] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // ── Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ArtikelItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Publish toggle loading state per item
  const [publishLoadingId, setPublishLoadingId] = useState<string | null>(null);

  // ── Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // ── Fetch artikel
  const fetchArtikel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/artikel/list');
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat daftar artikel.');
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat daftar artikel.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArtikel();
  }, [fetchArtikel]);

  // ── Open add modal
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditTarget(null);
    setFormJudul('');
    setFormKonten('');
    setFormCoverUrl('');
    setFormError('');
    setFormModalOpen(true);
  };

  // ── Open edit modal
  const handleOpenEdit = (item: ArtikelItem) => {
    setFormMode('edit');
    setEditTarget(item);
    setFormJudul(item.judul);
    setFormKonten(''); // akan di-fetch setelah modal dibuka
    setFormCoverUrl(item.cover_url ?? '');
    setFormError('');
    setFormModalOpen(true);

    // Fetch konten artikel dari API setelah modal dibuka
    fetch(`/api/artikel/${item.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.konten) {
          setFormKonten(json.data.konten);
        }
      })
      .catch(() => {
        // Konten tidak berhasil dimuat, biarkan textarea kosong
      });
  };

  // ── Submit add/edit form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedJudul = formJudul.trim();
    const trimmedKonten = formKonten.trim();

    if (!trimmedJudul) {
      setFormError('Judul artikel wajib diisi.');
      return;
    }
    if (formMode === 'add' && !trimmedKonten) {
      setFormError('Konten artikel wajib diisi.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (formMode === 'add') {
        const res = await fetch('/api/artikel/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul: trimmedJudul,
            konten: trimmedKonten,
            cover_url: formCoverUrl.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setFormError(json.message ?? 'Gagal menambahkan artikel.');
          return;
        }
        showToast('success', json.message ?? 'Artikel berhasil ditambahkan.');
      } else {
        // Edit mode
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: Record<string, any> = {
          id: editTarget!.id,
          judul: trimmedJudul,
          cover_url: formCoverUrl.trim() || null,
        };
        if (trimmedKonten) {
          payload.konten = trimmedKonten;
        }

        const res = await fetch('/api/artikel/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          setFormError(json.message ?? 'Gagal memperbarui artikel.');
          return;
        }
        showToast('success', json.message ?? 'Artikel berhasil diperbarui.');
      }

      setFormModalOpen(false);
      fetchArtikel();
    } catch {
      setFormError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle publish
  const handleTogglePublish = async (item: ArtikelItem) => {
    setPublishLoadingId(item.id);
    try {
      const res = await fetch('/api/artikel/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          is_published: !item.is_published,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal mengubah status terbit.');
        return;
      }
      showToast(
        'success',
        item.is_published
          ? 'Artikel berhasil dicabut dari publikasi.'
          : 'Artikel berhasil diterbitkan.'
      );
      fetchArtikel();
    } catch {
      showToast('error', 'Terjadi kesalahan saat mengubah status terbit.');
    } finally {
      setPublishLoadingId(null);
    }
  };

  // ── Delete
  const handleOpenDelete = (item: ArtikelItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/artikel/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal menghapus artikel.');
        return;
      }

      showToast('success', json.message ?? 'Artikel berhasil dihapus.');
      setDeleteTarget(null);
      fetchArtikel();
    } catch {
      showToast('error', 'Terjadi kesalahan saat menghapus artikel.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Artikel</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola artikel yang ditampilkan di halaman publik.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/artikel"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <ExternalLink size={14} />
            Lihat Publik
          </Link>
          <Button
            variant="primary"
            leftIcon={<Plus size={15} />}
            onClick={handleOpenAdd}
          >
            Tambah Artikel
          </Button>
        </div>
      </div>

      {/* ── Artikel table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Judul
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                  Tanggal Terbit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">
                  Dibuat
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-48 mb-1" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-20" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-28" />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-32 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Newspaper size={36} className="opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        Belum ada artikel
                      </p>
                      <p className="text-xs text-slate-400">
                        Klik &quot;Tambah Artikel&quot; untuk membuat artikel baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Judul + slug + cover thumbnail */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-3">
                        {item.cover_url ? (
                          <div className="relative w-12 h-8 rounded overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                            <Image src={item.cover_url} alt={item.judul} fill className="object-cover" sizes="48px" />
                          </div>
                        ) : (
                          <div className="w-12 h-8 rounded bg-slate-100 border border-slate-100 flex items-center justify-center shrink-0">
                            <Newspaper size={14} className="text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.judul}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">/{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status badge */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={item.is_published ? 'green' : 'gray'}>
                        {item.is_published ? 'Terbit' : 'Draf'}
                      </Badge>
                    </td>
                    {/* Tanggal terbit */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-600">
                        {item.published_at ? formatDate(item.published_at) : '—'}
                      </span>
                    </td>
                    {/* Tanggal dibuat */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">
                        {formatDate(item.created_at)}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Terbitkan / Cabut */}
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={
                            item.is_published ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )
                          }
                          loading={publishLoadingId === item.id}
                          onClick={() => handleTogglePublish(item)}
                          className={
                            item.is_published
                              ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }
                          title={item.is_published ? 'Cabut terbit' : 'Terbitkan'}
                        >
                          {item.is_published ? 'Cabut' : 'Terbitkan'}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil size={14} />}
                          onClick={() => handleOpenEdit(item)}
                          title="Edit artikel"
                        >
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 size={14} />}
                          onClick={() => handleOpenDelete(item)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Hapus artikel"
                        >
                          Hapus
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
          Total {data.length} artikel &bull;{' '}
          {data.filter((a) => a.is_published).length} diterbitkan
        </p>
      )}

      {/* ── Add / Edit modal */}
      <Modal
        open={formModalOpen}
        onClose={() => {
          if (!formLoading) setFormModalOpen(false);
        }}
        title={formMode === 'add' ? 'Tambah Artikel' : 'Edit Artikel'}
        size="lg"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Judul */}
          <Input
            label="Judul Artikel"
            type="text"
            value={formJudul}
            onChange={(e) => {
              setFormJudul(e.target.value);
              setFormError('');
            }}
            placeholder="Masukkan judul artikel"
            disabled={formLoading}
            required
            autoFocus
          />

          {/* Cover Image Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Gambar Sampul <span className="text-slate-400 text-xs font-normal">(opsional)</span>
            </label>
            <div className="flex gap-4 items-start">
              <div className="w-36 shrink-0">
                <ImageUpload
                  value={formCoverUrl || null}
                  onUpload={(url) => {
                    setFormCoverUrl(url);
                    setFormError('');
                  }}
                  bucket="assets"
                  folder="artikel"
                  shape="wide"
                  disabled={formLoading}
                  helperText="Rasio 16:9"
                />
              </div>
              <div className="flex-1 pt-1">
                <p className="text-xs text-slate-500 mb-2">
                  Upload gambar atau masukkan URL:
                </p>
                <Input
                  type="url"
                  value={formCoverUrl}
                  onChange={(e) => { setFormCoverUrl(e.target.value); setFormError(''); }}
                  placeholder="https://..."
                  disabled={formLoading}
                />
              </div>
            </div>
          </div>

          {/* Konten */}
          <div className="space-y-1.5">
            <label
              htmlFor="konten-textarea"
              className="block text-sm font-medium text-slate-700"
            >
              Konten Artikel{' '}
              {formMode === 'add' && <span className="text-red-500">*</span>}
              {formMode === 'edit' && (
                <span className="text-slate-400 font-normal text-xs ml-1">
                  (kosongkan jika tidak ingin mengubah)
                </span>
              )}
            </label>
            <textarea
              id="konten-textarea"
              value={formKonten}
              onChange={(e) => {
                setFormKonten(e.target.value);
                setFormError('');
              }}
              placeholder="Tulis konten artikel di sini..."
              rows={10}
              disabled={formLoading}
              required={formMode === 'add'}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm resize-y',
                'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400',
              ].join(' ')}
            />
          </div>

          {/* Error message */}
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormModalOpen(false)}
              disabled={formLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={formLoading}
            >
              {formMode === 'add' ? 'Simpan' : 'Perbarui'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Hapus Artikel"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus artikel "${deleteTarget.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        loading={deleteLoading}
      />

      {/* ── Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
