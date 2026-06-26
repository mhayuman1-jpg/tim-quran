// src/app/api/rekap/semester/route.ts
// GET : Rekap data siswa per semester (hafalan, tahsin, kehadiran)
// Query params: semester_name (e.g., "Ganjil 2025/2026"), compare_with (optional, for comparison)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface StudentRecap {
  student_id: string;
  nama: string;
  nisn: string;
  class_name: string;
  gender: string;
  juz_terakhir: number;
  total_hafalan: number;
  total_tahsin: number;
  total_hadir: number;
  total_tidak_hadir: number;
  total_hari_aktif: number;
  persentase_kehadiran: number;
  rata_rata_makhroj: number;
  rata_rata_tajwid: number;
  rata_rata_lancar: number;
}

interface SemesterRecapResponse {
  semester_name: string;
  date_range: { start: string; end: string };
  total_students: number;
  total_hafalan: number;
  total_tahsin: number;
  average_attendance: number;
  students: StudentRecap[];
  monthly_progress: { month: string; hafalan: number; tahsin: number; kehadiran: number }[];
}

function getSemesterDateRange(semesterName: string): { start: string; end: string } {
  // Parse semester name like "Ganjil 2025/2026" or "Genap 2025/2026"
  const parts = semesterName.split(' ');
  const type = parts[0]?.toLowerCase();
  const yearPart = parts[1] || '';
  
  const [startYearStr, endYearStr] = yearPart.split('/');
  const startYear = parseInt(startYearStr || '', 10);
  const endYear = parseInt(endYearStr || '', 10) || startYear + 1;

  if (type === 'ganjil') {
    // Ganjil: July - December
    return {
      start: `${startYear}-07-01`,
      end: `${endYear}-01-31`,
    };
  } else if (type === 'genap') {
    // Genap: January - June
    return {
      start: `${startYear}-01-01`,
      end: `${startYear}-06-30`,
    };
  }

  // Default: current year
  const now = new Date();
  return {
    start: `${now.getFullYear()}-01-01`,
    end: `${now.getFullYear()}-12-31`,
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const semesterName = searchParams.get('semester_name') || 'Ganjil 2025/2026';
  const compareWith = searchParams.get('compare_with');

  try {
    const supabase = createServerClient();
    const dateRange = getSemesterDateRange(semesterName);

    // Fetch all active students
    const { data: students, error: studentsError } = await supabase
      .from('santri')
      .select('id, nama, nisn, gender, juz_terakhir, class_id, classes(name)')
      .eq('status', 'Aktif')
      .order('nama');

    if (studentsError) {
      console.error('Students fetch error:', studentsError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.', error: studentsError.message }, { status: 500 });
    }

    const studentIds = (students || []).map(s => s.id);

    const CHUNK_SIZE = 100;
    const chunkArray = <T,>(arr: T[]): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
        chunks.push(arr.slice(i, i + CHUNK_SIZE));
      }
      return chunks;
    };

    const fetchChunked = async <T,>(
      table: string,
      select: string,
      ids: string[],
      dateField: string,
      start: string,
      end: string
    ): Promise<T[]> => {
      const results = await Promise.all(
        chunkArray(ids).map(chunk =>
          supabase
            .from(table)
            .select(select)
            .in('student_id', chunk)
            .gte(dateField, start)
            .lte(dateField, end)
            .then(({ data, error }) => {
              if (error) console.error(`${table} chunk fetch error:`, error);
              return (data || []) as T[];
            })
        )
      );
      return results.flat();
    }

    // Fetch hafalan data for the semester
    const hafalanData = await fetchChunked<any>(
      'hafalan', 'student_id, id, tanggal, makhroj, tajwid, lancar',
      studentIds, 'tanggal', dateRange.start, dateRange.end
    );

    // Fetch tahsin data for the semester
    const tahsinData = await fetchChunked<any>(
      'tahsin', 'student_id, id, tanggal, makhroj, kelancaran',
      studentIds, 'tanggal', dateRange.start, dateRange.end
    );

    // Fetch attendance data for the semester
    const attendanceData = await fetchChunked<any>(
      'attendances', 'student_id, status, date',
      studentIds, 'date', dateRange.start, dateRange.end
    );

    // Fetch total active days in semester
    const { count: totalActiveDays } = await supabase
      .from('attendances')
      .select('date', { count: 'exact', head: true })
      .gte('date', dateRange.start)
      .lte('date', dateRange.end);

    // Aggregate data per student
    const studentsRecap: StudentRecap[] = (students || []).map(student => {
      const studentHafalan = (hafalanData || []).filter(h => h.student_id === student.id);
      const studentTahsin = (tahsinData || []).filter(t => t.student_id === student.id);
      const studentAttendance = (attendanceData || []).filter(a => a.student_id === student.id);

      const totalHadir = studentAttendance.filter(a => a.status === 'Hadir').length;
      const totalTidakHadir = studentAttendance.filter(a => a.status === 'Tidak Hadir').length;

      // Calculate average scores
      const makhrojScores = studentHafalan.filter(h => h.makhroj).map(h => parseFloat(h.makhroj as string)).filter(n => !isNaN(n));
      const tajwidScores = studentHafalan.filter(h => h.tajwid).map(h => parseFloat(h.tajwid as string)).filter(n => !isNaN(n));
      const lancarScores = studentHafalan.filter(h => h.lancar).map(h => parseFloat(h.lancar as string)).filter(n => !isNaN(n));

      return {
        student_id: student.id,
        nama: student.nama,
        nisn: student.nisn,
        class_name: (student.classes as any)?.name || '-',
        gender: student.gender,
        juz_terakhir: student.juz_terakhir || 0,
        total_hafalan: studentHafalan.length,
        total_tahsin: studentTahsin.length,
        total_hadir: totalHadir,
        total_tidak_hadir: totalTidakHadir,
        total_hari_aktif: totalActiveDays || 0,
        persentase_kehadiran: totalActiveDays ? Math.round((totalHadir / totalActiveDays) * 100) : 0,
        rata_rata_makhroj: makhrojScores.length > 0 ? Math.round(makhrojScores.reduce((a, b) => a + b, 0) / makhrojScores.length * 10) / 10 : 0,
        rata_rata_tajwid: tajwidScores.length > 0 ? Math.round(tajwidScores.reduce((a, b) => a + b, 0) / tajwidScores.length * 10) / 10 : 0,
        rata_rata_lancar: lancarScores.length > 0 ? Math.round(lancarScores.reduce((a, b) => a + b, 0) / lancarScores.length * 10) / 10 : 0,
      };
    });

    // Calculate monthly progress
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlyProgress = months.slice(0, 6).map((month, index) => {
      const monthStart = new Date(dateRange.start);
      monthStart.setMonth(monthStart.getMonth() + index);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      const monthHafalan = (hafalanData || []).filter(h => h.tanggal >= monthStr && h.tanggal <= monthEndStr).length;
      const monthTahsin = (tahsinData || []).filter(t => t.tanggal >= monthStr && t.tanggal <= monthEndStr).length;
      const monthAttendance = (attendanceData || []).filter(a => a.date >= monthStr && a.date <= monthEndStr);
      const monthHadir = monthAttendance.filter(a => a.status === 'Hadir').length;
      const monthKehadiran = monthAttendance.length > 0 ? Math.round((monthHadir / monthAttendance.length) * 100) : 0;

      return {
        month: `${month} ${monthStart.getFullYear()}`,
        hafalan: monthHafalan,
        tahsin: monthTahsin,
        kehadiran: monthKehadiran,
      };
    });

    // Calculate totals
    const totalHafalan = (hafalanData || []).length;
    const totalTahsin = (tahsinData || []).length;
    const totalHadir = (attendanceData || []).filter(a => a.status === 'Hadir').length;
    const totalAttendance = (attendanceData || []).length;
    const averageAttendance = totalAttendance > 0 ? Math.round((totalHadir / totalAttendance) * 100) : 0;

    const response: SemesterRecapResponse = {
      semester_name: semesterName,
      date_range: dateRange,
      total_students: studentsRecap.length,
      total_hafalan: totalHafalan,
      total_tahsin: totalTahsin,
      average_attendance: averageAttendance,
      students: studentsRecap.sort((a, b) => b.total_hafalan - a.total_hafalan),
      monthly_progress: monthlyProgress,
    };

    // If comparison requested, fetch comparison data
    if (compareWith) {
      const compareRange = getSemesterDateRange(compareWith);
      
      const compareHafalan = await fetchChunked<any>(
        'hafalan', 'student_id, id',
        studentIds, 'tanggal', compareRange.start, compareRange.end
      );

      const compareTahsin = await fetchChunked<any>(
        'tahsin', 'student_id, id',
        studentIds, 'tanggal', compareRange.start, compareRange.end
      );

      const compareAttendance = await fetchChunked<any>(
        'attendances', 'student_id, status',
        studentIds, 'date', compareRange.start, compareRange.end
      );

      const compareHadir = (compareAttendance || []).filter(a => a.status === 'Hadir').length;
      const compareTotal = (compareAttendance || []).length;

      (response as any).comparison = {
        semester_name: compareWith,
        total_hafalan: (compareHafalan || []).length,
        total_tahsin: (compareTahsin || []).length,
        average_attendance: compareTotal > 0 ? Math.round((compareHadir / compareTotal) * 100) : 0,
      };
    }

    return NextResponse.json({ data: response }, { status: 200 });
  } catch (err) {
    console.error('[rekap semester GET]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
