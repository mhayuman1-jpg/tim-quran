// Client helper — unduh Word (.docx) via GET (sama pola dengan PDF, hindari IDM ganda)

export function sanitizeDocxFilename(name: string): string {
  const base = name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'raport';
  return base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`;
}

export function triggerRaportDocxDownload(raportId: string, filename: string): void {
  const safeName = sanitizeDocxFilename(filename);
  const params = new URLSearchParams({ raportId, filename: safeName });
  const url = `/api/raport/export-docx?${params.toString()}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
