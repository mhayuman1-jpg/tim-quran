export const dynamic = 'force-dynamic';
// src/app/api/absensi/today/route.ts
// GET: ambil daftar siswa yang sudah hadir hari ini.
// Dipakai oleh halaman /scan untuk menampilkan daftar real-time.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeAttendanceRows } from '@/lib/attendance';
import { getTeacherClassIds } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    // JOIN langsung ke tabel santri — satu query, hindari .in() dengan ratusan ID
    // yang membuat URL PostgREST terlalu panjang hingga gagal di proxy/CDN.
    const { data: attData, error } = await supabase
      .from('attendances')
      .select('*, santri(id, nama, assigned_teacher_id, class_id)')
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

    const normalized = normalizeAttendanceRows(attData);

    // Filter untuk Tim_Quran: hanya tampilkan siswa binaan
    let teacherClassIds: string[] = [];
    if (session.user.role === 'Tim_Quran') {
      teacherClassIds = await getTeacherClassIds(supabase, session.user.id);
    }

    const list = normalized
      .filter((row: any) => {
        if (session.user.role !== 'Tim_Quran') return true;
        const s = row.santri;
        if (!s) return false;
        return (
          s.assigned_teacher_id === session.user.id ||
          teacherClassIds.includes(s.class_id)
        );
      })
      .map((row: any) => ({
        id: row.santri_id,
        student_id: row.santri_id,
        nama: row.santri?.nama ?? 'Tidak diketahui',
        scanned_at: new Date(row.created_at).toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Makassar',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }));

    return NextResponse.json(
      { data: list },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('Today attendance API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}