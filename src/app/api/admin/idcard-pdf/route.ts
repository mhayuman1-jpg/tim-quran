// src/app/api/admin/idcard-pdf/route.ts
// POST: Upload PDF ID card ke Tigris storage
// GET: List semua PDF ID card yang sudah diupload
// DELETE: Hapus PDF ID card
// PATCH: Update qr_code siswa dari hasil extract PDF

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageUpload, storageList, storageDelete } from '@/lib/storage/tigris';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BUCKET = 'timquran-assets';
const PREFIX = 'idcard/';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Kabid') {
      return NextResponse.json({ message: 'Hanya Kabid.' }, { status: 403 });
    }

    const files = await storageList(BUCKET, PREFIX);
    const pdfs = files
      .filter(f => f.key.endsWith('.pdf'))
      .map(f => ({
        key: f.key,
        name: f.key.replace(PREFIX, ''),
        size: f.size,
        lastModified: f.lastModified,
        url: `/api/images/${BUCKET}/${f.key}`,
      }));

    return NextResponse.json({ data: pdfs });
  } catch (error) {
    console.error('List IDCard PDF error:', error);
    return NextResponse.json({ message: 'Gagal mengambil data.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Kabid') {
      return NextResponse.json({ message: 'Hanya Kabid.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const label = (formData.get('label') as string) || '';

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json({ message: 'File PDF wajib diupload.' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = (label || file.name).replace(/[^a-zA-Z0-9\s._-]/g, '').trim().replace(/\s+/g, '_');
    const key = `${PREFIX}${safeName}_${timestamp}.pdf`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await storageUpload(BUCKET, key, buffer, 'application/pdf');

    return NextResponse.json({
      message: 'PDF berhasil diupload.',
      data: {
        key,
        name: file.name,
        url: `/api/images/${BUCKET}/${key}`,
      },
    });
  } catch (error) {
    console.error('Upload IDCard PDF error:', error);
    return NextResponse.json({ message: 'Gagal mengupload file.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Kabid') {
      return NextResponse.json({ message: 'Hanya Kabid.' }, { status: 403 });
    }

    const body = await request.json();
    const { mappings } = body as { mappings: { nama: string; qrCode: string }[] };

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data mapping.' }, { status: 400 });
    }

    const supabase = createServerClient();
    let updated = 0;
    let failed = 0;
    const results: { nama: string; status: string; message: string }[] = [];

    for (const m of mappings) {
      if (!m.nama || !m.qrCode) {
        results.push({ nama: m.nama || '?', status: 'skip', message: 'Data tidak lengkap' });
        failed++;
        continue;
      }

      // Cari siswa berdasarkan nama (exact / contains)
      const { data: siswaList, error: fetchErr } = await supabase
        .from('santri')
        .select('id, nama, qr_code')
        .or(`nama.eq.${m.nama},nama.ilike.%${m.nama}%,nama.ilike.${m.nama}%`)
        .limit(5);

      if (fetchErr || !siswaList || siswaList.length === 0) {
        results.push({ nama: m.nama, status: 'skip', message: 'Siswa tidak ditemukan' });
        failed++;
        continue;
      }

      // Ambil yang paling cocok
      const siswa = siswaList.find(s => s.nama.toLowerCase() === m.nama.toLowerCase()) || siswaList[0];

      const newQr = m.qrCode.toUpperCase();

      // Sudah cocok?
      if (siswa.qr_code.toUpperCase() === newQr) {
        results.push({ nama: siswa.nama, status: 'ok', message: 'Sudah cocok' });
        updated++;
        continue;
      }

      // Update
      const { error: updateErr } = await supabase
        .from('santri')
        .update({ qr_code: newQr })
        .eq('id', siswa.id);

      if (updateErr) {
        results.push({ nama: siswa.nama, status: 'error', message: updateErr.message });
        failed++;
      } else {
        results.push({ nama: siswa.nama, status: 'updated', message: `${siswa.qr_code.slice(0, 8)} → ${newQr.slice(0, 8)}` });
        updated++;
      }
    }

    return NextResponse.json({ message: `Selesai: ${updated} ok, ${failed} gagal`, results, updated, failed });
  } catch (error) {
    console.error('Patch IDCard QR error:', error);
    return NextResponse.json({ message: 'Gagal update QR code.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Kabid') {
      return NextResponse.json({ message: 'Hanya Kabid.' }, { status: 403 });
    }

    const body = await request.json();
    const { key } = body as { key?: string };

    if (!key || !key.startsWith(PREFIX)) {
      return NextResponse.json({ message: 'Key tidak valid.' }, { status: 400 });
    }

    await storageDelete(BUCKET, key);
    return NextResponse.json({ message: 'PDF berhasil dihapus.' });
  } catch (error) {
    console.error('Delete IDCard PDF error:', error);
    return NextResponse.json({ message: 'Gagal menghapus file.' }, { status: 500 });
  }
}
