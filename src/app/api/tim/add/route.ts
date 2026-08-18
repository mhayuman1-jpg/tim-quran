// src/app/api/tim/add/route.ts
// Placeholder - replaced binary-corrupt file for build verification.
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const { nama, username, role } = body as { nama?: string; username?: string; role?: string };
    return NextResponse.json({ message: 'OK', nama, username, role }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
