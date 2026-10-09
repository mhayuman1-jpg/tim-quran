'use client';

// src/app/(dashboard)/dashboard/jilid-pembelajaran/page.tsx
// Halaman Kabid untuk mengelola Jilid pembelajaran Al-Qur'an.
// Jilid dibuat terlebih dahulu, lalu video diupload ke dalam jilid.

import { useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Save, X, Layers, Video as VideoIcon, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';
import type { JilidPembelajaran } from '@/types';

interface JilidFormData {
  nama: string;
  deskripsi: string;
  urutan: number;
  is_active: boolean;
}

const initialFormData: JilidFormData = {
  nama: '',
  deskripsi: '',
  urutan: 0,
  is_active: true,
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function JilidPembelajaranPage() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<JilidPembelajaran | null>(null);
  const [formData, setFormData] = useState<JilidFormData>(initialFormData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: swrData, mutate } = useSWR('/api/dashboard/jilid-pembelajaran', fetcher);
  const items: JilidPembelajaran[] = swrData?.data ?? [];

  const mutateFetcher = async (url: string, { arg }: { arg: any }) => {
    const res = await fetch(url, {
      method: arg.method,
      headers: { 'Content-Type': 'application/json' },
      body: arg.method !== 'DELETE' ? JSON.stringify(arg.data) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || 'Gagal memproses permintaan');
    }
    return json;
  };

  const { trigger: createItem } = useSWRMutation('/api/dashboard/jilid-pembelajaran', mutateFetcher, {
    onSuccess: () => {
      toast.success('Jilid berhasil ditambahkan');
      closeModal();
      mutate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { trigger: updateItem } = useSWRMutation(
    `/api/dashboard/jilid-pembelajaran/${editingItem?.id}`,
    mutateFetcher,
    {
      onSuccess: () => {
        toast.success('Jilid berhasil diperbarui');
        closeModal();
        mutate();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const { trigger: deleteItem, isMutating: isDeleting } = useSWRMutation(
    `/api/dashboard/jilid-pembelajaran/${editingItem?.id}`,
    mutateFetcher,
    {
      onSuccess: () => {
        toast.success('Jilid berhasil dihapus');
        closeModal();
        mutate();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: JilidPembelajaran) => {
    setEditingItem(item);
    setFormData({
      nama: item.nama,
      deskripsi: item.deskripsi || '',
      urutan: item.urutan,
      is_active: item.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (item: JilidPembelajaran) => {
    const jumlah = item.jumlah_video ?? 0;
    const pesan = jumlah > 0
      ? `Yakin ingin menghapus jilid "${item.nama}"? ${jumlah} video di dalamnya juga akan terhapus.`
      : `Yakin ingin menghapus jilid "${item.nama}"?`;
    if (confirm(pesan)) {
      deleteItem({ method: 'DELETE' });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await updateItem({ method: 'PUT', data: formData });
      } else {
        await createItem({ method: 'POST', data: formData });
      }
    } catch {
      // error ditangani onError
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers size={24} className="text-emerald-500" />
            Jilid Pembelajaran
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Buat jilid terlebih dahulu, lalu upload video pembelajaran ke dalam jilid tersebut
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus size={16} /> Tambah Jilid
        </Button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Layers size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 font-semibold mb-1">Belum ada jilid</h3>
            <p className="text-slate-500 text-sm mb-4">Tambahkan jilid pertama untuk mulai mengunggah video pembelajaran</p>
            <Button onClick={handleOpenCreate} className="mx-auto gap-2">
              <Plus size={16} /> Tambah Jilid Pertama
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <Layers size={20} className="text-emerald-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 truncate">{item.nama}</h3>
                    {!item.is_active && (
                      <span className="text-[10px] text-white bg-red-500 px-2 py-0.5 rounded-full shrink-0">Nonaktif</span>
                    )}
                  </div>
                  {item.deskripsi && (
                    <p className="text-sm text-slate-500 truncate mt-0.5">{item.deskripsi}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <VideoIcon size={11} /> {item.jumlah_video ?? 0} video
                    </span>
                    <span>Urutan: {item.urutan}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/dashboard/pembelajaran-al-quran?jilid_id=${item.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Kelola video jilid ini"
                  >
                    Video <ArrowRight size={13} />
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                    title="Hapus"
                    disabled={isDeleting}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      <Modal open={isModalOpen} onClose={closeModal} title={editingItem ? 'Edit Jilid' : 'Tambah Jilid'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nama Jilid <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Jilid 1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
            <textarea
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Deskripsi singkat jilid ini (opsional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Urutan</label>
              <Input
                type="number"
                value={formData.urutan}
                onChange={(e) => setFormData({ ...formData, urutan: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-700">Aktif (tampil ke Wali Murid)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
              <X size={16} className="mr-1" /> Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? 'Menyimpan...' : (
                <>
                  <Save size={16} /> {editingItem ? 'Simpan Perubahan' : 'Tambah Jilid'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
