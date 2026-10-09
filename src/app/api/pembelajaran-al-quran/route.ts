// src/app/api/pembelajaran-al-quran/route.ts
// GET: Ambil daftar Jilid beserta video pembelajaran di dalamnya
// (public - untuk Wali Murid)

import { createSupabaseServerClient, executeSupabaseQuery } from '@/lib/supabase/server-client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await executeSupabaseQuery(
      () => supabase
        .from('jilid_pembelajaran')
        .select(`
          id, nama, deskripsi, urutan, is_active,
          pembelajaran_al_quran ( id, judul, deskripsi, youtube_url, urutan, is_active )
        `)
        .eq('is_active', true)
        .order('urutan', { ascending: true }) as any,
      3,
      1000
    );

    if (error) {
      console.error('[GET /api/pembelajaran-al-quran] Query error:', error);
      throw error;
    }

    // Hanya tampilkan video yang aktif, urutkan per urutan
    const rows: any[] = Array.isArray(data) ? data : [];
    const result = rows.map((jilid: any) => {
      const videos = (jilid.pembelajaran_al_quran || [])
        .filter((v: any) => v.is_active)
        .sort((a: any, b: any) => (a.urutan ?? 0) - (b.urutan ?? 0));
      return {
        id: jilid.id,
        nama: jilid.nama,
        deskripsi: jilid.deskripsi,
        urutan: jilid.urutan,
        is_active: jilid.is_active,
        pembelajaran_al_quran: videos,
      };
    });

    return NextResponse.json({
      data: result,
      error: null,
    });
  } catch (err: any) {
    console.error('[GET /api/pembelajaran-al-quran] Error:', err?.message);

    return NextResponse.json(
      {
        data: null,
        error: err?.message ?? "Failed to fetch pembelajaran AL Qur'an",
      },
      { status: 500 }
    );
  }
}
