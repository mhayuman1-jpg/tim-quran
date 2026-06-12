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

    // Jika mode guru, ambil kelas yang diampu guru ini
    let allowedClassIds: string[] | null = null;
    if (filterByTeacher) {
      // Ambil kelas yang diampu via teacher1/2/3_id
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .or(`teacher1_id.eq.${teacherId},teacher2_id.eq.${teacherId},teacher3_id.eq.${teacherId}`);
      const classIdsFromTeacher = (teacherClasses ?? []).map((c: any) => c.id);

      // Juga ambil dari assigned_teacher_id di santri
      const { data: assignedStudents } = await supabase
        .from('santri')
        .select('class_id')
        .eq('assigned_teacher_id', teacherId)
        .eq('status', 'Aktif');
      const classIdsFromSantri = (assignedStudents ?? []).map((s: any) => s.class_id).filter(Boolean);

      allowedClassIds = Array.from(new Set([...classIdsFromTeacher, ...classIdsFromSantri]));
    }

    // Ambil semua kelas (filter hanya kelas yang punya siswa diampu jika mode guru)
    let query = supabase
      .from('classes')
      .select('id, name, created_at, teacher1_id, teacher2_id, teacher3_id, nama_guru_kelas, niy_guru_kelas')
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
      teacher3_id?: any;
      nama_guru_kelas?: any;
      niy_guru_kelas?: any;
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

    // Lazy auto-distribute: jika ada siswa dengan assigned_teacher_id = null di kelas yang punya guru,
    // distribusikan otomatis agar data langsung muncul
    if (filterByTeacher && kelasData.length > 0) {
      for (const kelas of kelasData) {
        const activeTeachers = [(kelas as any).teacher1_id, (kelas as any).teacher2_id, (kelas as any).teacher3_id].filter(Boolean);
        if (activeTeachers.length === 0) continue;

        const { data: unassigned } = await supabase
          .from('santri')
          .select('id')
          .eq('class_id', kelas.id)
          .eq('status', 'Aktif')
          .is('assigned_teacher_id', null);

        if (unassigned && unassigned.length > 0) {
          const ids = unassigned.map((s: any) => s.id);
          const chunkSize = Math.ceil(ids.length / activeTeachers.length);
          await Promise.all(
            activeTeachers.map((tid: string, i: number) => {
              const chunk = ids.slice(i * chunkSize, (i + 1) * chunkSize);
              return chunk.length > 0
                ? supabase.from('santri').update({ assigned_teacher_id: tid }).in('id', chunk)
                : Promise.resolve({ data: null, error: null });
            })
          );
        }
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
      if ((k as any).teacher3_id) teacherIds.add((k as any).teacher3_id);
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
      teacher3: (k as any).teacher3_id ? (teacherMap[(k as any).teacher3_id] ?? null) : null,
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
