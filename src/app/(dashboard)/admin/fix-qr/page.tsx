'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, FileText, Trash2, Download, Loader2, Eye } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/lib/toast';

interface IdCardPdf {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  url: string;
}

export default function FixQrPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfs, setPdfs] = useState<IdCardPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IdCardPdf | null>(null);
  const [label, setLabel] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchPdfs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/idcard-pdf');
      const data = await res.json();
      setPdfs(data.data ?? []);
    } catch {
      toast.error('Gagal memuat data PDF.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPdfs(); }, [fetchPdfs]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Hanya file PDF yang diizinkan.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (label.trim()) formData.append('label', label.trim());

      const res = await fetch('/api/admin/idcard-pdf', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }

      toast.success('PDF berhasil diupload!');
      setLabel('');
      fetchPdfs();
    } catch {
      toast.error('Gagal mengupload PDF.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.key);
    try {
      const res = await fetch('/api/admin/idcard-pdf', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: deleteTarget.key }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }

      toast.success('PDF berhasil dihapus.');
      setDeleteTarget(null);
      fetchPdfs();
    } catch {
      toast.error('Gagal menghapus PDF.');
    } finally {
      setDeleting(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ID Card PDF</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload dan simpan PDF ID card siswa. Bisa di-download ulang kapan saja untuk cetak ulang.
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleUpload}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (contoh: Kelas Makkah - Juni 2026)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            leftIcon={uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          >
            {uploading ? 'Mengupload...' : 'Upload PDF'}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-4">Daftar PDF ID Card</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={40} className="mx-auto mb-3" />
            <p className="text-sm">Belum ada PDF ID card yang diupload.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pdfs.map(pdf => (
              <div key={pdf.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate">{pdf.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatSize(pdf.size)}
                      {pdf.lastModified && ` · ${new Date(pdf.lastModified).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Eye size={14} />}
                    onClick={() => setPreviewUrl(pdf.url)}
                  >
                    Lihat
                  </Button>
                  <a href={pdf.url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" leftIcon={<Download size={14} />}>
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 size={14} />}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteTarget(pdf)}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Preview ID Card" size="lg">
        {previewUrl && (
          <iframe
            src={previewUrl}
            className="w-full h-[70vh] rounded-lg border border-slate-200"
            title="Preview ID Card PDF"
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus PDF" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Hapus <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!!deleting}
              leftIcon={deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            >
              {deleting ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
