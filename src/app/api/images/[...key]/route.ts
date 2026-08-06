// src/app/api/images/[...key]/route.ts
// Proxy route: fetch gambar dari Tigris dan stream ke client.
// Contoh: /api/images/timquran-assets/logo/default.svg → return gambar langsung
//
// CACHE STRATEGY (Fix 1 - Origin Transfer Reduction):
// - timquran-assets: cache 7 hari (static assets: logo, default images)
// - timquran-profile-photos: cache 1 jam (dynamic: foto profil siswa)
// - timquran-rekap: cache 1 jam (dynamic: file rekap)
// - timquran-raports: cache 1 jam (dynamic: raport PDF)

import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client } from '@/lib/storage/tigris';

export const dynamic = 'force-dynamic';

const VALID_BUCKETS = ['timquran-assets', 'timquran-raports', 'timquran-rekap', 'timquran-profile-photos'];

// Cache duration per bucket (in seconds)
const CACHE_DURATIONS: Record<string, number> = {
  'timquran-assets': 604800,         // 7 hari - static assets jarang berubah
  'timquran-profile-photos': 2592000, // 30 hari - foto profil sangat jarang berubah
  'timquran-rekap': 604800,           // 7 hari - file rekap per-bulan
  'timquran-raports': 604800,         // 7 hari - raport per-semester
};

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

    // Cache duration berdasarkan bucket
    const maxAge = CACHE_DURATIONS[resolved.bucket] || 3600;

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || getMime(resolved.key),
        'Cache-Control': `public, max-age=${maxAge}, immutable`,
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
