'use client';

// src/app/(dashboard)/laporan-kirim/page.tsx
// Halaman Kirim Laporan untuk Tim Qur'an — auto-recap data siswa, lalu kirim ke Kabid/Sekretaris

import React, { useCallback, useEffect, useState } from 'react';
import { Send, Loader2, FileText, Eye, CheckCircle, Clock, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { useRole } from '@/hooks/useRole';

interface StudentRecap {
  id: string;
  nama: string;
  nisn: string;
  gender: string;
  kelas: string;
  juz_terakhir: number | null;
  hafalan_count: number;
  hafalan_dinilai: number;
  tahsin_count: number;
  tahsin_dinilai: number;
  absensi_hadir: number;
  absensi_total: number;
  kehadiran_pct: number;
}

interface RecapData {
  teacher_name: string;
  periode: string;
  tahun_ajaran: string;
  summary: {
    total_students: number;
    total_hafalan: number;
    hafalan_dinilai: number;
    total_tahsin: number;
    tahsin_dinilai: number;
    total_absensi: number;
    avg_kehadiran: number;
  };
  students: StudentRecap[];
}

interface ReportItem {
  id: string;
  judul: string;
  ringkasan: string | null;
  periode: string;
  tahun_ajaran: string;
  status: 'draft' | 'sent' | 'reviewed';
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  users?: { name: string } | null;
}

export default function KirimLaporanPage() {
  const { isTimQuran } = useRole();

  // Recap data
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [periode, setPeriode] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState('');

  // Reports list
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Form
  const [judul, setJudul] = useState('');
  const [ringkasan, setRingkasan] = useState('');
  const [sending, setSending] = useState(false);
  const [showRecap, setShowRecap] = useState(false);

  // Detail modal
  const [detailReport, setDetailReport] = useState<ReportItem | null>(null);

  // Load existing reports
  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch('/api/laporan-baru');
      const json = await res.json();
      setReports(json.data ?? []);
    } catch { setReports([]); }
    finally { setReportsLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Fetch recap
  const handleFetchRecap = async () => {
    setRecapLoading(true);
    setRecap(null);
    try {
      const params = new URLSearchParams();
      if (periode) params.set('periode', periode);
      if (tahunAjaran) params.set('tahun_ajaran', tahunAjaran);
      const res = await fetch(`/api/laporan-baru/recap?${params}`);
      const json = await res.json();
      setRecap(json.data ?? null);
      if (json.data) {
        setShowRecap(true);
        if (!judul) setJudul(`Laporan Pencapaian ${json.data.periode || 'Semester'} ${json.data.tahun_ajaran || ''}`);
      }
    } catch { /* ignore */ }
    finally { setRecapLoading(false); }
  };

  // Send report
  const handleSend = async (status: 'draft' | 'sent') => {
    if (!recap) return;
    setSending(true);
    try {
      const res = await fetch('/api/laporan-baru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periode: recap.periode || periode,
          tahun_ajaran: recap.tahun_ajaran || tahunAjaran,
          judul: judul || `Laporan ${recap.periode}`,
          ringkasan,
          detail_json: recap,
          status,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        fetchReports();
        setJudul('');
        setRingkasan('');
        setRecap(null);
        setShowRecap(false);
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  // Fetch semester config on mount
  useEffect(() => {
    fetch('/api/semester/config')
      .then(r => r.ok ? r.json() : { data: null })
      .then(j => {
        if (j.data) {
          setPeriode(j.data.semester_name || '');
          setTahunAjaran(new Date().getFullYear() + '/' + (new Date().getFullYear() + 1));
        }
      })
      .catch(() => {});
  }, []);

  const statusBadge = (s: string) => {
    if (s === 'sent') return <Badge variant="blue">Terkirim</Badge>;
    if (s === 'reviewed') return <Badge variant="green">Ditinjau</Badge>;
    return <Badge variant="gray">Draf</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kirim Laporan</h1>
        <p className="text-sm text-slate-500 mt-0.5">Auto-recap data siswa yang Anda ajar, lalu kirim ke Kabid/Sekretaris.</p>
      </div>

      {/* Form Input Periode */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Atur Periode Laporan</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Periode</label>
            <input type="text" value={periode} onChange={e => setPeriode(e.target.value)}
              placeholder="Contoh: Semester I"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Tahun Ajaran</label>
            <input type="text" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}
              placeholder="Contoh: 2025/2026"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>
        <Button variant="primary" leftIcon={recapLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          onClick={handleFetchRecap} disabled={recapLoading}>
          {recapLoading ? 'Memuat Recap...' : 'Generate Recap Otomatis'}
        </Button>
      </div>

      {/* Recap Preview */}
      {recap && showRecap && (
        <div className="bg-gradient-to-br from-amber-50 to-blue-50 rounded-xl border-2 border-amber-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-800">Rekap Otomatis — {recap.teacher_name}</p>
            <button onClick={() => setShowRecap(false)} className="text-slate-400 hover:text-slate-600">
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Siswa', value: recap.summary.total_students },
              { label: 'Hafalan Dinilai', value: `${recap.summary.hafalan_dinilai}/${recap.summary.total_hafalan}` },
              { label: 'Tahsin Dinilai', value: `${recap.summary.tahsin_dinilai}/${recap.summary.total_tahsin}` },
              { label: 'Avg Kehadiran', value: `${recap.summary.avg_kehadiran}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg px-3 py-2 border border-amber-100">
                <p className="text-[10px] text-amber-400 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-amber-700">{value}</p>
              </div>
            ))}
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <th className="px-3 py-2 text-left">Nama</th>
                  <th className="px-3 py-2 text-left">Kelas</th>
                  <th className="px-3 py-2 text-center">Hafalan</th>
                  <th className="px-3 py-2 text-center">Tahsin</th>
                  <th className="px-3 py-2 text-center">Kehadiran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recap.students.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700">{s.nama}</td>
                    <td className="px-3 py-2 text-slate-500">{s.kelas}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={s.hafalan_dinilai > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                        {s.hafalan_dinilai}/{s.hafalan_count}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={s.tahsin_dinilai > 0 ? 'text-blue-600 font-semibold' : 'text-slate-400'}>
                        {s.tahsin_dinilai}/{s.tahsin_count}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={s.kehadiran_pct >= 80 ? 'text-amber-600 font-semibold' : s.kehadiran_pct >= 50 ? 'text-amber-600' : 'text-red-600'}>
                        {s.kehadiran_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kirim Form */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Judul Laporan</label>
              <input type="text" value={judul} onChange={e => setJudul(e.target.value)}
                placeholder="Laporan Pencapaian Semester..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ringkasan <span className="text-slate-400">(opsional)</span></label>
              <textarea value={ringkasan} onChange={e => setRingkasan(e.target.value)} rows={3}
                placeholder="Tulis ringkasan singkat laporan..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" leftIcon={<FileText size={14} />}
                onClick={() => handleSend('draft')} disabled={sending || !judul.trim()}>
                Simpan Draf
              </Button>
              <Button variant="primary" leftIcon={sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                onClick={() => handleSend('sent')} disabled={sending || !judul.trim()}>
                {sending ? 'Mengirim...' : 'Kirim Laporan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Laporan */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-sm font-semibold text-slate-700">Riwayat Laporan</p>
        </div>
        <div className="divide-y divide-slate-100">
          {reportsLoading ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">Memuat...</div>
          ) : reports.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">Belum ada laporan</div>
          ) : reports.map(r => (
            <div key={r.id} className="px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.judul}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.periode} · {r.tahun_ajaran} · {new Date(r.created_at).toLocaleDateString('id-ID')}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(r.status)}
                <Button variant="ghost" size="sm" leftIcon={<Eye size={14} />}
                  onClick={() => setDetailReport(r)}>
                  Detail
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={Boolean(detailReport)} onClose={() => setDetailReport(null)} title="Detail Laporan" size="lg">
        {detailReport && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{detailReport.judul}</p>
              <p className="text-sm text-slate-500">{detailReport.periode} · {detailReport.tahun_ajaran}</p>
            </div>
            {detailReport.ringkasan && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Ringkasan</p>
                <p className="text-sm text-slate-700">{detailReport.ringkasan}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Status:</span>
              {statusBadge(detailReport.status)}
              {detailReport.review_note && (
                <span className="text-xs text-slate-500">Catatan reviewer: {detailReport.review_note}</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
