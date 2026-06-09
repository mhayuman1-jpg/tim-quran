// src/lib/raport/print-token.ts
// Token satu kali pakai untuk autentikasi server-internal Playwright ke halaman cetak.
// Token ditandatangani dengan NEXTAUTH_SECRET dan berlaku 5 menit.
//
// Mengapa diperlukan:
//   Playwright tidak bisa meneruskan cookie NextAuth yang berisi karakter khusus
//   (next-auth.callback-url mengandung URL-encoded yang ditolak Chromium CDP).
//   Sebagai gantinya, render-pdf API menghasilkan token HMAC yang disisipkan ke
//   URL print page, sehingga layout bisa memverifikasi tanpa session cookie.

import { createHmac } from 'crypto';

const SECRET = process.env.NEXTAUTH_SECRET ?? 'dev-print-secret';
const TTL_MS = 5 * 60 * 1000; // 5 menit

/**
 * Hasilkan token cetak yang ditandatangani untuk raportId tertentu.
 */
export function generatePrintToken(raportId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${raportId}|${expires}`;
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

/**
 * Verifikasi token cetak.
 * @returns true jika token valid dan belum kadaluarsa
 */
export function verifyPrintToken(token: string, raportId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = decoded.split('|');
    if (parts.length !== 3) return false;

    const [id, expiresStr, sig] = parts;
    const expires = Number(expiresStr);

    if (id !== raportId) return false;
    if (isNaN(expires) || Date.now() > expires) return false;

    const payload = `${id}|${expires}`;
    const expected = createHmac('sha256', SECRET).update(payload).digest('hex');
    return sig === expected;
  } catch {
    return false;
  }
}
