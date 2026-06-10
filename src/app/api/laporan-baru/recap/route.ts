// src/app/api/laporan-baru/recap/route.ts
// GET: Auto-recap data siswa untuk laporan Tim Qur'an
// Query: teacher_id (default: current user), periode, tahun_ajaran

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacher_id')?.trim() || session.user.id;
  const periode = searchParams.get('periode')?.trim() || '';
  const tahunAjaran = searchParams.get('tahun_ajaran')?.trim() || '';

  // Hanya Tim_Quran, Kabid, Sekretaris yang bisa akses
  if (!['Tim_Quran', 'Kabid', 'Sekretaris'].includes(session.user.role)) {
    return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
  }

  const supabase = createServerClient();

  try {
    // Ambil siswa yang diampu teacher
    const { data: students, error: sErr } = await supabase
      .from('santri')
      .select('id, nama, nisn, gender, juz_terakhir, classes(name)')
      .eq('assigned_teacher_id', teacherId)
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (sErr) return NextResponse.json({ message: 'Gagal mengambil data siswa.', error: sErr.message }, { status: 500 });

    const studentList = students ?? [];
    const studentIds = studentList.map(s => s.id);

    if (studentIds.length === 0) {
      return NextResponse.json({ data: {
        teacher_name: session.user.name,
        total_students: 0,
        students: [],
        summary: { total_hafalan: 0, total_tahsin: 0, total_absensi: 0, avg_kehadiran: 0 },
      }}, { status: 200 });
    }

    // Fetch hafalan semua siswa
    const { data: hafalanData } = await supabase
      .from('hafalan')
      .select('student_id, id, makhroj, tajwid, lancar')
      .in('student_id', studentIds);

    // Fetch tahsin semua siswa
    const { data: tahsinData } = await supabase
      .from('tahsin')
      .select('student_id, id, makhroj, kelancaran, adab')
      .in('student_id', studentIds);

    // Fetch absensi semua siswa
    const { data: absensiData } = await supabase
      .from('attendances')
      .select('student_id, status')
      .in('student_id', studentIds);

    // Hitung per siswa
    const studentRecaps = studentList.map(student => {
      const hafalan = (hafalanData ?? []).filter(h => h.student_id === student.id);
      const tahsin = (tahsinData ?? []).filter(t => t.student_id === student.id);
      const absensi = (absensiData ?? []).filter(a => a.student_id === student.id);

      const hafalanDinilai = hafalan.filter(h => h.makhroj || h.tajwid || h.lancar);
      const tahsinDinilai = tahsin.filter(t => t.makhroj || t.kelancaran || t.adab);

      const totalHadir = absensi.filter(a => a.status === 'Hadir').length;
      const totalAbsensi = absensi.length;
      const pctKehadiran = totalAbsensi > 0 ? Math.round((totalHadir / totalAbsensi) * 100) : 0;

      return {
        id: student.id,
        nama: student.nama,
        nisn: student.nisn,
        gender: student.gender,
        kelas: (student.classes as any)?.name ?? '-',
        juz_terakhir: student.juz_terakhir,
        hafalan_count: hafalan.length,
        hafalan_dinilai: hafalanDinilai.length,
        tahsin_count: tahsin.length,
        tahsin_dinilai: tahsinDinilai.length,
        absensi_hadir: totalHadir,
        absensi_total: totalAbsensi,
        kehadiran_pct: pctKehadiran,
      };
    });

    // Summary
    const summary = {
      total_students: studentRecaps.length,
      total_hafalan: studentRecaps.reduce((a, s) => a + s.hafalan_count, 0),
      hafalan_dinilai: studentRecaps.reduce((a, s) => a + s.hafalan_dinilai, 0),
      total_tahsin: studentRecaps.reduce((a, s) => a + s.tahsin_count, 0),
      tahsin_dinilai: studentRecaps.reduce((a, s) => a + s.tahsin_dinilai, 0),
      total_absensi: studentRecaps.reduce((a, s) => a + s.absensi_total, 0),
      avg_kehadiran: studentRecaps.length > 0
        ? Math.round(studentRecaps.reduce((a, s) => a + s.kehadiran_pct, 0) / studentRecaps.length)
        : 0,
    };

    return NextResponse.json({
      data: {
        teacher_name: session.user.name,
        periode,
        tahun_ajaran: tahunAjaran,
        summary,
        students: studentRecaps,
      }
    }, { status: 200 });
  } catch (err) {
    console.error('[recap GET]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
