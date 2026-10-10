export const dynamic = 'force-dynamic';
// GET: Unduh PDF laporan progres per kelas (Kabid / Sekretaris)
// Query: class_id (opsional). Kosong = semua kelas.
// Isi: ringkasan kelas, lalu detail riwayat hafalan, tahsin, dan kehadiran tiap siswa.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { buildStudentProgress, type StudentProgressRow } from '@/lib/laporan/student-progress';

const ALLOWED_ROLES = ['Kabid', 'Sekretaris'];

type HafalanDetail = {
  student_id: string;
  tanggal: string | null;
  surah_juz: string | null;
  halaman: string | number | null;
  makhroj: string | null;
  tajwid: string | null;
  lancar: string | null;
  buku: string | null;
  catatan: string | null;
};

type TahsinDetail = {
  student_id: string;
  tanggal: string | null;
  metode: string | null;
  buku: string | null;
  halaman: string | number | null;
  makhroj: string | null;
  kelancaran: string | null;
  adab: string | null;
  catatan: string | null;
};

type AttendanceDetail = {
  santri_id: string;
  date: string | null;
  status: string | null;
};

function sanitizeFilename(name: string) {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function genderLabel(gender: string) {
  if (gender === 'Perempuan') return 'P';
  if (gender === 'Laki-laki') return 'L';
  return gender || '-';
}

function cell(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = value.slice(0, 10);
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function compareDateDesc(a: string | null, b: string | null) {
  return (b ?? '').localeCompare(a ?? '');
}

async function fetchInChunks<T>(
  ids: string[],
  load: (
    chunk: string[],
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  const chunkSize = 80;
  const pageSize = 1000;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    let from = 0;
    for (;;) {
      const { data, error } = await load(chunk, from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const batch = data ?? [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  return rows;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { message: 'Sesi tidak valid, silakan login kembali.' },
      { status: 401 }
    );
  }

  if (!ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ message: 'Akses tidak diizinkan.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id')?.trim() || '';
    const supabase = createServerClient();

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name')
      .order('name', { ascending: true });

    if (classesError) {
      console.error('Fetch classes error (laporan kelas pdf):', classesError);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
    }

    const classList = classes ?? [];
    const classNameMap: Record<string, string> = {};
    for (const c of classList) classNameMap[c.id] = c.name;

    let targetClassName: string | null = null;
    if (classId) {
      targetClassName = classNameMap[classId] ?? null;
      if (!targetClassName) {
        return NextResponse.json({ message: 'Kelas tidak ditemukan.' }, { status: 404 });
      }
    }

    let santriQuery = supabase
      .from('santri')
      .select('id, nisn, nama, gender, juz_terakhir, assigned_teacher_id, class_id, classes ( id, name )')
      .eq('status', 'Aktif')
      .order('nama', { ascending: true });

    if (classId) {
      santriQuery = santriQuery.eq('class_id', classId);
    }

    const { data: santriList, error: santriError } = await santriQuery;
    if (santriError) {
      console.error('Fetch santri error (laporan kelas pdf):', santriError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    const { students, summary } = await buildStudentProgress(supabase, santriList ?? []);
    const studentIds = students.map((student) => student.id);

    const [hafalanRows, tahsinRows, attendanceRows] = studentIds.length
      ? await Promise.all([
          fetchInChunks<HafalanDetail>(studentIds, (chunk, from, to) =>
            supabase
              .from('hafalan')
              .select('student_id, tanggal, surah_juz, halaman, makhroj, tajwid, lancar, buku, catatan')
              .in('student_id', chunk)
              .order('tanggal', { ascending: false })
              .range(from, to)
          ),
          fetchInChunks<TahsinDetail>(studentIds, (chunk, from, to) =>
            supabase
              .from('tahsin')
              .select('student_id, tanggal, metode, buku, halaman, makhroj, kelancaran, adab, catatan')
              .in('student_id', chunk)
              .order('tanggal', { ascending: false })
              .range(from, to)
          ),
          fetchInChunks<AttendanceDetail>(studentIds, (chunk, from, to) =>
            supabase
              .from('attendances')
              .select('santri_id, date, status')
              .in('santri_id', chunk)
              .order('date', { ascending: false })
              .range(from, to)
          ),
        ])
      : [[], [], []];

    const hafalanByStudent = new Map<string, HafalanDetail[]>();
    for (const row of hafalanRows) {
      const list = hafalanByStudent.get(row.student_id) ?? [];
      list.push(row);
      hafalanByStudent.set(row.student_id, list);
    }
    hafalanByStudent.forEach((list) => {
      list.sort((a, b) => compareDateDesc(a.tanggal, b.tanggal));
    });

    const tahsinByStudent = new Map<string, TahsinDetail[]>();
    for (const row of tahsinRows) {
      const list = tahsinByStudent.get(row.student_id) ?? [];
      list.push(row);
      tahsinByStudent.set(row.student_id, list);
    }
    tahsinByStudent.forEach((list) => {
      list.sort((a, b) => compareDateDesc(a.tanggal, b.tanggal));
    });

    const attendanceByStudent = new Map<string, AttendanceDetail[]>();
    for (const row of attendanceRows) {
      const list = attendanceByStudent.get(row.santri_id) ?? [];
      list.push(row);
      attendanceByStudent.set(row.santri_id, list);
    }
    attendanceByStudent.forEach((list) => {
      list.sort((a, b) => compareDateDesc(a.date, b.date));
    });

    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const titleScope = targetClassName ? `Kelas ${targetClassName}` : 'Semua Kelas';
    const summaryLine = `Total siswa: ${summary.total_students}  •  Ada hafalan: ${summary.students_with_hafalan}  •  Ada tahsin: ${summary.students_with_tahsin}  •  Ada kehadiran: ${summary.students_with_attendance}`;

    const headStyles = {
      fillColor: [30, 58, 95] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold' as const,
      fontSize: 8,
    };
    const bodyStyles = {
      fontSize: 7.5,
      cellPadding: 1.4,
      textColor: [30, 41, 59] as [number, number, number],
      overflow: 'linebreak' as const,
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 95);
    doc.text('LAPORAN PROGRES SISWA PER KELAS', pageW / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(`Tim Qur'an — ${titleScope}`, pageW / 2, 21, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dicetak: ${dateStr}`, pageW / 2, 27, { align: 'center' });
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLine, 14, 35);

    const summaryHead = [['No', 'NIS/NISN', 'Nama', 'Kelas', 'L/P', 'Pembina', 'Juz', 'Hafalan', 'Tahsin', 'Kehadiran']];
    const summaryBody = students.map((student, index) => [
      String(index + 1),
      student.nisn || '-',
      student.nama,
      student.kelas || '-',
      genderLabel(student.gender),
      student.pembina || '-',
      cell(student.juz_terakhir),
      String(student.total_hafalan),
      String(student.total_tahsin),
      `${student.persentase_kehadiran}%`,
    ]);

    if (students.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Tidak ada siswa aktif pada filter kelas ini.', 14, 48);
    } else {
      autoTable(doc, {
        startY: 40,
        head: summaryHead,
        body: summaryBody,
        theme: 'grid',
        styles: bodyStyles,
        headStyles,
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14, bottom: 16 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 28 },
          4: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 22, halign: 'center' },
        },
      });
    }

    const drawSection = (title: string, startY: number, head: string[][], body: string[][]) => {
      let y = startY;
      if (y > pageH - 28) {
        doc.addPage();
        y = 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 95);
      doc.text(title, 14, y);

      if (body.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Belum ada catatan.', 14, y + 6);
        return y + 12;
      }

      autoTable(doc, {
        startY: y + 3,
        head,
        body,
        theme: 'grid',
        styles: bodyStyles,
        headStyles,
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14, bottom: 16 },
      });

      const lastTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
      return (lastTable?.finalY ?? y) + 8;
    };

    const renderStudent = (student: StudentProgressRow, index: number) => {
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 58, 95);
      doc.text(`${index + 1}. ${student.nama}`, 14, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `NIS/NISN: ${student.nisn || '-'}    Kelas: ${student.kelas || '-'}    L/P: ${genderLabel(student.gender)}    Pembina: ${student.pembina || '-'}    Juz: ${cell(student.juz_terakhir)}`,
        14,
        21
      );
      doc.text(
        `Hafalan: ${student.total_hafalan} setoran    Tahsin: ${student.total_tahsin} sesi    Kehadiran: ${student.persentase_kehadiran}% (${student.days_present}/${student.total_days} hari)`,
        14,
        27
      );

      const hafalan = hafalanByStudent.get(student.id) ?? [];
      let y = drawSection(
        `Riwayat Hafalan (${hafalan.length})`,
        34,
        [['Tanggal', 'Surah/Juz', 'Halaman', 'Buku', 'Makhroj', 'Tajwid', 'Lancar', 'Catatan']],
        hafalan.map((row) => [
          formatDate(row.tanggal),
          cell(row.surah_juz),
          cell(row.halaman),
          cell(row.buku),
          cell(row.makhroj),
          cell(row.tajwid),
          cell(row.lancar),
          cell(row.catatan),
        ])
      );

      const tahsin = tahsinByStudent.get(student.id) ?? [];
      y = drawSection(
        `Riwayat Tahsin (${tahsin.length})`,
        y,
        [['Tanggal', 'Metode', 'Buku', 'Halaman', 'Makhroj', 'Kelancaran', 'Adab', 'Catatan']],
        tahsin.map((row) => [
          formatDate(row.tanggal),
          cell(row.metode),
          cell(row.buku),
          cell(row.halaman),
          cell(row.makhroj),
          cell(row.kelancaran),
          cell(row.adab),
          cell(row.catatan),
        ])
      );

      const attendance = attendanceByStudent.get(student.id) ?? [];
      drawSection(
        `Riwayat Kehadiran (${attendance.length})`,
        y,
        [['Tanggal', 'Status']],
        attendance.map((row) => [formatDate(row.date), cell(row.status)])
      );
    };

    students.forEach(renderStudent);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Laporan Progres Per Kelas — Halaman ${i} dari ${pageCount}`,
        pageW / 2,
        pageH - 8,
        { align: 'center' }
      );
    }

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const filename = classId && targetClassName
      ? `laporan-progres-kelas-${sanitizeFilename(targetClassName)}-${now.toISOString().slice(0, 10)}.pdf`
      : `laporan-progres-semua-kelas-${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Laporan kelas PDF error:', error);
    return NextResponse.json({ message: 'Gagal membuat PDF laporan progres.' }, { status: 500 });
  }
}
