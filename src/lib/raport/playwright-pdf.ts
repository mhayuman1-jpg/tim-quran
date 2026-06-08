// Server-side PDF generator — Playwright + @media print

import type { BrowserContext, Page } from 'playwright';
import {
  RAPORT_PDF_OPTIONS,
  getRaportPrintUrl,
  raportReadySelector,
} from '@/lib/raport/print-config';
import { getPlaywrightBrowser } from '@/lib/raport/playwright-browser';

export interface GenerateRaportPdfOptions {
  raportId: string;
  baseUrl: string;
  cookieHeader?: string;
}

function parseCookies(cookieHeader: string, baseUrl: string) {
  const { hostname } = new URL(baseUrl);
  return cookieHeader
    .split(';')
    .map((pair) => {
      const trimmed = pair.trim();
      const eq = trimmed.indexOf('=');
      if (eq <= 0) return null;
      return {
        name: trimmed.slice(0, eq),
        value: trimmed.slice(eq + 1),
        domain: hostname,
        path: '/',
      };
    })
    .filter((c): c is { name: string; value: string; domain: string; path: string } => Boolean(c));
}

export function resolveBaseUrl(host: string | null, forwardedProto: string | null): string {
  const resolvedHost = host ?? 'localhost:3000';
  const protocol = forwardedProto
    ?? (resolvedHost.includes('localhost') || resolvedHost.startsWith('127.0.0.1') ? 'http' : 'https');
  return process.env.NEXTAUTH_URL ?? `${protocol}://${resolvedHost}`;
}

async function setupPage(context: BrowserContext): Promise<Page> {
  return context.newPage();
}

/**
 * Buka halaman cetak Next.js, aktifkan @media print, lalu hasilkan PDF via Chromium.
 */
export async function generateRaportPdf(options: GenerateRaportPdfOptions): Promise<Buffer> {
  const { raportId, baseUrl, cookieHeader = '' } = options;
  const printUrl = getRaportPrintUrl(baseUrl, raportId);

  const browser = await getPlaywrightBrowser();
  const context = await browser.newContext();

  try {
    if (cookieHeader) {
      await context.addCookies(parseCookies(cookieHeader, baseUrl));
    }

    const page = await setupPage(context);

    await page.goto(printUrl, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('[data-pdf-ready="true"]', { timeout: 20000 });
    await page.waitForSelector(raportReadySelector(raportId), { timeout: 10000 });

    // Tunggu logo (inline data URL) selesai di-decode browser
    await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.length === 0 || imgs.every((img) => img.complete && img.naturalWidth > 0);
      },
      { timeout: 20000 },
    ).catch(() => {});

    await page.emulateMedia({ media: 'print' });

    const pdfBuffer = await page.pdf(RAPORT_PDF_OPTIONS);
    return Buffer.from(pdfBuffer);
  } finally {
    await context.close().catch(() => {});
  }
}
