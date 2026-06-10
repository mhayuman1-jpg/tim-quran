// src/app/page.tsx — Landing page baru Tim Qur'an

export const dynamic = 'force-dynamic';
export const revalidate = 60;

import React from 'react';
import { default as nextDynamic } from 'next/dynamic';
import Link from 'next/link';
import { AtSign, Globe, Mail, MapPin, Phone, PlayCircle } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { IslamicPatternBg, OrnamentalDivider, CornerOrnament } from '@/components/features/IslamicDecorations';
import { ScrollAnimatedCard, ScrollAnimatedItem, ScrollAnimatedSection } from '@/components/features/AnimatedComponents';
import { createServerClient } from '@/lib/supabase/server';

const StudentProgressChart = nextDynamic(
  () => import('@/components/features/charts/StudentProgressChart'),
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
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  return 'http://localhost:3000';
}

async function getMonthlyProgressData(): Promise<MonthlyProgressPoint[]> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/landing/monthly-progress`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('[LandingPage] Monthly progress API error:', res.status);
      return getSixMonthRange().map((month) => ({
        month: month.label,
        tahfidz: 0,
        tahsin: 0,
      }));
    }

    const json = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[LandingPage] getMonthlyProgressData error:', error);
    return getSixMonthRange().map((month) => ({
      month: month.label,
      tahfidz: 0,
      tahsin: 0,
    }));
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
    const monthlyProgress = await getMonthlyProgressData();

    return {
      profil,
      programs,
      agendas,
      pengumumans,
      artikels,
      galeris,
      totalSantri,
      monthlyProgress,
      navigation,
    };
  } catch (error) {
    console.error('[LandingPage] getPageData error:', error);
    return {
      profil: null,
      programs: [],
      agendas: [],
      pengumumans: [],
      artikels: [],
      galeris: [],
      totalSantri: 0,
      navigation: [],
    };
  }
}

const formatDate = (value: string | null | undefined): string => {
  try {
    return new Date(String(value)).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(value ?? '');
  }
};

export default async function LandingPage() {
  const { profil: pd, programs, agendas, pengumumans, artikels, totalSantri, monthlyProgress, navigation } = await getPageData();
  const profil = pd ?? {
    nama_lembaga: "Tim Qur'an",
    deskripsi: "Program Tahfidz dan Tahsin Al-Qur'an yang berdedikasi mencetak generasi Qur'ani berakhlak mulia.",
    visi: 'Menjadi lembaga Tahfidz & Tahsin terdepan.',
    misi: ['Pembelajaran berkualitas', 'Mencetak hafidz berakhlak'],
    logo_url: null,
    nama_sekolah: null,
    alamat: null,
    email: null,
    telepon: null,
    instagram: null,
    youtube: null,
    facebook: null,
  };

  const activeNav = Array.isArray(navigation)
    ? navigation.filter((item) => item.is_active ?? true)
    : [];

  const programCards = Array.isArray(programs) ? programs.slice(0, 4) : [];
  const latestArticles = Array.isArray(artikels) ? artikels.slice(0, 3) : [];
  const latestAnnouncements = Array.isArray(pengumumans) ? pengumumans.slice(0, 3) : [];
  const latestAgendas = Array.isArray(agendas) ? agendas.slice(0, 3) : [];

  const testimonials = [
    { name: 'Ustadz Ahmad', role: 'Pengajar', quote: 'Lingkungan pembelajaran sangat nyaman dan dukungannya luar biasa.' },
    { name: 'Siti Fatimah', role: 'Orang Tua Santri', quote: 'Anak saya semakin percaya diri dan disiplin sejak belajar di sini.' },
  ];

  return (
    <div className="min-h-dvh bg-amber-50 text-slate-800">
      <PublicNavbar
        logoUrl={profil.logo_url ?? null}
        namaLembaga={profil.nama_lembaga ?? "Tim Qur'an"}
        namaSekolah={profil.nama_sekolah ?? undefined}
        navigationItems={activeNav}
      />

      <main className="pt-16">
        <section className="relative overflow-hidden px-6 pb-24 pt-28 text-slate-900"
          style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)', backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.08), transparent 16%), radial-gradient(circle at 85% 15%, rgba(245,158,11,0.06), transparent 12%), radial-gradient(circle at 50% 110%, rgba(217,119,6,0.05), transparent 24%)'}}>
          <IslamicPatternBg opacityLight />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_30%)]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-amber-50/90 to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.01),transparent_40%,rgba(0,0,0,0.01))]" />
          <div className="absolute right-0 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-amber-400/8 blur-3xl" />
          <div className="absolute left-12 top-24 h-40 w-40 rounded-full bg-amber-400/8 blur-3xl" />
          <div className="relative mx-auto max-w-6xl">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.32em] text-amber-600">
                <span className="h-2 w-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" /> Pendidikan Qur'ani Terpercaya
              </span>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                Membangun Generasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-amber-600 to-islamic-500">Qur'ani</span> dengan Misi Modern
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">{profil.deskripsi}</p>
              <div className="flex flex-col gap-3 sm:flex-row items-start sm:items-center">
                <Link href="/profil" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-3 text-base font-semibold text-white shadow-xl shadow-amber-500/25 transition hover:opacity-95 hover:-translate-y-0.5">
                  Pelajari Lebih Lanjut
                </Link>
                <Link href="/profil" className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-amber-50">
                  Hubungi Kami
                </Link>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.28em] text-amber-600 shadow-lg shadow-amber-900/5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                  100+ santri Qur'ani
                </span>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-lg shadow-amber-900/5 transition hover:-translate-y-1 hover:border-amber-400/30">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Pengajaran</p>
                  <p className="mt-3 font-semibold text-slate-900">Hafalan terstruktur</p>
                  <p className="mt-2 text-slate-500 text-sm">Materi dirancang untuk progres rutin dan terukur.</p>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-lg shadow-amber-900/5 transition hover:-translate-y-1 hover:border-amber-400/30">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Tajwid</p>
                  <p className="mt-3 font-semibold text-slate-900">Guru profesional</p>
                  <p className="mt-2 text-slate-500 text-sm">Pendampingan tepat dalam ilmu tajwid dan bacaan.</p>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-lg shadow-amber-900/5 transition hover:-translate-y-1 hover:border-amber-400/30">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Akhlak</p>
                  <p className="mt-3 font-semibold text-slate-900">Pembinaan karakter</p>
                  <p className="mt-2 text-slate-500 text-sm">Lingkungan islami yang mendukung disiplin dan etika.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-6 top-6"><CornerOrnament /></div>
          <div className="absolute right-6 top-6"><CornerOrnament className="scale-x-[-1]" /></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-50/90 to-transparent" />
        </section>

        <section id="tentang" className="bg-amber-50/80 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollAnimatedCard className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600 animate-on-scroll in-view">Tentang Singkat</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 animate-on-scroll in-view-delay-1">Siapa kami dan apa misi kami</h2>
            </ScrollAnimatedCard>
            <div className="grid gap-8 lg:grid-cols-[0.95fr_0.65fr]">
              <ScrollAnimatedItem className="relative rounded-[32px] border border-amber-100 bg-white p-10 shadow-2xl shadow-amber-900/5 hover-lift">
                <CornerOrnament className="absolute top-3 right-3" />
                <p className="text-slate-600 leading-relaxed">{profil.deskripsi}</p>
                <div className="mt-8 space-y-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-amber-600">Visi</p>
                    <p className="mt-2 text-slate-900">{profil.visi}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-amber-600">Misi</p>
                    <ul className="mt-2 space-y-2 text-slate-600">
                      {Array.isArray(profil.misi) ? profil.misi.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </li>
                      )) : <li>{String(profil.misi)}</li>}
                    </ul>
                  </div>
                </div>
              </ScrollAnimatedItem>
              <ScrollAnimatedItem index={1} className="relative rounded-[32px] border border-amber-100 bg-white/95 p-10 shadow-2xl shadow-amber-900/5 hover-lift">
                <CornerOrnament className="absolute top-3 right-3" />
                <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Filosofi Kami</p>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">Pembelajaran Al-Qur'an yang Berkelanjutan</h3>
                <p className="mt-4 text-slate-600 leading-relaxed">Kami percaya bahwa setiap santri berhak mendapatkan pendidikan yang seimbang antara hafalan, tajwid, dan akhlak.</p>
                <div className="mt-8 grid gap-4">
                  <div className="rounded-3xl border border-amber-100 bg-white p-4 hover-lift">
                    <p className="text-sm text-slate-500">Kelas intensif</p>
                    <p className="mt-2 font-semibold text-slate-900">Pendampingan personal</p>
                  </div>
                  <div className="rounded-3xl border border-amber-100 bg-white p-4 hover-lift">
                    <p className="text-sm text-slate-500">Lingkungan rapi</p>
                    <p className="mt-2 font-semibold text-slate-900">Kondusif dan fokus</p>
                  </div>
                </div>
              </ScrollAnimatedItem>
            </div>
          </div>
        </section>

        <section id="layanan" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollAnimatedCard className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600 animate-on-scroll in-view">Layanan Utama</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 animate-on-scroll in-view-delay-1">Program dan fitur unggulan kami</h2>
            </ScrollAnimatedCard>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programCards.length > 0 ? (
                programCards.map((program, idx) => (
                  <ScrollAnimatedItem key={program.id} index={idx} className="group flex min-h-[240px] flex-col justify-between rounded-[32px] border border-amber-100 bg-white p-6 shadow-lg shadow-amber-900/5 hover:-translate-y-2 hover:border-amber-400/40 hover:shadow-amber-500/20 transition-all duration-300 hover-lift">
                    <div>
                      <p className="text-sm uppercase tracking-[0.28em] text-amber-600">Program</p>
                      <h3 className="mt-4 text-xl font-semibold text-slate-900">{program.nama ?? 'Program'}</h3>
                      <p className="mt-3 text-slate-600 text-sm leading-relaxed line-clamp-4">
                        {program.deskripsi ? String(program.deskripsi) : 'Deskripsi singkat program akan tampil di sini.'}
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-amber-600 transition group-hover:text-amber-500">Pelajari lebih lanjut</span>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition group-hover:bg-amber-200">
                        →
                      </span>
                    </div>
                  </ScrollAnimatedItem>
                ))
              ) : (
                <div className="rounded-[32px] border border-amber-100 bg-white p-8 text-center text-slate-500">Belum ada layanan atau program yang dipublikasikan.</div>
              )}
            </div>
          </div>
        </section>

        <section id="informasi" className="bg-amber-50/80 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <OrnamentalDivider className="mb-10" />
            <div className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Informasi Terbaru</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Berita, artikel, dan pengumuman terkini</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-2xl shadow-amber-900/5">
                <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Artikel</p>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">Konten Pendidikan</h3>
                <div className="mt-6 space-y-4">
                  {latestArticles.length > 0 ? latestArticles.map((article) => (
                    <div key={article.id} className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="font-semibold text-slate-900">{article.judul}</p>
                      <p className="mt-2 text-sm text-slate-500">{formatDate(article.published_at ?? '')}</p>
                    </div>
                  )) : <p className="text-slate-500">Belum ada artikel terbaru.</p>}
                </div>
              </div>
              <div className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-2xl shadow-amber-900/5">
                <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Pengumuman</p>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">Info penting</h3>
                <div className="mt-6 space-y-4">
                  {latestAnnouncements.length > 0 ? latestAnnouncements.map((announce) => (
                    <div key={announce.id} className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="font-semibold text-slate-900">{announce.judul}</p>
                      <p className="mt-2 text-sm text-slate-500">{String(announce.isi ?? '').slice(0, 100)}...</p>
                    </div>
                  )) : <p className="text-slate-500">Belum ada pengumuman terbaru.</p>}
                </div>
              </div>
              <div className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-2xl shadow-amber-900/5">
                <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Agenda</p>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">Kegiatan Mendatang</h3>
                <div className="mt-6 space-y-4">
                  {latestAgendas.length > 0 ? latestAgendas.map((agenda) => (
                    <div key={agenda.id ?? agenda.tanggal} className="rounded-3xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="font-semibold text-slate-900">{agenda.judul ?? 'Agenda penting'}</p>
                      <p className="mt-2 text-sm text-slate-500">{formatDate(agenda.tanggal ?? agenda.created_at ?? '')}</p>
                    </div>
                  )) : <p className="text-slate-500">Belum ada agenda mendatang.</p>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="testimoni" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <OrnamentalDivider className="mb-10" />
            <div className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Testimoni</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Apresiasi dari pengguna dan orang tua</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((item) => (
                <div key={item.name} className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-xl shadow-amber-900/5">
                  <p className="text-slate-600 leading-relaxed">“{item.quote}”</p>
                  <div className="mt-6">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="progress-bulanan" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Progres Pencapaian</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900">Tren Tahfidz & Tahsin Santri</h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-500">Lihat perkembangan siswa berdasarkan penilaian harian tim pengajar dalam program Tahfidz dan Tahsin.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[0.95fr_0.45fr]">
              <div className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-2xl shadow-amber-900/5">
                <StudentProgressChart data={monthlyProgress ?? []} />
              </div>
              <div className="rounded-[32px] border border-amber-100 bg-white p-8 shadow-2xl shadow-amber-900/5">
                <div className="space-y-6">
                  <div className="relative rounded-3xl bg-amber-50/70 p-6">
                    <CornerOrnament className="absolute top-3 right-3" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                      <p className="text-sm uppercase tracking-widest text-amber-600">Program Tahfidz</p>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">Penilaian harian mencakup makhroj (pengucapan huruf), tajwid (aturan bacaan), dan kelancaran membaca Al-Qur&apos;an.</p>
                  </div>
                  <div className="relative rounded-3xl bg-amber-50/70 p-6">
                    <CornerOrnament className="absolute top-3 right-3" />
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                      <p className="text-sm uppercase tracking-widest text-amber-600">Program Tahsin</p>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">Penilaian harian mencakup makhroj, kelancaran, dan adab (etika) dalam membaca dan menghormati Al-Qur&apos;an.</p>
                  </div>
                  <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-100/50 to-amber-50/50 p-5">
                    <p className="text-xs text-amber-600 font-semibold uppercase tracking-widest">Sistem Penilaian</p>
                    <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                      <p>A = 85% (Sangat Baik) | B = 70% (Baik)</p>
                      <p>C = 55% (Cukup) | D = 40% (Kurang)</p>
                      <p>L = 100% (Lancar) | TL = 50% (Tidak Lancar)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="statistik" className="bg-amber-50/80 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <ScrollAnimatedCard className="mb-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600 animate-on-scroll in-view">Statistik</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 animate-on-scroll in-view-delay-1">Data penting secara ringkas</h2>
            </ScrollAnimatedCard>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Santri Aktif', value: totalSantri },
                { label: 'Agenda', value: Array.isArray(agendas) ? agendas.length : 0 },
                { label: 'Artikel', value: Array.isArray(artikels) ? artikels.length : 0 },
                { label: 'Pengumuman', value: Array.isArray(pengumumans) ? pengumumans.length : 0 },
              ].map((item, idx) => (
                <ScrollAnimatedItem key={item.label} index={idx} className="islamic-card rounded-[32px] p-8 text-center hover-lift">
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-4 text-4xl font-bold text-slate-900">{item.value}</p>
                </ScrollAnimatedItem>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20"
          style={{background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fff7ed 100%)'}}>
          <IslamicPatternBg opacityLight />
          <div className="mx-auto max-w-6xl px-6 text-center">
            <OrnamentalDivider className="mb-10" />
            <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Ayo Bergabung</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Siap bergabung dan berkembang bersama kami?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">Temukan program terbaik untuk peningkatan hafalan, tajwid, dan akhlak anak di lingkungan belajar yang nyaman.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/program" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-amber-400 px-7 py-3 text-base font-semibold text-white transition hover:opacity-95">
                Pelajari Program
              </Link>
              <Link href="/profil" className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-white px-7 py-3 text-base font-semibold text-slate-700 transition hover:bg-amber-50">
                Hubungi Kami
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-amber-50 text-slate-600">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr_0.9fr]">
            <div className="islamic-card rounded-[32px] p-8 shadow-2xl shadow-amber-900/5">
              <p className="text-base font-semibold text-slate-900">{profil.nama_lembaga}</p>
              <p className="mt-4 max-w-xl text-slate-500 leading-relaxed">{profil.deskripsi}</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Pembelajaran Qur'an modern, berakhlak, dan berkualitas.
              </div>
            </div>
            <div className="islamic-card rounded-[32px] p-8 shadow-2xl shadow-amber-900/5">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Kontak</p>
              <div className="mt-6 space-y-4">
                {profil.alamat && (
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="mt-1 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-500">Alamat</p>
                      <p className="text-slate-900">{profil.alamat}</p>
                    </div>
                  </div>
                )}
                {profil.telepon && (
                  <div className="flex items-start gap-3">
                    <Phone size={20} className="mt-1 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-500">Telepon</p>
                      <p className="text-slate-900">{profil.telepon}</p>
                    </div>
                  </div>
                )}
                {profil.email && (
                  <div className="flex items-start gap-3">
                    <Mail size={20} className="mt-1 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="text-slate-900">{profil.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="islamic-card rounded-[32px] p-8 shadow-2xl shadow-amber-900/5">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-600">Sosial Media</p>
              <div className="mt-6 space-y-4">
                  {profil.facebook ? (
                  <Link href={profil.facebook.startsWith('http') ? profil.facebook : `https://facebook.com/${String(profil.facebook).replace(/^\//, '')}`}
                    className="group flex items-center gap-3 rounded-3xl border border-amber-100 bg-white px-4 py-3 transition hover:border-amber-400/40 hover:bg-amber-50"
                    target="_blank" rel="noreferrer noopener">
                    <Globe size={20} className="text-amber-500 transition group-hover:text-amber-600" />
                    <div>
                      <p className="text-sm text-slate-500">Facebook</p>
                      <p className="text-slate-900">{String(profil.facebook).replace(/^https?:\/\//, '')}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="group flex items-center gap-3 rounded-3xl border border-amber-100 bg-white px-4 py-3 opacity-60">
                    <Globe size={20} className="text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-500">Facebook</p>
                      <p className="text-slate-900">/timquran</p>
                    </div>
                  </div>
                )}
                <Link href={profil.instagram ? (profil.instagram.startsWith('http') ? profil.instagram : `https://instagram.com/${String(profil.instagram).replace(/^@/, '').replace(/^\//, '')}`) : 'https://instagram.com'}
                  className="group flex items-center gap-3 rounded-3xl border border-amber-100 bg-white px-4 py-3 transition hover:border-amber-400/40 hover:bg-amber-50"
                  target="_blank" rel="noreferrer noopener">
                  <AtSign size={20} className="text-amber-500 transition group-hover:text-amber-600" />
                  <div>
                    <p className="text-sm text-slate-500">Instagram</p>
                    <p className="text-slate-900">{profil.instagram ? String(profil.instagram) : '@timquran'}</p>
                  </div>
                </Link>
                {profil.youtube && (
                  <Link href={profil.youtube.startsWith('http') ? profil.youtube : `https://youtube.com/${String(profil.youtube).replace(/^\//, '')}`}
                    className="group flex items-center gap-3 rounded-3xl border border-amber-100 bg-white px-4 py-3 transition hover:border-amber-400/40 hover:bg-amber-50"
                    target="_blank" rel="noreferrer noopener">
                    <PlayCircle size={20} className="text-amber-500 transition group-hover:text-amber-600" />
                    <div>
                      <p className="text-sm text-slate-500">YouTube</p>
                      <p className="text-slate-900">{String(profil.youtube).replace(/^https?:\/\//, '')}</p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <OrnamentalDivider className="mb-6" />
          <div className="mt-10 border-t border-amber-200 pt-6 text-sm text-slate-400">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>&copy; {new Date().getFullYear()} {profil.nama_lembaga}. Semua hak dilindungi.</span>
              <div className="flex flex-wrap gap-4">
                <Link href="/" className="transition hover:text-slate-700">Beranda</Link>
                <Link href="/profil" className="transition hover:text-slate-700">Profil</Link>
                <Link href="/program" className="transition hover:text-slate-700">Program</Link>
                <Link href="/pengumuman" className="transition hover:text-slate-700">Pengumuman</Link>
                <Link href="/artikel" className="transition hover:text-slate-700">Artikel</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
