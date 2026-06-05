// src/app/api/absensi/scan/route.ts
// POST: terima qr_code, cari siswa di tabel santri, cek duplikat absensi hari ini,
// insert ke tabel attendances, return nama siswa.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Verifikasi sesi — hanya pengguna terautentikasi
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Tidak terautentikasi.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { qr_code } = body as { qr_code?: string };

    if (!qr_code || typeof qr_code !== 'string' || qr_code.trim() === '') {
      return NextResponse.json(
        { message: 'QR Code tidak terbaca atau kosong.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Cari siswa berdasarkan nilai qr_code
    const { data: siswa, error: siswaError } = await supabase
      .from('santri')
      .select('id, nama')
      .eq('qr_code', qr_code.trim())
      .single();

    if (siswaError || !siswa) {
      return NextResponse.json(
        { message: 'QR Code tidak dikenali.' },
        { status: 404 }
      );
    }

    // 2. Tanggal hari ini format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // 3. Cek duplikat: cari record di attendances dengan santri_id & date = hari ini
    const { data: existing, error: checkError } = await supabase
      .from('attendances')
      .select('id')
      .eq('santri_id', siswa.id)
      .eq('date', today)
      .maybeSingle();

    if (checkError) {
      console.error('Duplikat check error:', checkError);
      return NextResponse.json(
        { message: 'Gagal memeriksa data absensi.' },
        { status: 500 }
      );
    }

    if (existing) {
      // Requirement 4.4: ALWAYS return 409 jika siswa sudah absen hari ini
      return NextResponse.json(
        { message: 'Siswa sudah absen hari ini.' },
        { status: 409 }
      );
    }

    // 4. Insert ke tabel attendances
    const { error: insertError } = await supabase
      .from('attendances')
      .insert({
        santri_id: siswa.id,
        date: today,
        status: 'Hadir',
      });

    if (insertError) {
      // Fallback: constraint UNIQUE violation (code 23505) — race condition
      if (insertError.code === '23505') {
        return NextResponse.json(
          { message: 'Siswa sudah absen hari ini.' },
          { status: 409 }
        );
      }
      console.error('Insert absensi error:', insertError);
      return NextResponse.json(
        { message: 'Gagal mencatat absensi: ' + insertError.message },
        { status: 500 }
      );
    }

    // 5. Berhasil — kembalikan nama siswa
    return NextResponse.json(
      { message: 'Absen berhasil!', siswa: siswa.nama },
      { status: 200 }
    );
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
