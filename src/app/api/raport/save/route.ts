// src/app/api/raport/save/route.ts
// POST: Simpan raport baru (insert)
// PUT: Update raport yang sudah ada
//
// Logika duplikat:
// - Cek apakah sudah ada raport untuk (student_id, periode)
// - Jika sudah ada â†’ return data existing dengan status 409
// - Jika belum ada â†’ insert baru

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// â”€â”€ Shared select string â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RAPORT_SELECT = `
  id, student_id, teacher_id, periode,
  makhroj, tajwid, lancar, buku_surah, halaman, catatan,
  created_at, updated_at,
  santri ( id, nama, nisn, assigned_teacher_id, classes ( id, name ) ),
  users ( id, name )
`;

// â”€â”€ POST: Insert raport baru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { student_id, periode, makhroj, tajwid, lancar, buku_surah, halaman, catatan } = body;

    // â”€â”€ Validasi field wajib â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!student_id || typeof student_id !== 'string' || student_id.trim() === '') {
      return NextResponse.json({ message: 'student_id wajib diisi.' }, { status: 400 });
    }
    if (!periode || typeof periode !== 'string' || periode.trim() === '') {
      return NextResponse.json({ message: 'Periode wajib diisi.' }, { status: 400 });
    }

    // Validasi nilai 0-100
    for (const [field, value] of [['makhroj', makhroj], ['tajwid', tajwid], ['lancar', lancar]] as [string, unknown][]) {
      if (value !== undefined && value !== null) {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return NextResponse.json(
            { message: `Nilai ${field} harus antara 0 dan 100.` },
            { status: 400 }
          );
        }
      }
    }

    const supabase = createServerClient();

    // â”€â”€ RBAC: Tim_Quran hanya bisa simpan raport untuk siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('id, assigned_teacher_id')
        .eq('id', student_id.trim())
        .single();

      if (santriError || !santri) {
        return NextResponse.json({ message: 'Siswa tidak ditemukan.' }, { status: 404 });
      }

      if (santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk siswa ini.' },
          { status: 403 }
        );
      }
    }

    // â”€â”€ Cek duplikat (student_id, periode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const { data: existing, error: checkError } = await supabase
      .from('raport_quran')
      .select(RAPORT_SELECT)
      .eq('student_id', student_id.trim())
      .eq('periode', periode.trim())
      .maybeSingle();

    if (checkError) {
      console.error('Supabase check duplicate raport error:', checkError);
      return NextResponse.json(
        { message: 'Gagal memeriksa duplikat raport.', error: checkError.message },
        { status: 500 }
      );
    }

    // Jika sudah ada â†’ return 409 dengan data existing
    if (existing) {
      return NextResponse.json(
        {
          message: 'Raport untuk siswa dan periode ini sudah ada.',
          data: existing,
          duplicate: true,
        },
        { status: 409 }
      );
    }

    // â”€â”€ Insert raport baru â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const insertData: Record<string, unknown> = {
      student_id: student_id.trim(),
      teacher_id: session.user.id,
      periode: periode.trim(),
    };

    if (makhroj !== undefined && makhroj !== null) insertData.makhroj = Number(makhroj);
    if (tajwid !== undefined && tajwid !== null) insertData.tajwid = Number(tajwid);
    if (lancar !== undefined && lancar !== null) insertData.lancar = Number(lancar);
    if (buku_surah && typeof buku_surah === 'string' && buku_surah.trim()) {
      insertData.buku_surah = buku_surah.trim();
    }
    if (halaman !== undefined && halaman !== null) {
      const halamanNum = Number(halaman);
      if (!isNaN(halamanNum) && halamanNum > 0) insertData.halaman = halamanNum;
    }
    if (catatan && typeof catatan === 'string' && catatan.trim()) {
      insertData.catatan = catatan.trim();
    }

    const { data, error } = await supabase
      .from('raport_quran')
      .insert([insertData])
      .select(RAPORT_SELECT)
      .single();

    if (error) {
      // Tangani unique violation (race condition)
      if (error.code === '23505') {
        // Ambil data existing setelah race condition
        const { data: raceExisting } = await supabase
          .from('raport_quran')
          .select(RAPORT_SELECT)
          .eq('student_id', student_id.trim())
          .eq('periode', periode.trim())
          .maybeSingle();

        return NextResponse.json(
          {
            message: 'Raport untuk siswa dan periode ini sudah ada.',
            data: raceExisting,
            duplicate: true,
          },
          { status: 409 }
        );
      }

      console.error('Supabase insert raport error:', error);
      return NextResponse.json(
        { message: 'Gagal menyimpan raport.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Raport berhasil disimpan.', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Route error /api/raport/save POST:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// â”€â”€ PUT: Update raport (by id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, makhroj, tajwid, lancar, buku_surah, halaman, catatan } = body;

    if (!id || typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json({ message: 'id raport wajib diisi.' }, { status: 400 });
    }

    // Validasi nilai 0-100
    for (const [field, value] of [['makhroj', makhroj], ['tajwid', tajwid], ['lancar', lancar]] as [string, unknown][]) {
      if (value !== undefined && value !== null) {
        const num = Number(value);
        if (isNaN(num) || num < 0 || num > 100) {
          return NextResponse.json(
            { message: `Nilai ${field} harus antara 0 dan 100.` },
            { status: 400 }
          );
        }
      }
    }

    const supabase = createServerClient();

    // Cek raport ada dan RBAC
    const { data: existing, error: fetchError } = await supabase
      .from('raport_quran')
      .select('id, student_id, teacher_id, santri ( assigned_teacher_id )')
      .eq('id', id.trim())
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });
    }

    // Tim_Quran hanya bisa edit raport siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const assignedTeacherId = (existing.santri as any)?.assigned_teacher_id;
      if (assignedTeacherId !== session.user.id) {
        return NextResponse.json(
          { message: 'Anda tidak memiliki akses untuk raport ini.' },
          { status: 403 }
        );
      }
    }

    // Bangun update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (makhroj !== undefined && makhroj !== null) updateData.makhroj = Number(makhroj);
    if (tajwid !== undefined && tajwid !== null) updateData.tajwid = Number(tajwid);
    if (lancar !== undefined && lancar !== null) updateData.lancar = Number(lancar);
    if (buku_surah !== undefined) {
      updateData.buku_surah = buku_surah && typeof buku_surah === 'string' ? buku_surah.trim() || null : null;
    }
    if (halaman !== undefined) {
      const halamanNum = Number(halaman);
      updateData.halaman = !isNaN(halamanNum) && halamanNum > 0 ? halamanNum : null;
    }
    if (catatan !== undefined) {
      updateData.catatan = catatan && typeof catatan === 'string' ? catatan.trim() || null : null;
    }

    const { data, error } = await supabase
      .from('raport_quran')
      .update(updateData)
      .eq('id', id.trim())
      .select(RAPORT_SELECT)
      .single();

    if (error) {
      console.error('Supabase update raport error:', error);
      return NextResponse.json(
        { message: 'Gagal memperbarui raport.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Raport berhasil diperbarui.', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Route error /api/raport/save PUT:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
