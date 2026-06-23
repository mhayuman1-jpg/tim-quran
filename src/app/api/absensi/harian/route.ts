// src/app/api/absensi/harian/route.ts
// GET: terima query param `date` (YYYY-MM-DD), return daftar semua santri
// beserta status hadir/tidak hadir pada tanggal tersebut.
// Tim_Quran hanya melihat siswa yang menjadi tanggung jawabnya.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { normalizeAttendanceRows } from '@/lib/attendance';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';
import { shuffleArray } from '@/lib/shuffle';

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
    const date = searchParams.get('date')?.trim();

    // Validasi format tanggal YYYY-MM-DD
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: 'Parameter `date` wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const classId = searchParams.get('class_id')?.trim();

    const supabase = createServerClient();

    // 1. Ambil semua santri (filter per Tim_Quran jika perlu)
    let santriQuery = supabase
      .from('santri')
      .select('id, nama, nisn, gender, classes(name)')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const classIds = await getTeacherClassIds(supabase, teacherId);

      // Lazy auto-distribute unassigned students
      const targetClassIds = classId ? [classId] : classIds;
      for (const cid of targetClassIds) {
        const { data: unassigned } = await supabase
          .from('santri').select('id')
          .eq('class_id', cid).eq('status', 'Aktif').is('assigned_teacher_id', null);
        if (unassigned && unassigned.length > 0) {
          const { data: kelas } = await supabase
            .from('classes').select('teacher1_id, teacher2_id, teacher3_id').eq('id', cid).single();
          const activeTeachers = kelas ? [kelas.teacher1_id, kelas.teacher2_id, kelas.teacher3_id].filter(Boolean) : [];
          if (activeTeachers.length > 0) {
            const ids = shuffleArray(unassigned.map((s: any) => s.id));
            const numT = activeTeachers.length;
            await Promise.all(activeTeachers.map((tid: string, ti: number) => {
              const chunk = ids.filter((_: string, i: number) => i % numT === ti);
              return chunk.length > 0
                ? supabase.from('santri').update({ assigned_teacher_id: tid }).in('id', chunk)
                : Promise.resolve({ data: null, error: null });
            }));
          }
        }
      }

      santriQuery = applyTeacherSantriFilter(santriQuery, teacherId, classIds, classId);
    }

    if (classId) {
      santriQuery = santriQuery.eq('class_id', classId);
    }

    const { data: santriList, error: santriError } = await santriQuery;

    if (santriError) {
      console.error('Fetch santri error (harian):', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data santri.' },
        { status: 500 }
      );
    }

    if (!santriList || santriList.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // 2. Ambil records absensi pada tanggal tersebut
    const santriIds = santriList.map((s: any) => s.id);

    const { data: attendances, error: attendError } = await supabase
      .from('attendances')
      .select('id, student_id, date, status')
      .eq('date', date);

    if (attendError) {
      console.error('Fetch attendances error (harian):', attendError);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi.' },
        { status: 500 }
      );
    }

    const normalizedAttendances = normalizeAttendanceRows(attendances);

    // 3. Buat map santri_id → status hadir
    const hadir = new Set<string>();
    for (const attendance of normalizedAttendances) {
      if (!attendance.santri_id) continue;
      if (!santriIds.includes(attendance.santri_id)) continue;
      if (attendance.status === 'Hadir') {
        hadir.add(attendance.santri_id);
      }
    }

    // 4. Gabungkan: setiap santri dengan status hadir/tidak hadir
    const result = (santriList as any[]).map((s) => ({
      id: s.id,
      nisn: s.nisn,
      nama: s.nama,
      gender: s.gender,
      kelas: s.classes?.name ?? 'â€”',
      status: hadir.has(s.id) ? 'Hadir' : 'Tidak Hadir',
    }));

    return NextResponse.json({ data: result, date }, { status: 200 });
  } catch (error) {
    console.error('Harian API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
