// GET/POST /api/raport/render-pdf
// Node.js API Route → Playwright → PDF (@media print)
//
// Prefer GET untuk unduh browser (hindari konflik IDM + fetch blob ganda).

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateRaportPdf, resolveBaseUrl } from '@/lib/raport/playwright-pdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

function sanitizeFilename(name: string): string {
  const base = (name || 'raport.pdf').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function pdfResponse(pdfBuffer: Buffer, filename: string) {
  const safeName = sanitizeFilename(filename);

  if (pdfBuffer.length < 5 || pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('PDF tidak valid — hasil render kosong atau rusak.');
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      'Content-Length': pdfBuffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function handleRender(
  request: NextRequest,
  raportId: string,
  filename: string
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (!raportId.trim()) {
    return NextResponse.json({ message: 'Parameter raportId wajib diisi.' }, { status: 400 });
  }

  const baseUrl = resolveBaseUrl(
    request.headers.get('host'),
    request.headers.get('x-forwarded-proto')
  );

  const pdfBuffer = await generateRaportPdf({
    raportId: raportId.trim(),
    baseUrl,
    cookieHeader: request.headers.get('cookie') ?? '',
  });

  return pdfResponse(pdfBuffer, filename);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const raportId = searchParams.get('raportId') ?? '';
  const filename = searchParams.get('filename') ?? 'raport.pdf';

  try {
    return await handleRender(request, raportId, filename);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/raport/render-pdf]', { raportId, error: errorMessage });
    return NextResponse.json(
      { message: 'Gagal generate PDF', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { raportId?: string; filename?: string };
  try {
    const raw = await request.text();
    if (!raw.trim()) {
      return NextResponse.json({ message: 'Request body kosong.' }, { status: 400 });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: 'JSON tidak valid.' }, { status: 400 });
  }

  const { raportId = '', filename = 'raport.pdf' } = body;

  try {
    return await handleRender(request, raportId, filename);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[POST /api/raport/render-pdf]', { raportId, error: errorMessage });
    return NextResponse.json(
      { message: 'Gagal generate PDF', error: errorMessage },
      { status: 500 }
    );
  }
}
