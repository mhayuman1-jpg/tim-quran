'use client';

// ArtikelGenerator.tsx — Komponen untuk generate artikel lengkap via AI

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Copy, Check, FileText, ChevronDown } from 'lucide-react';

interface ArtikelGeneratorProps {
  onApply: (html: string) => void;
  disabled?: boolean;
}

const GAYA_OPTIONS = [
  { value: 'profesional', label: 'Profesional', desc: 'Bahasa resmi, cocok untuk publikasi lembaga' },
  { value: 'formal', label: 'Formal', desc: 'Bahasa baku dan terstruktur' },
  { value: 'santai', label: 'Santai', desc: 'Ramah, mudah dipahami semua kalangan' },
  { value: 'edukatif', label: 'Edukatif', desc: 'Penjelasan mendalam, cocok untuk pembelajaran' },
  { value: 'aktual', label: 'Aktual / Berita', desc: 'Gaya jurnalistik, informatif dan faktual' },
];

const PANJANG_OPTIONS = [
  { value: 'pendek', label: 'Pendek', desc: '~300-500 kata' },
  { value: 'sedang', label: 'Sedang', desc: '~500-800 kata' },
  { value: 'panjang', label: 'Panjang', desc: '~800-1200 kata' },
];

export default function ArtikelGenerator({ onApply, disabled = false }: ArtikelGeneratorProps) {
  const [topik, setTopik] = useState('');
  const [instruksi, setInstruksi] = useState('');
  const [gaya, setGaya] = useState('profesional');
  const [panjang, setPanjang] = useState('sedang');
  const [loading, setLoading] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleGenerate = async () => {
    if (!topik.trim()) return;

    setLoading(true);
    setError('');
    setGeneratedHtml('');

    try {
      const res = await fetch('/api/ai/artikel-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topik: topik.trim(), instruksi: instruksi.trim(), gaya, panjang }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Gagal generate artikel.');
        return;
      }

      setGeneratedHtml(json.html);
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply(generatedHtml);
  };

  const handleCopy = async () => {
    try {
      const div = document.createElement('div');
      div.innerHTML = generatedHtml;
      await navigator.clipboard.writeText(div.textContent || div.innerText || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-xl border-2 border-purple-200 overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
        <Sparkles size={16} className="text-white" />
        <p className="text-sm font-bold text-white">Generate Artikel dengan AI</p>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-xs text-purple-700">
          Tulis topik dan instruksi artikel yang diinginkan, AI akan membuatkan artikel lengkap untuk Anda.
        </p>

        {/* Topik */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Topik / Judul Artikel <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topik}
            onChange={(e) => setTopik(e.target.value)}
            disabled={disabled || loading}
            placeholder="Contoh: Tips Menghafal Al-Quran dengan Efektif"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100"
          />
        </div>

        {/* Instruksi Tambahan */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Instruksi Tambahan <span className="text-slate-400">(opsional)</span>
          </label>
          <textarea
            value={instruksi}
            onChange={(e) => setInstruksi(e.target.value)}
            disabled={disabled || loading}
            rows={3}
            placeholder="Ceritakan tentang program tahfidz di sekolah kami, target semester ini, dan motivasi untuk siswa..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 resize-none"
          />
        </div>

        {/* Opsi Lanjutan */}
        <div>
          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            disabled={disabled || loading}
            className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors disabled:opacity-50"
          >
            <ChevronDown size={14} className={`transition-transform ${showOptions ? 'rotate-180' : ''}`} />
            Opsi Lanjutan (Gaya & Panjang)
          </button>

          {showOptions && (
            <div className="mt-3 space-y-3 p-3 bg-white rounded-lg border border-purple-100">
              {/* Gaya */}
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide block mb-2">
                  Gaya Penulisan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GAYA_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGaya(opt.value)}
                      disabled={disabled || loading}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                        gaya === opt.value
                          ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      } disabled:opacity-50`}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Panjang */}
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide block mb-2">
                  Panjang Artikel
                </label>
                <div className="flex gap-2">
                  {PANJANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPanjang(opt.value)}
                      disabled={disabled || loading}
                      className={`flex-1 text-center px-3 py-2 rounded-lg border text-xs transition-all ${
                        panjang === opt.value
                          ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      } disabled:opacity-50`}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        {!generatedHtml && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={disabled || loading || !topik.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {loading ? 'Sedang Generate Artikel...' : 'Generate Artikel'}
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

        {/* Generated Result */}
        {generatedHtml && (
          <div className="space-y-3">
            {/* Preview */}
            <div className="bg-white rounded-lg border border-purple-200 p-4 max-h-[400px] overflow-y-auto">
              <div
                className="prose prose-sm max-w-none text-slate-700"
                dangerouslySetInnerHTML={{ __html: generatedHtml }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleApply}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                <FileText size={12} />
                Masukkan ke Editor
              </button>
              <button
                type="button"
                onClick={handleCopy}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 disabled:opacity-50 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Tersalin!' : 'Salin Teks'}
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
