// src/app/page.tsx — Landing page Tim Qur'an (Premium Redesign)

export const revalidate = 60;

import React from 'react';
import { default as nextDynamic } from 'next/dynamic';
import Link from 'next/link';
import { AtSign, Mail, MapPin, Phone, PlayCircle, ArrowUpRight, BookOpen, Star, Users, TrendingUp, Calendar } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { IslamicPatternBg, CornerOrnament } from '@/components/features/IslamicDecorations';
import { createServerClient } from '@/lib/supabase/server';

const StudentProgressChart = nextDynamic(
  () => import('@/components/features/charts/StudentProgressChart'),
  { ssr: false }
);

const AiChatbot = nextDynamic(
  () => import('@/components/shared/AiChatbot'),
  { ssr: false }
);

const TestimonialBubble = nextDynamic(
  () => import('@/components/shared/TestimonialBubble'),
  { ssr: false }
);

interface MonthlyProgressPoint {
  month: string;
  tahfidz: number;
  tahsin: number;
}

function getSixMonthRange(): { label: string; key: string }[] {
  const today = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('id-ID', { month: 'short' });
    return { label, key };
  });
}

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return 'http://localhost:3000';
}

interface TestimonialItem {
  id: string;
  parent_name: string;
  child_name: string;
  batch: string | null;
  rating: number;
  message: string;
}

async function getTestimonials(): Promise<TestimonialItem[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/testimonials`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getMonthlyProgressData(): Promise<MonthlyProgressPoint[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/landing/monthly-progress`, { next: { revalidate: 60 } });
    if (!res.ok) {
      console.error('[LandingPage] Monthly progress API error:', res.status);
      return getSixMonthRange().map((month) => ({ month: month.label, tahfidz: 0, tahsin: 0 }));
    }
    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[LandingPage] getMonthlyProgressData error:', error);
    return getSixMonthRange().map((month) => ({ month: month.label, tahfidz: 0, tahsin: 0 }));
  }
}

async function getPageData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const supabase = createServerClient();
    const [profilResult, programsResult, agendasResult, pengumumanResult, artikelResult, galeriResult, santriResult, navResult] = await Promise.all([
      supabase.from('profil_website').select('*').limit(1).maybeSingle(),
      supabase.from('program').select('*').eq('is_active', true).order('urutan', { ascending: true }),
      supabase.from('agenda').select('*').eq('is_published', true).gte('tanggal', today).order('tanggal', { ascending: true }).limit(5),
      supabase.from('pengumuman').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('artikel').select('id,judul,slug,cover_url,published_at').eq('is_published', true).order('published_at', { ascending: false }).limit(6),
      supabase.from('galeri').select('*').eq('is_published', true).order('urutan', { ascending: true }).limit(8),
      supabase.from('santri').select('id,juz_terakhir').eq('status', 'Aktif').limit(500),
      supabase.from('navigation_items').select('*').eq('is_active', true).order('urutan', { ascending: true }),
    ]);
    const profil = profilResult?.data ?? null;
    const programs = Array.isArray(programsResult?.data) ? programsResult.data : [];
    const agendas = Array.isArray(agendasResult?.data) ? agendasResult.data : [];
    const pengumumans = Array.isArray(pengumumanResult?.data) ? pengumumanResult.data : [];
    const artikels = Array.isArray(artikelResult?.data) ? artikelResult.data : [];
    const galeris = Array.isArray(galeriResult?.data) ? galeriResult.data : [];
    const santriData = Array.isArray(santriResult?.data) ? santriResult.data : [];
    const navigation = Array.isArray(navResult?.data) ? navResult.data : [];
    const totalSantri = santriData.length;
    const [monthlyProgress, testimonials] = await Promise.all([
      getMonthlyProgressData(),
      getTestimonials(),
    ]);
    return { profil, programs, agendas, pengumumans, artikels, galeris, totalSantri, monthlyProgress, navigation, testimonials };
  } catch (error) {
    console.error('[LandingPage] getPageData error:', error);
    return { profil: null, programs: [], agendas: [], pengumumans: [], artikels: [], galeris: [], totalSantri: 0, navigation: [], testimonials: [] };
  }
}

const formatDate = (value: string | null | undefined): string => {
  try {
    return new Date(String(value)).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return String(value ?? '');
  }
};

export default async function LandingPage() {
  const { profil: pd, programs, agendas, pengumumans, artikels, totalSantri, monthlyProgress, navigation, testimonials } = await getPageData();
  const profil = pd ?? {
    nama_lembaga: "Tim Qur'an",
    deskripsi: "Program Tahfidz dan Tahsin Al-Qur'an yang berdedikasi mencetak generasi Qur'ani berakhlak mulia.",
    visi: 'Menjadi lembaga Tahfidz & Tahsin terdepan.',
    misi: ['Pembelajaran berkualitas', 'Mencetak hafidz berakhlak'],
    logo_url: null, nama_sekolah: null, alamat: null, email: null, telepon: null, instagram: null, youtube: null, facebook: null,
  };
  const activeNav = Array.isArray(navigation) ? navigation.filter((item) => item.is_active ?? true) : [];
  const programCards = Array.isArray(programs) ? programs.slice(0, 4) : [];
  const latestArticles = Array.isArray(artikels) ? artikels.slice(0, 3) : [];
  const latestAnnouncements = Array.isArray(pengumumans) ? pengumumans.slice(0, 3) : [];
  const latestAgendas = Array.isArray(agendas) ? agendas.slice(0, 3) : [];

  return (
    <div className="min-h-dvh bg-[#faf8f5] text-slate-800 selection:bg-amber-200/40">
      <PublicNavbar
        logoUrl={profil.logo_url ?? null}
        namaLembaga={profil.nama_lembaga ?? "Tim Qur'an"}
        namaSekolah={profil.nama_sekolah ?? undefined}
        navigationItems={activeNav}
      />

      <main>
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden pt-24 pb-14 sm:pt-36 sm:pb-20">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-50/60 via-[#faf8f5] to-[#faf8f5]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.06),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.04),transparent_50%)]" />
          <IslamicPatternBg opacityLight />

          <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              {/* Left: Text */}
              <div className="space-y-6 sm:space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-white/80 px-3.5 py-1.5 text-[11px] sm:text-xs font-medium tracking-wide text-amber-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Pendidikan Qur'ani Terpercaya
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.15] sm:leading-[1.1] tracking-tight text-slate-900">
                  Membangun Generasi{' '}
                  <span className="text-gradient-gold">Qur'ani</span>
                  <br />
                  dengan Misi Modern
                </h1>
                <p className="max-w-xl text-base sm:text-lg leading-relaxed text-slate-500">
                  {profil.deskripsi}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <Link
                    href="/profil"
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-5 sm:px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.97]"
                  >
                    Pelajari Lebih Lanjut
                    <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                  <Link
                    href="/profil"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-black/5 bg-white/80 px-5 sm:px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-black/10 hover:bg-white hover:shadow-md active:scale-[0.97]"
                  >
                    Hubungi Kami
                  </Link>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700">{totalSantri}</span> Santri Aktif
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1.5">
                    <Star size={14} className="text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700">4.9</span> Rating
                  </span>
                </div>
              </div>

              {/* Right: Feature cards bento */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div className="col-span-2 rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-premium">
                  <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                    <BookOpen size={15} className="text-amber-500 shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-amber-600">Pengajaran</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm sm:text-base">Hafalan terstruktur</p>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-400">Materi dirancang untuk progres rutin dan terukur.</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-premium">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-amber-600">Tajwid</span>
                  <p className="mt-1.5 sm:mt-2 font-semibold text-slate-900 text-sm sm:text-base">Guru profesional</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400">Pendampingan tajwid.</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-5 shadow-premium">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-amber-600">Akhlak</span>
                  <p className="mt-1.5 sm:mt-2 font-semibold text-slate-900 text-sm sm:text-base">Pembinaan karakter</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400">Lingkungan islami.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#faf8f5] to-transparent" />
        </section>

        {/* ─── TENTANG (asymmetric bento) ─── */}
        <section id="tentang" className="py-14 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                Tentang Kami
              </span>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="shell-card">
                <div className="inner-card space-y-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                      Siapa Kami
                    </h2>
                    <CornerOrnament className="hidden sm:block shrink-0" />
                  </div>
                  <p className="text-base leading-relaxed text-slate-500">
                    {profil.deskripsi}
                  </p>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Visi</span>
                      <p className="mt-2 font-medium text-slate-900">{profil.visi}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Misi</span>
                      <ul className="mt-2 space-y-1.5">
                        {Array.isArray(profil.misi) ? profil.misi.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            {item}
                          </li>
                        )) : <li className="text-sm text-slate-500">{String(profil.misi)}</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="shell-card">
                  <div className="inner-card">
                    <TrendingUp size={20} className="text-amber-500 mb-3" />
                    <p className="text-sm text-slate-400">Filosofi</p>
                    <p className="mt-1 font-semibold text-slate-900">Pembelajaran Berkelanjutan</p>
                    <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                      Setiap santri berhak mendapatkan pendidikan yang seimbang antara hafalan, tajwid, dan akhlak.
                    </p>
                  </div>
                </div>
                <div className="shell-card">
                  <div className="inner-card flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                      <Calendar size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Kelas Intensif</p>
                      <p className="text-sm text-slate-400">Pendampingan personal</p>
                    </div>
                  </div>
                </div>
                <div className="shell-card">
                  <div className="inner-card flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                      <Star size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Lingkungan Kondusif</p>
                      <p className="text-sm text-slate-400">Fokus dan disiplin</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROGRAM (feature grid, no eyebrow) ─── */}
        <section id="layanan" className="py-14 sm:py-24 bg-white/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Program Unggulan
              </h2>
              <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-sm sm:text-base text-slate-400">
                Program dan fitur unggulan untuk mendukung pembelajaran Al-Qur'an.
              </p>
            </div>
            {programCards.length > 0 ? (
              <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {programCards.map((program, idx) => (
                  <div key={program.id} className="group relative">
                    <div className="shell-card program-card">
                      <div className="inner-card flex flex-col min-h-[180px] sm:min-h-[220px] transition-all duration-300 group-hover:-translate-y-0.5">
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                          <BookOpen size={18} />
                        </div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Program</p>
                        <h3 className="mt-1.5 text-lg font-semibold text-slate-900">{program.nama ?? 'Program'}</h3>
                        <p className="mt-2 flex-1 text-sm text-slate-400 leading-relaxed line-clamp-3">
                          {program.deskripsi ? String(program.deskripsi) : 'Deskripsi singkat program.'}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-600 opacity-0 transition-all duration-300 group-hover:opacity-100">
                          Pelajari
                          <ArrowUpRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="shell-card max-w-md mx-auto">
                <div className="inner-card text-center text-slate-400">Belum ada program yang dipublikasikan.</div>
              </div>
            )}
          </div>
        </section>

        {/* ─── INFORMASI (full-width alternating) ─── */}
        <section id="informasi" className="py-14 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                Informasi
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Berita & Kegiatan Terkini
            </h2>

            {/* Artikel row */}
            <div className="mt-8 sm:mt-10 grid gap-6 sm:gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-4 sm:mb-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Artikel Terbaru</span>
                  <Link href="/artikel" className="text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors">
                    Lihat semua →
                  </Link>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {latestArticles.length > 0 ? latestArticles.map((article) => (
                    <Link key={article.id} href={`/artikel/${article.slug}`} className="group block">
                      <div className="shell-card">
                        <div className="inner-card transition-all duration-300 group-hover:-translate-y-0.5">
                          <p className="text-sm font-semibold text-slate-900 line-clamp-2">{article.judul}</p>
                          <p className="mt-2 text-xs text-slate-400">{formatDate(article.published_at ?? '')}</p>
                        </div>
                      </div>
                    </Link>
                  )) : (
                    <div className="shell-card">
                      <div className="inner-card text-sm text-slate-400">Belum ada artikel terbaru.</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                {/* Pengumuman */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Pengumuman</span>
                    <Link href="/pengumuman" className="text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors">
                      Lihat semua →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {latestAnnouncements.length > 0 ? latestAnnouncements.map((announce) => (
                      <div key={announce.id} className="shell-card">
                        <div className="inner-card !p-4">
                          <p className="text-sm font-semibold text-slate-900">{announce.judul}</p>
                          <p className="mt-1 text-xs text-slate-400 line-clamp-2">{String(announce.isi ?? '').slice(0, 100)}...</p>
                        </div>
                      </div>
                    )) : (
                      <div className="shell-card">
                        <div className="inner-card !p-4 text-sm text-slate-400">Belum ada pengumuman.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agenda */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">Agenda Mendatang</span>
                    <Link href="/agenda" className="text-xs font-medium text-amber-600 hover:text-amber-500 transition-colors">
                      Lihat semua →
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {latestAgendas.length > 0 ? latestAgendas.map((agenda) => (
                      <div key={agenda.id ?? agenda.tanggal} className="shell-card">
                        <div className="inner-card !p-4">
                          <p className="text-sm font-semibold text-slate-900">{agenda.judul ?? 'Agenda'}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDate(agenda.tanggal ?? agenda.created_at ?? '')}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="shell-card">
                        <div className="inner-card !p-4 text-sm text-slate-400">Belum ada agenda mendatang.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PROGRESS + STATISTIK (combined section) ─── */}
        <section id="progress" className="py-14 sm:py-24 bg-white/60">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Progres & Statistik
              </h2>
              <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-sm sm:text-base text-slate-400">
                Tren perkembangan santri dalam program Tahfidz dan Tahsin.
              </p>
            </div>

            <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_0.7fr]">
              {/* Chart */}
              <div className="shell-card">
                <div className="inner-card">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Tren Bulanan</h3>
                  <StudentProgressChart data={monthlyProgress ?? []} />
                </div>
              </div>

              {/* Sidebar + Stats */}
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { label: 'Santri Aktif', value: totalSantri, icon: Users, color: 'amber' },
                    { label: 'Agenda', value: Array.isArray(agendas) ? agendas.length : 0, icon: Calendar, color: 'emerald' },
                    { label: 'Artikel', value: Array.isArray(artikels) ? artikels.length : 0, icon: BookOpen, color: 'amber' },
                    { label: 'Pengumuman', value: Array.isArray(pengumumans) ? pengumumans.length : 0, icon: TrendingUp, color: 'emerald' },
                  ].map((item) => (
                    <div key={item.label} className="shell-card">
                      <div className="inner-card text-center">
                        <item.icon size={16} className={`mx-auto mb-1.5 sm:mb-2 ${item.color === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`} />
                        <p className="stat-value text-xl sm:text-2xl font-bold text-slate-900">{item.value}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Penilaian info */}
                <div className="shell-card">
                  <div className="inner-card">
                    <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Sistem Penilaian</p>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        <span><b className="text-slate-800">✓</b> = Hafal (100%)</span>
                        <span><b className="text-slate-800">A</b> = Sangat Baik (100%)</span>
                        <span><b className="text-slate-800">B</b> = Baik (80%)</span>
                        <span><b className="text-slate-800">C</b> = Cukup Baik (70%)</span>
                        <span><b className="text-slate-800">D</b> = Kurang Baik (55%)</span>
                      </div>
                      <p className="text-[11px] text-amber-600 font-semibold mt-2">Kelancaran: <b className="text-slate-800">L</b> = Lancar · <b className="text-slate-800">KL</b> = Kurang · <b className="text-slate-800">TL</b> = Tidak</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── TESTIMONI ─── */}
        <section id="testimoni" className="py-14 sm:py-24">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Apresiasi Orang Tua
              </h2>
              <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-sm sm:text-base text-slate-400">
                Testimoni dari para orang tua santri tentang pengalaman mereka.
              </p>
            </div>
            {testimonials.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {testimonials.map((item) => (
                  <div key={item.id} className="shell-card">
                    <div className="inner-card">
                      <div className="flex items-center gap-0.5 mb-4">
                        {Array.from({ length: 5 }, (_, i) => (
                          <svg key={i} className={`w-4 h-4 ${i < item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed italic">"{item.message}"</p>
                      <div className="mt-5 flex items-center gap-3 border-t border-black/5 pt-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-sm font-bold text-amber-700">
                          {item.parent_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{item.parent_name}</p>
                          <p className="text-xs text-slate-400">Orang Tua dari {item.child_name}{item.batch ? ` · Angkatan ${item.batch}` : ''}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="shell-card max-w-md mx-auto">
                <div className="inner-card text-center text-slate-400 py-8">Belum ada testimoni</div>
              </div>
            )}
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative overflow-hidden py-16 sm:py-28">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.06),transparent_60%)]" />
          <IslamicPatternBg opacityLight />
          <div className="relative mx-auto max-w-6xl px-5 sm:px-6 text-center">
            <div className="mx-auto max-w-2xl">
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Siap Bergabung?
              </h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
                Temukan program terbaik untuk peningkatan hafalan, tajwid, dan akhlak anak di lingkungan belajar yang nyaman.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/program"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all duration-500 hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.97]"
                >
                  Pelajari Program
                  <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  href="/profil"
                  className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-7 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:border-black/10 hover:bg-white hover:shadow-md active:scale-[0.97]"
                >
                  Hubungi Kami
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-black/5 bg-white/50">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-14 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 text-white shadow-md">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{profil.nama_lembaga}</p>
                  <p className="text-xs text-amber-600/70">{profil.nama_sekolah ?? 'Tahfidz & Tahsin'}</p>
                </div>
              </div>
              <p className="max-w-sm text-sm text-slate-400 leading-relaxed">{profil.deskripsi}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Kontak</span>
              <div className="mt-5 space-y-3">
                {profil.alamat && (
                  <div className="flex items-start gap-3 text-sm">
                    <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-slate-400 text-xs">Alamat</p>
                      <p className="text-slate-700">{profil.alamat}</p>
                    </div>
                  </div>
                )}
                {profil.telepon && (
                  <div className="flex items-start gap-3 text-sm">
                    <Phone size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-slate-400 text-xs">Telepon</p>
                      <p className="text-slate-700">{profil.telepon}</p>
                    </div>
                  </div>
                )}
                {profil.email && (
                  <div className="flex items-start gap-3 text-sm">
                    <Mail size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-slate-400 text-xs">Email</p>
                      <p className="text-slate-700">{profil.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-600">Sosial Media</span>
              <div className="mt-5 space-y-2">
                {profil.facebook ? (
                  <Link href={profil.facebook.startsWith('http') ? profil.facebook : `https://facebook.com/${String(profil.facebook).replace(/^\//, '')}`}
                    className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm transition-all duration-300 hover:border-amber-200/50 hover:bg-amber-50/50 hover:shadow-sm"
                    target="_blank" rel="noreferrer noopener">
                    <svg className="text-slate-400 group-hover:text-amber-500 transition-colors" viewBox="0 0 24 24" fill="currentColor" width={16} height={16}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{String(profil.facebook).replace(/^https?:\/\//, '')}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm opacity-60">
                    <svg className="text-slate-400" viewBox="0 0 24 24" fill="currentColor" width={16} height={16}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-slate-400">/timquran</span>
                  </div>
                )}
                <Link
                  href={profil.instagram ? (profil.instagram.startsWith('http') ? profil.instagram : `https://instagram.com/${String(profil.instagram).replace(/^@/, '').replace(/^\//, '')}`) : 'https://instagram.com'}
                  className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm transition-all duration-300 hover:border-amber-200/50 hover:bg-amber-50/50 hover:shadow-sm"
                  target="_blank" rel="noreferrer noopener">
                  <AtSign size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                  <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{profil.instagram ? String(profil.instagram) : '@timquran'}</span>
                </Link>
                {profil.youtube && (
                  <Link href={profil.youtube.startsWith('http') ? profil.youtube : `https://youtube.com/${String(profil.youtube).replace(/^\//, '')}`}
                    className="group flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-2.5 text-sm transition-all duration-300 hover:border-amber-200/50 hover:bg-amber-50/50 hover:shadow-sm"
                    target="_blank" rel="noreferrer noopener">
                    <PlayCircle size={16} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{String(profil.youtube).replace(/^https?:\/\//, '')}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-black/5 pt-6 text-xs text-slate-400">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>&copy; {new Date().getFullYear()} {profil.nama_lembaga}. Semua hak dilindungi.</span>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="transition hover:text-slate-600">Beranda</Link>
                <Link href="/profil" className="transition hover:text-slate-600">Profil</Link>
                <Link href="/program" className="transition hover:text-slate-600">Program</Link>
                <Link href="/pengumuman" className="transition hover:text-slate-600">Pengumuman</Link>
                <Link href="/artikel" className="transition hover:text-slate-600">Artikel</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
      <AiChatbot />
      <TestimonialBubble />
    </div>
  );
}
