// src/lib/storage/tigris.ts
// Wrapper untuk Tigris Object Storage (S3-compatible)
// Menyediakan fungsi: upload, delete, list, presignedUrl

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const TIGRIS_ENDPOINT = 'https://t3.storage.dev';

export function getS3Client(): S3Client {
  const accessKeyId = process.env.TIGRIS_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('TIGRIS_STORAGE_ACCESS_KEY_ID atau TIGRIS_STORAGE_SECRET_ACCESS_KEY belum diatur di .env.local');
  }

  return new S3Client({
    region: 'auto',
    endpoint: TIGRIS_ENDPOINT,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * Upload file ke Tigris bucket.
 * @param bucket nama bucket (misal 'timquran-assets', 'timquran-raports')
 * @param key object key (misal 'logo/default.svg')
 * @param body Buffer atau Uint8Array berisi data file
 * @param contentType MIME type file
 */
export async function storageUpload(
  bucket: string,
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const s3 = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
}

/**
 * Hapus file dari Tigris bucket.
 */
export async function storageDelete(bucket: string, key: string): Promise<void> {
  const s3 = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3.send(command);
}

/**
 * List semua object dalam bucket (atau dengan prefix tertentu).
 * Mengembalikan array of { key, size, lastModified }.
 */
export async function storageList(
  bucket: string,
  prefix?: string,
): Promise<Array<{ key: string; size: number; lastModified?: Date }>> {
  const s3 = getS3Client();
  const objects: Array<{ key: string; size: number; lastModified?: Date }> = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3.send(command);

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) {
          objects.push({
            key: obj.Key,
            size: obj.Size ?? 0,
            lastModified: obj.LastModified,
          });
        }
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

/**
 * Generate presigned URL untuk akses file (download/upload).
 * @param bucket nama bucket
 * @param key object key
 * @param expiresIn durasi URL valid dalam detik (default: 3600 = 1 jam)
 * @returns presigned URL string
 */
export async function storagePresignedUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}
