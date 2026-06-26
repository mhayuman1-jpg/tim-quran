import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Allow Kabid and Tim_Quran to download template
    const role = session.user.role;
    if (role !== 'Kabid' && role !== 'Tim_Quran') {
      return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
    }

    // Generate simple Excel template with headers
    // import dapat mengembalikan modul dengan .default tergantung pada bundler
    const xlsxMod = await import('xlsx');
    const XLSX = xlsxMod?.default ?? xlsxMod;

    const rows = [
      ['REKAP BULANAN - TEMPLATE'],
      [],
      ['Periode (format YYYY-MM)', '2025-01'],
      [],
      ['Nama', 'NIS/NISN', 'Hadir (jumlah)', 'Tahfidz (%)', 'Tahsin (%)'],
      // example row
      ['Ahmad', '001234', '', '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Rekap_Template.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error generating template rekap:', error);
    return NextResponse.json({ message: 'Gagal membuat template' }, { status: 500 });
  }
}
