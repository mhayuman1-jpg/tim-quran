// src/app/api/hafalan/export/route.ts
// GET: Export hafalan ke Excel
// Query: month=YYYY-MM (opsional), student_id (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import * as xlsx from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const studentId = searchParams.get('student_id');

  try {
    const supabase = createServerClient();

    let q = supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, catatan, santri(nama, nisn, classes(name)), users(name)')
      .order('tanggal', { ascending: false });

    if (month) {
      q = q.gte('tanggal', `${month}-01`).lte('tanggal', `${month}-31`);
    }
    if (studentId) q = q.eq('student_id', studentId);
    if ((session.user as any).role === 'Tim_Quran') q = q.eq('teacher_id', (session.user as any).id);

    const { data, error } = await q;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    const wb = xlsx.utils.book_new();
    const headers = ['No', 'Tanggal', 'NISN', 'Nama Siswa', 'Kelas', 'Surah/Juz', 'Halaman', 'Catatan', 'Dicatat Oleh'];
    const rows = ((data ?? []) as any[]).map((r, i) => [
      i + 1,
      r.tanggal,
      r.santri?.nisn ?? '',
      r.santri?.nama ?? '',
      r.santri?.classes?.name ?? '',
      r.surah_juz,
      r.halaman ?? '',
      r.catatan ?? '',
      r.users?.name ?? '',
    ]);

    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 4 }, { wch: 13 }, { wch: 14 }, { wch: 28 },
      { wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 30 }, { wch: 18 },
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Hafalan');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const filename = `hafalan${month ? '_' + month : ''}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
