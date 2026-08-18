// src/lib/raport/print-config.ts
// Placeholder - replaced binary-corrupt file for build verification.
// Exports required by codebase:
//   getRaportBrowserPrintStyle, getRaportMarginCSS, isJuz30Raport, isJuz1Raport,
//   JUZ1_TEMPLATE, getRaportPrintUrl, raportReadySelector, getRaportPdfOptions

export type JuzNumber = number | string | null | undefined;

export interface RaportPrintStyle {
  page: { size: string; margin: string };
  font: { family: string; size: number };
}

export const JUZ1_TEMPLATE = 'juz1';
export const JUZ30_TEMPLATE = 'juz30';

export function isJuz30Raport(juz: JuzNumber): boolean {
  const n = typeof juz === 'string' ? parseInt(juz, 10) : juz;
  return n === 30 || n === 29;
}

export function isJuz1Raport(juz: JuzNumber): boolean {
  const n = typeof juz === 'string' ? parseInt(juz, 10) : juz;
  return n === 1;
}

export function getRaportBrowserPrintStyle(juz?: JuzNumber): string {
  return isJuz30Raport(juz)
    ? `@page { size: A4; margin: 15mm; } body { font-family: 'Times New Roman', serif; font-size: 10pt; }`
    : `@page { size: A4; margin: 20mm; } body { font-family: 'Times New Roman', serif; font-size: 12pt; }`;
}

export function getRaportMarginCSS(juz?: JuzNumber): string {
  const style = getRaportBrowserPrintStyle(juz);
  return style;
}

export function getRaportPrintUrl(id: string): string {
  return `/raport/print/${id}`;
}

export function raportReadySelector(html: string): boolean {
  return html.includes('raport-ready');
}

export interface RaportPdfOptions {
  format: string;
  margin: { top: string; right: string; bottom: string; left: string };
  printBackground: boolean;
}

export function getRaportPdfOptions(juz?: JuzNumber): RaportPdfOptions {
  const style = getRaportBrowserPrintStyle(juz);
  return {
    format: style.page.size,
    margin: { top: style.page.margin, right: style.page.margin, bottom: style.page.margin, left: style.page.margin },
    printBackground: true,
  };
}
