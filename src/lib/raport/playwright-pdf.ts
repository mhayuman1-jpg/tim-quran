// Server-side PDF generator — Playwright + @media print
// Menggunakan print-token sebagai pengganti cookie forwarding.
// Cookie NextAuth (khususnya next-auth.callback-url) mengandung karakter yang
// ditolak Chromium CDP → solusi: generate signed token lalu sisipkan ke URL print.

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
  /** @deprecated Tidak lagi digunakan — digantikan print-token */
  cookieHeader?: string;
}

export function resolveBaseUrl(host: string | null, forwardedProto: string | null): string {
  const resolvedHost = host ?? 'localhost:3000';
  const protocol = forwardedProto
    ?? (resolvedHost.includes('localhost') || resolvedHost.startsWith('127.0.0.1') ? 'http' : 'https');
  return process.env.NEXTAUTH_URL ?? `${protocol}://${resolvedHost}`;
}

/**
 * Buka halaman cetak Next.js, aktifkan @media print, lalu hasilkan PDF via Chromium.
 *
 * Autentikasi dilakukan melalui signed print-token (query param _pt) bukan cookie,
 * karena cookie NextAuth mengandung karakter yang tidak valid di Chromium CDP.
 */
export async function generateRaportPdf(options: GenerateRaportPdfOptions): Promise<Buffer> {
  const { raportId, baseUrl, juz } = options;

  // Generate token satu kali yang berlaku 5 menit
  const printToken = generatePrintToken(raportId);
  const printUrl = getRaportPrintUrl(baseUrl, raportId, printToken);

  const browser = await getPlaywrightBrowser();
  // Buat context baru tanpa cookie — auth via token di URL
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  let page: Page | null = null;
  try {
    page = await context.newPage();

    await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 20000 });
    await page.waitForSelector(raportReadySelector(raportId), { timeout: 10000 });

    // Tunggu gambar/logo selesai dimuat
    await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.length === 0 || imgs.every((img) => img.complete && img.naturalWidth > 0);
      },
      { timeout: 20000 },
    ).catch(() => {});

    await page.emulateMedia({ media: 'print' });

    const pdfBuffer = await page.pdf(getRaportPdfOptions(juz));
    return Buffer.from(pdfBuffer);
  } finally {
    if (page) await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}
