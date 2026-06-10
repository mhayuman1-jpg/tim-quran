"use client";

import { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, CheckCircle, UserCheck, BookOpen, Activity, FileImage, FileText, CreditCard, Repeat, TrendingUp, Megaphone, Newspaper, ArrowRight } from "lucide-react";
import Link from "next/link";
import StaffIDCard from "@/components/shared/StaffIDCard";
import MonthlyRekapTemplate from "@/components/features/dashboard/MonthlyRekapTemplate";
import { useToast } from "@/lib/toast";
import { useViewMode } from "@/hooks/useViewMode";
import { useProfil, useNavigation } from "@/hooks/useSWRFetcher";
import useSWR from "swr";

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
  const { data: session } = useSession();
  const { getEffectiveRole, viewAsRole, viewAsTeacherId } = useViewMode();
  const viewHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (viewAsRole === 'Tim_Quran') {
      h['x-view-mode'] = 'teaching';
      if (viewAsTeacherId) h['x-view-as-teacher-id'] = viewAsTeacherId;
    }
    return h;
  }, [viewAsRole, viewAsTeacherId]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<'png' | 'pdf' | null>(null);
  const { toast } = useToast();

  // SWR hooks untuk data sharing
  const { profil: profilData } = useProfil();
  const { items: navItems } = useNavigation();

  // Build navShortcuts dari SWR cached data
  const navShortcuts = useMemo(() => {
    if (navItems && Array.isArray(navItems) && navItems.length > 0) {
      return navItems.filter((it: any) => it.href && it.href !== '/').slice(0, 6)
        .map((it: any) => ({ id: it.id, label: it.label, href: it.href }));
    }
    return [];
  }, [navItems]);

  // SWR untuk stats
  const effectiveRole = getEffectiveRole(session?.user?.role as any);
  const isGuru = effectiveRole === 'Tim_Quran';
  const statsEndpoint = isGuru ? '/api/dashboard/stats-guru' : '/api/dashboard/stats';
  const { data: stats, error: statsError, isLoading: loading } = useSWR(
    session?.user ? [statsEndpoint, viewHeaders] : null,
    async ([url, headers]) => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (statsError && !errorMessage) {
    setErrorMessage("Terjadi kesalahan saat memuat data.");
  }

  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const sanitizeName = (name: string) =>
    name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleDownloadPng = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading('png');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `idcard-${sanitizeName(session?.user?.name ?? 'staff')}.png`;
      link.click();
      toast.success('ID Card berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh ID Card.');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cardRef.current || downloading) return;
    setDownloading('pdf');
    try {
      const { toPng } = await import('html-to-image');
      const { default: jsPDF } = await import('jspdf');

      const element = cardRef.current;
      const rect = element.getBoundingClientRect();
      const dataUrl = await toPng(element, {
        pixelRatio: 3,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat gambar ID Card'));
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85.6, 54],
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = img.width / img.height;
      let imgWidth = pageWidth;
      let imgHeight = pageWidth / ratio;

      if (imgHeight > pageHeight) {
        imgHeight = pageHeight;
        imgWidth = pageHeight * ratio;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      pdf.addImage(dataUrl, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save(`idcard-${sanitizeName(session?.user?.name ?? 'staff')}.pdf`);
      toast.success('ID Card PDF berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh ID Card PDF.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header greeting */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fff7ed 100%)', boxShadow: '0 8px 32px rgba(245,158,11,0.15)'}}>
        <div className="absolute right-6 top-0 bottom-0 flex items-center select-none pointer-events-none">
          <span className="text-amber-400/[0.06] font-serif leading-none" style={{fontSize: '8rem'}}>ﷲ</span>
        </div>
        <div className="relative z-10">
          <p className="text-slate-500 text-sm mb-1">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-0.5">{greeting} 👋</h1>
          <p className="text-slate-600 text-sm">Selamat datang di Panel Manajemen Tim Qur&apos;an</p>
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

      {/* Monthly Recap Template — Tim_Quran only */}
      {session?.user?.role === 'Tim_Quran' && <MonthlyRekapTemplate />}

      {/* ID Card Section — Kabid & Tim_Quran */}
      {session?.user && (session.user.role === 'Tim_Quran' || session.user.role === 'Kabid') && (
        <div className="rounded-2xl p-6" style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
              <CreditCard size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">ID Card Saya</p>
              <p className="text-xs text-slate-400">Unduh kartu identitas digital</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Preview — wrapped in cardRef div */}
            <div ref={cardRef} className="shrink-0">
              <StaffIDCard
                name={session.user.name}
                role={session.user.role as 'Kabid' | 'Tim_Quran'}
                photoUrl={session.user.photo_url}
                namaLembaga={profilData?.nama_lembaga ?? "Tim Qur'an"}
                logoUrl={profilData?.logo_url}
                namaSekolah={profilData?.nama_sekolah}
                logoSekolahUrl={profilData?.logo_sekolah_url}
                cardId="staff-id-card"
              />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Unduh ID Card dalam format gambar atau PDF siap cetak.
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleDownloadPng} disabled={downloading !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
                  {downloading === 'png' ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <FileImage size={15} />}
                  Unduh PNG
                </button>
                <button onClick={handleDownloadPdf} disabled={downloading !== null}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-60">
                  {downloading === 'pdf' ? (
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : <FileText size={15} />}
                  Unduh PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shortcut cards — Sekretaris */}
      {session?.user?.role === 'Sekretaris' && (
        <div className="rounded-2xl p-6" style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-700">Akses Cepat</p>
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Dalam pantauan Kabid
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(navShortcuts.length > 0 ? navShortcuts : [
              { id: 'siswa', label: 'Data Siswa', href: '/siswa' },
              { id: 'rekap', label: 'Rekap Bulanan', href: '/rekap' },
              { id: 'laporan', label: 'Laporan', href: '/laporan' },
              { id: 'pengumuman', label: 'Kelola Pengumuman', href: '/dashboard/pengumuman' },
              { id: 'artikel', label: 'Kelola Artikel', href: '/dashboard/kelola-artikel' },
            ]).map(item => {
              const ICON_MAP: Record<string, React.ReactNode> = {
                'Data Siswa': <Users size={18} />,
                'Rekap Bulanan': <Repeat size={18} />,
                'Laporan': <TrendingUp size={18} />,
                'Pengumuman': <Megaphone size={18} />,
                'Artikel': <Newspaper size={18} />,
              };
              const COLOR_MAP: Record<string, string> = {
                'Data Siswa': '#3b82f6', 'Rekap Bulanan': '#10b981', 'Laporan': '#f59e0b', 'Pengumuman': '#8b5cf6', 'Artikel': '#ec4899'
              };
              const icon = ICON_MAP[item.label] ?? <BookOpen size={18} />;
              const color = COLOR_MAP[item.label] ?? '#64748b';
              return (
                <Link key={item.id} href={item.href}
                  className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{background: `${color}15`, color}}>
                    {icon}
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{item.label}</span>
                  <ArrowRight size={14} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
