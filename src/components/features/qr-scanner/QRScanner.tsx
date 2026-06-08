'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, Clock, Users } from 'lucide-react';

interface ScannedStudent { nama: string; scanned_at: string; }

interface QRScannerProps {
  onScanSuccess: (namaSiswa: string) => void;
  onScanError: (pesan: string) => void;
  scannedList: ScannedStudent[];
  /** Jika true: hanya tampilkan kamera tanpa daftar hadir (daftar di-render di parent) */
  compact?: boolean;
}

const QR_READER_ID = 'qr-reader-container';

// Module-level variables to track active scanner lifecycle across mounts
let globalHtml5Qrcode: Html5Qrcode | null = null;
let globalCleanupPromise: Promise<void> = Promise.resolve();

export default function QRScanner({ onScanSuccess, onScanError, scannedList, compact = false }: QRScannerProps) {
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      // Tunggu hingga proses pembersihan instance sebelumnya selesai sepenuhnya
      await globalCleanupPromise;

      if (!isMounted) return;

      try {
        // Pastikan container bersih sebelum inisialisasi baru
        const container = document.getElementById(QR_READER_ID);
        if (container) {
          container.innerHTML = '';
        }

        const html5Qrcode = new Html5Qrcode(QR_READER_ID);
        html5QrcodeRef.current = html5Qrcode;
        globalHtml5Qrcode = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            try {
              const response = await fetch('/api/absensi/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qr_code: decodedText }),
              });
              const data = await response.json();
              if (!isMounted) return;
              if (response.ok) onScanSuccess(data.siswa);
              else onScanError(data.message ?? 'Terjadi kesalahan.');
            } catch {
              if (isMounted) onScanError('Gagal menghubungi server.');
            } finally {
              setTimeout(() => { isProcessingRef.current = false; }, 2000);
            }
          },
          () => {}
        );

        if (!isMounted) {
          // Komponen di-unmount saat start() sedang berjalan.
          // Bersihkan secara asinkron lewat globalCleanupPromise.
          globalCleanupPromise = (async () => {
            try {
              await html5Qrcode.stop();
            } catch (e) {}
            try {
              await html5Qrcode.clear();
            } catch (e) {}
            if (globalHtml5Qrcode === html5Qrcode) {
              globalHtml5Qrcode = null;
            }
            const container = document.getElementById(QR_READER_ID);
            if (container) {
              container.innerHTML = '';
            }
          })();
          return;
        }

        setIsScanning(true);
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error('Error starting scanner:', err);
        const msg = err instanceof Error ? err.message : 'Tidak dapat mengakses kamera.';
        setCameraError(
          msg.includes('Permission')
            ? 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.'
            : 'Tidak dapat memulai kamera: ' + msg
        );
      }
    }

    startScanner();

    return () => {
      isMounted = false;
      const currentScanner = html5QrcodeRef.current;
      if (!currentScanner) return;

      // Catat pembersihan ke promise global agar dimount berikutnya menunggu proses ini selesai
      globalCleanupPromise = (async () => {
        try {
          await currentScanner.stop();
        } catch (e) {
          // Abaikan jika sudah di-stop
        }
        try {
          await currentScanner.clear();
        } catch (e) {
          // Abaikan jika gagal clear
        }
        if (globalHtml5Qrcode === currentScanner) {
          globalHtml5Qrcode = null;
        }
        const container = document.getElementById(QR_READER_ID);
        if (container) {
          container.innerHTML = '';
        }
      })();
    };
  }, [onScanError, onScanSuccess]);

  return (
    <div className="flex flex-col gap-3">
      {/* Viewport kamera */}
      <div className="rounded-2xl overflow-hidden"
        style={{background: 'linear-gradient(135deg, #0f172a, #1e1b4b)'}}>
        {cameraError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 gap-3">
            <span className="text-4xl">📷</span>
            <p className="text-slate-300 text-sm">{cameraError}</p>
          </div>
        ) : (
          <>
            <div id={QR_READER_ID} className="w-full" />
            {!isScanning && (
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Memulai kamera…</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status kamera — compact badge */}
      {isScanning && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          Kamera aktif — arahkan QR code ke kotak pemindai
        </div>
      )}

      {/* Daftar hadir — hanya tampil jika tidak compact */}
      {!compact && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
            <Users size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Hadir Hari Ini</span>
            <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {scannedList.length} siswa
            </span>
          </div>
          {scannedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
              <Clock size={28} />
              <p className="text-xs">Belum ada siswa yang di-scan hari ini</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {scannedList.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 px-4 py-2.5">
                  <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-slate-800">{item.nama}</span>
                  <span className="text-xs text-slate-400">{item.scanned_at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
