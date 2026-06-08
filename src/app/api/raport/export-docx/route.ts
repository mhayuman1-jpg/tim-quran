// GET /api/raport/export-docx?raportId=...&filename=...
// Node.js API Route → docx library → file Word sesuai layout preview

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildRaportDocx } from '@/lib/raport/build-docx';
import { fetchRaportForExport } from '@/lib/raport/fetch-raport-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function sanitizeFilename(name: string): string {
  const base = (name || 'raport.docx').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  return base.toLowerCase().endsWith('.docx') ? base : `${base}.docx`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const raportId = searchParams.get('raportId')?.trim() ?? '';
  const filename = sanitizeFilename(searchParams.get('filename') ?? 'raport.docx');

  if (!raportId) {
    return NextResponse.json({ message: 'Parameter raportId wajib diisi.' }, { status: 400 });
  }

  try {
    const { raport, profil } = await fetchRaportForExport(raportId);
    const buffer = await buildRaportDocx(raport, profil);

    if (buffer.length < 4 || buffer.subarray(0, 2).toString('hex') !== '504b') {
      throw new Error('File Word tidak valid.');
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/raport/export-docx]', { raportId, message });
    return NextResponse.json({ message: 'Gagal membuat Word.', error: message }, { status: 500 });
  }
}
