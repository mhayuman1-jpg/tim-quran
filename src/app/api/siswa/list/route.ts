// src/app/api/siswa/list/route.ts
// GET: Ambil semua santri dengan join ke classes
// - Filter by assigned_teacher_id jika role Tim_Quran (data isolation)
// - Support query param `search` untuk filter nama (case-insensitive)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

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
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Mulai query dengan join ke tabel classes
    let query = supabase
      .from('santri')
      .select(
        `id, nisn, nama, gender, tanggal_lahir, class_id, juz_terakhir,
         qr_code, photo_url, assigned_teacher_id, status, created_at, updated_at,
         classes ( id, name )`,
        { count: 'exact' }
      )
      .order('nama', { ascending: true })
      .range(offset, offset + limit - 1);

    // Data isolation: Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya
    // Juga berlaku untuk Kabid/Sekretaris dalam Mode Mengajar
    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      query = query.eq('assigned_teacher_id', teacherId);
    }

    // Filter berdasarkan nama jika ada query `search`
    if (search) {
      query = query.ilike('nama', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase fetch santri error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count ?? data?.length ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Route error /api/siswa/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
