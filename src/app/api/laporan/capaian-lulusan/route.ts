// src/app/api/laporan/capaian-lulusan/route.ts
// GET: Statistik capaian lulusan per kelas (Kabid only)
//
// Standar per kelas & semester:
//   Kelas 1 Smt1: An Naas - Al Kautsar (surah 114-108)
//   Kelas 1 Smt2: Al Ma'un - At Takatsur (surah 107-102)
//   Kelas 2 Smt1: Al Qari'ah - Al Bayyinah (surah 101-98)
//   Kelas 2 Smt2: Al Qadr - Ad Duha (surah 97-93)
//   Kelas 3 Smt1: Juz 30 setengah
//   Kelas 3 Smt2: Juz 30 selesai
//   Kelas 4: Juz 30
//   Kelas 5-6: Juz 30 & 29
//
// Kelas 1-4: Cek dari tabel hafalan (harus sudah dinilai guru)
// Kelas 5-6: Cek dari field juz_terakhir

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ── Surah mapping: nama → nomor surah ──────────────────────────────────────
const SURAH_MAP: Record<string, number> = {
  'an naas': 114, 'al falaq': 113, 'al ikhlas': 112, 'al lahab': 111,
  'an nasr': 110, 'al kafirun': 109, 'al kautsar': 108, "al ma'un": 107,
  'quraisy': 106, 'quraysh': 106, 'al fil': 105, 'al humazah': 104,
  'al asr': 103, 'al ashr': 103, 'at takatsur': 102, 'at takathur': 102,
  "al qari'ah": 101, 'al qariah': 101, 'al adiyat': 100, 'az zalzalah': 99,
  'al bayyinah': 98, 'al qadr': 97, 'al alaq': 96, 'at tin': 95,
  'ash sharh': 94, 'ash syarh': 94, 'ad duha': 93, 'ad dhuha': 93,
  'al lail': 92, 'al layl': 92, 'ash shams': 91, 'as syams': 91,
  'al balad': 90, 'al fajr': 89, "al ghashiyah": 88, 'al ghasyiyah': 88,
  "al a'la": 87, 'at tariq': 86, 'at tarikh': 86,
  'al buruj': 85, 'al insyiqaq': 84, 'al inshiqaq': 84,
  'al mutaffifin': 83, 'al infitar': 82, 'at takwir': 81,
  "'abasa": 80, 'abasa': 80, "an nazi'at": 79, 'an naziat': 79,
  "an naba'": 78, 'an naba': 78,
};

// ── Surah ranges per kelas & semester ──────────────────────────────────────
interface SurahRange {
  start: number; // nomor surah awal (inklusif)
  end: number;   // nomor surah akhir (inklusif)
}

interface SemesterStandar {
  semester: 1 | 2;
  label: string;
  type: 'surah' | 'juz';
  surah_range?: SurahRange;
  required_juz?: string[];
}

const STANDAR_PER_KELAS: Record<number, SemesterStandar[]> = {
  1: [
    { semester: 1, label: 'An Naas - Al Kautsar', type: 'surah', surah_range: { start: 114, end: 108 } },
    { semester: 2, label: "Al Ma'un - At Takatsur", type: 'surah', surah_range: { start: 107, end: 102 } },
  ],
  2: [
    { semester: 1, label: "Al Qari'ah - Al Bayyinah", type: 'surah', surah_range: { start: 101, end: 98 } },
    { semester: 2, label: 'Al Qadr - Ad Duha', type: 'surah', surah_range: { start: 97, end: 93 } },
  ],
  3: [
    { semester: 1, label: 'Juz 30 (sebagian)', type: 'juz', required_juz: [] },
    { semester: 2, label: 'Juz 30 selesai', type: 'juz', required_juz: ['30'] },
  ],
  4: [
    { semester: 1, label: 'Juz 30', type: 'juz', required_juz: ['30'] },
    { semester: 2, label: 'Juz 30', type: 'juz', required_juz: ['30'] },
  ],
  5: [
    { semester: 1, label: 'Juz 30', type: 'juz', required_juz: ['30'] },
    { semester: 2, label: 'Juz 30 & 29', type: 'juz', required_juz: ['30', '29'] },
  ],
  6: [
    { semester: 1, label: 'Juz 30 & 29', type: 'juz', required_juz: ['30', '29'] },
    { semester: 2, label: 'Juz 30 & 29', type: 'juz', required_juz: ['30', '29'] },
  ],
};

// ── Helper functions ────────────────────────────────────────────────────────

// Parse surah_juz string → nomor surah (null jika tidak dikenali)
function parseSurahNumber(surahJuz: string): number | null {
  const lower = surahJuz.toLowerCase().trim();
  // Cek langsung di SURAH_MAP
  if (SURAH_MAP[lower] !== undefined) return SURAH_MAP[lower];
  // Coba ekstrak nama surah dari string (hapus angka ayat di akhir)
  const cleaned = lower.replace(/\s+\d+.*$/, '').trim();
  if (SURAH_MAP[cleaned] !== undefined) return SURAH_MAP[cleaned];
  return null;
}

// Cek apakah surah dalam range
function isSurahInRange(surahNo: number, range: SurahRange): boolean {
  // Range bisa descending (114 → 108)
  const min = Math.min(range.start, range.end);
  const max = Math.max(range.start, range.end);
  return surahNo >= min && surahNo <= max;
}

// Cek apakah semua surah dalam range sudah dinilai di hafalan
function checkSurahAchieved(
  hafalanEntries: { surah_juz: string; lancar?: string | null; makhroj?: string | null; tajwid?: string | null }[],
  range: SurahRange
): boolean {
  const requiredSurahs: number[] = [];
  const min = Math.min(range.start, range.end);
  const max = Math.max(range.start, range.end);
  for (let i = min; i <= max; i++) {
    requiredSurahs.push(i);
  }

  // Kumpulkan surah yang sudah dinilai
  const assessed = new Set<number>();
  for (const entry of hafalanEntries) {
    const surahNo = parseSurahNumber(entry.surah_juz);
    if (surahNo === null) continue;
    // Harus sudah dinilai (minimal ada 1 nilai lancar/makhroj/tajwid)
    const hasAssessment = Boolean(entry.lancar || entry.makhroj || entry.tajwid);
    if (hasAssessment && isSurahInRange(surahNo, range)) {
      assessed.add(surahNo);
    }
  }

  // Semua surah wajib ada di assessed
  return requiredSurahs.every((s) => assessed.has(s));
}

// Parse juz_terakhir ke array angka
function parseJuzList(juzStr: string | null | undefined): number[] {
  if (!juzStr) return [];
  return juzStr.split('&').map((s) => parseInt(s.replace(/\D/g, ''), 10)).filter((n) => !isNaN(n));
}

// Cek capaian berdasarkan juz_terakhir
function hasAchievedByJuz(juzStr: string | null | undefined, requiredJuz: string[]): boolean {
  if (requiredJuz.length === 0) return true;
  const completed = parseJuzList(juzStr);
  return requiredJuz.every((j) => completed.includes(parseInt(j, 10)));
}

// Ekstrak nomor kelas
function extractClassNumber(className: string | null | undefined): number {
  if (!className) return 0;
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Ambil semester aktif ────────────────────────────────────────────────────
async function getActiveSemester(supabase: any): Promise<'Ganjil' | 'Genap'> {
  const { data } = await supabase
    .from('semester_settings')
    .select('semester_name')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (data?.semester_name) {
    return data.semester_name.toLowerCase().includes('genap') ? 'Genap' : 'Ganjil';
  }
  return 'Ganjil';
}

// ── Types ──────────────────────────────────────────────────────────────────
interface StudentData {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  classes: { id: string; name: string } | null;
}

interface HafalanEntry {
  student_id: string;
  surah_juz: string;
  lancar?: string | null;
  makhroj?: string | null;
  tajwid?: string | null;
}

interface ClassStats {
  class_name: string;
  class_number: number;
  semester: 'Ganjil' | 'Genap';
  semester_standar_label: string;
  total_students: number;
  achieved: number;
  not_achieved: number;
  percentage: number;
  students: {
    id: string;
    nama: string;
    juz_terakhir: string | null;
    achieved: boolean;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const supabase = createServerClient();
    const activeSemester = await getActiveSemester(supabase);
    const currentSemesterNum = activeSemester === 'Ganjil' ? 1 : 2;

    // Ambil semua siswa aktif
    const { data: students, error: studentError } = await supabase
      .from('santri')
      .select('id, nama, juz_terakhir, classes ( id, name )')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (studentError) {
      console.error('Fetch santri error:', studentError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const studentList = (students ?? []) as unknown as StudentData[];

    // Ambil SEMUA data hafalan untuk siswa yang membutuhkan (kelas 1-4)
    const studentIds = studentList.map((s) => s.id);
    let allHafalan: HafalanEntry[] = [];
    if (studentIds.length > 0) {
      const { data: hafalanData } = await supabase
        .from('hafalan')
        .select('student_id, surah_juz, lancar, makhroj, tajwid')
        .in('student_id', studentIds);
      allHafalan = (hafalanData ?? []) as HafalanEntry[];
    }

    // Index hafalan per student
    const hafalanByStudent = new Map<string, HafalanEntry[]>();
    for (const h of allHafalan) {
      if (!hafalanByStudent.has(h.student_id)) {
        hafalanByStudent.set(h.student_id, []);
      }
      hafalanByStudent.get(h.student_id)!.push(h);
    }

    // Kelompokkan per kelas
    const classMap = new Map<string, ClassStats>();

    for (const s of studentList) {
      const className = s.classes?.name ?? 'Tanpa Kelas';
      const classNumber = extractClassNumber(className);

      if (!classMap.has(className)) {
        const standarList = STANDAR_PER_KELAS[classNumber] ?? [];
        const currentStandar = standarList.find((st) => st.semester === currentSemesterNum);

        classMap.set(className, {
          class_name: className,
          class_number: classNumber,
          semester: activeSemester,
          semester_standar_label: currentStandar?.label ?? '-',
          total_students: 0,
          achieved: 0,
          not_achieved: 0,
          percentage: 0,
          students: [],
        });
      }

      const stats = classMap.get(className)!;
      stats.total_students++;

      // Cek capaian
      const standarList = STANDAR_PER_KELAS[classNumber] ?? [];
      const currentStandar = standarList.find((st) => st.semester === currentSemesterNum);

      let achieved = true; // Default: capai jika tidak ada standar
      if (currentStandar) {
        if (currentStandar.type === 'surah' && currentStandar.surah_range) {
          // Kelas 1-4: cek dari hafalan
          const studentHafalan = hafalanByStudent.get(s.id) ?? [];
          achieved = checkSurahAchieved(studentHafalan, currentStandar.surah_range);
        } else if (currentStandar.type === 'juz' && currentStandar.required_juz) {
          // Kelas 3-6: cek dari juz_terakhir
          achieved = hasAchievedByJuz(s.juz_terakhir, currentStandar.required_juz);
        }
      }

      if (achieved) {
        stats.achieved++;
      } else {
        stats.not_achieved++;
      }

      stats.students.push({
        id: s.id,
        nama: s.nama,
        juz_terakhir: s.juz_terakhir,
        achieved,
      });
    }

    // Hitung persentase
    const allStats = Array.from(classMap.values());
    for (const stats of allStats) {
      stats.percentage = stats.total_students > 0
        ? Math.round((stats.achieved / stats.total_students) * 100)
        : 0;
    }

    const classStats = allStats.sort((a, b) => a.class_number - b.class_number);

    const totalStudents = studentList.length;
    const totalAchieved = classStats.reduce((sum, c) => sum + c.achieved, 0);
    const totalPercentage = totalStudents > 0
      ? Math.round((totalAchieved / totalStudents) * 100)
      : 0;

    // Format standar
    const standardsFormatted: Record<number, { smt1: string; smt2: string }> = {};
    for (const [kelas, standars] of Object.entries(STANDAR_PER_KELAS)) {
      const smt1 = standars.find((s) => s.semester === 1);
      const smt2 = standars.find((s) => s.semester === 2);
      standardsFormatted[Number(kelas)] = {
        smt1: smt1?.label ?? '-',
        smt2: smt2?.label ?? '-',
      };
    }

    return NextResponse.json({
      data: {
        classes: classStats,
        summary: {
          total_students: totalStudents,
          total_achieved: totalAchieved,
          total_not_achieved: totalStudents - totalAchieved,
          total_percentage: totalPercentage,
        },
        standards: standardsFormatted,
        current_semester: activeSemester,
      },
    });
  } catch (error) {
    console.error('Route error /api/laporan/capaian-lulusan:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
