import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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

    if (!periode) {
      return NextResponse.json(
        { message: 'Parameter periode diperlukan (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    // Fetch rekap data dari database
    const { data: rekapData, error: rekapError } = await supabase
      .from('rekap')
      .select('*')
      .eq('periode', periode)
      .single();

    if (rekapError || !rekapData) {
      return NextResponse.json(
        { message: 'Rekap tidak ditemukan untuk periode tersebut' },
        { status: 404 }
      );
    }

    // Fetch additional stats
    const now = new Date(periode + '-01');
    const [tahun, bulan] = periode.split('-');

    // Fetch santri yang aktif
    const { data: santriData } = await supabase
      .from('santri')
      .select('id, nama, nisn')
      .eq('status_active', true);

    // Fetch absensi untuk bulan tersebut
    const { data: absensiData } = await supabase
      .from('absensi')
      .select('santri_id, status, tanggal')
      .gte('tanggal', `${tahun}-${bulan}-01`)
      .lte('tanggal', `${tahun}-${bulan}-31`);

    if (format === 'excel') {
      // Generate Excel file
      const { default: XLSX } = await import('xlsx');

      const rekapStats = {
        bulan: parseInt(bulan),
        tahun: parseInt(tahun),
        totalSantri: santriData?.length || 0,
        totalHadir: absensiData?.filter((a: any) => a.status === 'hadir').length || 0,
        totalAlpha: absensiData?.filter((a: any) => a.status === 'alpha').length || 0,
      };

      const rows = [
        ['REKAP BULANAN'],
        [],
        ['Periode', periode],
        ['Total Santri Aktif', rekapStats.totalSantri],
        ['Total Hadir', rekapStats.totalHadir],
        ['Total Alpha', rekapStats.totalAlpha],
        ['Persentase Kehadiran', rekapStats.totalSantri > 0 ? Math.round((rekapStats.totalHadir / rekapStats.totalSantri) * 100) + '%' : '0%'],
        [],
        ['Detail Absensi'],
        ['Nama', 'NISN', 'Status'],
        ...(absensiData?.map((a: any) => {
          const santri = santriData?.find((s: any) => s.id === a.santri_id);
          return [santri?.nama || '—', santri?.nisn || '—', a.status];
        }) || []),
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];

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

      const rekapStats = {
        totalSantri: santriData?.length || 0,
        totalHadir: absensiData?.filter((a: any) => a.status === 'hadir').length || 0,
        totalAlpha: absensiData?.filter((a: any) => a.status === 'alpha').length || 0,
      };

      doc.setFontSize(10);
      doc.text(`Total Santri Aktif: ${rekapStats.totalSantri}`, 20, 50);
      doc.text(`Total Hadir: ${rekapStats.totalHadir}`, 20, 58);
      doc.text(`Total Alpha: ${rekapStats.totalAlpha}`, 20, 66);
      doc.text(
        `Persentase Kehadiran: ${rekapStats.totalSantri > 0 ? Math.round((rekapStats.totalHadir / rekapStats.totalSantri) * 100) : 0}%`,
        20,
        74
      );

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
