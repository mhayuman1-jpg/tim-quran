// src/app/api/website/program/route.ts
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
    return NextResponse.json({ message: 'OK', received: body }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
