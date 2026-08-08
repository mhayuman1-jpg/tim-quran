export const dynamic = 'force-dynamic';
// src/app/api/absensi/kabid-mark/route.ts
// GET: ambil daftar siswa dalam satu kelas beserta status absensi hari ini.
// POST: tandai siswa yang dipilih sebagai Hadir.
// Hanya bisa diakses oleh Kabid.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import { requireNoHoliday } from '@/lib/holiday';
import { normalizeAttendanceRows, insertAttendanceRecord } from '@/lib/attendance';

// ─── GET: daftar siswa per kelas + status hadir hari ini ──────────────────────

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Kabid') {
    return NextResponse.json({ message: 'Tidak memiliki akses.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id')?.trim();

    if (!classId) {
      return NextResponse.json(
        { message: 'Parameter `class_id` wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    // Ambil semua siswa aktif di kelas ini
    const { data: santriList, error: santriError } = await supabase
      .from('santri')
      .select('id, nama, nisn, gender, assigned_teacher_id')
      .eq('class_id', classId)
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (santriError) {
      console.error('Fetch santri error:', santriError);
      return NextResponse.json(
        { message: 'Gagal mengambil data siswa.' },
        { status: 500 }
      );
    }

    if (!santriList || santriList.length === 0) {
      return NextResponse.json({ data: [], date: today }, { status: 200 });
    }

    // Ambil absensi hari ini untuk siswa di kelas ini
    const santriIds = santriList.map((s: any) => s.id);
    const { data: attendances, error: attError } = await supabase
      .from('attendances')
      .select('*')
      .eq('date', today);

    if (attError) {
      console.error('Fetch attendances error:', attError);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi.' },
        { status: 500 }
      );
    }

    const normalized = normalizeAttendanceRows(attendances);
    const hadirSet = new Set<string>();
    for (const att of normalized) {
      if (att.santri_id && santriIds.includes(att.santri_id) && att.status === 'Hadir') {
        hadirSet.add(att.santri_id);
      }
    }

    // Ambil nama guru assigned
    const teacherIds = Array.from(new Set(santriList.map((s: any) => s.assigned_teacher_id).filter(Boolean)));
    const teacherMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', teacherIds);
      for (const t of teachers ?? []) teacherMap[t.id] = t.name;
    }

    const result = santriList.map((s: any) => ({
      id: s.id,
      nama: s.nama,
      nisn: s.nisn,
      gender: s.gender,
      guru: s.assigned_teacher_id ? (teacherMap[s.assigned_teacher_id] ?? '—') : '—',
      status: hadirSet.has(s.id) ? 'Hadir' : 'Tidak Hadir',
    }));

    return NextResponse.json({ data: result, date: today }, { status: 200 });
  } catch (error) {
    console.error('Kabid mark GET error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

// ─── POST: tandai siswa terpilih sebagai Hadir ────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'Kabid') {
    return NextResponse.json({ message: 'Tidak memiliki akses.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { student_ids, date: inputDate } = body as {
      student_ids?: string[];
      date?: string;
    };

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { message: 'Pilih minimal satu siswa untuk ditandai hadir.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    const date = inputDate && /^\d{4}-\d{2}-\d{2}$/.test(inputDate) ? inputDate : today;

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    // Cek hari libur
    const holidayCheck = await requireNoHoliday(supabase, date, session.user.role);
    if (holidayCheck.error) return holidayCheck.error;

    // Validasi siswa exists
    const { data: validStudents } = await supabase
      .from('santri')
      .select('id, nama')
      .eq('status', 'Aktif')
      .in('id', student_ids);

    const validIds = new Set((validStudents ?? []).map((s: any) => s.id));
    const validList = (validStudents ?? []).filter((s: any) => validIds.has(s.id));

    if (validList.length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada siswa valid yang dipilih.' },
        { status: 400 }
      );
    }

    // Cek yang sudah absen hari ini
    const { data: existingAttendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('date', date);

    const normalizedExisting = normalizeAttendanceRows(existingAttendances);
    const alreadyAbsen = new Set(
      normalizedExisting
        .filter((r: any) => r.santri_id && validIds.has(r.santri_id))
        .map((r: any) => r.santri_id)
    );

    const toMark = validList.filter((s: any) => !alreadyAbsen.has(s.id));
    const skipped = validList.length - toMark.length;

    if (toMark.length === 0) {
      return NextResponse.json(
        { message: 'Semua siswa yang dipilih sudah absen hari ini.', marked: 0, skipped },
        { status: 200 }
      );
    }

    // Insert absensi satu per satu menggunakan helper yang handle fallback kolom
    let successCount = 0;
    for (const s of toMark) {
      const { error: insertErr } = await insertAttendanceRecord(
        supabase, s.id, date, 'Hadir'
      );
      if (!insertErr || insertErr.code !== '23505') successCount++;
    }

    return NextResponse.json({
      message: `${successCount} siswa berhasil ditandai hadir.`,
      marked: successCount,
      skipped: skipped + (toMark.length - successCount),
    }, { status: 200 });
  } catch (error) {
    console.error('Kabid mark POST error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
