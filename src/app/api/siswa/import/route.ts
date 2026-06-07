export const dynamic = 'force-dynamic';
// src/app/api/siswa/import/route.ts
// POST: Terima file Excel, parse dengan xlsx, validasi setiap baris,
//        insert batch ke database, return ringkasan berhasil/gagal beserta alasan

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import * as xlsx from 'xlsx';

interface ExcelRow {
  NISN?: unknown;
  'Nama Lengkap'?: unknown;
  'Jenis Kelamin'?: unknown;
  'Tanggal Lahir'?: unknown;
  Kelas?: unknown;
  'Juz Saat Ini'?: unknown;
  // Alias pendek untuk kompatibilitas mundur
  Nama?: unknown;
  Gender?: unknown;
  Juz?: unknown;
}

interface ImportResult {
  row: number;
  nisn?: string;
  nama?: string;
  status: 'berhasil' | 'gagal';
  alasan?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'File tidak ditemukan!' }, { status: 400 });
    }

    // Validasi ekstensi file
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { message: 'Format file tidak didukung. Gunakan file Excel (.xlsx atau .xls)' },
        { status: 400 }
      );
    }

    // Baca dan parse file Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = xlsx.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Data Excel kosong!' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: ImportResult[] = [];
    let berhasil = 0;
    let gagal = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // baris 1 = header, data mulai baris 2

      // Normalisasi kolom (support header lengkap dan alias pendek)
      const nisn = String(row['NISN'] ?? '').trim();
      const nama = String(row['Nama Lengkap'] ?? row['Nama'] ?? '').trim();
      const genderRaw = String(row['Jenis Kelamin'] ?? row['Gender'] ?? '').trim();
      const tanggalLahirRaw = row['Tanggal Lahir'];
      const kelasRaw = String(row['Kelas'] ?? '').trim();
      const juzRaw = row['Juz Saat Ini'] ?? row['Juz'];

      // === Validasi per baris ===
      if (!nisn) {
        results.push({ row: rowNum, status: 'gagal', alasan: 'NISN wajib diisi' });
        gagal++;
        continue;
      }
      if (!nama) {
        results.push({ row: rowNum, nisn, status: 'gagal', alasan: 'Nama Lengkap wajib diisi' });
        gagal++;
        continue;
      }

      // Normalisasi gender
      let gender: string;
      if (genderRaw === 'L' || genderRaw.toLowerCase() === 'laki-laki' || genderRaw.toLowerCase() === 'laki') {
        gender = 'Laki-laki';
      } else if (genderRaw === 'P' || genderRaw.toLowerCase() === 'perempuan') {
        gender = 'Perempuan';
      } else {
        results.push({ row: rowNum, nisn, nama, status: 'gagal', alasan: 'Jenis Kelamin tidak valid (gunakan Laki-laki, Perempuan, L, atau P)' });
        gagal++;
        continue;
      }

      // Validasi juz
      const juzNum = Number(juzRaw);
      if (!juzRaw || isNaN(juzNum) || juzNum < 1 || juzNum > 30) {
        results.push({ row: rowNum, nisn, nama, status: 'gagal', alasan: 'Juz Saat Ini harus berupa angka antara 1 dan 30' });
        gagal++;
        continue;
      }

      // Format tanggal lahir
      let tanggal_lahir: string | null = null;
      if (tanggalLahirRaw) {
        if (tanggalLahirRaw instanceof Date) {
          tanggal_lahir = tanggalLahirRaw.toISOString().split('T')[0];
        } else {
          const parsed = new Date(String(tanggalLahirRaw));
          if (!isNaN(parsed.getTime())) {
            tanggal_lahir = parsed.toISOString().split('T')[0];
          }
        }
      }

      // Cari class_id berdasarkan nama kelas jika ada
      let class_id: string | null = null;
      if (kelasRaw) {
        const { data: kelasData } = await supabase
          .from('classes')
          .select('id')
          .ilike('name', kelasRaw)
          .single();
        if (kelasData) class_id = kelasData.id;
      }

      // Generate QR code unik
      const qr_code = crypto.randomUUID();

      // Siapkan data insert
      const insertData: Record<string, unknown> = {
        nisn,
        nama,
        gender,
        juz_terakhir: juzNum,
        qr_code,
        status: 'Aktif',
      };
      if (tanggal_lahir) insertData.tanggal_lahir = tanggal_lahir;
      if (class_id) insertData.class_id = class_id;
      if (session.user.role === 'Tim_Quran') {
        insertData.assigned_teacher_id = session.user.id;
      }

      // Insert baris ini
      const { error } = await supabase.from('santri').insert([insertData]);

      if (error) {
        let alasan = 'Gagal menyimpan ke database';
        if (error.code === '23505') {
          alasan = 'NISN sudah terdaftar';
        }
        results.push({ row: rowNum, nisn, nama, status: 'gagal', alasan });
        gagal++;
      } else {
        results.push({ row: rowNum, nisn, nama, status: 'berhasil' });
        berhasil++;
      }
    }

    return NextResponse.json({
      message: `Import selesai: ${berhasil} berhasil, ${gagal} gagal dari ${rows.length} baris.`,
      ringkasan: { total: rows.length, berhasil, gagal },
      detail: results,
    });
  } catch (error) {
    console.error('Route error /api/siswa/import:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
