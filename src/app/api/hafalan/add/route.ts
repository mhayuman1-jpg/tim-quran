// src/app/api/hafalan/add/route.ts
// POST: Simpan catatan hafalan baru
// - teacher_id otomatis dari session
// - Validasi field wajib: student_id, tanggal, surah_juz, halaman
// - Tim_Quran hanya bisa tambah hafalan untuk siswa yang menjadi tanggung jawabnya

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';
import { requireActiveSemester } from '@/lib/semester';
import { requireNoHoliday } from '@/lib/holiday';
import { SURAH_PER_JUZ } from '@/lib/surahData';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verifikasi sesi
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const { student_id, tanggal, surah_juz, halaman, catatan, makhroj, tajwid, lancar, buku } = body;

    // Validasi field wajib
    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      return NextResponse.json(
        { message: 'student_id wajib diisi.' },
        { status: 400 }
      );
    }
    if (!tanggal || typeof tanggal !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      return NextResponse.json(
        { message: 'Tanggal wajib diisi dalam format YYYY-MM-DD.' },
        { status: 400 }
      );
    }
    if (!surah_juz || typeof surah_juz !== 'string' || surah_juz.trim() === '') {
      return NextResponse.json(
        { message: 'Surah/Juz wajib diisi.' },
        { status: 400 }
      );
    }
    // halaman bersifat opsional (bisa diisi nanti saat edit)

    const supabase = createServerClient();
    const teacherId = session.user.id;

    // Cek semester aktif
    const semesterCheck = await requireActiveSemester(supabase);
    if (semesterCheck.error) return semesterCheck.error;

    // Cek hari libur — tolak input jika tanggal libur
    const holidayCheck = await requireNoHoliday(supabase, tanggal);
    if (holidayCheck.error) return holidayCheck.error;

    if (!teacherId) {
      return NextResponse.json(
        { message: 'Akun guru tidak valid, silakan login ulang.' },
        { status: 401 }
      );
    }

    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, role, status')
      .eq('id', teacherId)
      .single();

    if (teacherError || !teacher) {
      console.error('[hafalan/add] Teacher lookup failed:', teacherError);
      return NextResponse.json(
        { message: 'Akun guru tidak ditemukan di database.' },
        { status: 500 }
      );
    }

    // RBAC: Tim_Quran hanya bisa tambah hafalan untuk siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('id', student_id.trim())
        .single();

      if (santriError || !santri) {
        return NextResponse.json(
          { message: 'Siswa tidak ditemukan.' },
          { status: 404 }
        );
      }

      if (santri.assigned_teacher_id !== teacherId) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk siswa ini.' },
          { status: 403 }
        );
      }
    }

    // ── Hitung sort_order berdasarkan urutan template ──
    // Iterasi Juz 30→1 agar template Juz 30 (lengkap) override Juz 25-27
    const SURAH_POSITION: Record<string, number> = {};
    for (let j = 30; j >= 1; j--) {
      const surahsInJuz = SURAH_PER_JUZ[j] ?? [];
      for (let idx = 0; idx < surahsInJuz.length; idx++) {
        const key = surahsInJuz[idx].nama.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!(key in SURAH_POSITION)) {
          SURAH_POSITION[key] = j * 1000 + idx;
        }
      }
    }
    const surahKey = surah_juz.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const sortPosition = SURAH_POSITION[surahKey] ?? 999999;

    const insertData: Record<string, unknown> = {
      student_id: student_id.trim(),
      teacher_id: teacherId,
      tanggal,
      surah_juz: surah_juz.trim(),
      halaman: halaman && typeof halaman === 'string' ? halaman.trim() : null,
      sort_order: sortPosition,
    };

    if (catatan && typeof catatan === 'string' && catatan.trim() !== '') {
      insertData.catatan = catatan.trim();
    }
    if (makhroj && typeof makhroj === 'string') {
      insertData.makhroj = makhroj.trim();
    }
    if (tajwid && typeof tajwid === 'string') {
      insertData.tajwid = tajwid.trim();
    }
    if (lancar && typeof lancar === 'string') {
      insertData.lancar = lancar.trim();
    }
    if (buku && typeof buku === 'string' && buku.trim() !== '') {
      insertData.buku = buku.trim();
    }

    const { data, error } = await supabase
      .from('hafalan')
      .insert([insertData])
      .select(
        `id, student_id, teacher_id, tanggal, surah_juz, halaman, catatan, created_at,
         santri ( id, nama ),
         users!hafalan_teacher_id_fkey ( id, name )`
      )
      .single();

    if (error) {
      console.error('Supabase insert hafalan error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan catatan hafalan.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Hafalan berhasil disimpan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/hafalan/add:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
