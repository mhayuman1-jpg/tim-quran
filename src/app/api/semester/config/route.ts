// src/app/api/semester/config/route.ts
// GET: Ambil konfigurasi semester aktif
// PUT: Simpan konfigurasi semester baru / update

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('semester_settings')
      .select('id, semester_name, end_date, notes, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase fetch semester config error:', error);
      return NextResponse.json({ message: 'Gagal mengambil konfigurasi semester.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? null }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/semester/config:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.', status: 403 });
    }

    const body = await request.json();
    const { semester_name, end_date, notes } = body;

    if (!semester_name || typeof semester_name !== 'string' || semester_name.trim() === '') {
      return NextResponse.json({ message: 'Nama semester wajib diisi.' }, { status: 400 });
    }
    if (!end_date || typeof end_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return NextResponse.json({ message: 'Tanggal akhir semester harus diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { error: deactivateError } = await supabase
      .from('semester_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);

    if (deactivateError) {
      console.error('Supabase deactivate semester settings error:', deactivateError);
      return NextResponse.json({ message: 'Gagal memperbarui konfigurasi sebelumnya.', error: deactivateError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('semester_settings')
      .insert([{ semester_name: semester_name.trim(), end_date, notes: typeof notes === 'string' ? notes.trim() : null, is_active: true }])
      .select('id, semester_name, end_date, notes, is_active, created_at, updated_at')
      .single();

    if (error) {
      console.error('Supabase insert semester settings error:', error);
      return NextResponse.json({ message: 'Gagal menyimpan konfigurasi semester.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Konfigurasi semester berhasil disimpan.', data }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/semester/config:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
