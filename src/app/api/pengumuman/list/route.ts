export const dynamic = 'force-dynamic';
// src/app/api/pengumuman/list/route.ts
// GET: Ambil semua pengumuman diurutkan terbaru

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Cek autentikasi
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    const supabase = createServerClient();

    // Ambil semua pengumuman dengan join ke users untuk nama pembuat
    const { data, error } = await supabase
      .from('pengumuman')
      .select(`
        id,
        judul,
        isi,
        target,
        created_by,
        created_at,
        updated_at,
        users:created_by ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching pengumuman:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data pengumuman.', error: error.message },
        { status: 500 }
      );
    }

    // Flatten joined user name
    const result = (data ?? []).map((item: Record<string, unknown>) => {
      const usersField = item.users as { name: string } | null;
      return {
        id: item.id,
        judul: item.judul,
        isi: item.isi,
        target: item.target,
        created_by: item.created_by,
        created_by_name: usersField?.name ?? 'Unknown',
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/pengumuman/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
