"use client";
export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState, memo } from "react";
import { useSession } from "next-auth/react";
import { Users, CheckCircle, UserCheck, BookOpen, Activity, FileImage, FileText, CreditCard, Repeat, TrendingUp, Megaphone, Newspaper, ArrowRight } from "lucide-react";
import Link from "next/link";
import StaffIDCard from "@/components/shared/StaffIDCard";
import { useToast } from "@/lib/toast";
import { useViewMode } from "@/hooks/useViewMode";
import { useProfil, useNavigation } from "@/hooks/useSWRFetcher";
import useSWR from "swr";

interface JuzSummary { juz: number; count: number; }
interface DashboardStats {
  totalSantriAktif: number;
  kehadiranHariIni: { hadir: number; total: number; persentase: number; tanggal?: string; };
  ringkasanJuz: JuzSummary[];
  jumlahTimAktif: number;
}

function SkeletonCard() {
  return (
    <div className="shell-card animate-pulse">
      <div className="inner-card">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-black/5" />
          <div className="h-8 w-16 rounded bg-black/5" />
          <div className="h-2 w-full rounded-full bg-black/5" />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  progress?: number;
}

const StatCard = memo(function StatCard({ title, value, subtitle, icon, accent, progress }: StatCardProps) {
  return (
    <div className="shell-card group">
      <div className="inner-card transition-all duration-300 group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: `${accent}15` }}>
            <div style={{ color: accent }}>{icon}</div>
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>{subtitle}</span>
              <span className="font-semibold" style={{ color: accent }}>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${accent}60, ${accent})` }} />
            </div>
          </div>
        )}
        {progress === undefined && subtitle && (
          <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
});

const JuzChart = memo(function JuzChart({ data, loading }: { data: JuzSummary[]; loading: boolean }) {
  if (loading) return (
    <div className="shell-card animate-pulse">
      <div className="inner-card">
        <div className="h-4 w-32 rounded bg-black/5 mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-12 rounded bg-black/5" />
              <div className="flex-1 h-6 rounded-lg bg-black/5" />
              <div className="h-3 w-6 rounded bg-black/5" />
            </div>
          ))}
        </div>
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
    <div className="shell-card">
      <div className="inner-card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Distribusi Hafalan</p>
            <p className="text-xs text-slate-400">Capaian juz per santri</p>
          </div>
        </div>
        {data.length === 0 ? (
          <div className="text-center py-10">
            <Activity size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada data hafalan</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 scroll-smooth-touch">
            {data.map(({ juz, count }, i) => {
              const pct = (count / maxCount) * 100;
              const grad = gradients[i % gradients.length];
              return (
                <div key={juz} className="flex items-center gap-3 group">
                  <span className="text-[11px] font-semibold text-slate-400 w-10 shrink-0 text-right">Juz {juz}</span>
                  <div className="flex-1 bg-black/[0.03] rounded-lg h-7 overflow-hidden relative">
                    <div className="h-full rounded-lg flex items-center px-2 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 8)}%`, background: grad }}>
                      {count > 0 && <span className="text-[10px] font-bold text-white ml-auto">{count}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

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
  const [greetingPlayed, setGreetingPlayed] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      const a = new Audio("/audio/dashboard-login.mp3");
      a.volume = 1;
      a.preload = "auto";
      audioRef.current = a;
      setAudioReady(true);
    }
  }, []);

  useEffect(() => {
    if (!session?.user || greetingPlayed || !audioRef.current) return;
    const tryAutoPlay = async () => {
      try {
        audioRef.current!.muted = true;
        await audioRef.current!.play();
        audioRef.current!.muted = false;
        audioRef.current!.currentTime = 0;
        await audioRef.current!.play();
        setGreetingPlayed(true);
      } catch {
        setAudioBlocked(true);
      }
    };
    tryAutoPlay();
  }, [session?.user, greetingPlayed]);

  const { profil: profilData } = useProfil();
  const { items: navItems } = useNavigation();

  const navShortcuts = useMemo(() => {
    if (navItems && Array.isArray(navItems) && navItems.length > 0) {
      return navItems.filter((it: any) => it.href && it.href !== '/').slice(0, 6)
        .map((it: any) => ({ id: it.id, label: it.label, href: it.href }));
    }
    return [];
  }, [navItems]);

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
        orientation: 'portrait',
        unit: 'mm',
        format: [74, 105],
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
    <div className="space-y-5 sm:space-y-6 max-w-5xl">
      {/* Greeting banner */}
      <div className="shell-card">
        <div className="inner-card relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 select-none pointer-events-none opacity-[0.04]">
            <span className="font-arabic leading-none" style={{ fontSize: '7rem' }}>ﷲ</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs text-slate-400 mb-1">{today}</p>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{greeting}, <span className="text-gradient-gold">{session?.user?.name ?? 'Pengguna'}</span></h1>
            <p className="text-sm text-slate-400 mt-0.5">Selamat datang di Panel Manajemen Tim Qur&apos;an</p>
          </div>
        </div>
      </div>

      {/* Audio greeting fallback */}
      {audioBlocked && session?.user && (
        <button
          onClick={async () => {
            if (audioRef.current) {
              try {
                audioRef.current.muted = true;
                await audioRef.current.play();
                audioRef.current.muted = false;
                audioRef.current.currentTime = 0;
                await audioRef.current.play();
                setGreetingPlayed(true);
                setAudioBlocked(false);
              } catch {
                setAudioBlocked(true);
              }
            }
          }}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-4 flex items-center justify-center gap-3 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 animate-pulse"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold">Klik untuk mendengarkan sapaan</span>
        </button>
      )}

      {/* Error */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm bg-red-50/80 border border-red-200/50 text-red-600">
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
              accent="#3b82f6"
              icon={<Users size={17} />}
            />
            <StatCard
              title={stats?.kehadiranHariIni?.tanggal === today ? "Kehadiran Hari Ini" : "Kehadiran Terakhir"}
              value={`${stats?.kehadiranHariIni.persentase ?? 0}%`}
              subtitle={`${stats?.kehadiranHariIni.hadir ?? 0} / ${stats?.kehadiranHariIni.total ?? 0} siswa`}
              progress={stats?.kehadiranHariIni.persentase ?? 0}
              accent="#10b981"
              icon={<CheckCircle size={17} />}
            />
            <StatCard
              title="Tim Aktif"
              value={stats?.jumlahTimAktif ?? 0}
              subtitle="Anggota Tim Qur'an"
              accent="#8b5cf6"
              icon={<UserCheck size={17} />}
            />
          </>
        )}
      </div>

      {/* Juz chart */}
      <JuzChart data={stats?.ringkasanJuz ?? []} loading={loading} />

      {/* ID Card Section */}
      {session?.user && session.user.role !== 'Wali_Murid' && (
        <div className="shell-card">
          <div className="inner-card">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <CreditCard size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">ID Card Saya</p>
                <p className="text-xs text-slate-400">Unduh kartu identitas digital</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div ref={cardRef} className="shrink-0">
                <StaffIDCard
                  name={session.user.name}
                  role={session.user.role as 'Kabid' | 'Tim_Quran' | 'Sekretaris' | 'Bendahara'}
                  photoUrl={session.user.photo_url}
                  namaLembaga={profilData?.nama_lembaga ?? "Tim Qur'an"}
                  logoUrl={profilData?.logo_url}
                  namaSekolah={profilData?.nama_sekolah}
                  logoSekolahUrl={profilData?.logo_sekolah_url}
                  cardId="staff-id-card"
                />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  Unduh ID Card dalam format gambar atau PDF siap cetak.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownloadPng} disabled={downloading !== null}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60 active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {downloading === 'png' ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <FileImage size={15} />}
                    Unduh PNG
                  </button>
                  <button onClick={handleDownloadPdf} disabled={downloading !== null}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-black/5 text-slate-700 bg-white/60 hover:bg-white hover:shadow-sm transition-all disabled:opacity-60 active:scale-[0.97]">
                    {downloading === 'pdf' ? (
                      <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : <FileText size={15} />}
                    Unduh PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sekretaris shortcuts */}
      {session?.user?.role === 'Sekretaris' && (
        <div className="shell-card">
          <div className="inner-card">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700">Akses Cepat</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-full">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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
                  'Data Siswa': <Users size={16} />,
                  'Rekap Bulanan': <Repeat size={16} />,
                  'Laporan': <TrendingUp size={16} />,
                  'Pengumuman': <Megaphone size={16} />,
                  'Artikel': <Newspaper size={16} />,
                };
                const COLOR_MAP: Record<string, string> = {
                  'Data Siswa': '#3b82f6', 'Rekap Bulanan': '#10b981', 'Laporan': '#f59e0b', 'Pengumuman': '#8b5cf6', 'Artikel': '#ec4899'
                };
                const icon = ICON_MAP[item.label] ?? <BookOpen size={16} />;
                const color = COLOR_MAP[item.label] ?? '#64748b';
                return (
                  <Link key={item.id} href={item.href}
                    className="group flex items-center gap-3 p-3.5 rounded-xl border border-black/5 bg-white/60 hover:bg-white hover:border-amber-200/50 hover:shadow-sm transition-all">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, color }}>
                      {icon}
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                    <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-slate-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
