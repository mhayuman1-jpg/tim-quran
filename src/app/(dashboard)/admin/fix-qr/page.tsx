'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileCheck, AlertCircle, CheckCircle, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/toast';

interface ExtractedCard {
  nama: string;
  nisn: string;
  qrCode: string;
  matched: boolean;
  dbName?: string;
  dbQrCode?: string;
  selected: boolean;
}

export default function FixQrPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState('');
  const [cards, setCards] = useState<ExtractedCard[]>([]);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<{ updated: number; failed: number } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setCards([]);
      setResult(null);
      setDebugInfo([]);
    }
  };

  const extractQrFromPdf = useCallback(async () => {
    if (!file) return;
    setExtracting(true);
    setExtractProgress('Memuat PDF...');
    setResult(null);
    setDebugInfo([]);

    const debug: string[] = [];

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      debug.push(`PDF: ${totalPages} halaman`);

      const allQrCodes: { qr: string; pageNum: number; col: number }[] = [];
      const allTextGroups: { texts: string[]; col: number; pageNum: number }[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setExtractProgress(`Render halaman ${pageNum}/${totalPages}...`);

        const page = await pdf.getPage(pageNum);
        const unscaled = page.getViewport({ scale: 1 });
        const pageW = unscaled.width;
        const pageH = unscaled.height;
        debug.push(`Hal ${pageNum}: ${Math.round(pageW)}x${Math.round(pageH)}`);

        const scale = 3;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const scaledW = canvas.width;
        const scaledH = canvas.height;

        const jsQR = (await import('jsqr')).default;

        // ── 1. Coba decode QR dari seluruh halaman ──
        const fullData = ctx.getImageData(0, 0, scaledW, scaledH);
        const fullResult = jsQR(fullData.data, scaledW, scaledH, { inversionAttempts: 'attemptBoth' });
        if (fullResult) {
          allQrCodes.push({ qr: fullResult.data, pageNum, col: 0 });
          debug.push(`Hal ${pageNum}: QR ditemukan dari full page: ${fullResult.data.slice(0, 8)}`);
        }

        // ── 2. Split halaman jadi 3 kolom (3 kartu per baris) ──
        const colWidth = Math.floor(scaledW / 3);
        const searchTop = Math.floor(scaledH * 0.15);
        const searchBottom = Math.floor(scaledH * 0.85);
        const searchHeight = searchBottom - searchTop;

        for (let col = 0; col < 3; col++) {
          const colX = col * colWidth;

          // Coba beberapa region untuk QR
          const regions = [
            // QR di kanan kartu (~60-90% lebar kolom, 20-70% tinggi)
            { x: colX + Math.floor(colWidth * 0.55), y: searchTop + Math.floor(searchHeight * 0.1), w: Math.floor(colWidth * 0.4), h: Math.floor(searchHeight * 0.6) },
            // QR lebih lebar
            { x: colX + Math.floor(colWidth * 0.5), y: searchTop, w: Math.floor(colWidth * 0.48), h: Math.floor(searchHeight * 0.7) },
            // Seluruh kolom
            { x: colX, y: searchTop, w: colWidth, h: searchHeight },
          ];

          for (const r of regions) {
            // Pastikan dalam batas canvas
            const rx = Math.max(0, r.x);
            const ry = Math.max(0, r.y);
            const rw = Math.min(r.w, scaledW - rx);
            const rh = Math.min(r.h, scaledH - ry);
            if (rw <= 0 || rh <= 0) continue;

            const regionData = ctx.getImageData(rx, ry, rw, rh);
            const regionResult = jsQR(regionData.data, rw, rh, { inversionAttempts: 'attemptBoth' });
            if (regionResult) {
              const exists = allQrCodes.some(q => q.qr === regionResult.data && q.pageNum === pageNum && q.col === col);
              if (!exists) {
                allQrCodes.push({ qr: regionResult.data, pageNum, col });
                debug.push(`Hal ${pageNum} kolom ${col}: QR ditemukan: ${regionResult.data.slice(0, 8)}`);
              }
              break; // Sudah ketemu, stop coba region lain
            }
          }
        }

        // ── 3. Extract text dan group by posisi X (kolom) ──
        const textContent = await page.getTextContent();
        const items = textContent.items as { str: string; transform: number[] }[];

        // Group text items by kolom
        const colTexts: string[][] = [[], [], []];
        for (const item of items) {
          const text = item.str.trim();
          if (!text) continue;

          // Posisi X dalam unscaled
          const xPos = item.transform[4];
          const colIdx = Math.min(2, Math.floor(xPos / (pageW / 3)));
          colTexts[colIdx].push(text);
        }

        for (let col = 0; col < 3; col++) {
          if (colTexts[col].length > 0) {
            allTextGroups.push({ texts: colTexts[col], col, pageNum });
          }
        }

        debug.push(`Hal ${pageNum}: ${items.length} text items, kolom: ${colTexts.map(t => t.length).join(',')}`);
      }

      debug.push(`Total QR ditemukan: ${allQrCodes.length}`);
      debug.push(`Total text groups: ${allTextGroups.length}`);

      // ── 4. Match QR codes dengan text ──
      // Build extracted cards
      const extractedCards: ExtractedCard[] = [];

      for (const qr of allQrCodes) {
        // Cari text group yang sesuai kolom dan halaman
        const textGroup = allTextGroups.find(t => t.pageNum === qr.pageNum && t.col === qr.col);

        let foundNama = '';
        let foundNisn = '';

        if (textGroup) {
          const skipWords = ['SDIT', 'BIDANG', 'KARTU', 'SCAN', 'AKTIF', 'SANTRI', 'IDENTITAS', 'QUR\'AN'];
          const filtered = textGroup.texts.filter(t =>
            t.length > 1 &&
            !skipWords.some(w => t.toUpperCase().includes(w))
          );

          for (const t of filtered) {
            // NIS = angka 3-4 digit
            if (/^\d{3,5}$/.test(t) && !foundNisn) {
              foundNisn = t;
              continue;
            }
            // Nama = huruf, minimal 3 karakter
            if (/^[A-Za-z\s.'-]{3,}$/.test(t) && t.length > foundNama.length) {
              foundNama = t;
            }
          }
        }

        extractedCards.push({
          nama: foundNama,
          nisn: foundNisn,
          qrCode: qr.qr,
          matched: false,
          selected: true,
        });
      }

      debug.push(`Total kartu: ${extractedCards.length}`);

      // ── 5. Cocokkan dengan database ──
      setExtractProgress('Mencocokkan dengan database...');
      const matchRes = await fetch('/api/siswa/list?limit=500');
      const matchData = await matchRes.json();
      const dbStudents: { nama: string; nisn: string; qr_code: string }[] = matchData.data ?? [];

      for (const card of extractedCards) {
        // Cari by nama (exact atau fuzzy)
        const match = dbStudents.find(s => {
          const sName = s.nama.toLowerCase();
          const cName = card.nama.toLowerCase();
          return sName === cName || sName.includes(cName) || cName.includes(sName);
        });

        if (match) {
          card.matched = true;
          card.dbName = match.nama;
          card.dbQrCode = match.qr_code;
          card.nama = match.nama;
          card.nisn = card.nisn || match.nisn;
        } else if (card.nisn) {
          // Coba by NISN
          const nisnMatch = dbStudents.find(s => s.nisn === card.nisn);
          if (nisnMatch) {
            card.matched = true;
            card.dbName = nisnMatch.nama;
            card.dbQrCode = nisnMatch.qr_code;
            card.nama = nisnMatch.nama;
          }
        }
      }

      setCards(extractedCards);
      setDebugInfo(debug);
      setExtractProgress(`Selesai! ${extractedCards.length} QR code ditemukan dari ${totalPages} halaman.`);
    } catch (err) {
      console.error('PDF extract error:', err);
      debug.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setDebugInfo(debug);
      toast.error('Gagal membaca PDF. Cek info debug di bawah.');
    } finally {
      setExtracting(false);
    }
  }, [file, toast]);

  const handleUpdate = async () => {
    const selectedCards = cards.filter(c => c.selected && c.qrCode);
    if (selectedCards.length === 0) {
      toast.error('Tidak ada kartu yang dipilih untuk diupdate.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/fix-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: selectedCards.map(c => ({
            nama: c.nama,
            nisn: c.nisn,
            newQrCode: c.qrCode,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? 'Gagal mengupdate QR code.');
        return;
      }

      setResult({ updated: data.updated, failed: data.failed });
      toast.success(`${data.updated} QR code berhasil diupdate!`);

      setCards(prev => prev.map(c => {
        const r = data.results?.find((r: { nama: string }) => r.nama === c.nama);
        if (r?.status === 'updated') {
          return { ...c, dbQrCode: c.qrCode };
        }
        return c;
      }));
    } catch {
      toast.error('Terjadi kesalahan saat update.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleAll = () => {
    const allSelected = cards.every(c => c.selected);
    setCards(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  const toggleCard = (index: number) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, selected: !c.selected } : c));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fix QR Code dari PDF</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload PDF ID card siswa. Sistem akan extract QR code dan update database agar sesuai dengan cetakan.
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all"
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileCheck size={24} className="text-amber-500" />
              <span className="font-medium text-slate-700">{file.name}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={32} className="text-slate-400 mx-auto" />
              <p className="text-slate-500">Klik untuk pilih file PDF ID card</p>
              <p className="text-xs text-slate-400">Format: PDF</p>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 flex gap-3">
            <Button
              onClick={extractQrFromPdf}
              disabled={extracting}
              leftIcon={extracting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            >
              {extracting ? extractProgress || 'Mengekstrak...' : 'Ekstrak QR Code'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setFile(null); setCards([]); setResult(null); setDebugInfo([]); }}
              disabled={extracting}
            >
              Reset
            </Button>
          </div>
        )}

        {extractProgress && !extracting && (
          <p className="mt-3 text-sm text-slate-600">{extractProgress}</p>
        )}

        {/* Debug info */}
        {debugInfo.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-1">Debug Info:</p>
            {debugInfo.map((d, i) => (
              <p key={i} className="text-xs text-slate-600 font-mono">{d}</p>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {cards.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              Hasil Ekstraksi ({cards.length} kartu)
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cards.every(c => c.selected)}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                Pilih Semua
              </label>
              <Button
                onClick={handleUpdate}
                disabled={updating || cards.filter(c => c.selected && c.qrCode).length === 0}
                leftIcon={updating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              >
                {updating ? 'Mengupdate...' : `Update ${cards.filter(c => c.selected && c.qrCode).length} QR Code`}
              </Button>
            </div>
          </div>

          {result && (
            <div className={`mb-4 p-4 rounded-xl ${result.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="text-sm font-medium">
                {result.updated} berhasil diupdate
                {result.failed > 0 && `, ${result.failed} gagal`}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 w-8"></th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Nama</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">NIS</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">QR dari PDF</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">QR di DB</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={card.selected}
                        onChange={() => toggleCard(i)}
                        disabled={!card.qrCode}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {card.nama || <span className="text-red-400 italic">Tidak terbaca</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{card.nisn || '-'}</td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-700">
                      {card.qrCode ? (
                        <span className="bg-slate-100 px-2 py-1 rounded">
                          {card.qrCode.slice(0, 8).toUpperCase()}
                          {card.qrCode.length > 8 && '...'}
                        </span>
                      ) : (
                        <span className="text-red-400 italic">Tidak terbaca</span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-500">
                      {card.dbQrCode ? card.dbQrCode.slice(0, 8).toUpperCase() : '-'}
                    </td>
                    <td className="py-2 px-3">
                      {!card.matched ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={12} /> Belum cocok
                        </span>
                      ) : card.dbQrCode?.toUpperCase() === card.qrCode.toUpperCase() ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={12} /> Sudah cocok
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <ArrowRight size={12} /> Perlu update
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
