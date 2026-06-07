import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  try {
    const { data, error } = await supabase
      .from('navigation_items')
      .select('*')
      .eq('is_active', true)
      .order('urutan', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      data: data || [],
      error: null,
    });
  } catch (err: any) {
    console.error('[GET /api/website/navigation]', err);
    return NextResponse.json(
      { data: null, error: err.message ?? 'Failed to fetch navigation items' },
      { status: 500 }
    );
  }
}
