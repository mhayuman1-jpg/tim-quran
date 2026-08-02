"use client";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BookOpen, BookText, BarChart3, CalendarDays,
  User, School, Hash, TrendingUp, AlertCircle,
  Award, CheckCircle2, Star, Info,
  ChevronLeft, ChevronRight,
} from "lucide-react";

interface SantriData {
  id: string;
  nisn: string;
  nama: string;
  gender: string;
  tanggal_lahir: string;
  status: string;
  classes?: { id: string; name: string } | null;
}

interface HafalanItem {
  id: string;
  tanggal: string;
  surah_juz: string;
  halaman: number;
  makhroj?: string;
  tajwid?: string;
  lancar?: string;
  catatan?: string;
  nama_pengajar?: string;
}

interface TahsinItem {
  id: string;
  tanggal: string;
  metode: string;
  buku?: string;
  halaman?: number;
  makhroj?: string;
  kelancaran?: string;
  adab?: string;
  catatan?: string;
  nama_pengajar?: string;
}

interface ChartDataItem {
  tanggal: string;
  label: string;
  tahfidz: number;
  tahsin: number;
  keterangan?: string;
  isWeekend: boolean;
}

interface RaportItem {
  id: string;
  periode: string;
  makhroj?: number;
  tajwid?: number;
  lancar?: number;
  catatan?: string;
}

interface Ringkasan {
  total_hafalan: number;
  total_tahsin: number;
  total_absensi: number;
  absensi_hadir: number;
}

function getNilaiColor(val?: number): string {
  if (!val) return "#94a3b8";
  if (val >= 85) return "#059669";
  if (val >= 70) return "#d97706";
  return "#dc2626";
}

function getNilaiLabel(val?: number): string {
  if (!val) return "-";
  if (val >= 85) return "Sangat Baik";
  if (val >= 70) return "Baik";
  return "Perlu Perbaikan";
}

function getScoreBarColor(val: number): string {
  if (val >= 85) return "bg-emerald-500";
  if (val >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function todayWITA(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(new Date());
}

function mondayWITA(weeksAgo: number): string {
  const d = new Date(todayWITA() + 'T00:00:00Z');
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1) - weeksAgo * 7);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d);
}

export default function WaliDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [hafalan, setHafalan] = useState<HafalanItem[]>([]);
  const [tahsin, setTahsin] = useState<TahsinItem[]>([]);
  const [raport, setRaport] = useState<RaportItem[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [rataRataTahfidz, setRataRataTahfidz] = useState(0);
  const [rataRataTahsin, setRataRataTahsin] = useState(0);
  const [chartFrom, setChartFrom] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isMingguIni, setIsMingguIni] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Simpan audio instance di ref agar tidak recreated
  const audioRef = useMemo(() => {
    if (typeof window === "undefined") return null;
    const a = new Audio("/audio/greeting.mp3");
    a.volume = 1;
    a.preload = "auto";
    return a;
  }, []);

  // Coba autoplay segera
  useEffect(() => {
    if (!santri || !audioRef || greetingPlayed) return;

    const tryAutoplay = () => {
      // Coba play muted dulu (browser izinkan)
      audioRef.muted = true;
      audioRef.play().then(() => {
        // Berhasil play muted, langsung unmute
        audioRef.muted = false;
        audioRef.currentTime = 0;
        audioRef.play().then(() => setGreetingPlayed(true)).catch(() => {});
      }).catch(() => {
        setAudioBlocked(true);
      });
    };

    // Coba langsung
    tryAutoplay();
  }, [santri, audioRef, greetingPlayed]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/wali/login");
      return;
    }
    if (status !== "authenticated" || !session?.user?.santri_id) return;
    fetchData(chartFrom);
  }, [status, session, router, chartFrom]);

  const fetchData = async (from?: string | null) => {
    setLoading(true);
    setError("");
    try {
      const params = from ? `?from=${from}` : '';
      const res = await fetch(`/api/wali/progres${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal memuat data");
      }
      const data = await res.json();
      setSantri(data.santri);
      setHafalan(data.hafalan ?? []);
      setTahsin(data.tahsin ?? []);
      setRaport(data.raport ?? []);
      setRingkasan(data.ringkasan);
      setChartData(data.chartData ?? []);
      setRataRataTahfidz(data.rataRataTahfidz ?? 0);
      setRataRataTahsin(data.rataRataTahsin ?? 0);
      setStartDate(data.startDate ?? '');
      setEndDate(data.endDate ?? '');
      setIsMingguIni(data.isMingguIni ?? true);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const allScores = hafalan.flatMap((h) =>
      [h.makhroj, h.tajwid, h.lancar].filter(Boolean)
    );
    const scoreCounts: Record<string, number> = {};
    allScores.forEach((s) => {
      scoreCounts[s!] = (scoreCounts[s!] || 0) + 1;
    });

    const tahsinScores = tahsin.flatMap((t) =>
      [t.makhroj, t.kelancaran, t.adab].filter(Boolean)
    );
    tahsinScores.forEach((s) => {
      scoreCounts[s!] = (scoreCounts[s!] || 0) + 1;
    });

    return { scoreCounts };
  }, [hafalan, tahsin]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-lg border border-slate-100">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Gagal Memuat Data
          </h2>
          <p className="text-sm text-slate-500">{error}</p>
          <button
            onClick={() => fetchData(chartFrom)}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (!santri) return null;

  const hadirRate =
    ringkasan && ringkasan.total_absensi > 0
      ? Math.round((ringkasan.absensi_hadir / ringkasan.total_absensi) * 100)
      : 0;

  const nilaiOrder = ["A", "B", "C", "D", "L", "TL", "✓"];
  const nilaiColors: Record<string, string> = {
    A: "bg-emerald-500",
    B: "bg-blue-500",
    C: "bg-amber-500",
    D: "bg-red-500",
    L: "bg-emerald-400",
    TL: "bg-red-400",
    "✓": "bg-amber-500",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Audio element */}
      {!greetingPlayed && audioRef && (
        <audio
          ref={(el) => { if (el && audioRef) { el.src = audioRef.src; } }}
          autoPlay
          onPlay={() => setGreetingPlayed(true)}
          className="hidden"
        />
      )}

      {/* Audio Play Banner */}
      {!greetingPlayed && audioBlocked && (
        <button
          onClick={() => {
            if (audioRef) {
              audioRef.muted = false;
              audioRef.currentTime = 0;
              audioRef.play().then(() => setGreetingPlayed(true)).catch(() => {});
            }
          }}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg cursor-pointer animate-pulse"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
          <span className="text-lg font-semibold">Klik untuk mendengarkan sapaan</span>
        </button>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={24} className="text-emerald-500" />
          Progres Belajar
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Pantau perkembangan hafalan dan tahsin putra/putri Anda
        </p>
      </div>

      {/* Profil Santri */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-white text-2xl font-bold bg-white/20 backdrop-blur-sm">
            {santri.nama.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{santri.nama}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-white/80">
              <span className="flex items-center gap-1">
                <Hash size={13} /> NIS: {santri.nisn}
              </span>
              <span className="flex items-center gap-1">
                <School size={13} /> {santri.classes?.name ?? "-"}
              </span>
              <span className="flex items-center gap-1">
                <User size={13} /> {santri.gender}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <BookText size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {ringkasan?.total_hafalan ?? 0}
              </p>
              <p className="text-xs text-slate-500">Hafalan</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <BookOpen size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {ringkasan?.total_tahsin ?? 0}
              </p>
              <p className="text-xs text-slate-500">Tahsin</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <CalendarDays size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {ringkasan?.total_absensi ?? 0}
              </p>
              <p className="text-xs text-slate-500">Total Absensi</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CheckCircle2 size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{hadirRate}%</p>
              <p className="text-xs text-slate-500">Kehadiran</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row - Stat Cards + Bar Chart */}
      <div className="space-y-4">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200/60 shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
              <BookText size={18} className="text-amber-600" />
            </div>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Rata-Rata Tahfidz</p>
            <p className="text-4xl font-bold text-amber-600">{rataRataTahfidz}%</p>
            <p className="text-[11px] text-amber-500/70 mt-1">Makhroj, Tajwid, Kelancaran</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-200/60 shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <BookOpen size={18} className="text-emerald-600" />
            </div>
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">Rata-Rata Tahsin</p>
            <p className="text-4xl font-bold text-emerald-600">{rataRataTahsin}%</p>
            <p className="text-[11px] text-emerald-500/70 mt-1">Makhroj, Kelancaran, Tajwid</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-5 border border-slate-200/60 shadow-sm text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <CalendarDays size={18} className="text-slate-600" />
            </div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Periode</p>
            <p className="text-lg font-bold text-slate-700 leading-tight">
              {startDate
                ? new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' +
                  new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '7 Hari'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{isMingguIni ? 'Minggu ini' : 'Minggu lalu'}</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" />
              Grafik Progres 7 Hari
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (chartFrom) {
                    const d = new Date(chartFrom + 'T00:00:00Z');
                    d.setUTCDate(d.getUTCDate() - 7);
                    setChartFrom(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d));
                  } else {
                    setChartFrom(mondayWITA(1));
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Minggu Sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setChartFrom(null)}
                disabled={isMingguIni}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  isMingguIni
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Minggu Ini
              </button>
              <button
                onClick={() => {
                  if (isMingguIni) return;
                  const d = new Date(chartFrom + 'T00:00:00Z');
                  d.setUTCDate(d.getUTCDate() + 7);
                  const next = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d);
                  const seninIniStr = mondayWITA(0);
                  if (next >= seninIniStr) setChartFrom(null);
                  else setChartFrom(next);
                }}
                disabled={isMingguIni}
                className={`p-1.5 rounded-lg transition-colors ${
                  isMingguIni
                    ? 'text-slate-200 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={isMingguIni ? 'Sudah minggu ini' : 'Minggu Berikutnya'}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          {startDate && (
            <p className="text-[11px] text-slate-400 mb-5 ml-1">
              {new Date(startDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} —{' '}
              {new Date(endDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada data progres
            </p>
          ) : (
            <div className="relative">
              <svg viewBox="0 0 700 310" className="w-full h-auto" style={{ minHeight: 280 }}>
                <defs>
                  <linearGradient id="gradTahfidz" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="gradTahsin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <filter id="barShadow" x="-10%" y="-5%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.06" />
                  </filter>
                </defs>

                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 255 - (val / 100) * 220;
                  return (
                    <g key={val}>
                      <line x1="60" y1={y} x2="680" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x="48" y={y + 4} textAnchor="end" className="fill-slate-400" fontSize="11" fontWeight="500">{val}</text>
                    </g>
                  );
                })}

                {/* Baseline */}
                <line x1="60" y1="255" x2="680" y2="255" stroke="#cbd5e1" strokeWidth="1" />

                {/* Bars + X-axis labels */}
                {chartData.map((item, i) => {
                  const groupWidth = 580 / chartData.length;
                  const groupX = 70 + i * groupWidth;
                  const barWidth = groupWidth * 0.18;
                  const gap = 2;
                  const tahfidzH = (item.tahfidz / 100) * 220;
                  const tahsinH = (item.tahsin / 100) * 220;
                  const isToday = i === chartData.length - 1;
                  const barsTotalWidth = barWidth * 2 + gap;
                  const barsStartX = groupX + (groupWidth - barsTotalWidth) / 2;
                  const barOpacity = item.keterangan ? 0.3 : 1;
                  return (
                    <g key={item.tanggal}>
                      {/* Tahfidz bar */}
                      <rect
                        x={barsStartX}
                        y={255 - tahfidzH}
                        width={barWidth}
                        height={Math.max(tahfidzH, 2)}
                        rx={3}
                        ry={3}
                        fill="url(#gradTahfidz)"
                        filter="url(#barShadow)"
                        opacity={barOpacity}
                      />
                      {/* Tahsin bar */}
                      <rect
                        x={barsStartX + barWidth + gap}
                        y={255 - tahsinH}
                        width={barWidth}
                        height={Math.max(tahsinH, 2)}
                        rx={3}
                        ry={3}
                        fill="url(#gradTahsin)"
                        filter="url(#barShadow)"
                        opacity={barOpacity}
                      />
                      {/* Value labels */}
                      {!item.keterangan && item.tahfidz > 0 && (
                        <text
                          x={barsStartX + barWidth / 2}
                          y={255 - tahfidzH - 5}
                          textAnchor="middle"
                          className="fill-amber-600"
                          fontSize="9"
                          fontWeight="700"
                        >
                          {item.tahfidz}
                        </text>
                      )}
                      {!item.keterangan && item.tahsin > 0 && (
                        <text
                          x={barsStartX + barWidth + gap + barWidth / 2}
                          y={255 - tahsinH - 5}
                          textAnchor="middle"
                          className="fill-emerald-600"
                          fontSize="9"
                          fontWeight="700"
                        >
                          {item.tahsin}
                        </text>
                      )}
                      {/* X-axis label */}
                      <text
                        x={groupX + groupWidth / 2}
                        y="270"
                        textAnchor="middle"
                        className={isToday ? "fill-slate-800" : "fill-slate-400"}
                        fontSize="10"
                        fontWeight={isToday ? "700" : "500"}
                      >
                        {item.label}
                      </text>
                      {isToday && !item.keterangan && (
                        <text
                          x={groupX + groupWidth / 2}
                          y="284"
                          textAnchor="middle"
                          className="fill-emerald-500"
                          fontSize="8"
                          fontWeight="600"
                        >
                          Hari ini
                        </text>
                      )}
                      {item.keterangan && !item.isWeekend && (
                        <text
                          x={groupX + groupWidth / 2}
                          y="282"
                          textAnchor="middle"
                          className="fill-red-400"
                          fontSize="7"
                          fontWeight="500"
                        >
                          {item.keterangan}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-amber-400 to-amber-600" />
                  <span className="text-sm font-medium text-slate-600">Tahfidz</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-gradient-to-b from-emerald-400 to-emerald-600" />
                  <span className="text-sm font-medium text-slate-600">Tahsin</span>
                </div>
              </div>
              {chartData.some(d => d.keterangan) && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Keterangan</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pada hari Jum&apos;at, Sabtu, dan Minggu, tidak ada tahfidz dan tahsin
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Distribusi Nilai + Detail Aspek Penilaian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribusi Nilai */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Award size={16} className="text-emerald-500" />
            Distribusi Nilai
          </h3>
          {Object.keys(stats.scoreCounts).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada data penilaian
            </p>
          ) : (
            <div className="space-y-3">
              {nilaiOrder
                .filter((k) => stats.scoreCounts[k])
                .map((key) => {
                  const count = stats.scoreCounts[key];
                  const total = Object.values(stats.scoreCounts).reduce(
                    (a, b) => a + b,
                    0
                  );
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-bold text-slate-700">
                        {key}
                      </span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${nilaiColors[key] || "bg-slate-400"} rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        >
                          {pct >= 15 && (
                            <span className="text-[10px] font-bold text-white">
                              {pct}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right">
                        {count}x
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Detail Aspek Penilaian */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Info size={16} className="text-blue-500" />
            Detail Aspek Penilaian
          </h3>
          <div className="space-y-4">
            {/* Tahfidz */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Tahfidz</span>
              </div>
              <div className="space-y-1.5 ml-5">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-blue-600">Makhroj</span> — Ketepatan pengucapan huruf hijaiyah dari tempat keluarnya
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-purple-600">Tajwid</span> — Kepatuhan aturan bacaan dalam melafalkan ayat Al-Qur&apos;an
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-emerald-600">Kelancaran</span> — Kemampuan membaca tanpa terbata-bata
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100" />
            {/* Tahsin */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Tahsin</span>
              </div>
              <div className="space-y-1.5 ml-5">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-blue-600">Makhroj</span> — Ketepatan pengucapan huruf dari tempat keluarnya
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-amber-600">Kelancaran</span> — Kemampuan membaca dengan lancar dan ritme yang tepat
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-purple-600">Tajwid</span> — Penerapan aturan bacaan tajwid yang benar
                </p>
              </div>
            </div>
            <div className="border-t border-slate-100" />
            {/* Keterangan Nilai */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Keterangan Skor</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p className="text-[11px] text-slate-600"><span className="font-bold text-emerald-600">A / 85-100</span> — Sangat Baik</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-amber-600">B / 70-84</span> — Baik</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-red-600">C / 50-69</span> — Perlu Perbaikan</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-red-700">D / &lt;50</span> — Kurang</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-emerald-600">L</span> — Lancar</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-amber-600">KL</span> — Kurang Lancar</p>
                <p className="text-[11px] text-slate-600"><span className="font-bold text-red-600">TL</span> — Tidak Lancar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Raport */}
      {raport.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Star size={16} className="text-amber-500" />
            Raport Terbaru
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {raport.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-100 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    {r.periode}
                  </span>
                </div>
                {[
                  { label: "Makhroj", val: r.makhroj },
                  { label: "Tajwid", val: r.tajwid },
                  { label: "Lancar", val: r.lancar },
                ].map(({ label, val }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-500">{label}</span>
                      <span
                        className="font-bold"
                        style={{ color: getNilaiColor(val) }}
                      >
                        {val ?? "-"}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getScoreBarColor(val ?? 0)} rounded-full transition-all duration-700`}
                        style={{ width: `${val ?? 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {getNilaiLabel(val)}
                    </span>
                  </div>
                ))}
                {r.catatan && (
                  <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                    {r.catatan}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riwayat Hafalan & Tahsin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hafalan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BookText size={16} className="text-indigo-500" />
            Riwayat Hafalan
          </h3>
          {hafalan.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Belum ada riwayat hafalan
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {hafalan.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <BookText size={14} className="text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">
                        {h.surah_juz}
                      </span>
                      {h.halaman && (
                        <span className="text-xs text-slate-400">
                          Hal. {h.halaman}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {h.makhroj && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Makhroj: {h.makhroj}
                        </span>
                      )}
                      {h.tajwid && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          Tajwid: {h.tajwid}
                        </span>
                      )}
                      {h.lancar && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Lancar: {h.lancar}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(h.tanggal + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
                    {h.catatan && (
                      <div className="mt-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                        <p className="text-[10px] font-semibold text-indigo-600 mb-0.5">
                          Catatan {h.nama_pengajar ? `dari ${h.nama_pengajar}` : 'Pengajar'}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{h.catatan}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tahsin */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-500" />
            Riwayat Tahsin
          </h3>
          {tahsin.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Belum ada riwayat tahsin
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tahsin.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 text-sm">
                        {t.metode}
                      </span>
                      {t.buku && (
                        <span className="text-xs text-slate-400">
                          Buku {t.buku}
                        </span>
                      )}
                      {t.halaman && (
                        <span className="text-xs text-slate-400">
                          Hal. {t.halaman}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {t.makhroj && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Makhroj: {t.makhroj}
                        </span>
                      )}
                      {t.kelancaran && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Kelancaran: {t.kelancaran}
                        </span>
                      )}
                      {t.adab && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          Tajwid: {t.adab}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(t.tanggal + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
                    {t.catatan && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">
                          Catatan {t.nama_pengajar ? `dari ${t.nama_pengajar}` : 'Pengajar'}
                        </p>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{t.catatan}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
