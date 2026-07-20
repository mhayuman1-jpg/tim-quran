// Server-side PDF generator — Playwright + @media print
// Menggunakan HMAC-signed print-token (fresh per request) sebagai autentikasi.
// Cookie NextAuth mengandung karakter yang ditolak Chromium CDP →
// solusi: generate signed token lalu sisipkan ke URL print + cookie.

import type { Page } from 'playwright-core';
import {
  getRaportPdfOptions,
  getRaportPrintUrl,
  raportReadySelector,
} from '@/lib/raport/print-config';
import { getPlaywrightBrowser } from '@/lib/raport/playwright-browser';
import { generatePrintToken } from '@/lib/raport/print-token';

export interface GenerateRaportPdfOptions {
  raportId: string;
  baseUrl: string;
  juz?: number | null;
}

export function resolveBaseUrl(host: string | null, forwardedProto: string | null): string {
  const resolvedHost = host ?? 'localhost:3000';
  const protocol = forwardedProto
    ?? (resolvedHost.includes('localhost') || resolvedHost.startsWith('127.0.0.1') ? 'http' : 'https');
  // SELALU gunakan origin dari request — JANGAN pakai NEXTAUTH_URL karena bisa
  // beda antara dev (localhost) dan produksi (timquran.my.id), menyebabkan
  // Playwright membuka server yang BERBEDA dari yang generate token.
  return `${protocol}://${resolvedHost}`;
}

/**
 * Generate PDF raport via Playwright Chromium headless.
 *
 * Alur:
 *   1. Generate FRESH HMAC token (Date.now() per call)
 *   2. Set token sebagai cookie + query param
 *   3. Navigate ke halaman cetak (server component, data diambil dari DB)
 *   4. Tunggu render selesai + font loaded + images loaded
 *   5. emulateMedia('print') → page.pdf()
 *
 * Autentikasi: HMAC-signed token — tidak perlu session cookie.
 */
export async function generateRaportPdf(options: GenerateRaportPdfOptions): Promise<Buffer> {
  const { raportId, baseUrl, juz } = options;

  // ── 1. Generate FRESH token — Date.now() baru setiap request ──────────
  const generateStart = Date.now();
  const printToken = generatePrintToken(raportId);
  const generateEnd = Date.now();
  const printUrl = getRaportPrintUrl(baseUrl, raportId, printToken);

  console.log('[Playwright] Token generated', {
    raportId,
    generateTimeMs: generateEnd - generateStart,
    tokenCreatedAt: generateEnd,
    printUrl,
  });

  // ── 2. Launch browser + context ───────────────────────────────────────
  const browser = await getPlaywrightBrowser();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  let page: Page | null = null;
  try {
    page = await context.newPage();

    // Log console errors dari halaman print
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[Playwright page console]', msg.text());
      } else if (msg.type() === 'log' && msg.text().includes('[print]')) {
        // Forward print-page logs untuk debugging
        console.log('[Playwright page]', msg.text());
      }
    });

    page.on('pageerror', (err) => {
      console.error('[Playwright page error]', err.message);
    });

    // ── 3. Set print_token cookie (redundansi dengan _pt query param) ────
    const parsedUrl = new URL(baseUrl);
    const hostname = parsedUrl.hostname;
    const cookies: Array<{ name: string; value: string; domain: string; path: string }> = [
      { name: 'print_token', value: printToken, domain: hostname, path: '/' },
    ];
    if (hostname === 'localhost') {
      cookies.push({ name: 'print_token', value: printToken, domain: '127.0.0.1', path: '/' });
    } else if (hostname === '127.0.0.1') {
      cookies.push({ name: 'print_token', value: printToken, domain: 'localhost', path: '/' });
    }
    await context.addCookies(cookies);

    // ── 4. Navigate ke halaman cetak ──────────────────────────────────────
    //    Tidak ada route interception — halaman print adalah server component murni,
    //    tidak dibungkus SessionProvider, tidak ada client-side session fetch.
    const navStart = Date.now();
    console.log('[Playwright] Navigating...', { raportId, url: printUrl });
    await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 60000 });
    const navEnd = Date.now();
    console.log('[Playwright] Navigation complete', { durationMs: navEnd - navStart });

    // ── 5. Tunggu data-pdf-ready atau data-pdf-error ─────────────────────
    const readyOrError = await Promise.race([
      page.waitForSelector('[data-pdf-ready="true"]', { timeout: 30000 }).then(() => 'ready' as const),
      page.waitForSelector('[data-pdf-error="true"]', { timeout: 30000 }).then(() => 'error' as const),
    ]);

    if (readyOrError === 'error') {
      const errorText = await page.textContent('[data-pdf-error="true"]').catch(() => 'Unknown error');
      throw new Error(`Print page error: ${errorText}`);
    }

    // Tunggu komponen raport selesai render
    await page.waitForSelector(raportReadySelector(raportId), { timeout: 15000 });

    // ── 6. Tunggu font selesai dimuat ────────────────────────────────────
    await page.evaluateHandle('document.fonts.ready').catch(() => {});
    console.log('[Playwright] Fonts ready');

    // ── 7. Tunggu gambar/logo selesai dimuat ─────────────────────────────
    await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.length === 0 || imgs.every((img) => img.complete && img.naturalWidth > 0);
      },
      { timeout: 20000 },
    ).catch(() => {});
    console.log('[Playwright] Images ready');

    // ── 8. Render mode cetak + tunggu CSS print diterapkan ───────────────
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);

    // ── 9. Generate PDF ─────────────────────────────────────────────────
    const pdfStart = Date.now();
    console.log('[Playwright] Generating PDF...');
    const pdfBuffer = await page.pdf(getRaportPdfOptions(juz));
    const pdfEnd = Date.now();

    console.log('[Playwright] PDF generated', {
      bytes: pdfBuffer.length,
      pdfTimeMs: pdfEnd - pdfStart,
      totalTimeMs: pdfEnd - generateEnd, // dari token generate sampai PDF selesai
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
