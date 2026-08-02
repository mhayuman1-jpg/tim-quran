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
    const namaMap: Record<string, string> = {};
    let allowedIds: Set<string> | null = null;
    if (santriIds.length > 0) {
      const { data: santriData } = await supabase
        .from('santri').select('id, nama, assigned_teacher_id, class_id').in('id', santriIds);
      for (const s of santriData ?? []) namaMap[s.id] = s.nama;

      // Filter untuk Tim_Quran: hanya tampilkan siswa binaan
      if (session.user.role === 'Tim_Quran') {
        const teacherClassIds = await getTeacherClassIds(supabase, session.user.id);
        allowedIds = new Set(
          (santriData ?? [])
            .filter((s: any) => s.assigned_teacher_id === session.user.id || teacherClassIds.includes(s.class_id))
            .map((s: any) => s.id)
        );
      }
    }

    const filtered = allowedIds ? normalized.filter((r: any) => allowedIds!.has(r.santri_id)) : normalized;

    const list = filtered.map((row: any) => ({
      student_id: row.santri_id,
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
