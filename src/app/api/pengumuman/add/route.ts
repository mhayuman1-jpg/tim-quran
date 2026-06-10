// src/app/api/pengumuman/add/route.ts
// POST: Buat pengumuman baru dengan judul, isi, target audiens
// Kabid, Sekretaris, dan Bendahara dapat membuat pengumuman

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AnnouncementTarget } from '@/types';

export const dynamic = 'force-dynamic';

const VALID_TARGETS: AnnouncementTarget[] = ['Guru', 'Siswa', 'Orang Tua', 'Semua'];

export async function POST(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Kabid, Sekretaris, dan Bendahara boleh membuat pengumuman
    const { role, id: userId } = session.user;
    if (role !== 'Kabid' && role !== 'Sekretaris' && role !== 'Bendahara') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { judul, isi, target } = body;

    // Validasi field wajib
    if (!judul || typeof judul !== 'string' || judul.trim() === '') {
      return NextResponse.json(
        { message: 'Judul pengumuman wajib diisi' },
        { status: 400 }
      );
    }
    if (!isi || typeof isi !== 'string' || isi.trim() === '') {
      return NextResponse.json(
        { message: 'Isi pengumuman wajib diisi' },
        { status: 400 }
      );
    }
    if (!target || !VALID_TARGETS.includes(target as AnnouncementTarget)) {
      return NextResponse.json(
        { message: `Target audiens tidak valid. Pilih salah satu: ${VALID_TARGETS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('pengumuman')
      .insert({
        judul: judul.trim(),
        isi: isi.trim(),
        target: target as AnnouncementTarget,
        created_by: userId,
      })
      .select('id, judul, isi, target, created_by, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase error inserting pengumuman:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan pengumuman.', error: error.message },
        { status: 500 }
      );
    }

    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json(
      { message: 'Pengumuman berhasil ditambahkan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/pengumuman/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
