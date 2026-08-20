// src/app/api/laporan/capaian-lulusan/route.ts
// GET: Statistik capaian lulusan per kelas (Kabid only)
//
// Standar per kelas & semester:
//   Kelas 1 Smt1: An Naas - Al Kautsar (surah 114-108)
//   Kelas 1 Smt2: Al Ma'un - At Takatsur (surah 107-102)
//   Kelas 2 Smt1: Al Qari'ah - Al Bayyinah (surah 101-98)
//   Kelas 2 Smt2: Al Qadr - Ad Duha (surah 97-93)
//   Kelas 3 Smt1: Juz 30 (surah 92-86)
//   Kelas 3 Smt2: Juz 30 selesai
//   Kelas 4: Juz 30 selesai
//   Kelas 5-6: Juz 30 & 29 selesai
//
// Format juz_terakhir: "30", "30 & 29", "30 & 29 & 28"

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ── Mapping surah dalam Juz 30 (posisi dari awal Juz 30) ──────────────────
// Urutan surah di Juz 30 dari An-Nas (114) ke Ad-Duha (93)
const JUZ30_SURAHS = [
  { pos: 1, no: 114, name: 'An Nas' },
  { pos: 2, no: 113, name: 'Al Falaq' },
  { pos: 3, no: 112, name: 'Al Ikhlas' },
  { pos: 4, no: 111, name: 'Al Masad' },
  { pos: 5, no: 110, name: 'An Nasr' },
  { pos: 6, no: 109, name: 'Al Kafirun' },
  { pos: 7, no: 108, name: 'Al Kautsar' },
  { pos: 8, no: 107, name: 'Al Maun' },
  { pos: 9, no: 106, name: 'Quraisy' },
  { pos: 10, no: 105, name: 'Al Fil' },
  { pos: 11, no: 104, name: 'Al Humazah' },
  { pos: 12, no: 103, name: 'Al Asr' },
  { pos: 13, no: 102, name: 'At Takatsur' },
  { pos: 14, no: 101, name: 'Al Qariah' },
  { pos: 15, no: 100, name: 'Al Adiyat' },
  { pos: 16, no: 99, name: 'Az Zalzalah' },
  { pos: 17, no: 98, name: 'Al Bayyinah' },
  { pos: 18, no: 97, name: 'Al Qadr' },
  { pos: 19, no: 96, name: 'Al Alaq' },
  { pos: 20, no: 95, name: 'At Tin' },
  { pos: 21, no: 94, name: 'Ash Sharh' },
  { pos: 22, no: 93, name: 'Ad Duha' },
  { pos: 23, no: 92, name: 'Al Lail' },
  { pos: 24, no: 91, name: 'Ash Shams' },
  { pos: 25, no: 90, name: 'Al Balad' },
  { pos: 26, no: 89, name: 'Al Fajr' },
  { pos: 27, no: 88, name: 'Al Ghashiyah' },
  { pos: 28, no: 87, name: "Al A'la" },
  { pos: 29, no: 86, name: 'At Tariq' },
  { pos: 30, no: 85, name: 'Al Buruj' },
  { pos: 31, no: 84, name: 'Al Inshiqaq' },
  { pos: 32, no: 83, name: 'Al Mutaffifin' },
  { pos: 33, no: 82, name: 'Al Infitar' },
  { pos: 34, no: 81, name: 'At Takwir' },
  { pos: 35, no: 80, name: 'Abasa' },
  { pos: 36, no: 79, name: 'An Naziat' },
  { pos: 37, no: 78, name: 'An Naba' },
];

// ── Standar capaian per kelas & semester ──────────────────────────────────
interface SemesterStandar {
  semester: 1 | 2;
  label: string;           // Label tampilan
  required_juz: string[];  // Juz yang harus selesai (untuk kelas 3+)
  required_surah_range?: { start_pos: number; end_pos: number }; // Range surah di Juz 30 (untuk kelas 1-2)
}

const STANDAR_PER_KELAS: Record<number, SemesterStandar[]> = {
  1: [
    {
      semester: 1,
      label: 'An Naas - Al Kautsar',
      required_juz: [],
      required_surah_range: { start_pos: 1, end_pos: 7 },  // posisi 1-7
    },
    {
      semester: 2,
      label: "Al Ma'un - At Takatsur",
      required_juz: [],
      required_surah_range: { start_pos: 8, end_pos: 13 }, // posisi 8-13
    },
  ],
  2: [
    {
      semester: 1,
      label: "Al Qari'ah - Al Bayyinah",
      required_juz: [],
      required_surah_range: { start_pos: 14, end_pos: 17 }, // posisi 14-17
    },
    {
      semester: 2,
      label: 'Al Qadr - Ad Duha',
      required_juz: [],
      required_surah_range: { start_pos: 18, end_pos: 22 }, // posisi 18-22
    },
  ],
  3: [
    {
      semester: 1,
      label: 'Juz 30 (setengah)',
      required_juz: [],
      required_surah_range: { start_pos: 1, end_pos: 18 }, // posisi 1-18
    },
    {
      semester: 2,
      label: 'Juz 30 selesai',
      required_juz: ['30'],
    },
  ],
  4: [
    {
      semester: 1,
      label: 'Juz 30',
      required_juz: ['30'],
    },
    {
      semester: 2,
      label: 'Juz 30',
      required_juz: ['30'],
    },
  ],
  5: [
    {
      semester: 1,
      label: 'Juz 30',
      required_juz: ['30'],
    },
    {
      semester: 2,
      label: 'Juz 30 & 29',
      required_juz: ['30', '29'],
    },
  ],
  6: [
    {
      semester: 1,
      label: 'Juz 30 & 29',
      required_juz: ['30', '29'],
    },
    {
      semester: 2,
      label: 'Juz 30 & 29',
      required_juz: ['30', '29'],
    },
  ],
};

// Parse juz_terakhir string ke array angka juz
function parseJuzList(juzStr: string | null | undefined): number[] {
  if (!juzStr) return [];
  return juzStr
    .split('&')
    .map((s) => parseInt(s.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n));
}

// Cek apakah siswa sudah capai standar berdasarkan juz
function hasAchievedByJuz(juzStr: string | null | undefined, requiredJuz: string[]): boolean {
  if (requiredJuz.length === 0) return true;
  const completed = parseJuzList(juzStr);
  return requiredJuz.every((j) => completed.includes(parseInt(j, 10)));
}

// Ekstrak nomor kelas dari nama kelas
function extractClassNumber(className: string | null | undefined): number {
  if (!className) return 0;
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Ambil semester aktif dari database ──────────────────────────────────────
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
  return 'Ganjil'; // Default
}

// ── Types ──────────────────────────────────────────────────────────────────
interface StudentData {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  classes: { id: string; name: string } | null;
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

    // Ambil semester aktif
    const activeSemester = await getActiveSemester(supabase);
    const currentSemesterNum = activeSemester === 'Ganjil' ? 1 : 2;

    // Ambil semua siswa aktif beserta kelasnya
    const { data: students, error } = await supabase
      .from('santri')
      .select('id, nama, juz_terakhir, classes ( id, name )')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Fetch santri error (capaian lulusan):', error);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const studentList = (students ?? []) as unknown as StudentData[];

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

      // Cek capaian berdasarkan standar kelas saat ini
      const standarList = STANDAR_PER_KELAS[classNumber] ?? [];
      const currentStandar = standarList.find((st) => st.semester === currentSemesterNum);
      const requiredJuz = currentStandar?.required_juz ?? [];
      const achieved = hasAchievedByJuz(s.juz_terakhir, requiredJuz);

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

    // Urutkan berdasarkan nomor kelas
    const classStats = allStats.sort((a, b) => a.class_number - b.class_number);

    // Hitung total keseluruhan
    const totalStudents = studentList.length;
    const totalAchieved = classStats.reduce((sum, c) => sum + c.achieved, 0);
    const totalPercentage = totalStudents > 0
      ? Math.round((totalAchieved / totalStudents) * 100)
      : 0;

    // Format standar untuk response
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
        juz30_surahs: JUZ30_SURAHS,
      },
    });
  } catch (error) {
    console.error('Route error /api/laporan/capaian-lulusan:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
