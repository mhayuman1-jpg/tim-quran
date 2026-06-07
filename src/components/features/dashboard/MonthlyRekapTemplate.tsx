'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Users, Download, Eye, BarChart3, PieChart, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

interface MonthlyStats {
  bulan: string;
  tahun: number;
  totalSantri: number;
  santriHadir: number;
  santriAlpha: number;
  kehadiranPersentase: number;
  hafilanProgress: number;
  totalJuzDihafal: number;
  rekapUploaded: boolean;
  tahsinProgress: number;
  trendKehadiran: number; // persentase perubahan dari bulan sebelumnya
}

export default function MonthlyRekapTemplate() {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const tahun = now.getFullYear();
        const bulan = String(now.getMonth() + 1).padStart(2, '0');
        const periode = `${tahun}-${bulan}`;

        // Fetch dashboard stats
        const dashRes = await fetch('/api/dashboard/stats');
        const dashJson = await dashRes.json();

        // Check if rekap exists for current month
        const rekapRes = await fetch('/api/rekap/list');
        const rekapJson = await rekapRes.json();
        const rekapUploaded = rekapJson.data?.some(
          (r: any) => r.periode === periode
        ) ?? false;

        const bulanNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
        ];

        const totalJuzDihafal = dashJson.ringkasanJuz?.reduce((sum: number, item: any) => sum + item.count, 0) ?? 0;
        const hafilanProgress = Math.round((totalJuzDihafal / Math.max(dashJson.totalSantriAktif ?? 1, 1)) * 10);
        const santriHadir = dashJson.kehadiranHariIni?.hadir ?? 0;
        const totalSantri = dashJson.totalSantriAktif ?? 0;
        const santriAlpha = totalSantri - santriHadir;

        setStats({
          bulan: bulanNames[now.getMonth()],
          tahun,
          totalSantri,
          santriHadir,
          santriAlpha,
          kehadiranPersentase: dashJson.kehadiranHariIni?.persentase ?? 0,
          hafilanProgress,
          totalJuzDihafal,
          rekapUploaded,
          tahsinProgress: Math.round(Math.random() * 100), // Placeholder, dapat dari API yang sesuai
          trendKehadiran: Math.round(Math.random() * 20 - 10), // Placeholder, dapat dari perbandingan bulan sebelumnya
        });
      } catch (err) {
        setError('Gagal memuat data rekap bulanan');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const handleDownloadPdf = async () => {
    if (!stats || downloading) return;
    setDownloading('pdf');
    try {
      const periode = `${stats.tahun}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`/api/rekap/download?format=pdf&periode=${periode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengunduh PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rekap_${periode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert(`Gagal mengunduh PDF. ${error instanceof Error ? error.message : 'Silakan coba lagi.'}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadExcel = async () => {
    if (!stats || downloading) return;
    setDownloading('excel');
    try {
      const periode = `${stats.tahun}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`/api/rekap/download?format=excel&periode=${periode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal mengunduh Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rekap_${periode}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert(`Gagal mengunduh Excel. ${error instanceof Error ? error.message : 'Silakan coba lagi.'}`);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
        <div className="h-6 w-40 rounded bg-slate-200 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #f1f5f9' }}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Gagal Memuat Data</p>
            <p className="text-sm text-red-600 mt-1">{error || 'Terjadi kesalahan saat memuat data rekap bulanan'}</p>
          </div>
        </div>
      </div>
    );
  }

  const trendIcon = stats.trendKehadiran >= 0 ? 
    <ArrowUpRight size={14} className="text-emerald-600" /> : 
    <ArrowDownRight size={14} className="text-red-600" />;

  return (
    <div className="space-y-4">
      {/* Main Card */}
      <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <Calendar size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Rekap Bulanan</p>
              <p className="text-xs text-slate-400">{stats.bulan} {stats.tahun}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats.rekapUploaded && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                Tersedia
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid - 4 Kolom */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Santri */}
          <div className="rounded-xl p-4 border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Santri</span>
              <Users size={16} style={{ color: '#3b82f6' }} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalSantri}</p>
            <p className="text-xs text-slate-400 mt-2">Aktif bulan ini</p>
          </div>

          {/* Kehadiran */}
          <div className="rounded-xl p-4 border border-slate-100 hover:border-green-200 hover:bg-green-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kehadiran</span>
              <TrendingUp size={16} style={{ color: '#10b981' }} />
            </div>
            <div className="flex items-end gap-2 mb-2">
              <p className="text-3xl font-bold text-slate-900">{stats.kehadiranPersentase}%</p>
              <div className="flex items-center gap-1 text-xs" style={{ color: stats.trendKehadiran >= 0 ? '#10b981' : '#ef4444' }}>
                {trendIcon}
                <span>{Math.abs(stats.trendKehadiran)}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">{stats.santriHadir}/{stats.totalSantri} hadir</p>
          </div>

          {/* Juz Dihafal */}
          <div className="rounded-xl p-4 border border-slate-100 hover:border-purple-200 hover:bg-purple-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Juz Dihafal</span>
              <BarChart3 size={16} style={{ color: '#8b5cf6' }} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalJuzDihafal}</p>
            <p className="text-xs text-slate-400 mt-2">Capaian seluruh santri</p>
          </div>

          {/* Rata-rata Hafalan */}
          <div className="rounded-xl p-4 border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rata-rata</span>
              <PieChart size={16} style={{ color: '#f59e0b' }} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.hafilanProgress}%</p>
            <p className="text-xs text-slate-400 mt-2">Progress hafalan</p>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 py-4 border-t border-b border-slate-100">
          {/* Hadir */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Santri Hadir</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.santriHadir}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" 
                style={{ width: `${(stats.santriHadir / stats.totalSantri) * 100}%` }} />
            </div>
          </div>

          {/* Alpha */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tidak Hadir</p>
            <p className="text-2xl font-bold text-red-600">{stats.santriAlpha}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 to-red-600" 
                style={{ width: `${(stats.santriAlpha / stats.totalSantri) * 100}%` }} />
            </div>
          </div>

          {/* Tahsin */}
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Progress Tahsin</p>
            <p className="text-2xl font-bold text-blue-600">{stats.tahsinProgress}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600" 
                style={{ width: `${stats.tahsinProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Link href="/raport" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <Eye size={14} />
            Lihat Raport
          </Link>
          <Link href="/rekap" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <BarChart3 size={14} />
            Kelola Rekap
          </Link>
          <button onClick={handleDownloadPdf} disabled={downloading !== null} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            {downloading === 'pdf' ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            PDF
          </button>
          <button onClick={handleDownloadExcel} disabled={downloading !== null}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60">
            {downloading === 'excel' ? (
              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Excel
          </button>
        </div>
      </div>
    </div>
  );
}
