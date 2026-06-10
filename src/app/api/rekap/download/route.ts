import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getNilaiNumeric(nilai: string | null): number {
  if (!nilai) return 0;
  if (nilai === '✓') return 100;
  if (nilai === 'A') return 85;
  if (nilai === 'B') return 70;
  if (nilai === 'C') return 55;
  if (nilai === 'D') return 40;
  return 0;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'pdf'; // pdf atau excel
    const periode = searchParams.get('periode'); // format: YYYY-MM

    if (!periode || !/^[0-9]{4}-[0-9]{2}$/.test(periode)) {
      return NextResponse.json(
        { message: 'Parameter periode diperlukan (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    // Fetch optional rekap metadata dari database
    const { data: rekapData, error: rekapError } = await supabase
      .from('rekap_bulanan')
      .select('id, periode, file_url, created_at')
      .eq('periode', periode)
      .maybeSingle();

    if (rekapError) {
      console.error('[Rekap Download] Fetch rekap_bulanan error:', rekapError);
      return NextResponse.json(
        { message: 'Gagal mengambil data rekap' },
        { status: 500 }
      );
    }

    // Fetch additional stats
    const [tahun, bulan] = periode.split('-');

    // Fetch santri yang aktif
    const { data: santriData, error: santriError } = await supabase
      .from('santri')
      .select('id, nama, nisn')
      .eq('status', 'Aktif');

    if (santriError) {
      console.error('[Rekap Download] Fetch santri error:', santriError);
      return NextResponse.json({ message: 'Gagal mengambil daftar santri aktif.' }, { status: 500 });
    }

    const month = Number(bulan);
    const lastDay = new Date(Number(tahun), month, 0).getDate();
    const fromDate = `${tahun}-${bulan}-01`;
    const toDate = `${tahun}-${bulan}-${String(lastDay).padStart(2, '0')}`;

    // Fetch absensi untuk bulan tersebut
    const [{ data: absensiData, error: absensiError }, { data: tahfidzData, error: tahfidzError }, { data: tahsinData, error: tahsinError }] = await Promise.all([
      supabase
        .from('attendances')
        .select('student_id, status, date')
        .gte('date', fromDate)
        .lte('date', toDate),
      supabase
        .from('hafalan')
        .select('student_id, tanggal, makhroj, tajwid, lancar')
        .gte('tanggal', fromDate)
        .lte('tanggal', toDate),
      supabase
        .from('tahsin')
        .select('student_id, tanggal, makhroj, kelancaran, adab')
        .gte('tanggal', fromDate)
        .lte('tanggal', toDate),
    ]);

    if (absensiError) {
      console.error('[Rekap Download] Fetch absensi error:', absensiError);
      return NextResponse.json({ message: 'Gagal mengambil data absensi.' }, { status: 500 });
    }

    if (tahfidzError) {
      console.error('[Rekap Download] Fetch hafalan error:', tahfidzError);
      return NextResponse.json({ message: 'Gagal mengambil data hafalan.' }, { status: 500 });
    }

    if (tahsinError) {
      console.error('[Rekap Download] Fetch tahsin error:', tahsinError);
      return NextResponse.json({ message: 'Gagal mengambil data tahsin.' }, { status: 500 });
    }

    const attendanceDates = new Set((absensiData ?? []).map((record: any) => String(record.date)));
    const totalAttendanceDays = attendanceDates.size;

    const attendanceByStudent: Record<string, { hadir: number }> = {};
    for (const record of absensiData ?? []) {
      const studentId = String(record.student_id);
      if (!attendanceByStudent[studentId]) {
        attendanceByStudent[studentId] = { hadir: 0 };
      }
      if (record.status === 'Hadir') {
        attendanceByStudent[studentId].hadir += 1;
      }
    }

    const tahfidzByStudent: Record<string, { total: number; count: number }> = {};
    for (const record of tahfidzData ?? []) {
      const studentId = String(record.student_id);
      const nilai = (
        getNilaiNumeric(record.makhroj) +
        getNilaiNumeric(record.tajwid) +
        getNilaiNumeric(record.lancar)
      ) / 3;

      if (!tahfidzByStudent[studentId]) {
        tahfidzByStudent[studentId] = { total: 0, count: 0 };
      }
      tahfidzByStudent[studentId].total += nilai;
      tahfidzByStudent[studentId].count += 1;
    }

    const tahsinByStudent: Record<string, { total: number; count: number }> = {};
    for (const record of tahsinData ?? []) {
      const studentId = String(record.student_id);
      const nilai = (
        getNilaiNumeric(record.makhroj) +
        getNilaiNumeric(record.kelancaran) +
        getNilaiNumeric(record.adab)
      ) / 3;

      if (!tahsinByStudent[studentId]) {
        tahsinByStudent[studentId] = { total: 0, count: 0 };
      }
      tahsinByStudent[studentId].total += nilai;
      tahsinByStudent[studentId].count += 1;
    }

    const studentRows = (santriData ?? []).map((santri: any) => {
      const attendance = attendanceByStudent[santri.id] ?? { hadir: 0 };
      const tahfidz = tahfidzByStudent[santri.id] ?? { total: 0, count: 0 };
      const tahsin = tahsinByStudent[santri.id] ?? { total: 0, count: 0 };
      const tahfidzProgress = tahfidz.count ? Math.round(tahfidz.total / tahfidz.count) : 0;
      const tahsinProgress = tahsin.count ? Math.round(tahsin.total / tahsin.count) : 0;
      return {
        nama: santri.nama || '—',
        nisn: santri.nisn || '—',
        hadir: attendance.hadir,
        attendancePercent: totalAttendanceDays ? Math.round((attendance.hadir / totalAttendanceDays) * 100) : 0,
        tahfidzProgress,
        tahsinProgress,
      };
    });

    const totalHadir = (absensiData ?? []).filter((a: any) => a.status === 'Hadir').length;
    const totalTidakHadir = (absensiData ?? []).filter((a: any) => a.status === 'Tidak Hadir').length;

    const rekapStats = {
      bulan: parseInt(bulan, 10),
      tahun: parseInt(tahun, 10),
      totalSantri: santriData?.length || 0,
      totalHadir,
      totalTidakHadir,
      totalAttendanceDays,
      studentRows,
    };

    if (format === 'excel') {
      // Generate Excel file
      const xlsxMod = await import('xlsx');
      const XLSX = xlsxMod?.default ?? xlsxMod;

      const rows = [
        ['REKAP BULANAN'],
        [],
        ['Periode', periode],
        ['Total Santri Aktif', rekapStats.totalSantri],
        ['Total Hari Absensi', rekapStats.totalAttendanceDays],
        ['Total Kehadiran', rekapStats.totalHadir],
        ['Total Tidak Hadir', rekapStats.totalTidakHadir],
        [],
        ['Detail Per Siswa'],
        ['Nama', 'NISN', 'Hadir', '% Hadir', 'Tahfidz', 'Tahsin'],
        ...rekapStats.studentRows.map((row: any) => [
          row.nama,
          row.nisn,
          row.hadir,
          `${row.attendancePercent}%`,
          `${row.tahfidzProgress}%`,
          `${row.tahsinProgress}%`,
        ]),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap');

      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Rekap_${periode}.xlsx"`,
        },
      });
    } else {
      // Generate PDF file
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('REKAP BULANAN', 105, 20, { align: 'center' });

      doc.setFontSize(11);
      doc.text(`Periode: ${periode}`, 20, 40);

      doc.setFontSize(10);
      doc.text(`Total Santri Aktif: ${rekapStats.totalSantri}`, 20, 50);
      doc.text(`Total Hari Absensi: ${rekapStats.totalAttendanceDays}`, 20, 58);
      doc.text(`Total Kehadiran: ${rekapStats.totalHadir}`, 20, 66);
      doc.text(`Total Tidak Hadir: ${rekapStats.totalTidakHadir}`, 20, 74);

      doc.setFontSize(10);
      const headerY = 90;
      const rowHeight = 7;
      const marginLeft = 20;
      const colPositions = {
        nama: 20,
        nisn: 80,
        hadir: 120,
        percent: 145,
        tahfidz: 170,
        tahsin: 195,
      };

      const renderHeader = (y: number) => {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Nama', colPositions.nama, y);
        doc.text('NISN', colPositions.nisn, y);
        doc.text('Hadir', colPositions.hadir, y);
        doc.text('% Hadir', colPositions.percent, y);
        doc.text('Tahfidz', colPositions.tahfidz, y);
        doc.text('Tahsin', colPositions.tahsin, y);
        doc.setFont('helvetica', 'normal');
      };

      let y = headerY;
      renderHeader(y);
      y += rowHeight;

      for (const row of rekapStats.studentRows) {
        if (y > 280) {
          doc.addPage();
          y = 20;
          renderHeader(y);
          y += rowHeight;
        }

        doc.setFontSize(9);
        doc.text(String(row.nama), colPositions.nama, y, { maxWidth: 55 });
        doc.text(String(row.nisn), colPositions.nisn, y, { maxWidth: 30 });
        doc.text(String(row.hadir), colPositions.hadir, y);
        doc.text(`${row.attendancePercent}%`, colPositions.percent, y);
        doc.text(`${row.tahfidzProgress}%`, colPositions.tahfidz, y);
        doc.text(`${row.tahsinProgress}%`, colPositions.tahsin, y);
        y += rowHeight;
      }

      const buffer = Buffer.from(doc.output('arraybuffer'));

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Rekap_${periode}.pdf"`,
        },
      });
    }
  } catch (error) {
    console.error('Error downloading rekap:', error);
    return NextResponse.json(
      { message: 'Gagal membuat file unduhan' },
      { status: 500 }
    );
  }
}
