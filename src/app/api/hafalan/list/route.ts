// src/app/api/hafalan/list/route.ts
// GET: Ambil riwayat hafalan
// - Filter by student_id (opsional) dan date range (opsional)
// - Tim_Quran hanya bisa lihat hafalan siswa yang menjadi tanggung jawabnya
// - Kabid bisa lihat semua hafalan

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const dateFrom = searchParams.get('date_from')?.trim();
    const dateTo = searchParams.get('date_to')?.trim();

    const supabase = createServerClient();

    // Query hafalan dengan join ke santri dan users (teacher)
    let query = supabase
      .from('hafalan')
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, catatan, created_at,
         santri ( id, nama, assigned_teacher_id ),
         users ( id, name )`
      )
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    // Filter by student_id jika diberikan
    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    // Filter date range
    if (dateFrom) {
      query = query.gte('tanggal', dateFrom);
    }
    if (dateTo) {
      query = query.lte('tanggal', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase fetch hafalan error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data hafalan.', error: error.message },
        { status: 500 }
      );
    }

    // Data isolation: Tim_Quran hanya bisa lihat hafalan siswa yang menjadi tanggung jawabnya
    let filteredData = data ?? [];
    if (session.user.role === 'Tim_Quran') {
      filteredData = filteredData.filter((item: any) => {
        return item.santri?.assigned_teacher_id === session.user.id;
      });
    }

    return NextResponse.json({ data: filteredData }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/hafalan/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
