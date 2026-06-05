// src/app/api/pengumuman/update/route.ts
// PUT: Update pengumuman, catat updated_at
// Keduanya Kabid dan Tim_Quran dapat mengedit pengumuman

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import type { AnnouncementTarget } from '@/types';

const VALID_TARGETS: AnnouncementTarget[] = ['Guru', 'Siswa', 'Orang Tua', 'Semua'];

export async function PUT(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Kedua role boleh mengedit pengumuman
    const { role } = session.user;
    if (role !== 'Kabid' && role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, judul, isi, target } = body;

    // Validasi field wajib
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID pengumuman wajib diisi' },
        { status: 400 }
      );
    }
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

    // Cek apakah pengumuman ada
    const { data: existing, error: checkError } = await supabase
      .from('pengumuman')
      .select('id')
      .eq('id', id.trim())
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { message: 'Pengumuman tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update pengumuman dengan mencatat updated_at
    const { data, error } = await supabase
      .from('pengumuman')
      .update({
        judul: judul.trim(),
        isi: isi.trim(),
        target: target as AnnouncementTarget,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id.trim())
      .select('id, judul, isi, target, created_by, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase error updating pengumuman:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui pengumuman.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Pengumuman berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/pengumuman/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
