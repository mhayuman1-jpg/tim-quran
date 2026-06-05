'use client';

// src/components/shared/ImageUpload.tsx
// Komponen upload gambar reusable dengan preview, drag & drop, dan progress.
// Menggunakan API /api/upload untuk upload ke Supabase Storage.

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Camera, AlertCircle, CheckCircle2, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  /** URL gambar saat ini (untuk tampilkan preview existing) */
  value?: string | null;
  /** Callback saat upload berhasil — menerima URL publik */
  onUpload: (url: string) => void;
  /** Label opsional */
  label?: string;
  /** Bucket Supabase Storage (default: 'assets') */
  bucket?: string;
  /** Folder dalam bucket (default: 'uploads') */
  folder?: string;
  /** Bentuk preview: 'square' | 'circle' | 'wide' */
  shape?: 'square' | 'circle' | 'wide';
  /** Teks bantuan */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onUpload,
  label,
  bucket = 'assets',
  folder = 'uploads',
  shape = 'square',
  helperText,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const currentImage = preview || value;

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB.');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/upload?bucket=${bucket}&folder=${folder}`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Gagal mengunggah gambar.');
        setPreview(null);
        return;
      }

      onUpload(json.url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Terjadi kesalahan saat mengunggah.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [disabled, uploading, handleFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input agar file yang sama bisa dipilih lagi
    e.target.value = '';
  };

  const shapeClasses = {
    square: 'aspect-square rounded-xl',
    circle: 'aspect-square rounded-full',
    wide: 'aspect-video rounded-xl',
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}

      <div
        className={`relative border-2 border-dashed transition-all overflow-hidden ${shapeClasses[shape]} ${
          dragOver
            ? 'border-emerald-400 bg-emerald-50'
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30'
        } ${disabled || uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !disabled && !uploading && inputRef.current?.click()}
        aria-label="Klik atau drop gambar di sini"
      >
        {/* Preview gambar */}
        {currentImage ? (
          <>
            <Image
              src={currentImage}
              alt="Preview"
              fill
              className="object-cover"
              sizes="300px"
              unoptimized={currentImage.startsWith('data:')}
            />
            {/* Overlay saat hover */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity ${uploading ? 'opacity-100' : ''}`}>
              {uploading ? (
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-medium">Mengunggah...</p>
                </div>
              ) : (
                <div className="text-center text-white">
                  <Camera size={24} className="mx-auto mb-1" />
                  <p className="text-xs font-medium">Ganti foto</p>
                </div>
              )}
            </div>
          </>
        ) : (
          // Empty state
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            {uploading ? (
              <>
                <div className="w-8 h-8 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin mb-2" />
                <p className="text-xs text-emerald-600 font-medium">Mengunggah...</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                  <ImageIcon size={20} className="text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  {dragOver ? 'Lepas di sini' : 'Klik atau drop gambar'}
                </p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP · maks 5MB</p>
              </>
            )}
          </div>
        )}

        {/* Success badge */}
        {success && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full shadow">
            <CheckCircle2 size={12} />
            Berhasil
          </div>
        )}

        {/* Clear button */}
        {currentImage && !uploading && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onUpload('');
            }}
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
            aria-label="Hapus gambar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p className="text-xs text-slate-400">{helperText}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleChange}
        disabled={disabled || uploading}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
