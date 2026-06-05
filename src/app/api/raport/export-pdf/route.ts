// src/app/api/raport/export-pdf/route.ts
// GET: Export raport siswa ke PDF
// Query: id=raport_id (satu raport) ATAU periode=xxx (semua di periode itu)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const raportId = searchParams.get('id');
  const periode = searchParams.get('periode');

  if (!raportId && !periode) {
    return NextResponse.json({ message: 'Parameter id atau periode wajib diisi.' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    let q = supabase
      .from('raport_quran')
      .select('*, santri(nama, nisn, classes(name)), users(name)');

    if (raportId) q = q.eq('id', raportId);
    else if (periode) q = q.ilike('periode', `%${periode}%`);

    const { data, error } = await q;
    if (error || !data?.length) {
      return NextResponse.json({ message: 'Data raport tidak ditemukan.' }, { status: 404 });
    }

    // Return JSON — PDF generation dilakukan di client dengan jsPDF
    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
