// src/lib/raport/pdf-storage.ts
// Helper untuk menyimpan PDF raport ke Tigris Storage dan membuat presigned URL unduhan.
//
// Alur kerja:
//   1. Playwright menghasilkan PDF (Buffer)
//   2. uploadRaportPdf()     → simpan ke bucket "timquran-raports/{raportId}.pdf"
//   3. getSignedPdfUrl()     → buat presigned URL valid 15 menit
//   4. deleteRaportPdf()     → hapus file lama saat raport diedit (invalidasi cache)

import { storageUpload, storageDelete, storagePresignedUrl } from '@/lib/storage/tigris';

const BUCKET = 'timquran-raports';
/** Durasi presigned URL dalam detik — 15 menit cukup untuk proses unduh */
const SIGNED_URL_EXPIRES_IN = 900;

/**
 * Upload buffer PDF ke Tigris Storage.
 * Path: timquran-raports/{raportId}.pdf
 *
 * @returns storage path relatif dari bucket, misal "a8bb69e8.pdf"
 */
export async function uploadRaportPdf(
  raportId: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const storagePath = `${raportId}.pdf`;

  // Hapus file lama jika ada
  await storageDelete(BUCKET, storagePath).catch(() => {});

  await storageUpload(BUCKET, storagePath, pdfBuffer, 'application/pdf');

  return storagePath;
}

/**
 * Buat presigned URL untuk mengunduh PDF yang sudah tersimpan.
 * URL berlaku selama SIGNED_URL_EXPIRES_IN detik.
 *
 * @param storagePath path relatif, misal "a8bb69e8.pdf"
 * @param _downloadFilename nama file yang tampil di dialog unduh browser (unused di Tigris)
 * @returns presigned URL string, atau null jika gagal
 */
export async function getSignedPdfUrl(
  storagePath: string,
  _downloadFilename: string,
): Promise<string | null> {
  try {
    const signedUrl = await storagePresignedUrl(BUCKET, storagePath, SIGNED_URL_EXPIRES_IN);
    return signedUrl;
  } catch (err) {
    console.warn('[pdf-storage] Gagal membuat presigned URL:', err);
    return null;
  }
}

/**
 * Hapus file PDF dari storage (invalidasi cache).
 * Dipanggil saat raport diedit agar PDF lama tidak tersaji ke pengguna.
 */
export async function deleteRaportPdf(storagePath: string): Promise<void> {
  await storageDelete(BUCKET, storagePath).catch((err) => {
    console.warn('[pdf-storage] Gagal hapus file dari storage:', err);
  });
}
