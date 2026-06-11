export const dynamic = 'force-dynamic';
// src/app/api/absensi/today/route.ts
// GET: ambil daftar siswa yang sudah hadir hari ini.
// Dipakai oleh halaman /scan untuk menampilkan daftar real-time.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeAttendanceRows } from '@/lib/attendance';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Tidak terautentikasi.' }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    const { data: attData, error } = await supabase
      .from('attendances')
      .select('id, student_id, date, status, scanned_by, created_at')
      .eq('date', today)
      .eq('status', 'Hadir')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch today attendance error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi hari ini.' },
        { status: 500 }
      );
    }

    // Ambil nama santri
    const normalized = normalizeAttendanceRows(attData);
    const rawIds = normalized.map((r: any) => r.santri_id).filter(Boolean);
    const santriIds = Array.from(new Set(rawIds));
    let namaMap: Record<string, string> = {};
    if (santriIds.length > 0) {
      const { data: santriData } = await supabase
        .from('santri').select('id, nama').in('id', santriIds);
      for (const s of santriData ?? []) namaMap[s.id] = s.nama;
    }

    const list = normalized.map((row: any) => ({
      nama: namaMap[row.santri_id] ?? 'Tidak diketahui',
      scanned_at: new Date(row.created_at).toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (error) {
    console.error('Today attendance API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
