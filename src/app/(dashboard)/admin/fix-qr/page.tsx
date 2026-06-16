// @ts-nocheck
'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, Trash2, Download, Loader2, Eye, QrCode,
  CheckCircle, AlertCircle, ArrowRight, RefreshCw
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
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

interface StoredPdf {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  url: string;
}

export default function IdCardPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [storedPdfs, setStoredPdfs] = useState<StoredPdf[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(true);

  // Extract state
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState('');
  const [cards, setCards] = useState<ExtractedCard[]>([]);
  const [debugImages, setDebugImages] = useState<{ page: number; dataUrl: string }[]>([]);

  // Update state
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<{ updated: number; failed: number } | null>(null);

  // UI state
  const [deleteTarget, setDeleteTarget] = useState<StoredPdf | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // ── Fetch stored PDFs ──
  const fetchPdfs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/idcard-pdf');
      const data = await res.json();
      setStoredPdfs(data.data ?? []);
    } catch { toast.error('Gagal memuat data PDF.'); }
    finally { setLoadingPdfs(false); }
  }, [toast]);

  const loadPdfs = () => { setLoadingPdfs(true); fetchPdfs(); };

  // ── File select ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setCards([]);
      setResult(null);
    }
  };

  // ── Upload + Extract combined ──
  const handleUploadAndExtract = async () => {
    if (!file) return;
    setUploading(true);
    setExtractProgress('Mengupload PDF...');

    try {
      // Step 1: Upload PDF
      const formData = new FormData();
      formData.append('file', file);
      if (label.trim()) formData.append('label', label.trim());

      const uploadRes = await fetch('/api/admin/idcard-pdf', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) { toast.error(uploadData.message); return; }

      toast.success('PDF tersimpan! Mendeteksi QR code...');
      fetchPdfs();

      // Step 2: Extract QR codes from PDF
      setExtracting(true);
      setExtractProgress('Membaca PDF...');

      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const jsQR = (await import('jsqr')).default;

      const extractedCards: ExtractedCard[] = [];
      const SCALE = 3;
      const debugImagesList: { page: number; dataUrl: string }[] = [];

      // Helper: find all QR codes in ImageData by iteratively masking
      function findAllQrCodes(pixels: Uint8ClampedArray, w: number, h: number): { data: string; x: number; y: number; size: number }[] {
        const results: { data: string; x: number; y: number; size: number }[] = [];

        for (let attempt = 0; attempt < 15; attempt++) {
          const found = jsQR(pixels, w, h, { inversionAttempts: 'attemptBoth' });
          if (!found) break;

          results.push({
            data: found.data,
            x: found.location.topLeftCorner.x,
            y: found.location.topLeftCorner.y,
            size: Math.hypot(
              found.location.topRightCorner.x - found.location.topLeftCorner.x,
              found.location.topRightCorner.y - found.location.topLeftCorner.y
            ),
          });

          // Black out the QR region (with padding) so next scan finds others
          const padding = 20;
          const cx = Math.floor((found.location.topLeftCorner.x + found.location.bottomRightCorner.x) / 2);
          const cy = Math.floor((found.location.topLeftCorner.y + found.location.bottomRightCorner.y) / 2);
          const qrW = Math.hypot(
            found.location.topRightCorner.x - found.location.topLeftCorner.x,
            found.location.topRightCorner.y - found.location.topLeftCorner.y
          );
          const qrH = Math.hypot(
            found.location.bottomLeftCorner.x - found.location.topLeftCorner.x,
            found.location.bottomLeftCorner.y - found.location.topLeftCorner.y
          );
          const halfW = Math.ceil(qrW / 2) + padding;
          const halfH = Math.ceil(qrH / 2) + padding;
          const x0 = Math.max(0, cx - halfW);
          const y0 = Math.max(0, cy - halfH);
          const x1 = Math.min(w, cx + halfW);
          const y1 = Math.min(h, cy + halfH);
          for (let py = y0; py < y1; py++) {
            for (let px = x0; px < x1; px++) {
              const idx = (py * w + px) * 4;
              pixels[idx] = 0;
              pixels[idx + 1] = 0;
              pixels[idx + 2] = 0;
              pixels[idx + 3] = 255;
            }
          }
        }
        return results;
      }

      // Helper: scan a region for QR
      function scanRegion(imageData: ImageData, rx: number, ry: number, rw: number, rh: number): string | null {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rw;
        tempCanvas.height = rh;
        const tempCtx = tempCanvas.getContext('2d')!;
        // Need to extract from the original imageData
        const tempData = tempCtx.createImageData(rw, rh);
        for (let row = 0; row < rh; row++) {
          const srcOffset = ((ry + row) * imageData.width + rx) * 4;
          const dstOffset = row * rw * 4;
          tempData.data.set(imageData.data.subarray(srcOffset, srcOffset + rw * 4), dstOffset);
        }
        const result = jsQR(tempData.data, rw, rh, { inversionAttempts: 'attemptBoth' });
        return result ? result.data : null;
      }

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setExtractProgress(`Halaman ${pageNum}/${totalPages}...`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: SCALE });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const scaledW = canvas.width;
        const scaledH = canvas.height;
        const unscaled = page.getViewport({ scale: 1 });

        console.log(`=== Page ${pageNum} ===`);
        console.log(`Unscaled: ${unscaled.width}x${unscaled.height}`);
        console.log(`Scaled (${SCALE}x): ${scaledW}x${scaledH}`);

        // Save debug image
        const dataUrl = canvas.toDataURL('image/png');
        debugImagesList.push({ page: pageNum, dataUrl });

        // Count non-white pixels to verify canvas has content
        const fullPageData = ctx.getImageData(0, 0, scaledW, scaledH);
        let nonWhitePixels = 0;
        for (let i = 0; i < fullPageData.data.length; i += 4) {
          if (fullPageData.data[i] < 240 || fullPageData.data[i + 1] < 240 || fullPageData.data[i + 2] < 240) {
            nonWhitePixels++;
          }
        }
        console.log(`Non-white pixels: ${nonWhitePixels} / ${scaledW * scaledH} (${(nonWhitePixels / (scaledW * scaledH) * 100).toFixed(1)}%)`);

        // Strategy 1: scan full page with iterative masking
        const fullPixels = new Uint8ClampedArray(fullPageData.data);
        let qrResults = findAllQrCodes(fullPixels, scaledW, scaledH);
        console.log(`Strategy 1 (full page): ${qrResults.length} QR codes`);

        // Strategy 2: if few found, try splitting into 3 columns and scanning each
        if (qrResults.length < totalPages * 2) {
          const colWidth = Math.floor(scaledW / 3);
          for (let col = 0; col < 3; col++) {
            const colX = col * colWidth;
            const w = col === 2 ? scaledW - colX : colWidth;
            const colData = ctx.getImageData(colX, 0, w, scaledH);
            const colPixels = new Uint8ClampedArray(colData.data);
            const colQrs = findAllQrCodes(colPixels, w, scaledH);
            console.log(`Strategy 2 column ${col}: ${colQrs.length} QR codes`);
            for (const q of colQrs) {
              // Adjust x to page coordinates
              const adjustedX = q.x + colX;
              const isDupe = qrResults.some(existing =>
                Math.abs(existing.x - adjustedX) < 50 && Math.abs(existing.y - q.y) < 50
              );
              if (!isDupe) {
                qrResults.push({ ...q, x: adjustedX });
              }
            }
          }
        }

        // Strategy 3: if still few, try scanning with grid (4 cols x 3 rows)
        if (qrResults.length < totalPages * 2) {
          const gridCols = 4;
          const gridRows = 3;
          const cellW = Math.floor(scaledW / gridCols);
          const cellH = Math.floor(scaledH / gridRows);
          for (let gr = 0; gr < gridRows; gr++) {
            for (let gc = 0; gc < gridCols; gc++) {
              const rx = gc * cellW;
              const ry = gr * cellH;
              const w = gc === gridCols - 1 ? scaledW - rx : cellW;
              const h = gr === gridRows - 1 ? scaledH - ry : cellH;
              const cellData = ctx.getImageData(rx, ry, w, h);
              const cellPixels = new Uint8ClampedArray(cellData.data);
              const cellQrs = findAllQrCodes(cellPixels, w, h);
              for (const q of cellQrs) {
                const adjustedX = q.x + rx;
                const adjustedY = q.y + ry;
                const isDupe = qrResults.some(existing =>
                  Math.abs(existing.x - adjustedX) < 50 && Math.abs(existing.y - adjustedY) < 50
                );
                if (!isDupe) {
                  qrResults.push({ ...q, x: adjustedX, y: adjustedY });
                }
              }
            }
          }
          console.log(`Strategy 3 (grid): total ${qrResults.length} QR codes`);
        }

        qrResults.sort((a, b) => a.x - b.x);
        console.log(`Final: ${qrResults.length} QR codes on page ${pageNum}`);

        // Extract text from PDF
        const textContent = await page.getTextContent();
        const items = textContent.items as { str: string; transform: number[] }[];
        const pageWidth = unscaled.width;

        const textItems = items
          .map(it => ({
            text: it.str.trim(),
            x: it.transform[4],
            y: it.transform[5],
          }))
          .filter(t => t.text.length > 0);

        for (let qi = 0; qi < qrResults.length; qi++) {
          const qr = qrResults[qi];
          const qrXunscaled = qr.x / SCALE;
          const cardLeft = qrXunscaled - pageWidth / 3;
          const cardRight = qrXunscaled + pageWidth / 3;

          const cardTexts = textItems
            .filter(t => t.x >= cardLeft && t.x <= cardRight)
            .map(t => t.text);

          const skipWords = ['SDIT', 'BIDANG', 'KARTU', 'SCAN', 'AKTIF', 'SANTRI', 'IDENTITAS', 'QUR\'AN', 'AL HILMI', 'AL-HILMI', 'NAMA', 'NISN', 'KELAS', 'ALAMAT', 'TTL', 'ORANG TUA'];
          let foundNama = '';
          let foundNisn = '';

          for (const t of cardTexts) {
            if (t.length <= 1) continue;
            if (skipWords.some(w => t.toUpperCase().includes(w))) continue;
            if (/^\d{3,5}$/.test(t) && !foundNisn) { foundNisn = t; continue; }
            if (/^[A-Za-z\s.'-]{3,}$/.test(t) && t.length > foundNama.length) { foundNama = t; }
          }

          console.log(`QR ${qi}: data=${qr.data.slice(0, 16)}... name=${foundNama} nisn=${foundNisn}`);

          extractedCards.push({
            nama: foundNama,
            nisn: foundNisn,
            qrCode: qr.data,
            matched: false,
            selected: true,
          });
        }
      }

      setDebugImages(debugImagesList);

      // Step 3: Match with database
      setExtractProgress('Mencocokkan dengan database...');
      const matchRes = await fetch('/api/siswa/list?limit=500');
      const matchData = await matchRes.json();
      const dbStudents: { nama: string; nisn: string; qr_code: string }[] = matchData.data ?? [];

      // Also try to match by QR code prefix (first 8 chars)
      const qrPrefixMap = new Map<string, typeof dbStudents[0]>();
      for (const s of dbStudents) {
        if (s.qr_code) {
          qrPrefixMap.set(s.qr_code.slice(0, 8).toUpperCase(), s);
        }
      }

      for (const card of extractedCards) {
        // First try: match by QR prefix
        if (card.qrCode) {
          const prefix = card.qrCode.slice(0, 8).toUpperCase();
          const qrMatch = qrPrefixMap.get(prefix);
          if (qrMatch) {
            card.matched = true;
            card.dbName = qrMatch.nama;
            card.dbQrCode = qrMatch.qr_code;
            card.nama = qrMatch.nama;
            card.nisn = card.nisn || qrMatch.nisn;
            continue;
          }

          // Also try: exact QR match
          const exactMatch = dbStudents.find(s => s.qr_code && s.qr_code.toUpperCase() === card.qrCode.toUpperCase());
          if (exactMatch) {
            card.matched = true;
            card.dbName = exactMatch.nama;
            card.dbQrCode = exactMatch.qr_code;
            card.nama = exactMatch.nama;
            card.nisn = card.nisn || exactMatch.nisn;
            continue;
          }
        }

        // Second try: match by name
        if (card.nama) {
          const nameMatch = dbStudents.find(s => {
            const sName = s.nama.toLowerCase();
            const cName = card.nama.toLowerCase();
            return sName === cName || sName.includes(cName) || cName.includes(sName);
          });
          if (nameMatch) {
            card.matched = true;
            card.dbName = nameMatch.nama;
            card.dbQrCode = nameMatch.qr_code;
            card.nama = nameMatch.nama;
            card.nisn = card.nisn || nameMatch.nisn;
            continue;
          }
        }

        // Third try: match by NISN
        if (card.nisn) {
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
      setExtractProgress(`${extractedCards.length} QR code terdeteksi dari ${totalPages} halaman.`);
      toast.success(`${extractedCards.length} QR code terdeteksi!`);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Gagal mendeteksi QR code.');
      setExtractProgress('Gagal mendeteksi.');
    } finally {
      setUploading(false);
      setExtracting(false);
      setFile(null);
      setLabel('');
    }
  };

  // ── Update database ──
  const handleUpdateDb = async () => {
    const selectedCards = cards.filter(c => c.selected && c.qrCode);
    if (selectedCards.length === 0) { toast.error('Tidak ada kartu yang dipilih.'); return; }

    setUpdating(true);
    try {
      const res = await fetch('/api/admin/idcard-pdf', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappings: selectedCards.map(c => ({ nama: c.nama, qrCode: c.qrCode })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }

      setResult({ updated: data.updated, failed: data.failed });
      toast.success(`${data.updated} QR code berhasil diupdate!`);

      setCards(prev => prev.map(c => {
        const r = data.results?.find((r: { nama: string }) => r.nama === c.nama);
        return r?.status === 'updated' ? { ...c, dbQrCode: c.qrCode } : c;
      }));
    } catch { toast.error('Gagal update database.'); }
    finally { setUpdating(false); }
  };

  // ── Delete PDF ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.key);
    try {
      const res = await fetch('/api/admin/idcard-pdf', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: deleteTarget.key }),
      });
      if (!res.ok) { toast.error('Gagal menghapus.'); return; }
      toast.success('PDF dihapus.');
      setDeleteTarget(null);
      fetchPdfs();
    } catch { toast.error('Gagal menghapus.'); }
    finally { setDeleting(null); }
  };

  const toggleAll = () => setCards(prev => prev.map(c => ({ ...c, selected: !prev.every(x => x.selected) })));
  const toggleCard = (i: number) => setCards(prev => prev.map((c, idx) => idx === i ? { ...c, selected: !c.selected } : c));

  const formatSize = (b: number) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const isProcessing = uploading || extracting;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ID Card PDF</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload PDF ID card → otomatis deteksi QR code → update database → scan langsung kenali siswa.
        </p>
      </div>

      {/* Upload & Detect */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-all"
          onClick={() => !isProcessing && fileInputRef.current?.click()}>
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={24} className="text-amber-500" />
              <span className="font-medium text-slate-700">{file.name}</span>
              <span className="text-xs text-slate-400">({formatSize(file.size)})</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload size={28} className="text-slate-400 mx-auto" />
              <p className="text-slate-500 text-sm">Klik atau seret PDF ID card ke sini</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Label (opsional, contoh: Kelas Makkah)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            disabled={isProcessing} />
          <Button onClick={handleUploadAndExtract} disabled={!file || isProcessing}
            leftIcon={isProcessing ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}>
            {isProcessing ? extractProgress || 'Memproses...' : 'Upload & Deteksi QR'}
          </Button>
        </div>

        {extractProgress && !isProcessing && (
          <p className="mt-3 text-sm text-slate-600">{extractProgress}</p>
        )}

        {debugImages.length > 0 && !isProcessing && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-2">Debug: Rendered pages (klik untuk download)</p>
            <div className="flex gap-2 flex-wrap">
              {debugImages.map(d => (
                <a key={d.page} href={d.dataUrl} download={`page-${d.page}.png`}
                  className="text-xs bg-white border border-slate-200 rounded px-2 py-1 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                  Page {d.page}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Cards */}
      {cards.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              Hasil Deteksi ({cards.length} QR code)
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={cards.every(c => c.selected)} onChange={toggleAll}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                Semua
              </label>
              <Button onClick={handleUpdateDb} disabled={updating || cards.filter(c => c.selected && c.qrCode).length === 0}
                leftIcon={updating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}>
                {updating ? 'Update...' : `Update ${cards.filter(c => c.selected && c.qrCode).length} QR Code`}
              </Button>
            </div>
          </div>

          {result && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${result.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
              {result.updated} berhasil{result.failed > 0 && `, ${result.failed} gagal`}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="w-8 py-2 px-3"></th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Nama</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">NIS</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">QR dari PDF</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">QR di DB</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <input type="checkbox" checked={c.selected} onChange={() => toggleCard(i)}
                        disabled={!c.qrCode} className="rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800">
                      {c.nama || <span className="text-slate-400 italic">?</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{c.nisn || '-'}</td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {c.qrCode ? <span className="bg-slate-100 px-2 py-0.5 rounded">{c.qrCode.slice(0, 8).toUpperCase()}</span>
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-500">
                      {c.dbQrCode ? c.dbQrCode.slice(0, 8).toUpperCase() : '-'}
                    </td>
                    <td className="py-2 px-3">
                      {!c.matched ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertCircle size={11} /> Belum cocok
                        </span>
                      ) : c.dbQrCode?.toUpperCase() === c.qrCode.toUpperCase() ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle size={11} /> Cocok
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <ArrowRight size={11} /> Perlu update
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

      {/* Stored PDFs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">PDF Tersimpan</h2>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={loadPdfs}>Refresh</Button>
        </div>

        {loadingPdfs ? (
          <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        ) : storedPdfs.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <FileText size={36} className="mx-auto mb-2" />
            <p className="text-sm">Belum ada PDF tersimpan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {storedPdfs.map(pdf => (
              <div key={pdf.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:border-amber-200 border border-transparent transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={18} className="text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 text-sm truncate">{pdf.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatSize(pdf.size)}
                      {pdf.lastModified && ` · ${new Date(pdf.lastModified).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" leftIcon={<Eye size={13} />} onClick={() => setPreviewUrl(pdf.url)} />
                  <a href={pdf.url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" leftIcon={<Download size={13} />} />
                  </a>
                  <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />}
                    className="text-red-400 hover:text-red-600" onClick={() => setDeleteTarget(pdf)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Preview ID Card" size="lg">
        {previewUrl && <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-slate-200" title="Preview" />}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus PDF" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Hapus <strong>{deleteTarget?.name}</strong>?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button variant="danger" onClick={handleDelete} disabled={!!deleting}
              leftIcon={deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}>
              {deleting ? 'Hapus...' : 'Hapus'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
