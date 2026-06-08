// Singleton Chromium — hindari launch browser tiap request (hemat ~2–4 detik)

import type { Browser } from 'playwright';

let browserInstance: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let lastUsed = Date.now();

const IDLE_CLOSE_MS = 5 * 60 * 1000;

const LAUNCH_ARGS = [
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-gpu',
  '--disable-extensions',
];

async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  browser.on('disconnected', () => {
    browserInstance = null;
    browserPromise = null;
  });
  return browser;
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
