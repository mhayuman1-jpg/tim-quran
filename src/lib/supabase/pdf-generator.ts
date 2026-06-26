import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateRaportPDF = (student: any, hafalanData: any[], tahsinData: any[]) => {
  const doc = new jsPDF();

  // Judul
  doc.setFontSize(18);
  doc.text("Laporan Perkembangan Qur'an", 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Nama: ${student.nama}`, 14, 30);
  doc.text(`NIS/NISN: ${student.nisn}`, 14, 37);

  // Tabel Hafalan
  doc.text("Riwayat Hafalan", 14, 50);
  (doc as any).autoTable({
    startY: 55,
    head: [["Tanggal", "Surah", "Ayat", "Status"]],
    body: hafalanData.map(h => [h.date, h.surah, h.ayat, h.status]),
  });

  // Tabel Tahsin
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text("Riwayat Tahsin", 14, finalY);
  (doc as any).autoTable({
    startY: finalY + 5,
    head: [["Tanggal", "Jilid", "Halaman", "Catatan"]],
    body: tahsinData.map(t => [t.date, t.book_volume, t.page_number, t.notes]),
  });

  doc.save(`Raport_${student.nama}.pdf`);
};