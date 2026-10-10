import type { SupabaseClient } from '@supabase/supabase-js';

export type StudentProgressRow = {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  juz_terakhir: string;
  kelas: string | null;
  class_id: string | null;
  assigned_teacher_id: string | null;
  pembina: string | null;
  total_hafalan: number;
  total_tahsin: number;
  persentase_kehadiran: number;
  days_present: number;
  total_days: number;
};

export type ProgressSummary = {
  total_students: number;
  students_with_hafalan: number;
  students_with_tahsin: number;
  students_with_attendance: number;
};

type SantriInput = {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  juz_terakhir: string;
  assigned_teacher_id?: string | null;
  class_id?: string | null;
  classes?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
};

function resolveClassName(santri: SantriInput): string | null {
  const c = santri.classes;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.name ?? null;
  return c.name ?? null;
}

export function attendancePercent(daysPresent: number, totalDays: number): number {
  if (daysPresent <= 0 || totalDays <= 0) return 0;
  const present = Math.min(daysPresent, totalDays);
  const value = (present / totalDays) * 100;
  return Math.min(100, Math.max(0, parseFloat(value.toFixed(2))));
}

async function fetchAll<T>(
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await load(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

export async function buildStudentProgress(
  supabase: SupabaseClient,
  santriList: SantriInput[]
): Promise<{ students: StudentProgressRow[]; summary: ProgressSummary }> {
  if (!santriList.length) {
    return {
      students: [],
      summary: {
        total_students: 0,
        students_with_hafalan: 0,
        students_with_tahsin: 0,
        students_with_attendance: 0,
      },
    };
  }

  const studentIds = santriList.map((s) => s.id);
  const teacherIds = Array.from(
    new Set(santriList.map((s) => s.assigned_teacher_id).filter((id): id is string => Boolean(id)))
  );

  const attendanceRows: { santri_id: string; date: string }[] = [];
  for (let i = 0; i < studentIds.length; i += 80) {
    const chunk = studentIds.slice(i, i + 80);
    const batch = await fetchAll<{ santri_id: string; date: string }>((from, to) =>
      supabase
        .from('attendances')
        .select('santri_id, date')
        .in('santri_id', chunk)
        .eq('status', 'Hadir')
        .order('date', { ascending: true })
        .range(from, to)
    );
    attendanceRows.push(...batch);
  }

  const [hafalanResult, tahsinResult, dateRows, teachersResult] = await Promise.all([
    supabase.from('hafalan').select('student_id').in('student_id', studentIds),
    supabase.from('tahsin').select('student_id').in('student_id', studentIds),
    fetchAll<{ date: string }>((from, to) =>
      supabase
        .from('attendances')
        .select('date')
        .order('date', { ascending: true })
        .range(from, to)
    ),
    teacherIds.length > 0
      ? supabase.from('users').select('id, name').in('id', teacherIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
  ]);

  if (hafalanResult.error) throw new Error('Gagal mengambil data hafalan.');
  if (tahsinResult.error) throw new Error('Gagal mengambil data tahsin.');
  if (teachersResult.error) throw new Error('Gagal mengambil data pembina.');

  const hafalanCountMap: Record<string, number> = {};
  for (const h of hafalanResult.data ?? []) {
    const sid = h.student_id as string;
    hafalanCountMap[sid] = (hafalanCountMap[sid] ?? 0) + 1;
  }

  const tahsinCountMap: Record<string, number> = {};
  for (const t of tahsinResult.data ?? []) {
    const sid = t.student_id as string;
    tahsinCountMap[sid] = (tahsinCountMap[sid] ?? 0) + 1;
  }

  const distinctDates = new Set<string>();
  for (const record of dateRows) {
    distinctDates.add(record.date);
  }

  const attendanceCountMap: Record<string, Set<string>> = {};
  for (const a of attendanceRows) {
    if (!attendanceCountMap[a.santri_id]) attendanceCountMap[a.santri_id] = new Set();
    attendanceCountMap[a.santri_id].add(a.date);
    distinctDates.add(a.date);
  }
  const totalHariAktif = distinctDates.size;

  const teacherNameMap: Record<string, string> = {};
  for (const t of teachersResult.data ?? []) {
    teacherNameMap[t.id] = t.name;
  }

  const students = santriList.map((santri) => {
    const totalHafalan = hafalanCountMap[santri.id] ?? 0;
    const totalTahsin = tahsinCountMap[santri.id] ?? 0;
    const daysPresent = attendanceCountMap[santri.id]?.size ?? 0;
    const persentaseKehadiran = attendancePercent(daysPresent, totalHariAktif);

    return {
      id: santri.id,
      nisn: santri.nisn,
      nama: santri.nama,
      gender: santri.gender,
      juz_terakhir: santri.juz_terakhir,
      kelas: resolveClassName(santri),
      class_id: santri.class_id ?? null,
      assigned_teacher_id: santri.assigned_teacher_id ?? null,
      pembina: santri.assigned_teacher_id ? teacherNameMap[santri.assigned_teacher_id] ?? null : null,
      total_hafalan: totalHafalan,
      total_tahsin: totalTahsin,
      persentase_kehadiran: persentaseKehadiran,
      days_present: daysPresent,
      total_days: totalHariAktif,
    };
  });

  return {
    students,
    summary: {
      total_students: students.length,
      students_with_hafalan: students.filter((s) => s.total_hafalan > 0).length,
      students_with_tahsin: students.filter((s) => s.total_tahsin > 0).length,
      students_with_attendance: students.filter((s) => s.days_present > 0).length,
    },
  };
}
