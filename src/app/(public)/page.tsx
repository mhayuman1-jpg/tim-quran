// src/app/(public)/page.tsx — Landing Page Tim Qur'an
// Tema: Warm Gold/Amber — berbeda dari dashboard hijau/biru
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen, Users, Star, Mic, ChevronRight, Award,
  MapPin, Clock, Calendar, Heart, Shield,
  Phone, Mail, AtSign, PlayCircle, Globe, TrendingUp,
} from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';

async function getPageData() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const [profilRes, programRes, agendaRes, pengumumanRes, artikelRes, galeriRes, statsRes] = await Promise.all([
      supabase.from('profil_website').select('*').single(),
      supabase.from('program').select('*').eq('is_active', true).order('urutan'),
      supabase.from('agenda').select('*').eq('is_published', true).gte('tanggal', today).order('tanggal').limit(5),
      supabase.from('pengumuman').select('*').order('created_at', { ascending: false }).limit(4),
      supabase.from('artikel').select('id, judul, slug, cover_url, published_at').eq('is_published', true).order('published_at', { ascending: false }).limit(3),
      supabase.from('galeri').select('*').eq('is_published', true).order('urutan').limit(8),
      supabase.from('santri').select('id, juz_terakhir', { count: 'exact' }).eq('status', 'Aktif'),
    ]);

    const santriData = statsRes.data ?? [];
    const totalSantri = statsRes.count ?? 0;

    const juzGroups = [
      { label: 'Juz 1\u20135', min: 1, max: 5, count: 0 },
      { label: 'Juz 6\u201310', min: 6, max: 10, count: 0 },
      { label: 'Juz 11\u201315', min: 11, max: 15, count: 0 },
      { label: 'Juz 16\u201320', min: 16, max: 20, count: 0 },
      { label: 'Juz 21\u201325', min: 21, max: 25, count: 0 },
      { label: 'Juz 26\u201330', min: 26, max: 30, count: 0 },
    ];

    for (const s of santriData as { juz_terakhir?: number }[]) {
      const juz = s.juz_terakhir ?? 1;
      const group = juzGroups.find(g => juz >= g.min && juz <= g.max);
      if (group) group.count++;
    }

    return {
      profil: profilRes.data ?? null,
      programs: programRes.data ?? [],
      agendas: agendaRes.data ?? [],
      pengumumans: pengumumanRes.data ?? [],
      artikels: artikelRes.data ?? [],
      galeris: galeriRes.data ?? [],
      totalSantri,
      juzGroups,
    };
  } catch {
    return {
      profil: null, programs: [], agendas: [], pengumumans: [],
      artikels: [], galeris: [], totalSantri: 0,
      juzGroups: [
        { label: 'Juz 1\u20135', min: 1, max: 5, count: 0 },
        { label: 'Juz 6\u201310', min: 6, max: 10, count: 0 },
        { label: 'Juz 11\u201315', min: 11, max: 15, count: 0 },
        { label: 'Juz 16\u201320', min: 16, max: 20, count: 0 },
        { label: 'Juz 21\u201325', min: 21, max: 25, count: 0 },
        { label: 'Juz 26\u201330', min: 26, max: 30, count: 0 },
      ],
    };
  }
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}
function formatWaktu(t: string | null) { return t ? t.slice(0, 5) : ''; }

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Users, Star, Mic, Globe, Heart, Shield, Award,
};

export default async function LandingPage() {
  const { profil: pd, programs, agendas, pengumumans, artikels, galeris, totalSantri, juzGroups } = await getPageData();

  const profil = pd ?? {
    nama_lembaga: "Tim Qur'an",
    deskripsi: "Program Tahfidz dan Tahsin Al-Qur'an yang berdedikasi mencetak generasi Qur'ani berakhlak mulia.",
    visi: 'Menjadi lembaga Tahfidz & Tahsin terdepan.',
    misi: ['Pembelajaran berkualitas', 'Mencetak hafidz berakhlak'],
    logo_url: null, logo_sekolah_url: null, nama_sekolah: null,
    alamat: null, email: null, telepon: null, instagram: null, youtube: null,
  };

  const maxJuzCount = Math.max(...juzGroups.map(g => g.count), 1);

  return (
    <div className="overflow-x-hidden font-sans">

      {/* ══════════ HERO — Warm Brown/Gold ══════════ */}
      <section id="beranda" className="relative min-h-screen flex items-center overflow-hidden"
        style={{background: 'linear-gradient(135deg, #1a0a00 0%, #431407 40%, #7c2d12 75%, #9a3412 100%)'}}>

        {/* Decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full animate-float"
            style={{background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)', animationDuration: '7s'}} />
          <div className="absolute -bottom-32 right-0 w-[400px] h-[400px] rounded-full animate-float"
            style={{background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)', animationDuration: '9s', animationDelay: '3s'}} />
          {/* Ornament kaligrafi */}
          <div className="absolute right-4 top-0 bottom-0 flex items-center select-none pointer-events-none">
            <span className="text-amber-500/[0.06] font-serif leading-none" style={{fontSize: 'clamp(180px, 22vw, 340px)'}}>&#1575;&#1604;&#1604;&#1607;</span>
          </div>
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{backgroundImage: 'linear-gradient(rgba(245,158,11,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.8) 1px, transparent 1px)', backgroundSize: '80px 80px'}} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 grid lg:grid-cols-2 gap-16 items-center w-full">
          {/* Kiri */}
          <div>
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-amber-300 text-sm font-medium mb-8"
              style={{background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)'}}>
              <Star size={13} className="fill-amber-400 text-amber-400" />
              Program Unggulan Tahfidz &amp; Tahsin Al-Qur&apos;an
            </div>

            {/* Logo + nama */}
            <div className="flex items-center gap-5 mb-5">
              {profil.logo_url ? (
                <div className="relative shrink-0" style={{borderRadius: '16px', padding: '3px', background: 'linear-gradient(135deg, rgba(245,158,11,0.7), rgba(251,191,36,0.4))'}}>
                  <Image src={profil.logo_url} alt="Logo" width={72} height={72} className="rounded-xl object-cover" style={{width: 72, height: 72}} />
                </div>
              ) : (
                <div className="w-[72px] h-[72px] rounded-xl shrink-0 flex items-center justify-center"
                  style={{background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)'}}>
                  <BookOpen size={30} className="text-amber-400" />
                </div>
              )}
              <h1 className="font-bold text-white leading-tight" style={{fontSize: 'clamp(2.2rem, 4.5vw, 3.8rem)'}}>
                {profil.nama_lembaga}
              </h1>
            </div>

            <p className="text-amber-100/70 text-lg leading-relaxed mb-8 max-w-lg">
              {profil.deskripsi}
            </p>

            {/* Hadits card */}
            <div className="rounded-2xl p-5 mb-8"
              style={{background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)'}}>
              <p className="text-2xl text-amber-100 text-right leading-loose mb-2" dir="rtl">
                &#1582;&#1614;&#1610;&#1618;&#1585;&#1615;&#1603;&#1615;&#1605;&#32;&#1605;&#1614;&#1606;&#32;&#1578;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#32;&#1575;&#1604;&#1618;&#1602;&#1615;&#1585;&#1618;&#1570;&#1606;&#1614;&#32;&#1608;&#1614;&#1593;&#1614;&#1604;&#1614;&#1617;&#1605;&#1614;&#1607;&#1615;
              </p>
              <p className="text-amber-300/70 text-sm italic text-center">
                &ldquo;Sebaik-baik kalian adalah yang mempelajari Al-Qur&apos;an dan mengajarkannya.&rdquo;
              </p>
              <p className="text-amber-400/40 text-xs text-center mt-1">(HR. Bukhari no. 5027)</p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-white transition-all hover:scale-105"
                style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 8px 32px rgba(217,119,6,0.5)'}}>
                <span>Masuk Dashboard</span>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#profil" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-amber-200 transition-all hover:bg-white/10"
                style={{background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)'}}>
                Pelajari Lebih
              </a>
            </div>
          </div>

          {/* Kanan — stat cards gold */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {([
              { val: totalSantri > 0 ? String(totalSantri) : '\u2014', label: 'Santri Aktif', icon: '\uD83D\uDC68\u200D\uD83C\uDF93', dur: '6s' },
              { val: '30', label: "Juz Al-Qur'an", icon: '\uD83D\uDCD6', dur: '7s' },
              { val: '114', label: 'Surah', icon: '\uD83D\uDD4C', dur: '5s' },
              { val: '\u221E', label: 'Keberkahan', icon: '\u2728', dur: '8s' },
            ] as const).map(s => (
              <div key={s.label} className="animate-float rounded-2xl p-6 text-center"
                style={{background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(12px)', animationDuration: s.dur}}>
                <div className="text-3xl mb-2">{s.icon}</div>
                <p className="text-4xl font-bold text-white mb-1">{s.val}</p>
                <p className="text-amber-300/70 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{display:'block'}}>
            <path d="M0 80L60 74.7C120 69.3 240 58.7 360 53.3C480 48 600 48 720 53.3C840 58.7 960 69.3 1080 74.7C1200 80 1320 80 1380 80H1440V80H0V80Z" fill="#fffbeb"/>
          </svg>
        </div>
      </section>

      {/* ══════════ GRAFIK PROGRES SANTRI ══════════ */}
      {totalSantri > 0 && (
        <section className="py-20 bg-amber-50">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-3 border border-amber-200">
                📊 Statistik Hafalan
              </span>
              <h2 className="text-3xl font-bold text-stone-900 mb-2">Progres Hafalan Santri</h2>
              <p className="text-stone-500 max-w-md mx-auto text-sm">Distribusi pencapaian juz Al-Qur&apos;an seluruh santri aktif</p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-amber-100">
              {/* Summary row */}
              <div className="flex flex-wrap gap-4 mb-8 pb-6 border-b border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Users size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900">{totalSantri}</p>
                    <p className="text-xs text-stone-500">Total Santri Aktif</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <TrendingUp size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-stone-900">{juzGroups.filter(g => g.count > 0).length * Math.floor(30/6)}</p>
                    <p className="text-xs text-stone-500">Rata-rata Pencapaian</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="text-xs text-stone-400 text-right">
                    <p>Terakhir diperbarui</p>
                    <p className="font-medium text-stone-600">{new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                  </div>
                </div>
              </div>

              {/* Bar chart */}
              <div className="space-y-4">
                {juzGroups.map((group, i) => {
                  const pct = maxJuzCount > 0 ? (group.count / maxJuzCount) * 100 : 0;
                  const colors = ['#f59e0b', '#f97316', '#ef4444', '#10b981', '#6366f1', '#8b5cf6'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={group.label} className="flex items-center gap-4">
                      <div className="w-20 text-right shrink-0">
                        <span className="text-xs font-semibold text-stone-600">{group.label}</span>
                      </div>
                      <div className="flex-1 h-8 bg-stone-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                          style={{
                            width: pct > 0 ? `${Math.max(pct, 8)}%` : '0%',
                            background: `linear-gradient(90deg, ${color}dd, ${color})`,
                          }}
                        >
                          {group.count > 0 && (
                            <span className="text-xs font-bold text-white">{group.count}</span>
                          )}
                        </div>
                        {group.count === 0 && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">0 santri</span>
                        )}
                      </div>
                      <div className="w-12 shrink-0 text-xs text-stone-500 text-right">
                        {totalSantri > 0 ? `${Math.round((group.count / totalSantri) * 100)}%` : '0%'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════ PROFIL ══════════ */}
      <section id="profil" className="py-24" style={{background: '#fffbeb'}}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-3 border border-amber-200">Tentang Kami</span>
            <h2 className="text-4xl font-bold text-stone-900 mb-3">Profil {profil.nama_lembaga}</h2>
            <p className="text-stone-500 max-w-xl mx-auto">{profil.deskripsi}</p>
          </div>

          {(profil.logo_url || profil.logo_sekolah_url) && (
            <div className="flex flex-wrap justify-center items-center gap-8 mb-14">
              {profil.logo_url && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-200 shadow-lg bg-white p-2">
                    <Image src={profil.logo_url} alt="Logo" width={88} height={88} className="object-contain w-full h-full" />
                  </div>
                  <p className="text-xs text-stone-500 font-medium text-center">{profil.nama_lembaga}</p>
                </div>
              )}
              {profil.logo_sekolah_url && (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-lg bg-white p-2">
                    <Image src={profil.logo_sekolah_url} alt="Logo Sekolah" width={88} height={88} className="object-contain w-full h-full" />
                  </div>
                  {profil.nama_sekolah && <p className="text-xs text-stone-500 font-medium text-center">{profil.nama_sekolah}</p>}
                </div>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <div className="rounded-2xl p-8 relative overflow-hidden mb-6" style={{background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a'}}>
                <div className="absolute -top-3 -left-3 text-8xl text-amber-200 font-serif leading-none select-none" aria-hidden="true">&ldquo;</div>
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-amber-700 uppercase tracking-widest mb-4">Visi</h3>
                  <p className="text-stone-700 text-lg leading-relaxed font-medium">
                    {profil.visi || "Menjadi lembaga Tahfidz & Tahsin terdepan."}
                  </p>
                </div>
              </div>
              {(profil.alamat || profil.email || profil.telepon) && (
                <div className="bg-white rounded-2xl p-6 space-y-3 border border-stone-100 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest">Kontak</h3>
                  {profil.alamat && <div className="flex items-start gap-3 text-sm text-stone-600"><MapPin size={15} className="text-amber-500 mt-0.5 shrink-0" />{profil.alamat}</div>}
                  {profil.email && <div className="flex items-center gap-3 text-sm text-stone-600"><Mail size={15} className="text-amber-500 shrink-0" />{profil.email}</div>}
                  {profil.telepon && <div className="flex items-center gap-3 text-sm text-stone-600"><Phone size={15} className="text-amber-500 shrink-0" />{profil.telepon}</div>}
                  {profil.instagram && <div className="flex items-center gap-3 text-sm text-stone-600"><AtSign size={15} className="text-amber-500 shrink-0" />{profil.instagram}</div>}
                  {profil.youtube && <div className="flex items-center gap-3 text-sm text-stone-600"><PlayCircle size={15} className="text-amber-500 shrink-0" />{profil.youtube}</div>}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6">Misi</h3>
              <div className="space-y-3">
                {(Array.isArray(profil.misi) && profil.misi.length > 0
                  ? profil.misi
                  : ["Pembelajaran berkualitas", "Hafidz berakhlak"]
                ).map((m: string, i: number) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white hover:bg-amber-50 border border-stone-100 hover:border-amber-200 transition-all group shadow-sm">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold text-amber-700"
                      style={{background: 'linear-gradient(135deg, #fde68a, #fcd34d)'}}>
                      {i + 1}
                    </div>
                    <p className="text-stone-700 leading-relaxed pt-0.5 text-sm">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ PROGRAM ══════════ */}
      {programs.length > 0 && (
        <section id="program" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-3 border border-orange-200">Program Kami</span>
              <h2 className="text-4xl font-bold text-stone-900 mb-3">Program Pembelajaran</h2>
              <p className="text-stone-500 max-w-xl mx-auto">Program unggulan untuk membimbing santri menghafal dan membaca Al-Qur&apos;an.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {programs.map((p: { id: string; nama: string; deskripsi: string; icon: string }, i: number) => {
                const IconComp = ICON_MAP[p.icon] || BookOpen;
                const styles = [
                  { border: 'border-amber-200', icon: 'from-amber-400 to-orange-400' },
                  { border: 'border-orange-200', icon: 'from-orange-400 to-red-400' },
                  { border: 'border-yellow-200', icon: 'from-yellow-400 to-amber-400' },
                  { border: 'border-red-200', icon: 'from-red-400 to-orange-400' },
                ];
                const s = styles[i % styles.length];
                return (
                  <div key={p.id} className={`group bg-white rounded-2xl p-6 border ${s.border} shadow-sm hover:shadow-lg hover:-translate-y-2 transition-all duration-300`}>
                    <div className={`w-12 h-12 rounded-xl mb-4 bg-gradient-to-br ${s.icon} shadow-md flex items-center justify-center`}>
                      <IconComp size={22} className="text-white" />
                    </div>
                    <h3 className="font-bold text-stone-800 text-lg mb-2">{p.nama}</h3>
                    <p className="text-stone-500 text-sm leading-relaxed">{p.deskripsi}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ PENGUMUMAN ══════════ */}
      {pengumumans.length > 0 && (
        <section id="pengumuman" className="py-24" style={{background: '#fff7ed'}}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold mb-3 border border-orange-200">Info Terkini</span>
              <h2 className="text-4xl font-bold text-stone-900 mb-3">Pengumuman</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {pengumumans.map((p: { id: string; judul: string; isi: string; target: string; created_at: string }) => (
                <div key={p.id} className="bg-white rounded-2xl p-6 border border-orange-100 hover:border-amber-300 transition-all shadow-sm hover:shadow-md">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-stone-800 text-base">{p.judul}</h3>
                    <span className="shrink-0 text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium border border-amber-200">{p.target}</span>
                  </div>
                  <p className="text-stone-500 text-sm leading-relaxed line-clamp-3 mb-3">{p.isi}</p>
                  <p className="text-xs text-stone-400">{formatTanggal(p.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ ARTIKEL ══════════ */}
      {artikels.length > 0 && (
        <section id="artikel" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-end justify-between mb-16">
              <div>
                <span className="inline-block px-4 py-1 rounded-full bg-stone-100 text-stone-600 text-sm font-semibold mb-3 border border-stone-200">Inspirasi</span>
                <h2 className="text-4xl font-bold text-stone-900">Artikel Terbaru</h2>
              </div>
              <Link href="/artikel" className="text-amber-600 text-sm font-medium hover:text-amber-700 flex items-center gap-1">
                Lihat semua <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {artikels.map((a: { id: string; judul: string; slug: string; cover_url?: string; published_at?: string }) => (
                <Link key={a.id} href={`/artikel/${a.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="relative h-48 bg-amber-50">
                    {a.cover_url ? (
                      <Image src={a.cover_url} alt={a.judul} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 100vw, 33vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><BookOpen size={36} className="text-amber-200" /></div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-stone-800 line-clamp-2 group-hover:text-amber-700 transition-colors mb-2">{a.judul}</h3>
                    {a.published_at && <p className="text-xs text-stone-400">{formatTanggal(a.published_at)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ GALERI ══════════ */}
      {galeris.length > 0 && (
        <section id="galeri" className="py-24" style={{background: '#fffbeb'}}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-3 border border-amber-200">Dokumentasi</span>
              <h2 className="text-4xl font-bold text-stone-900 mb-3">Galeri Kegiatan</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {galeris.map((f: { id: string; foto_url: string; judul: string }) => (
                <div key={f.id} className="group aspect-square relative rounded-2xl overflow-hidden bg-amber-50 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-amber-100">
                  <Image src={f.foto_url} alt={f.judul} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width:640px) 50vw, 25vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <p className="text-white text-xs font-medium line-clamp-2">{f.judul}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════ AGENDA ══════════ */}
      <section id="agenda" className="py-24 relative overflow-hidden"
        style={{background: 'linear-gradient(135deg, #1a0a00 0%, #431407 50%, #7c2d12 100%)'}}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{backgroundImage: 'radial-gradient(rgba(245,158,11,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px'}} aria-hidden="true" />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 rounded-full border text-amber-300 text-sm font-semibold mb-3" style={{background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)'}}>Jadwal</span>
            <h2 className="text-4xl font-bold text-white mb-3">Agenda Kegiatan</h2>
            <p className="text-amber-200/60 max-w-xl mx-auto">Event dan kegiatan mendatang yang dapat kamu ikuti.</p>
          </div>
          {agendas.length > 0 ? (
            <div className="relative max-w-3xl mx-auto">
              <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-amber-500/20 hidden sm:block" aria-hidden="true" />
              <div className="space-y-5">
                {agendas.map((ag: { id: string; judul: string; deskripsi?: string; tanggal: string; waktu_mulai?: string; waktu_selesai?: string; lokasi?: string }) => {
                  const d = new Date(ag.tanggal);
                  return (
                    <div key={ag.id} className="flex gap-5">
                      <div className="shrink-0 w-16">
                        <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center shadow-lg" style={{background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)'}}>
                          <span className="text-2xl font-bold leading-none" style={{color: '#fbbf24'}}>{d.getDate()}</span>
                          <span className="text-[10px] uppercase font-medium" style={{color: 'rgba(251,191,36,0.7)'}}>
                            {d.toLocaleDateString('id-ID', { month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 rounded-2xl p-5 hover:bg-white/10 transition-colors" style={{background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)'}}>
                        <h3 className="font-bold text-white mb-1">{ag.judul}</h3>
                        {ag.deskripsi && <p className="text-amber-200/60 text-sm line-clamp-2 mb-2">{ag.deskripsi}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-amber-300/70">
                          {(ag.waktu_mulai || ag.waktu_selesai) && (
                            <span className="flex items-center gap-1"><Clock size={11} />{formatWaktu(ag.waktu_mulai ?? null)}{ag.waktu_selesai ? ` \u2013 ${formatWaktu(ag.waktu_selesai)}` : ''}</span>
                          )}
                          {ag.lokasi && <span className="flex items-center gap-1"><MapPin size={11} />{ag.lokasi}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar size={48} className="text-amber-400/30 mx-auto mb-3" />
              <p className="text-amber-300/50">Belum ada agenda kegiatan mendatang.</p>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 60L80 50C160 40 320 20 480 15C640 10 800 20 960 28C1120 36 1280 42 1360 45L1440 48V60H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{backgroundImage: 'radial-gradient(circle, #d97706 1px, transparent 1px)', backgroundSize: '28px 28px'}} aria-hidden="true" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="text-5xl mb-4 animate-float" style={{animationDuration: '4s'}}>📖</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4">Bergabunglah Bersama Kami</h2>
          <p className="text-stone-500 text-lg mb-8">Daftarkan putra-putri Anda dalam program Tahfidz &amp; Tahsin Al-Qur&apos;an kami.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/login" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white text-lg transition-all hover:scale-105"
              style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 8px 32px rgba(217,119,6,0.3)'}}>
              <BookOpen size={20} /> Masuk Sekarang
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#profil" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-amber-200 text-amber-700 font-semibold text-lg hover:bg-amber-50 transition-all">
              Lihat Profil
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
