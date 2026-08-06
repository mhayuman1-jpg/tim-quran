// src/app/api/absensi/scan/route.ts
// POST: terima qr_code, cari siswa di tabel santri, cek duplikat absensi hari ini,
// cek hari libur, insert ke tabel attendances, return nama siswa.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import { requireNoHoliday } from '@/lib/holiday';
import {
  insertAttendanceRecord,
  queryAttendanceByStudentMaybeSingle,
} from '@/lib/attendance';
import { getTeacherClassIds } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verifikasi sesi — hanya pengguna terautentikasi
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { qr_code } = body as { qr_code?: string };

    if (!qr_code || typeof qr_code !== 'string' || qr_code.trim() === '') {
      return NextResponse.json(
        { message: 'QR Code tidak terbaca atau kosong.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    // 1. Cari siswa berdasarkan qr_code — exact match dulu, lalu prefix match (8 char pertama)
    const scanned = qr_code.trim();
    let siswa: { id: string; nama: string; assigned_teacher_id: string | null; class_id: string | null } | null = null;

    // Coba exact match (case-insensitive)
    const { data: exactMatch } = await supabase
      .from('santri')
      .select('id, nama, assigned_teacher_id, class_id')
      .ilike('qr_code', scanned)
      .limit(1)
      .maybeSingle();

    if (exactMatch) {
      siswa = exactMatch;
    } else if (scanned.length >= 8) {
      // Fallback: prefix match — cocokkan 8 karakter pertama (untuk ID card lama)
      const prefix = scanned.slice(0, 8).toLowerCase();
      const { data: prefixMatch } = await supabase
        .from('santri')
        .select('id, nama, assigned_teacher_id, class_id')
        .ilike('qr_code', prefix + '%')
        .limit(1)
        .maybeSingle();
      siswa = prefixMatch ?? null;
    }

    if (!siswa) {
      return NextResponse.json(
        { message: 'QR Code tidak dikenali.' },
        { status: 404 }
      );
    }

    // Cek apakah pengajar memiliki akses ke siswa ini
    if (session.user.role === 'Tim_Quran') {
      const isAssigned = siswa.assigned_teacher_id === session.user.id;
      if (!isAssigned) {
        const teacherClassIds = await getTeacherClassIds(supabase, session.user.id);
        const isInTeacherClass = siswa.class_id ? teacherClassIds.includes(siswa.class_id) : false;
        if (!isInTeacherClass) {
          return NextResponse.json(
            { message: 'Siswa ini bukan binaan Anda.' },
            { status: 403 }
          );
        }
      }
    }

    // 2. Tanggal hari ini format YYYY-MM-DD (WITA)
    const today = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Makassar',
    }).format(new Date());

    // 2b. Cek hari libur — tolak scan jika hari ini libur
    const holidayCheck = await requireNoHoliday(supabase, today);
    if (holidayCheck.error) return holidayCheck.error;

    // 3. Cek duplikat: cari record absensi hari ini di kolom santri_id / student_id
    const { data: existing, error: checkError } = await queryAttendanceByStudentMaybeSingle(
      supabase,
      siswa.id,
      today
    );

    if (checkError) {
      console.error('Duplikat check error:', checkError);
      return NextResponse.json(
        { message: 'Gagal memeriksa data absensi.' },
        { status: 500 }
      );
    }

    if (existing) {
      // Requirement 4.4: ALWAYS return 409 jika siswa sudah absen hari ini
      return NextResponse.json(
        { message: 'Siswa sudah absen hari ini.' },
        { status: 409 }
      );
    }

    // 4. Insert ke tabel attendances
    const { error: insertError } = await insertAttendanceRecord(
      supabase,
      siswa.id,
      today,
      'Hadir'
    );

    if (insertError) {
      // Fallback: constraint UNIQUE violation (code 23505) â€” race condition
      if (insertError.code === '23505') {
        return NextResponse.json(
          { message: 'Siswa sudah absen hari ini.' },
          { status: 409 }
        );
      }
      console.error('Insert absensi error:', insertError);
      return NextResponse.json(
        { message: 'Gagal mencatat absensi: ' + insertError.message },
        { status: 500 }
      );
    }

    // 5. Berhasil — kembalikan nama siswa dan ID
    return NextResponse.json(
      { message: 'Absen berhasil!', siswa: { nama: siswa.nama, id: siswa.id } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
