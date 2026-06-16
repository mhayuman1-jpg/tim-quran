import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid, silakan login kembali.' }, { status: 401 });
    }
    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
    }

    const body = await request.json();
    const { semester_name, end_date, notes } = body;

    if (!semester_name || typeof semester_name !== 'string' || semester_name.trim() === '') {
      return NextResponse.json({ message: 'Nama semester wajib diisi.' }, { status: 400 });
    }
    if (!end_date || typeof end_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return NextResponse.json({ message: 'Tanggal akhir semester harus diisi dalam format YYYY-MM-DD.' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Hitung jumlah record yang akan dihapus (untuk konfirmasi)
    const [{ count: hafalanCount }, { count: tahsinCount }, { count: absensiCount }, { count: raportCount }, { count: raporDetailCount }, { count: raportQuranCount }] = await Promise.all([
      supabase.from('hafalan').select('*', { count: 'exact', head: true }),
      supabase.from('tahsin').select('*', { count: 'exact', head: true }),
      supabase.from('attendances').select('*', { count: 'exact', head: true }),
      supabase.from('raport_tahfidz').select('*', { count: 'exact', head: true }),
      supabase.from('raport_tahfidz_detail').select('*', { count: 'exact', head: true }),
      supabase.from('raport_quran').select('*', { count: 'exact', head: true }),
    ]);

    // 1. Hapus data raport detail (harus duluan karena FK ke raport_tahfidz)
    const { error: delRaportDetail } = await supabase.from('raport_tahfidz_detail').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delRaportDetail) {
      console.error('Error delete raport_tahfidz_detail:', delRaportDetail);
      return NextResponse.json({ message: 'Gagal menghapus data raport detail.', error: delRaportDetail.message }, { status: 500 });
    }

    // 2. Hapus raport V2
    const { error: delRaport } = await supabase.from('raport_tahfidz').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delRaport) {
      console.error('Error delete raport_tahfidz:', delRaport);
      return NextResponse.json({ message: 'Gagal menghapus data raport.', error: delRaport.message }, { status: 500 });
    }

    // 3. Hapus data hafalan
    const { error: delHafalan } = await supabase.from('hafalan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delHafalan) {
      console.error('Error delete hafalan:', delHafalan);
      return NextResponse.json({ message: 'Gagal menghapus data hafalan.', error: delHafalan.message }, { status: 500 });
    }

    // 4. Hapus data tahsin
    const { error: delTahsin } = await supabase.from('tahsin').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delTahsin) {
      console.error('Error delete tahsin:', delTahsin);
      return NextResponse.json({ message: 'Gagal menghapus data tahsin.', error: delTahsin.message }, { status: 500 });
    }

    // 5. Hapus data raport quran
    const { error: delRaportQuran } = await supabase.from('raport_quran').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delRaportQuran) {
      console.error('Error delete raport_quran:', delRaportQuran);
      return NextResponse.json({ message: 'Gagal menghapus data raport quran.', error: delRaportQuran.message }, { status: 500 });
    }

    // 6. Hapus data absensi
    const { error: delAbsensi } = await supabase.from('attendances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delAbsensi) {
      console.error('Error delete attendances:', delAbsensi);
      return NextResponse.json({ message: 'Gagal menghapus data absensi.', error: delAbsensi.message }, { status: 500 });
    }

    // 7. Nonaktifkan semua semester aktif
    const { error: deactivateError } = await supabase
      .from('semester_settings')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('is_active', true);
    if (deactivateError) {
      console.error('Deactivate semester error:', deactivateError);
      return NextResponse.json({ message: 'Gagal menonaktifkan semester.', error: deactivateError.message }, { status: 500 });
    }

    // 8. Buat semester baru
    const { data: newSemester, error: insertError } = await supabase
      .from('semester_settings')
      .insert([{
        semester_name: semester_name.trim(),
        end_date,
        notes: typeof notes === 'string' ? notes.trim() : null,
        is_active: true,
      }])
      .select('id, semester_name, end_date, notes, is_active, created_at, updated_at')
      .single();
    if (insertError) {
      console.error('Insert semester error:', insertError);
      return NextResponse.json({ message: 'Gagal membuat semester baru.', error: insertError.message }, { status: 500 });
    }

    // 9. Reset juz_terakhir semua santri aktif ke 1
    const { data: resetData, error: resetError } = await supabase
      .from('santri')
      .update({ juz_terakhir: 1, updated_at: new Date().toISOString() })
      .eq('status', 'Aktif')
      .select('id');
    if (resetError) {
      console.error('Reset juz error:', resetError);
    }
    const resetCount = resetData?.length ?? 0;

    return NextResponse.json({
      message: 'Reset semester penuh berhasil. Semester baru siap digunakan.',
      data: newSemester,
      deleted: {
        hafalan: hafalanCount ?? 0,
        tahsin: tahsinCount ?? 0,
        absensi: absensiCount ?? 0,
        raport: raportCount ?? 0,
        raport_detail: raporDetailCount ?? 0,
        raport_quran: raportQuranCount ?? 0,
      },
      reset_juz_count: resetCount,
    });
  } catch (error) {
    console.error('Route error /api/semester/reset-full:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
