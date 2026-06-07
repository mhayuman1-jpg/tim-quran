export const dynamic = 'force-dynamic';
// src/app/api/rekap/upload/route.ts
// POST: Terima file Excel/PDF, upload ke Supabase Storage bucket `rekap`,
//       simpan metadata ke tabel `rekap_bulanan`

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

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

    // Kedua role (Kabid dan Tim_Quran) boleh upload rekap
    const { id: uploaderId, name: uploaderName, role } = session.user;
    if (role !== 'Kabid' && role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    // Parse multipart/form-data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const periode = formData.get('periode') as string | null;

    // Validasi file
    if (!file) {
      return NextResponse.json(
        { message: 'File wajib diunggah' },
        { status: 400 }
      );
    }

    // Validasi tipe file: hanya Excel (.xlsx, .xls) dan PDF
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'application/pdf',                                                    // .pdf
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.pdf'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      return NextResponse.json(
        { message: 'Format file tidak didukung. Hanya file Excel (.xlsx, .xls) atau PDF yang diizinkan.' },
        { status: 400 }
      );
    }

    // Validasi periode (format: YYYY-MM, misal "2025-01")
    if (!periode || typeof periode !== 'string' || periode.trim() === '') {
      return NextResponse.json(
        { message: 'Periode wajib diisi' },
        { status: 400 }
      );
    }

    const periodeRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!periodeRegex.test(periode.trim())) {
      return NextResponse.json(
        { message: 'Format periode tidak valid. Gunakan format YYYY-MM (contoh: 2025-01)' },
        { status: 400 }
      );
    }

    // Validasi ukuran file maksimal 10MB
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { message: 'Ukuran file melebihi batas maksimal 10 MB' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Buat nama file unik di storage: {periode}/{timestamp}_{original_filename}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${periode.trim()}/${timestamp}_${sanitizedFileName}`;

    // Convert File ke ArrayBuffer lalu Buffer untuk upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Supabase Storage bucket `rekap`
    const { error: uploadError } = await supabase.storage
      .from('rekap')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { message: 'Gagal mengunggah file ke storage.', error: uploadError.message },
        { status: 500 }
      );
    }

    // Simpan metadata ke tabel `rekap_bulanan`
    const { data: rekapData, error: dbError } = await supabase
      .from('rekap_bulanan')
      .insert([
        {
          uploader_id: uploaderId,
          uploader_name: uploaderName ?? 'Tidak diketahui',
          periode: periode.trim(),
          file_name: file.name,
          file_url: storagePath,
        },
      ])
      .select('id, uploader_id, uploader_name, periode, file_name, file_url, created_at')
      .single();

    if (dbError) {
      console.error('Supabase insert rekap_bulanan error:', dbError);
      // Hapus file dari storage jika insert DB gagal (rollback manual)
      await supabase.storage.from('rekap').remove([storagePath]);
      return NextResponse.json(
        { message: 'Gagal menyimpan metadata rekap.', error: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'File rekap berhasil diunggah.', data: rekapData },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/rekap/upload:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
