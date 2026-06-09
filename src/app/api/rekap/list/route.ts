export const dynamic = 'force-dynamic';
// src/app/api/rekap/list/route.ts
// GET: Ambil daftar rekap diurutkan terbaru, dengan presigned URL untuk download

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { storagePresignedUrl } from '@/lib/storage/tigris';

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

    // Kedua role (Kabid dan Tim_Quran) boleh melihat rekap
    const { role } = session.user;
    if (role !== 'Kabid' && role !== 'Tim_Quran') {
      return NextResponse.json(
        { message: 'Akses tidak diizinkan' },
        { status: 403 }
      );
    }

    const supabase = createServerClient();

    // Ambil daftar rekap diurutkan terbaru (by created_at DESC)
    const { data: rekapList, error } = await supabase
      .from('rekap_bulanan')
      .select('id, uploader_id, uploader_name, periode, file_name, file_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching rekap_bulanan:', error);
      return NextResponse.json(
        { message: 'Gagal mengambil data rekap.', error: error.message },
        { status: 500 }
      );
    }

    // Generate presigned URL untuk setiap file (berlaku 3600 detik = 1 jam)
    const rekapWithUrls = await Promise.all(
      (rekapList || []).map(async (rekap) => {
        try {
          const signedUrl = await storagePresignedUrl('timquran-rekap', rekap.file_url, 3600);
          return {
            ...rekap,
            signed_url: signedUrl,
          };
        } catch (err) {
          console.error(`Error creating presigned URL for ${rekap.file_url}:`, err);
          return {
            ...rekap,
            signed_url: null,
          };
        }
      })
    );

    return NextResponse.json({ data: rekapWithUrls }, { status: 200 });
  } catch (error) {
    console.error('Route error /api/rekap/list:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
