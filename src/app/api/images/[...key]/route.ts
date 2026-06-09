// src/app/api/images/[...key]/route.ts
// Proxy route: fetch gambar dari Tigris dan stream ke client.
// Contoh: /api/images/timquran-assets/logo/default.svg → return gambar langsung

import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/storage/tigris';

export const dynamic = 'force-dynamic';

const VALID_BUCKETS = ['timquran-assets', 'timquran-raports', 'timquran-rekap', 'timquran-profile-photos'];

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
};

function getMime(key: string): string {
  const ext = '.' + key.split('.').pop()?.toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function resolveBucket(keyParts: string[]): { bucket: string; key: string } | null {
  if (keyParts.length < 2) return null;
  const bucket = keyParts[0];
  if (!VALID_BUCKETS.includes(bucket)) return null;
  const key = keyParts.slice(1).join('/');
  if (!key) return null;
  return { bucket, key };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { key: string[] } },
) {
  const resolved = resolveBucket(params.key);
  if (!resolved) {
    return NextResponse.json({ message: 'Path tidak valid.' }, { status: 400 });
  }

  try {
    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: resolved.bucket,
      Key: resolved.key,
    });
    const response = await s3.send(command);

    if (!response.Body) {
      return NextResponse.json({ message: 'File tidak ditemukan.' }, { status: 404 });
    }

    // Stream body dari S3 response
    const body = response.Body.transformToWebStream();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || getMime(resolved.key),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ message: 'File tidak ditemukan.' }, { status: 404 });
    }
    console.error('[API /api/images] Error:', error);
    return NextResponse.json({ message: 'Gagal mengakses file.' }, { status: 500 });
  }
}
