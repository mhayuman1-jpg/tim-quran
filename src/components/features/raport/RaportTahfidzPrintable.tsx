'use client';

// RaportTahfidzPrintable.tsx — Printable raport layout for Tahfidz & Tahsin
// Updated to remove WAFA/IWR/Al-Qur'an columns and reposition Catatan Ustadz/ah.

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Shared cell style ───────────────────────────────────────────────────────

const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  border: '1px solid #000',
  padding: '3px 5px',
  ...extra,
});

// ─── PrintContent ─────────────────────────────────────────────────────────────

const PrintContent = React.forwardRef<HTMLDivElement, {
  raport: RaportTahfidzData;
  profil: ProfilData;
  inlineEdit?: boolean;
  onInlineChange?: (field: keyof RaportTahfidzData, value: string | null) => void;
  onInlineDetailChange?: (index: number, field: keyof DetailSurahData, value: string | null) => void;
  onInlineAddRow?: () => void;
  onInlineRemoveRow?: (index: number) => void;
}>(({ raport, profil, inlineEdit = false, onInlineChange, onInlineDetailChange, onInlineAddRow, onInlineRemoveRow }, ref) => {
  const siswa = raport.santri;
  const guru  = raport.users;
  const detail = (raport.raport_tahfidz_detail ?? [])
    .slice()
    .sort((a, b) => a.urutan - b.urutan);

  const namaGuruKelas    = raport.nama_guru_kelas   || guru?.name || null;
  const niyGuruKelas     = raport.niy_guru_kelas    || null;
  const namaKabid        = raport.nama_kabid        || null;
  const niyKabid         = raport.niy_kabid         || null;
  const namaKepalaSekolah = raport.nama_kepala_sekolah || null;
  const niyKepalaSekolah  = raport.niy_kepala_sekolah  || null;

  const reportDate = raport.created_at ? new Date(raport.created_at) : new Date();
  const today = reportDate.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const editableInputStyle: React.CSSProperties = {
    width: '100%',
    border: inlineEdit ? '1px solid #999' : 'transparent',
    borderRadius: 4,
    padding: '4px 6px',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    background: inlineEdit ? '#fff' : 'transparent',
    color: '#000',
    outline: inlineEdit ? 'none' : 'none',
  };

  const editableTextareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 62,
    border: inlineEdit ? '1px solid #999' : 'transparent',
    borderRadius: 4,
    padding: '8px 10px',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    background: inlineEdit ? '#fff' : '#f9fafb',
    color: '#000',
    outline: inlineEdit ? 'none' : 'none',
    resize: 'vertical',
  };

  const renderEditableText = (
    field: keyof RaportTahfidzData,
    value: string | null | undefined,
    placeholder = '—',
    containerStyle: React.CSSProperties = {},
  ) => {
    if (!inlineEdit) {
      return <span style={containerStyle}>{value || placeholder}</span>;
    }
    return (
      <input
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        style={{ ...editableInputStyle, ...containerStyle }}
        onChange={(event) => onInlineChange?.(field, event.target.value || null)}
      />
    );
  };

  const renderEditableTextarea = (
    field: keyof RaportTahfidzData,
    value: string | null | undefined,
    placeholder = '—',
  ) => {
    if (!inlineEdit) {
      return <div style={{ whiteSpace: 'pre-wrap', minHeight: 62, padding: '10px 12px', background: '#f9fafb' }}>{value ? `“${value}”` : '—'}</div>;
    }
    return (
      <textarea
        value={value ?? ''}
        placeholder={placeholder}
        style={editableTextareaStyle}
        onChange={(event) => onInlineChange?.(field, event.target.value || null)}
      />
    );
  };

  // Ambil kota dari nama sekolah atau alamat jika tersedia, default Dompu
  const kotaFromSchool = /dompu/i.test(profil.nama_sekolah ?? '') ? 'Dompu' : undefined;
  const alamatParts = profil.alamat?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
  const kotaRaw = alamatParts.length > 0 ? alamatParts[alamatParts.length - 1] : '';
  const kota = (raport.lokasi ?? kotaFromSchool ?? kotaRaw) || 'Dompu';
  const tanggal = raport.tanggal ?? today;

  // Cari baris pertama yang punya nilai wafa
  const n = detail.length;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        background: '#fff',
        padding: '20px 28px',
        maxWidth: '760px',
        margin: '0 auto',
        fontSize: '12px',
        color: '#000',
        lineHeight: 1.4,
      }}
    >
      {/* ══ HEADER SEKOLAH ════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* Logo sekolah kiri */}
          <div style={{ width: 85, height: 85, flexShrink: 0 }}>
            {profil.logo_sekolah_url ? (
              <Image src={profil.logo_sekolah_url} alt="Logo" width={85} height={85}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                unoptimized />
            ) : (
              <div style={{ width: 85, height: 85, borderRadius: '50%', background: '#1a5c2a',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '3px solid #fbbf24' }}>
                <span style={{ color: '#fbbf24', fontSize: '8px', fontWeight: 900, textAlign: 'center', lineHeight: 1.2 }}>
                  LOGO<br />SEKOLAH
                </span>
              </div>
            )}
          </div>

          {/* Tengah: nama + tagline + garis + alamat */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {/* Nama sekolah merah BESAR */}
            <div style={{
              fontSize: '24px', fontWeight: 900, color: '#cc0000',
              lineHeight: 1.1, letterSpacing: '0.5px', textTransform: 'uppercase',
              fontFamily: '"Times New Roman", serif',
            }}>
              {profil.nama_sekolah ?? profil.nama_lembaga ?? 'SD ISLAM TERPADU AL-HILMI'}
            </div>

            {/* Tagline italic hijau */}
            <div style={{
              fontSize: '11.5px', fontStyle: 'italic', fontWeight: 700,
              color: '#166534', marginTop: '2px',
            }}>
              Sekolah Terpadu Dengan Pendidikan Berkarakter
            </div>

            {/* Garis dekoratif merah-hijau */}
            <div style={{ display: 'flex', height: '3px', margin: '4px auto', borderRadius: '2px', width: '90%' }}>
              <div style={{ flex: 4, background: '#cc0000' }} />
              <div style={{ flex: 1, background: '#16a34a' }} />
            </div>

            {/* Alamat — gunakan dari profil atau hardcode fallback */}
            <div style={{ fontSize: '9px', color: '#333', lineHeight: 1.5, textAlign: 'center' }}>
              <span style={{ fontWeight: 700 }}>Alamat : </span>
              {profil.alamat
                ? profil.alamat
                : 'Lingk. Jado RT.09 Kel. Dorotangga Dompu - NTB'}
            </div>
            <div style={{ fontSize: '9px', color: '#333', lineHeight: 1.4, textAlign: 'center' }}>
              <span style={{ marginRight: 8 }}>✉ sditah.asshoff@gmail.com</span>
              <span>📘 Sdit Al-Hilmi Dompu</span>
            </div>
          </div>

          {/* Logo tim kanan */}
          <div style={{ width: 78, height: 78, flexShrink: 0 }}>
            {profil.logo_url ? (
              <Image src={profil.logo_url} alt="Logo Tim" width={78} height={78}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                unoptimized />
            ) : (
              <div style={{ width: 78, height: 78, borderRadius: '50%', background: '#1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #93c5fd' }}>
                <span style={{ color: '#93c5fd', fontSize: '7px', fontWeight: 900, textAlign: 'center' }}>
                  LOGO<br />TIM
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Garis bawah header — dua baris tebal */}
        <div style={{ height: '2.5px', background: '#000', marginTop: '7px' }} />
        <div style={{ height: '1px', background: '#000', marginTop: '2px' }} />
      </div>

      {/* ══ JUDUL ═════════════════════════════════════════════════════════ */}
      <div style={{
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 900,
        letterSpacing: '3px',
        textDecoration: 'underline',
        textDecorationColor: '#cc0000',
        textUnderlineOffset: '3px',
        color: '#000',
        margin: '8px 0 10px',
        textTransform: 'uppercase',
      }}>
        Raport Tahfidz &amp; Tahsin
      </div>

      {/* ══ IDENTITAS SISWA ═══════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '12px' }}>
        <tbody>
          <tr>
            <td style={{ width: '14%', verticalAlign: 'top' }}>Nama</td>
            <td style={{ width: '1%', verticalAlign: 'top' }}>:</td>
            <td style={{ width: '35%', fontWeight: 700, verticalAlign: 'top' }}>{siswa?.nama ?? '—'}</td>
            <td style={{ width: '18%', verticalAlign: 'top' }}>Kelas/Semester</td>
            <td style={{ width: '1%', verticalAlign: 'top' }}>:</td>
            <td style={{ verticalAlign: 'top' }}>{siswa?.classes?.name ?? '—'} / {renderEditableText('periode', raport.periode, '—')}</td>
          </tr>
          <tr>
            <td>NIS / NISN</td>
            <td>:</td>
            <td>{siswa?.nisn ?? '—'}</td>
            <td>Tahun Ajaran</td>
            <td>:</td>
            <td>{renderEditableText('tahun_ajaran', raport.tahun_ajaran, '—')}</td>
          </tr>
          <tr>
            <td>Juz</td>
            <td>:</td>
            <td>{renderEditableText('juz', raport.juz ? String(raport.juz) : null, '—')}</td>
            <td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>

      {/* ══ TABEL PENILAIAN ═══════════════════════════════════════════════ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '11.5px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={cell({ textAlign: 'center', width: 28, background: '#f5f5f5' })}>No.</th>
            <th rowSpan={2} style={cell({ textAlign: 'center', background: '#f5f5f5' })}>SURAH</th>
            <th colSpan={3} style={cell({ textAlign: 'center', background: '#f5f5f5' })}>NILAI TAHFIDZ</th>
            {inlineEdit && <th rowSpan={2} style={cell({ textAlign: 'center', width: 70, background: '#f5f5f5' })}>Aksi</th>}
          </tr>
          <tr>
            <th style={cell({ textAlign: 'center', width: 48, color: '#cc0000', textDecoration: 'underline', background: '#f5f5f5' })}>Makhroj</th>
            <th style={cell({ textAlign: 'center', width: 44, background: '#f5f5f5' })}>Tajwid</th>
            <th style={cell({ textAlign: 'center', width: 44, background: '#f5f5f5' })}>Lancar</th>
          </tr>
        </thead>
        <tbody>
          {n === 0 ? (
            <tr>
              <td colSpan={inlineEdit ? 6 : 5} style={cell({ textAlign: 'center', color: '#999', padding: '10px' })}>
                Belum ada data surah
              </td>
            </tr>
          ) : detail.map((row, i) => (
            <tr key={row.id ?? i}>
              <td style={cell({ textAlign: 'center' })}>{i + 1}</td>
              <td style={cell({ padding: '3px 7px' })}>
                {inlineEdit ? (
                  <input
                    type="text"
                    value={row.nama_surah}
                    onChange={(event) => onInlineDetailChange?.(i, 'nama_surah', event.target.value || null)}
                    style={editableInputStyle}
                    placeholder="Nama surah"
                  />
                ) : row.nama_surah}
              </td>
              <td style={cell({ textAlign: 'center', fontWeight: 700 })}>
                {inlineEdit ? (
                  <input
                    type="text"
                    value={row.makhroj ?? ''}
                    onChange={(event) => onInlineDetailChange?.(i, 'makhroj', event.target.value || null)}
                    style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                    placeholder="A/B/✓"
                  />
                ) : row.makhroj || ''}
              </td>
              <td style={cell({ textAlign: 'center', fontWeight: 700 })}>
                {inlineEdit ? (
                  <input
                    type="text"
                    value={row.tajwid ?? ''}
                    onChange={(event) => onInlineDetailChange?.(i, 'tajwid', event.target.value || null)}
                    style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                    placeholder="A/B/✓"
                  />
                ) : row.tajwid || ''}
              </td>
              <td style={cell({ textAlign: 'center', fontWeight: 700 })}>
                {inlineEdit ? (
                  <input
                    type="text"
                    value={row.lancar ?? ''}
                    onChange={(event) => onInlineDetailChange?.(i, 'lancar', event.target.value || null)}
                    style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                    placeholder="A/B/✓"
                  />
                ) : row.lancar || ''}
              </td>
              {inlineEdit && (
                <td style={cell({ textAlign: 'center' })}>
                  <button
                    type="button"
                    onClick={() => onInlineRemoveRow?.(i)}
                    style={{
                      border: '1px solid #333',
                      background: '#fff',
                      color: '#333',
                      padding: '4px 8px',
                      borderRadius: 5,
                      cursor: 'pointer',
                    }}
                  >
                    Hapus
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {inlineEdit && (
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onInlineAddRow}
            style={{ border: '1px solid #000', background: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>
            Tambah Baris Surah
          </button>
        </div>
      )}

      {/* ══ PENILAIAN TAHSIN ═══════════════════════════════════════════════ */}
      <div style={{ fontSize: '11px', marginBottom: '18px' }}>
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>Penilaian Tahsin</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
          <tbody>
            <tr>
              <td style={{ width: '24%', padding: '4px 6px', border: '1px solid #000', fontWeight: 700 }}>Metode</td>
              <td style={{ width: '26%', padding: '4px 6px', border: '1px solid #000' }}>{renderEditableText('tahsin_metode', raport.tahsin_metode, '—')}</td>
              <td style={{ width: '24%', padding: '4px 6px', border: '1px solid #000', fontWeight: 700 }}>Halaman</td>
              <td style={{ width: '26%', padding: '4px 6px', border: '1px solid #000' }}>{renderEditableText('tahsin_halaman', raport.tahsin_halaman, '—')}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '11px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', background: '#f5f5f5', padding: '4px 6px', textAlign: 'left' }}>Makharijul Huruf</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 6px', border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{renderEditableText('tahsin_makhroj', raport.tahsin_makhroj, '—')}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', background: '#f5f5f5', padding: '4px 6px', textAlign: 'left' }}>Tajwid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 6px', border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{renderEditableText('tahsin_adab', raport.tahsin_adab, '—')}</td>
              </tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #000', background: '#f5f5f5', padding: '4px 6px', textAlign: 'left' }}>Kelancaran</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 6px', border: '1px solid #000', textAlign: 'center', fontWeight: 700 }}>{renderEditableText('tahsin_kelancaran', raport.tahsin_kelancaran, '—')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ CATATAN USTADZ/AH ══════════════════════════════════════════════ */}
      <div style={{ fontSize: '11px', marginBottom: '18px' }}>
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>Catatan Ustadz/ah</div>
        <div style={{ minHeight: '62px', padding: '10px 12px', border: '1px solid #000', lineHeight: 1.6, background: '#f9fafb' }}>
          {renderEditableTextarea('catatan', raport.catatan, '—')}
        </div>
      </div>

      {/* ══ KETERANGAN ════════════════════════════════════════════════════ */}
      <div style={{ fontSize: '10.5px', marginBottom: '18px' }}>
        <strong>Keterangan :</strong>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 160px', gap: '1px 0', marginTop: 2 }}>
          <span>A = Sangat Baik</span>
          <span>B = Baik</span>
          <span>C = Cukup Baik</span>
          <span>D = Kurang Baik</span>
        </div>
      </div>

      {/* ══ TANGGAL ═══════════════════════════════════════════════════════ */}
      <div style={{ textAlign: 'right', fontSize: '11.5px', marginBottom: '6px' }}>
        {inlineEdit ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input
              type="text"
              value={kota}
              onChange={(event) => onInlineChange?.('lokasi', event.target.value || null)}
              style={{ ...editableInputStyle, width: 120, textAlign: 'left' }}
              placeholder="Dompu"
            />
            ,
            <input
              type="text"
              value={tanggal}
              onChange={(event) => onInlineChange?.('tanggal', event.target.value || null)}
              style={{ ...editableInputStyle, width: 180, textAlign: 'left' }}
              placeholder="7 Juni 2026"
            />
          </span>
        ) : (
          <span style={{ textDecoration: 'underline' }}>{kota}</span>
        )}
        {!inlineEdit && `, ${tanggal}`}
      </div>

      {/* ══ TANDA TANGAN GURU & KABID ═════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px',
        fontSize: '11.5px', marginBottom: '20px' }}>

        {/* Guru Kelas */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 4 }}>Guru Kelas,</div>
          <div style={{ height: 60 }}></div>
          {namaGuruKelas ? (
            <>
              <div style={{
                fontWeight: 700,
                textDecoration: 'underline',
                textDecorationThickness: '1.5px',
                textUnderlineOffset: '2px',
                marginBottom: 2,
                fontSize: '11.5px',
              }}>
                {renderEditableText('nama_guru_kelas', namaGuruKelas, 'Nama Guru Kelas', { display: 'block', width: '100%' })}
              </div>
              {renderEditableText('niy_guru_kelas', niyGuruKelas, 'NIY Guru Kelas', { fontSize: '10px', color: '#222', display: 'block' })}
            </>
          ) : (
            <div style={{ borderBottom: '1px solid #000', margin: '0 auto', width: '80%', paddingTop: 4 }} />
          )}
        </div>

        {/* Kabid Qur'an */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 4 }}>Kabid Qur&apos;an,</div>
          <div style={{ height: 60 }}></div>
          {namaKabid ? (
            <>
              <div style={{
                fontWeight: 700,
                textDecoration: 'underline',
                textDecorationThickness: '1.5px',
                textUnderlineOffset: '2px',
                marginBottom: 2,
                fontSize: '11.5px',
              }}>
                {renderEditableText('nama_kabid', namaKabid, 'Nama Kabid', { display: 'block', width: '100%' })}
              </div>
              {renderEditableText('niy_kabid', niyKabid, 'NIY Kabid', { fontSize: '10px', color: '#222', display: 'block' })}
            </>
          ) : (
            <div style={{ borderBottom: '1px solid #000', margin: '0 auto', width: '80%', paddingTop: 4 }} />
          )}
        </div>
      </div>

      {/* ══ KEPALA SEKOLAH ════════════════════════════════════════════════ */}
      <div style={{ textAlign: 'center', fontSize: '11.5px' }}>
        <div style={{ marginBottom: 2 }}>Mengetahui;</div>
        <div style={{ fontStyle: 'italic', marginBottom: 4 }}>
          Kepala SD IT Al Hilmi Dompu,
        </div>
        <div style={{ height: 60 }}></div>
        {namaKepalaSekolah ? (
          <>
            <div style={{
              fontWeight: 700,
              textDecoration: 'underline',
              textDecorationThickness: '1.5px',
              textUnderlineOffset: '2px',
              marginBottom: 2,
              fontSize: '11.5px',
              display: 'inline-block',
            }}>
              {renderEditableText('nama_kepala_sekolah', namaKepalaSekolah, 'Nama Kepala Sekolah', { display: 'block', width: '100%' })}
            </div>
            {renderEditableText('niy_kepala_sekolah', niyKepalaSekolah, 'NIY Kepala Sekolah', { fontSize: '10px', color: '#222', display: 'block' })}
          </>
        ) : (
          <div style={{ borderBottom: '1px solid #000', width: 200, margin: '0 auto', paddingTop: 4 }} />
        )}
      </div>

      {/* ══ FOOTER GARIS ══════════════════════════════════════════════════ */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ height: '1px', background: '#000' }} />
        <div style={{ height: '2px', background: '#000', marginTop: '2px' }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '8px', color: '#555', marginTop: '3px',
          fontStyle: 'italic',
        }}>
          <span>{profil.nama_sekolah ?? profil.nama_lembaga ?? ''}</span>
          <span>Raport Tahfidz &amp; Tahsin — {raport.tahun_ajaran}</span>
        </div>
      </div>
    </div>
  );
});
PrintContent.displayName = 'PrintContent';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RaportTahfidzPrintable({
  raport,
  hideButtons,
  inlineEdit = false,
  onInlineChange,
  onInlineDetailChange,
  onInlineAddRow,
  onInlineRemoveRow,
}: {
  raport: RaportTahfidzData;
  hideButtons?: boolean;
  inlineEdit?: boolean;
  onInlineChange?: (field: keyof RaportTahfidzData, value: string | null) => void;
  onInlineDetailChange?: (index: number, field: keyof DetailSurahData, value: string | null) => void;
  onInlineAddRow?: () => void;
  onInlineRemoveRow?: (index: number) => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [profil, setProfil] = useState<ProfilData>({});

  useEffect(() => {
    fetch('/api/website/profil')
      .then(r => r.json())
      .then(d => { if (d.data) setProfil(d.data); })
      .catch(() => {});
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_Tahfidz_${raport.santri?.nama ?? 'Siswa'}_${raport.periode}`,
    pageStyle: `
      @page {
        size: 215mm 330mm;
        margin: 15mm 18mm 15mm 20mm;
      }
      @media print {
        body { margin: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  return (
    <div className="space-y-4">
      {/* Tombol cetak */}
      {!hideButtons && (
        <div className="flex justify-end">
          <Button variant="primary" leftIcon={<Printer size={16} />} onClick={() => handlePrint()}>
            Cetak Raport
          </Button>
        </div>
      )}

      {/* ── Preview tampilan dokumen langsung ────────────────────────── */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Bar info */}
        <div className="bg-emerald-700 px-4 py-2.5 flex items-center justify-between">
          <p className="text-white text-sm font-semibold">Preview Raport Tahfidz &amp; Tahsin</p>
          <span className="text-emerald-200 text-xs">{raport.santri?.nama} · {raport.periode}</span>
        </div>

        {/* Render PrintContent langsung sebagai preview — bukan hidden */}
        <div className="overflow-x-auto p-2 sm:p-4 bg-gray-100">
          <div className="min-w-[680px] bg-white shadow-md rounded">
            <PrintContent
              raport={raport}
              profil={profil}
              inlineEdit={inlineEdit}
              onInlineChange={onInlineChange}
              onInlineDetailChange={onInlineDetailChange}
              onInlineAddRow={onInlineAddRow}
              onInlineRemoveRow={onInlineRemoveRow}
              ref={null}
            />
          </div>
        </div>
      </div>

      {/* Hidden print target */}
      <div style={{ display: 'none' }}>
        <PrintContent ref={printRef} raport={raport} profil={profil} />
      </div>
    </div>
  );
}
