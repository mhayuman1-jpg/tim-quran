// src/app/api/wali/progres/route.ts
// GET: Ambil data progres siswa untuk wali murid (berdasarkan santri_id dari session)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || session.user.role !== 'Wali_Murid') {
    return NextResponse.json(
      { message: 'Akses ditolak. Silakan login sebagai Wali Murid.' },
      { status: 401 }
    );
  }

  const santriId = session.user.santri_id;
  if (!santriId) {
    return NextResponse.json(
      { message: 'Data santri tidak ditemukan pada akun ini.' },
      { status: 404 }
    );
  }

  try {
    const supabase = createServerClient();

    // Ambil data santri
    const { data: santri, error: santriErr } = await supabase
      .from('santri')
      .select('id, nisn, nama, gender, tanggal_lahir, status, classes ( id, name )')
      .eq('id', santriId)
      .single();

    if (santriErr || !santri) {
      return NextResponse.json(
        { message: 'Data santri tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Ambil riwayat hafalan (10 terbaru yang sudah dinilai)
    const { data: hafalanRaw } = await supabase
      .from('hafalan')
      .select('id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, catatan')
      .eq('student_id', santriId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    // Filter: hanya tampilkan yang sudah ada penilaian
    const hafalan = (hafalanRaw ?? []).filter((h) =>
      h.lancar || h.makhroj || h.tajwid
    ).slice(0, 10);

    // Ambil riwayat tahsin (10 terbaru yang sudah dinilai)
    const { data: tahsinRaw } = await supabase
      .from('tahsin')
      .select('id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan')
      .eq('student_id', santriId)
      .order('created_at', { ascending: false });

    // Filter: hanya tampilkan yang sudah ada penilaian
    const tahsin = (tahsinRaw ?? []).filter((t) =>
      t.makhroj || t.kelancaran || t.adab
    ).slice(0, 10);

    // Ambil raport quran
    const { data: raport } = await supabase
      .from('raport_quran')
      .select('id, periode, makhroj, tajwid, lancar, catatan')
      .eq('student_id', santriId)
      .order('created_at', { ascending: false });

    // Ambil ringkasan absensi (bulan berjalan)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const { data: absensi } = await supabase
      .from('attendances')
      .select('status')
      .eq('student_id', santriId)
      .gte('date', firstDay);

    // Hitung ringkasan
    const ringkasan = {
      total_hafalan: hafalan.length,
      total_tahsin: tahsin.length,
      total_absensi: absensi?.length ?? 0,
      absensi_hadir: absensi?.filter(a => a.status === 'Hadir').length ?? 0,
    };

    return NextResponse.json({
      santri,
      hafalan: hafalan ?? [],
      tahsin: tahsin ?? [],
      raport: raport ?? [],
      ringkasan,
    });
  } catch (error) {
    console.error('Route error /api/wali/progres:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
