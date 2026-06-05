"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Printer, ArrowLeft, Loader2, CreditCard, CheckCircle2, Download } from "lucide-react";
import { StudentIDCard, type IDCardStudent } from "@/components/shared/StudentIDCard";

interface ProfilWebsite {
  nama_lembaga?: string;
  logo_url?: string | null;
  logo_sekolah_url?: string | null;
  nama_sekolah?: string | null;
}

export default function PrintIDCardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const printAreaRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<IDCardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profil, setProfil] = useState<ProfilWebsite>({});

  const rawIds = searchParams.get("ids") ?? "";
  const selectedIds = rawIds.split(",").map(s => s.trim()).filter(Boolean);

  // Fetch profil + siswa paralel
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [siswaRes, profilRes] = await Promise.all([
          fetch("/api/siswa/list"),
          fetch("/api/website/profil").catch(() => null),
        ]);

        if (profilRes?.ok) {
          const pj = await profilRes.json();
          if (pj.data) setProfil(pj.data);
        }

        if (!siswaRes.ok) {
          const j = await siswaRes.json().catch(() => ({}));
          throw new Error(j.message ?? "Gagal mengambil data siswa.");
        }
        const json = await siswaRes.json();
        const all: IDCardStudent[] = json.data ?? [];
        const idSet = new Set(selectedIds);
        setStudents(all.filter(s => idSet.has(s.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIds]);

  const handleDownloadCard = async (student: IDCardStudent) => {
    // Cari elemen DOM kartu berdasarkan id
    const cardEl = document.getElementById(`id-card-${student.id}`);
    if (!cardEl) {
      alert('Kartu belum siap. Tunggu sebentar lalu coba lagi.');
      return;
    }
    try {
      const { toPng } = await import('html-to-image');
      // Ambil screenshot kartu HTML yang sudah render — resolusi 3x untuk kualitas tinggi
      const dataUrl = await toPng(cardEl, {
        pixelRatio: 3,
        skipAutoScale: false,
        cacheBust: true,
      });
      // Trigger download
      const safeNama = student.nama.replace(/[^a-zA-Z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `IDCard_${safeNama}_${student.nisn}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Gagal download ID card:', err);
      alert('Gagal mengunduh ID Card. Silakan gunakan tombol Cetak sebagai alternatif.');
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printAreaRef,
    documentTitle: `ID Card - ${profil.nama_lembaga ?? "Tim Quran"}`,
    pageStyle: `
      @page { size: A4 landscape; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
        .print-grid { display: flex; flex-wrap: wrap; gap: 5mm; }
        .id-card { width: 85.6mm !important; height: 54mm !important; page-break-inside: avoid; break-inside: avoid; }
      }
    `,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-500">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <p className="text-sm">Memuat data siswa dan profil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-600 text-sm font-medium">{error}</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Kembali
        </button>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <CreditCard size={48} className="text-slate-200" />
        <p className="text-slate-500 text-sm">
          {selectedIds.length === 0 ? "Tidak ada ID siswa yang dipilih." : "Siswa yang dipilih tidak ditemukan."}
        </p>
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <ArrowLeft size={16} /> Kembali ke Data Siswa
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard size={22} className="text-emerald-600" />
            Cetak ID Card Santri
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {students.length} kartu siap dicetak · Ukuran 85.6 × 54 mm (kartu kredit standar)
          </p>
          {/* Summary */}
          <div className="mt-3 flex flex-wrap gap-2">
            {students.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-0.5">
                <CheckCircle2 size={11} /> {s.nama}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={15} /> Kembali
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 hover:scale-105 active:scale-100"
          >
            <Printer size={16} /> Cetak {students.length} Kartu
          </button>
        </div>
      </div>

      {/* Hint */}
      <div className="no-print bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Tips cetak:</strong> Gunakan ukuran kertas A4 Landscape, matikan header/footer browser, aktifkan "Background graphics" untuk warna yang benar.
      </div>

      {/* Print area */}
      <div ref={printAreaRef} className="p-2">
        <p className="no-print text-xs text-slate-400 mb-5">Pratinjau — kartu dicetak ukuran 85.6 mm × 54 mm</p>
        <div className="print-grid flex flex-wrap gap-6">
          {students.map(student => (
            <div key={student.id} className="flex flex-col gap-2 items-start">
              <StudentIDCard
                student={student}
                namaLembaga={profil.nama_lembaga ?? "Tim Qur'an"}
                logoUrl={profil.logo_url ?? null}
                logoSekolahUrl={profil.logo_sekolah_url ?? null}
                namaSekolah={profil.nama_sekolah ?? null}
                cardId={`id-card-${student.id}`}
              />
              {/* Tombol download individual — tidak ikut cetak */}
              <button
                onClick={() => handleDownloadCard(student)}
                className="no-print flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Download size={12} /> Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
