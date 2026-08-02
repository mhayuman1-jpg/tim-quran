// src/app/api/kalender-libur/route.ts
// GET: Ambil daftar hari libur (dapat difilter by tahun/bulan)
// POST: Tambah hari libur baru (Kabid only)
// DELETE: Hapus hari libur (Kabid only)

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year')?.trim();
    const month = searchParams.get('month')?.trim();

    const supabase = createServerClient();

    let query = supabase
      .from('holiday_calendar')
      .select('*')
      .order('date', { ascending: true });

    // Filter by year
    if (year) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }

    // Filter by month (within year)
    if (month && year) {
      const mm = month.padStart(2, '0');
      const daysInMonth = new Date(Number(year), Number(month), 0).getDate();
      query = query.gte('date', `${year}-${mm}-01`).lte('date', `${year}-${mm}-${daysInMonth}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch holiday calendar error:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data kalender libur.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Route GET /api/kalender-libur:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  // Hanya Kabid yang boleh menambah hari libur
  if (session.user.role !== 'Kabid') {
    return NextResponse.json(
      { message: 'Hanya Kabid yang dapat mengelola kalender libur.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { date, dates, keterangan, tipe } = body;

    if (!keterangan || typeof keterangan !== 'string' || keterangan.trim() === '') {
      return NextResponse.json(
        { message: 'Keterangan hari libur wajib diisi.' },
        { status: 400 }
      );
    }

    const validTipe = ['libur_nasional', 'libur_sekolah', 'libur_agama', 'lainnya'];
    const tipeValue = tipe && validTipe.includes(tipe) ? tipe : 'libur_sekolah';

    // Normalize: support both single `date` and batch `dates` array
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let dateList: string[] = [];

    if (Array.isArray(dates) && dates.length > 0) {
      dateList = dates.filter((d: string) => typeof d === 'string' && dateRegex.test(d));
      if (dateList.length === 0) {
        return NextResponse.json(
          { message: 'Format tanggal tidak valid.' },
          { status: 400 }
        );
      }
    } else if (typeof date === 'string' && dateRegex.test(date)) {
      dateList = [date];
    } else {
      return NextResponse.json(
        { message: 'Tanggal wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek duplikat
    const { data: existingRows } = await supabase
      .from('holiday_calendar')
      .select('date')
      .in('date', dateList);

    const existingDates = new Set((existingRows ?? []).map((r) => r.date));
    const newDates = dateList.filter((d) => !existingDates.has(d));
    const skippedCount = dateList.length - newDates.length;

    if (newDates.length === 0) {
      return NextResponse.json(
        { message: 'Semua tanggal sudah ditandai sebagai hari libur.', skippedCount },
        { status: 409 }
      );
    }

    const rows = newDates.map((d) => ({
      date: d,
      keterangan: keterangan.trim(),
      tipe: tipeValue,
      created_by: session.user.id,
    }));

    const { data, error } = await supabase
      .from('holiday_calendar')
      .insert(rows)
      .select();

    if (error) {
      console.error('Insert holiday error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan hari libur.', error: error.message },
        { status: 500 }
      );
    }

    const addedCount = data?.length ?? 0;
    let message = `${addedCount} hari libur berhasil ditambahkan.`;
    if (skippedCount > 0) {
      message += ` ${skippedCount} tanggal dilewati (sudah ada).`;
    }

    return NextResponse.json(
      { message, data, addedCount, skippedCount },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route POST /api/kalender-libur:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  if (session.user.role !== 'Kabid') {
    return NextResponse.json(
      { message: 'Hanya Kabid yang dapat mengelola kalender libur.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { id, date } = body;

    if (!id && !date) {
      return NextResponse.json(
        { message: 'ID atau tanggal hari libur wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    let deleteResult;
    if (id) {
      deleteResult = await supabase
        .from('holiday_calendar')
        .delete()
        .eq('id', id);
    } else {
      deleteResult = await supabase
        .from('holiday_calendar')
        .delete()
        .eq('date', date);
    }

    if (deleteResult.error) {
      console.error('Delete holiday error:', deleteResult.error);
      return NextResponse.json(
        { message: 'Gagal menghapus hari libur.', error: deleteResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Hari libur berhasil dihapus.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route DELETE /api/kalender-libur:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
