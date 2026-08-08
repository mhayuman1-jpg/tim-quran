// src/app/api/upload/presigned/route.ts
// POST: Generate presigned URL untuk direct upload ke Tigris
// Client upload langsung ke Tigris tanpa lewat Vercel
// Query params:
//   - bucket: nama bucket (default: "timquran-assets")
//   - folder: subfolder dalam bucket
//   - contentType: MIME type file
//   - fileName: nama file asli (untuk extension)
// Returns: { uploadUrl: string, key: string, proxyUrl: string }

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { storagePresignedPutUrl } from '@/lib/storage/tigris';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Auth check
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const bucket = (searchParams.get('bucket') || 'timquran-assets').trim();
    const rawFolder = searchParams.get('folder') || 'uploads';
    const folder = rawFolder.trim().replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-');
    const contentType = searchParams.get('contentType') || 'application/octet-stream';
    const originalFileName = searchParams.get('fileName') || 'file';

    // Validate bucket
    const VALID_BUCKETS = ['timquran-assets', 'timquran-raports', 'timquran-rekap', 'timquran-profile-photos'];
    if (!VALID_BUCKETS.includes(bucket)) {
      return NextResponse.json({ message: 'Bucket tidak valid.' }, { status: 400 });
    }

    // Generate unique file name
    const ext = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
    const key = folder
      ? `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Generate presigned PUT URL (valid 1 jam)
    const uploadUrl = await storagePresignedPutUrl(bucket, key, contentType, 3600);

    // Proxy URL untuk akses nanti
    const proxyUrl = `/api/images/${bucket}/${key}`;

    return NextResponse.json({
      uploadUrl,
      key,
      proxyUrl,
      bucket,
    }, { status: 200 });

  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ message: 'Gagal generate presigned URL.' }, { status: 500 });
  }
}
