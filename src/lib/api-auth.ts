import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import crypto from 'crypto';

export interface ApiSession {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
    photoUrl?: string;
    santri_id?: string;
    wali_nis?: string;
  };
}

/**
 * Verifikasi Bearer HMAC JWT token (sama seperti yang dihasilkan mobile-login).
 * TIDAK memanggil getServerSession — hanya memverifikasi token manual.
 */
export function verifyMobileToken(token: string): ApiSession | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    
    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson);

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 !== expectedSignature) {
      return null;
    }

    return {
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        photoUrl: payload.photoUrl,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Coba dapatkan session dari cookie NextAuth LALU dari Bearer token.
 * Mengembalikan null jika keduanya gagal (TIDAK throw error).
 * Cocok untuk kasus di mana auth opsional.
 */
export async function getApiSession(request: NextRequest): Promise<ApiSession | null> {
  // Coba cookie NextAuth dulu (website)
  try {
    const session = await getServerSession(authOptions);
    const u = session?.user as any;
    if (u?.id) {
      return {
        user: {
          id: u.id as string,
          email: u.email as string,
          name: u.name as string | undefined,
          role: u.role as string | undefined,
          santri_id: u.santri_id as string | undefined,
          wali_nis: u.wali_nis as string | undefined,
        },
      };
    }
  } catch {
    // Ignore NextAuth errors
  }

  // Fallback: Bearer token (Flutter mobile)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return verifyMobileToken(token);
  }

  return null;
}

/**
 * Mendapatkan session terotentikasi — mengembalikan session atau NextResponse error.
 * Gunakan di semua endpoint yang memerlukan autentikasi.
 * Mendukung: NextAuth cookies (website) DAN Bearer HMAC JWT (Flutter mobile).
 *
 * @example
 * const session = await getAuthenticatedSession(request);
 * if (session instanceof NextResponse) return session; // return error langsung
 * // session.user.id, session.user.role, dll tersedia
 */
export async function getAuthenticatedSession(
  request: NextRequest
): Promise<ApiSession | NextResponse> {
  // 1. Coba NextAuth cookie session (website)
  try {
    const session = await getServerSession(authOptions);
    const u = session?.user as any;
      if (u?.id) {
        return {
          user: {
            id: u.id as string,
            email: u.email as string,
            name: u.name as string | undefined,
            role: u.role as string | undefined,
            santri_id: (u as any).santri_id as string | undefined,
            wali_nis: (u as any).wali_nis as string | undefined,
          },
        };
      }
  } catch {
    // Continue to Bearer token
  }

  // 2. Coba Bearer token (Flutter mobile)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = verifyMobileToken(token);
    if (session) return session;

    // Token tidak valid atau kedaluwarsa
    return NextResponse.json(
      { success: false, message: 'Token tidak valid atau sudah kedaluwarsa.', errorCode: 'TOKEN_INVALID' },
      { status: 401 }
    );
  }

  // 3. Tidak ada autentikasi
  return NextResponse.json(
    { success: false, message: 'Sesi tidak valid, silakan login kembali.', errorCode: 'SESSION_REQUIRED' },
    { status: 401 }
  );
}

/**
 * Helper untuk mendapatkan session yang sudah terotentikasi DAN memastikan role diizinkan.
 *
 * @example
 * const session = await requireAuth(request);
 * if (session instanceof NextResponse) return session;
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: string[]
): Promise<ApiSession | NextResponse> {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;

  if (allowedRoles && session.user.role && !allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { success: false, message: 'Anda tidak memiliki akses ke resource ini.', errorCode: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  return session;
}
