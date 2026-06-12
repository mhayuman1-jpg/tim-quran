// src/app/api/tahfidz/update/route.ts
// PUT: Update catatan tahfidz berdasarkan id
// - Tim_Quran hanya bisa update data siswa tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import type { NilaiTahfidz } from '@/lib/surahData';

export const dynamic = 'force-dynamic';
const VALID_NILAI: NilaiTahfidz[] = ['✓', 'A', 'B', 'C', 'D', 'L', 'KL', 'TL'];

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan } = body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ message: 'ID tahfidz wajib diisi.' }, { status: 400 });
    }
    if (tanggal !== undefined && tanggal !== null && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json({ message: 'Format tanggal harus YYYY-MM-DD.' }, { status: 400 });
    }
    if (surah_juz !== undefined && typeof surah_juz === 'string' && surah_juz.trim() === '') {
      return NextResponse.json({ message: 'Surah / Juz tidak boleh kosong.' }, { status: 400 });
    }
    if (makhroj !== undefined && makhroj !== null && !VALID_NILAI.includes(makhroj)) {
      return NextResponse.json({ message: 'Penilaian makhroj tidak valid.' }, { status: 400 });
    }
    if (tajwid !== undefined && tajwid !== null && !VALID_NILAI.includes(tajwid)) {
      return NextResponse.json({ message: 'Penilaian tajwid tidak valid.' }, { status: 400 });
    }
    if (lancar !== undefined && lancar !== null && !VALID_NILAI.includes(lancar)) {
      return NextResponse.json({ message: 'Penilaian kelancaran tidak valid.' }, { status: 400 });
    }
    if (halaman !== undefined && halaman !== null) {
      const halamanNum = Number(halaman);
      if (isNaN(halamanNum) || halamanNum < 1) {
        return NextResponse.json({ message: 'Halaman harus berupa angka positif.' }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    const { data: existing, error: fetchError } = await supabase
      .from('tahfidz')
      .select('id, student_id, teacher_id, santri ( id, assigned_teacher_id )')
      .eq('id', id.trim())
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ message: 'Catatan tahfidz tidak ditemukan.' }, { status: 404 });
    }

    if (session.user.role === 'Tim_Quran') {
      const santri = (existing as any).santri;
      if (!santri || santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Anda tidak memiliki akses untuk data ini.' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (tanggal) updateData.tanggal = tanggal;
    if (surah_juz) updateData.surah_juz = surah_juz.trim();
    if (halaman !== undefined && halaman !== null) updateData.halaman = Number(halaman);
    if (makhroj !== undefined && makhroj !== null) updateData.makhroj = makhroj;
    if (tajwid !== undefined && tajwid !== null) updateData.tajwid = tajwid;
    if (lancar !== undefined && lancar !== null) updateData.lancar = lancar;
    if (catatan !== undefined) {
      updateData.catatan = typeof catatan === 'string' && catatan.trim() !== '' ? catatan.trim() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'Tidak ada perubahan yang diberikan.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tahfidz')
      .update(updateData)
      .eq('id', id.trim())
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan, created_at,
         santri ( id, nama ),
         users ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase update tahfidz error:', error);
      return NextResponse.json({ message: 'Gagal memperbarui catatan tahfidz.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tahfidz berhasil diperbarui.', data }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/tahfidz/update:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
