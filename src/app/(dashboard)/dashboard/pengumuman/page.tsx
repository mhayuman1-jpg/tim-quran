'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/dashboard/pengumuman/page.tsx
// Halaman Kelola Pengumuman (dipindahkan ke dalam /dashboard)

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { useSession } from 'next-auth/react';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { AnnouncementTarget } from '@/types';

interface PengumumanItem {
  id: string;
  judul: string;
  isi: string;
  target: AnnouncementTarget;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at?: string;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

const TARGET_OPTIONS: AnnouncementTarget[] = ['Semua', 'Guru', 'Siswa', 'Orang Tua'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function getTargetBadgeVariant(
  target: AnnouncementTarget
): 'green' | 'blue' | 'yellow' | 'gray' | 'orange' | 'red' {
  switch (target) {
    case 'Semua':
      return 'blue';
    case 'Guru':
      return 'green';
    case 'Siswa':
      return 'yellow';
    case 'Orang Tua':
      return 'orange';
    default:
      return 'gray';
  }
}

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
              ? 'bg-amber-50 border-amber-200 text-amber-800'
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

export default function PengumumanPage() {
  const { data: session } = useSession();
  const isKabid = session?.user?.role === 'Kabid';

  const [data, setData] = useState<PengumumanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editTarget, setEditTarget] = useState<PengumumanItem | null>(null);

  const [formJudul, setFormJudul] = useState('');
  const [formIsi, setFormIsi] = useState('');
  const [formTarget, setFormTarget] = useState<AnnouncementTarget>('Semua');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<PengumumanItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [viewTarget, setViewTarget] = useState<PengumumanItem | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const fetchPengumuman = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pengumuman/list');
      const json = await res.json();
      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal memuat daftar pengumuman.');
        setData([]);
      } else {
        setData(json.data ?? []);
      }
    } catch {
      showToast('error', 'Terjadi kesalahan saat memuat daftar pengumuman.');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPengumuman();
  }, [fetchPengumuman]);

  const handleOpenAdd = () => {
    setFormMode('add');
    setEditTarget(null);
    setFormJudul('');
    setFormIsi('');
    setFormTarget('Semua');
    setFormError('');
    setFormModalOpen(true);
  };

  const handleOpenEdit = (item: PengumumanItem) => {
    setFormMode('edit');
    setEditTarget(item);
    setFormJudul(item.judul);
    setFormIsi(item.isi);
    setFormTarget(item.target);
    setFormError('');
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedJudul = formJudul.trim();
    const trimmedIsi = formIsi.trim();

    if (!trimmedJudul) {
      setFormError('Judul pengumuman wajib diisi.');
      return;
    }
    if (!trimmedIsi) {
      setFormError('Isi pengumuman wajib diisi.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (formMode === 'add') {
        const res = await fetch('/api/pengumuman/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul: trimmedJudul,
            isi: trimmedIsi,
            target: formTarget,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setFormError(json.message ?? 'Gagal menambahkan pengumuman.');
          return;
        }
        showToast('success', json.message ?? 'Pengumuman berhasil ditambahkan.');
      } else {
        const res = await fetch('/api/pengumuman/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editTarget!.id,
            judul: trimmedJudul,
            isi: trimmedIsi,
            target: formTarget,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setFormError(json.message ?? 'Gagal memperbarui pengumuman.');
          return;
        }
        showToast('success', json.message ?? 'Pengumuman berhasil diperbarui.');
      }

      setFormModalOpen(false);
      fetchPengumuman();
    } catch {
      setFormError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDelete = (item: PengumumanItem) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/pengumuman/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast('error', json.message ?? 'Gagal menghapus pengumuman.');
        return;
      }

      showToast('success', json.message ?? 'Pengumuman berhasil dihapus.');
      setDeleteTarget(null);
      fetchPengumuman();
    } catch {
      showToast('error', 'Terjadi kesalahan saat menghapus pengumuman.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pengumuman</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola pengumuman untuk guru, siswa, dan orang tua.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus size={15} />}
          onClick={handleOpenAdd}
        >
          Tambah Pengumuman
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Judul
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">
                  Dibuat Oleh
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">
                  Tanggal
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
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-48 mb-1"></div>
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-64"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-28"></div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-8 bg-slate-200 rounded animate-pulse w-24 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Megaphone size={36} className="opacity-40" />
                      <p className="text-sm font-medium text-slate-500">
                        Belum ada pengumuman
                      </p>
                      <p className="text-xs text-slate-400">
                        Klik &quot;Tambah Pengumuman&quot; untuk membuat pengumuman baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setViewTarget(item)}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.judul}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {item.isi}
                      </p>
                      {item.updated_at && (
                        <p className="text-xs text-slate-400 mt-0.5 italic">
                          Diperbarui {formatDate(item.updated_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Badge variant={getTargetBadgeVariant(item.target)}>
                        {item.target}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-700">{item.created_by_name}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">{formatDate(item.created_at)}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil size={14} />}
                          onClick={() => handleOpenEdit(item)}
                          title="Edit pengumuman"
                        >
                          Edit
                        </Button>
                        {isKabid && (
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 size={14} />}
                            onClick={() => handleOpenDelete(item)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Hapus pengumuman"
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          Total {data.length} pengumuman
        </p>
      )}

      <Modal
        open={formModalOpen}
        onClose={() => {
          if (!formLoading) setFormModalOpen(false);
        }}
        title={formMode === 'add' ? 'Tambah Pengumuman' : 'Edit Pengumuman'}
        size="md"
        closeOnBackdrop={!formLoading}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Judul Pengumuman"
            type="text"
            value={formJudul}
            onChange={(e) => {
              setFormJudul(e.target.value);
              setFormError('');
            }}
            placeholder="Masukkan judul pengumuman"
            disabled={formLoading}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label
              htmlFor="target-select"
              className="block text-sm font-medium text-slate-700"
            >
              Target Audiens <span className="text-red-500">*</span>
            </label>
            <select
              id="target-select"
              value={formTarget}
              onChange={(e) => {
                setFormTarget(e.target.value as AnnouncementTarget);
                setFormError('');
              }}
              disabled={formLoading}
              required
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'border-slate-300 bg-white text-slate-900',
              ].join(' ')}
            >
              {TARGET_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="isi-textarea"
              className="block text-sm font-medium text-slate-700"
            >
              Isi Pengumuman <span className="text-red-500">*</span>
            </label>
            <textarea
              id="isi-textarea"
              value={formIsi}
              onChange={(e) => {
                setFormIsi(e.target.value);
                setFormError('');
              }}
              placeholder="Tulis isi pengumuman di sini..."
              rows={5}
              disabled={formLoading}
              required
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm resize-y',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500',
                'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
                'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400',
              ].join(' ')}
            />
          </div>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}

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

      <Modal
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title={viewTarget?.judul ?? ''}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <Badge variant={getTargetBadgeVariant(viewTarget.target)}>
                {viewTarget.target}
              </Badge>
              <span>•</span>
              <span>Oleh <strong className="text-slate-700">{viewTarget.created_by_name}</strong></span>
              <span>•</span>
              <span>{formatDate(viewTarget.created_at)}</span>
            </div>

            {viewTarget.updated_at && (
              <p className="text-xs text-slate-400 italic">
                Terakhir diperbarui: {formatDate(viewTarget.updated_at)}
              </p>
            )}

            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {viewTarget.isi}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="secondary"
                leftIcon={<Pencil size={14} />}
                onClick={() => {
                  setViewTarget(null);
                  handleOpenEdit(viewTarget);
                }}
              >
                Edit
              </Button>
              {isKabid && (
                <Button
                  variant="danger"
                  leftIcon={<Trash2 size={14} />}
                  onClick={() => {
                    setViewTarget(null);
                    handleOpenDelete(viewTarget);
                  }}
                >
                  Hapus
                </Button>
              )}
              <Button variant="ghost" onClick={() => setViewTarget(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Hapus Pengumuman"
        message={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus pengumuman "${deleteTarget.judul}"?\n\nTindakan ini tidak dapat dibatalkan.`
            : ''
        }
        confirmLabel="Hapus"
        loading={deleteLoading}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
