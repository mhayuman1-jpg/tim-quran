// (print)/raport/print/[id]/page.tsx
// Halaman cetak untuk Playwright PDF — Server Component (Node.js runtime).
//
// Auth flow: SATU JALUR SAJA — _pt query param atau print_token cookie.
//   1. Verifikasi HMAC signature + expiry
//   2. Jika valid → render raport langsung dari DB (server-side)
//   3. Jika invalid → REJECT (403)
//
// Halaman ini TIDAK dibungkus SessionProvider (ConditionalProviders di root
// layout melewati provider untuk /raport/print/*). Tidak ada client-side
// session fetch, tidak ada useSession().
//
// RaportTahfidzDocument adalah komponen presentasional murni — tidak ada
// useSession(), tidak ada fetch(), tidak ada dependensi auth client-side.
// Semua data diambil server-side via fetchRaportForExport().

import RaportTahfidzDocument from '@/components/features/raport/RaportTahfidzDocument';
import type { RaportTahfidzData } from '@/components/features/raport/raport-tahfidz-types';
import { buildLogoReplacements } from '@/lib/raport/embed-logos';
import { fetchRaportForExport, HEADER_SELECT } from '@/lib/raport/fetch-raport-data';
import type { RaportExportData } from '@/lib/raport/fetch-raport-data';
import { verifyPrintToken } from '@/lib/raport/print-token';
import { createServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams: { _pt?: string };
}

export default async function RaportPrintPage({ params, searchParams }: PageProps) {
  const raportId = params.id;
  const now = Date.now();

  // ── Auth: _pt query param atau print_token cookie ──────────────────────
  const cookieToken = cookies().get('print_token')?.value;
  const queryToken = searchParams._pt;
  const printToken = cookieToken || queryToken;

  console.log('[print] Token received', {
    raportId,
    hasCookieToken: !!cookieToken,
    cookieTokenLen: cookieToken?.length ?? 0,
    hasQueryToken: !!queryToken,
    queryTokenLen: queryToken?.length ?? 0,
    source: cookieToken ? 'cookie' : queryToken ? 'query' : 'none',
  });

  if (!printToken) {
    console.error('[print] ACCESS DENIED — no _pt token', { raportId, now });
    return (
      <div data-pdf-error="true" style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Akses tidak diizinkan</h2>
        <p>Silakan buka dari menu raport atau sertakan token cetak yang valid.</p>
      </div>
    );
  }

  const tokenValid = verifyPrintToken(printToken, raportId);

  if (!tokenValid) {
    console.error('[print] Token INVALID — rejecting', {
      raportId,
      now,
      tokenPrefix: printToken.substring(0, 12) + '...',
    });
    return (
      <div data-pdf-error="true" style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Akses tidak diizinkan</h2>
        <p>Token cetak tidak valid atau sudah kedaluwarsa. Silakan coba lagi dari menu raport.</p>
      </div>
    );
  }

  console.log('[print] Authorized via print token (HMAC)', { raportId, now });
  return renderRaport(raportId);
}

/**
 * Render raport — semua data diambil server-side, tidak ada client-side fetch.
 * RaportTahfidzDocument murni presentasional, tidak perlu session/auth.
 * Jika ada sibling raport (same student+period, different juz), render semua.
 */
async function renderRaport(raportId: string) {
  try {
    const { raport, profil } = await fetchRaportForExport(raportId);
    const { profil: profilWithLogos } = await buildLogoReplacements(profil);

    // Fetch sibling raports (same student+period, different juz)
    let siblingRaports: RaportExportData[] = [];
    if (raport.student_id && raport.periode) {
      const supabase = createServerClient();
      const { data: siblings } = await supabase
        .from('raport_tahfidz')
        .select(HEADER_SELECT)
        .eq('student_id', raport.student_id)
        .ilike('periode', raport.periode)
        .neq('id', raportId)
        .order('juz', { ascending: true });

      if (siblings && siblings.length > 0) {
        // Fetch detail for each sibling
        for (const sib of siblings) {
          const { data: fullSib } = await supabase
            .from('raport_tahfidz')
            .select(`${HEADER_SELECT}, raport_tahfidz_detail ( * )`)
            .eq('id', sib.id)
            .single();
          if (fullSib) siblingRaports.push(fullSib as unknown as RaportExportData);
        }
      }
    }

    // Sort main raport juz + siblings by juz
    const allRaports = [raport as unknown as RaportExportData, ...siblingRaports]
      .sort((a, b) => (a.juz ?? 0) - (b.juz ?? 0));

    return (
      <div data-pdf-ready="true">
        {allRaports.map((r, idx) => (
          <div key={r.id} style={idx > 0 ? { pageBreakBefore: 'always' } : undefined}>
            <RaportTahfidzDocument
              raport={r}
              profil={profilWithLogos ?? {}}
            />
          </div>
        ))}
      </div>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[print] Gagal memuat raport:', { raportId, error: msg });
    return (
      <div data-pdf-error="true" style={{ padding: '2rem', color: '#dc2626', fontFamily: 'sans-serif' }}>
        <h2>Gagal memuat raport</h2>
        <p>ID: {raportId}</p>
        <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>{msg}</p>
      </div>
    );
  }
}
