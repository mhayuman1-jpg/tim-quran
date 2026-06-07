// src/app/api/hafalan/update/route.ts
// PUT: Update catatan hafalan berdasarkan id
// - Bisa update: tanggal, surah_juz, halaman, catatan
// - Jika surah_juz berubah DAN update_juz_terakhir=true, update juz_terakhir di tabel santri
// - Tim_Quran hanya bisa update hafalan milik siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
    const { id, tanggal, surah_juz, halaman, catatan, makhroj, tajwid, lancar, buku, update_juz_terakhir, juz_baru } = body;

    // Validasi field id
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { message: 'ID hafalan wajib diisi.' },
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

    // Ambil data hafalan yang ada untuk validasi akses
    const { data: existingHafalan, error: fetchError } = await supabase
      .from('hafalan')
      .select('id, student_id, teacher_id, surah_juz, santri ( id, assigned_teacher_id )')
      .eq('id', id.trim())
      .single();

    if (fetchError || !existingHafalan) {
      return NextResponse.json(
        { message: 'Catatan hafalan tidak ditemukan.' },
        { status: 404 }
      );
    }

    // RBAC: Tim_Quran hanya bisa update hafalan siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const santri = (existingHafalan as any).santri;
      if (!santri || santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk catatan hafalan ini.' },
          { status: 403 }
        );
      }
    }

    // Bangun object update â€” hanya field yang diberikan
    const updateData: Record<string, unknown> = {};
    if (tanggal) updateData.tanggal = tanggal;
    if (surah_juz && typeof surah_juz === 'string' && surah_juz.trim() !== '') {
      updateData.surah_juz = surah_juz.trim();
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
    if (makhroj !== undefined) {
      updateData.makhroj = typeof makhroj === 'string' && makhroj.trim() !== ''
        ? makhroj.trim()
        : null;
    }
    if (tajwid !== undefined) {
      updateData.tajwid = typeof tajwid === 'string' && tajwid.trim() !== ''
        ? tajwid.trim()
        : null;
    }
    if (lancar !== undefined) {
      updateData.lancar = typeof lancar === 'string' && lancar.trim() !== ''
        ? lancar.trim()
        : null;
    }
    if (buku !== undefined) {
      updateData.buku = typeof buku === 'string' && buku.trim() !== ''
        ? buku.trim()
        : null;
    }

    const shouldUpdateHafalan = Object.keys(updateData).length > 0;

    let data: any = null;
    let error: any = null;

    if (shouldUpdateHafalan) {
      const result = await supabase
        .from('hafalan')
        .update(updateData)
        .eq('id', id.trim())
        .select(
          `id, student_id, teacher_id, tanggal, surah_juz, halaman, catatan, created_at,
           santri ( id, nama ),
           users ( id, name )`
        )
        .single();
      data = result.data;
      error = result.error;

      if (error) {
        console.error('Supabase update hafalan error:', error);
        return NextResponse.json(
          { message: 'Gagal memperbarui catatan hafalan.', error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Jika tidak ada perubahan pada catatan hafalan, pastikan setidaknya ada perubahan pada juz terakhir
      if (!update_juz_terakhir) {
        return NextResponse.json(
          { message: 'Tidak ada perubahan yang diberikan.' },
          { status: 400 }
        );
      }

      // Ambil data hafalan untuk response format ketika hanya update juz terakhir
      data = existingHafalan;
    }

    if (error) {
      console.error('Supabase update hafalan error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui catatan hafalan.', error: error.message },
        { status: 500 }
      );
    }

    // Jika diminta update juz_terakhir di tabel santri
    if (update_juz_terakhir === true && juz_baru !== undefined && juz_baru !== null) {
      const juzNum = Number(juz_baru);
      if (!isNaN(juzNum) && juzNum >= 1 && juzNum <= 30) {
        const { error: santriUpdateError } = await supabase
          .from('santri')
          .update({ juz_terakhir: juzNum, updated_at: new Date().toISOString() })
          .eq('id', (existingHafalan as any).student_id);

        if (santriUpdateError) {
          console.error('Supabase update santri juz_terakhir error:', santriUpdateError);
          // Tidak gagalkan seluruh request, hafalan sudah berhasil diupdate
          return NextResponse.json({
            message: 'Hafalan berhasil diperbarui, namun gagal memperbarui juz terakhir siswa.',
            data,
            juz_update_failed: true,
          }, { status: 200 });
        }
      }
    }

    return NextResponse.json(
      { message: 'Hafalan berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/hafalan/update:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
