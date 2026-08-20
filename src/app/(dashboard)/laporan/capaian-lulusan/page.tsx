'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/laporan/capaian-lulusan/page.tsx
// Halaman Grafik Capaian Lulusan untuk Kabid
// Standar per kelas & semester

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Award, Users, TrendingUp, AlertCircle, ChevronDown, ChevronRight, GraduationCap, Download, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';

interface StudentAchievement {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  achieved: boolean;
}

interface ClassStat {
  class_name: string;
  class_number: number;
  semester: string;
  semester_standar_label: string;
  total_students: number;
  achieved: number;
  not_achieved: number;
  percentage: number;
  students: StudentAchievement[];
}

interface Summary {
  total_students: number;
  total_achieved: number;
  total_not_achieved: number;
  total_percentage: number;
}

interface Standards {
  [kelas: number]: { smt1: string; smt2: string };
}

interface ApiResponse {
  classes: ClassStat[];
  summary: Summary;
  standards: Standards;
  current_semester: string;
}

const CHART_COLORS = {
  achieved: '#22c55e',
  notAchieved: '#ef4444',
};

export default function CapaianLulusanPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/laporan/capaian-lulusan')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Gagal memuat data'))))
      .then((json) => setData(json.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (className: string) => {
    setExpandedClass((prev) => (prev === className ? null : className));
  };

  const chartData = data?.classes
    .filter((c) => c.class_number >= 1 && c.class_number <= 6)
    .map((c) => ({
      name: c.class_name,
      achieved: c.achieved,
      not_achieved: c.not_achieved,
      percentage: c.percentage,
    })) ?? [];

  const handleDownloadPdf = useCallback(async () => {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { toPng } = await import('html-to-image');

      let logoSekolah: string | null = null;
      let logoLembaga: string | null = null;
      let namaSekolah = '';
      try {
        const profilRes = await fetch('/api/website/profil');
        const profilJson = await profilRes.json();
        if (profilJson?.data) {
          if (profilJson.data.logo_sekolah_url) {
            const { toImageUrl } = await import('@/lib/storage/urls');
            logoSekolah = toImageUrl(profilJson.data.logo_sekolah_url);
          }
          if (profilJson.data.logo_url) {
            const { toImageUrl } = await import('@/lib/storage/urls');
            logoLembaga = toImageUrl(profilJson.data.logo_url);
          }
          namaSekolah = profilJson.data.nama_sekolah || '';
        }
      } catch { /* logos optional */ }

      const urlToBase64 = async (url: string): Promise<string | null> => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch { return null; }
      };

      const [logoSekolahB64, logoLembagaB64] = await Promise.all([
        logoSekolah ? urlToBase64(logoSekolah) : Promise.resolve(null),
        logoLembaga ? urlToBase64(logoLembaga) : Promise.resolve(null),
      ]);

      // Capture chart
      let chartImg: string | null = null;
      if (chartRef.current) {
        try {
          chartImg = await toPng(chartRef.current, { backgroundColor: '#ffffff', pixelRatio: 2 });
        } catch { /* chart optional */ }
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let y = 15;

      // ── Colored top bar
      doc.setFillColor(245, 158, 11); // amber-500
      doc.rect(0, 0, pageW, 3, 'F');

      // ── Logos
      if (logoLembagaB64) {
        try { doc.addImage(logoLembagaB64, 'PNG', 15, 8, 14, 14); } catch {}
      }
      if (logoSekolahB64) {
        try { doc.addImage(logoSekolahB64, 'PNG', pageW - 29, 8, 14, 14); } catch {}
      }

      // ── Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('LAPORAN CAPAIAN LULUSAN', pageW / 2, y + 4, { align: 'center' });
      y += 10;
      if (namaSekolah) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(namaSekolah, pageW / 2, y, { align: 'center' });
        y += 5;
      }
      doc.setFontSize(9);
      doc.text(`Semester Aktif: ${data.current_semester}  |  Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW / 2, y, { align: 'center' });
      y += 10;

      // ── Summary table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text('Ringkasan', 15, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Metrik', 'Jumlah', 'Persentase']],
        body: [
          ['Total Siswa', String(data.summary.total_students), '-'],
          ['Capai Standar', String(data.summary.total_achieved), `${data.summary.total_percentage}%`],
          ['Belum Capai Standar', String(data.summary.total_not_achieved), `${(100 - data.summary.total_percentage).toFixed(1)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Standards table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Standar Capaian per Kelas & Semester', 15, y);
      y += 5;
      autoTable(doc, {
        startY: y,
        head: [['Kelas', 'Semester 1 (Ganjil)', 'Semester 2 (Genap)']],
        body: [1, 2, 3, 4, 5, 6].map((k) => [
          `Kelas ${k}`,
          data.standards[k]?.smt1 ?? '-',
          data.standards[k]?.smt2 ?? '-',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 15, right: 15 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── Chart image
      if (chartImg) {
        if (y + 80 > pageH - 15) { doc.addPage(); y = 15; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`Grafik Capaian per Kelas (Semester ${data.current_semester})`, 15, y);
        y += 5;
        const chartW = pageW - 30;
        const chartH = 70;
        doc.addImage(chartImg, 'PNG', 15, y, chartW, chartH);
        y += chartH + 10;
      }

      // ── Detail per class
      const classesToShow = data.classes.filter((c) => c.class_number >= 1 && c.class_number <= 6);
      for (const cls of classesToShow) {
        const neededHeight = 30 + cls.students.length * 5;
        if (y + Math.min(neededHeight, 80) > pageH - 15) { doc.addPage(); y = 15; }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${cls.class_name} — Target: ${cls.semester_standar_label}`, 15, y);
        y += 5;

        autoTable(doc, {
          startY: y,
          head: [['No', 'Nama Siswa', 'Juz Terakhir', 'Status']],
          body: cls.students
            .sort((a, b) => {
              if (a.achieved === b.achieved) return a.nama.localeCompare(b.nama);
              return a.achieved ? 1 : -1;
            })
            .map((s, i) => [
              String(i + 1),
              s.nama,
              s.juz_terakhir ? `Juz ${s.juz_terakhir}` : 'Belum ada',
              s.achieved ? 'Capai' : 'Belum Capai',
            ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 3: { fontStyle: 'bold' } },
          margin: { left: 15, right: 15 },
          didParseCell(dataCell) {
            if (dataCell.column.index === 3 && dataCell.section === 'body') {
              const val = dataCell.cell.raw as string;
              if (val === 'Capai') dataCell.cell.styles.textColor = [22, 163, 74];
              else dataCell.cell.styles.textColor = [220, 38, 38];
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // ── Footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Halaman ${i} dari ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
        doc.text('Tim Qur\'an — Sistem Manajemen Tahfidz', 15, pageH - 5);
      }

      const filename = `Capaian_Lulusan_${data.current_semester.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Gagal generate PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Award size={24} className="text-amber-600" />
            Capaian Lulusan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Standar capaian hafalan siswa per kelas & semester.
          </p>
        </div>
        {data && !loading && (
          <Button
            variant="primary"
            leftIcon={downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Membuat PDF...' : 'Download PDF'}
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Memuat data capaian...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Siswa</p>
                  <p className="text-2xl font-bold text-slate-800">{data.summary.total_students}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Capai Standar</p>
                  <p className="text-2xl font-bold text-emerald-600">{data.summary.total_achieved}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle size={18} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Belum Capai Standar</p>
                  <p className="text-2xl font-bold text-red-600">{data.summary.total_not_achieved}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Standar per kelas & semester */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={18} className="text-amber-600" />
              <h2 className="text-base font-semibold text-slate-800">
                Standar Capaian per Kelas & Semester
              </h2>
              <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                Semester Aktif: {data.current_semester}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Kelas</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Semester 1 (Ganjil)</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Semester 2 (Genap)</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6].map((kelas) => (
                    <tr key={kelas} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 px-3 font-medium text-slate-800">Kelas {kelas}</td>
                      <td className="py-2.5 px-3 text-slate-600">{data.standards[kelas]?.smt1 ?? '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{data.standards[kelas]?.smt2 ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                Grafik Capaian per Kelas (Semester {data.current_semester})
              </h2>
              <div ref={chartRef}>
                <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    }}
                    formatter={(value, name) => [
                      String(value),
                      name === 'achieved' ? 'Capai Standar' : 'Belum Capai',
                    ]}
                  />
                  <Legend
                    formatter={(value) => (value === 'achieved' ? 'Capai Standar' : 'Belum Capai')}
                  />
                  <Bar dataKey="achieved" fill={CHART_COLORS.achieved} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="not_achieved" fill={CHART_COLORS.notAchieved} radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detail per kelas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">
              Detail per Kelas
            </h2>
            <div className="space-y-3">
              {data.classes
                .filter((c) => c.class_number >= 1 && c.class_number <= 6)
                .map((cls) => (
                  <div key={cls.class_name} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleExpand(cls.class_name)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        {expandedClass === cls.class_name ? (
                          <ChevronDown size={16} className="text-slate-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-400" />
                        )}
                        <span className="font-medium text-slate-800">{cls.class_name}</span>
                        <span className="text-sm text-slate-500">{cls.total_students} siswa</span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Target: {cls.semester_standar_label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${cls.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-700 w-12 text-right">
                          {cls.percentage}%
                        </span>
                        <span className="text-sm text-emerald-600">{cls.achieved} ✓</span>
                        <span className="text-sm text-red-500">{cls.not_achieved} ✗</span>
                      </div>
                    </button>

                    {expandedClass === cls.class_name && (
                      <div className="border-t border-slate-200 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {/* Ringkasan */}
                        <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-4 text-xs font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            {cls.achieved} capai target
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            {cls.not_achieved} belum capai target
                          </span>
                        </div>
                        {/* Sort: belum capai di atas, sudah capai di bawah */}
                        {[...cls.students]
                          .sort((a, b) => {
                            if (a.achieved === b.achieved) return a.nama.localeCompare(b.nama);
                            return a.achieved ? 1 : -1;
                          })
                          .map((s) => (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                                s.achieved ? 'bg-white' : 'bg-red-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={s.achieved ? 'text-emerald-500' : 'text-red-500'}>
                                  {s.achieved ? '✓' : '✗'}
                                </span>
                                <span className={s.achieved ? 'text-slate-700' : 'text-slate-800 font-medium'}>
                                  {s.nama}
                                </span>
                              </div>
                              <span className="text-slate-500">
                                {s.juz_terakhir ? `Juz ${s.juz_terakhir}` : 'Belum ada'}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
