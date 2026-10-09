'use client';

// src/app/(dashboard)/dashboard/pembelajaran-al-quran/page.tsx
// Halaman Kabid untuk mengelola video pembelajaran AL Qur'an.
// Setiap video wajib dimasukkan ke salah satu Jilid.

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit2, Trash2, Save, X, Video as VideoIcon, Layers, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';
import type { JilidPembelajaran, PembelajaranAlQuran } from '@/types';

interface PembelajaranFormData {
  jilid_id: string;
  judul: string;
  deskripsi: string;
  youtube_url: string;
  urutan: number;
  is_active: boolean;
}

const initialFormData: PembelajaranFormData = {
  jilid_id: '',
  judul: '',
  deskripsi: '',
  youtube_url: '',
  urutan: 0,
  is_active: true,
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return v;
      const embedMatch = parsed.pathname.match(/\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
  } catch {
    // ignore
  }
  return null;
}

function getThumbnailUrl(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export default function PembelajaranAlQuranPage() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<PembelajaranAlQuran | null>(null);
  const [formData, setFormData] = useState<PembelajaranFormData>(initialFormData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jilidFilter, setJilidFilter] = useState<string>('');

  // Ambil filter jilid dari URL (?jilid_id=...) sekali saat mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const j = params.get('jilid_id');
      if (j) setJilidFilter(j);
    }
  }, []);

  const { data: jilidData, mutate: mutateJilid } = useSWR('/api/dashboard/jilid-pembelajaran', fetcher);
  const jilidList = useMemo<JilidPembelajaran[]>(() => jilidData?.data ?? [], [jilidData]);

  const { data: swrData, mutate } = useSWR('/api/dashboard/pembelajaran-al-quran', fetcher);
  const allItems = useMemo<PembelajaranAlQuran[]>(() => swrData?.data ?? [], [swrData]);

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

  const { trigger: createItem } = useSWRMutation('/api/dashboard/pembelajaran-al-quran', mutateFetcher, {
    onSuccess: () => {
      toast.success('Video berhasil ditambahkan');
      closeModal();
      mutate();
      mutateJilid();
    },
    onError: (err) => toast.error(err.message),
  });

  const { trigger: updateItem } = useSWRMutation(
    `/api/dashboard/pembelajaran-al-quran/${editingItem?.id}`,
    mutateFetcher,
    {
      onSuccess: () => {
        toast.success('Video berhasil diperbarui');
        closeModal();
        mutate();
        mutateJilid();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const { trigger: deleteItem, isMutating: isDeleting } = useSWRMutation(
    `/api/dashboard/pembelajaran-al-quran/${editingItem?.id}`,
    mutateFetcher,
    {
      onSuccess: () => {
        toast.success('Video berhasil dihapus');
        closeModal();
        mutate();
        mutateJilid();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const filteredItems = useMemo(() => {
    if (!jilidFilter) return allItems;
    return allItems.filter((it) => it.jilid_id === jilidFilter);
  }, [allItems, jilidFilter]);

  // Kelompokkan video per jilid
  const grouped = useMemo(() => {
    const map = new Map<string, { jilid: JilidPembelajaran | undefined; videos: PembelajaranAlQuran[] }>();
    jilidList.forEach((j) => map.set(j.id, { jilid: j, videos: [] }));
    filteredItems.forEach((v) => {
      const key = v.jilid_id || '__tanpa_jilid__';
      if (!map.has(key)) {
        map.set(key, { jilid: undefined, videos: [] });
      }
      map.get(key)!.videos.push(v);
    });
    // Buang jilid kosong kecuali yang sedang difilter
    return Array.from(map.entries())
      .filter(([key, val]) => val.videos.length > 0 || (jilidFilter && key === jilidFilter))
      .map(([key, val]) => ({ key, ...val }));
  }, [jilidList, filteredItems, jilidFilter]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ ...initialFormData, jilid_id: jilidFilter || jilidList[0]?.id || '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: PembelajaranAlQuran) => {
    setEditingItem(item);
    setFormData({
      jilid_id: item.jilid_id || '',
      judul: item.judul,
      deskripsi: item.deskripsi || '',
      youtube_url: item.youtube_url,
      urutan: item.urutan,
      is_active: item.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (item: PembelajaranAlQuran) => {
    if (confirm(`Yakin ingin menghapus "${item.judul}"?`)) {
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
    if (!formData.jilid_id) {
      toast.error('Silakan pilih jilid terlebih dahulu');
      return;
    }
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
            <VideoIcon size={24} className="text-red-500" />
            Kelola Pembelajaran AL Qur&apos;an
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Unggah video pembelajaran (judul + link YouTube) ke dalam jilid
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2" disabled={jilidList.length === 0}>
          <Plus size={16} /> Tambah Video
        </Button>
      </div>

      {/* Warning bila belum ada jilid */}
      {jilidList.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">Belum ada jilid</p>
            <p className="text-amber-700/80 text-sm mt-0.5">
              Buat jilid terlebih dahulu sebelum menambahkan video pembelajaran.
            </p>
          </div>
          <Link
            href="/dashboard/jilid-pembelajaran"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 transition-colors"
          >
            <Layers size={14} /> Buat Jilid
          </Link>
        </div>
      )}

      {/* Filter jilid */}
      {jilidList.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setJilidFilter('')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              jilidFilter === ''
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua
          </button>
          {jilidList.map((j) => (
            <button
              key={j.id}
              onClick={() => setJilidFilter(j.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                jilidFilter === j.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {j.nama}
            </button>
          ))}
        </div>
      )}

      {/* List kelompok per jilid */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <VideoIcon size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-slate-900 font-semibold mb-1">Belum ada video pembelajaran</h3>
          <p className="text-slate-500 text-sm mb-4">
            {jilidList.length === 0
              ? 'Buat jilid dulu untuk mulai mengunggah video'
              : 'Tambah video pertama pada jilid yang dipilih'}
          </p>
          {jilidList.length > 0 && (
            <Button onClick={handleOpenCreate} className="mx-auto gap-2">
              <Plus size={16} /> Tambah Video Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ key, jilid, videos }) => (
            <div key={key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                <Layers size={16} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-800 text-sm">
                  {jilid?.nama || 'Tanpa Jilid'}
                </h2>
                <span className="text-xs text-slate-400">({videos.length} video)</span>
                {jilid && !jilid.is_active && (
                  <span className="text-[10px] text-white bg-red-500 px-2 py-0.5 rounded-full">Jilid Nonaktif</span>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {videos.map((item) => (
                  <div key={item.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center gap-4">
                    <div className="relative w-24 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                      {getThumbnailUrl(item.youtube_url) ? (
                        <Image
                          src={getThumbnailUrl(item.youtube_url)!}
                          alt={item.judul}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <VideoIcon size={20} className="text-red-500" />
                        </div>
                      )}
                      {!item.is_active && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-[10px] text-white bg-red-500 px-2 py-0.5 rounded">Nonaktif</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{item.judul}</h3>
                      {item.deskripsi && (
                        <p className="text-sm text-slate-500 truncate mt-0.5">{item.deskripsi}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="truncate max-w-[240px]">{item.youtube_url}</span>
                        <span>Urutan: {item.urutan}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
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
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      <Modal open={isModalOpen} onClose={closeModal} title={editingItem ? 'Edit Video' : 'Tambah Video'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Jilid <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.jilid_id}
              onChange={(e) => setFormData({ ...formData, jilid_id: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              required
            >
              <option value="">— Pilih Jilid —</option>
              {jilidList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}{j.is_active ? '' : ' (Nonaktif)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Judul <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.judul}
              onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
              placeholder="Contoh: Membaca Huruf Hijaiyah Dasar"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
            <textarea
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Deskripsi singkat tentang video ini (opsional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=..."
              required
            />
            <p className="text-xs text-slate-400 mt-1">Contoh: https://www.youtube.com/watch?v=abc123 atau https://youtu.be/abc123</p>
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
                  <Save size={16} /> {editingItem ? 'Simpan Perubahan' : 'Tambah Video'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
