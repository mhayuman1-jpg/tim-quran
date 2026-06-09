'use client';

/**
 * RaportTahfidzCard.tsx
 *
 * Unified single-source-of-truth component for Raport Tahfidz & Tahsin
 * Used for:
 * - Web Preview
 * - Print (React-to-Print)
 * - PDF Export (Puppeteer captures this HTML)
 * - Word Export (Docxtemplater uses this structure)
 *
 * Ensures consistent professional layout across all formats.
 */

import React from 'react';
import Image from 'next/image';
import { toImageUrl } from '@/lib/storage/urls';
import { getRaportMarginCSS, isJuz30Raport } from '@/lib/raport/print-config';

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface DetailSurahData {
  id?: string;
  urutan: number;
  nama_surah: string;
  makhroj?: string | null;
  tajwid?: string | null;
  lancar?: string | null;
  wafa_buku?: string | null;
  wafa_halaman?: string | null;
}

export interface RaportTahfidzData {
  id: string;
  periode: string;
  tahun_ajaran: string;
  juz?: number | null;
  catatan?: string | null;
  nama_guru_kelas?: string | null;
  niy_guru_kelas?: string | null;
  nama_kabid?: string | null;
  niy_kabid?: string | null;
  nama_kepala_sekolah?: string | null;
  niy_kepala_sekolah?: string | null;
  tahsin_metode?: string | null;
  tahsin_buku?: string | null;
  tahsin_halaman?: string | null;
  tahsin_makhroj?: string | null;
  tahsin_tajwid?: string | null;
  tahsin_kelancaran?: string | null;
  tahsin_adab?: string | null;
  tahsin_catatan?: string | null;
  lokasi?: string | null;
  tanggal?: string | null;
  created_at?: string;
  santri?: {
    nama: string;
    nisn: string;
    classes?: { name: string } | null;
  } | null;
  users?: { name: string } | null;
  raport_tahfidz_detail?: DetailSurahData[];
}

interface ProfilData {
  nama_lembaga?: string;
  nama_sekolah?: string;
  logo_url?: string | null;
  logo_sekolah_url?: string | null;
  alamat?: string | null;
}

interface RaportTahfidzCardProps {
  raport: RaportTahfidzData;
  profil?: ProfilData;
  inlineEdit?: boolean;
  onInlineChange?: (field: keyof RaportTahfidzData, value: string | null) => void;
  onInlineDetailChange?: (index: number, field: keyof DetailSurahData, value: string | null) => void;
  onInlineAddRow?: () => void;
  onInlineRemoveRow?: (index: number) => void;
}

const RaportTahfidzCard = React.forwardRef<HTMLDivElement, RaportTahfidzCardProps>(
  (
    {
      raport,
      profil = {},
      inlineEdit = false,
      onInlineChange,
      onInlineDetailChange,
      onInlineAddRow,
      onInlineRemoveRow,
    },
    ref
  ) => {
    const siswa = raport.santri;
    const details = (raport.raport_tahfidz_detail ?? []).slice().sort((a, b) => a.urutan - b.urutan);
    const rowCount = Math.max(11, details.length);

    const namaGuruKelas = raport.nama_guru_kelas;
    const niyGuruKelas = raport.niy_guru_kelas;
    const namaKabid = raport.nama_kabid;
    const niyKabid = raport.niy_kabid;
    const namaKepalaSekolah = raport.nama_kepala_sekolah;
    const niyKepalaSekolah = raport.niy_kepala_sekolah;

    const reportDate = raport.created_at ? new Date(raport.created_at) : new Date();
    const today = reportDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const lokasiKota = profil.alamat ? profil.alamat.split(',').slice(-1)[0].trim() : 'Dompu';
    const tanggal = raport.tanggal || today;

    return (
      <div ref={ref} className="report-paper">
        <style>{`
          @page {
            size: 210mm 330mm;
            margin: ${getRaportMarginCSS(raport.juz)};
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body,
            html {
              width: 210mm !important;
              min-height: 330mm !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .report-paper {
              width: 210mm !important;
              min-height: 330mm !important;
              padding: 18mm 16mm !important;
            }
          }
          .report-paper {
            font-family: 'Times New Roman', Times, serif;
            width: 210mm;
            min-height: 330mm;
            margin: 0 auto;
            padding: 18mm 16mm;
            background: #fff;
            color: #000;
            font-size: 12px;
            line-height: 1.45;
            box-sizing: border-box;
            position: relative;
          }
          .report-paper * {
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          .report-logo {
            width: 88px;
            height: 88px;
            min-width: 88px;
            min-height: 88px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid #000;
            overflow: hidden;
            background: #fff;
          }
          .report-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .report-title-group {
            text-align: center;
            flex: 1;
          }
          .school-name {
            margin: 0;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            line-height: 1.05;
          }
          .school-subtitle {
            margin: 4px 0 0;
            font-size: 10px;
            font-style: italic;
            color: #333;
          }
          .school-address {
            margin: 6px 0 0;
            font-size: 9px;
            color: #333;
            line-height: 1.3;
          }
          .divider-line {
            display: flex;
            width: 100%;
            height: 4px;
            margin: 9px auto;
            border-radius: 4px;
            overflow: hidden;
          }
          .divider-line .red {
            flex: 4;
            background: #cc0000;
          }
          .divider-line .green {
            flex: 1;
            background: #16a34a;
          }
          .report-label {
            margin: 10px 0 0;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            text-decoration: underline;
            text-decoration-color: #cc0000;
            text-underline-offset: 4px;
          }
          .detail-table {
            width: 100%;
            border-collapse: collapse;
          }
          .detail-table th,
          .detail-table td {
            border: 1px solid #000;
            padding: 8px 10px;
          }
          .detail-table th {
            background: #f3f4f6;
            font-weight: 700;
            font-size: 10px;
          }
          .section-title {
            margin: 14px 0 8px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .notes-box {
            border: 1px solid #000;
            padding: 12px;
            min-height: 90px;
            font-size: 10px;
            white-space: pre-wrap;
          }
          .tahsin-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-top: 10px;
          }
          .tahsin-card {
            border: 1px solid #000;
            padding: 10px;
            text-align: center;
            font-size: 10px;
          }
          .tahsin-card strong {
            display: block;
            margin-bottom: 4px;
            font-size: 9px;
          }
          .signature-section {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 16px;
            margin-top: 24px;
            font-size: 10px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            height: 1px;
            background: #000;
            margin: 26px 24px 6px;
          }
          .signature-name {
            font-weight: 700;
            margin-top: 8px;
          }
          .signature-nih {
            margin-top: 2px;
            font-size: 9px;
            color: #333;
          }
        `}</style>

        <div className="report-header">
          <div className="report-logo">
            {profil.logo_sekolah_url ? (
              <Image src={toImageUrl(profil.logo_sekolah_url) || ''} alt="Logo Sekolah" width={88} height={88} unoptimized />
            ) : (
              <span style={{ fontSize: '10px', textAlign: 'center' }}>LOGO SEKOLAH</span>
            )}
          </div>

          <div className="report-title-group">
            <h1 className="school-name">{profil.nama_sekolah || 'SDIT AL HILMI DOMPU'}</h1>
            <p className="school-subtitle">Sekolah Terpadu Dengan Pendidikan Berkarakter</p>
            <div className="divider-line">
              <span className="red" />
              <span className="green" />
            </div>
            <p className="school-address">{profil.alamat || 'Lingk. Jado RT.09 Kel. Dorotangga Dompu - NTB'}</p>
            <div className="report-label">Raport Tahfidz &amp; Tahsin</div>
          </div>

          <div className="report-logo">
            {profil.logo_url ? (
              <Image src={toImageUrl(profil.logo_url) || ''} alt="Logo Tim" width={88} height={88} unoptimized />
            ) : (
              <span style={{ fontSize: '10px', textAlign: 'center' }}>LOGO TIM</span>
            )}
          </div>
        </div>

        <div className="section-title">Data Siswa</div>
        <table className="detail-table" style={{ marginBottom: '12px' }}>
          <tbody>
            <tr>
              <th style={{ width: '15%' }}>Nama</th>
              <td style={{ width: '35%' }}>{siswa?.nama || '—'}</td>
              <th style={{ width: '20%' }}>Kelas / Semester</th>
              <td>{siswa?.classes?.name || '—'} / {raport.periode || '—'}</td>
            </tr>
            <tr>
              <th>NISN / NIS</th>
              <td>{siswa?.nisn || '—'}</td>
              <th>Tahun Ajaran</th>
              <td>{raport.tahun_ajaran || '—'}</td>
            </tr>
            <tr>
              <th>Juz</th>
              <td>{raport.juz ?? '—'}</td>
              <th>&nbsp;</th>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <div className="section-title">Penilaian Tahfidz</div>
        <table className="detail-table" style={{ marginBottom: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '8%' }}>No</th>
              <th>Nama Surah</th>
              <th style={{ width: '22%' }}>Makharijul Huruf</th>
              <th style={{ width: '22%' }}>Tajwid</th>
              <th style={{ width: '22%' }}>Lancar</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, index) => {
              const row = details[index];
              return (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td>{row?.nama_surah || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{row?.makhroj || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{row?.tajwid || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{row?.lancar || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={isJuz30Raport(raport.juz) ? { pageBreakBefore: 'always', breakBefore: 'page' } : undefined}>
          <div className="section-title">Penilaian Tahsin</div>
        <table className="detail-table" style={{ marginBottom: '10px' }}>
          <thead>
            <tr>
              <th>Metode</th>
              <th>Buku</th>
              <th>Halaman</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>{raport.tahsin_metode || '—'}</td>
              <td style={{ textAlign: 'center' }}>{raport.tahsin_buku || '—'}</td>
              <td style={{ textAlign: 'center' }}>{raport.tahsin_halaman || '—'}</td>
            </tr>
          </tbody>
        </table>

        <div className="tahsin-grid">
          <div className="tahsin-card">
            <strong>Makharijul Huruf</strong>
            <span>{raport.tahsin_makhroj || '—'}</span>
          </div>
          <div className="tahsin-card">
            <strong>Tajwid</strong>
            <span>{raport.tahsin_tajwid || '—'}</span>
          </div>
          <div className="tahsin-card">
            <strong>Kelancaran</strong>
            <span>{raport.tahsin_kelancaran || '—'}</span>
          </div>
        </div>
        </div>

        <div className="section-title">Catatan Guru</div>
        <div className="notes-box">{raport.tahsin_catatan || raport.catatan || '—'}</div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10px', marginTop: '12px' }}>
          <div>{lokasiKota}, {tanggal}</div>
        </div>

        <div className="signature-section">
          <div className="signature-box">
            <div>Guru Kelas</div>
            <div className="signature-line" />
            <div className="signature-name">{namaGuruKelas || '—'}</div>
            <div className="signature-nih">NIY: {niyGuruKelas || '—'}</div>
          </div>
          <div className="signature-box">
            <div>Kabid Qur'an</div>
            <div className="signature-line" />
            <div className="signature-name">{namaKabid || '—'}</div>
            <div className="signature-nih">NIY: {niyKabid || '—'}</div>
          </div>
          <div className="signature-box">
            <div>Kepala Sekolah</div>
            <div className="signature-line" />
            <div className="signature-name">{namaKepalaSekolah || '—'}</div>
            <div className="signature-nih">NIY: {niyKepalaSekolah || '—'}</div>
          </div>
        </div>
      </div>
    );
  }
);

RaportTahfidzCard.displayName = 'RaportTahfidzCard';

export default RaportTahfidzCard;
