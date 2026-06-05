"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, UserCheck, BookOpen, Activity } from "lucide-react";

interface JuzSummary { juz: number; count: number; }
interface DashboardStats {
  totalSantriAktif: number;
  kehadiranHariIni: { hadir: number; total: number; persentase: number; };
  ringkasanJuz: JuzSummary[];
  jumlahTimAktif: number;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 animate-pulse" style={{background: 'white', border: '1px solid #f1f5f9'}}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-slate-100" />
          <div className="h-7 w-16 rounded bg-slate-200" />
        </div>
        <div className="w-11 h-11 rounded-xl bg-slate-100" />
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100" />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  progress?: number;
}

function StatCard({ title, value, subtitle, icon, gradient, accent, progress }: StatCardProps) {
  return (
    <div className="rounded-2xl p-6 relative overflow-hidden hover:-translate-y-1 transition-all duration-200"
      style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
      {/* Subtle gradient corner */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-40"
        style={{background: `radial-gradient(circle at top right, ${accent}30, transparent 70%)`}} />

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{background: gradient}}>
          {icon}
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{subtitle}</span>
            <span style={{color: accent}}>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{width: `${progress}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`}} />
          </div>
        </div>
      )}

      {progress === undefined && subtitle && (
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function JuzChart({ data, loading }: { data: JuzSummary[]; loading: boolean }) {
  if (loading) return (
    <div className="rounded-2xl p-6 animate-pulse" style={{background: 'white', border: '1px solid #f1f5f9'}}>
      <div className="h-4 w-32 rounded bg-slate-200 mb-6" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-3 w-12 rounded bg-slate-100" />
            <div className="flex-1 h-5 rounded-lg bg-slate-100" />
            <div className="h-3 w-6 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const gradients = [
    'linear-gradient(90deg, #6366f1, #8b5cf6)',
    'linear-gradient(90deg, #3b82f6, #6366f1)',
    'linear-gradient(90deg, #06b6d4, #3b82f6)',
    'linear-gradient(90deg, #10b981, #06b6d4)',
    'linear-gradient(90deg, #f59e0b, #f97316)',
  ];

  return (
    <div className="rounded-2xl p-6" style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
          <BookOpen size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Distribusi Hafalan</p>
          <p className="text-xs text-slate-400">Capaian juz per santri</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8">
          <Activity size={32} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Belum ada data hafalan</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {data.map(({ juz, count }, i) => {
            const pct = (count / maxCount) * 100;
            const grad = gradients[i % gradients.length];
            return (
              <div key={juz} className="flex items-center gap-3 group">
                <span className="text-xs font-semibold text-slate-400 w-10 shrink-0 text-right">Juz {juz}</span>
                <div className="flex-1 bg-slate-50 rounded-lg h-6 overflow-hidden relative">
                  <div className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
                    style={{width: `${Math.max(pct, 8)}%`, background: grad}}>
                    {count > 0 && <span className="text-[10px] font-bold text-white ml-auto">{count}</span>}
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-8 text-right shrink-0">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "forbidden") setErrorMessage("Akses tidak diizinkan.");
  }, []);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();
        if (!res.ok) setErrorMessage(json.message || "Gagal mengambil data dashboard.");
        else setStats(json);
      } catch { setErrorMessage("Terjadi kesalahan saat memuat data."); }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header greeting */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)', boxShadow: '0 8px 32px rgba(99,102,241,0.2)'}}>
        <div className="absolute right-6 top-0 bottom-0 flex items-center select-none pointer-events-none">
          <span className="text-white/[0.04] font-serif leading-none" style={{fontSize: '8rem'}}>ﷲ</span>
        </div>
        <div className="relative z-10">
          <p className="text-indigo-300/70 text-sm mb-1">{today}</p>
          <h1 className="text-2xl font-bold text-white mb-0.5">{greeting} 👋</h1>
          <p className="text-indigo-200/60 text-sm">Selamat datang di Panel Manajemen Tim Qur&apos;an</p>
        </div>
      </div>

      {/* Error */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
          style={{background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626'}}>
          {errorMessage}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <StatCard
              title="Santri Aktif"
              value={stats?.totalSantriAktif ?? 0}
              subtitle="Terdaftar & aktif"
              gradient="linear-gradient(135deg, #dbeafe, #bfdbfe)"
              accent="#3b82f6"
              icon={<Users size={18} style={{color: '#3b82f6'}} />}
            />
            <StatCard
              title="Kehadiran Hari Ini"
              value={`${stats?.kehadiranHariIni.persentase ?? 0}%`}
              subtitle={`${stats?.kehadiranHariIni.hadir ?? 0} / ${stats?.kehadiranHariIni.total ?? 0} siswa`}
              progress={stats?.kehadiranHariIni.persentase ?? 0}
              gradient="linear-gradient(135deg, #d1fae5, #a7f3d0)"
              accent="#10b981"
              icon={<CheckCircle size={18} style={{color: '#10b981'}} />}
            />
            <StatCard
              title="Tim Aktif"
              value={stats?.jumlahTimAktif ?? 0}
              subtitle="Anggota Tim Qur'an"
              gradient="linear-gradient(135deg, #ede9fe, #ddd6fe)"
              accent="#8b5cf6"
              icon={<UserCheck size={18} style={{color: '#8b5cf6'}} />}
            />
          </>
        )}
      </div>

      {/* Juz chart */}
      <JuzChart data={stats?.ringkasanJuz ?? []} loading={loading} />
    </div>
  );
}
