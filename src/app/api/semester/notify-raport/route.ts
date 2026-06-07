// src/app/api/semester/notify-raport/route.ts
// POST: Kirim pengumuman kepada guru bahwa raport tahfidz & tahsin harus disiapkan

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.', status: 403 });
    }

    const body = await request.json();
    const { semester_name, end_date } = body;

    if (!semester_name || typeof semester_name !== 'string' || semester_name.trim() === '') {
      return NextResponse.json({ message: 'Nama semester wajib diisi.' }, { status: 400 });
    }
    if (!end_date || typeof end_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return NextResponse.json({ message: 'Tanggal akhir semester harus diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }

    const formattedDate = new Date(end_date).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const supabase = createServerClient();
    const message = `Akhir Semester ${semester_name.trim()} jatuh pada ${formattedDate}. Mohon semua tim segera menyiapkan Raport Tahfidz & Tahsin sesuai data jurnal harian.`;

    const { data, error } = await supabase
      .from('pengumuman')
      .insert({
        judul: `Pengumuman Akhir Semester ${semester_name.trim()}`,
        isi: message,
        target: 'Guru',
        created_by: session.user.id,
      })
      .select('id, judul, isi, target, created_by, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase insert pengumuman error:', error);
      return NextResponse.json({ message: 'Gagal mengirim pengumuman.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Pengumuman raport berhasil dikirim.', data }, { status: 201 });
  } catch (error) {
    console.error('Route error /api/semester/notify-raport:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
