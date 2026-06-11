"use client";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  BookOpen, BookText, BarChart3, CalendarDays,
  User, School, Hash, TrendingUp, AlertCircle,
  Award, Target, Clock, CheckCircle2, Star,
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

export default function WaliDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [hafalan, setHafalan] = useState<HafalanItem[]>([]);
  const [tahsin, setTahsin] = useState<TahsinItem[]>([]);
  const [raport, setRaport] = useState<RaportItem[]>([]);
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
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
    fetchData();
  }, [status, session]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/wali/progres`);
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
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // Hitung statistik penilaian
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

    // Hafalan per tanggal untuk chart
    const hafalanPerDate: Record<string, number> = {};
    hafalan.forEach((h) => {
      hafalanPerDate[h.tanggal] = (hafalanPerDate[h.tanggal] || 0) + 1;
    });

    return { scoreCounts, hafalanPerDate };
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
            onClick={fetchData}
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

  // Data untuk bar chart hafalan per tanggal
  const chartDates = Object.keys(stats.hafalanPerDate).sort().slice(-7);
  const maxHafalan = Math.max(...chartDates.map((d) => stats.hafalanPerDate[d]), 1);

  // Data untuk distribusi nilai
  const nilaiOrder = ["A", "B", "C", "D", "L", "TL", "✓"];
  const nilaiLabels: Record<string, string> = {
    A: "Sangat Baik",
    B: "Baik",
    C: "Cukup",
    D: "Kurang",
    L: "Lancar",
    TL: "Tidak Lancar",
    "✓": "Hafal",
  };
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart Hafalan per Tanggal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-500" />
            Hafalan 7 Hari Terakhir
          </h3>
          {chartDates.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Belum ada data hafalan
            </p>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {chartDates.map((date) => {
                const count = stats.hafalanPerDate[date];
                const height = (count / maxHafalan) * 100;
                const d = new Date(date + "T00:00:00");
                const label = d.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <div
                    key={date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {count}
                    </span>
                    <div
                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
                          Adab: {t.adab}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {new Date(t.tanggal + "T00:00:00").toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                    </p>
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
