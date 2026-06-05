// src/app/api/absensi/monitoring/route.ts
// GET: terima query params `from` dan `to` (YYYY-MM-DD).
// Return array { date: string, count: number } untuk setiap hari dalam range.
// Hari tanpa kehadiran tetap disertakan dengan count 0.
// Hanya boleh diakses oleh pengguna yang sudah terautentikasi.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Menghasilkan array semua tanggal (YYYY-MM-DD) antara from dan to (inklusif).
 */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const current = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');

  while (current <= end) {
    const y = current.getUTCFullYear();
    const m = String(current.getUTCMonth() + 1).padStart(2, '0');
    const d = String(current.getUTCDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();

    // Validasi format tanggal
    if (!from || !DATE_REGEX.test(from)) {
      return NextResponse.json(
        { message: 'Parameter `from` wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (!to || !DATE_REGEX.test(to)) {
      return NextResponse.json(
        { message: 'Parameter `to` wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (from > to) {
      return NextResponse.json(
        { message: 'Parameter `from` tidak boleh lebih besar dari `to`.' },
        { status: 400 }
      );
    }

    // Batasi range maksimal 365 hari untuk menghindari query yang terlalu besar
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 365) {
      return NextResponse.json(
        { message: 'Rentang tanggal maksimal adalah 365 hari.' },
        { status: 400 }
      );
    }

    const classId = searchParams.get('class_id')?.trim();
    const supabase = createServerClient();

    // Ambil semua records absensi 'Hadir' dalam rentang tanggal
    // Hitung distinct santri per hari → count per hari
    let attendancesQuery = supabase
      .from('attendances')
      .select('santri_id, date')
      .eq('status', 'Hadir')
      .gte('date', from)
      .lte('date', to);

    // Filter berdasarkan kelas jika class_id diberikan
    if (classId) {
      const { data: kelasStudents } = await supabase
        .from('santri')
        .select('id')
        .eq('class_id', classId)
        .eq('status', 'Aktif');
      const kelasIds = (kelasStudents ?? []).map((s: any) => s.id);
      if (kelasIds.length > 0) {
        attendancesQuery = attendancesQuery.in('santri_id', kelasIds);
      } else {
        // Tidak ada santri di kelas ini — return empty
        const allDates = generateDateRange(from, to);
        const data = allDates.map((date) => ({ date, count: 0 }));
        return NextResponse.json({ data, from, to }, { status: 200 });
      }
    }

    const { data: attendances, error } = await attendancesQuery;

    if (error) {
      console.error('Fetch attendances error (monitoring):', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data absensi.' },
        { status: 500 }
      );
    }

    // Hitung jumlah distinct santri_id per tanggal
    const countByDate: Record<string, Set<string>> = {};
    for (const record of (attendances ?? [])) {
      const dateKey = record.date as string;
      if (!countByDate[dateKey]) {
        countByDate[dateKey] = new Set();
      }
      countByDate[dateKey].add(record.santri_id as string);
    }

    // Generate semua hari dalam range, isi dengan count (0 jika tidak ada)
    const allDates = generateDateRange(from, to);
    const data = allDates.map((date) => ({
      date,
      count: countByDate[date] ? countByDate[date].size : 0,
    }));

    return NextResponse.json({ data, from, to }, { status: 200 });
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
