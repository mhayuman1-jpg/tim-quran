// src/app/api/session/route.ts
// GET: Validasi session — mendukung NextAuth cookies dan Bearer token (Flutter mobile)

import { NextRequest, NextResponse } from 'next/server';
import { getApiSession } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getApiSession(request);

  if (!session) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  return NextResponse.json({ user: session.user });
}
