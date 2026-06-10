'use client';

/**
 * RaportPremium.tsx
 * Premium Islamic Raport Component for SDIT
 * Modern Gold design — A4 Portrait, print-ready
 * Used with react-to-print via forwardRef
 */

import React from 'react';
import Image from 'next/image';
import { toImageUrl } from '@/lib/storage/urls';

// ─── Data Interface ──────────────────────────────────────────────────────────

export interface RaportPremiumData {
  santri: {
    nama: string;
    nisn: string;
    nis?: string;
    kelas: string;
    semester: string;
    tahun_ajaran: string;
    nama_orang_tua?: string;
    photo_url?: string | null;
  };
  profil: {
    nama_sekolah?: string;
    nama_lembaga?: string;
    logo_url?: string | null;
    logo_sekolah_url?: string | null;
    alamat?: string;
  };
  tahsin_wafa: {
    makhraj_huruf: string;
    tajwid: string;
    kelancaran: string;
    kefasihan_bacaan: string;
    keaktifan_pembelajaran: string;
  };
  capaian_wafa: {
    jilid: string;
    halaman_awal: string;
    halaman_akhir: string;
    status: 'Tuntas' | 'Belum Tuntas';
  };
  iwr: {
    menyimak: number;
    menirukan: number;
    membaca: number;
    menulis: number;
    menghafal: number;
    pemahaman_materi: number;
  };
  tahfidz: Array<{
    nama_surah: string;
    makhraj: string;
    tajwid: string;
    kelancaran: string;
    murajaah: string;
    status: 'Sangat Lancar' | 'Lancar' | "Perlu Muraja'ah";
  }>;
  rekap: {
    nilai_tahsin: number;
    nilai_tahfidz: number;
    nilai_iwr: number;
    nilai_wafa: number;
    nilai_akhir: number;
    predikat: 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Perlu Pembinaan';
  };
  karakter: {
    disiplin: string;
    akhlak: string;
    adab_kepada_guru: string;
    semangat_murajaah: string;
    tanggung_jawab: string;
  };
  grafik?: {
    semester_lalu: { tahsin: number; tahfidz: number; iwr: number; wafa: number };
    semester_ini: { tahsin: number; tahfidz: number; iwr: number; wafa: number };
  };
  catatan?: string;
  pengesahan: {
    kota: string;
    tanggal: string;
    nama_guru_tahfidz: string;
    nama_guru_wafa: string;
    nama_wali_kelas: string;
    nama_kepala_sekolah: string;
  };
}

// ─── Color Constants ─────────────────────────────────────────────────────────

const C = {
  emeraldDark: '#b45309',
  emerald: '#d97706',
  emeraldLight: '#f59e0b',
  emeraldBg: '#fffbeb',
  emeraldBorder: '#fde68a',
  gold: '#d97706',
  goldLight: '#f59e0b',
  goldBg: '#fffbeb',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  blue: '#1d4ed8',
  blueBg: '#eff6ff',
  amber: '#b45309',
  amberBg: '#fffbeb',
  red: '#b91c1c',
  redBg: '#fef2f2',
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function gradeLabel(grade: string): string {
  if (grade === 'A') return 'Mumtaz';
  if (grade === 'B') return 'Jayyid Jiddan';
  if (grade === 'C') return 'Jayyid';
  if (grade === 'D') return 'Perlu Bimbingan';
  return grade;
}

function gradeColors(grade: string): { bg: string; color: string; border: string } {
  if (grade === 'A') return { bg: C.emeraldBg, color: C.emeraldDark, border: C.emeraldBorder };
  if (grade === 'B') return { bg: C.blueBg, color: C.blue, border: '#93c5fd' };
  if (grade === 'C') return { bg: C.amberBg, color: C.amber, border: '#fcd34d' };
  if (grade === 'D') return { bg: C.redBg, color: C.red, border: '#fca5a5' };
  return { bg: C.gray100, color: C.gray600, border: C.gray200 };
}

function scoreColor(score: number): string {
  if (score >= 85) return C.emeraldDark;
  if (score >= 70) return C.gold;
  return C.red;
}

function predikatColors(p: string): { bg: string; color: string } {
  if (p === 'Mumtaz') return { bg: C.emeraldBg, color: C.emeraldDark };
  if (p === 'Jayyid Jiddan') return { bg: C.blueBg, color: C.blue };
  if (p === 'Jayyid') return { bg: C.amberBg, color: C.amber };
  return { bg: C.redBg, color: C.red };
}

function iwrBarColor(score: number): string {
  if (score >= 85) return `linear-gradient(90deg, ${C.emeraldDark}, ${C.emeraldLight})`;
  if (score >= 70) return `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`;
  return `linear-gradient(90deg, #dc2626, #ef4444)`;
}

function statusTahfidzStyle(status: string): { color: string; bg: string; icon: string } {
  if (status === 'Sangat Lancar') return { color: C.emeraldDark, bg: C.emeraldBg, icon: '✓' };
  if (status === 'Lancar') return { color: C.blue, bg: C.blueBg, icon: '✓' };
  return { color: C.amber, bg: C.amberBg, icon: '⚠' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      marginTop: '12px',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.emeraldDark}, ${C.emerald})`,
        color: C.white,
        borderRadius: '20px',
        padding: '3px 12px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        {number}
      </div>
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        color: C.emeraldDark,
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
      }}>
        {title}
      </div>
      <div style={{
        flex: 1,
        height: '1px',
        background: `linear-gradient(90deg, ${C.emeraldBorder}, transparent)`,
      }} />
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const { bg, color, border } = gradeColors(grade);
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color,
      border: `1px solid ${border}`,
      borderRadius: '6px',
      padding: '1px 8px',
      fontSize: '10px',
      fontWeight: 700,
      minWidth: '24px',
      textAlign: 'center',
    }}>
      {grade}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const RaportPremium = React.forwardRef<HTMLDivElement, { data: RaportPremiumData }>(
  ({ data }, ref) => {
    const { santri, profil, tahsin_wafa, capaian_wafa, iwr, tahfidz, rekap, karakter, grafik, catatan, pengesahan } = data;

    const namaSekolah = profil.nama_sekolah ?? profil.nama_lembaga ?? 'SDIT AL-QURAN';

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1123px',
          background: C.white,
          fontFamily: '"Segoe UI", Arial, sans-serif',
          fontSize: '11px',
          color: C.gray800,
          padding: '28px 32px 24px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* ── Decorative corner ornament (top-left) ── */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '80px',
          height: '80px',
          background: `linear-gradient(135deg, ${C.emeraldDark}22, transparent)`,
          borderBottomRightRadius: '80px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: `linear-gradient(225deg, ${C.goldLight}33, transparent)`,
          borderBottomLeftRadius: '80px',
          pointerEvents: 'none',
        }} />

        {/* ════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════ */}
        <div style={{
          background: `linear-gradient(135deg, ${C.emeraldDark} 0%, #047857 50%, #065f46 100%)`,
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '4px',
          boxShadow: `0 4px 16px ${C.emeraldDark}44`,
        }}>
          {/* Logo Sekolah */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: `2px solid ${C.goldLight}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {profil.logo_sekolah_url ? (
              <Image
                src={toImageUrl(profil.logo_sekolah_url) || ''}
                alt="Logo Sekolah"
                width={56}
                height={56}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                unoptimized
              />
            ) : (
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.2 }}>LOGO{'\n'}SEKOLAH</span>
            )}
          </div>

          {/* Center Info */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontSize: '16px',
              fontWeight: 900,
              color: C.white,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              marginBottom: '3px',
            }}>
              {namaSekolah}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 800,
              color: C.goldLight,
              letterSpacing: '0.5px',
              marginBottom: '2px',
            }}>
              RAPORT TAHFIDZ & TAHSIN AL-QUR&apos;AN
            </div>
            <div style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '1px',
            }}>
              Program WAFA & IWR (Integrated Workbook Report)
            </div>
            <div style={{
              fontSize: '10px',
              color: C.goldLight,
              fontWeight: 600,
            }}>
              Tahun Ajaran {santri.tahun_ajaran}
            </div>
          </div>

          {/* Logo Tim */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: `2px solid ${C.goldLight}88`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {profil.logo_url ? (
              <Image
                src={toImageUrl(profil.logo_url) || ''}
                alt="Logo Tim"
                width={56}
                height={56}
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                unoptimized
              />
            ) : (
              <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1.2 }}>LOGO{'\n'}TIM</span>
            )}
          </div>
        </div>

        {/* Gold double-line border */}
        <div style={{ height: '3px', background: C.gold, marginBottom: '1px', borderRadius: '2px' }} />
        <div style={{ height: '1px', background: C.goldLight, marginBottom: '10px' }} />

        {/* ════════════════════════════════════════════════
            STUDENT IDENTITY
        ════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex',
          gap: '14px',
          background: C.emeraldBg,
          border: `1px solid ${C.emeraldBorder}`,
          borderLeft: `4px solid ${C.emeraldDark}`,
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '10px',
          alignItems: 'center',
        }}>
          {/* Photo */}
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            border: `3px solid ${C.emeraldDark}`,
            overflow: 'hidden',
            flexShrink: 0,
            background: C.gray100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 2px 8px ${C.emeraldDark}33`,
          }}>
            {santri.photo_url ? (
              <Image
                src={toImageUrl(santri.photo_url) || ''}
                alt={santri.nama}
                width={76}
                height={76}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                unoptimized
              />
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="15" r="8" fill={C.emeraldBorder} />
                <ellipse cx="20" cy="34" rx="14" ry="9" fill={C.emeraldBorder} />
              </svg>
            )}
          </div>

          {/* Student Info Grid */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px 16px',
          }}>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Nama Siswa</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: C.emeraldDark }}>{santri.nama}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>NISN</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.gray700 }}>{santri.nisn}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>NIS</div>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.gray700 }}>{santri.nis ?? '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Kelas</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.gray700 }}>{santri.kelas}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Semester</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.gray700 }}>{santri.semester}</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Tahun Ajaran</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.gray700 }}>{santri.tahun_ajaran}</div>
            </div>
            {santri.nama_orang_tua && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '8px', color: C.emerald, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '1px' }}>Nama Orang Tua / Wali</div>
                <div style={{ fontSize: '11px', color: C.gray700 }}>{santri.nama_orang_tua}</div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            TWO COLUMN LAYOUT: Left (Sections 1-3) | Right (Sections 4-5)
        ════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ flex: '0 0 340px' }}>

            {/* SECTION 1: Penilaian Tahsin WAFA */}
            <SectionHeader number="BAGIAN 1" title="Penilaian Tahsin WAFA" />
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '10px',
              marginBottom: '4px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: `1px solid ${C.emeraldBorder}`,
            }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${C.emeraldDark}, ${C.emerald})` }}>
                  <th style={{ padding: '5px 8px', textAlign: 'left', color: C.white, fontWeight: 700, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Aspek Penilaian</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '9px', width: '48px' }}>Nilai</th>
                  <th style={{ padding: '5px 8px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '9px', width: '80px' }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Makhraj Huruf', value: tahsin_wafa.makhraj_huruf },
                  { label: 'Tajwid', value: tahsin_wafa.tajwid },
                  { label: 'Kelancaran', value: tahsin_wafa.kelancaran },
                  { label: 'Kefasihan Bacaan', value: tahsin_wafa.kefasihan_bacaan },
                  { label: 'Keaktifan Pembelajaran', value: tahsin_wafa.keaktifan_pembelajaran },
                ].map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.emeraldBg }}>
                    <td style={{ padding: '5px 8px', color: C.gray700, borderBottom: `1px solid ${C.emeraldBorder}55` }}>{row.label}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}55` }}>
                      <GradeBadge grade={row.value} />
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center', color: gradeColors(row.value).color, fontWeight: 600, fontSize: '9px', borderBottom: `1px solid ${C.emeraldBorder}55` }}>
                      {gradeLabel(row.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* SECTION 2: Capaian WAFA */}
            <SectionHeader number="BAGIAN 2" title="Capaian WAFA" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '4px' }}>
              {[
                { label: 'Jilid WAFA', value: capaian_wafa.jilid },
                { label: 'Halaman Awal', value: capaian_wafa.halaman_awal },
                { label: 'Halaman Akhir', value: capaian_wafa.halaman_akhir },
                { label: 'Status', value: capaian_wafa.status, isStatus: true },
              ].map((card, i) => (
                <div key={i} style={{
                  background: card.isStatus
                    ? (capaian_wafa.status === 'Tuntas' ? C.emeraldBg : C.redBg)
                    : C.goldBg,
                  border: `1px solid ${card.isStatus ? (capaian_wafa.status === 'Tuntas' ? C.emeraldBorder : '#fca5a5') : '#fcd34d'}`,
                  borderRadius: '8px',
                  padding: '6px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '8px', color: card.isStatus ? (capaian_wafa.status === 'Tuntas' ? C.emerald : C.red) : C.gold, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>
                    {card.label}
                  </div>
                  <div style={{
                    fontSize: card.isStatus ? '9px' : '12px',
                    fontWeight: 700,
                    color: card.isStatus ? (capaian_wafa.status === 'Tuntas' ? C.emeraldDark : C.red) : C.gold,
                    lineHeight: 1.1,
                  }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* SECTION 3: IWR */}
            <SectionHeader number="BAGIAN 3" title="IWR (Integrated Workbook Report)" />
            <div style={{
              background: C.gray50,
              border: `1px solid ${C.gray200}`,
              borderRadius: '8px',
              padding: '8px 10px',
              marginBottom: '4px',
            }}>
              {[
                { label: 'Menyimak', value: iwr.menyimak },
                { label: 'Menirukan', value: iwr.menirukan },
                { label: 'Membaca', value: iwr.membaca },
                { label: 'Menulis', value: iwr.menulis },
                { label: 'Menghafal', value: iwr.menghafal },
                { label: 'Pemahaman Materi', value: iwr.pemahaman_materi },
              ].map((item, i) => (
                <div key={i} style={{ marginBottom: i < 5 ? '5px' : '0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '90px', fontSize: '9px', color: C.gray600, flexShrink: 0, fontWeight: 500 }}>{item.label}</div>
                  <div style={{ flex: 1, height: '10px', background: C.gray200, borderRadius: '5px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(item.value, 100)}%`,
                      height: '100%',
                      background: iwrBarColor(item.value),
                      borderRadius: '5px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{ width: '28px', fontSize: '9px', fontWeight: 700, color: scoreColor(item.value), textAlign: 'right', flexShrink: 0 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ flex: 1 }}>

            {/* SECTION 4: Tahfidz Al-Qur'an */}
            <SectionHeader number="BAGIAN 4" title="Tahfidz Al-Qur'an" />
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '9.5px',
              marginBottom: '4px',
              border: `1px solid ${C.emeraldBorder}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <thead>
                <tr style={{ background: `linear-gradient(135deg, ${C.emeraldDark}, ${C.emerald})` }}>
                  <th style={{ padding: '4px 6px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '20px' }}>No</th>
                  <th style={{ padding: '4px 6px', textAlign: 'left', color: C.white, fontWeight: 700, fontSize: '8px' }}>Surah</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '32px' }}>Mkhrj</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '32px' }}>Tajwd</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '32px' }}>Lncr</th>
                  <th style={{ padding: '4px 4px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '32px' }}>Mur.</th>
                  <th style={{ padding: '4px 6px', textAlign: 'center', color: C.white, fontWeight: 700, fontSize: '8px', width: '72px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tahfidz.map((surah, i) => {
                  const st = statusTahfidzStyle(surah.status);
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.emeraldBg }}>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: C.gray600, borderBottom: `1px solid ${C.emeraldBorder}33`, fontSize: '8px' }}>{i + 1}</td>
                      <td style={{ padding: '4px 6px', color: C.gray800, borderBottom: `1px solid ${C.emeraldBorder}33`, fontWeight: 500, fontSize: '9.5px' }}>{surah.nama_surah}</td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}33` }}>
                        <GradeBadge grade={surah.makhraj} />
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}33` }}>
                        <GradeBadge grade={surah.tajwid} />
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}33` }}>
                        <GradeBadge grade={surah.kelancaran} />
                      </td>
                      <td style={{ padding: '4px 4px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}33` }}>
                        <GradeBadge grade={surah.murajaah} />
                      </td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', borderBottom: `1px solid ${C.emeraldBorder}33` }}>
                        <span style={{
                          display: 'inline-block',
                          background: st.bg,
                          color: st.color,
                          borderRadius: '10px',
                          padding: '1px 5px',
                          fontSize: '7.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}>
                          {st.icon} {surah.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {tahfidz.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: C.gray600, fontStyle: 'italic', fontSize: '9px' }}>
                      Belum ada data hafalan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* SECTION 5: Rekap Nilai */}
            <SectionHeader number="BAGIAN 5" title="Rekap Nilai" />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'stretch' }}>
              {[
                { label: 'Tahsin', value: rekap.nilai_tahsin },
                { label: 'Tahfidz', value: rekap.nilai_tahfidz },
                { label: 'IWR', value: rekap.nilai_iwr },
                { label: 'WAFA', value: rekap.nilai_wafa },
                { label: 'Nilai Akhir', value: rekap.nilai_akhir, highlight: true },
              ].map((card, i) => (
                <div key={i} style={{
                  flex: 1,
                  background: card.highlight
                    ? `linear-gradient(135deg, ${C.emeraldDark}, ${C.emerald})`
                    : C.gray50,
                  border: card.highlight ? 'none' : `1px solid ${C.gray200}`,
                  borderRadius: '8px',
                  padding: '7px 4px',
                  textAlign: 'center',
                  boxShadow: card.highlight ? `0 2px 8px ${C.emeraldDark}44` : 'none',
                }}>
                  <div style={{
                    fontSize: '7.5px',
                    color: card.highlight ? 'rgba(255,255,255,0.85)' : C.gray600,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    marginBottom: '2px',
                  }}>
                    {card.label}
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 900,
                    color: card.highlight ? C.goldLight : scoreColor(card.value),
                    lineHeight: 1.1,
                  }}>
                    {card.value}
                  </div>
                </div>
              ))}
              {/* Predikat badge */}
              <div style={{
                background: predikatColors(rekap.predikat).bg,
                border: `2px solid ${predikatColors(rekap.predikat).color}44`,
                borderRadius: '8px',
                padding: '7px 8px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '64px',
              }}>
                <div style={{ fontSize: '7.5px', color: predikatColors(rekap.predikat).color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '2px' }}>Predikat</div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: predikatColors(rekap.predikat).color, lineHeight: 1.2, textAlign: 'center' }}>
                  {rekap.predikat}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ════════════════════════════════════════════════
            BOTTOM ROW: Section 6 | Section 7
        ════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>

          {/* SECTION 6: Karakter Qur'ani */}
          <div style={{ flex: '0 0 340px' }}>
            <SectionHeader number="BAGIAN 6" title="Karakter Qur'ani" />
            <div style={{
              background: C.gray50,
              border: `1px solid ${C.gray200}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {[
                { icon: '📚', label: 'Disiplin', value: karakter.disiplin },
                { icon: '🌟', label: 'Akhlak', value: karakter.akhlak },
                { icon: '🤲', label: 'Adab kepada Guru', value: karakter.adab_kepada_guru },
                { icon: '📖', label: 'Semangat Muraja\'ah', value: karakter.semangat_murajaah },
                { icon: '✅', label: 'Tanggung Jawab', value: karakter.tanggung_jawab },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  borderBottom: i < 4 ? `1px solid ${C.gray200}` : 'none',
                  background: i % 2 === 0 ? C.white : C.gray50,
                  gap: '8px',
                }}>
                  <span style={{ fontSize: '12px', lineHeight: 1 }}>{row.icon}</span>
                  <span style={{ flex: 1, fontSize: '10px', color: C.gray700, fontWeight: 500 }}>{row.label}</span>
                  <GradeBadge grade={row.value} />
                  <span style={{ fontSize: '9px', color: gradeColors(row.value).color, fontWeight: 600, width: '80px', textAlign: 'right' }}>
                    {gradeLabel(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 7: Grafik Perkembangan */}
          <div style={{ flex: 1 }}>
            <SectionHeader number="BAGIAN 7" title="Grafik Perkembangan" />
            {grafik ? (
              <div style={{
                background: C.gray50,
                border: `1px solid ${C.gray200}`,
                borderRadius: '8px',
                padding: '10px 12px',
              }}>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', color: C.gray600 }}>
                    <div style={{ width: '10px', height: '8px', background: '#9ca3af', borderRadius: '2px' }} />
                    Semester Lalu
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', color: C.gray600 }}>
                    <div style={{ width: '10px', height: '8px', background: C.emeraldLight, borderRadius: '2px' }} />
                    Semester Ini
                  </div>
                </div>
                {[
                  { label: 'Tahsin', lalu: grafik.semester_lalu.tahsin, ini: grafik.semester_ini.tahsin },
                  { label: 'Tahfidz', lalu: grafik.semester_lalu.tahfidz, ini: grafik.semester_ini.tahfidz },
                  { label: 'IWR', lalu: grafik.semester_lalu.iwr, ini: grafik.semester_ini.iwr },
                  { label: 'WAFA', lalu: grafik.semester_lalu.wafa, ini: grafik.semester_ini.wafa },
                ].map((item, i) => (
                  <div key={i} style={{ marginBottom: i < 3 ? '6px' : '0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <div style={{ width: '42px', fontSize: '9px', color: C.gray600, fontWeight: 600, flexShrink: 0 }}>{item.label}</div>
                      <div style={{ flex: 1 }}>
                        {/* Bar lalu */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                          <div style={{ flex: 1, height: '7px', background: C.gray200, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.lalu}%`, height: '100%', background: '#9ca3af', borderRadius: '4px' }} />
                          </div>
                          <div style={{ width: '22px', fontSize: '8px', color: C.gray600, textAlign: 'right', fontWeight: 600 }}>{item.lalu}</div>
                        </div>
                        {/* Bar ini */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ flex: 1, height: '7px', background: C.gray200, borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${item.ini}%`,
                              height: '100%',
                              background: `linear-gradient(90deg, ${C.emeraldDark}, ${C.emeraldLight})`,
                              borderRadius: '4px',
                            }} />
                          </div>
                          <div style={{ width: '22px', fontSize: '8px', color: C.emeraldDark, textAlign: 'right', fontWeight: 700 }}>{item.ini}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: C.gray50,
                border: `1px solid ${C.gray200}`,
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                color: C.gray600,
                fontSize: '9px',
                fontStyle: 'italic',
              }}>
                Data grafik tidak tersedia
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════
            SECTION 8: Catatan
        ════════════════════════════════════════════════ */}
        <SectionHeader number="BAGIAN 8" title="Catatan & Motivasi dari Ustadz/Ustadzah" />
        <div style={{
          background: '#fffdf7',
          border: `1px solid #fcd34d`,
          borderLeft: `4px solid ${C.gold}`,
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '10px',
          minHeight: '44px',
        }}>
          <div style={{ fontSize: '10px', color: C.gold, fontWeight: 700, marginBottom: '4px' }}>
            ✍️ Catatan & Motivasi dari Ustadz/Ustadzah
          </div>
          {catatan ? (
            <p style={{ fontSize: '10.5px', color: C.gray700, fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
              &ldquo;{catatan}&rdquo;
            </p>
          ) : (
            <div>
              <div style={{ height: '1px', background: C.gray200, marginBottom: '6px' }} />
              <div style={{ height: '1px', background: C.gray200, marginBottom: '6px' }} />
              <div style={{ height: '1px', background: C.gray200 }} />
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════
            SECTION 9: Pengesahan / Tanda Tangan
        ════════════════════════════════════════════════ */}
        <SectionHeader number="BAGIAN 9" title="Pengesahan" />
        <div style={{ textAlign: 'right', fontSize: '10px', color: C.gray700, marginBottom: '10px' }}>
          {pengesahan.kota}, {pengesahan.tanggal}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {[
            { label: 'Guru Tahfidz', nama: pengesahan.nama_guru_tahfidz },
            { label: 'Guru WAFA', nama: pengesahan.nama_guru_wafa },
            { label: 'Wali Kelas', nama: pengesahan.nama_wali_kelas },
            { label: 'Kepala Sekolah', nama: pengesahan.nama_kepala_sekolah },
          ].map((col, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: C.gray600, marginBottom: '48px', fontWeight: 500 }}>
                {col.label},
              </div>
              <div style={{ borderBottom: `1.5px solid ${C.emeraldDark}`, marginBottom: '4px' }} />
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.emeraldDark }}>{col.nama}</div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `2px solid ${C.emeraldDark}`, paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '8px', color: C.emerald, fontStyle: 'italic' }}>
            {namaSekolah} — Program Tahfidz &amp; Tahsin Al-Qur&apos;an
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '2px', background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
            <div style={{ fontSize: '8px', color: C.gold, fontWeight: 600 }}>بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ</div>
            <div style={{ width: '40px', height: '2px', background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
          </div>
          <div style={{ fontSize: '8px', color: C.gray600 }}>
            Tahun Ajaran {santri.tahun_ajaran}
          </div>
        </div>

      </div>
    );
  }
);

RaportPremium.displayName = 'RaportPremium';

export default RaportPremium;
