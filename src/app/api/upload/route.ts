// src/app/api/upload/route.ts
// POST: Upload gambar ke Tigris Storage
// Query params:
//   - bucket: nama bucket (default: "timquran-assets")
//   - folder: subfolder dalam bucket (misal: "logo", "siswa", "artikel")
// Returns: { url: string } — proxy URL gambar (permanent, via /api/images)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { storageUpload } from '@/lib/storage/tigris';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const bucket = (searchParams.get('bucket') || 'timquran-assets').trim();
    const rawFolder = searchParams.get('folder') || 'uploads';
    const folder = rawFolder.trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'File wajib diunggah.' }, { status: 400 });
    }

    // Validasi tipe file
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        message: 'Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.',
      }, { status: 400 });
    }

    // Validasi ukuran
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({
        message: `Ukuran file maksimal ${MAX_SIZE_MB}MB.`,
      }, { status: 400 });
    }

    // Generate nama file unik: folder/timestamp-random.ext
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = folder
      ? `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Convert ke Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload ke Tigris Storage
    await storageUpload(bucket, fileName, buffer, file.type);

    // Return proxy URL (permanent) — presigned URL di-generate on-demand saat diakses
    const proxyUrl = `/api/images/${bucket}/${fileName}`;

    return NextResponse.json({ url: proxyUrl, fileName }, { status: 201 });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
