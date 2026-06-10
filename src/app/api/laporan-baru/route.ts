// src/app/api/laporan-baru/route.ts
// GET  : List laporan (Tim_Quran lihat milik sendiri, Kabid/Sekretaris lihat semua)
// POST : Buat laporan baru (Tim_Quran only)
// PUT  : Update status laporan (Kabid/Sekretaris: review, Tim_Quran: edit draft)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  const supabase = createServerClient();

  try {
    // Fetch single report
    if (id) {
      const { data, error } = await supabase
        .from('reports')
        .select('*, users!reports_teacher_id_fkey(name), users!reports_reviewed_by_fkey(name)')
        .eq('id', id)
        .single();

      if (error || !data) {
        return NextResponse.json({ message: 'Laporan tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({ data }, { status: 200 });
    }

    // List reports
    let query = supabase
      .from('reports')
      .select('id, periode, tahun_ajaran, judul, ringkasan, status, created_at, updated_at, reviewed_at, review_note, users!reports_teacher_id_fkey(name), users!reports_reviewed_by_fkey(name)')
      .order('created_at', { ascending: false });

    // Tim_Quran hanya lihat laporan sendiri
    if (session.user.role === 'Tim_Quran') {
      query = query.eq('teacher_id', session.user.id);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: 'Gagal mengambil data.', error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (err) {
    console.error('[laporan-baru GET]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Tim_Quran') {
    return NextResponse.json({ message: 'Hanya Tim Qur\'an yang bisa membuat laporan.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { periode, tahun_ajaran, judul, ringkasan, detail_json, status } = body;

    if (!periode?.trim()) return NextResponse.json({ message: 'Periode wajib diisi.' }, { status: 400 });
    if (!tahun_ajaran?.trim()) return NextResponse.json({ message: 'Tahun ajaran wajib diisi.' }, { status: 400 });
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul laporan wajib diisi.' }, { status: 400 });

    const reportStatus = status === 'sent' ? 'sent' : 'draft';
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('reports')
      .insert([{
        teacher_id: session.user.id,
        periode: periode.trim(),
        tahun_ajaran: tahun_ajaran.trim(),
        judul: judul.trim(),
        ringkasan: ringkasan?.trim() || null,
        detail_json: detail_json || null,
        status: reportStatus,
      }])
      .select('id')
      .single();

    if (error) {
      console.error('Report insert error:', error);
      return NextResponse.json({ message: 'Gagal menyimpan laporan.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Laporan berhasil disimpan.', data: { id: data.id } }, { status: 201 });
  } catch (err) {
    console.error('[laporan-baru POST]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, status, review_note } = body;

    if (!id) return NextResponse.json({ message: 'id wajib.' }, { status: 400 });

    const supabase = createServerClient();
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Tim_Quran: edit draft sendiri
    if (session.user.role === 'Tim_Quran') {
      const { data: existing } = await supabase
        .from('reports').select('teacher_id, status').eq('id', id).single();
      if (!existing || existing.teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
      }
      if (status) updateData.status = status;
    }

    // Kabid/Sekretaris: review laporan
    if (session.user.role === 'Kabid' || session.user.role === 'Sekretaris') {
      if (status) updateData.status = status;
      if (review_note !== undefined) updateData.review_note = review_note?.trim() || null;
      if (status === 'reviewed') {
        updateData.reviewed_by = session.user.id;
        updateData.reviewed_at = new Date().toISOString();
      }
    }

    const { error } = await supabase.from('reports').update(updateData).eq('id', id);
    if (error) return NextResponse.json({ message: 'Gagal update.', error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Berhasil diperbarui.' }, { status: 200 });
  } catch (err) {
    console.error('[laporan-baru PUT]', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
