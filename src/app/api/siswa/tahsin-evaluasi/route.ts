import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId, getTeacherClassIds, applyTeacherSantriFilter } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const METODE_TAHSIN = ['IWR', 'Wafa', 'Al-Quran'] as const;

function normalizeTahsinBook(metode: string, buku: string | null): string {
  const bookName = buku?.trim() ?? '';
  if (metode === 'IWR' && /^[1-4]$/.test(bookName)) return `Jilid ${bookName}`;
  return bookName || 'Tanpa jilid/surah';
}

interface StudentDetail {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  tanggal: string;
}

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const classId = searchParams.get('class_id')?.trim() ?? '';

    let studentQuery = supabase
      .from('santri')
      .select('id, nama, nisn, class_id, juz_terakhir')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const classIds = await getTeacherClassIds(supabase, teacherId);
      studentQuery = applyTeacherSantriFilter(studentQuery, teacherId, classIds, classId);
    }

    if (classId) studentQuery = studentQuery.eq('class_id', classId);
    if (search) studentQuery = studentQuery.ilike('nama', `%${search}%`);

    const { data: students, error: studentsError } = await studentQuery;
    if (studentsError) {
      return NextResponse.json({ message: studentsError.message }, { status: 500 });
    }

    const studentList = students ?? [];
    const latestTahsinByStudent = new Map<string, { metode: string; buku: string | null; tanggal: string }>();
    const studentIds = studentList.map((student) => student.id);
    const classIds = Array.from(new Set(studentList.map((student) => student.class_id).filter(Boolean)));
    const { data: classes, error: classesError } = classIds.length > 0
      ? await supabase.from('classes').select('id, name').in('id', classIds)
      : { data: [], error: null };

    if (classesError) {
      return NextResponse.json({ message: classesError.message }, { status: 500 });
    }

    const classNameById = new Map((classes ?? []).map((kelas) => [kelas.id, kelas.name]));

    const { data: tahsinData, error: tahsinError } = studentIds.length > 0
      ? await supabase.rpc('latest_tahsin_for_students', { student_ids: studentIds })
      : { data: [], error: null };

    if (tahsinError) {
      console.error('Supabase latest tahsin evaluation error:', tahsinError);
      return NextResponse.json({ message: tahsinError.message }, { status: 500 });
    }

    for (const tahsin of tahsinData ?? []) {
      latestTahsinByStudent.set(tahsin.student_id, tahsin);
    }

    const groupMaps = new Map<string, Map<string, StudentDetail[]>>(
      METODE_TAHSIN.map((metode) => [metode, new Map<string, StudentDetail[]>()])
    );
    const tahfidzGroups = new Map<string, StudentDetail[]>();
    const withoutJournal: StudentDetail[] = [];

    for (const student of studentList) {
      const latestTahsin = latestTahsinByStudent.get(student.id);
      const detail: StudentDetail = {
        id: student.id,
        nama: student.nama,
        nisn: student.nisn,
        kelas: classNameById.get(student.class_id) ?? 'Tanpa Kelas',
        tanggal: latestTahsin?.tanggal ?? '',
      };

      const juz = student.juz_terakhir?.trim() || 'Belum diisi';
      const studentsInJuz = tahfidzGroups.get(juz) ?? [];
      studentsInJuz.push(detail);
      tahfidzGroups.set(juz, studentsInJuz);

      if (!latestTahsin || !groupMaps.has(latestTahsin.metode)) {
        withoutJournal.push(detail);
        continue;
      }

      const books = groupMaps.get(latestTahsin.metode)!;
    const bookName = normalizeTahsinBook(latestTahsin.metode, latestTahsin.buku);
      const studentsInBook = books.get(bookName) ?? [];
      studentsInBook.push(detail);
      books.set(bookName, studentsInBook);
    }

    const groups = METODE_TAHSIN.map((metode) => {
      const books = groupMaps.get(metode)!;
      const details = Array.from(books.entries())
        .map(([buku, students]) => ({ buku, total_siswa: students.length, students }))
        .sort((left, right) => left.buku.localeCompare(right.buku, 'id'));

      return {
        metode,
        total_siswa: details.reduce((total, detail) => total + detail.total_siswa, 0),
        details,
      };
    });

    return NextResponse.json({
      data: {
        total_siswa: studentList.length,
        tahfidz: {
          details: Array.from(tahfidzGroups.entries())
            .map(([juz, students]) => ({ juz, total_siswa: students.length, students }))
            .sort((left, right) => left.juz.localeCompare(right.juz, 'id', { numeric: true })),
        },
        groups,
        tanpa_jurnal: withoutJournal,
      },
    });
  } catch (error) {
    console.error('Route error /api/siswa/tahsin-evaluasi:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}