'use client';
export const dynamic = 'force-dynamic';

// src/app/(dashboard)/dashboard-guru/page.tsx
// Dashboard Guru — tampilan seperti dashboard utama, tapi HANYA data siswa yang diampu

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Users, CheckCircle, BookOpen, Activity, FileText, CreditCard, FileImage, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import StaffIDCard from '@/components/shared/StaffIDCard';
import { useToast } from '@/lib/toast';

interface JuzSummary { juz: number; count: number; }

interface HafalanItem {
  id: string;
  student_id: string;
  date: string;
  surah: string;
  ayat: string;
  juz: number;
  hizb: number;
  page: number;
  lancar: string;
  makhroj: string;
  tajwid: string;
  catatan: string;
  santri: { nama: string } | null;
}

interface TahsinItem {
  id: string;
  student_id: string;
  date: string;
  halaman: string;
  keterangan: string;
  kelancaran: string;
  makhroj: string;
  tajwid: string;
  adab: string;
  catatan: string;
  santri: { nama: string } | null;
}

interface DashboardGuruStats {
  totalSantriAktif: number;
  kehadiranHariIni: { hadir: number; total: number; persentase: number; };
  ringkasanJuz: JuzSummary[];
  recentHafalan: HafalanItem[];
  recentTahsin: TahsinItem[];
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

function StatCard({ title, value, subtitle, icon, gradient, accent, progress }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl p-6 relative overflow-hidden hover:-translate-y-1 transition-all duration-200"
      style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
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
          <p className="text-xs text-slate-400">Capaian juz per siswa yang diampu</p>
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

export default function DashboardGuruPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardGuruStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilData, setProfilData] = useState<{ nama_lembaga?: string; logo_url?: string; nama_sekolah?: string; logo_sekolah_url?: string } | null>(null);

  useEffect(() => {
    fetch('/api/website/profil')
      .then(r => r.json())
      .then(d => setProfilData(d.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch('/api/dashboard/stats-guru');
        const json = await res.json();
        setStats(json);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    fetchStats();
  }, []);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const handleDownloadPng = async () => {
    try {
      const el = document.getElementById('guru-id-card');
      if (!el) return;
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { pixelRatio: 3 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `idcard-${(session?.user?.name ?? 'guru').toLowerCase().replace(/\s+/g, '-')}.png`;
      link.click();
      toast.success('ID Card berhasil diunduh.');
    } catch { toast.error('Gagal mengunduh ID Card.'); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header greeting */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 60%, #fff7ed 100%)', boxShadow: '0 8px 32px rgba(245,158,11,0.15)'}}>
        <div className="absolute right-6 top-0 bottom-0 flex items-center select-none pointer-events-none">
          <span className="text-amber-400/[0.06] font-serif leading-none" style={{fontSize: '8rem'}}>&#1757;</span>
        </div>
        <div className="relative z-10">
          <p className="text-slate-500 text-sm mb-1">{today}</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-0.5">{greeting} &#x1F44B;</h1>
          <p className="text-slate-600 text-sm">Dashboard Anda — data siswa yang Anda ampukan</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : (
          <>
            <StatCard
              title="Siswa Diampu"
              value={stats?.totalSantriAktif ?? 0}
              subtitle="Siswa aktif Anda"
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
              title="Hafalan Terakhir"
              value={stats?.recentHafalan?.length ?? 0}
              subtitle="Pencatatan minggu ini"
              gradient="linear-gradient(135deg, #ede9fe, #ddd6fe)"
              accent="#8b5cf6"
              icon={<BookOpen size={18} style={{color: '#8b5cf6'}} />}
            />
          </>
        )}
      </div>

      {/* Juz chart */}
      <JuzChart data={stats?.ringkasanJuz ?? []} loading={loading} />

      {/* Recent Hafalan */}
      {stats && stats.recentHafalan.length > 0 && (
        <div className="rounded-2xl p-6" style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981, #06b6d4)'}}>
              <BookOpen size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Hafalan Terakhir</p>
              <p className="text-xs text-slate-400">Pencatatan terbaru dari siswa Anda</p>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {stats.recentHafalan.map(h => (
              <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{(h.santri as any)?.nama ?? '-'}</p>
                  <p className="text-xs text-slate-400">{h.surah} {h.ayat ? `Ayat ${h.ayat}` : ''} — {h.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-amber-600">{h.lancar || '-'}</p>
                  <p className="text-[10px] text-slate-400">Juz {h.juz}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Tahsin */}
      {stats && stats.recentTahsin.length > 0 && (
        <div className="rounded-2xl p-6" style={{background: 'white', border: '1px solid #f1f5f9', boxShadow: '0 2px 16px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b, #f97316)'}}>
              <Activity size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tahsin Terakhir</p>
              <p className="text-xs text-slate-400">Pencatatan tahsin terbaru</p>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {stats.recentTahsin.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{(t.santri as any)?.nama ?? '-'}</p>
                  <p className="text-xs text-slate-400">{t.halaman || '-'} — {t.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-blue-600">{t.kelancaran || '-'}</p>
                  <p className="text-[10px] text-slate-400">{t.keterangan || '-'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links — Hanya akses guru */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Data Siswa', href: '/siswa', icon: <Users size={16} />, color: 'from-blue-500 to-indigo-500' },
          { label: 'Hafalan & Tahsin', href: '/tahsin', icon: <BookOpen size={16} />, color: 'from-amber-500 to-amber-400' },
          { label: 'Raport', href: '/raport', icon: <FileText size={16} />, color: 'from-purple-500 to-violet-500' },
          { label: 'Kirim Laporan', href: '/laporan-kirim', icon: <CheckCircle size={16} />, color: 'from-amber-500 to-orange-500' },
        ].map(({ label, href, icon, color }) => (
          <Link key={href} href={href}
            className="bg-white rounded-xl border border-slate-100 p-4 hover:-translate-y-1 transition-all group">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-r ${color} flex items-center justify-center mb-3`}>
              {icon}
            </div>
            <p className="text-sm font-semibold text-slate-700">{label}</p>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 mt-1 transition-colors" />
          </Link>
        ))}
      </div>

      {/* ID Card Section */}
      {session?.user && (
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
            <div id="guru-id-card" className="shrink-0">
              <StaffIDCard
                name={session.user.name}
                role={session.user.role as 'Kabid' | 'Tim_Quran' | 'Sekretaris' | 'Bendahara'}
                photoUrl={session.user.photo_url}
                namaLembaga={profilData?.nama_lembaga ?? "Tim Qur'an"}
                logoUrl={profilData?.logo_url}
                namaSekolah={profilData?.nama_sekolah}
                logoSekolahUrl={profilData?.logo_sekolah_url}
                cardId="guru-id-card"
              />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Unduh ID Card dalam format gambar.</p>
              <button onClick={handleDownloadPng}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white'}}>
                <FileImage size={15} />
                Unduh PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
