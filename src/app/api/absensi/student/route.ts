export const dynamic = 'force-dynamic';
// src/app/api/absensi/student/route.ts
// GET: Ambil riwayat kehadiran untuk satu siswa tertentu
// Query param: student_id (required), date_from (optional), date_to (optional)
// Digunakan untuk detail laporan per siswa

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { queryAttendanceByStudent } from '@/lib/attendance';

export async function GET(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const dateFrom = searchParams.get('date_from')?.trim();
    const dateTo = searchParams.get('date_to')?.trim();

    if (!studentId) {
      return NextResponse.json(
        { message: 'Parameter student_id wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verifikasi siswa ada dan cek akses (Tim_Quran hanya bisa lihat siswa yang dibina)
    const { data: student, error: studentError } = await supabase
      .from('santri')
      .select('id, nama, assigned_teacher_id')
      .eq('id', studentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { message: 'Siswa tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Data isolation: Tim_Quran hanya bisa lihat siswa yang dibina
    if (session.user.role === 'Tim_Quran' && student.assigned_teacher_id !== session.user.id) {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan.' },
        { status: 403 }
      );
    }

    // Query attendance untuk siswa ini
    const { data, error } = await queryAttendanceByStudent(
      supabase,
      studentId,
      dateFrom,
      dateTo
    );

    if (error) {
      console.error('Fetch attendance error (student):', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data kehadiran.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Attendance student API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
