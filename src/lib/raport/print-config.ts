// Konfigurasi bersama untuk cetak browser & PDF Playwright
// PDF Playwright memakai format A4 (210×297mm) + margin 5mm → area cetak ≈ 287mm tinggi

export const RAPORT_PAGE_SIZE = {
  width: '210mm',
  height: '297mm',
  margin: '5mm',
} as const;

/** Tinggi area cetak satu halaman A4 setelah margin 5mm atas+bawah */
export const RAPORT_PRINTABLE_HEIGHT = '287mm';

export const RAPORT_PDF_OPTIONS = {
  format: 'A4' as const,
  margin: {
    top: '5mm',
    right: '5mm',
    bottom: '5mm',
    left: '5mm',
  },
  printBackground: true,
  scale: 1,
};

/** CSS tambahan untuk react-to-print (browser) */
export const RAPORT_BROWSER_PRINT_STYLE = `
  @page {
    size: ${RAPORT_PAGE_SIZE.width} ${RAPORT_PAGE_SIZE.height};
    margin: ${RAPORT_PAGE_SIZE.margin};
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

export function getRaportPrintUrl(baseUrl: string, raportId: string): string {
  return `${baseUrl}/raport/print/${encodeURIComponent(raportId)}`;
}

export function raportReadySelector(raportId: string): string {
  return `[data-raport-id="${raportId}"]`;
}

/** Juz 30 punya banyak surah — cetak multi-halaman tanpa min-height paksa */
export function isJuz30Raport(juz?: number | null): boolean {
  return Number(juz) === 30;
}
