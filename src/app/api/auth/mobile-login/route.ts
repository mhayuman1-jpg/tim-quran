// src/app/api/auth/mobile-login/route.ts
// POST: Login untuk mobile app — mengembalikan HMAC JWT token (accessToken)
// Menggunakan auth_user RPC (pgcrypto) seperti website, dengan fallback bcrypt
// Hanya untuk role: Tim_Quran, Kabid (mode mengajar), Sekretaris (mode mengajar)

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['Tim_Quran', 'Kabid', 'Sekretaris'];

function signJWT(payload: Record<string, any>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payloadStr}`).digest('base64url');
  return `${header}.${payloadStr}.${signature}`;
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  if (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
  }
  return {};
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan password wajib diisi.', errorCode: 'VALIDATION_ERROR' },
        { headers: corsHeaders, status: 400 }
      );
    }

    // Buat Supabase client dengan service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[mobile-login] Supabase env vars missing');
      return NextResponse.json(
        { success: false, message: 'Konfigurasi server tidak lengkap.', errorCode: 'SERVER_ERROR' },
        { headers: corsHeaders, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let user: any = null;

    // ── Approach 1: RPC auth_user (sama seperti website) ──
    try {
      const { data, error } = await supabase.rpc('auth_user', {
        p_email: email,
        p_password: password,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        user = data[0];
      }
    } catch {
      // Fallback ke bcrypt
    }

    // ── Approach 2: Query users table + bcrypt ──
    if (!user) {
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('id, email, name, role, status')
        .eq('email', email)
        .limit(1);

      if (queryError || !users || users.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Email atau password salah.', errorCode: 'INVALID_CREDENTIALS' },
          { headers: corsHeaders, status: 401 }
        );
      }

      const dbUser = users[0];

      // Validasi akun nonaktif di bcrypt branch
      if (dbUser.status === 'Nonaktif') {
        return NextResponse.json(
          { success: false, message: 'Akun Anda tidak aktif. Hubungi administrator.', errorCode: 'ACCOUNT_INACTIVE' },
          { headers: corsHeaders, status: 403 }
        );
      }

      // Ambil password_hash secara terpisah
      const { data: hashRows, error: hashError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('email', email)
        .limit(1);

      if (hashError || !hashRows || hashRows.length === 0 || !hashRows[0].password_hash) {
        return NextResponse.json(
          { success: false, message: 'Email atau password salah.', errorCode: 'INVALID_CREDENTIALS' },
          { headers: corsHeaders, status: 401 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, hashRows[0].password_hash);
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, message: 'Email atau password salah.', errorCode: 'INVALID_CREDENTIALS' },
          { headers: corsHeaders, status: 401 }
        );
      }

      user = dbUser;
    }

    // ── Validasi status aktif (untuk RPC branch yang tidak memvalidasi status) ──
    if (!user.status || user.status === 'Nonaktif') {
      return NextResponse.json(
        { success: false, message: 'Akun Anda tidak aktif. Hubungi administrator.', errorCode: 'ACCOUNT_INACTIVE' },
        { headers: corsHeaders, status: 403 }
      );
    }

    // ── Validasi role ──
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Akun Anda tidak memiliki akses ke aplikasi pengajar.', errorCode: 'ROLE_NOT_ALLOWED' },
        { headers: corsHeaders, status: 403 }
      );
    }

    // ── Ambil photo_url ──
    let photoUrl: string | null = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('photo_url')
        .eq('id', user.id)
        .single();
      if (userData?.photo_url) {
        photoUrl = userData.photo_url;
      }
    } catch {
      // photoUrl opsional
    }

    // ── Generate JWT ──
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('[mobile-login] NEXTAUTH_SECRET tidak diatur.');
      return NextResponse.json(
        { success: false, message: 'Konfigurasi server tidak lengkap.', errorCode: 'SERVER_ERROR' },
        { headers: corsHeaders, status: 500 }
      );
    }

    const accessToken = signJWT(
      { id: user.id, email: user.email, role: user.role, name: user.name, photoUrl },
      secret
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Login berhasil',
        data: {
          accessToken,
          expiresIn: 86400,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            photoUrl,
          },
        },
      },
      { headers: corsHeaders, status: 200 }
    );
  } catch (err: any) {
    console.error('[mobile-login] UNEXPECTED ERROR:', err?.message || err);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server.', errorCode: 'SERVER_ERROR' },
      { headers: corsHeaders, status: 500 }
    );
  }
}
