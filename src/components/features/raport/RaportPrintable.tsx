'use client';

// src/components/features/raport/RaportPrintable.tsx
// Komponen printable raport Qur'an:
// - Identitas siswa (nama, NISN, kelas)
// - Periode penilaian
// - Semua aspek penilaian (Makhroj, Tajwid, Lancar)
// - Buku/Surah, Halaman, Catatan
// - Color coding: ≥80 hijau, ≥60 kuning, <60 merah
// - Gunakan react-to-print untuk cetak PDF

import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer, Download } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RaportData {
  id: string;
  periode: string;
  makhroj?: number | null;
  tajwid?: number | null;
  lancar?: number | null;
  buku_surah?: string | null;
  halaman?: number | null;
  catatan?: string | null;
  santri?: {
    nama: string;
    nisn: string;
    classes?: { name: string } | null;
  } | null;
  users?: {
    name: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

interface RaportPrintableProps {
  raport: RaportData;
  /** Class tambahan untuk wrapper */
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColorClass(score?: number | null): string {
  if (score === undefined || score === null) return 'text-slate-400';
  if (score >= 80) return 'text-amber-700';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBgClass(score?: number | null): string {
  if (score === undefined || score === null) return 'bg-slate-100';
  if (score >= 80) return 'bg-amber-50 border-amber-200';
  if (score >= 60) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}

function scoreLabel(score?: number | null): string {
  if (score === undefined || score === null) return '—';
  if (score >= 80) return 'Baik';
  if (score >= 60) return 'Cukup';
  return 'Perlu Perbaikan';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Print Content Component (diperlukan agar react-to-print bisa akses ref) ─

const PrintContent = React.forwardRef<HTMLDivElement, { raport: RaportData }>(
  ({ raport }, ref) => {
    const siswa = raport.santri;
    const guru = raport.users;
    const rataRata =
      [raport.makhroj, raport.tajwid, raport.lancar].filter(
        (v): v is number => v !== undefined && v !== null
      ).length > 0
        ? Math.round(
            [raport.makhroj, raport.tajwid, raport.lancar]
              .filter((v): v is number => v !== undefined && v !== null)
              .reduce((a, b) => a + b, 0) /
              [raport.makhroj, raport.tajwid, raport.lancar].filter(
                (v): v is number => v !== undefined && v !== null
              ).length
          )
        : null;

    const nilaiList = [
      { label: 'Makhroj', value: raport.makhroj },
      { label: 'Tajwid', value: raport.tajwid },
      { label: 'Kelancaran', value: raport.lancar },
    ];

    return (
      <div
        ref={ref}
        className="bg-white font-sans text-slate-800"
        style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: '3px solid #059669',
            paddingBottom: '16px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Icon/Logo placeholder */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
              }}
            >
              📖
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#065f46' }}>
                Raport Qur&apos;an
              </h1>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                Program Tahfidz &amp; Tahsin Al-Qur&apos;an
              </p>
            </div>
          </div>
        </div>

        {/* ── Identitas Siswa ─────────────────────────────────────────────── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '13px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 0', color: '#6b7280', width: '140px' }}>Nama Lengkap</td>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>: {siswa?.nama ?? '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#6b7280' }}>NISN</td>
              <td style={{ padding: '4px 0' }}>: {siswa?.nisn ?? '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#6b7280' }}>Kelas</td>
              <td style={{ padding: '4px 0' }}>: {siswa?.classes?.name ?? '—'}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0', color: '#6b7280' }}>Periode</td>
              <td style={{ padding: '4px 0', fontWeight: 600 }}>: {raport.periode}</td>
            </tr>
            {raport.buku_surah && (
              <tr>
                <td style={{ padding: '4px 0', color: '#6b7280' }}>Buku / Surah</td>
                <td style={{ padding: '4px 0' }}>: {raport.buku_surah}</td>
              </tr>
            )}
            {raport.halaman && (
              <tr>
                <td style={{ padding: '4px 0', color: '#6b7280' }}>Halaman</td>
                <td style={{ padding: '4px 0' }}>: {raport.halaman}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Tabel Penilaian ─────────────────────────────────────────────── */}
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: '#065f46',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Penilaian
        </h2>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '20px',
            fontSize: '13px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f0fdf4' }}>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'left',
                  border: '1px solid #d1fae5',
                  color: '#065f46',
                  fontWeight: 600,
                }}
              >
                Aspek Penilaian
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  border: '1px solid #d1fae5',
                  color: '#065f46',
                  fontWeight: 600,
                }}
              >
                Nilai
              </th>
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  border: '1px solid #d1fae5',
                  color: '#065f46',
                  fontWeight: 600,
                }}
              >
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody>
            {nilaiList.map(({ label, value }) => {
              const isGood = value !== null && value !== undefined && value >= 80;
              const isMid = value !== null && value !== undefined && value >= 60 && value < 80;
              const isBad = value !== null && value !== undefined && value < 60;
              const rowBg = isGood ? '#f0fdf4' : isMid ? '#fefce8' : isBad ? '#fef2f2' : '#f8fafc';
              const valColor = isGood ? '#065f46' : isMid ? '#854d0e' : isBad ? '#991b1b' : '#94a3b8';

              return (
                <tr key={label} style={{ backgroundColor: rowBg }}>
                  <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{label}</td>
                  <td
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '16px',
                      color: valColor,
                    }}
                  >
                    {value !== null && value !== undefined ? value : '—'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      textAlign: 'center',
                      color: valColor,
                      fontWeight: 500,
                    }}
                  >
                    {scoreLabel(value)}
                  </td>
                </tr>
              );
            })}

            {/* Rata-rata */}
            {rataRata !== null && (
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #d1d5db' }}>
                <td style={{ padding: '8px 12px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                  Rata-rata
                </td>
                <td
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                    color:
                      rataRata >= 80 ? '#065f46' : rataRata >= 60 ? '#854d0e' : '#991b1b',
                  }}
                >
                  {rataRata}
                </td>
                <td
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    textAlign: 'center',
                    fontWeight: 600,
                    color:
                      rataRata >= 80 ? '#065f46' : rataRata >= 60 ? '#854d0e' : '#991b1b',
                  }}
                >
                  {scoreLabel(rataRata)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ── Legenda warna ───────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
            fontSize: '11px',
            color: '#6b7280',
          }}
        >
          <span style={{ color: '#059669' }}>● ≥80 = Baik</span>
          <span style={{ color: '#d97706' }}>● 60–79 = Cukup</span>
          <span style={{ color: '#dc2626' }}>● &lt;60 = Perlu Perbaikan</span>
        </div>

        {/* ── Catatan ─────────────────────────────────────────────────────── */}
        {raport.catatan && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #d1fae5',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px',
            }}
          >
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#065f46', marginBottom: '4px' }}>
              Catatan Ustadz/ah:
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
              {raport.catatan}
            </p>
          </div>
        )}

        {/* ── Tanda Tangan ────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '32px',
            fontSize: '12px',
            color: '#374151',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 48px 0' }}>
              Diterbitkan pada {formatDate(raport.updated_at ?? raport.created_at)}
            </p>
            <div
              style={{
                borderTop: '1px solid #d1d5db',
                paddingTop: '6px',
                minWidth: '160px',
                fontWeight: 600,
              }}
            >
              {guru?.name ?? 'Ustadz/ah'}
            </div>
            <p style={{ margin: '2px 0 0 0', color: '#6b7280' }}>Guru Pembimbing</p>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid #e2e8f0',
            marginTop: '32px',
            paddingTop: '12px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#9ca3af',
          }}
        >
          Dokumen ini digenerate oleh Sistem Manajemen Tim Qur&apos;an
        </div>
      </div>
    );
  }
);
PrintContent.displayName = 'PrintContent';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RaportPrintable({ raport, className = '' }: RaportPrintableProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_${raport.santri?.nama ?? 'Siswa'}_${raport.periode}`,
  });

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const siswa = raport.santri;
      const guru = raport.users;

      const scores = [raport.makhroj, raport.tajwid, raport.lancar].filter(
        (v): v is number => v !== undefined && v !== null
      );
      const rataRata =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null;

      const pageW = doc.internal.pageSize.getWidth();
      let y = 16;

      // ── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(5, 150, 105); // amber-600
      doc.rect(0, 0, pageW, 2, 'F');

      doc.setFontSize(16);
      doc.setTextColor(6, 95, 70);
      doc.setFont('helvetica', 'bold');
      doc.text('Raport Qur\u2019an', 14, y + 6);

      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text('Program Tahfidz & Tahsin Al-Qur\u2019an', 14, y + 13);

      y += 22;
      doc.setDrawColor(5, 150, 105);
      doc.setLineWidth(0.5);
      doc.line(14, y, pageW - 14, y);
      y += 8;

      // ── Identitas Siswa ──────────────────────────────────────────────────
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      const identitas: [string, string][] = [
        ['Nama Lengkap', siswa?.nama ?? '—'],
        ['NISN', siswa?.nisn ?? '—'],
        ['Kelas', siswa?.classes?.name ?? '—'],
        ['Periode', raport.periode],
      ];
      if (raport.buku_surah) identitas.push(['Buku / Surah', raport.buku_surah]);
      if (raport.halaman) identitas.push(['Halaman', String(raport.halaman)]);

      for (const [label, value] of identitas) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(label, 14, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(`: ${value}`, 55, y);
        y += 7;
      }

      y += 4;

      // ── Tabel Penilaian ──────────────────────────────────────────────────
      const tableRows = [
        ['Makhroj', raport.makhroj ?? '—', scoreLabel(raport.makhroj)],
        ['Tajwid', raport.tajwid ?? '—', scoreLabel(raport.tajwid)],
        ['Kelancaran', raport.lancar ?? '—', scoreLabel(raport.lancar)],
        ...(rataRata !== null
          ? [['Rata-rata', rataRata, scoreLabel(rataRata)]]
          : []),
      ];

      autoTable(doc, {
        startY: y,
        head: [['Aspek Penilaian', 'Nilai', 'Keterangan']],
        body: tableRows as any[],
        theme: 'grid',
        headStyles: {
          fillColor: [240, 253, 244],
          textColor: [6, 95, 70],
          fontStyle: 'bold',
          halign: 'center',
          lineColor: [209, 250, 229],
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { cellWidth: 65 },
          1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
          2: { halign: 'center' },
        },
        styles: { fontSize: 10, cellPadding: 4 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const val = Number(data.cell.raw);
            if (!isNaN(val)) {
              if (val >= 80) data.cell.styles.textColor = [6, 95, 70];
              else if (val >= 60) data.cell.styles.textColor = [133, 77, 14];
              else data.cell.styles.textColor = [153, 27, 27];
            }
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 8;

      // ── Catatan ──────────────────────────────────────────────────────────
      if (raport.catatan) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(209, 250, 229);
        doc.setLineWidth(0.3);
        const catatanLines = doc.splitTextToSize(raport.catatan, pageW - 28);
        const boxH = 8 + catatanLines.length * 6;
        doc.roundedRect(14, y, pageW - 28, boxH, 2, 2, 'FD');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(6, 95, 70);
        doc.text('Catatan Ustadz/ah:', 18, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(catatanLines, 18, y + 12);

        y += boxH + 8;
      }

      // ── Tanda Tangan ─────────────────────────────────────────────────────
      y += 8;
      const sigX = pageW - 60;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(55, 65, 81);
      doc.text(
        `Diterbitkan pada ${formatDate(raport.updated_at ?? raport.created_at)}`,
        sigX,
        y,
        { align: 'center' }
      );
      y += 20;
      doc.setDrawColor(209, 213, 219);
      doc.line(sigX - 25, y, sigX + 25, y);
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      doc.text(guru?.name ?? 'Ustadz/ah', sigX, y, { align: 'center' });
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Guru Pembimbing', sigX, y, { align: 'center' });

      // ── Footer ───────────────────────────────────────────────────────────
      const pageH = doc.internal.pageSize.getHeight();
      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageH - 12, pageW - 14, pageH - 12);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Dokumen ini digenerate oleh Sistem Manajemen Tim Qur\u2019an', pageW / 2, pageH - 7, {
        align: 'center',
      });

      const safeName = (siswa?.nama ?? 'Siswa').replace(/\s+/g, '_');
      const safePeriode = raport.periode.replace(/\s+/g, '_');
      doc.save(`Raport_${safeName}_${safePeriode}.pdf`);
    } catch (err) {
      console.error('Gagal export PDF:', err);
      alert('Gagal mengekspor PDF. Silakan coba lagi.');
    } finally {
      setExportingPdf(false);
    }
  };

  const siswa = raport.santri;

  // Nilai rata-rata
  const scores = [raport.makhroj, raport.tajwid, raport.lancar].filter(
    (v): v is number => v !== undefined && v !== null
  );
  const rataRata = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className={['space-y-4', className].join(' ')}>
      {/* ── Tombol Cetak & Export ────────────────────────────────────────────── */}
      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          leftIcon={<Download size={16} />}
          onClick={handleExportPDF}
          loading={exportingPdf}
          disabled={exportingPdf}
        >
          Export PDF
        </Button>
        <Button
          variant="primary"
          leftIcon={<Printer size={16} />}
          onClick={() => handlePrint()}
        >
          Cetak Raport
        </Button>
      </div>

      {/* ── Preview (screen) ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white">
        {/* Header strip */}
        <div className="h-2 bg-amber-600" />

        <div className="p-6 space-y-6">
          {/* Identitas */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-amber-800">Raport Qur'an</h2>
              <p className="text-sm text-slate-500">Program Tahfidz &amp; Tahsin Al-Qur'an</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p className="font-semibold">{raport.periode}</p>
              {raport.buku_surah && <p>{raport.buku_surah}</p>}
              {raport.halaman && <p>Hal. {raport.halaman}</p>}
            </div>
          </div>

          {/* Info siswa */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Nama</span>
              <p className="font-semibold text-slate-800 mt-0.5">{siswa?.nama ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">NISN</span>
              <p className="font-mono text-slate-800 mt-0.5">{siswa?.nisn ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs uppercase tracking-wide">Kelas</span>
              <p className="text-slate-800 mt-0.5">{siswa?.classes?.name ?? '—'}</p>
            </div>
          </div>

          {/* Penilaian */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Penilaian</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Makhroj', value: raport.makhroj },
                { label: 'Tajwid', value: raport.tajwid },
                { label: 'Kelancaran', value: raport.lancar },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className={`rounded-xl border p-4 text-center ${scoreBgClass(value)}`}
                >
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-3xl font-bold ${scoreColorClass(value)}`}>
                    {value !== null && value !== undefined ? value : '—'}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${scoreColorClass(value)}`}>
                    {scoreLabel(value)}
                  </p>
                </div>
              ))}
            </div>

            {/* Rata-rata */}
            {rataRata !== null && (
              <div className={`rounded-xl border p-3 text-center ${scoreBgClass(rataRata)}`}>
                <p className="text-xs text-slate-500 mb-0.5">Rata-rata</p>
                <p className={`text-2xl font-bold ${scoreColorClass(rataRata)}`}>{rataRata}</p>
                <p className={`text-xs font-medium ${scoreColorClass(rataRata)}`}>{scoreLabel(rataRata)}</p>
              </div>
            )}
          </div>

          {/* Catatan */}
          {raport.catatan && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                Catatan Ustadz/ah
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{raport.catatan}</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <PrintContent ref={printRef} raport={raport} />
      </div>
    </div>
  );
}
