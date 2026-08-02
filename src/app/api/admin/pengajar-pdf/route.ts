import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
    }

    if (session.user.role !== 'Kabid') {
      return NextResponse.json({ message: 'Akses tidak diizinkan' }, { status: 403 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id')?.trim() || '';

    let teachersQuery = supabase
      .from('users')
      .select('id, name, email, role')
      .in('role', ['Tim_Quran', 'Sekretaris', 'Bendahara'])
      .eq('status', 'Aktif')
      .order('name', { ascending: true });

    if (teacherId) {
      teachersQuery = teachersQuery.eq('id', teacherId);
    }

    const { data: teachers, error: teachersError } = await teachersQuery;

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      return NextResponse.json({ message: 'Gagal mengambil data pengajar.' }, { status: 500 });
    }

    const teacherIds = (teachers ?? []).map((t: any) => t.id);

    const [studentsResult, classesResult] = await Promise.all([
      (async () => {
        let q = supabase
          .from('santri')
          .select('id, nama, nisn, qr_code, assigned_teacher_id, class_id, classes(name)')
          .eq('status', 'Aktif')
          .order('nama', { ascending: true });
        if (teacherIds.length > 0) {
          q = q.in('assigned_teacher_id', teacherIds);
        }
        return q;
      })(),
      supabase
        .from('classes')
        .select('id, name, teacher1_id, teacher2_id, teacher3_id')
        .order('name', { ascending: true }),
    ]);

    const { data: students, error: studentsError } = await studentsResult;
    const { data: classes, error: classesError } = classesResult;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ message: 'Gagal mengambil data siswa.' }, { status: 500 });
    }

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json({ message: 'Gagal mengambil data kelas.' }, { status: 500 });
    }

    const classMap: Record<string, string[]> = {};
    for (const c of classes ?? []) {
      for (const tid of [c.teacher1_id, c.teacher2_id, c.teacher3_id]) {
        if (tid) {
          if (!classMap[tid]) classMap[tid] = [];
          classMap[tid].push(c.name);
        }
      }
    }

    const studentsByTeacherAndClass: Record<string, Record<string, any[]>> = {};
    for (const student of students ?? []) {
      const tid = student.assigned_teacher_id;
      if (!tid) continue;
      if (!studentsByTeacherAndClass[tid]) studentsByTeacherAndClass[tid] = {};
      const classId = student.class_id || 'unassigned';
      if (!studentsByTeacherAndClass[tid][classId]) studentsByTeacherAndClass[tid][classId] = [];
      studentsByTeacherAndClass[tid][classId].push(student);
    }

    const classIdToName: Record<string, string> = {};
    for (const c of classes ?? []) {
      classIdToName[c.id] = c.name;
    }

    const { default: jsPDF } = await import('jspdf');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - margin * 2;

    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const drawWatermark = () => {
      doc.setFontSize(42);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(200, 200, 200);
      doc.text("Tim Qur'an", pageW / 2, pageH / 2, { angle: 45, align: 'center' });
      doc.setTextColor(0, 0, 0);
    };

    drawWatermark();

    const renderTeacher = async (teacher: any, startY: number) => {
      const classGroups = studentsByTeacherAndClass[teacher.id] || {};
      const classNames = classMap[teacher.id] ?? [];
      let y = startY;

      if (y > pageH - 35) {
        doc.addPage();
        drawWatermark();
        y = margin;
      }

      doc.setFillColor(30, 58, 95);
      doc.rect(margin, y, contentW, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const teacherLabel = `${teacher.name} (${teacher.role})`;
      doc.text(teacherLabel, margin + 3, y + 6);
      y += 12;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (teacher.email) {
        doc.text(teacher.email, margin, y + 3);
      }
      y += 7;

      if (classNames.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(`Kelas: ${classNames.join(', ')}`, margin, y + 3);
        y += 7;
      }

      const classIds = Object.keys(classGroups);
      if (classIds.length === 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(128, 128, 128);
        doc.text('Belum ada siswa yang diajarkan', margin, y + 4);
        y += 12;
      } else {
        const rowHeight = 20;
        const colNo = margin;
        const colNama = margin + 10;
        const colNisn = margin + 75;
        const colQr = margin + 115;
        const qrSize = 16;
        let globalNo = 0;

        const sortedClassIds = classIds.sort((a, b) => {
          const nameA = a === 'unassigned' ? 'ZZZ' : (classIdToName[a] || 'ZZZ');
          const nameB = b === 'unassigned' ? 'ZZZ' : (classIdToName[b] || 'ZZZ');
          return nameA.localeCompare(nameB);
        });

        for (const cid of sortedClassIds) {
          const classStudents = classGroups[cid];
          const className = cid === 'unassigned' ? 'Tanpa Kelas' : (classIdToName[cid] || 'Kelas Tidak Diketahui');

          if (y > pageH - 35) {
            doc.addPage();
            drawWatermark();
            y = margin;
          }

          doc.setFillColor(240, 245, 250);
          doc.rect(margin, y, contentW, 8, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 58, 95);
          doc.text(`${className} (${classStudents.length} siswa)`, margin + 3, y + 5.5);
          y += 10;

          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('No', colNo, y + 4);
          doc.text('Nama Siswa', colNama, y + 4);
          doc.text('NIS/NISN', colNisn, y + 4);
          doc.text('Barcode', colQr, y + 4);
          y += 7;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          for (let i = 0; i < classStudents.length; i++) {
            const student = classStudents[i];
            if (y > pageH - 25) {
              doc.addPage();
              drawWatermark();
              y = margin;
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.text('No', colNo, y + 4);
              doc.text('Nama Siswa', colNama, y + 4);
              doc.text('NIS/NISN', colNisn, y + 4);
              doc.text('Barcode', colQr, y + 4);
              y += 7;
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
            }

            globalNo++;
            doc.text(String(globalNo), colNo, y + 4);
            doc.text(student.nama, colNama, y + 4, { maxWidth: 55 });
            doc.text(student.nisn, colNisn, y + 4);

            const qrDataUrl = await QRCode.toDataURL(student.qr_code || student.nisn, {
              width: 300,
              margin: 1,
              errorCorrectionLevel: 'M',
            });
            doc.addImage(qrDataUrl, 'PNG', colQr, y - 10, qrSize, qrSize);
            y += rowHeight;
          }
          y += 4;
        }
      }

      return y + 4;
    };

    if (teachers.length === 1) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA PENGAJAR & SISWA', pageW / 2, margin + 5, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text("Tim Qur'an", pageW / 2, margin + 12, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Dicetak: ${dateStr}`, pageW / 2, margin + 18, { align: 'center' });
      await renderTeacher(teachers[0], margin + 28);
    } else {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DATA PENGAJAR & SISWA', pageW / 2, margin + 5, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text("Tim Qur'an", pageW / 2, margin + 12, { align: 'center' });
      doc.setFontSize(9);
      doc.text(`Dicetak: ${dateStr}`, pageW / 2, margin + 18, { align: 'center' });

      let y = margin + 28;
      for (const teacher of teachers) {
        y = await renderTeacher(teacher, y);
      }
    }

    const lastPageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Dicetak pada ${dateStr} — Data Pengajar & Siswa Tim Qur'an`,
      pageW / 2,
      lastPageH - 10,
      { align: 'center' }
    );

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const filename = teacherId && teachers.length === 1
      ? `data-pengajar-siswa-${teachers[0].name.replace(/\s+/g, '_')}-${now.toISOString().slice(0, 10)}.pdf`
      : `data-pengajar-siswa-${now.toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating pengajar PDF:', error);
    return NextResponse.json({ message: 'Gagal membuat PDF' }, { status: 500 });
  }
}
