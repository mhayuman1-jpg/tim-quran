// src/app/api/siswa/list/route.ts
// GET: Ambil semua santri dengan join ke classes
// - Filter by assigned_teacher_id jika role Tim_Quran (data isolation)
// - Support query param `search` untuk filter nama (case-insensitive)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';

    // Mulai query dengan join ke tabel classes
    let query = supabase
      .from('santri')
      .select(
        `id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir,
         qr_code, photo_url, assigned_teacher_id, status, created_at, updated_at,
         classes ( id, name )`
      )
      .order('nama', { ascending: true });

    // Data isolation: Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      query = query.eq('assigned_teacher_id', session.user.id);
    }

    // Filter berdasarkan nama jika ada query `search`
    if (search) {
      query = query.ilike('nama', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch santri error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Route error /api/siswa/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
