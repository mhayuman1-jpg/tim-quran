'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/toast';

interface TeacherStat {
  id: string;
  name: string;
  email: string;
  role: string;
  studentCount: number;
  classNames: string[];
}

export default function PengajarPdfPage() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [stats, setStats] = useState<TeacherStat[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/pengajar-pdf/stats', { credentials: 'same-origin' });
        const json = await res.json();
        if (res.ok) {
          setStats(json.data ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTeacherId) {
        params.set('teacher_id', selectedTeacherId);
      }
      const url = `/api/admin/pengajar-pdf${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Gagal mengunduh PDF');
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const date = new Date().toISOString().slice(0, 10);
      const teacherName = selectedTeacherId
        ? stats.find((t) => t.id === selectedTeacherId)?.name?.replace(/\s+/g, '_') || 'pengajar'
        : 'semua-pengajar';
      a.download = `data-pengajar-siswa-${teacherName}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success('PDF data pengajar & siswa berhasil diunduh.');
    } catch (err) {
      console.error('Gagal download PDF:', err);
      toast.error('Gagal mengunduh PDF. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Pengajar & Siswa</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pilih pengajar untuk mengunduh data siswa yang diajarkan beserta barcode.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            disabled={downloading || loadingStats}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="">Semua Pengajar</option>
            {stats.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}{teacher.classNames?.length ? ` (${teacher.classNames.join(', ')})` : ''} ({teacher.studentCount} siswa)
              </option>
            ))}
          </select>
          <Button
            variant="primary"
            leftIcon={downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            onClick={handleDownload}
            loading={downloading}
            disabled={loadingStats}
          >
            Download PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Ringkasan Pengajar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nama Pengajar
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Nama Kelas
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Jumlah Siswa
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingStats ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-32"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-20"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-40"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-36"></div></td>
                    <td className="px-4 py-3"><div className="h-5 bg-slate-200 rounded animate-pulse w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : stats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada data pengajar.
                  </td>
                </tr>
              ) : (
                stats.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">{teacher.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                        {teacher.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{teacher.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {teacher.classNames && teacher.classNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.classNames.map((cls, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {cls}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {teacher.studentCount} siswa
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
