'use client';

// CatatanGenerator.tsx — Komponen untuk generate catatan ustadz/ah otomatis via AI

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Copy, Check } from 'lucide-react';

interface CatatanGeneratorProps {
  studentId: string;
  studentName: string;
  gender: string;
  periode: string;
  tahunAjaran: string;
  currentValue: string;
  onApply: (catatan: string) => void;
  disabled?: boolean;
}

export default function CatatanGenerator({
  studentId,
  studentName,
  gender,
  periode,
  tahunAjaran,
  currentValue,
  onApply,
  disabled = false,
}: CatatanGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generatedCatatan, setGeneratedCatatan] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [meta, setMeta] = useState<{
    surah_dihafal: number;
    avg_grade: number;
    avg_tahsin_grade: number;
    kehadiran: number;
  } | null>(null);

  const handleGenerate = async () => {
    if (!studentId) return;

    setLoading(true);
    setError('');
    setGeneratedCatatan('');

    try {
      const res = await fetch('/api/ai/catatan-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          periode,
          tahun_ajaran: tahunAjaran,
          gender,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Gagal generate catatan.');
        return;
      }

      setGeneratedCatatan(json.catatan);
      setMeta(json.meta);
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (currentValue && currentValue.trim()) {
      onApply(`${currentValue.trim()}\n\n${generatedCatatan}`);
    } else {
      onApply(generatedCatatan);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCatatan);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  };

  const panggilan = gender === 'Perempuan' ? 'Kakak' : 'Abang';

  return (
    <div className="rounded-xl border-2 border-purple-200 overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
        <Sparkles size={16} className="text-white" />
        <p className="text-sm font-bold text-white">Generate Catatan Ustadz/ah via AI</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Info */}
        <p className="text-xs text-purple-700">
          Generate catatan perkembangan {panggilan} <strong>{studentName}</strong> secara otomatis
          berdasarkan data hafalan, tahsin, dan kehadiran selama periode {periode}.
        </p>

        {/* Meta info (if available) */}
        {meta && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Surah Dihafal', value: `${meta.surah_dihafal} surah` },
              { label: 'Nilai Tahfidz', value: `${meta.avg_grade}/100` },
              { label: 'Nilai Tahsin', value: `${meta.avg_tahsin_grade}/100` },
              { label: 'Kehadiran', value: `${meta.kehadiran}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg px-3 py-2 border border-purple-100">
                <p className="text-[10px] text-purple-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-purple-700">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Generate button */}
        {!generatedCatatan && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || loading || !studentId}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {loading ? 'Sedang Generate Catatan...' : 'Generate Catatan dengan AI'}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-600">{error}</p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="mt-1 text-xs text-red-700 font-medium hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Generated result */}
        {generatedCatatan && (
          <div className="space-y-2">
            <div className="bg-white rounded-lg border border-purple-200 p-3">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {generatedCatatan}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <Check size={12} />
                {currentValue && currentValue.trim() ? 'Tambahkan ke Catatan' : 'Terapkan ke Catatan'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 disabled:opacity-50 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Tersalin!' : 'Salin'}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={disabled || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold hover:bg-purple-200 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {loading ? 'Generate...' : 'Generate Ulang'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
