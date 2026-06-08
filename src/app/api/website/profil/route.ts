// src/app/api/website/profil/route.ts
// GET: Ambil profil website (publik, no auth)
// PUT: Update profil (Kabid only) — partial update

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('profil_website')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[profil GET] error:', error.code, error.message);
      return NextResponse.json({ message: 'Gagal mengambil profil.', error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? null }, { status: 200 });
  } catch (err) {
    console.error('[profil GET] unexpected:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Sesi tidak valid.' }, { status: 401 });
  }
  if (session.user.role !== 'Kabid') {
    return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Bersihkan field system
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, created_at: _ca, ...updateFields } = body as Record<string, unknown>;

    const payload = {
      ...updateFields,
      updated_at: new Date().toISOString(),
    };

    const supabase = createServerClient();

    // Ambil ID profil yang ada menggunakan service role (bypass RLS)
    const { data: rows, error: fetchErr } = await supabase
      .from('profil_website')
      .select('id')
      .limit(1);

    if (fetchErr) {
      console.error('[profil PUT] fetch rows error:', fetchErr.code, fetchErr.message);
      return NextResponse.json({ message: `Gagal membaca profil: ${fetchErr.message}` }, { status: 500 });
    }

    const existingId = rows?.[0]?.id ?? null;

    if (existingId) {
      // UPDATE menggunakan id yang ditemukan
      const { data: updated, error: updateErr } = await supabase
        .from('profil_website')
        .update(payload)
        .eq('id', existingId)
        .select('id, logo_url, logo_sekolah_url, nama_sekolah, nama_lembaga, updated_at')
        .single();

      if (updateErr) {
        console.error('[profil PUT] update error:', updateErr.code, updateErr.message, updateErr.details);
        return NextResponse.json({
          message: `Gagal update: ${updateErr.message}`,
          code: updateErr.code,
        }, { status: 500 });
      }

      console.log('[profil PUT] updated successfully:', updated?.id, 'logo_url:', updated?.logo_url?.slice(0, 50));
      try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
      return NextResponse.json({ message: 'Profil berhasil diperbarui.', data: updated }, { status: 200 });

    } else {
      // INSERT baru
      const { data: inserted, error: insertErr } = await supabase
        .from('profil_website')
        .insert([{ nama_lembaga: "Tim Qur'an", ...payload }])
        .select('*')
        .single();

      if (insertErr) {
        console.error('[profil PUT] insert error:', insertErr.code, insertErr.message);
        return NextResponse.json({ message: `Gagal insert: ${insertErr.message}` }, { status: 500 });
      }

      try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
      return NextResponse.json({ message: 'Profil berhasil dibuat.', data: inserted }, { status: 200 });
    }

  } catch (err) {
    console.error('[profil PUT] unexpected:', err);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
