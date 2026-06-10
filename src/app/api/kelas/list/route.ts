export const dynamic = 'force-dynamic';
// src/app/api/kelas/list/route.ts
// GET: Ambil semua kelas dengan jumlah siswa aktif per kelas
// Tim_Quran / Mode Mengajar: hanya kelas yang punya siswa assigned ke guru tersebut

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

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
    const filterByTeacher = shouldFilterByTeacher(session.user.role, request);
    const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);

    // Jika mode guru, ambil dulu ID kelas yang punya siswa assigned ke guru ini
    let allowedClassIds: string[] | null = null;
    if (filterByTeacher) {
      const { data: assignedStudents } = await supabase
        .from('santri')
        .select('class_id')
        .eq('assigned_teacher_id', teacherId)
        .eq('status', 'Aktif');

      allowedClassIds = Array.from(new Set((assignedStudents ?? []).map((s: any) => s.class_id).filter(Boolean)));
    }

    // Ambil semua kelas (filter hanya kelas yang punya siswa diampu jika mode guru)
    let query = supabase
      .from('classes')
      .select('id, name, created_at, teacher1_id, teacher2_id')
      .order('name', { ascending: true });

    if (allowedClassIds !== null) {
      if (allowedClassIds.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 });
      }
      query = query.in('id', allowedClassIds);
    }

    const { data: classes, error: classesError } = await query;

    let kelasData: Array<{
      id: any;
      name: any;
      created_at: any;
      teacher1_id?: any;
      teacher2_id?: any;
    }> = classes ?? [];

    if (classesError) {
      const message = String(classesError.message || '').toLowerCase();
      const missingTeacherColumns = ['teacher1_id', 'teacher2_id'].some(col => message.includes(col));

      if (missingTeacherColumns) {
        console.warn('Supabase classes query missing teacher columns, retrying without teacher fields.');
        const { data: fallbackClasses, error: fallbackError } = await supabase
          .from('classes')
          .select('id, name, created_at')
          .order('name', { ascending: true });

        if (fallbackError) {
          console.error('Supabase error fetching classes fallback:', fallbackError);
          return NextResponse.json(
            { message: 'Gagal mengambil data kelas.', error: fallbackError.message },
            { status: 500 }
          );
        }

        kelasData = fallbackClasses ?? [];
      } else {
        console.error('Supabase error fetching classes:', classesError);
        return NextResponse.json(
          { message: 'Gagal mengambil data kelas.', error: classesError.message },
          { status: 500 }
        );
      }
    }

    // Ambil jumlah siswa aktif per kelas dengan 1 query GROUP BY (menghindari N+1)
    let countQuery = supabase
      .from('santri')
      .select('class_id')
      .eq('status', 'Aktif');

    if (filterByTeacher) {
      countQuery = countQuery.eq('assigned_teacher_id', teacherId);
    }

    const { data: santriCounts, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting students:', countError);
    }

    // Hitung jumlah per class_id di JS (1 query vs N query)
    const countMap: Record<string, number> = {};
    for (const s of santriCounts ?? []) {
      if (s.class_id) {
        countMap[s.class_id] = (countMap[s.class_id] ?? 0) + 1;
      }
    }

    const classesWithCount = (kelasData || []).map((kelas) => ({
      ...kelas,
      jumlah_siswa: countMap[kelas.id] ?? 0,
    }));

    // Kumpulkan teacher IDs
    const teacherIds = new Set<string>();
    classesWithCount.forEach(k => {
      if ((k as any).teacher1_id) teacherIds.add((k as any).teacher1_id);
      if ((k as any).teacher2_id) teacherIds.add((k as any).teacher2_id);
    });
    let teacherMap: Record<string, { id: string; name: string; email: string }> = {};
    if (teacherIds.size > 0) {
      const { data: teachers } = await supabase.from('users').select('id, name, email').in('id', Array.from(teacherIds));
      for (const t of teachers ?? []) teacherMap[t.id] = t;
    }
    const result = classesWithCount.map(k => ({
      ...k,
      teacher1: (k as any).teacher1_id ? (teacherMap[(k as any).teacher1_id] ?? null) : null,
      teacher2: (k as any).teacher2_id ? (teacherMap[(k as any).teacher2_id] ?? null) : null,
    }));
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/kelas/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
