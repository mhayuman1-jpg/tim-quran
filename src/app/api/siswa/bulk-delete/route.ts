import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: 'Sesi tidak valid, silakan login kembali' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'Kabid' && session.user.role !== 'Sekretaris') {
      return NextResponse.json(
        { message: 'Hanya Kabid dan Sekretaris yang dapat menghapus siswa secara massal' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Minimal satu siswa harus dipilih' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { error, count } = await supabase
      .from('santri')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('Supabase bulk delete santri error:', error);
      return NextResponse.json(
        { message: 'Gagal menghapus data siswa.', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `${ids.length} siswa berhasil dihapus.`,
      deleted: ids.length,
    });
  } catch (error) {
    console.error('Route error /api/siswa/bulk-delete:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
