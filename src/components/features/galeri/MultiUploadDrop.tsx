'use client';

// src/components/features/galeri/MultiUploadDrop.tsx
// Zone drag & drop untuk upload banyak foto ke satu album

import { useCallback, useRef, useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface UploadResult {
  judul: string;
  foto_url: string;
  error?: string;
}

interface MultiUploadDropProps {
  albumId: string;
  onUploadComplete: () => void;
  disabled?: boolean;
}

export default function MultiUploadDrop({ albumId, onUploadComplete, disabled }: MultiUploadDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    setUploading(true);
    setResults([]);

    const formData = new FormData();
    formData.append('album_id', albumId);
    files.forEach((f, i) => formData.append(`files[${i}]`, f));

    try {
      const res = await fetch('/api/website/galeri', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      setResults(json.photos ?? []);
      onUploadComplete();
    } catch {
      setResults([{ judul: 'Error', foto_url: '', error: 'Gagal menghubungi server.' }]);
    } finally {
      setUploading(false);
    }
  }, [albumId, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [disabled, uploading, handleFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
    e.target.value = '';
  };

  const okCount = results.filter(r => !r.error).length;
  const errCount = results.filter(r => r.error).length;

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-amber-400 bg-amber-50'
            : 'border-slate-300 bg-slate-50 hover:border-amber-300 hover:bg-amber-50/30'
        } ${(disabled || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-amber-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Mengunggah...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Upload size={22} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {dragOver ? 'Lepas foto di sini' : 'Seret & lepas foto di sini'}
            </p>
            <p className="text-xs text-slate-400">atau klik untuk pilih file • JPG, PNG, WebP • maks 5MB/foto</p>
          </div>
        )}
      </div>

      {/* Upload results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {okCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 size={14} /> {okCount} berhasil
              </span>
            )}
            {errCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle size={14} /> {errCount} gagal
              </span>
            )}
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {results.map((r, i) => (
              <div key={i} className={`text-xs flex items-center gap-2 px-2 py-1 rounded ${r.error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                {r.error ? <X size={12} /> : <CheckCircle2 size={12} />}
                <span className="truncate">{r.judul}</span>
                {r.error && <span className="text-red-400 shrink-0">— {r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
}
