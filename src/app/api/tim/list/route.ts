// src/app/api/tim/list/route.ts
// GET: Ambil semua user dengan role Tim_Quran beserta nama, email, status

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    // Hanya Kabid yang boleh akses
    if (session.user.role !== 'Kabid') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();

    // Ambil semua user dengan role Tim_Quran
    const { data: timQuran, error } = await supabase
      .from('users')
      .select('id, name, email, status, created_at, photo_url')
      .eq('role', 'Tim_Quran')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error fetching Tim Quran:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data Tim Qur\'an.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: timQuran || [] }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/tim/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
