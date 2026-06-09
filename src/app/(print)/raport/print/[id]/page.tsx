// (print)/raport/print/[id]/page.tsx
// Halaman cetak untuk Playwright PDF — Server Component, berjalan di Node.js runtime.
//
// Auth (Node.js crypto — tidak tersedia di Edge/middleware):
//   1. Jika ada query param _pt → verifikasi signed print-token (Playwright)
//   2. Jika tidak ada → cek session NextAuth (akses browser biasa)
//   3. Keduanya gagal → tampilkan halaman error (tidak redirect, agar Playwright
//      bisa mendeteksi kegagalan via [data-pdf-error] daripada timeout)

import RaportTahfidzDocument from '@/components/features/raport/RaportTahfidzDocument';
import type { RaportTahfidzData } from '@/components/features/raport/raport-tahfidz-types';
import { buildLogoReplacements } from '@/lib/raport/embed-logos';
import { fetchRaportForExport } from '@/lib/raport/fetch-raport-data';
import { verifyPrintToken } from '@/lib/raport/print-token';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams: { _pt?: string };
}

export default async function RaportPrintPage({ params, searchParams }: PageProps) {
  const raportId = params.id;
  const printToken = searchParams._pt;

  // ── Verifikasi Akses ──────────────────────────────────────────────────────
  let authorized = false;

  if (printToken) {
    // Jalur Playwright: verifikasi signed print-token (Node.js crypto)
    authorized = verifyPrintToken(printToken, raportId);
  }

  if (!authorized) {
    // Jalur browser biasa: cek session NextAuth
    const session = await getServerSession(authOptions);
    authorized = !!session;
  }

  if (!authorized) {
    // Tidak ada akses valid — tampilkan error yang bisa dideteksi Playwright
    return (
      <div data-pdf-error="true" style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Akses tidak diizinkan</h2>
        <p>Token tidak valid atau sesi telah berakhir. Silakan login ulang.</p>
      </div>
    );
  }

  // ── Render Raport ─────────────────────────────────────────────────────────
  try {
    const { raport, profil } = await fetchRaportForExport(raportId);
    const { profil: profilWithLogos } = await buildLogoReplacements(profil);

    return (
      <div data-pdf-ready="true">
        <RaportTahfidzDocument
          raport={raport as unknown as RaportTahfidzData}
          profil={profilWithLogos ?? {}}
        />
      </div>
    );
  } catch {
    return (
      <div data-pdf-error="true" style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Gagal memuat raport</h2>
        <p>ID: {raportId}</p>
      </div>
    );
  }
}
