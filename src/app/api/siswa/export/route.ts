export const dynamic = 'force-dynamic';
// src/app/api/siswa/export/route.ts
// GET: Export data siswa ke Excel
// Query: search (opsional), class_id (opsional)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';
import * as xlsx from 'xlsx';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim() ?? '';
  const classId = searchParams.get('class_id')?.trim() ?? '';

  try {
    const supabase = createServerClient();

    let query = supabase
      .from('santri')
      .select(
        `id, nisn, nama, gender, tanggal_lahir, juz_terakhir, qr_code, assigned_teacher_id, status, created_at,
         classes ( id, name )`
      )
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher((session.user as any).role, request)) {
      const teacherId = getTeacherFilterId((session.user as any).role, request, (session.user as any).id);
      const classIds = await getTeacherClassIds(supabase, teacherId);
      query = applyTeacherSantriFilter(query, teacherId, classIds, classId);
    }

    if (classId) {
      query = query.eq('class_id', classId);
    }

    if (search) {
      query = query.ilike('nama', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });

    const wb = xlsx.utils.book_new();
    const headers = ['No', 'NIS/NISN', 'Nama Lengkap', 'Jenis Kelamin', 'Tanggal Lahir', 'Kelas', 'Juz Terakhir', 'QR Code', 'Status', 'Tanggal Dibuat'];
    const rows = ((data ?? []) as any[]).map((r, i) => [
      i + 1,
      r.nisn ?? '',
      r.nama ?? '',
      r.gender ?? '',
      r.tanggal_lahir ?? '',
      r.classes?.name ?? '',
      r.juz_terakhir ?? '',
      r.qr_code ?? '',
      r.status ?? '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '',
    ]);

    const ws = xlsx.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [
      { wch: 4 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 12 }, { wch: 16 },
    ];
    xlsx.utils.book_append_sheet(wb, ws, 'Data Siswa');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const className = (data?.[0] as any)?.classes?.name ?? classId;
    const filename = `data_siswa${className ? '_' + className.replace(/\s+/g, '_') : ''}.xlsx`;
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
