// src/app/api/admin/idcard-pdf/route.ts
// POST: Upload PDF ID card ke Tigris storage
// GET: List semua PDF ID card yang sudah diupload
// DELETE: Hapus PDF ID card

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageUpload, storageList, storageDelete } from '@/lib/storage/tigris';

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

    // Generate filename
    const timestamp = Date.now();
    const safeName = (label || file.name).replace(/[^a-zA-Z0-9\s._-]/g, '').trim().replace(/\s+/g, '_');
    const key = `${PREFIX}${safeName}_${timestamp}.pdf`;

    // Upload to Tigris
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
