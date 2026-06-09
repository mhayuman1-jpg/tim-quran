// GET /api/raport/render-pdf
// Smart download endpoint — cek cache PDF di Supabase Storage terlebih dahulu.
//
// Alur:
//   1. Cek kolom pdf_path di raport_tahfidz
//   2. Jika ada  → buat signed URL → redirect ke Supabase CDN (instan, <1 detik)
//   3. Jika tidak → Playwright render → upload storage → simpan pdf_path → redirect

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raportId = (searchParams.get('raportId') ?? '').trim();
  const filename = sanitizeFilename(searchParams.get('filename') ?? 'raport.pdf');

  if (!raportId) {
    return NextResponse.json({ message: 'Parameter raportId wajib diisi.' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();

    // ── Langkah 1: Cek cache pdf_path di database ─────────────────────────
    const { data: raport, error: fetchErr } = await supabase
      .from('raport_tahfidz')
      .select('id, pdf_path, juz')
      .eq('id', raportId)
      .single();

    if (fetchErr || !raport) {
      return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });
    }

    // ── Langkah 2: Jika cache ada → buat signed URL dan redirect ──────────
    if (raport.pdf_path) {
      const signedUrl = await getSignedPdfUrl(raport.pdf_path, filename);
      if (signedUrl) {
        // Redirect ke Supabase CDN — browser/IDM langsung unduh tanpa memuat server lagi
        return NextResponse.redirect(signedUrl, { status: 302 });
      }
      // Jika signed URL gagal (file terhapus manual?), lanjut ke regenerate
    }

    // ── Langkah 3: Generate PDF baru via Playwright ───────────────────────
    const baseUrl = resolveBaseUrl(
      request.headers.get('host'),
      request.headers.get('x-forwarded-proto'),
    );

    const pdfBuffer = await generateRaportPdf({
      raportId,
      baseUrl,
      juz: raport.juz,
      cookieHeader: request.headers.get('cookie') ?? '',
    });

    // Validasi PDF
    if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('PDF tidak valid — hasil render kosong atau rusak.');
    }

    // ── Langkah 4: Upload ke Supabase Storage ─────────────────────────────
    const storagePath = await uploadRaportPdf(raportId, pdfBuffer);

    // ── Langkah 5: Simpan pdf_path ke database ────────────────────────────
    await supabase
      .from('raport_tahfidz')
      .update({ pdf_path: storagePath })
      .eq('id', raportId);

    // ── Langkah 6: Buat signed URL dan redirect ───────────────────────────
    const signedUrl = await getSignedPdfUrl(storagePath, filename);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl, { status: 302 });
    }

    // Fallback terakhir: stream PDF langsung jika Supabase signed URL gagal
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
    console.error('[GET /api/raport/render-pdf]', { raportId, error: msg });
    return NextResponse.json({ message: 'Gagal generate PDF', error: msg }, { status: 500 });
  }
}

// Tetap pertahankan POST untuk kompatibilitas mundur
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
