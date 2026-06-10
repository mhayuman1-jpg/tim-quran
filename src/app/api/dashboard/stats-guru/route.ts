// src/app/api/dashboard/stats-guru/route.ts
// GET: Statistik dashboard khusus guru — hanya data siswa yang diampu

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const userId = session.user.id;
  const role = session.user.role;
  const teacherId = getTeacherFilterId(role, request, userId);

  try {
    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    // Ambil siswa yang diampu — gunakan shouldFilterByTeacher agar konsisten
    // Tim_Quran: selalu filter by assigned_teacher_id
    // Kabid/Sekretaris: hanya filter jika dalam Mode Mengajar
    let santriQuery = supabase
      .from('santri')
      .select('id, nama, nisn, gender, juz_terakhir, assigned_teacher_id, classes(name)')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (shouldFilterByTeacher(role, request)) {
      santriQuery = santriQuery.eq('assigned_teacher_id', teacherId);
    }

    const { data: students, error: sErr } = await santriQuery;

    if (sErr) {
      console.error('Fetch students error:', sErr);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const studentList = students ?? [];
    const studentIds = studentList.map(s => s.id);
    const totalSiswa = studentIds.length;

    if (totalSiswa === 0) {
      return NextResponse.json({
        totalSantriAktif: 0,
        kehadiranHariIni: { hadir: 0, total: 0, persentase: 0 },
        ringkasanJuz: [],
        jumlahTimAktif: 0,
        recentHafalan: [],
        recentTahsin: [],
      }, { status: 200 });
    }

    // Kehadiran hari ini untuk siswa yang diampu
    const { count: totalHadir } = await supabase
      .from('attendances')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'Hadir')
      .in('student_id', studentIds);

    const hadirHariIni = totalHadir ?? 0;
    const persentaseKehadiran = totalSiswa > 0
      ? parseFloat(((hadirHariIni / totalSiswa) * 100).toFixed(2))
      : 0;

    // Ringkasan juz
    const juzMap: Record<number, number> = {};
    for (const s of studentList) {
      if (s.juz_terakhir) {
        juzMap[s.juz_terakhir] = (juzMap[s.juz_terakhir] ?? 0) + 1;
      }
    }
    const ringkasanJuz = Object.entries(juzMap)
      .map(([juz, count]) => ({ juz: Number(juz), count }))
      .sort((a, b) => a.juz - b.juz);

    // 5 hafalan terakhir
    const { data: recentHafalan } = await supabase
      .from('hafalan')
      .select('id, student_id, date, surah, ayat, juz, hizb, page, lancar, makhroj, tajwid, catatan, santri(nama)')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .limit(5);

    // 5 tahsin terakhir
    const { data: recentTahsin } = await supabase
      .from('tahsin')
      .select('id, student_id, date, halaman, keterangan, kelancaran, makhroj, tajwid, adab, catatan, santri(nama)')
      .in('student_id', studentIds)
      .order('date', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totalSantriAktif: totalSiswa,
      kehadiranHariIni: {
        hadir: hadirHariIni,
        total: totalSiswa,
        persentase: persentaseKehadiran,
      },
      ringkasanJuz,
      recentHafalan: recentHafalan ?? [],
      recentTahsin: recentTahsin ?? [],
    }, { status: 200 });
  } catch (error) {
    console.error('Dashboard stats-guru API error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
