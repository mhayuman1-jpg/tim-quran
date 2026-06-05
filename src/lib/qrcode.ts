// src/lib/qrcode.ts
// Helper untuk generate QR code sebagai data URL
// menggunakan library `qrcode`

import QRCode from 'qrcode';

/**
 * Generate QR code dari teks/UUID dan kembalikan sebagai data URL (PNG base64).
 *
 * @param text  - String yang akan di-encode, biasanya `qr_code` UUID santri
 * @param size  - Ukuran gambar dalam piksel (default 200)
 * @returns     - Data URL format `data:image/png;base64,...`
 */
export async function generateQRCodeDataURL(text: string, size = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });
}

/**
 * Generate QR code dan gambar langsung ke elemen `<canvas>`.
 *
 * @param canvas  - Elemen canvas HTMLCanvasElement
 * @param text    - String yang akan di-encode
 * @param size    - Ukuran canvas dalam piksel (default 160)
 */
export async function generateQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  size = 160,
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
