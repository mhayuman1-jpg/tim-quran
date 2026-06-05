'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

const QRScanner = dynamic(
  () => import('@/components/features/qr-scanner/QRScanner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64 rounded-2xl"
        style={{background: 'linear-gradient(135deg, #0f172a, #1e1b4b)'}}>
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Memuat scanner…</span>
        </div>
      </div>
    ),
  }
);

// ─── Audio — nada "tit" pendek ────────────────────────────────────────────────

function playBeep(freq: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* silent fail */ }
}

// Tit sukses: dua tit naik cepat
function playSuccessBeep() {
  playBeep(1000, 0.08, 0.3);
  setTimeout(() => playBeep(1400, 0.1, 0.3), 90);
}

// Tit warning (sudah absen): satu tit rendah
function playWarningBeep() {
  playBeep(600, 0.12, 0.25);
}

// Tit error: dua tit rendah turun
function playErrorBeep() {
  playBeep(400, 0.1, 0.25);
  setTimeout(() => playBeep(300, 0.12, 0.2), 120);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScannedStudent { nama: string; scanned_at: string; }
type FeedbackType = 'success' | 'error' | 'warning' | null;
interface Feedback { type: FeedbackType; message: string; }

export default function ScanPage() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [scannedList, setScannedList] = useState<ScannedStudent[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  async function fetchTodayList() {
    setLoadingList(true);
    try {
      const res = await fetch('/api/absensi/today');
      const json = await res.json();
      if (res.ok) setScannedList(json.data ?? []);
    } catch { /* ignore */ }
    finally { setLoadingList(false); }
  }

  useEffect(() => { fetchTodayList(); }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleScanSuccess = useCallback((namaSiswa: string) => {
    playSuccessBeep();
    setFeedback({ type: 'success', message: `${namaSiswa} — Absen berhasil!` });
    const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setScannedList(prev => [{ nama: namaSiswa, scanned_at: jam }, ...prev]);
  }, []);

  const handleScanError = useCallback((pesan: string) => {
    const isWarning = pesan.toLowerCase().includes('sudah absen');
    if (isWarning) playWarningBeep(); else playErrorBeep();
    setFeedback({ type: isWarning ? 'warning' : 'error', message: pesan });
  }, []);

  return (
    <div className="space-y-4">
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scan Absensi QR</h1>
          <p className="text-xs text-slate-500 mt-0.5">Arahkan kamera ke QR code ID card siswa</p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={13} />}
          onClick={fetchTodayList} loading={loadingList}>
          Refresh
        </Button>
      </div>

      {/* Feedback banner — compact */}
      {feedback && (
        <FeedbackBanner type={feedback.type} message={feedback.message}
          onDismiss={() => setFeedback(null)} />
      )}

      {/* Layout dua kolom: kamera kiri, daftar kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Kamera */}
        <div>
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onScanError={handleScanError}
            scannedList={scannedList}
            compact
          />
        </div>

        {/* Daftar hadir — desktop: sidebar, mobile: di bawah */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
          style={{maxHeight: '520px'}}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <span className="text-sm font-semibold text-slate-700">Hadir Hari Ini</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
              {scannedList.length}
            </span>
          </div>
          {scannedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-400 gap-2">
              <span className="text-3xl">👥</span>
              <p className="text-xs text-center px-4">Belum ada siswa yang scan hari ini</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {scannedList.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={13} className="text-emerald-600" />
                  </div>
                  <span className="flex-1 text-xs font-medium text-slate-800 truncate">{item.nama}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{item.scanned_at}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FeedbackBanner ───────────────────────────────────────────────────────────

interface FeedbackBannerProps { type: FeedbackType; message: string; onDismiss: () => void; }

function FeedbackBanner({ type, message, onDismiss }: FeedbackBannerProps) {
  const styles = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', Icon: CheckCircle },
    warning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', Icon: AlertCircle },
    error: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800', Icon: XCircle },
  };
  if (!type) return null;
  const { bg, border, text, Icon } = styles[type];
  return (
    <div role="alert" className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${bg} ${border}`}>
      <Icon size={16} className={`${text} shrink-0`} />
      <p className={`flex-1 text-sm font-medium ${text}`}>{message}</p>
      <button onClick={onDismiss} aria-label="Tutup" className={`${text} opacity-60 hover:opacity-100 text-lg leading-none`}>×</button>
    </div>
  );
}
