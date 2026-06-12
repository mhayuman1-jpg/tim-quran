// src/app/api/tahsin/update/route.ts
// PUT: Update catatan tahsin berdasarkan id
// - Bisa update: tanggal, metode, buku, halaman, catatan
// - Tim_Quran hanya bisa update tahsin milik siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import type { TahsinMetode } from '@/types';

export const dynamic = 'force-dynamic';

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
    const { id, tanggal, metode, buku, halaman, catatan, makhroj, kelancaran, adab } = body;

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

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    // Ambil data tahsin yang ada untuk validasi akses
    const { data: existingTahsin, error: fetchError } = await supabase
      .from('tahsin')
      .select('id, student_id, teacher_id, edited_fields, santri ( id, assigned_teacher_id )')
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

    // Bangun object update - hanya field yang diberikan
    const updateData: Record<string, unknown> = {};
    const now = new Date().toISOString();
    const existingEdited = ((existingTahsin as any).edited_fields || {}) as Record<string, string>;
    const editedFields: Record<string, string> = { ...existingEdited };

    if (tanggal) { updateData.tanggal = tanggal; editedFields.tanggal = now; }
    if (metode && VALID_METODE.includes(metode as TahsinMetode)) {
      updateData.metode = metode as TahsinMetode;
      editedFields.metode = now;
    }
    if (buku && typeof buku === 'string' && buku.trim() !== '') {
      updateData.buku = buku.trim();
      editedFields.buku = now;
    }
    if (halaman !== undefined && halaman !== null) {
      updateData.halaman = Number(halaman);
      editedFields.halaman = now;
    }

    // catatan boleh dikosongkan (null)
    if (catatan !== undefined) {
      updateData.catatan = typeof catatan === 'string' && catatan.trim() !== ''
        ? catatan.trim()
        : null;
      editedFields.catatan = now;
    }
    if (makhroj !== undefined) {
      updateData.makhroj = typeof makhroj === 'string' && makhroj.trim() !== ''
        ? makhroj.trim()
        : null;
      editedFields.makhroj = now;
    }
    if (kelancaran !== undefined) {
      updateData.kelancaran = typeof kelancaran === 'string' && kelancaran.trim() !== ''
        ? kelancaran.trim()
        : null;
      editedFields.kelancaran = now;
    }
    if (adab !== undefined) {
      updateData.adab = typeof adab === 'string' && adab.trim() !== ''
        ? adab.trim()
        : null;
      editedFields.adab = now;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'Tidak ada perubahan yang diberikan.' },
        { status: 400 }
      );
    }

    updateData.edited_fields = editedFields;

    // Update tahsin
    const { data, error } = await supabase
      .from('tahsin')
      .update(updateData)
      .eq('id', id.trim())
      .select(
        `id, student_id, teacher_id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan, created_at, edited_fields,
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
