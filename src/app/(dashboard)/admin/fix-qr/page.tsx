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

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setExtractProgress(`Halaman ${pageNum}/${totalPages}...`);

        const page = await pdf.getPage(pageNum);
        const unscaled = page.getViewport({ scale: 1 });
        const scale = 3;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const scaledW = canvas.width;
        const scaledH = canvas.height;

        // Split 3 kolom per halaman
        const colWidth = Math.floor(scaledW / 3);
        const searchTop = Math.floor(scaledH * 0.1);
        const searchBottom = Math.floor(scaledH * 0.9);
        const searchHeight = searchBottom - searchTop;

        // Extract text per kolom
        const textContent = await page.getTextContent();
        const items = textContent.items as { str: string; transform: number[] }[];
        const colTexts: string[][] = [[], [], []];

        for (const item of items) {
          const text = item.str.trim();
          if (!text) continue;
          const xPos = item.transform[4];
          const colIdx = Math.min(2, Math.floor(xPos / (unscaled.width / 3)));
          colTexts[colIdx].push(text);
        }

        // Scan QR per kolom
        for (let col = 0; col < 3; col++) {
          const colX = col * colWidth;

          // Try multiple regions for QR
          const regions = [
            { x: colX + Math.floor(colWidth * 0.55), y: searchTop + Math.floor(searchHeight * 0.05), w: Math.floor(colWidth * 0.42), h: Math.floor(searchHeight * 0.65) },
            { x: colX + Math.floor(colWidth * 0.45), y: searchTop, w: Math.floor(colWidth * 0.53), h: Math.floor(searchHeight * 0.7) },
            { x: colX, y: searchTop, w: colWidth, h: searchHeight },
          ];

          let qrText = '';
          for (const r of regions) {
            const rx = Math.max(0, r.x);
            const ry = Math.max(0, r.y);
            const rw = Math.min(r.w, scaledW - rx);
            const rh = Math.min(r.h, scaledH - ry);
            if (rw <= 0 || rh <= 0) continue;

            const regionData = ctx.getImageData(rx, ry, rw, rh);
            const regionResult = jsQR(regionData.data, rw, rh, { inversionAttempts: 'attemptBoth' });
            if (regionResult) { qrText = regionResult.data; break; }
          }

          // Also try full page for this column area
          if (!qrText) {
            const fullColData = ctx.getImageData(colX, searchTop, colWidth, searchHeight);
            const fullColResult = jsQR(fullColData.data, colWidth, searchHeight, { inversionAttempts: 'attemptBoth' });
            if (fullColResult) qrText = fullColResult.data;
          }

          // Parse text for name + NIS
          const skipWords = ['SDIT', 'BIDANG', 'KARTU', 'SCAN', 'AKTIF', 'SANTRI', 'IDENTITAS', 'QUR\'AN', 'AL HILMI'];
          let foundNama = '';
          let foundNisn = '';

          const filtered = colTexts[col].filter(t =>
            t.length > 1 && !skipWords.some(w => t.toUpperCase().includes(w))
          );

          for (const t of filtered) {
            if (/^\d{3,5}$/.test(t) && !foundNisn) { foundNisn = t; continue; }
            if (/^[A-Za-z\s.'-]{3,}$/.test(t) && t.length > foundNama.length) { foundNama = t; }
          }

          if (qrText || foundNama) {
            extractedCards.push({
              nama: foundNama,
              nisn: foundNisn,
              qrCode: qrText,
              matched: false,
              selected: true,
            });
          }
        }
      }

      // Step 3: Match with database
      setExtractProgress('Mencocokkan dengan database...');
      const matchRes = await fetch('/api/siswa/list?limit=500');
      const matchData = await matchRes.json();
      const dbStudents: { nama: string; nisn: string; qr_code: string }[] = matchData.data ?? [];

      for (const card of extractedCards) {
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
