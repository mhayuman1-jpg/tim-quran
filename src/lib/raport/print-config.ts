// Konfigurasi bersama untuk cetak browser & PDF Playwright
// PDF Playwright memakai format F4 (210×330mm)

// ─── Margin per Juz ──────────────────────────────────────────────────────────
// Juz 30: bottom 1.29" (32.8mm) — banyak surah, perlu spasi lebih
// Juz 1-29: bottom 0.46" (11.7mm) — lebih sedikit surah

export const MARGIN_JUZ_30 = {
  top: '5.6mm', right: '9.9mm', bottom: '34.5mm', left: '9.1mm',
} as const;

export const MARGIN_JUZ_1_TO_29 = {
  top: '5.6mm', right: '9.9mm', bottom: '11.7mm', left: '9.1mm',
} as const;

export const RAPORT_PAGE_SIZE = {
  width: '210mm',
  height: '330mm',
} as const;

/** Get margin berdasarkan juz */
export function getRaportMargin(juz?: number | null): { top: string; right: string; bottom: string; left: string } {
  return isJuz30Raport(juz) ? MARGIN_JUZ_30 : MARGIN_JUZ_1_TO_29;
}

/** Get CSS margin string berdasarkan juz */
export function getRaportMarginCSS(juz?: number | null): string {
  const m = getRaportMargin(juz);
  return `${m.top} ${m.right} ${m.bottom} ${m.left}`;
}

/** Tinggi area cetak satu halaman F4 setelah margin */
export const RAPORT_PRINTABLE_HEIGHT = '312.7mm';

export function getRaportPdfOptions(juz?: number | null) {
  const margin = getRaportMargin(juz);
  return {
    format: 'A4' as const,
    width: '210mm',
    height: '330mm',
    margin,
    printBackground: true,
    scale: 1,
  };
}

/** CSS tambahan untuk react-to-print (browser) */
export function getRaportBrowserPrintStyle(juz?: number | null): string {
  const marginCSS = getRaportMarginCSS(juz);
  return `
  @page {
    size: ${RAPORT_PAGE_SIZE.width} ${RAPORT_PAGE_SIZE.height};
    margin: ${marginCSS};
  }
  @media print {
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .raport-print-root {
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 8px !important;
    }
    .raport-page-sheet--flow {
      min-height: auto !important;
      display: block !important;
    }
    .raport-page-sheet--flow .raport-page-footer {
      position: static !important;
      margin-top: 12px !important;
    }
    .raport-page-sheet--fill {
      position: relative !important;
      min-height: ${RAPORT_PRINTABLE_HEIGHT} !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .raport-page-sheet--fill .raport-page-body {
      flex: 1 1 auto !important;
      padding-bottom: 12mm !important;
    }
    .raport-page-sheet--fill .raport-page-footer {
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      margin-top: 0 !important;
    }
    .raport-page-footer,
    .raport-page-footer-lines {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .raport-tahfidz-table thead {
      display: table-row-group !important;
    }
  }
  `;
}

/** @deprecated Use getRaportBrowserPrintStyle(juz) instead */
export const RAPORT_BROWSER_PRINT_STYLE = getRaportBrowserPrintStyle();

export function getRaportPrintUrl(baseUrl: string, raportId: string, printToken?: string): string {
  const base = `${baseUrl}/raport/print/${encodeURIComponent(raportId)}`;
  return printToken ? `${base}?_pt=${encodeURIComponent(printToken)}` : base;
}

export function raportReadySelector(raportId: string): string {
  return `[data-raport-id="${raportId}"]`;
}

/** Juz 30 punya banyak surah — cetak multi-halaman tanpa min-height paksa */
export function isJuz30Raport(juz?: number | null): boolean {
  return Number(juz) === 30;
}
