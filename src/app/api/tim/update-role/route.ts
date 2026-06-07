// src/app/api/tim/update-role/route.ts
// PUT: Update role anggota Tim (Kabid only)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['Tim_Quran', 'Sekretaris', 'Bendahara'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, role } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ message: 'ID anggota wajib diisi.' }, { status: 400 });
    }
    if (!role || !ALLOWED_ROLES.includes(role as AllowedRole)) {
      return NextResponse.json(
        { message: `Role tidak valid. Pilih: ${ALLOWED_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Cek user yang akan diupdate
    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ message: 'Anggota tidak ditemukan.' }, { status: 404 });
    }
    if (existing.role === 'Kabid') {
      return NextResponse.json(
        { message: 'Role Kabid tidak dapat diubah.' },
        { status: 403 }
      );
    }

    // Update role — service role key bypass RLS
    const { error: updateErr } = await supabase
      .from('users')
      .update({ role: role })
      .eq('id', id);

    if (updateErr) {
      console.error('[update-role] Supabase error:', JSON.stringify(updateErr));
      // Berikan pesan spesifik jika constraint violation
      const msg = updateErr.message?.includes('violates check constraint')
        ? `Role "${role}" belum didukung di database. Jalankan migrasi SQL terlebih dahulu.`
        : updateErr.message?.includes('invalid input value for enum')
        ? `Nilai role "${role}" tidak valid di database. Pastikan kolom role bertipe TEXT, bukan enum.`
        : `Gagal memperbarui role: ${updateErr.message}`;
      return NextResponse.json({ message: msg, detail: updateErr }, { status: 500 });
    }

    return NextResponse.json(
      { message: `Role ${existing.name} berhasil diubah menjadi ${role}.` },
      { status: 200 }
    );
  } catch (err) {
    console.error('[update-role] Unexpected error:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
