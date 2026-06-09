import { ReactNode } from 'react';
import '@/styles/raport-print.css';

export const dynamic = 'force-dynamic';

/**
 * Layout minimal untuk halaman cetak raport.
 *
 * Auth TIDAK dicek di sini karena:
 * - Middleware (Edge Runtime) tidak mendukung Node.js crypto untuk verifikasi print-token
 * - Auth ditangani di page.tsx yang berjalan di Node.js runtime
 *
 * Dua jalur akses:
 * 1. Browser biasa → session NextAuth dicek di page.tsx
 * 2. Playwright server → signed print-token (_pt) dicek di page.tsx
 */
export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <div className="raport-pdf-render" style={{ margin: 0, padding: 0, background: '#fff', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
