'use client';

import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { Plus, Pencil, Trash2, Newspaper, Eye, EyeOff, ExternalLink, X, Save, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { toImageUrl } from '@/lib/storage/urls';
import ImageUpload from '@/components/shared/ImageUpload';
import ArtikelGenerator from '@/components/features/artikel/ArtikelGenerator';

// Lazy load RichTextEditor agar tidak memperberat bundle
const RichTextEditor = lazy(() => import('@/components/shared/RichTextEditor'));

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
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

let toastCounter = 0;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} role="alert"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm ${
            t.type === 'success' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="text-slate-400 hover:text-slate-600 shrink-0">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Editor Modal (Full) ─────────────────────────────────────────────────────

function EditorModal({
  open, onClose, mode, initialJudul, initialKonten, initialCoverUrl,
  onSubmit, loading, error,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialJudul: string;
  initialKonten: string;
  initialCoverUrl: string;
  onSubmit: (judul: string, konten: string, coverUrl: string) => void;
  loading: boolean;
  error: string;
}) {
  const [judul, setJudul] = useState(initialJudul);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [konten, setKonten] = useState(initialKonten);
  const [kontenKey, setKontenKey] = useState(0); // force remount editor saat konten baru dimuat

  // Sync saat modal dibuka ulang dengan konten baru
  useEffect(() => {
    if (open) {
      setJudul(initialJudul);
      setCoverUrl(initialCoverUrl);
      setKonten(initialKonten);
      // Increment key untuk remount RichTextEditor dengan konten baru
      setKontenKey(k => k + 1);
    }
  }, [open, initialJudul, initialKonten, initialCoverUrl]);

  const handleKontenChange = React.useCallback((html: string) => {
    setKonten(html);
  }, []);

  const handleSave = () => {
    onSubmit(judul, konten, coverUrl);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSave();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 border-b border-slate-200 bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onClose} disabled={loading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Tutup editor">
            <X size={18} />
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <span className="text-sm font-semibold text-slate-700">
            {mode === 'add' ? 'Artikel Baru' : 'Edit Artikel'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Batal</Button>
          <Button
            type="submit"
            form="artikel-editor-form"
            variant="primary"
            leftIcon={loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            disabled={loading || !judul.trim()}
          >
            {mode === 'add' ? 'Simpan Artikel' : 'Perbarui'}
          </Button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <form id="artikel-editor-form" className="flex flex-1 overflow-hidden" onSubmit={handleFormSubmit}>
        {/* Editor tengah */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Judul */}
          <input
            type="text"
            value={judul}
            onChange={e => setJudul(e.target.value)}
            placeholder="Judul artikel..."
            disabled={loading}
            className="w-full text-2xl sm:text-3xl font-bold text-slate-900 placeholder-slate-300 border-none outline-none bg-transparent mb-6 resize-none"
          />

          {/* Editor WYSIWYG — key berubah saat konten baru dimuat dari server */}
          <Suspense fallback={
            <div className="h-64 rounded-xl border border-slate-200 flex items-center justify-center bg-slate-50">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          }>
            <RichTextEditor
              key={kontenKey}
              value={konten}
              onChange={handleKontenChange}
              disabled={loading}
              placeholder="Tulis konten artikel di sini... Gunakan tombol AI untuk mempercantik tulisan Anda."
              minHeight={450}
            />
          </Suspense>
        </div>

        {/* Sidebar kanan — metadata */}
        <div className="w-64 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto p-4 hidden lg:block space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pengaturan Artikel</p>
          </div>

          {/* Cover image */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Gambar Sampul <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <ImageUpload
              value={coverUrl || null}
              onUpload={url => setCoverUrl(url)}
              bucket="timquran-assets"
              folder="artikel"
              shape="wide"
              disabled={loading}
              helperText="Rasio 16:9 · JPG/PNG/WebP"
            />
            <input
              type="url"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="atau paste URL gambar..."
              className="mt-2 w-full text-xs rounded-lg border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {/* Tips AI */}
          <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
            <p className="text-xs font-semibold text-violet-700 mb-1 flex items-center gap-1">
              ✨ Tips AI
            </p>
            <ul className="text-xs text-violet-600 space-y-1 list-disc list-inside">
              <li>Tulis draf kasar dulu</li>
              <li>Klik tombol AI di toolbar</li>
              <li>Pilih &ldquo;Susun jadi terstruktur&rdquo;</li>
              <li>AI otomatis susun heading + paragraf</li>
            </ul>
          </div>

          {/* Shortcut */}
          <div className="rounded-xl bg-slate-100 border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Shortcut Keyboard</p>
            <div className="text-xs text-slate-500 space-y-1">
              {[['Bold','Ctrl+B'],['Italic','Ctrl+I'],['Underline','Ctrl+U'],['Undo','Ctrl+Z'],['Redo','Ctrl+Y']].map(([k,v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border text-[10px] font-mono">{v}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ArtikelPage() {
  const [data, setData] = useState<ArtikelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit'>('add');
  const [editTarget, setEditTarget] = useState<ArtikelItem | null>(null);
  const [formJudul, setFormJudul] = useState('');
  const [formKonten, setFormKonten] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<ArtikelItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [publishLoadingId, setPublishLoadingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);

  const showToast = (type: Toast['type'], message: string) => {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const fetchArtikel = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/artikel/list');
      const json = await res.json();
      setData(res.ok ? (json.data ?? []) : []);
      if (!res.ok) showToast('error', json.message ?? 'Gagal memuat.');
    } catch { showToast('error', 'Terjadi kesalahan.'); setData([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchArtikel(); }, [fetchArtikel]);

  const handleOpenAdd = () => {
    setEditorMode('add');
    setEditTarget(null);
    setFormJudul('');
    setFormKonten('');
    setFormCoverUrl('');
    setFormError('');
    setEditorOpen(true);
  };

  const handleApplyGenerated = (html: string) => {
    setEditorMode('add');
    setEditTarget(null);
    setFormJudul('');
    setFormKonten(html);
    setFormCoverUrl('');
    setFormError('');
    setEditorOpen(true);
    setShowGenerator(false);
  };

  const handleOpenEdit = async (item: ArtikelItem) => {
    setEditorMode('edit');
    setEditTarget(item);
    setFormJudul(item.judul);
    setFormCoverUrl(item.cover_url ?? '');
    setFormKonten('');
    setFormError('');
    setEditorOpen(true);
    // Fetch konten
    try {
      const res = await fetch(`/api/artikel/${item.id}`);
      const json = await res.json();
      if (json?.data?.konten) setFormKonten(json.data.konten);
    } catch {}
  };

  const handleEditorSubmit = async (judul: string, konten: string, coverUrl: string) => {
    if (!judul.trim()) { setFormError('Judul wajib diisi.'); return; }
    // Untuk mode edit, konten boleh kosong hanya jika tidak ada perubahan
    if (editorMode === 'add' && !konten.trim()) { setFormError('Konten wajib diisi.'); return; }

    setFormLoading(true); setFormError('');
    try {
      if (editorMode === 'add') {
        const res = await fetch('/api/artikel/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul: judul.trim(),
            konten: konten,         // kirim apa adanya (HTML dari Tiptap)
            cover_url: coverUrl.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) { setFormError(json.message ?? 'Gagal.'); return; }
        showToast('success', 'Artikel berhasil ditambahkan.');
      } else {
        // Mode edit — selalu kirim konten terbaru
        const payload: Record<string, unknown> = {
          id: editTarget!.id,
          judul: judul.trim(),
          cover_url: coverUrl.trim() || null,
          konten: konten,           // selalu kirim konten (HTML dari Tiptap)
        };
        const res = await fetch('/api/artikel/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { setFormError(json.message ?? `Gagal: ${json.error ?? ''}`); return; }
        showToast('success', 'Artikel berhasil diperbarui.');
      }
      setEditorOpen(false);
      fetchArtikel();
    } catch (e) {
      console.error('[handleEditorSubmit]', e);
      setFormError('Terjadi kesalahan koneksi.');
    }
    finally { setFormLoading(false); }
  };

  const handleTogglePublish = async (item: ArtikelItem) => {
    setPublishLoadingId(item.id);
    try {
      const res = await fetch('/api/artikel/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, is_published: !item.is_published }),
      });
      const json = await res.json();
      if (!res.ok) { showToast('error', json.message ?? 'Gagal.'); return; }
      showToast('success', item.is_published ? 'Artikel dicabut dari publikasi.' : 'Artikel diterbitkan.');
      fetchArtikel();
    } catch { showToast('error', 'Terjadi kesalahan.'); }
    finally { setPublishLoadingId(null); }
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
      if (!res.ok) { showToast('error', json.message ?? 'Gagal.'); return; }
      showToast('success', 'Artikel berhasil dihapus.');
      setDeleteTarget(null);
      fetchArtikel();
    } catch { showToast('error', 'Terjadi kesalahan.'); }
    finally { setDeleteLoading(false); }
  };

  return (
    <>
      {/* Editor fullscreen */}
      <EditorModal
        open={editorOpen}
        onClose={() => { if (!formLoading) setEditorOpen(false); }}
        mode={editorMode}
        initialJudul={formJudul}
        initialKonten={formKonten}
        initialCoverUrl={formCoverUrl}
        onSubmit={handleEditorSubmit}
        loading={formLoading}
        error={formError}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Artikel</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola artikel dengan editor lengkap + bantuan AI.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/artikel" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors">
              <ExternalLink size={14} /> Lihat Publik
            </Link>
            <Button variant="secondary" leftIcon={<Sparkles size={15} />}
              onClick={() => setShowGenerator(!showGenerator)}>
              {showGenerator ? 'Tutup Generator' : 'Generate dengan AI'}
            </Button>
            <Button variant="primary" leftIcon={<Plus size={15} />} onClick={handleOpenAdd}>
              Tambah Artikel
            </Button>
          </div>
        </div>

        {/* ── AI Artikel Generator ───────────────────────────────────────── */}
        {showGenerator && (
          <ArtikelGenerator onApply={handleApplyGenerated} />
        )}

        {/* Tabel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Judul</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden md:table-cell">Tanggal Terbit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider hidden lg:table-cell">Dibuat</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-48 mb-1" /><div className="h-3 bg-slate-100 rounded animate-pulse w-32" /></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-slate-200 rounded animate-pulse w-20" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 bg-slate-200 rounded animate-pulse w-28" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-5 bg-slate-200 rounded animate-pulse w-24" /></td>
                      <td className="px-4 py-3"><div className="h-8 bg-slate-200 rounded animate-pulse w-32 ml-auto" /></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Newspaper size={36} className="opacity-40" />
                        <p className="text-sm font-medium text-slate-500">Belum ada artikel</p>
                        <p className="text-xs text-slate-400">Klik &quot;Tambah Artikel&quot; untuk memulai.</p>
                      </div>
                    </td>
                  </tr>
                ) : data.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-center gap-3">
                        {item.cover_url ? (
                          <div className="relative w-12 h-8 rounded overflow-hidden shrink-0 bg-slate-100 border border-slate-200">
                            <Image src={toImageUrl(item.cover_url) || ''} alt={item.judul} fill className="object-cover" sizes="48px" />
                          </div>
                        ) : (
                          <div className="w-12 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <Newspaper size={14} className="text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.judul}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">/{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={item.is_published ? 'green' : 'gray'}>{item.is_published ? 'Terbit' : 'Draf'}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-slate-600">{item.published_at ? formatDate(item.published_at) : '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-slate-600">{formatDate(item.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm"
                          leftIcon={item.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                          loading={publishLoadingId === item.id}
                          onClick={() => handleTogglePublish(item)}
                          className={item.is_published ? 'text-amber-600 hover:bg-amber-50' : 'text-amber-600 hover:bg-amber-50'}
                          title={item.is_published ? 'Cabut terbit' : 'Terbitkan'}>
                          {item.is_published ? 'Cabut' : 'Terbitkan'}
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Pencil size={14} />}
                          onClick={() => handleOpenEdit(item)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 size={14} />}
                          onClick={() => setDeleteTarget(item)}
                          className="text-red-600 hover:bg-red-50">
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!loading && data.length > 0 && (
          <p className="text-xs text-slate-400 text-right">
            Total {data.length} artikel · {data.filter(a => a.is_published).length} diterbitkan
          </p>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
          onConfirm={handleConfirmDelete}
          title="Hapus Artikel"
          message={deleteTarget ? `Hapus artikel "${deleteTarget.judul}"? Tindakan ini tidak dapat dibatalkan.` : ''}
          confirmLabel="Hapus"
          loading={deleteLoading}
        />

        <ToastContainer toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    </>
  );
}
