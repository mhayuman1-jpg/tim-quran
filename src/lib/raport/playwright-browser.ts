// Singleton Chromium — gunakan playwright-core + @sparticuz/chromium agar kompatibel
// dengan serverless function Vercel (tidak melebihi batas 50MB deployment).

import type { Browser } from 'playwright-core';

let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let lastUsed = Date.now();

const IDLE_CLOSE_MS = 5 * 60 * 1000;

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright-core');
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Di Vercel: gunakan @sparticuz/chromium agar binary ringan (tidak melebihi 50MB)
    const sparticuz = await import('@sparticuz/chromium');
    const chromiumLib = sparticuz.default;

    const path = await import('path');
    const fs = await import('fs');
    const binPath = path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin');

    let executablePath: string;
    if (fs.existsSync(binPath)) {
      executablePath = await chromiumLib.executablePath(binPath);
    } else {
      executablePath = await chromiumLib.executablePath();
    }

    const browser = await chromium.launch({
      args: chromiumLib.args,
      executablePath,
      headless: true,
    });

    browser.on('disconnected', () => {
      browserInstance = null;
      browserPromise = null;
    });

    return browser;
  } else {
    // Di lokal: gunakan binary Chromium bawaan playwright-core (dari PLAYWRIGHT_BROWSERS_PATH atau system)
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });

    browser.on('disconnected', () => {
      browserInstance = null;
      browserPromise = null;
    });

    return browser;
  }
}

export async function getPlaywrightBrowser(): Promise<Browser> {
  lastUsed = Date.now();

  if (browserInstance?.isConnected()) {
    return browserInstance;
  }

  if (!browserPromise) {
    browserPromise = launchBrowser()
      .then((browser) => {
        browserInstance = browser;
        browserPromise = null;
        scheduleIdleClose();
        return browser;
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }

  return browserPromise;
}

function scheduleIdleClose() {
  setTimeout(async () => {
    if (Date.now() - lastUsed < IDLE_CLOSE_MS) {
      scheduleIdleClose();
      return;
    }
    if (browserInstance?.isConnected()) {
      await browserInstance.close().catch(() => {});
      browserInstance = null;
    }
  }, IDLE_CLOSE_MS);
}
