// Client helper — unduh PDF via navigasi GET (bukan fetch+blob)
//
// Kenapa tidak pakai fetch?
// Internet Download Manager (IDM) dan ekstensi sejenis menangkap respons fetch
// LALU kode juga memicu unduhan kedua via blob → file dobel & PDF rusak.
//
// Alur: klik link → GET /api/raport/render-pdf → Playwright → satu file PDF

export function sanitizePdfFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'raport.pdf';
}

/**
 * Picu unduhan PDF — satu request GET, tidak bentrok dengan IDM.
 * Jangan pakai fetch()+blob: IDM menangkap fetch, lalu blob memicu unduhan kedua.
 */
export function triggerRaportPdfDownload(raportId: string, filename: string): void {
  const safeName = sanitizePdfFilename(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  const params = new URLSearchParams({ raportId, filename: safeName });
  const url = `/api/raport/render-pdf?${params.toString()}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
