// src/app/api/tahsin/update/route.ts
// PUT: Update catatan tahsin berdasarkan id
// - Bisa update: tanggal, metode, buku, halaman, catatan
// - Tim_Quran hanya bisa update tahsin milik siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import type { TahsinMetode } from '@/types';

const VALID_METODE: TahsinMetode[] = ['Wafa', 'IWR', 'Al-Quran'];

export async function PUT(request: NextRequest) {
  // Verifikasi sesi
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, tanggal, metode, buku, halaman, catatan } = body;

    // Validasi field id
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID tahsin wajib diisi.' },
        { status: 400 }
      );
    }

    // Validasi tanggal jika diberikan
    if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { message: 'Format tanggal harus YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // Validasi metode jika diberikan
    if (metode !== undefined && !VALID_METODE.includes(metode as TahsinMetode)) {
      return NextResponse.json(
        { message: `Metode tidak valid. Pilihan: ${VALID_METODE.join(', ')}.` },
        { status: 400 }
      );
    }

    // Validasi halaman jika diberikan
    if (halaman !== undefined && halaman !== null) {
      const halamanNum = Number(halaman);
      if (isNaN(halamanNum) || halamanNum < 1) {
        return NextResponse.json(
          { message: 'Halaman harus berupa angka positif.' },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();

    // Ambil data tahsin yang ada untuk validasi akses
    const { data: existingTahsin, error: fetchError } = await supabase
      .from('tahsin')
      .select('id, student_id, teacher_id, santri ( id, assigned_teacher_id )')
      .eq('id', id.trim())
      .single();

    if (fetchError || !existingTahsin) {
      return NextResponse.json(
        { message: 'Catatan tahsin tidak ditemukan.' },
        { status: 404 }
      );
    }

    // RBAC: Tim_Quran hanya bisa update tahsin siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const santri = (existingTahsin as any).santri;
      if (!santri || santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk catatan tahsin ini.' },
          { status: 403 }
        );
      }
    }

    // Bangun object update — hanya field yang diberikan
    const updateData: Record<string, unknown> = {};
    if (tanggal) updateData.tanggal = tanggal;
    if (metode && VALID_METODE.includes(metode as TahsinMetode)) {
      updateData.metode = metode as TahsinMetode;
    }
    if (buku && typeof buku === 'string' && buku.trim() !== '') {
      updateData.buku = buku.trim();
    }
    if (halaman !== undefined && halaman !== null) {
      updateData.halaman = Number(halaman);
    }
    // catatan boleh dikosongkan (null)
    if (catatan !== undefined) {
      updateData.catatan = typeof catatan === 'string' && catatan.trim() !== ''
        ? catatan.trim()
        : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada perubahan yang diberikan.' },
        { status: 400 }
      );
    }

    // Update tahsin
    const { data, error } = await supabase
      .from('tahsin')
      .update(updateData)
      .eq('id', id.trim())
      .select(
        `id, student_id, teacher_id, tanggal, metode, buku, halaman, catatan, created_at,
         santri ( id, nama ),
         users ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase update tahsin error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui catatan tahsin.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Tahsin berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/tahsin/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
