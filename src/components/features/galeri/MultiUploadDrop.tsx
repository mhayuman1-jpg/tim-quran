// src/components/features/galeri/MultiUploadDrop.tsx
// MultiUploadDrop: komponen drag-and-drop upload galeri.
import React from 'react';

interface MultiUploadDropProps {
  onFilesSelected?: (files: File[]) => void;
}

export default function MultiUploadDrop({ onFilesSelected }: MultiUploadDropProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onFilesSelected) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition-colors">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="multi-upload-input"
      />
      <label htmlFor="multi-upload-input" className="cursor-pointer">
        <p className="text-sm text-slate-600">Klik untuk memilih foto galeri</p>
      </label>
    </div>
  );
}
