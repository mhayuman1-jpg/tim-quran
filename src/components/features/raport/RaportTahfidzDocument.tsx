import React from 'react';
import type { RaportTahfidzData, DetailSurahData, ProfilRaportData } from './raport-tahfidz-types';
import { isJuz30Raport } from '@/lib/raport/print-config';

export type { RaportTahfidzData, DetailSurahData, ProfilRaportData } from './raport-tahfidz-types';

// ─── Table cell styles (Penilaian Tahfidz only) ─────────────────────────────

const cell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  border: '1px solid #000',
  padding: '4px 6px',
  verticalAlign: 'middle',
  ...extra,
});

const headerCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...cell({
    background: '#f5f5f5',
    fontWeight: 700,
    fontSize: '9.5px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    textAlign: 'center',
  }),
  ...extra,
});

const bodyCell = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  ...cell({
    fontSize: '10px',
    padding: '4px 6px',
  }),
  ...extra,
});

function ScoreBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        border: '1px solid #000',
        background: '#f5f5f5',
        fontWeight: 700,
        fontSize: '9.5px',
        textAlign: 'center',
        padding: '4px 6px',
      }}>{title}</div>
      <div style={{
        border: '1px solid #000',
        borderTop: 'none',
        textAlign: 'center',
        fontWeight: 700,
        padding: '4px 6px',
        fontSize: '10px',
      }}>{children}</div>
    </div>
  );
}

function RaportPageLayout({
  multiPage,
  headerSection,
  tailSection,
  footer,
}: {
  multiPage: boolean;
  headerSection: React.ReactNode;
  tailSection: React.ReactNode;
  footer: React.ReactNode;
}) {
  const sheetClass = multiPage
    ? 'raport-page-sheet raport-page-sheet--flow'
    : 'raport-page-sheet raport-page-sheet--fill';

  return (
    <div className={sheetClass}>
      <div className="raport-page-body">
        {headerSection}
        {tailSection}
      </div>
      {footer}
    </div>
  );
}

// ─── Document ────────────────────────────────────────────────────────────────

export interface RaportTahfidzDocumentProps {
  raport: RaportTahfidzData;
  profil: ProfilRaportData;
  inlineEdit?: boolean;
  onInlineChange?: (field: keyof RaportTahfidzData, value: string | null) => void;
  onInlineDetailChange?: (index: number, field: keyof DetailSurahData, value: string | null) => void;
  onInlineAddRow?: () => void;
  onInlineRemoveRow?: (index: number) => void;
}

const RaportTahfidzDocument = React.forwardRef<HTMLDivElement, RaportTahfidzDocumentProps>(
  (
    {
      raport,
      profil,
      inlineEdit = false,
      onInlineChange,
      onInlineDetailChange,
      onInlineAddRow,
      onInlineRemoveRow,
    },
    ref,
  ) => {
    const siswa = raport.santri;
    const guru = raport.users;
    const detail = (raport.raport_tahfidz_detail ?? [])
      .slice()
      .sort((a, b) => a.urutan - b.urutan);

    const namaGuruKelas = raport.nama_guru_kelas || guru?.name || null;
    const niyGuruKelas = raport.niy_guru_kelas || null;
    const namaKabid = raport.nama_kabid || null;
    const niyKabid = raport.niy_kabid || null;
    const namaKepalaSekolah = raport.nama_kepala_sekolah || null;
    const niyKepalaSekolah = raport.niy_kepala_sekolah || null;

    const reportDate = raport.created_at ? new Date(raport.created_at) : new Date();
    const today = reportDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const editableInputStyle: React.CSSProperties = {
      width: '100%',
      border: inlineEdit ? '1px solid #999' : 'transparent',
      borderRadius: 4,
      padding: '2px 4px',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      background: inlineEdit ? '#fff' : 'transparent',
      color: '#000',
      outline: inlineEdit ? 'none' : 'none',
    };

    const editableTextareaStyle: React.CSSProperties = {
      width: '100%',
      minHeight: 50,
      border: inlineEdit ? '1px solid #999' : 'transparent',
      borderRadius: 4,
      padding: '6px 8px',
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
        return (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              minHeight: 50,
              padding: '6px 0',
              fontSize: '10px',
            }}
          >
            {value ? `"${value}"` : '—'}
          </div>
        );
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

    const kotaFromSchool = /dompu/i.test(profil.nama_sekolah ?? '') ? 'Dompu' : undefined;
    const alamatParts = profil.alamat?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];
    const kotaRaw = alamatParts.length > 0 ? alamatParts[alamatParts.length - 1] : '';
    const kota = (raport.lokasi ?? kotaFromSchool ?? kotaRaw) || 'Dompu';
    const tanggal = raport.tanggal ?? today;

    const n = detail.length;
    const multiPage = isJuz30Raport(raport.juz);

    if (raport.html_custom?.trim()) {
      return (
        <div
          className="raport-print-root raport-custom-html"
          ref={ref}
          data-raport-id={raport.id}
          dangerouslySetInnerHTML={{ __html: raport.html_custom }}
        />
      );
    }

    const footerBlock = (
      <div className="raport-page-footer">
        <div className="raport-page-footer-lines">
          <div style={{ height: '1px', background: '#000' }} />
          <div style={{ height: '2px', background: '#000', marginTop: '2px' }} />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '7px',
            color: '#555',
            marginTop: '3px',
            fontStyle: 'italic',
          }}
        >
          <span>{profil.nama_sekolah ?? profil.nama_lembaga ?? ''}</span>
          <span>Raport Tahfidz &amp; Tahsin — {raport.tahun_ajaran}</span>
        </div>
      </div>
    );

    const headerSection = (
      <>
        {/* ══ HEADER SEKOLAH ════════════════════════════════════════════════ */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Logo sekolah kiri */}
            <div style={{ width: 90, height: 90, flexShrink: 0 }}>
              {profil.logo_sekolah_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profil.logo_sekolah_url}
                  alt="Logo"
                  width={90}
                  height={90}
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: '50%',
                    background: '#1a5c2a',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '3px solid #fbbf24',
                  }}
                >
                  <span
                    style={{
                      color: '#fbbf24',
                      fontSize: '7px',
                      fontWeight: 900,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    LOGO
                    <br />
                    SEKOLAH
                  </span>
                </div>
              )}
            </div>

            {/* Tengah: nama + tagline + garis + alamat */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#cc0000',
                  lineHeight: 1.1,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  fontFamily: '"Times New Roman", serif',
                }}
              >
                {profil.nama_sekolah ?? profil.nama_lembaga ?? 'SD ISLAM TERPADU AL-HILMI'}
              </div>

              <div
                style={{
                  fontSize: '10px',
                  fontStyle: 'italic',
                  fontWeight: 700,
                  color: '#166534',
                  marginTop: '1px',
                }}
              >
                Sekolah Terpadu Dengan Pendidikan Berkarakter
              </div>

              <div
                style={{
                  display: 'flex',
                  height: '3px',
                  margin: '3px auto',
                  borderRadius: '2px',
                  width: '90%',
                }}
              >
                <div style={{ flex: 4, background: '#cc0000' }} />
                <div style={{ flex: 1, background: '#16a34a' }} />
              </div>

              <div style={{ fontSize: '8px', color: '#333', lineHeight: 1.4, textAlign: 'center' }}>
                <span style={{ fontWeight: 700 }}>Alamat : </span>
                {profil.alamat ? profil.alamat : 'Lingk. Jado RT.09 Kel. Dorotangga Dompu - NTB'}
              </div>
              <div style={{ fontSize: '8px', color: '#333', lineHeight: 1.3, textAlign: 'center' }}>
                <span style={{ marginRight: 6 }}>✉ sditah.asshoff@gmail.com</span>
                <span>📘 Sdit Al-Hilmi Dompu</span>
              </div>
            </div>

            {/* Logo tim kanan */}
            <div style={{ width: 85, height: 85, flexShrink: 0 }}>
              {profil.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profil.logo_url}
                  alt="Logo Tim"
                  width={85}
                  height={85}
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                  loading="eager"
                  decoding="sync"
                />
              ) : (
                <div
                  style={{
                    width: 85,
                    height: 85,
                    borderRadius: '50%',
                    background: '#1e3a5f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #93c5fd',
                  }}
                >
                  <span style={{ color: '#93c5fd', fontSize: '6px', fontWeight: 900, textAlign: 'center' }}>
                    LOGO
                    <br />
                    TIM
                  </span>
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '2px', background: '#000', marginTop: '5px' }} />
          <div style={{ height: '1px', background: '#000', marginTop: '1.5px' }} />
        </div>

        {/* ══ JUDUL ═════════════════════════════════════════════════════════ */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '3px',
            textDecoration: 'underline',
            textDecorationColor: '#cc0000',
            textUnderlineOffset: '3px',
            color: '#000',
            margin: '6px 0 8px',
            textTransform: 'uppercase',
          }}
        >
          Raport Tahfidz &amp; Tahsin
        </div>

        {/* ══ IDENTITAS SISWA ═══════════════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '2px 24px',
            marginBottom: '8px',
            fontSize: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: 4, lineHeight: 1.5 }}>
            <span style={{ minWidth: 72 }}>Nama</span>
            <span>:</span>
            <span style={{ fontWeight: 700, flex: 1 }}>{siswa?.nama ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, lineHeight: 1.5 }}>
            <span style={{ minWidth: 72 }}>Kelas/Semester</span>
            <span>:</span>
            <span style={{ flex: 1 }}>
              {siswa?.classes?.name ?? '—'} / {renderEditableText('periode', raport.periode, '—')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, lineHeight: 1.5 }}>
            <span style={{ minWidth: 72 }}>NIS / NISN</span>
            <span>:</span>
            <span style={{ flex: 1 }}>{siswa?.nisn ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, lineHeight: 1.5 }}>
            <span style={{ minWidth: 72 }}>Tahun Ajaran</span>
            <span>:</span>
            <span style={{ flex: 1 }}>{renderEditableText('tahun_ajaran', raport.tahun_ajaran, '—')}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, lineHeight: 1.5 }}>
            <span style={{ minWidth: 72 }}>Juz</span>
            <span>:</span>
            <span style={{ flex: 1 }}>
              {renderEditableText('juz', raport.juz ? String(raport.juz) : null, '—')}
            </span>
          </div>
          <div />
        </div>

        {/* ══ TABEL PENILAIAN TAHFIDZ (satu-satunya table) ═════════════════ */}
        <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '10px' }}>Penilaian Tahfidz</div>
        <table
          className="raport-tahfidz-table"
          style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '10px' }}
        >
          <thead>
            <tr>
              <th rowSpan={2} style={headerCell({ width: 30, textAlign: 'center' })}>
                No.
              </th>
              <th rowSpan={2} style={headerCell()}>
                Surah
              </th>
              <th colSpan={3} style={headerCell({ width: 200 })}>
                Nilai Tahfidz
              </th>
              {inlineEdit && <th rowSpan={2} style={headerCell({ width: 60 })}>Aksi</th>}
            </tr>
            <tr>
              <th style={headerCell({ width: 50, color: '#cc0000', textDecoration: 'underline' })}>
                Makhroj
              </th>
              <th style={headerCell({ width: 50 })}>Tajwid</th>
              <th style={headerCell({ width: 50 })}>Lancar</th>
            </tr>
          </thead>
          <tbody>
            {n === 0 ? (
              <tr>
                <td
                  colSpan={inlineEdit ? 6 : 5}
                  style={bodyCell({ textAlign: 'center', color: '#666', padding: '8px' })}
                >
                  Belum ada data surah
                </td>
              </tr>
            ) : (
              detail.map((row, i) => (
                <tr key={row.id ?? i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={bodyCell({ textAlign: 'center' })}>{i + 1}</td>
                  <td style={bodyCell({ textAlign: 'left' })}>
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={row.nama_surah}
                        onChange={(event) =>
                          onInlineDetailChange?.(i, 'nama_surah', event.target.value || null)
                        }
                        style={{ ...editableInputStyle, textAlign: 'left' }}
                        placeholder="Nama surah"
                      />
                    ) : (
                      row.nama_surah
                    )}
                  </td>
                  <td style={bodyCell({ textAlign: 'center', fontWeight: 700 })}>
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={row.makhroj ?? ''}
                        onChange={(event) =>
                          onInlineDetailChange?.(i, 'makhroj', event.target.value || null)
                        }
                        style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                        placeholder="A/B/✓"
                      />
                    ) : (
                      row.makhroj || ''
                    )}
                  </td>
                  <td style={bodyCell({ textAlign: 'center', fontWeight: 700 })}>
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={row.tajwid ?? ''}
                        onChange={(event) =>
                          onInlineDetailChange?.(i, 'tajwid', event.target.value || null)
                        }
                        style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                        placeholder="A/B/✓"
                      />
                    ) : (
                      row.tajwid || ''
                    )}
                  </td>
                  <td style={bodyCell({ textAlign: 'center', fontWeight: 700 })}>
                    {inlineEdit ? (
                      <input
                        type="text"
                        value={row.lancar ?? ''}
                        onChange={(event) =>
                          onInlineDetailChange?.(i, 'lancar', event.target.value || null)
                        }
                        style={{ ...editableInputStyle, width: '100%', textAlign: 'center' }}
                        placeholder="A/B/✓"
                      />
                    ) : (
                      row.lancar || ''
                    )}
                  </td>
                  {inlineEdit && (
                    <td style={bodyCell({ textAlign: 'center' })}>
                      <button
                        type="button"
                        onClick={() => onInlineRemoveRow?.(i)}
                        style={{
                          border: '1px solid #333',
                          background: '#fff',
                          color: '#333',
                          padding: '3px 6px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: '9px',
                        }}
                      >
                        Hapus
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {inlineEdit && (
          <div
            className="raport-inline-edit-only"
            style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}
          >
            <button
              type="button"
              onClick={onInlineAddRow}
              style={{
                border: '1px solid #000',
                background: '#fff',
                padding: '4px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '10px',
              }}
            >
              Tambah Baris Surah
            </button>
          </div>
        )}

      </>
    );

    const tailSection = (
      <>
        {/* ══ PENILAIAN TAHSIN ═══════════════════════════════════════════════ */}
        <div style={{ fontSize: '10px', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '10px' }}>Penilaian Tahsin</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <ScoreBox title="Metode">{renderEditableText('tahsin_metode', raport.tahsin_metode, '—')}</ScoreBox>
            <ScoreBox title="Buku">{renderEditableText('tahsin_buku', raport.tahsin_buku, '—')}</ScoreBox>
            <ScoreBox title="Halaman">{renderEditableText('tahsin_halaman', raport.tahsin_halaman, '—')}</ScoreBox>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <ScoreBox title="Makharijul Huruf">
              {renderEditableText('tahsin_makhroj', raport.tahsin_makhroj, '—')}
            </ScoreBox>
            <ScoreBox title="Tajwid">{renderEditableText('tahsin_adab', raport.tahsin_adab, '—')}</ScoreBox>
            <ScoreBox title="Kelancaran">
              {renderEditableText('tahsin_kelancaran', raport.tahsin_kelancaran, '—')}
            </ScoreBox>
          </div>
        </div>

        {/* ══ CATATAN USTADZ/AH + KETERANGAN ════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 200px',
            gap: '0 12px',
            fontSize: '10px',
            marginBottom: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: '4px', fontSize: '10px' }}>Catatan Ustadz/ah</div>
            <div
              style={{
                minHeight: '60px',
                padding: '6px 8px',
                border: '1px solid #000',
                lineHeight: 1.4,
                background: '#f9fafb',
                fontSize: '10px',
              }}
            >
              {renderEditableTextarea('catatan', raport.catatan, '—')}
            </div>
          </div>

          <div style={{ fontSize: '9px' }}>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>Keterangan :</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: 1.3 }}>
              <span>
                <strong>A</strong> = Sangat Baik
              </span>
              <span>
                <strong>B</strong> = Baik
              </span>
              <span>
                <strong>C</strong> = Cukup Baik
              </span>
              <span>
                <strong>D</strong> = Kurang Baik
              </span>
            </div>
          </div>
        </div>

        {/* ══ TANGGAL ═══════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'right', fontSize: '10px', marginBottom: '4px' }}>
          {inlineEdit ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                value={kota}
                onChange={(event) => onInlineChange?.('lokasi', event.target.value || null)}
                style={{ ...editableInputStyle, width: 100, textAlign: 'left' }}
                placeholder="Dompu"
              />
              ,
              <input
                type="text"
                value={tanggal}
                onChange={(event) => onInlineChange?.('tanggal', event.target.value || null)}
                style={{ ...editableInputStyle, width: 140, textAlign: 'left' }}
                placeholder="7 Juni 2026"
              />
            </span>
          ) : (
            <span style={{ textDecoration: 'underline' }}>{kota}</span>
          )}
          {!inlineEdit && `, ${tanggal}`}
        </div>

        {/* ══ TANDA TANGAN GURU & KABID ═════════════════════════════════════ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 20px',
            fontSize: '10px',
            marginBottom: '12px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 2, fontSize: '10px' }}>Guru Kelas,</div>
            <div style={{ height: 45 }} />
            {namaGuruKelas ? (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textDecorationThickness: '1px',
                    textUnderlineOffset: '2px',
                    marginBottom: 1,
                    fontSize: '10px',
                  }}
                >
                  {renderEditableText('nama_guru_kelas', namaGuruKelas, 'Nama Guru Kelas', {
                    display: 'block',
                    width: '100%',
                  })}
                </div>
                {renderEditableText('niy_guru_kelas', niyGuruKelas, 'NIY Guru Kelas', {
                  fontSize: '9px',
                  color: '#222',
                  display: 'block',
                })}
              </>
            ) : (
              <div style={{ borderBottom: '1px solid #000', margin: '0 auto', width: '75%', paddingTop: 2 }} />
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 2, fontSize: '10px' }}>Kabid Qur&apos;an,</div>
            <div style={{ height: 45 }} />
            {namaKabid ? (
              <>
                <div
                  style={{
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textDecorationThickness: '1px',
                    textUnderlineOffset: '2px',
                    marginBottom: 1,
                    fontSize: '10px',
                  }}
                >
                  {renderEditableText('nama_kabid', namaKabid, 'Nama Kabid', {
                    display: 'block',
                    width: '100%',
                  })}
                </div>
                {renderEditableText('niy_kabid', niyKabid, 'NIY Kabid', {
                  fontSize: '9px',
                  color: '#222',
                  display: 'block',
                })}
              </>
            ) : (
              <div style={{ borderBottom: '1px solid #000', margin: '0 auto', width: '75%', paddingTop: 2 }} />
            )}
          </div>
        </div>

        {/* ══ KEPALA SEKOLAH ════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          <div style={{ marginBottom: 1, fontSize: '10px' }}>Mengetahui;</div>
          <div style={{ fontStyle: 'italic', marginBottom: 2, fontSize: '9px' }}>
            Kepala SD IT Al Hilmi Dompu,
          </div>
          <div style={{ height: 45 }} />
          {namaKepalaSekolah ? (
            <>
              <div
                style={{
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '2px',
                  marginBottom: 1,
                  fontSize: '10px',
                  display: 'inline-block',
                }}
              >
                {renderEditableText('nama_kepala_sekolah', namaKepalaSekolah, 'Nama Kepala Sekolah', {
                  display: 'block',
                  width: '100%',
                })}
              </div>
              {renderEditableText('niy_kepala_sekolah', niyKepalaSekolah, 'NIY Kepala Sekolah', {
                fontSize: '9px',
                color: '#222',
                display: 'block',
              })}
            </>
          ) : (
            <div style={{ borderBottom: '1px solid #000', width: 180, margin: '0 auto', paddingTop: 2 }} />
          )}
        </div>

      </>
    );

    return (
      <div className="raport-print-root" ref={ref} data-raport-id={raport.id}>
        <RaportPageLayout
          multiPage={multiPage}
          headerSection={headerSection}
          tailSection={tailSection}
          footer={footerBlock}
        />
      </div>
    );
  },
);

RaportTahfidzDocument.displayName = 'RaportTahfidzDocument';

export default RaportTahfidzDocument;
