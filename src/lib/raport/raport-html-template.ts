import type { RaportTahfidzData } from '@/components/features/raport/raport-tahfidz-types';
import { isJuz30Raport } from '@/lib/raport/print-config';

interface ProfilLike {
  nama_sekolah?: string;
  nama_lembaga?: string;
  alamat?: string | null;
  logo_sekolah_url?: string | null;
  logo_url?: string | null;
}

function esc(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrEsc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

const th = 'border:1px solid #000;padding:4px 6px;vertical-align:middle;background:#f5f5f5;font-weight:700;font-size:9.5px;text-align:center;';
const td = 'border:1px solid #000;padding:4px 6px;vertical-align:middle;font-size:10px;';

function infoRow(label: string, value: string): string {
  return `<div style="display:flex;gap:4px;font-size:10px;line-height:1.5;">
    <span style="min-width:72px;">${label}</span><span>:</span>
    <span style="font-weight:700;flex:1;">${value}</span>
  </div>`;
}

function scoreBox(title: string, value: string): string {
  const head = 'border:1px solid #000;background:#f5f5f5;font-weight:700;font-size:9.5px;text-align:center;padding:4px 6px;';
  const body = 'border:1px solid #000;border-top:none;text-align:center;font-weight:700;padding:4px 6px;font-size:10px;';
  return `<div><div style="${head}">${title}</div><div style="${body}">${value}</div></div>`;
}

/** Template HTML untuk editor visual — selaras dengan RaportTahfidzDocument */
export function buildRaportHtmlTemplate(
  raport: RaportTahfidzData,
  profil: ProfilLike = {},
): string {
  const siswa = raport.santri;
  const school = profil.nama_sekolah ?? profil.nama_lembaga ?? 'SD ISLAM TERPADU AL-HILMI';
  const alamat = profil.alamat ?? 'Lingk. Jado RT.09 Kel. Dorotangga Dompu - NTB';
  const details = [...(raport.raport_tahfidz_detail ?? [])].sort((a, b) => a.urutan - b.urutan);

  const reportDate = raport.created_at ? new Date(raport.created_at) : new Date();
  const tanggal = reportDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const kota = /dompu/i.test(school) ? 'Dompu' : 'Dompu';

  const guru = raport.nama_guru_kelas || raport.users?.name || '';
  const kabid = raport.nama_kabid || '';
  const kepala = raport.nama_kepala_sekolah || '';

  const logoSekolah = profil.logo_sekolah_url
    ? `<img src="${attrEsc(profil.logo_sekolah_url)}" alt="Logo" style="width:90px;height:90px;object-fit:contain;" />`
    : '<p style="margin:0;font-size:7px;font-weight:700;text-align:center;">LOGO<br/>SEKOLAH</p>';

  const logoTim = profil.logo_url
    ? `<img src="${attrEsc(profil.logo_url)}" alt="Logo Tim" style="width:85px;height:85px;object-fit:contain;" />`
    : '<p style="margin:0;font-size:6px;font-weight:700;text-align:center;">LOGO<br/>TIM</p>';

  const tahfidzRows = details.length
    ? details.map((row, i) => `
      <tr>
        <td style="${td}text-align:center;">${i + 1}</td>
        <td style="${td}text-align:left;">${esc(row.nama_surah)}</td>
        <td style="${td}text-align:center;font-weight:700;">${esc(row.makhroj)}</td>
        <td style="${td}text-align:center;font-weight:700;">${esc(row.tajwid)}</td>
        <td style="${td}text-align:center;font-weight:700;">${esc(row.lancar)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="${td}text-align:center;color:#666;">Belum ada data surah</td></tr>`;

  const multiPage = isJuz30Raport(raport.juz);

  const footerHtml = `
  <div class="raport-page-footer">
    <div class="raport-page-footer-lines">
      <div style="height:1px;background:#000;"></div>
      <div style="height:2px;background:#000;margin-top:2px;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:7px;color:#555;font-style:italic;margin-top:3px;">
      <span>${esc(school)}</span>
      <span>Raport Tahfidz &amp; Tahsin — ${esc(raport.tahun_ajaran)}</span>
    </div>
  </div>`;

  const sheetClass = multiPage
    ? 'raport-page-sheet raport-page-sheet--flow'
    : 'raport-page-sheet raport-page-sheet--fill';

  return `
<div class="raport-doc" style="font-family:'Times New Roman',Times,serif;font-size:12px;color:#000;line-height:1.4;">
<div class="${sheetClass}"><div class="raport-page-body">

  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
    <div style="width:90px;height:90px;flex-shrink:0;text-align:center;">${logoSekolah}</div>
    <div style="flex:1;text-align:center;">
      <p style="margin:0;font-size:20px;font-weight:900;color:#cc0000;text-transform:uppercase;line-height:1.1;">${esc(school)}</p>
      <p style="margin:2px 0;font-size:10px;font-style:italic;font-weight:700;color:#166534;">Sekolah Terpadu Dengan Pendidikan Berkarakter</p>
      <div style="display:flex;height:3px;margin:3px auto;border-radius:2px;width:90%;overflow:hidden;">
        <div style="flex:4;background:#cc0000;"></div>
        <div style="flex:1;background:#16a34a;"></div>
      </div>
      <p style="margin:4px 0 0;font-size:8px;color:#333;"><strong>Alamat :</strong> ${esc(alamat)}</p>
      <p style="margin:2px 0 0;font-size:8px;color:#333;">✉ sditah.asshoff@gmail.com &nbsp; 📘 Sdit Al-Hilmi Dompu</p>
    </div>
    <div style="width:85px;height:85px;flex-shrink:0;text-align:center;">${logoTim}</div>
  </div>
  <div style="height:2px;background:#000;margin-top:5px;"></div>
  <div style="height:1px;background:#000;margin-top:1.5px;margin-bottom:8px;"></div>

  <p style="text-align:center;font-size:12px;font-weight:900;letter-spacing:3px;text-decoration:underline;text-decoration-color:#cc0000;margin:6px 0 8px;text-transform:uppercase;">Raport Tahfidz &amp; Tahsin</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 24px;margin-bottom:8px;">
    ${infoRow('Nama', esc(siswa?.nama))}
    ${infoRow('Kelas/Semester', `${esc(siswa?.classes?.name)} / ${esc(raport.periode)}`)}
    ${infoRow('NIS / NISN', esc(siswa?.nisn))}
    ${infoRow('Tahun Ajaran', esc(raport.tahun_ajaran))}
    ${infoRow('Juz', esc(raport.juz))}
    <div></div>
  </div>

  <p style="font-weight:700;font-size:10px;margin:0 0 4px;">Penilaian Tahfidz</p>
  <table class="raport-tahfidz-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:10px;">
    <thead>
      <tr>
        <th rowspan="2" style="${th}width:8%;">No.</th>
        <th rowspan="2" style="${th}">Surah</th>
        <th colspan="3" style="${th}">Nilai Tahfidz</th>
      </tr>
      <tr>
        <th style="${th}color:#cc0000;text-decoration:underline;">Makhroj</th>
        <th style="${th}">Tajwid</th>
        <th style="${th}">Lancar</th>
      </tr>
    </thead>
    <tbody>${tahfidzRows}</tbody>
  </table>

  <div style="font-size:10px;margin-bottom:12px;">
  <p style="font-weight:700;font-size:10px;margin:0 0 4px;">Penilaian Tahsin</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
    ${scoreBox('Metode', esc(raport.tahsin_metode))}
    ${scoreBox('Buku', esc(raport.tahsin_buku))}
    ${scoreBox('Halaman', esc(raport.tahsin_halaman))}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
    ${scoreBox('Makharijul Huruf', esc(raport.tahsin_makhroj))}
    ${scoreBox('Tajwid', esc(raport.tahsin_adab))}
    ${scoreBox('Kelancaran', esc(raport.tahsin_kelancaran))}
  </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 200px;gap:0 12px;font-size:10px;margin-bottom:12px;">
    <div>
      <p style="font-weight:700;margin:0 0 4px;">Catatan Ustadz/ah</p>
      <div style="min-height:60px;padding:6px 8px;border:1px solid #000;background:#f9fafb;line-height:1.4;">${raport.catatan ? `"${esc(raport.catatan)}"` : '—'}</div>
    </div>
    <div style="font-size:9px;">
      <p style="font-weight:700;margin:0 0 4px;">Keterangan Penilaian :</p>
      <p style="margin:2px 0;"><strong>A</strong> = Sangat Baik</p>
      <p style="margin:2px 0;"><strong>B</strong> = Baik</p>
      <p style="margin:2px 0;"><strong>C</strong> = Cukup</p>
      <p style="margin:2px 0;"><strong>D</strong> = Kurang</p>
      <p style="margin:2px 0;"><strong>L</strong> = Lancar</p>
      <p style="margin:2px 0;"><strong>KL</strong> = Kurang Lancar</p>
      <p style="margin:2px 0;"><strong>TL</strong> = Tidak Lancar</p>
    </div>
  </div>

  <p style="text-align:right;font-size:10px;margin:0 0 8px;"><u>${esc(kota)}</u>, ${esc(tanggal)}</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;font-size:10px;margin-bottom:12px;">
    <div style="text-align:center;">
      <p style="margin:0;">Guru Pengajar,</p>
      <div style="height:45px;"></div>
      <p style="margin:0;font-weight:700;text-decoration:underline;">${guru ? esc(guru) : '________________'}</p>
      <p style="margin:0;font-size:9px;">${esc(raport.niy_guru_kelas)}</p>
    </div>
    <div style="text-align:center;">
      <p style="margin:0;">Kabid Qur'an,</p>
      <div style="height:45px;"></div>
      <p style="margin:0;font-weight:700;text-decoration:underline;">${kabid ? esc(kabid) : '________________'}</p>
      <p style="margin:0;font-size:9px;">${esc(raport.niy_kabid)}</p>
    </div>
  </div>

  <div style="text-align:center;font-size:10px;">
    <p style="margin:0;">Mengetahui;</p>
    <p style="margin:2px 0;font-size:9px;font-style:italic;">Kepala SD IT Al Hilmi Dompu,</p>
    <div style="height:45px;"></div>
    <p style="margin:0;font-weight:700;text-decoration:underline;">${kepala ? esc(kepala) : '________________'}</p>
    <p style="margin:0;font-size:9px;">${esc(raport.niy_kepala_sekolah)}</p>
  </div>

  </div>
  ${footerHtml}
  </div>
</div>`.trim();
}
