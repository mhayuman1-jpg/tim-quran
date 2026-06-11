'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

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

const JurnalHafalanTahsinForm = dynamic(
  () => import('@/components/features/tahsin/JurnalHafalanTahsinForm'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Memuat form jurnal…</span>
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

// ─── Types ────────────────────────────────────────────────────────────────

interface ScannedStudent { nama: string; scanned_at: string; id?: string; }
type FeedbackType = 'success' | 'error' | 'warning' | null;
interface Feedback { type: FeedbackType; message: string; }

export default function ScanPage() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [scannedList, setScannedList] = useState<ScannedStudent[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [journalStudent, setJournalStudent] = useState<{ id: string; nama: string } | null>(null);
  const [journalSubmitting, setJournalSubmitting] = useState(false);

  const fetchTodayList = useCallback(async () => {
    setLoadingList(true);
    setPageError(null);
    try {
      const res = await fetch('/api/absensi/today');
      if (!res.ok) {
        setPageError(`Error ${res.status}: Gagal memuat data hari ini`);
        return;
      }
      const json = await res.json();
      if (json.data) setScannedList(json.data);
    } catch (err) {
      setPageError(`Error: ${err instanceof Error ? err.message : 'Tidak dikenal'}`);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { fetchTodayList(); }, [fetchTodayList]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(t);
  }, [feedback]);



  const handleScanSuccess = useCallback((siswa: { nama: string; id: string }) => {
    playSuccessBeep();
    setFeedback({ type: 'success', message: `${siswa.nama} — Absen berhasil!` });
    const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setScannedList(prev => [{ nama: siswa.nama, scanned_at: jam, id: siswa.id }, ...prev]);
    fetchTodayList();
  }, [fetchTodayList]);

  const handleScanError = useCallback((pesan: string) => {
    const isWarning = pesan.toLowerCase().includes('sudah absen');
    if (isWarning) playWarningBeep(); else playErrorBeep();
    setFeedback({ type: isWarning ? 'warning' : 'error', message: pesan });
  }, []);

  // ─── Journal Modal Handlers ────────────────────────────────────────────────────

  const openJournalModal = useCallback((student: { id: string; nama: string }) => {
    setJournalStudent(student);
  }, []);

  const closeJournalModal = useCallback(() => {
    setJournalStudent(null);
  }, []);

  const handleJournalSubmit = useCallback(async (data: any) => {
    setJournalSubmitting(true);
    try {
      const res = await fetch('/api/jurnal-hafalan-tahsin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Gagal menyimpan jurnal');
      setFeedback({ type: 'success', message: 'Jurnal berhasil disimpan!' });
      closeJournalModal();
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Gagal menyimpan jurnal' });
    } finally {
      setJournalSubmitting(false);
    }
  }, [closeJournalModal]);

  // Error page if server/network error
  if (pageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 py-8 px-4 gap-4">
        <AlertCircle size={48} className="text-red-500" />
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-bold text-slate-900 mb-2">Error Memuat Halaman</h1>
          <p className="text-sm text-slate-600 mb-4">{pageError}</p>
          <Button
            variant="secondary"
            onClick={() => {
              setPageError(null);
              fetchTodayList();
            }}
          >
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Scan Absensi QR</h1>
          <p className="text-xs text-slate-500 mt-0.5">Arahkan kamera ke QR code ID card siswa — absen dulu, lalu isi jurnal</p>
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
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <CheckCircle size={13} className="text-amber-600" />
                  </div>
                  <span className="flex-1 text-xs font-medium text-slate-800 truncate">{item.nama}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{item.scanned_at}</span>
                  {item.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<BookOpen size={12} />}
                      onClick={() => item.id && openJournalModal({ id: item.id, nama: item.nama })}
                      disabled={journalSubmitting}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      title="Buka jurnal hafalan & tahsin"
                    >
                      Jurnal
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
    <JournalModal
      student={journalStudent}
      open={!!journalStudent}
      onClose={closeJournalModal}
      onSubmit={handleJournalSubmit}
      submitting={journalSubmitting}
    />
    </>
  );
}

// ─── Journal Modal ──────────────────────────────────────────────────────────────

function JournalModal({ student, open, onClose, onSubmit, submitting }: {
  student: { id: string; nama: string } | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  submitting: boolean;
}) {
  if (!open || !student) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Jurnal Hafalan & Tahsin — ${student.nama}`}
      size="xl"
      closeOnBackdrop={!submitting}
    >
      <JurnalHafalanTahsinForm
        mode="both"
        selectedStudentId={student.id}
        onSubmit={onSubmit}
        onCancel={onClose}
        loading={submitting}
      />
    </Modal>
  );
}

// ─── FeedbackBanner ───────────────────────────────────────────────────────────

interface FeedbackBannerProps { type: FeedbackType; message: string; onDismiss: () => void; }

function FeedbackBanner({ type, message, onDismiss }: FeedbackBannerProps) {
  const styles = {
    success: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', Icon: CheckCircle },
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
