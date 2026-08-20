// src/app/api/siswa/update-juz-bulk/route.ts
// POST: Update juz_terakhir untuk banyak siswa sekaligus (Kabid only)

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthenticatedSession(request);
    if (session instanceof NextResponse) return session;

    // Hanya Kabid yang boleh
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Hanya Kabid yang dapat melakukan update juz massal.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { student_ids, juz_terakhir } = body;

    // Validasi
    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { message: 'Pilih minimal satu siswa.' },
        { status: 400 }
      );
    }

    if (!juz_terakhir || typeof juz_terakhir !== 'string' || juz_terakhir.trim() === '') {
      return NextResponse.json(
        { message: 'Juz terakhir wajib diisi.' },
        { status: 400 }
      );
    }

    // Filter ID yang valid
    const validIds = student_ids.filter(
      (id: unknown): id is string => typeof id === 'string' && id.trim() !== ''
    );

    if (validIds.length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada ID siswa yang valid.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('santri')
      .update({
        juz_terakhir: juz_terakhir.trim(),
        updated_at: now,
      })
      .in('id', validIds)
      .select('id, nama, juz_terakhir');

    if (error) {
      console.error('Supabase bulk update juz error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui juz siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Juz berhasil diperbarui untuk ${data?.length ?? 0} siswa.`,
      data,
    });
  } catch (error) {
    console.error('Route error /api/siswa/update-juz-bulk:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
