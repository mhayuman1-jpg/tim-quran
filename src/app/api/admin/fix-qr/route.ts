// src/app/api/admin/fix-qr/route.ts
// POST: Update qr_code siswa berdasarkan mapping dari PDF upload

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface QrMapping {
  nama: string;
  nisn?: string;
  newQrCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Kabid') {
      return NextResponse.json({ message: 'Hanya Kabid yang dapat mengakses.' }, { status: 403 });
    }

    const body = await request.json();
    const { mappings } = body as { mappings: QrMapping[] };

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json({ message: 'Tidak ada data mapping.' }, { status: 400 });
    }

    const supabase = createServerClient();
    let updated = 0;
    let failed = 0;
    const results: { nama: string; status: string; message: string }[] = [];

    for (const m of mappings) {
      if (!m.nama || !m.newQrCode) {
        results.push({ nama: m.nama || '?', status: 'skip', message: 'Data tidak lengkap' });
        failed++;
        continue;
      }

      // Cari siswa berdasarkan nama
      const { data: siswa, error: fetchErr } = await supabase
        .from('santri')
        .select('id, nama, qr_code')
        .eq('nama', m.nama)
        .limit(1);

      if (fetchErr || !siswa || siswa.length === 0) {
        results.push({ nama: m.nama, status: 'skip', message: 'Siswa tidak ditemukan' });
        failed++;
        continue;
      }

      const target = siswa[0];

      // Sudah cocok?
      if (target.qr_code.toUpperCase() === m.newQrCode.toUpperCase()) {
        results.push({ nama: m.nama, status: 'ok', message: 'Sudah cocok' });
        updated++;
        continue;
      }

      // Update qr_code
      const { error: updateErr } = await supabase
        .from('santri')
        .update({ qr_code: m.newQrCode.toUpperCase() })
        .eq('id', target.id);

      if (updateErr) {
        results.push({ nama: m.nama, status: 'error', message: updateErr.message });
        failed++;
      } else {
        results.push({ nama: m.nama, status: 'updated', message: `${target.qr_code.slice(0, 8)} → ${m.newQrCode.slice(0, 8)}` });
        updated++;
      }
    }

    return NextResponse.json({
      message: `Selesai: ${updated} berhasil, ${failed} gagal`,
      results,
      updated,
      failed,
    });
  } catch (error) {
    console.error('Fix QR error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
