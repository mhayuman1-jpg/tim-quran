export const dynamic = 'force-dynamic';
// src/app/api/siswa/template/route.ts
// GET: Generate dan download file Excel template import siswa
// Otomatis ambil daftar kelas yang tersedia dari database

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { generateExcelTemplate } from '@/lib/excel';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
    }

    // Ambil daftar kelas dari database untuk disertakan di template
    let kelasList: string[] = [];
    try {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('classes')
        .select('name')
        .order('name', { ascending: true });
      kelasList = (data ?? []).map(k => k.name);
    } catch {
      // Lanjut meski gagal ambil kelas
    }

    const buffer = generateExcelTemplate(kelasList);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_import_siswa.xlsx"',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Route error /api/siswa/template:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
