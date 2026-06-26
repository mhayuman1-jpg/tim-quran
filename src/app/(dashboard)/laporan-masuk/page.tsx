'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/laporan-masuk/page.tsx
// Halaman Laporan Masuk untuk Kabid/Sekretaris — melihat & review laporan dari Tim Qur'an

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, Eye, Filter, Loader2, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';

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
  detail_json: any;
  users?: { name: string } | null;
}

export default function LaporanMasukPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Detail modal
  const [detailReport, setDetailReport] = useState<ReportItem | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/laporan-baru');
      const json = await res.json();
      setReports(json.data ?? []);
    } catch { setReports([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleReview = async (status: 'reviewed') => {
    if (!detailReport) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/laporan-baru', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: detailReport.id, status, review_note: reviewNote }),
      });
      if (res.ok) {
        fetchReports();
        setDetailReport(null);
        setReviewNote('');
      }
    } catch { /* ignore */ }
    finally { setActionLoading(false); }
  };

  const filtered = reports.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (search && !r.judul.toLowerCase().includes(search.toLowerCase()) && !(r.users as any)?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusBadge = (s: string) => {
    if (s === 'sent') return <Badge variant="blue">Perlu Ditinjau</Badge>;
    if (s === 'reviewed') return <Badge variant="green">Ditinjau</Badge>;
    return <Badge variant="gray">Draf</Badge>;
  };

  const students = detailReport?.detail_json?.students ?? [];
  const summary = detailReport?.detail_json?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Laporan Masuk</h1>
        <p className="text-sm text-slate-500 mt-0.5">Laporan yang dikirim oleh anggota Tim Qur&apos;an.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul atau nama guru..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'sent', label: 'Perlu Ditinjau' },
            { value: 'reviewed', label: 'Ditinjau' },
          ].map(opt => (
            <button key={opt.value} onClick={() => setFilterStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterStatus === opt.value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Memuat...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">Tidak ada laporan ditemukan</div>
          ) : filtered.map(r => (
            <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.judul}</p>
                  {statusBadge(r.status)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {(r.users as any)?.name ?? 'Guru'} · {r.periode} · {r.tahun_ajaran} · {new Date(r.created_at).toLocaleDateString('id-ID')}
                </p>
                {r.ringkasan && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.ringkasan}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" leftIcon={<Eye size={14} />}
                onClick={() => { setDetailReport(r); setReviewNote(r.review_note || ''); }}>
                Lihat
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Laporan', value: reports.length, color: 'slate' },
          { label: 'Perlu Ditinjau', value: reports.filter(r => r.status === 'sent').length, color: 'blue' },
          { label: 'Sudah Ditinjau', value: reports.filter(r => r.status === 'reviewed').length, color: 'amber' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 rounded-xl border border-${color}-100 px-4 py-3`}>
            <p className={`text-xs text-${color}-500 uppercase tracking-wide`}>{label}</p>
            <p className={`text-2xl font-bold text-${color}-700 mt-0.5`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal open={Boolean(detailReport)} onClose={() => setDetailReport(null)} title="Detail Laporan" size="xl">
        {detailReport && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-slate-900">{detailReport.judul}</p>
              <p className="text-sm text-slate-500">
                {(detailReport.users as any)?.name ?? 'Guru'} · {detailReport.periode} · {detailReport.tahun_ajaran}
              </p>
            </div>

            {detailReport.ringkasan && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Ringkasan</p>
                <p className="text-sm text-slate-700">{detailReport.ringkasan}</p>
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Siswa', value: summary.total_students },
                  { label: 'Hafalan', value: `${summary.hafalan_dinilai}/${summary.total_hafalan}` },
                  { label: 'Tahsin', value: `${summary.tahsin_dinilai}/${summary.total_tahsin}` },
                  { label: 'Kehadiran', value: `${summary.avg_kehadiran}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100 text-center">
                    <p className="text-[10px] text-amber-400 uppercase">{label}</p>
                    <p className="text-sm font-bold text-amber-700">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Students Table */}
            {students.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                    {students.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{s.nama}</td>
                        <td className="px-3 py-2 text-slate-500">{s.kelas}</td>
                        <td className="px-3 py-2 text-center">{s.hafalan_dinilai}/{s.hafalan_count}</td>
                        <td className="px-3 py-2 text-center">{s.tahsin_dinilai}/{s.tahsin_count}</td>
                        <td className="px-3 py-2 text-center">{s.kehadiran_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Review Section */}
            {detailReport.status === 'sent' && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Catatan Review</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                    placeholder="Tambahkan catatan untuk guru..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                </div>
                <Button variant="primary" leftIcon={actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  onClick={() => handleReview('reviewed')} disabled={actionLoading}>
                  {actionLoading ? 'Memproses...' : 'Tandai Sudah Ditinjau'}
                </Button>
              </div>
            )}

            {detailReport.status === 'reviewed' && detailReport.review_note && (
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">Catatan Review</p>
                <p className="text-sm text-amber-800">{detailReport.review_note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
