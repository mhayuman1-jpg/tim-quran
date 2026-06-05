// src/app/api/raport/[id]/route.ts
// GET: Ambil detail raport by id
// PUT: Update raport by id

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

// ── Shared select string ─────────────────────────────────────────────────────
const RAPORT_SELECT = `
  id, student_id, teacher_id, periode,
  makhroj, tajwid, lancar, buku_surah, halaman, catatan,
  created_at, updated_at,
  santri ( id, nama, nisn, assigned_teacher_id, classes ( id, name ) ),
  users ( id, name )
`;

// ── GET: Detail raport by id ─────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;

    if (!id || id.trim() === '') {
      return NextResponse.json({ message: 'ID raport tidak valid.' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('raport_quran')
      .select(RAPORT_SELECT)
      .eq('id', id.trim())
      .single();

    if (error || !data) {
      return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });
    }

    // RBAC: Tim_Quran hanya bisa lihat raport siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const assignedTeacherId = (data.santri as any)?.assigned_teacher_id;
      if (assignedTeacherId !== session.user.id) {
        return NextResponse.json(
          { message: 'Akses tidak diizinkan.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/raport/[id] GET:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

// ── PUT: Update raport by id ─────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  try {
    const { id } = params;

    if (!id || id.trim() === '') {
      return NextResponse.json({ message: 'ID raport tidak valid.' }, { status: 400 });
    }

    const body = await request.json();
    const { makhroj, tajwid, lancar, buku_surah, halaman, catatan } = body;

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

    // Cek raport ada
    const { data: existing, error: fetchError } = await supabase
      .from('raport_quran')
      .select('id, student_id, santri ( assigned_teacher_id )')
      .eq('id', id.trim())
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });
    }

    // RBAC: Tim_Quran hanya bisa edit raport siswa tanggung jawabnya
    if (session.user.role === 'Tim_Quran') {
      const assignedTeacherId = (existing.santri as any)?.assigned_teacher_id;
      if (assignedTeacherId !== session.user.id) {
        return NextResponse.json(
          { message: 'Akses tidak diizinkan.' },
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
    console.error('Route error /api/raport/[id] PUT:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
