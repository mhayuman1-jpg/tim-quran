'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, X, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Beranda',    href: '/' },
  { label: 'Profil',     href: '/profil' },
  { label: 'Program',    href: '/program' },
  { label: 'Pengumuman', href: '/info' },
  { label: 'Artikel',    href: '/artikel' },
  { label: 'Agenda',     href: '/agenda' },
];

interface PublicNavbarProps {
  logoUrl?: string | null;
  namaLembaga?: string;
  namaSekolah?: string | null;
}

export default function PublicNavbar({
  logoUrl,
  namaLembaga = "Tim Qur'an",
  namaSekolah,
}: PublicNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    // Set initial state
    setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Pada landing page: background sangat tipis saat di atas, solid saat scroll
  // Di halaman lain: selalu solid
  const isLanding = pathname === '/';

  let bgColor: string;
  let blur: string;
  let border: string;
  let shadow: string;

  if (scrolled || !isLanding) {
    // Solid — saat scroll atau di halaman non-landing
    bgColor = 'rgba(22, 8, 0, 0.97)';
    blur = 'blur(20px)';
    border = '1px solid rgba(245,158,11,0.15)';
    shadow = '0 4px 32px rgba(0,0,0,0.4)';
  } else {
    // Landing page belum scroll — gradient gelap tipis agar teks tetap terlihat
    bgColor = 'linear-gradient(to bottom, rgba(20,8,0,0.6) 0%, transparent 100%)';
    blur = 'blur(0px)';
    border = '1px solid transparent';
    shadow = 'none';
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: bgColor,
        backdropFilter: blur,
        borderBottom: border,
        boxShadow: shadow,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-[70px]">

          {/* ── Brand ───────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            {logoUrl ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-400/30 group-hover:ring-amber-400/60 transition-all shrink-0">
                <Image src={logoUrl} alt={namaLembaga} fill className="object-cover" sizes="36px" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 16px rgba(217,119,6,0.4)'}}>
                <BookOpen size={16} className="text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-bold text-white text-base leading-tight block tracking-tight">
                {namaLembaga.replace("'", '\u2019')}
              </span>
              {namaSekolah ? (
                <span className="text-amber-400/60 text-[11px] leading-none">{namaSekolah}</span>
              ) : (
                <span className="text-amber-400/60 text-[11px] leading-none">Tahfidz &amp; Tahsin</span>
              )}
            </div>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg"
                  style={{
                    color: active ? '#fbbf24' : 'rgba(255,255,255,0.65)',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.95)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {link.label}
                  {active && (
                    <span
                      className="absolute bottom-0.5 left-4 right-4 h-0.5 rounded-full"
                      style={{background: 'linear-gradient(90deg, #d97706, #f59e0b)'}}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── CTA + Mobile toggle ──────────────────────────── */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-100"
              style={{
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                boxShadow: '0 4px 16px rgba(217,119,6,0.45)',
              }}
            >
              <LogIn size={15} />
              Masuk
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{color: 'rgba(255,255,255,0.7)'}}
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.12)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────── */}
      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          background: 'rgba(22, 8, 0, 0.98)',
          backdropFilter: 'blur(24px)',
          borderTop: menuOpen ? '1px solid rgba(245,158,11,0.15)' : 'none',
        }}
      >
        <div className="px-4 py-4 space-y-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  color: active ? '#fbbf24' : 'rgba(255,255,255,0.65)',
                  background: active ? 'rgba(245,158,11,0.1)' : 'transparent',
                }}
              >
                {link.label}
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-white/[0.08] mt-2">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)'}}
            >
              <LogIn size={15} />
              Masuk ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
