// src/lib/excel.ts
// Helper untuk parse Excel import dan generate Excel template menggunakan xlsx

import * as xlsx from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExcelImportRow {
  nisn: string;
  nama: string;
  gender: string;
  tanggal_lahir: string | null;
  kelas: string | null;
  juz_terakhir: number;
}

export interface ExcelRowError {
  row: number;
  nisn?: string;
  nama?: string;
  alasan: string;
}

export interface ParseExcelResult {
  valid: ExcelImportRow[];
  errors: ExcelRowError[];
}

// ─── Column Aliases ───────────────────────────────────────────────────────────

const COLUMN_ALIASES: Record<keyof ExcelImportRow, string[]> = {
  nisn:         ['NISN', 'nisn', 'Nisn'],
  nama:         ['Nama Lengkap', 'Nama', 'nama', 'NAMA'],
  gender:       ['Jenis Kelamin', 'Gender', 'gender', 'L/P', 'JK'],
  tanggal_lahir:['Tanggal Lahir', 'Tgl Lahir', 'tanggal_lahir', 'TTL'],
  kelas:        ['Kelas', 'kelas', 'Class', 'KELAS'],
  juz_terakhir: ['Juz Saat Ini', 'Juz', 'juz_terakhir', 'JUZ', 'Juz Terakhir'],
};

function getColVal(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') return row[alias];
  }
  return undefined;
}

export function normaliseGender(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (s === 'l' || s === 'laki-laki' || s === 'laki' || s === 'male') return 'Laki-laki';
  if (s === 'p' || s === 'perempuan' || s === 'female') return 'Perempuan';
  return null;
}

// ─── Parse Excel ──────────────────────────────────────────────────────────────

export function parseExcelImport(buffer: Buffer): ParseExcelResult {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const valid: ExcelImportRow[] = [];
  const errors: ExcelRowError[] = [];

  rawRows.forEach((raw, index) => {
    const rowNum = index + 2;

    const nisn   = String(getColVal(raw, COLUMN_ALIASES.nisn) ?? '').trim();
    const nama   = String(getColVal(raw, COLUMN_ALIASES.nama) ?? '').trim();
    const genderRaw = String(getColVal(raw, COLUMN_ALIASES.gender) ?? '');
    const tanggalRaw = getColVal(raw, COLUMN_ALIASES.tanggal_lahir);
    const kelasRaw   = getColVal(raw, COLUMN_ALIASES.kelas);
    const juzRaw     = getColVal(raw, COLUMN_ALIASES.juz_terakhir);

    if (!nisn) { errors.push({ row: rowNum, alasan: 'NISN wajib diisi' }); return; }
    if (!nama) { errors.push({ row: rowNum, nisn, alasan: 'Nama Lengkap wajib diisi' }); return; }
    if (!/^\d+$/.test(nisn)) { errors.push({ row: rowNum, nisn, alasan: 'NISN hanya boleh berisi angka' }); return; }

    const gender = normaliseGender(genderRaw);
    if (!gender) {
      errors.push({ row: rowNum, nisn, nama, alasan: `Jenis Kelamin tidak valid: "${genderRaw}" — gunakan: Laki-laki, Perempuan, L, atau P` });
      return;
    }

    const juzNum = Number(juzRaw);
    if (!juzRaw || isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
      errors.push({ row: rowNum, nisn, nama, alasan: 'Juz Saat Ini harus angka 1–30' });
      return;
    }

    let tanggal_lahir: string | null = null;
    if (tanggalRaw && String(tanggalRaw).trim() !== '') {
      if (tanggalRaw instanceof Date) {
        tanggal_lahir = tanggalRaw.toISOString().split('T')[0];
      } else {
        const parsed = new Date(String(tanggalRaw));
        if (!isNaN(parsed.getTime())) tanggal_lahir = parsed.toISOString().split('T')[0];
      }
    }

    const kelas = kelasRaw && String(kelasRaw).trim() ? String(kelasRaw).trim() : null;
    valid.push({ nisn, nama, gender, tanggal_lahir, kelas, juz_terakhir: juzNum });
  });

  return { valid, errors };
}

// ─── Generate Template Excel ──────────────────────────────────────────────────

export function generateExcelTemplate(kelasList: string[] = []): Buffer {
  const wb = xlsx.utils.book_new();

  // ── Sheet 1: Template Data ──
  const headers = ['NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tanggal Lahir', 'Kelas', 'Juz Saat Ini'];

  const contohData = [
    ['1234567890', 'Ahmad Fulan bin Budi',    'Laki-laki',  '2010-05-15', kelasList[0] || '3A', 1],
    ['0987654321', 'Siti Aminah binti Hasan', 'Perempuan',  '2011-03-22', kelasList[1] || '2B', 5],
    ['1122334455', 'Muhammad Rizki',           'L',          '2012-07-10', kelasList[0] || '1A', 3],
    ['5544332211', 'Fatimah Az-Zahra',         'P',          '2013-01-05', '',                   7],
    ['6677889900', 'Abdullah Umar',             'Laki-laki', '',           kelasList[0] || '4C', 15],
  ];

  const wsData = [headers, ...contohData];
  const ws = xlsx.utils.aoa_to_sheet(wsData);

  // Style header row — bold + background
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '78350F' } },        // amber-900
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'medium', color: { rgb: '064E3B' } },
    },
  };

  // Style contoh rows (alternating)
  const rowStyleEven = { fill: { fgColor: { rgb: 'FFFBEB' } } };  // amber-50
  const rowStyleOdd  = { fill: { fgColor: { rgb: 'FFFFFF' } } };

  headers.forEach((_, colIdx) => {
    const cellRef = xlsx.utils.encode_cell({ r: 0, c: colIdx });
    if (!ws[cellRef]) ws[cellRef] = { v: headers[colIdx], t: 's' };
    ws[cellRef].s = headerStyle;
  });

  contohData.forEach((_, rowIdx) => {
    headers.forEach((_, colIdx) => {
      const cellRef = xlsx.utils.encode_cell({ r: rowIdx + 1, c: colIdx });
      if (ws[cellRef]) {
        ws[cellRef].s = rowIdx % 2 === 0 ? rowStyleEven : rowStyleOdd;
      }
    });
  });

  // Column widths
  ws['!cols'] = [
    { wch: 16 },  // NISN
    { wch: 28 },  // Nama Lengkap
    { wch: 16 },  // Jenis Kelamin
    { wch: 15 },  // Tanggal Lahir
    { wch: 12 },  // Kelas
    { wch: 13 },  // Juz Saat Ini
  ];

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  xlsx.utils.book_append_sheet(wb, ws, 'Data Siswa');

  // ── Sheet 2: Panduan ──
  const panduan = [
    ['PANDUAN PENGISIAN TEMPLATE IMPORT DATA SISWA'],
    [''],
    ['KETENTUAN UMUM:'],
    ['• Hapus baris contoh sebelum mengisi data asli (baris 2–6)'],
    ['• Jangan mengubah nama kolom di baris pertama'],
    ['• Satu baris = satu siswa'],
    ['• File harus disimpan dalam format .xlsx atau .xls'],
    [''],
    ['KOLOM WAJIB:'],
    ['Kolom',         'Keterangan',                                    'Format / Contoh'],
    ['NISN',          'Nomor Induk Siswa Nasional — harus unik',       '1234567890'],
    ['Nama Lengkap',  'Nama lengkap siswa sesuai dokumen resmi',       'Ahmad Fulan bin Budi'],
    ['Jenis Kelamin', 'Jenis kelamin siswa',                           'Laki-laki / Perempuan / L / P'],
    ['Juz Saat Ini',  'Juz Al-Quran yang sudah dikuasai (1–30)',       '15'],
    [''],
    ['KOLOM OPSIONAL:'],
    ['Kolom',         'Keterangan',                                    'Format / Contoh'],
    ['Tanggal Lahir', 'Tanggal lahir siswa',                           '2010-05-15  atau  15/05/2010'],
    ['Kelas',         'Nama kelas yang sudah terdaftar di sistem',     '3A, 2B, Wafa 1, dsb.'],
    [''],
    ['NILAI YANG DITERIMA — Jenis Kelamin:'],
    ['Laki-laki', 'Perempuan', 'L', 'P'],
    [''],
    ['CONTOH TANGGAL LAHIR YANG VALID:'],
    ['2010-05-15', '15/05/2010', '15-05-2010', 'May 15, 2010'],
    [''],
    ['TIPS:'],
    ['• Gunakan fitur Copy-Paste dari sumber data lain jika ada'],
    ['• Pastikan NISN tidak ada yang duplikat dalam satu file'],
    ['• Kolom Kelas harus sama persis dengan nama kelas di sistem'],
    ['• Siswa yang gagal import tidak akan menghentikan proses; akan dilaporkan di akhir'],
  ];

  const panduanWs = xlsx.utils.aoa_to_sheet(panduan);

  // Style judul
  if (panduanWs['A1']) {
    panduanWs['A1'].s = { font: { bold: true, sz: 14, color: { rgb: '065F46' } } };
  }
  // Style sub-heading
  [2, 8, 14, 20, 24, 27].forEach(row => {
    const cellRef = xlsx.utils.encode_cell({ r: row, c: 0 });
    if (panduanWs[cellRef]) {
      panduanWs[cellRef].s = { font: { bold: true, sz: 11 } };
    }
  });

  panduanWs['!cols'] = [{ wch: 20 }, { wch: 55 }, { wch: 35 }];
  xlsx.utils.book_append_sheet(wb, panduanWs, 'Panduan');

  // ── Sheet 3: Daftar Kelas (opsional) ──
  if (kelasList.length > 0) {
    const kelasData = [
      ['Daftar Kelas yang Terdaftar di Sistem'],
      ['(Gunakan nama kelas persis seperti di bawah ini)'],
      [''],
      ...kelasList.map(k => [k]),
    ];
    const kelasWs = xlsx.utils.aoa_to_sheet(kelasData);
    kelasWs['!cols'] = [{ wch: 30 }];
    xlsx.utils.book_append_sheet(wb, kelasWs, 'Daftar Kelas');
  }

  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
