// src/app/api/raport/tahfidz/route.ts
// GET  : list raport tahfidz (dengan detail surah)
// POST : buat raport baru + detail surah
// PUT  : update raport header + detail surah
// DELETE: hapus raport

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient, withRetry } from '@/lib/supabase/server';
import { shouldFilterByTeacher, getTeacherFilterId } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const HEADER_SELECT = `
  id, student_id, teacher_id, periode, tahun_ajaran, juz, catatan, catatan_ai,
  nama_guru_kelas, niy_guru_kelas, nama_kabid, niy_kabid, nama_kepala_sekolah, niy_kepala_sekolah,
  tahsin_metode, tahsin_buku, tahsin_halaman, tahsin_makhroj, tahsin_kelancaran, tahsin_adab, tahsin_catatan,
  html_custom, pdf_path,
  created_at, updated_at,
  santri ( id, nama, nisn, classes ( id, name ) ),
  users ( id, name )
`;

// â”€â”€ GET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id')?.trim();
    const periode = searchParams.get('periode')?.trim();
    const id = searchParams.get('id')?.trim(); // fetch single dengan detail
    const supabase = createServerClient();

    // Fetch single raport + detail surah
    if (id) {
      const { data: raport, error } = await withRetry(() => supabase
        .from('raport_tahfidz')
        .select(`${HEADER_SELECT}, raport_tahfidz_detail ( * )`)
        .eq('id', id)
        .single() as any);

      if (error || !raport) {
        return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({ data: raport }, { status: 200 });
    }

    // List raport
    let query = supabase
      .from('raport_tahfidz')
      .select(HEADER_SELECT)
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);
    if (periode) query = query.ilike('periode', `%${periode}%`);

    // Tim_Quran hanya lihat siswa tanggung jawabnya (berlaku juga untuk Kabid/Sekretaris dalam Mode Mengajar)
    if (shouldFilterByTeacher(session.user.role, request)) {
      const teacherId = getTeacherFilterId(session.user.role, request, session.user.id);
      const { data: myStudents } = await withRetry(() => supabase
        .from('santri')
        .select('id')
        .eq('assigned_teacher_id', teacherId) as any);
      const ids = ((myStudents as any) ?? []).map((s: any) => s.id);
      if (ids.length === 0) return NextResponse.json({ data: [] }, { status: 200 });
      query = query.in('student_id', ids);
    }

    const { data, error } = await withRetry(() => query as any);
    if (error) return NextResponse.json({ message: 'Gagal mengambil data.', error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error('Raport Tahfidz GET error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// â”€â”€ POST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const { student_id, periode, tahun_ajaran, juz, catatan, catatan_ai,
            nama_guru_kelas, niy_guru_kelas, nama_kabid, niy_kabid,
            nama_kepala_sekolah, niy_kepala_sekolah,
            tahsin_metode, tahsin_buku, tahsin_halaman, tahsin_makhroj, tahsin_kelancaran, tahsin_adab, tahsin_catatan,
            detail } = body;

    if (!student_id?.trim()) return NextResponse.json({ message: 'student_id wajib.' }, { status: 400 });
    if (!periode?.trim())      return NextResponse.json({ message: 'Periode wajib.' }, { status: 400 });
    if (!tahun_ajaran?.trim()) return NextResponse.json({ message: 'Tahun ajaran wajib.' }, { status: 400 });
    if (!Array.isArray(detail) || detail.length === 0) {
      return NextResponse.json({ message: 'Detail surah wajib diisi.' }, { status: 400 });
    }

    const parsedJuz = typeof juz === 'string' ? (juz.trim() === '' ? null : Number(juz)) : juz;
    const supabase = createServerClient();

    // RBAC check
    if (shouldFilterByTeacher(session.user.role, request)) {
      const { data: santri } = await supabase
        .from('santri').select('assigned_teacher_id').eq('id', student_id).single();
      if (!santri || santri.assigned_teacher_id !== session.user.id) {
        return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
      }
    }

    // Cek duplikat
    const { data: existing } = await supabase
      .from('raport_tahfidz')
      .select('id')
      .eq('student_id', student_id.trim())
      .eq('periode', periode.trim())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { message: 'Raport periode ini sudah ada.', data: existing, duplicate: true },
        { status: 409 }
      );
    }

    // Insert header
    const { data: raport, error: insertErr } = await supabase
      .from('raport_tahfidz')
      .insert([{
        student_id: student_id.trim(),
        teacher_id: session.user.id,
        periode: periode.trim(),
        tahun_ajaran: tahun_ajaran.trim(),
        juz: parsedJuz ?? null,
        catatan: catatan?.trim() || null,
        catatan_ai: catatan_ai?.trim() || null,
        nama_guru_kelas: nama_guru_kelas?.trim() || null,
        niy_guru_kelas: niy_guru_kelas?.trim() || null,
        nama_kabid: nama_kabid?.trim() || null,
        niy_kabid: niy_kabid?.trim() || null,
        nama_kepala_sekolah: nama_kepala_sekolah?.trim() || null,
        niy_kepala_sekolah: niy_kepala_sekolah?.trim() || null,
        tahsin_metode: tahsin_metode?.trim() || null,
        tahsin_buku: tahsin_buku?.trim() || null,
        tahsin_halaman: tahsin_halaman?.trim() || null,
        tahsin_makhroj: tahsin_makhroj || null,
        tahsin_kelancaran: tahsin_kelancaran || null,
        tahsin_adab: tahsin_adab || null,
        tahsin_catatan: tahsin_catatan?.trim() || null,
      }])
      .select('id')
      .single();

    if (insertErr || !raport) {
      console.error('Raport Tahfidz POST insert error:', insertErr);
      return NextResponse.json({ message: 'Gagal menyimpan raport.', error: insertErr?.message }, { status: 500 });
    }

    // Insert detail surah
    const detailRows = detail.map((d: any, i: number) => ({
      raport_id: raport.id,
      urutan: i + 1,
      nama_surah: d.nama_surah?.trim() || `Surah ${i + 1}`,
      makhroj: d.makhroj || null,
      tajwid: d.tajwid || null,
      lancar: d.lancar || null,
      wafa_buku: d.wafa_buku?.trim() || null,
      wafa_halaman: d.wafa_halaman?.trim() || null,
    }));

    const { error: detailErr } = await supabase.from('raport_tahfidz_detail').insert(detailRows);
    if (detailErr) {
      // Rollback header
      await supabase.from('raport_tahfidz').delete().eq('id', raport.id);
      return NextResponse.json({ message: 'Gagal menyimpan detail surah.', error: detailErr.message }, { status: 500 });
    }

    // Return full raport with detail
    const { data: full } = await supabase
      .from('raport_tahfidz')
      .select(`${HEADER_SELECT}, raport_tahfidz_detail ( * )`)
      .eq('id', raport.id)
      .single();

    return NextResponse.json({ message: 'Raport berhasil disimpan.', data: full }, { status: 201 });
  } catch (error) {
    console.error('Raport Tahfidz POST error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// â”€â”€ PUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, periode, tahun_ajaran, juz, catatan, catatan_ai,
            nama_guru_kelas, niy_guru_kelas, nama_kabid, niy_kabid,
            nama_kepala_sekolah, niy_kepala_sekolah,
            tahsin_metode, tahsin_buku, tahsin_halaman, tahsin_makhroj, tahsin_kelancaran, tahsin_adab, tahsin_catatan,
            html_custom, detail } = body;

    if (!id) return NextResponse.json({ message: 'id raport wajib.' }, { status: 400 });

    const parsedJuz = typeof juz === 'string' ? (juz.trim() === '' ? null : Number(juz)) : juz;
    const supabase = createServerClient();

    // Cek akses
    const { data: existing } = await supabase
      .from('raport_tahfidz')
      .select('id, student_id, santri ( assigned_teacher_id )')
      .eq('id', id)
      .single();

    if (!existing) return NextResponse.json({ message: 'Raport tidak ditemukan.' }, { status: 404 });

    if (shouldFilterByTeacher(session.user.role, request)) {
      const assignedId = (existing.santri as any)?.assigned_teacher_id;
      if (assignedId !== session.user.id) {
        return NextResponse.json({ message: 'Akses ditolak.' }, { status: 403 });
      }
    }

    // Update header
    const updateHeader: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      // Invalidasi cache PDF — akan di-regenerate saat download berikutnya
      pdf_path: null,
    };
    if (periode?.trim()) updateHeader.periode = periode.trim();
    if (tahun_ajaran?.trim()) updateHeader.tahun_ajaran = tahun_ajaran.trim();
    if (juz !== undefined) updateHeader.juz = parsedJuz ?? null;
    if (catatan !== undefined) updateHeader.catatan = catatan?.trim() || null;
    if (catatan_ai !== undefined) updateHeader.catatan_ai = catatan_ai?.trim() || null;
    if (nama_guru_kelas !== undefined) updateHeader.nama_guru_kelas = nama_guru_kelas?.trim() || null;
    if (niy_guru_kelas !== undefined) updateHeader.niy_guru_kelas = niy_guru_kelas?.trim() || null;
    if (nama_kabid !== undefined) updateHeader.nama_kabid = nama_kabid?.trim() || null;
    if (niy_kabid !== undefined) updateHeader.niy_kabid = niy_kabid?.trim() || null;
    if (nama_kepala_sekolah !== undefined) updateHeader.nama_kepala_sekolah = nama_kepala_sekolah?.trim() || null;
    if (niy_kepala_sekolah !== undefined) updateHeader.niy_kepala_sekolah = niy_kepala_sekolah?.trim() || null;
    if (tahsin_metode !== undefined) updateHeader.tahsin_metode = tahsin_metode?.trim() || null;
    if (tahsin_buku !== undefined) updateHeader.tahsin_buku = tahsin_buku?.trim() || null;
    if (tahsin_halaman !== undefined) updateHeader.tahsin_halaman = tahsin_halaman?.trim() || null;
    if (tahsin_makhroj !== undefined) updateHeader.tahsin_makhroj = tahsin_makhroj || null;
    if (tahsin_kelancaran !== undefined) updateHeader.tahsin_kelancaran = tahsin_kelancaran || null;
    if (tahsin_adab !== undefined) updateHeader.tahsin_adab = tahsin_adab || null;
    if (tahsin_catatan !== undefined) updateHeader.tahsin_catatan = tahsin_catatan?.trim() || null;
    if (html_custom !== undefined) updateHeader.html_custom = html_custom || null;

    const { error: headerErr } = await supabase.from('raport_tahfidz').update(updateHeader).eq('id', id);
    if (headerErr) {
      console.error('Raport Tahfidz PUT header update error:', headerErr);
      return NextResponse.json({ message: 'Gagal memperbarui header raport.', error: headerErr.message }, { status: 500 });
    }

    // Update detail surah — hapus lama, insert baru
    if (Array.isArray(detail) && detail.length > 0) {
      const { error: deleteErr } = await supabase.from('raport_tahfidz_detail').delete().eq('raport_id', id);
      if (deleteErr) {
        console.error('Raport Tahfidz PUT detail delete error:', deleteErr);
        return NextResponse.json({ message: 'Gagal menghapus detail lama.', error: deleteErr.message }, { status: 500 });
      }

      const detailRows = detail.map((d: any, i: number) => ({
        raport_id: id,
        urutan: i + 1,
        nama_surah: d.nama_surah?.trim() || `Surah ${i + 1}`,
        makhroj: d.makhroj || null,
        tajwid: d.tajwid || null,
        lancar: d.lancar || null,
        wafa_buku: d.wafa_buku?.trim() || null,
        wafa_halaman: d.wafa_halaman?.trim() || null,
      }));
      const { error: detailErr } = await supabase.from('raport_tahfidz_detail').insert(detailRows);
      if (detailErr) {
        console.error('Raport Tahfidz PUT detail insert error:', detailErr);
        return NextResponse.json({ message: 'Gagal menyimpan detail surah.', error: detailErr.message }, { status: 500 });
      }
    }

    const { data: full, error: fetchErr } = await supabase
      .from('raport_tahfidz')
      .select(`${HEADER_SELECT}, raport_tahfidz_detail ( * )`)
      .eq('id', id)
      .single();

    if (fetchErr || !full) {
      console.error('Raport Tahfidz PUT fetch full raport error:', fetchErr);
      return NextResponse.json({ message: 'Gagal mengambil raport setelah update.', error: fetchErr?.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Raport berhasil diperbarui.', data: full }, { status: 200 });
  } catch (error) {
    console.error('Raport Tahfidz PUT error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan pada server.', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  if (session.user.role !== 'Kabid') {
    return NextResponse.json({ message: 'Hanya Kabid yang bisa menghapus raport.' }, { status: 403 });
  }

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ message: 'id wajib.' }, { status: 400 });

    const supabase = createServerClient();
    // CASCADE akan hapus detail otomatis
    await supabase.from('raport_tahfidz').delete().eq('id', id);
    return NextResponse.json({ message: 'Raport berhasil dihapus.' }, { status: 200 });
  } catch {
    return NextResponse.json({ message: 'Terjadi kesalahan.' }, { status: 500 });
  }
}
