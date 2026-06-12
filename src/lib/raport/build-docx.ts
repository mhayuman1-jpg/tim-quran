import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { ProfilExportData, RaportDetailRow, RaportExportData } from '@/lib/raport/fetch-raport-data';

const FONT = 'Times New Roman';
const MM_TO_TWIP = 56.7;
const PAGE_MARGIN = Math.round(5 * MM_TO_TWIP);

const borders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
};

function run(text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean; underline?: boolean } = {}) {
  return new TextRun({
    text: text || '—',
    font: FONT,
    size: opts.size ?? 20,
    bold: opts.bold,
    color: opts.color,
    italics: opts.italics,
    underline: opts.underline ? {} : undefined,
  });
}

function para(children: TextRun | TextRun[], align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT, spacing?: { before?: number; after?: number }) {
  const runs = Array.isArray(children) ? children : [children];
  return new Paragraph({ alignment: align, spacing, children: runs });
}

function headerCellParagraph(text: string, align = AlignmentType.CENTER, color?: string) {
  return new Paragraph({
    alignment: align,
    children: [run(text, { bold: true, size: 19, color })],
  });
}

function bodyCellParagraph(
  text: string,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  bold = false,
) {
  return new Paragraph({
    alignment: align,
    children: [run(text || '', { bold, size: 20 })],
  });
}

type CellChild = Paragraph | Table;

function makeCell(
  content: CellChild | CellChild[],
  opts: { widthPct?: number; columnSpan?: number; rowSpan?: number; shading?: string } = {},
) {
  const children = Array.isArray(content) ? content : [content];
  return new TableCell({
    borders,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { fill: opts.shading } : undefined,
    children,
  });
}

function imageType(url: string, buffer: Buffer): 'jpg' | 'png' | 'gif' | 'bmp' {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) return 'jpg';
  return 'png';
}

const IMAGE_FETCH_TIMEOUT_MS = 4000;

async function loadImage(url?: string | null): Promise<{ data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' } | null> {
  if (!url) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    return { data, type: imageType(url, data) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveDate(raport: RaportExportData): string {
  if (raport.tanggal) return raport.tanggal;
  const d = raport.created_at ? new Date(raport.created_at) : new Date();
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function resolveKota(raport: RaportExportData, profil: ProfilExportData | null): string {
  if (raport.lokasi) return raport.lokasi;
  if (/dompu/i.test(profil?.nama_sekolah ?? '')) return 'Dompu';
  const parts = profil?.alamat?.split(',').map((p) => p.trim()).filter(Boolean) ?? [];
  return parts.length > 0 ? parts[parts.length - 1] : 'Dompu';
}

function buildHeader(
  profil: ProfilExportData | null,
  logoSekolah?: { data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' } | null,
  logoTim?: { data: Buffer; type: 'jpg' | 'png' | 'gif' | 'bmp' } | null,
): Table {
  const schoolName = profil?.nama_sekolah ?? profil?.nama_lembaga ?? 'SD ISLAM TERPADU AL-HILMI';
  const alamat = profil?.alamat ?? 'Lingk. Jado RT.09 Kel. Dorotangga Dompu - NTB';

  const logoLeft = logoSekolah
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: logoSekolah.data, transformation: { width: 68, height: 68 }, type: logoSekolah.type })],
      })
    : para(run('LOGO\nSEKOLAH', { bold: true, size: 14 }), AlignmentType.CENTER);

  const logoRight = logoTim
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ data: logoTim.data, transformation: { width: 63, height: 63 }, type: logoTim.type })],
      })
    : para(run('LOGO\nTIM', { bold: true, size: 12 }), AlignmentType.CENTER);

  const centerBlock = [
    para(run(schoolName, { bold: true, size: 40, color: 'CC0000' }), AlignmentType.CENTER),
    para(run('Sekolah Terpadu Dengan Pendidikan Berkarakter', { bold: true, italics: true, size: 20, color: '166534' }), AlignmentType.CENTER, { after: 60 }),
    para([run('Alamat : ', { bold: true, size: 16 }), run(alamat, { size: 16 })], AlignmentType.CENTER),
    para([run('✉ sditah.asshoff@gmail.com    ', { size: 16 }), run('📘 Sdit Al-Hilmi Dompu', { size: 16 })], AlignmentType.CENTER),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          makeCell(logoLeft, { widthPct: 15 }),
          makeCell(centerBlock, { widthPct: 70 }),
          makeCell(logoRight, { widthPct: 15 }),
        ],
      }),
    ],
  });
}

function buildIdentitasTable(raport: RaportExportData): Table {
  const siswa = raport.santri;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          makeCell(para(run('Nama', { size: 20 })), { widthPct: 12 }),
          makeCell(para(run(':', { size: 20 })), { widthPct: 2 }),
          makeCell(para(run(siswa?.nama ?? '—', { bold: true, size: 20 })), { widthPct: 34 }),
          makeCell(para(run('Kelas/Semester', { size: 20 })), { widthPct: 18 }),
          makeCell(para(run(':', { size: 20 })), { widthPct: 2 }),
          makeCell(para(run(`${siswa?.classes?.name ?? '—'} / ${raport.periode ?? '—'}`, { size: 20 })), { widthPct: 32 }),
        ],
      }),
      new TableRow({
        children: [
          makeCell(para(run('NIS / NISN', { size: 20 }))),
          makeCell(para(run(':', { size: 20 }))),
          makeCell(para(run(siswa?.nisn ?? '—', { size: 20 }))),
          makeCell(para(run('Tahun Ajaran', { size: 20 }))),
          makeCell(para(run(':', { size: 20 }))),
          makeCell(para(run(raport.tahun_ajaran ?? '—', { size: 20 }))),
        ],
      }),
      new TableRow({
        children: [
          makeCell(para(run('Juz', { size: 20 }))),
          makeCell(para(run(':', { size: 20 }))),
          makeCell(para(run(raport.juz != null ? String(raport.juz) : '—', { size: 20 }))),
          makeCell(para(run('', { size: 20 }))),
          makeCell(para(run('', { size: 20 }))),
          makeCell(para(run('', { size: 20 }))),
        ],
      }),
    ],
  });
}

function buildTahfidzTable(details: RaportDetailRow[]): Table {
  const sorted = [...details].sort((a, b) => a.urutan - b.urutan);
  const headerShade = 'F5F5F5';

  const rows: TableRow[] = [
    new TableRow({
      children: [
        makeCell(headerCellParagraph('No.'), { rowSpan: 2, widthPct: 8, shading: headerShade }),
        makeCell(headerCellParagraph('Surah'), { rowSpan: 2, widthPct: 32, shading: headerShade }),
        makeCell(headerCellParagraph('Nilai Tahfidz'), { columnSpan: 3, shading: headerShade }),
      ],
    }),
    new TableRow({
      children: [
        makeCell(headerCellParagraph('Makhroj', AlignmentType.CENTER, 'CC0000'), { shading: headerShade }),
        makeCell(headerCellParagraph('Tajwid'), { shading: headerShade }),
        makeCell(headerCellParagraph('Lancar'), { shading: headerShade }),
      ],
    }),
  ];

  if (sorted.length === 0) {
    rows.push(
      new TableRow({
        children: [
          makeCell(bodyCellParagraph('Belum ada data surah', AlignmentType.CENTER), { columnSpan: 5 }),
        ],
      }),
    );
  } else {
    sorted.forEach((row, i) => {
      rows.push(
        new TableRow({
          children: [
            makeCell(bodyCellParagraph(String(i + 1), AlignmentType.CENTER)),
            makeCell(bodyCellParagraph(row.nama_surah, AlignmentType.LEFT)),
            makeCell(bodyCellParagraph(row.makhroj ?? '', AlignmentType.CENTER, true)),
            makeCell(bodyCellParagraph(row.tajwid ?? '', AlignmentType.CENTER, true)),
            makeCell(bodyCellParagraph(row.lancar ?? '', AlignmentType.CENTER, true)),
          ],
        }),
      );
    });
  }

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function buildTahsinSection(raport: RaportExportData): (Paragraph | Table)[] {
  const headerShade = 'F5F5F5';
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeCell(headerCellParagraph('Metode'), { widthPct: 33, shading: headerShade }),
          makeCell(headerCellParagraph('Buku'), { widthPct: 33, shading: headerShade }),
          makeCell(headerCellParagraph('Halaman'), { widthPct: 34, shading: headerShade }),
        ],
      }),
      new TableRow({
        children: [
          makeCell(bodyCellParagraph(raport.tahsin_metode ?? '—', AlignmentType.CENTER, true)),
          makeCell(bodyCellParagraph(raport.tahsin_buku ?? '—', AlignmentType.CENTER, true)),
          makeCell(bodyCellParagraph(raport.tahsin_halaman ?? '—', AlignmentType.CENTER, true)),
        ],
      }),
    ],
  });

  const nilaiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeCell(headerCellParagraph('Makharijul Huruf'), { widthPct: 33, shading: headerShade }),
          makeCell(headerCellParagraph('Tajwid'), { widthPct: 33, shading: headerShade }),
          makeCell(headerCellParagraph('Kelancaran'), { widthPct: 34, shading: headerShade }),
        ],
      }),
      new TableRow({
        children: [
          makeCell(bodyCellParagraph(raport.tahsin_makhroj ?? '—', AlignmentType.CENTER, true)),
          makeCell(bodyCellParagraph(raport.tahsin_adab ?? '—', AlignmentType.CENTER, true)),
          makeCell(bodyCellParagraph(raport.tahsin_kelancaran ?? '—', AlignmentType.CENTER, true)),
        ],
      }),
    ],
  });

  return [
    para(run('Penilaian Tahsin', { bold: true, size: 20 }), AlignmentType.LEFT, { before: 120, after: 60 }),
    metaTable,
    para(run('', { size: 8 }), AlignmentType.LEFT, { after: 60 }),
    nilaiTable,
  ];
}

function buildCatatanKeterangan(raport: RaportExportData): Table {
  const catatanText = raport.catatan ? `"${raport.catatan}"` : '—';
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            width: { size: 68, type: WidthType.PERCENTAGE },
            children: [
              para(run('Catatan Ustadz/ah', { bold: true, size: 20 }), AlignmentType.LEFT, { after: 40 }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  new TableRow({
                    children: [makeCell(para(run(catatanText, { size: 20 })), { shading: 'F9FAFB' })],
                  }),
                ],
              }),
            ],
          }),
          makeCell(
            [
              para(run('Keterangan Penilaian :', { bold: true, size: 18 }), AlignmentType.LEFT, { after: 40 }),
              para([run('A', { bold: true, size: 18 }), run(' = Sangat Baik', { size: 18 })]),
              para([run('B', { bold: true, size: 18 }), run(' = Baik', { size: 18 })]),
              para([run('C', { bold: true, size: 18 }), run(' = Cukup', { size: 18 })]),
              para([run('D', { bold: true, size: 18 }), run(' = Kurang', { size: 18 })]),
              para([run('L', { bold: true, size: 18 }), run(' = Lancar', { size: 18 })]),
              para([run('KL', { bold: true, size: 18 }), run(' = Kurang Lancar', { size: 18 })]),
              para([run('TL', { bold: true, size: 18 }), run(' = Tidak Lancar', { size: 18 })]),
            ],
            { widthPct: 32 },
          ),
        ],
      }),
    ],
  });
}

function buildSignatureBlock(raport: RaportExportData, kota: string, tanggal: string): (Paragraph | Table)[] {
  const guru = raport.nama_guru_kelas || raport.users?.name;
  const kabid = raport.nama_kabid;
  const kepala = raport.nama_kepala_sekolah;

  const signTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          makeCell([
            para(run('Guru Kelas,', { size: 20 }), AlignmentType.CENTER),
            para(run('', { size: 20 }), AlignmentType.CENTER, { before: 400, after: 40 }),
            guru
              ? para(run(guru, { bold: true, underline: true, size: 20 }), AlignmentType.CENTER)
              : para(run('________________________', { size: 20 }), AlignmentType.CENTER),
            raport.niy_guru_kelas ? para(run(raport.niy_guru_kelas, { size: 18 }), AlignmentType.CENTER) : para(run('', { size: 18 })),
          ], { widthPct: 50 }),
          makeCell([
            para(run("Kabid Qur'an,", { size: 20 }), AlignmentType.CENTER),
            para(run('', { size: 20 }), AlignmentType.CENTER, { before: 400, after: 40 }),
            kabid
              ? para(run(kabid, { bold: true, underline: true, size: 20 }), AlignmentType.CENTER)
              : para(run('________________________', { size: 20 }), AlignmentType.CENTER),
            raport.niy_kabid ? para(run(raport.niy_kabid, { size: 18 }), AlignmentType.CENTER) : para(run('', { size: 18 })),
          ], { widthPct: 50 }),
        ],
      }),
    ],
  });

  return [
    para([run(kota, { underline: true, size: 20 }), run(`, ${tanggal}`, { size: 20 })], AlignmentType.RIGHT, { before: 160, after: 120 }),
    signTable,
    para(run('Mengetahui;', { size: 20 }), AlignmentType.CENTER, { before: 120 }),
    para(run('Kepala SD IT Al Hilmi Dompu,', { italics: true, size: 18 }), AlignmentType.CENTER, { after: 40 }),
    para(run('', { size: 20 }), AlignmentType.CENTER, { before: 400, after: 40 }),
    kepala
      ? para(run(kepala, { bold: true, underline: true, size: 20 }), AlignmentType.CENTER)
      : para(run('________________________', { size: 20 }), AlignmentType.CENTER),
    raport.niy_kepala_sekolah ? para(run(raport.niy_kepala_sekolah, { size: 18 }), AlignmentType.CENTER) : para(run('', { size: 18 })),
  ];
}

export async function buildRaportDocx(
  raport: RaportExportData,
  profil: ProfilExportData | null,
): Promise<Buffer> {
  const [logoSekolah, logoTim] = await Promise.all([
    loadImage(profil?.logo_sekolah_url),
    loadImage(profil?.logo_url),
  ]);

  const details = raport.raport_tahfidz_detail ?? [];
  const kota = resolveKota(raport, profil);
  const tanggal = resolveDate(raport);
  const schoolFooter = profil?.nama_sekolah ?? profil?.nama_lembaga ?? '';

  const children: (Paragraph | Table)[] = [
    buildHeader(profil, logoSekolah, logoTim),
    para(run('', { size: 8 }), AlignmentType.LEFT, { after: 80 }),
    para(run('Raport Tahfidz & Tahsin', { bold: true, size: 24, underline: true, color: 'CC0000' }), AlignmentType.CENTER, { before: 80, after: 120 }),
    buildIdentitasTable(raport),
    para(run('Penilaian Tahfidz', { bold: true, size: 20 }), AlignmentType.LEFT, { before: 120, after: 60 }),
    buildTahfidzTable(details),
    ...buildTahsinSection(raport),
    para(run('', { size: 8 }), AlignmentType.LEFT, { before: 120 }),
    buildCatatanKeterangan(raport),
    ...buildSignatureBlock(raport, kota, tanggal),
    new Paragraph({
      spacing: { before: 200 },
      tabStops: [{ type: AlignmentType.LEFT, position: 0 }, { type: AlignmentType.RIGHT, position: 9000 }],
      children: [
        run(schoolFooter, { italics: true, size: 14, color: '555555' }),
        new TextRun({ children: ['\t'] }),
        run(`Raport Tahfidz & Tahsin — ${raport.tahun_ajaran}`, { italics: true, size: 14, color: '555555' }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: Math.round(210 * MM_TO_TWIP),
              height: Math.round(330 * MM_TO_TWIP),
            },
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
