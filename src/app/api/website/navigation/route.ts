import { createSupabaseServerClient, executeSupabaseQuery } from '@/lib/supabase/server-client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await executeSupabaseQuery(
      () => supabase
        .from('navigation_items')
        .select('*')
        .eq('is_active', true)
        .order('urutan', { ascending: true }),
      3, // max retries
      1000 // initial delay in ms
    );

    if (error) {
      console.error('[GET /api/website/navigation] Query error:', error);
      throw error;
    }

    return NextResponse.json({
      data: data || [],
      error: null,
    });
  } catch (err: any) {
    console.error('[GET /api/website/navigation] Error:', err?.message);
    
    return NextResponse.json(
      { 
        data: null, 
        error: err?.message ?? 'Failed to fetch navigation items',
      },
      { status: 500 }
    );
  }
}
