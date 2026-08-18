// src/app/api/admin/pengajar-pdf/stats/route.ts
// Placeholder - file diperlukan untuk API route admin pengajar-pdf stats.
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getAuthenticatedSession(request);
  if (session instanceof NextResponse) return session;
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();

    if (studentId) {
      const { count } = await supabase
        .from('hafalan')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);
      return NextResponse.json({ count: count ?? 0 }, { status: 200 });
    }

    const { count } = await supabase
      .from('hafalan')
      .select('*', { count: 'exact', head: true });
    return NextResponse.json({ count: count ?? 0 }, { status: 200 });
  } catch (error) {
    console.error('Admin pengajar-pdf stats error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
