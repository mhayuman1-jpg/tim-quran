// GET /api/raport/render-pdf
// Smart download endpoint — cek cache PDF di Tigris Storage terlebih dahulu.
//
// Alur:
//   1. Validasi session user (401 jika tidak login)
//   2. Cek akses RBAC (403 jika tidak berhak)
//   3. Cek cache pdf_path di database → signed URL redirect (instan)
//   4. Jika tidak ada cache → Playwright render → upload → redirect
//
// Error codes:
//   400 — parameter tidak valid
//   401 — session tidak ada / tidak valid
//   403 — user tidak berhak akses raport ini
//   404 — raport tidak ditemukan
//   500 — gagal render PDF

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateRaportPdf, resolveBaseUrl } from '@/lib/raport/playwright-pdf';
import { uploadRaportPdf, getSignedPdfUrl } from '@/lib/raport/pdf-storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

function sanitizeFilename(name: string): string {
  const base = (name || 'raport.pdf').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

/**
 * Cek apakah user berhak mengakses raport tertentu.
 * - Kabid/Sekretaris: boleh akses semua raport
 * - Tim_Quran: hanya raport siswa yang diampunya (assigned_teacher_id = user.id)
 */
async function checkRaportAccess(
  supabase: ReturnType<typeof createServerClient>,
  raportId: string,
  userId: string,
  role: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: raport, error } = await supabase
    .from('raport_tahfidz')
    .select('id, teacher_id, santri ( id, nama, assigned_teacher_id )')
    .eq('id', raportId)
    .single();

  if (error || !raport) {
    return { allowed: false, reason: 'not_found' };
  }

  if (role === 'Kabid' || role === 'Sekretaris') {
    return { allowed: true };
  }

  if (role === 'Tim_Quran') {
    const santri = raport.santri as { assigned_teacher_id?: string } | null;
    if (santri?.assigned_teacher_id === userId) return { allowed: true };
    if (raport.teacher_id === userId) return { allowed: true };
    return { allowed: false, reason: 'forbidden' };
  }

  if (role === 'Wali_Murid') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'forbidden' };
}

export async function GET(request: NextRequest) {
  const requestStart = Date.now();

  // ── 1. Validasi session (401) ──────────────────────────────────────────
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  const { searchParams } = new URL(request.url);
  const raportId = (searchParams.get('raportId') ?? '').trim();
  const filename = sanitizeFilename(searchParams.get('filename') ?? 'raport.pdf');

  if (!raportId) {
    return NextResponse.json(
      { message: 'Parameter raportId wajib diisi.' },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();

    // ── 2. Cek raport ada (404) ──────────────────────────────────────────
    const { data: raport, error: fetchErr } = await supabase
      .from('raport_tahfidz')
      .select('id, pdf_path, juz')
      .eq('id', raportId)
      .single();

    if (fetchErr || !raport) {
      return NextResponse.json(
        { message: 'Raport tidak ditemukan.' },
        { status: 404 },
      );
    }

    // ── 3. Cek akses RBAC (403) ──────────────────────────────────────────
    const access = await checkRaportAccess(
      supabase,
      raportId,
      session.user.id,
      session.user.role as string,
    );

    if (!access.allowed) {
      const status = access.reason === 'not_found' ? 404 : 403;
      const message = access.reason === 'not_found'
        ? 'Raport tidak ditemukan.'
        : 'Anda tidak memiliki akses ke raport ini.';
      return NextResponse.json({ message }, { status });
    }

    // ── 4. Cache hit → signed URL redirect (instan) ──────────────────────
    if (raport.pdf_path) {
      const signedUrl = await getSignedPdfUrl(raport.pdf_path, filename);
      if (signedUrl) {
        console.log('[render-pdf] Cache hit', { raportId, elapsedMs: Date.now() - requestStart });
        return NextResponse.redirect(signedUrl, { status: 302 });
      }
      // Signed URL gagal → regenerate
    }

    // ── 5. Generate PDF baru via Playwright ───────────────────────────────
    const baseUrl = resolveBaseUrl(
      request.headers.get('host'),
      request.headers.get('x-forwarded-proto'),
    );

    console.log('[render-pdf] Generating PDF...', {
      raportId,
      juz: raport.juz,
      userId: session.user.id,
      role: session.user.role,
    });

    const pdfBuffer = await generateRaportPdf({
      raportId,
      baseUrl,
      juz: raport.juz,
    });

    // Validasi PDF output
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('PDF tidak valid — hasil render kosong atau rusak.');
    }

    console.log('[render-pdf] PDF generated, uploading...', {
      raportId,
      bytes: pdfBuffer.length,
    });

    // ── 6. Upload ke Tigris + simpan path ────────────────────────────────
    const storagePath = await uploadRaportPdf(raportId, pdfBuffer);

    await supabase
      .from('raport_tahfidz')
      .update({ pdf_path: storagePath })
      .eq('id', raportId);

    // ── 7. Signed URL redirect ───────────────────────────────────────────
    const signedUrl = await getSignedPdfUrl(storagePath, filename);
    if (signedUrl) {
      console.log('[render-pdf] Fresh PDF uploaded + redirected', {
        raportId,
        elapsedMs: Date.now() - requestStart,
      });
      return NextResponse.redirect(signedUrl, { status: 302 });
    }

    // Fallback: stream PDF langsung
    console.log('[render-pdf] Fallback: streaming PDF directly', { raportId });
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[render-pdf] ERROR:', {
      raportId,
      elapsedMs: Date.now() - requestStart,
      error: msg,
    });
    return NextResponse.json(
      {
        message: 'Gagal menghasilkan PDF. Silakan coba lagi.',
        ...(process.env.NODE_ENV === 'development' ? { detail: msg } : {}),
      },
      { status: 500 },
    );
  }
}

// POST untuk kompatibilitas mundur — delegasi ke GET
export async function POST(request: NextRequest) {
  let body: { raportId?: string; filename?: string };
  try {
    const raw = await request.text();
    if (!raw.trim()) return NextResponse.json({ message: 'Request body kosong.' }, { status: 400 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: 'JSON tidak valid.' }, { status: 400 });
  }

  const { raportId = '', filename = 'raport.pdf' } = body;
  const params = new URLSearchParams({ raportId, filename });
  const getUrl = new URL(`${request.url.split('?')[0]}?${params.toString()}`);
  return GET(new NextRequest(getUrl.toString(), { headers: request.headers }));
}
