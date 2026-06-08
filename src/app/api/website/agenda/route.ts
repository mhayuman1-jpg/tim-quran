import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const supabase = createServerClient();

    let query = supabase.from('agenda').select('*').order('tanggal', { ascending: true });
    if (!all) {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('is_published', true).gte('tanggal', today);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { judul, deskripsi, tanggal, waktu_mulai, waktu_selesai, lokasi, is_published } = body;
    if (!judul?.trim()) return NextResponse.json({ message: 'Judul wajib diisi.' }, { status: 400 });
    if (!tanggal) return NextResponse.json({ message: 'Tanggal wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agenda')
      .insert([{
        judul: judul.trim(), deskripsi, tanggal,
        waktu_mulai: waktu_mulai || null, waktu_selesai: waktu_selesai || null,
        lokasi, is_published: is_published ?? true, created_by: session.user.id,
      }])
      .select('*')
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ message: 'Agenda berhasil ditambahkan.', data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('agenda')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ message: 'Agenda berhasil diperbarui.', data }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ message: 'ID wajib diisi.' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('agenda').delete().eq('id', id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ message: 'Agenda berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
