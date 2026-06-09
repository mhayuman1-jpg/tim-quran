// src/lib/storage/urls.ts
// Helper untuk convert Tigris key → proxy URL yang bisa dipakai next/image

const DEFAULT_BUCKET = 'timquran-assets';

/**
 * Convert Tigris storage key menjadi proxy URL yang bisa diakses client.
 * - Jika sudah URL lengkap (http/data:) → return as-is
 * - Jika sudah proxy URL (/api/images/...) → return as-is
 * - Jika Tigris key (misal "logo/default.svg") → return "/api/images/timquran-assets/logo/default.svg"
 */
export function toImageUrl(key: string | null | undefined, bucket: string = DEFAULT_BUCKET): string | null {
  if (!key || key.trim() === '') return null;
  // Sudah URL lengkap
  if (key.startsWith('http') || key.startsWith('data:')) return key;
  // Sudah proxy URL
  if (key.startsWith('/api/images/')) return key;
  // Tigris key → proxy URL
  return `/api/images/${bucket}/${key}`;
}
