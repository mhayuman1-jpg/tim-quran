// src/lib/raport/print-token.ts
// HMAC-signed print token untuk autentikasi Playwright → halaman cetak raport.
//
// Format token: base64url( raportId:createdAt:expires:hmac )
//   - raportId : UUID raport
//   - createdAt: timestamp ms saat token dibuat (untuk logging/debug)
//   - expires  : timestamp ms kapan token kadaluarsa (createdAt + TTL)
//   - hmac     : SHA256( "raportId:createdAt:expires", NEXTAUTH_SECRET )
//
// Desain:
//   - Stateless (tidak perlu in-memory store) → kompatibel Vercel serverless
//   - Setiap request render-pdf selalu generate token BARU (fresh Date.now())
//   - Timing-safe compare untuk validasi HMAC

import { createHmac, createHash, timingSafeEqual } from 'crypto';

const TTL_MS = 5 * 60 * 1000; // 5 menit

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET tidak ditemukan — tidak bisa membuat print token.');
  }
  return secret;
}

/** Short hash dari secret untuk debugging — bandingkan di generate vs verify. */
function secretFingerprint(): string {
  const secret = getSecret();
  return createHash('sha256').update(secret).digest('hex').slice(0, 12);
}

function computeHmac(data: string): string {
  return createHmac('sha256', getSecret()).update(data, 'utf8').digest('hex');
}

/**
 * Timing-safe string equality. Menghindari timing attack.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return timingSafeEqual(bufA, bufB);
}

/**
 * Hasilkan token cetak HMAC-signed — SELALU fresh Date.now().
 *
 * Dipanggil SETIAP kali endpoint render-pdf diminta generate PDF baru.
 * Token berlaku 5 menit dari saat pembuatan.
 */
export function generatePrintToken(raportId: string): string {
  const now = Date.now();
  const expires = now + TTL_MS;
  const payload = `${raportId}:${now}:${expires}`;
  const sig = computeHmac(payload);
  const raw = `${payload}:${sig}`;

  console.log('[print-token] Generated', {
    raportId,
    createdAt: now,
    expires,
    ttlMs: TTL_MS,
    tokenLen: raw.length,
    secretFp: secretFingerprint(),
  });

  return Buffer.from(raw).toString('base64url');
}

/**
 * Verifikasi token cetak HMAC-signed.
 *
 * @returns true JIKA: signature valid, raportId cocok, belum expired
 *
 * Log codes:
 *   TOKEN_MISSING       — token kosong/null
 *   PARSE_FAILED        — base64 decode gagal atau jumlah bagian ≠ 4
 *   TIMESTAMP_INVALID   — createdAt/expires bukan angka
 *   RAPORT_ID_MISMATCH  — raportId di token ≠ raportId yang diminta
 *   EXPIRED             — token sudah lewat expiry
 *   HMAC_MISMATCH       — signature tidak cocok (secret beda? payload berubah?)
 *   VALID               — semua check passed
 */
export function verifyPrintToken(token: string, raportId: string): boolean {
  const now = Date.now();

  // ── Pre-check: token kosong? ──────────────────────────────────────────
  if (!token) {
    console.error('[print-token] TOKEN_MISSING — token is empty/null');
    return false;
  }

  // ── Decode ────────────────────────────────────────────────────────────
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[print-token] PARSE_FAILED — base64url decode error', { error: msg, tokenLen: token.length });
    return false;
  }

  const parts = decoded.split(':');

  if (parts.length !== 4) {
    console.error('[print-token] PARSE_FAILED — expected 4 parts, got ' + parts.length, {
      partsCount: parts.length,
      decodedLen: decoded.length,
      tokenLen: token.length,
      decodedPreview: decoded.slice(0, 40) + (decoded.length > 40 ? '...' : ''),
    });
    return false;
  }

  const [tokenRaportId, createdAtStr, expiresStr, sig] = parts;
  const createdAt = Number(createdAtStr);
  const expires = Number(expiresStr);

  // ── Timestamp valid? ──────────────────────────────────────────────────
  if (!Number.isFinite(createdAt) || !Number.isFinite(expires)) {
    console.error('[print-token] TIMESTAMP_INVALID', { createdAtStr, expiresStr, createdAt, expires });
    return false;
  }

  // ── RaportId cocok? ──────────────────────────────────────────────────
  if (tokenRaportId !== raportId) {
    console.error('[print-token] RAPORT_ID_MISMATCH', {
      tokenRaportId,
      expectedRaportId: raportId,
      tokenRaportIdLen: tokenRaportId.length,
      expectedRaportIdLen: raportId.length,
    });
    return false;
  }

  // ── Expired? ──────────────────────────────────────────────────────────
  if (now > expires) {
    console.error('[print-token] EXPIRED', {
      now,
      expires,
      expiredMsAgo: now - expires,
      expiredSecAgo: Math.round((now - expires) / 1000),
    });
    return false;
  }

  // ── HMAC signature ────────────────────────────────────────────────────
  const expectedPayload = `${tokenRaportId}:${createdAtStr}:${expiresStr}`;
  const expectedSig = computeHmac(expectedPayload);

  console.log('[print-token] Verifying HMAC', {
    raportId,
    tokenRaportId,
    createdAt,
    expires,
    now,
    ageMs: now - createdAt,
    ageSec: Math.round((now - createdAt) / 1000),
    secretFp: secretFingerprint(),
    receivedSigLen: sig.length,
    expectedSigLen: expectedSig.length,
    sigPrefix: sig.slice(0, 8),
    expectedSigPrefix: expectedSig.slice(0, 8),
  });

  if (sig.length !== expectedSig.length) {
    console.error('[print-token] HMAC_MISMATCH — signature length differs', {
      receivedLen: sig.length,
      expectedLen: expectedSig.length,
    });
    return false;
  }

  if (!timingSafeStringEqual(sig, expectedSig)) {
    console.error('[print-token] HMAC_MISMATCH — signature content differs', {
      receivedSigPrefix: sig.slice(0, 16) + '...',
      expectedSigPrefix: expectedSig.slice(0, 16) + '...',
    });
    return false;
  }

  console.log('[print-token] VALID', {
    raportId,
    ageMs: now - createdAt,
    ageSec: Math.round((now - createdAt) / 1000),
  });
  return true;
}
