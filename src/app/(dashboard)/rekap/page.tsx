'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/rekap/page.tsx
// Halaman Rekap Periode Semester
// - Grafik perkembangan siswa (hafalan, tahsin, kehadiran)
// - Tabel rekap per siswa
// - Fitur pembanding semester

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Calendar, Users, BookOpen, CheckCircle, TrendingUp, ArrowLeftRight, Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toImageUrl } from '@/lib/storage/urls';

import Button from '@/components/ui/Button';

// ─── Types ──────────────────────────────────────────────────────────────────

interface StudentRecap {
  student_id: string;
  nama: string;
  nisn: string;
  class_name: string;
  gender: string;
  juz_terakhir: number;
  total_hafalan: number;
  total_tahsin: number;
  total_hadir: number;
  total_tidak_hadir: number;
  total_hari_aktif: number;
  persentase_kehadiran: number;
  rata_rata_makhroj: number;
  rata_rata_tajwid: number;
  rata_rata_lancar: number;
}

interface SemesterRecap {
  semester_name: string;
  date_range: { start: string; end: string };
  total_students: number;
  total_hafalan: number;
  total_tahsin: number;
  average_attendance: number;
  students: StudentRecap[];
  monthly_progress: { month: string; hafalan: number; tahsin: number; kehadiran: number }[];
  comparison?: {
    semester_name: string;
    total_hafalan: number;
    total_tahsin: number;
    average_attendance: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${s.toLocaleDateString('id-ID', options)} - ${e.toLocaleDateString('id-ID', options)}`;
  } catch {
    return `${start} - ${end}`;
  }
}

function getSemesterNumber(semesterName: string): string {
  const lower = semesterName.toLowerCase();
  if (lower.includes('ganjil')) return '1';
  if (lower.includes('genap')) return '2';
  return '';
}

function getRecapTitle(semesterName: string): string {
  const num = getSemesterNumber(semesterName);
  if (num) return `Rekap Tahfidz dan Tahsin Semester ${num}`;
  return `Rekap Tahfidz dan Tahsin ${semesterName}`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RekapPage() {
  const [data, setData] = useState<SemesterRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState('Ganjil 2025/2026');
  const [compareSemester, setCompareSemester] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  // Refs for chart containers (for PDF export)
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const attendanceChartRef = useRef<HTMLDivElement>(null);
  const comparisonChartRef = useRef<HTMLDivElement>(null);

  const semesterOptions = [
    { value: 'Ganjil 2024/2025', label: 'Ganjil 2024/2025' },
    { value: 'Genap 2024/2025', label: 'Genap 2024/2025' },
    { value: 'Ganjil 2025/2026', label: 'Ganjil 2025/2026' },
    { value: 'Genap 2025/2026', label: 'Genap 2025/2026' },
    { value: 'Ganjil 2026/2027', label: 'Ganjil 2026/2027' },
  ];

  const fetchRecap = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ semester_name: selectedSemester });
      if (showComparison && compareSemester) {
        params.set('compare_with', compareSemester);
      }
      const res = await fetch(`/api/rekap/semester?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        console.error(json.message);
        setData(null);
      } else {
        setData(json.data);
      }
    } catch {
      console.error('Gagal memuat rekap semester');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedSemester, compareSemester, showComparison]);

  useEffect(() => {
    fetchRecap();
  }, [fetchRecap]);

  // Chart data for monthly progress
  const chartData = data?.monthly_progress || [];

  // Pie chart data for attendance distribution
  const attendancePieData = data ? [
    { name: 'Hadir', value: data.students.reduce((sum, s) => sum + s.total_hadir, 0) },
    { name: 'Tidak Hadir', value: data.students.reduce((sum, s) => sum + s.total_tidak_hadir, 0) },
  ] : [];

  // Comparison data
  const comparisonData = data?.comparison ? [
    { name: 'Hafalan', current: data.total_hafalan, compare: data.comparison.total_hafalan },
    { name: 'Tahsin', current: data.total_tahsin, compare: data.comparison.total_tahsin },
    { name: 'Kehadiran (%)', current: data.average_attendance, compare: data.comparison.average_attendance },
  ] : [];

  // ── PDF Export
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      // Fetch logo URLs and school name
      let logoSekolah: string | null = null;
      let logoLembaga: string | null = null;
      let namaSekolah: string = '';
      let namaLembaga: string = '';
      try {
        const profilRes = await fetch('/api/website/profil');
        const profilJson = await profilRes.json();
        if (profilJson?.data) {
          if (profilJson.data.logo_sekolah_url) {
            logoSekolah = toImageUrl(profilJson.data.logo_sekolah_url);
          }
          if (profilJson.data.logo_url) {
            logoLembaga = toImageUrl(profilJson.data.logo_url);
          }
          namaSekolah = profilJson.data.nama_sekolah || '';
          namaLembaga = profilJson.data.nama_lembaga || '';
        }
      } catch {
        // logos optional
      }

      // Convert URL to base64 data URL for jsPDF
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
        } catch {
          return null;
        }
      };

      const logoSekolahBase64 = logoSekolah ? await urlToBase64(logoSekolah) : null;
      const logoLembagaBase64 = logoLembaga ? await urlToBase64(logoLembaga) : null;

      // Capture charts as images
      let monthlyChartImg: string | null = null;
      let attendanceChartImg: string | null = null;
      let comparisonChartImg: string | null = null;

      if (monthlyChartRef.current) {
        try {
          monthlyChartImg = await toPng(monthlyChartRef.current, { backgroundColor: '#ffffff' });
        } catch (e) {
          console.error('Gagal capture chart perkembangan:', e);
        }
      }
      if (attendanceChartRef.current) {
        try {
          attendanceChartImg = await toPng(attendanceChartRef.current, { backgroundColor: '#ffffff' });
        } catch (e) {
          console.error('Gagal capture chart kehadiran:', e);
        }
      }
      if (showComparison && comparisonChartRef.current) {
        try {
          comparisonChartImg = await toPng(comparisonChartRef.current, { backgroundColor: '#ffffff' });
        } catch (e) {
          console.error('Gagal capture chart perbandingan:', e);
        }
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let y = 15;

      // ── Header
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(0, 0, pageW, 2, 'F');

      // Draw logos on left and right
      const logoSize = 24;
      const logoY = y - 2;

      if (logoSekolahBase64) {
        try {
          doc.addImage(logoSekolahBase64, 'PNG', 14, logoY, logoSize, logoSize);
        } catch {
          // skip logo on error
        }
      }

      if (logoLembagaBase64) {
        try {
          doc.addImage(logoLembagaBase64, 'PNG', pageW - 14 - logoSize, logoY, logoSize, logoSize);
        } catch {
          // skip logo on error
        }
      }

      // Center text
      const centerX = pageW / 2;

      // School name as main title (large)
      doc.setFontSize(20);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text(namaSekolah || 'SDIT Al Hilmi Dompu', centerX, y + 6, { align: 'center' });

      // Report title (subtitle)
      doc.setFontSize(12);
      doc.setTextColor(99, 102, 241);
      doc.setFont('helvetica', 'bold');
      doc.text(getRecapTitle(data.semester_name), centerX, y + 13, { align: 'center' });

      // Semester and period
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(`Semester: ${data.semester_name}`, centerX, y + 19, { align: 'center' });
      doc.text(`Periode: ${formatDateRange(data.date_range.start, data.date_range.end)}`, centerX, y + 25, { align: 'center' });
      y += 32;

      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageW - 14, y);
      y += 8;

      // ── Ringkasan
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan', 14, y);
      y += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);

      const ringkasanData = [
        ['Total Siswa', String(data.total_students)],
        ['Total Hafalan', String(data.total_hafalan)],
        ['Total Tahsin', String(data.total_tahsin)],
        ['Rata-rata Kehadiran', `${data.average_attendance}%`],
      ];

      for (const [label, value] of ringkasanData) {
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'bold');
        doc.text(value, 70, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
      }

      y += 4;

      // ── Charts Section
      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Grafik Perkembangan', 14, y);
      y += 6;

      const chartWidth = 120;
      const chartHeight = 70;

      // Monthly Progress Chart
      if (monthlyChartImg) {
        if (y + chartHeight > pageH - 20) {
          doc.addPage();
          y = 15;
        }
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        doc.text('Perkembangan Bulanan', 14, y);
        y += 4;
        doc.addImage(monthlyChartImg, 'PNG', 14, y, chartWidth, chartHeight);
        y += chartHeight + 6;
      }

      // Attendance Distribution Chart
      if (attendanceChartImg) {
        if (y + chartHeight > pageH - 20) {
          doc.addPage();
          y = 15;
        }
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        doc.text('Distribusi Kehadiran', 14, y);
        y += 4;
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'italic');
        doc.text('Grafik ini menunjukkan proporsi kehadiran siswa selama semester, meliputi: Hadir dan Tidak Hadir.', 14, y);
        y += 5;
        doc.addImage(attendanceChartImg, 'PNG', 14, y, chartWidth, chartHeight);
        y += chartHeight + 6;
      }

      // Comparison Chart
      if (comparisonChartImg && data.comparison) {
        if (y + chartHeight > pageH - 20) {
          doc.addPage();
          y = 15;
        }
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.setFont('helvetica', 'normal');
        doc.text(`Perbandingan: ${data.semester_name} vs ${data.comparison.semester_name}`, 14, y);
        y += 4;
        doc.addImage(comparisonChartImg, 'PNG', 14, y, chartWidth, chartHeight);
        y += chartHeight + 6;
      }

      // ── Tabel Siswa (on new page)
      doc.addPage();
      y = 15;

      doc.setFontSize(11);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Detail Per Siswa', 14, y);
      y += 4;

      const tableHeaders = [['No', 'Nama Siswa', 'Kelas', 'Juz', 'Hafalan', 'Tahsin', 'Hadir', 'Tidak Hadir', 'Kehadiran', 'Makhroj', 'Tajwid', 'Lancar']];

      const tableBody = data.students.map((student, index) => [
        String(index + 1),
        student.nama,
        student.class_name,
        String(student.juz_terakhir),
        String(student.total_hafalan),
        String(student.total_tahsin),
        String(student.total_hadir),
        String(student.total_tidak_hadir),
        `${student.persentase_kehadiran}%`,
        String(student.rata_rata_makhroj || '-'),
        String(student.rata_rata_tajwid || '-'),
        String(student.rata_rata_lancar || '-'),
      ]);

      autoTable(doc, {
        startY: y,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { cellWidth: 45 },
          2: { cellWidth: 30 },
          3: { halign: 'center', cellWidth: 12 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 16 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'center', cellWidth: 22 },
          9: { halign: 'center', cellWidth: 20 },
          10: { halign: 'center', cellWidth: 20 },
          11: { halign: 'center', cellWidth: 20 },
        },
        styles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didDrawPage: (hookData) => {
          const footerY = pageH - 10;
          doc.setFontSize(8);
          doc.setTextColor(156, 163, 175);
          doc.setFont('helvetica', 'normal');
          doc.text(`Rekap Periode Semester - ${data.semester_name}`, 14, footerY);
          doc.text(`Halaman ${hookData.pageNumber}`, pageW - 30, footerY);
        },
      });

      const fileName = `Rekap_Semester_${data.semester_name.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Gagal export PDF:', err);
      alert('Gagal mengexport PDF. Silakan coba lagi.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{getRecapTitle(selectedSemester)}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pantau perkembangan siswa berdasarkan data hafalan, tahsin, dan kehadiran
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {semesterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant={showComparison ? 'primary' : 'secondary'}
              leftIcon={<ArrowLeftRight size={16} />}
              onClick={() => setShowComparison(!showComparison)}
            >
              {showComparison ? 'Sembunyikan Pembanding' : 'Bandingkan Semester'}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Download size={16} />}
              onClick={handleExportPDF}
              loading={exportingPdf}
              disabled={!data || exportingPdf}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {showComparison && (
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <span className="text-sm text-slate-600">Bandingkan dengan:</span>
            <select
              value={compareSemester}
              onChange={(e) => setCompareSemester(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Pilih Semester --</option>
              {semesterOptions.filter(o => o.value !== selectedSemester).map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-100">
                  <Users size={20} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Siswa</p>
                  <p className="text-2xl font-bold text-slate-900">{data.total_students}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100">
                  <BookOpen size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Hafalan</p>
                  <p className="text-2xl font-bold text-slate-900">{data.total_hafalan}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100">
                  <TrendingUp size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Tahsin</p>
                  <p className="text-2xl font-bold text-slate-900">{data.total_tahsin}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100">
                  <CheckCircle size={20} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Rata-rata Kehadiran</p>
                  <p className="text-2xl font-bold text-slate-900">{data.average_attendance}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Progress Chart */}
            <div ref={monthlyChartRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Perkembangan Bulanan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hafalan" stroke="#6366f1" strokeWidth={2} name="Hafalan" />
                  <Line type="monotone" dataKey="tahsin" stroke="#22c55e" strokeWidth={2} name="Tahsin" />
                  <Line type="monotone" dataKey="kehadiran" stroke="#f59e0b" strokeWidth={2} name="Kehadiran (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Attendance Distribution */}
            <div ref={attendanceChartRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Distribusi Kehadiran</h3>
              <p className="text-sm text-slate-500 mb-4">
                Grafik ini menunjukkan proporsi kehadiran siswa selama semester, meliputi: Hadir dan Tidak Hadir.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {attendancePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Chart */}
          {showComparison && data.comparison && (
            <div ref={comparisonChartRef} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                Perbandingan: {data.semester_name} vs {data.comparison.semester_name}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill="#6366f1" name={data.semester_name} />
                  <Bar dataKey="compare" fill="#22c55e" name={data.comparison.semester_name} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Student Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Detail Per Siswa</h3>
              <p className="text-sm text-slate-500 mt-1">Data hafalan, tahsin, dan kehadiran per siswa</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Nama Siswa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Kelas</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Juz</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Hafalan</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Tahsin</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Kehadiran</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Makhroj</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Tajwid</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Lancar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((student) => (
                    <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{student.nama}</p>
                          <p className="text-xs text-slate-500">{student.nisn}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.class_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {student.juz_terakhir}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-800">{student.total_hafalan}</td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-slate-800">{student.total_tahsin}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.persentase_kehadiran >= 80 ? 'bg-amber-100 text-amber-800' :
                          student.persentase_kehadiran >= 60 ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {student.persentase_kehadiran}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{student.rata_rata_makhroj || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{student.rata_rata_tajwid || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600">{student.rata_rata_lancar || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.students.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Tidak ada data siswa untuk periode ini
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Gagal memuat data rekap semester
        </div>
      )}
    </div>
  );
}
