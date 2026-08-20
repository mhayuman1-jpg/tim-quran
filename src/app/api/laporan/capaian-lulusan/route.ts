// src/app/api/laporan/capaian-lulusan/route.ts
// GET: Statistik capaian lulusan per kelas (Kabid only)
// Standar:
//   Kelas 1-3: tidak ada standar wajib
//   Kelas 4: minimal Juz 30
//   Kelas 5: minimal Juz 30
//   Kelas 6: minimal Juz 29-30 (2 juz)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Standar capaian per kelas:
//   Kelas 1-4: Proses menghafal Juz 30 → Target di kelas 4: sudah hafal Juz 30
//   Kelas 5-6: Proses menghafal Juz 29-30 → Target di kelas 6: sudah hafal Juz 29 & 30
// Logic: juz_terakhir <= standar = sudah capai (karena Juz 30 > 29 > 28, makin kecil = makin banyak hafalan)
const STANDAR_PER_KELAS: Record<number, number> = {
  1: 0,   // Belum ada target
  2: 0,   // Belum ada target
  3: 0,   // Belum ada target
  4: 30,  // Target: Juz 30
  5: 29,  // Target: Juz 29 (sudah hafal Juz 30 & 29)
  6: 29,  // Target: Juz 29 (sudah hafal Juz 30 & 29)
};

// Konversi juz_terakhir string ke angka untuk perbandingan
// Misal: "30" → 30, "29" → 29, "15" → 15, "" → 0
function parseJuz(juzStr: string | null | undefined): number {
  if (!juzStr) return 0;
  const n = parseInt(juzStr.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

// Ekstrak nomor kelas dari nama kelas (misal: "4 Shofa" → 4, "1 Imam Maliki" → 1)
function extractClassNumber(className: string | null | undefined): number {
  if (!className) return 0;
  const match = className.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

interface StudentData {
  id: string;
  nama: string;
  juz_terakhir: string | null;
  classes: { id: string; name: string } | null;
}

interface ClassStats {
  class_name: string;
  class_number: number;
  total_students: number;
  achieved: number;        // Siswa yang sudah capai standar
  not_achieved: number;    // Siswa yang belum capai standar
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
        classMap.set(className, {
          class_name: className,
          class_number: classNumber,
          total_students: 0,
          achieved: 0,
          not_achieved: 0,
          percentage: 0,
          students: [],
        });
      }

      const stats = classMap.get(className)!;
      stats.total_students++;

      const juz = parseJuz(s.juz_terakhir);
      const standar = STANDAR_PER_KELAS[classNumber] ?? 0;
      const achieved = standar === 0 ? true : juz <= standar && juz > 0;

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

    return NextResponse.json({
      data: {
        classes: classStats,
        summary: {
          total_students: totalStudents,
          total_achieved: totalAchieved,
          total_not_achieved: totalStudents - totalAchieved,
          total_percentage: totalPercentage,
        },
        standards: STANDAR_PER_KELAS,
      },
    });
  } catch (error) {
    console.error('Route error /api/laporan/capaian-lulusan:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
