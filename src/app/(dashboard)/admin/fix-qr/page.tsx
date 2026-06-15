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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setCards([]);
      setResult(null);
    }
  };

  const extractQrFromPdf = useCallback(async () => {
    if (!file) return;
    setExtracting(true);
    setExtractProgress('Memuat PDF...');
    setResult(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;

      const extractedCards: ExtractedCard[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setExtractProgress(`Memproses halaman ${pageNum}/${totalPages}...`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 });

        // Render page ke canvas
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Render text content untuk extract nama
        const textContent = await page.getTextContent();
        const textItems = textContent.items as { str: string; transform: number[] }[];

        // Parse text items: cari nama siswa dan NIS
        // Layout kartu: nama di kiri atas, NIS di bawah nama
        const sortedItems = [...textItems].sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5]; // Y position (top to bottom)
          if (Math.abs(yDiff) > 10) return yDiff;
          return a.transform[4] - b.transform[4]; // X position (left to right)
        });

        // Cari pattern: text yang panjang (kemungkinan nama) dan angka (NIS)
        let foundNama = '';
        let foundNisn = '';

        for (const item of sortedItems) {
          const text = item.str.trim();
          if (!text) continue;

          // Skip text yang terlalu pendek atau header
          if (text.length < 2) continue;
          if (text.includes('SDIT') || text.includes('BIDANG') || text.includes('KARTU') || text.includes('SCAN') || text.includes('AKTIF')) continue;

          // Cari NIS (angka 3-4 digit)
          if (/^\d{3,4}$/.test(text) && !foundNisn) {
            foundNisn = text;
            continue;
          }

          // Cari nama (text dengan huruf, minimal 3 karakter, bukan angka)
          if (/^[A-Za-z\s.'-]{3,}$/.test(text) && text.length > foundNama.length && !foundNisn) {
            foundNama = text;
          }
        }

        // Jika tidak ketemu nama dari text, coba cari dari nama file atau fallback
        if (!foundNama) {
          // Coba cari semua text yang bukan header/footer
          const allTexts = textItems
            .map(t => t.str.trim())
            .filter(t => t.length > 2 && !t.includes('SDIT') && !t.includes('BIDANG') && !t.includes('KARTU') && !t.includes('SCAN') && !t.includes('AKTIF') && !/^\d{3,4}$/.test(t));

          // Ambil text terpanjang sebagai nama
          if (allTexts.length > 0) {
            foundNama = allTexts.reduce((a, b) => a.length > b.length ? a : b);
          }
        }

        // Decode QR code dari gambar
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // QR code biasanya di sisi kanan kartu
        // Kartu 85mm x 55mm, QR code di kanan ~30% lebar
        const qrRegionX = Math.floor(canvas.width * 0.62);
        const qrRegionWidth = canvas.width - qrRegionX;
        const qrRegionY = Math.floor(canvas.height * 0.25);
        const qrRegionHeight = Math.floor(canvas.height * 0.55);

        // BuatImageData untuk region QR code
        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = qrRegionWidth;
        qrCanvas.height = qrRegionHeight;
        const qrCtx = qrCanvas.getContext('2d')!;
        qrCtx.drawImage(canvas, qrRegionX, qrRegionY, qrRegionWidth, qrRegionHeight, 0, 0, qrRegionWidth, qrRegionHeight);
        const qrImageData = qrCtx.getImageData(0, 0, qrRegionWidth, qrRegionHeight);

        const jsQR = (await import('jsqr')).default;
        const qrCode = jsQR(qrImageData.data, qrRegionWidth, qrRegionHeight, {
          inversionAttempts: 'attemptBoth',
        });

        let qrText = '';
        if (qrCode) {
          qrText = qrCode.data;
        } else {
          // Coba decode dari seluruh halaman
          const fullImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const fullQr = jsQR(fullImageData.data, canvas.width, canvas.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (fullQr) {
            qrText = fullQr.data;
          }
        }

        // Jika masih tidak ketemu, coba render ulang dengan scale berbeda
        if (!qrText) {
          const retryViewport = page.getViewport({ scale: 3 });
          const retryCanvas = document.createElement('canvas');
          retryCanvas.width = retryViewport.width;
          retryCanvas.height = retryViewport.height;
          const retryCtx = retryCanvas.getContext('2d')!;
          await page.render({ canvasContext: retryCtx, viewport: retryViewport }).promise;

          const retryQrX = Math.floor(retryCanvas.width * 0.6);
          const retryQrW = retryCanvas.width - retryQrX;
          const retryQrY = Math.floor(retryCanvas.height * 0.2);
          const retryQrH = Math.floor(retryCanvas.height * 0.6);

          const retryQrCanvas = document.createElement('canvas');
          retryQrCanvas.width = retryQrW;
          retryQrCanvas.height = retryQrH;
          const retryQrCtx = retryQrCanvas.getContext('2d')!;
          retryQrCtx.drawImage(retryCanvas, retryQrX, retryQrY, retryQrW, retryQrH, 0, 0, retryQrW, retryQrH);
          const retryQrData = retryQrCtx.getImageData(0, 0, retryQrW, retryQrH);

          const retryQr = jsQR(retryQrData.data, retryQrW, retryQrH, { inversionAttempts: 'attemptBoth' });
          if (retryQr) {
            qrText = retryQr.data;
          }
        }

        if (foundNama || qrText) {
          extractedCards.push({
            nama: foundNama,
            nisn: foundNisn,
            qrCode: qrText,
            matched: false,
            selected: true,
          });
        }
      }

      // Cocokkan dengan database
      setExtractProgress('Mencocokkan dengan database...');
      const matchRes = await fetch('/api/siswa/list?limit=500');
      const matchData = await matchRes.json();
      const dbStudents: { nama: string; nisn: string; qr_code: string }[] = matchData.data ?? [];

      for (const card of extractedCards) {
        // Cari by nama (exact atau fuzzy)
        const match = dbStudents.find(s =>
          s.nama.toLowerCase() === card.nama.toLowerCase() ||
          s.nama.toLowerCase().includes(card.nama.toLowerCase()) ||
          card.nama.toLowerCase().includes(s.nama.toLowerCase())
        );

        if (match) {
          card.matched = true;
          card.dbName = match.nama;
          card.dbQrCode = match.qr_code;
          // Update nama ke nama database (lebih akurat)
          card.nama = match.nama;
          card.nisn = match.nisn;
        }
      }

      setCards(extractedCards);
      setExtractProgress(`Selesai! ${extractedCards.length} kartu ditemukan.`);
    } catch (err) {
      console.error('PDF extract error:', err);
      toast.error('Gagal membaca PDF. Pastikan file benar dan coba lagi.');
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

      // Refresh cards
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
              onClick={() => { setFile(null); setCards([]); setResult(null); }}
              disabled={extracting}
            >
              Reset
            </Button>
          </div>
        )}

        {extractProgress && !extracting && (
          <p className="mt-3 text-sm text-slate-600">{extractProgress}</p>
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
                          <AlertCircle size={12} /> Tidak cocok
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
