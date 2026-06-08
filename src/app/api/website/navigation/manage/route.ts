import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
export const dynamic = 'force-dynamic';

async function checkAdminRole() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

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

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('email', session.user.email)
    .single();

  if (!user || !['Kabid', 'Admin'].includes(user.role)) {
    throw new Error('Forbidden: Requires Kabid or Admin role');
  }
}

// POST — Add new menu item
export async function POST(req: NextRequest) {
  try {
    await checkAdminRole();

    const body = await req.json();
    const { label, href, urutan } = body;

    if (!label?.trim() || !href?.trim()) {
      return NextResponse.json(
        { error: 'Label dan href wajib diisi' },
        { status: 400 }
      );
    }

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

    const { data, error } = await supabase
      .from('navigation_items')
      .insert([
        {
          label: label.trim(),
          href: href.trim(),
          urutan: urutan ?? 999,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    console.error('[POST /api/website/navigation/manage]', err);
    return NextResponse.json(
      { error: err.message ?? 'Failed to add menu item' },
      { status: 500 }
    );
  }
}

// PUT — Update menu items (urutan, label, href, is_active)
export async function PUT(req: NextRequest) {
  try {
    await checkAdminRole();

    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items harus berupa array' },
        { status: 400 }
      );
    }

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

    // Update each item
    for (const item of items) {
      const { id, label, href, urutan, is_active } = item;
      if (!id) continue;

      const { error } = await supabase
        .from('navigation_items')
        .update({
          label: label?.trim() ?? undefined,
          href: href?.trim() ?? undefined,
          urutan: urutan ?? undefined,
          is_active: is_active ?? undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    }

    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ error: null, message: 'Menu items updated' });
  } catch (err: any) {
    console.error('[PUT /api/website/navigation/manage]', err);
    return NextResponse.json(
      { error: err.message ?? 'Failed to update menu items' },
      { status: 500 }
    );
  }
}

// DELETE — Delete menu item
export async function DELETE(req: NextRequest) {
  try {
    await checkAdminRole();

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID wajib diisi' },
        { status: 400 }
      );
    }

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

    const { error } = await supabase
      .from('navigation_items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    try { revalidatePath('/'); } catch (e) { console.warn('revalidatePath failed', e); }
    return NextResponse.json({ error: null, message: 'Menu item deleted' });
  } catch (err: any) {
    console.error('[DELETE /api/website/navigation/manage]', err);
    return NextResponse.json(
      { error: err.message ?? 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
