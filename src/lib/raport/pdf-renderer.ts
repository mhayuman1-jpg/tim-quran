// Client helper — unduh PDF via navigasi GET (server-side Playwright)
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
 * Picu unduhan PDF via server-side Playwright — satu request GET.
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
