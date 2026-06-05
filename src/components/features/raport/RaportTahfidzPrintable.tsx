'use client';

// RaportTahfidzPrintable.tsx
// Komponen preview & cetak raport tahfidz
// Format mengikuti contoh: header sekolah, tabel surah, tanda tangan

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';
import Button from '@/components/ui/Button';
import { Printer } from 'lucide-react';
import { getNilaiColor } from '@/lib/surahData';

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
  nama_kabid?: string | null;
  nama_kepala_sekolah?: string | null;
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

// ─── Print Content ────────────────────────────────────────────────────────────

const PrintContent = React.forwardRef<HTMLDivElement, {
  raport: RaportTahfidzData;
  profil: ProfilData;
}>(({ raport, profil }, ref) => {
  const siswa = raport.santri;
  const guru = raport.users;
  const detail = (raport.raport_tahfidz_detail ?? [])
    .slice()
    .sort((a, b) => a.urutan - b.urutan);

  // Nama tanda tangan — diambil dari data yang diketik guru di form
  const namaGuruKelas = raport.nama_guru_kelas || guru?.name || null;
  const namaKabid = raport.nama_kabid || null;
  const namaKepalaSekolah = raport.nama_kepala_sekolah || null;
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Kota dari alamat (ambil kata pertama)
  const kota = profil.alamat
    ? profil.alamat.split(',')[0]?.split(' ').slice(0, 2).join(' ') ?? 'Kota'
    : 'Kota';

  return (
    <div
      ref={ref}
      style={{
        fontFamily: 'Times New Roman, serif',
        background: '#fff',
        padding: '24px 32px',
        maxWidth: '740px',
        margin: '0 auto',
        fontSize: '13px',
        color: '#000',
      }}
    >
      {/* ── Header Sekolah ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '3px double #000', paddingBottom: '8px', marginBottom: '6px' }}>
        {/* Logo sekolah */}
        {profil.logo_sekolah_url ? (
          <div style={{ width: 70, height: 70, flexShrink: 0 }}>
            <Image src={profil.logo_sekolah_url} alt="Logo Sekolah" width={70} height={70} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div style={{ width: 70, height: 70, border: '1px solid #ccc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>LOGO</div>
        )}

        {/* Info sekolah */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '1px', color: '#cc0000', lineHeight: 1.2 }}>
            {profil.nama_sekolah?.toUpperCase() ?? profil.nama_lembaga?.toUpperCase() ?? 'NAMA SEKOLAH'}
          </div>
          {profil.nama_sekolah && profil.nama_lembaga && profil.nama_sekolah !== profil.nama_lembaga && (
            <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#333', marginTop: 2 }}>
              Sekolah Terpadu Dengan Pendidikan Berkarakter
            </div>
          )}
          {profil.alamat && (
            <div style={{ fontSize: '10px', color: '#555', marginTop: 2 }}>{profil.alamat}</div>
          )}
        </div>

        {/* Logo Tim */}
        {profil.logo_url ? (
          <div style={{ width: 70, height: 70, flexShrink: 0 }}>
            <Image src={profil.logo_url} alt="Logo Tim" width={70} height={70} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
          </div>
        ) : (
          <div style={{ width: 70, height: 70, border: '1px solid #ccc', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#999' }}>LOGO</div>
        )}
      </div>

      {/* ── Judul ────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: 900, letterSpacing: '2px', marginBottom: '12px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
        RAPORT WAFA TAHFIDZ
      </div>

      {/* ── Identitas Siswa ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginBottom: '12px', fontSize: '13px' }}>
        <div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ minWidth: 100 }}>Nama</span>
            <span>: <strong>{siswa?.nama ?? '—'}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ minWidth: 100 }}>NIS / NISN</span>
            <span>: {siswa?.nisn ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ minWidth: 100 }}>Juz</span>
            <span>: {raport.juz ? `Juz ${raport.juz}` : '—'}</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ minWidth: 110 }}>Kelas/Semester</span>
            <span>: {siswa?.classes?.name ?? '—'} /{raport.periode ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <span style={{ minWidth: 110 }}>Tahun Ajaran</span>
            <span>: {raport.tahun_ajaran}</span>
          </div>
        </div>
      </div>

      {/* ── Tabel Penilaian ───────────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '12px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: 32 }}>No.</th>
            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px 8px', textAlign: 'center' }}>SURAH</th>
            <th colSpan={3} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>NILAI TAHFIDZ</th>
            <th colSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>WAFA</th>
            <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', minWidth: 100 }}>Catatan Ustadz/ah</th>
          </tr>
          <tr>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', textDecoration: 'underline', color: '#cc0000', background: '#f9f9f9' }}>Makhroi</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>Tajwid</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>Lancar</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>Buku</th>
            <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', background: '#f9f9f9' }}>Hal.</th>
          </tr>
        </thead>
        <tbody>
          {detail.map((row, i) => (
            <tr key={row.id ?? i}>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #000', padding: '3px 8px' }}>{row.nama_surah}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>{row.makhroj || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>{row.tajwid || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>{row.lancar || ''}</td>
              {i === 0 && (row.wafa_buku || row.wafa_halaman) ? (
                <>
                  <td rowSpan={detail.filter(d => d.wafa_buku).length || 1}
                    style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {row.wafa_buku || ''}
                  </td>
                  <td rowSpan={detail.filter(d => d.wafa_halaman).length || 1}
                    style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', color: '#cc0000', fontWeight: 'bold' }}>
                    {row.wafa_halaman || ''}
                  </td>
                </>
              ) : !row.wafa_buku && !row.wafa_halaman && i > 0 ? (
                <>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                </>
              ) : i > 0 ? null : (
                <>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                  <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
                </>
              )}
              {i === 0 && raport.catatan ? (
                <td rowSpan={detail.length}
                  style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle', fontStyle: 'italic', fontSize: '11px', lineHeight: 1.5, maxWidth: 130 }}>
                  &ldquo;{raport.catatan}&rdquo;
                </td>
              ) : i > 0 ? null : (
                <td style={{ border: '1px solid #000', padding: '3px 6px' }}></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Keterangan ────────────────────────────────────────────────────── */}
      <div style={{ fontSize: '11px', marginBottom: '24px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>Keterangan :</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', maxWidth: 320 }}>
          <div>A = Sangat Baik</div>
          <div>B = Baik</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px' }}>⊕</span> Cukup Baik
          </div>
          <div>D = Kurang Baik</div>
        </div>
      </div>

      {/* ── Tanda Tangan ─────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'right', marginBottom: '4px', fontSize: '12px' }}>
        {kota}, {today}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', fontSize: '12px', marginBottom: '32px' }}>
        {/* Guru Kelas */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 56 }}>Guru Kelas,</div>
          {/* Area kosong untuk TTD tangan */}
          <div style={{ borderBottom: '1px solid #000', marginBottom: 6 }}>&nbsp;</div>
          {namaGuruKelas ? (
            <div style={{ fontWeight: 700 }}>{namaGuruKelas}</div>
          ) : (
            <div style={{ color: '#999' }}>( _________________ )</div>
          )}
        </div>

        {/* Kabid Qur'an */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 56 }}>Kabid Qur&apos;an,</div>
          <div style={{ borderBottom: '1px solid #000', marginBottom: 6 }}>&nbsp;</div>
          {namaKabid ? (
            <div style={{ fontWeight: 700 }}>{namaKabid}</div>
          ) : (
            <div style={{ color: '#999' }}>( _________________ )</div>
          )}
        </div>
      </div>

      {/* Kepala Sekolah */}
      <div style={{ textAlign: 'center', fontSize: '12px' }}>
        <div style={{ marginBottom: 4 }}>Mengetahui:</div>
        <div style={{ marginBottom: 56, fontStyle: 'italic' }}>
          Kepala {profil.nama_sekolah ?? profil.nama_lembaga ?? 'Sekolah'}
        </div>
        <div style={{ display: 'inline-block', minWidth: 220 }}>
          <div style={{ borderBottom: '1px solid #000', marginBottom: 6 }}>&nbsp;</div>
          {namaKepalaSekolah ? (
            <div style={{ fontWeight: 700 }}>{namaKepalaSekolah}</div>
          ) : (
            <div style={{ color: '#999' }}>( _________________ )</div>
          )}
        </div>
      </div>
    </div>
  );
});
PrintContent.displayName = 'PrintContent';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RaportTahfidzPrintable({ raport, hideButtons }: { raport: RaportTahfidzData; hideButtons?: boolean }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [profil, setProfil] = useState<ProfilData>({});
  const detail = (raport.raport_tahfidz_detail ?? []).sort((a, b) => a.urutan - b.urutan);

  useEffect(() => {
    fetch('/api/website/profil')
      .then(r => r.json())
      .then(d => { if (d.data) setProfil(d.data); })
      .catch(() => {});
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Raport_Tahfidz_${raport.santri?.nama ?? 'Siswa'}_${raport.periode}`,
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

      {/* Preview */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        {/* Header info */}
        <div className="bg-emerald-700 px-4 py-2.5 flex items-center justify-between">
          <p className="text-white text-sm font-semibold">Preview Raport Tahfidz</p>
          <span className="text-emerald-200 text-xs">{raport.santri?.nama} · {raport.periode}</span>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {/* Identitas */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Nama</p>
              <p className="font-semibold text-slate-800">{raport.santri?.nama ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">NISN</p>
              <p className="font-mono text-slate-700">{raport.santri?.nisn ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Kelas</p>
              <p className="text-slate-700">{raport.santri?.classes?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Periode</p>
              <p className="text-slate-700">{raport.periode} · {raport.tahun_ajaran}</p>
            </div>
            {raport.juz && (
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Juz</p>
                <p className="text-slate-700">Juz {raport.juz}</p>
              </div>
            )}
          </div>

          {/* Tabel surah */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left border-b border-slate-200 text-slate-500 uppercase w-8">No</th>
                  <th className="px-3 py-2 text-left border-b border-slate-200 text-slate-500 uppercase">Surah</th>
                  <th className="px-3 py-2 text-center border-b border-slate-200 text-slate-500 uppercase w-14">Makhroj</th>
                  <th className="px-3 py-2 text-center border-b border-slate-200 text-slate-500 uppercase w-14">Tajwid</th>
                  <th className="px-3 py-2 text-center border-b border-slate-200 text-slate-500 uppercase w-14">Lancar</th>
                  <th className="px-3 py-2 text-center border-b border-slate-200 text-slate-500 uppercase w-20">Wafa Buku</th>
                  <th className="px-3 py-2 text-center border-b border-slate-200 text-slate-500 uppercase w-20">Wafa Hal.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.map((row, i) => (
                  <tr key={row.id ?? i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.nama_surah}</td>
                    <td className={`px-3 py-2 text-center font-bold ${getNilaiColor(row.makhroj)}`}>{row.makhroj || '—'}</td>
                    <td className={`px-3 py-2 text-center font-bold ${getNilaiColor(row.tajwid)}`}>{row.tajwid || '—'}</td>
                    <td className={`px-3 py-2 text-center font-bold ${getNilaiColor(row.lancar)}`}>{row.lancar || '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{row.wafa_buku || '—'}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{row.wafa_halaman || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Catatan */}
          {raport.catatan && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Catatan Ustadz/ah</p>
              <p className="text-sm text-slate-700 italic leading-relaxed">&ldquo;{raport.catatan}&rdquo;</p>
            </div>
          )}

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
            <span><strong className="text-emerald-600">✓</strong> = Hafal</span>
            <span><strong className="text-blue-600">A</strong> = Sangat Baik</span>
            <span><strong className="text-indigo-600">B</strong> = Baik</span>
            <span><strong className="text-amber-600">C</strong> = Cukup Baik</span>
            <span><strong className="text-red-600">D</strong> = Kurang Baik</span>
          </div>
        </div>
      </div>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <PrintContent
          ref={printRef}
          raport={raport}
          profil={profil}
        />
      </div>
    </div>
  );
}
