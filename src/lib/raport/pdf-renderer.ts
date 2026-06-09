// Client helper — unduh PDF via HTML-to-Image + jsPDF di sisi client (100% kompatibel dengan serverless)

import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export function sanitizePdfFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'raport.pdf';
}

/**
 * Picu unduhan PDF dengan mengonversi elemen HTML menjadi gambar PNG resolusi tinggi
 * dan memasukkannya ke dalam dokumen PDF A4 di sisi client.
 */
export async function triggerRaportPdfDownload(raportId: string, filename: string): Promise<void> {
  const safeName = sanitizePdfFilename(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

  // Cari element preview di DOM
  const element = document.querySelector('.raport-preview-sheet') as HTMLDivElement | null;
  if (!element) {
    throw new Error('Element preview raport tidak ditemukan di halaman.');
  }

  // Opsi render gambar beresolusi tinggi (pixelRatio: 2) agar teks tajam saat dicetak/di-zoom
  const dataUrl = await toPng(element, {
    quality: 0.95,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Hitung aspek rasio agar pas di satu halaman A4
  const imgWidth = pdfWidth;
  const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

  // Jika tinggi gambar melebihi tinggi halaman A4, batasi atau jadikan multi-page.
  const finalHeight = imgHeight > pdfHeight ? pdfHeight : imgHeight;

  pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, finalHeight);
  pdf.save(safeName);
}
