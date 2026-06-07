'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, X, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PublicNavbarProps {
  logoUrl?: string | null;
  namaLembaga?: string;
  namaSekolah?: string | null;
  navigationItems?: Array<{ label: string; href: string; is_active?: boolean }>;
}

const normalizeHref = (h: string) => {
  const raw = String(h ?? '').trim();
  if (!raw) return '/';

  const normalized = raw.replace(/\s+/g, '').toLowerCase();
  if (normalized === 'beranda' || normalized === '/beranda' || normalized === '#beranda' || normalized === '/#beranda') return '/';
  if (normalized === 'profil' || normalized === '/profil' || normalized === '#profil' || normalized === '/#profil') return '/profil';
  if (normalized === 'program' || normalized === '/program' || normalized === '#program' || normalized === '/#program') return '/program';
  if (normalized === 'galeri' || normalized === '/galeri' || normalized === '#galeri' || normalized === '/#galeri') return '/galeri';
  if (normalized === 'artikel' || normalized === '/artikel' || normalized === '#artikel' || normalized === '/#artikel') return '/artikel';
  if (normalized === 'agenda' || normalized === '/agenda' || normalized === '#agenda' || normalized === '/#agenda') return '/agenda';
  if (normalized === 'pengumuman' || normalized === '/pengumuman' || normalized === 'info' || normalized === '/info' || normalized === '#pengumuman' || normalized === '/#pengumuman' || normalized === '#info' || normalized === '/#info') return '/pengumuman';

  if (normalized.startsWith('#')) return normalized.startsWith('/#') ? normalized : `/${normalized}`;
  if (normalized.startsWith('/')) return raw;
  if (/^https?:\/\//.test(raw)) return raw;

  return `/${raw}`;
};

export default function PublicNavbar({
  logoUrl,
  namaLembaga = "Tim Qur'an",
  namaSekolah,
  navigationItems,
}: PublicNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hasLogoError, setHasLogoError] = useState(false);
  const [, setNavLoading] = useState(true);
  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string }>>(() => {
    if (navigationItems && navigationItems.length > 0) {
      return navigationItems
        .filter((item) => item.is_active ?? true)
        .map((item) => ({ label: item.label, href: normalizeHref(item.href) }));
    }
    return [
      { label: 'Beranda',    href: '/' },
      { label: 'Profil',     href: '/profil' },
      { label: 'Program',    href: '/program' },
      { label: 'Galeri',     href: '/galeri' },
      { label: 'Pengumuman', href: '/pengumuman' },
      { label: 'Artikel',    href: '/artikel' },
      { label: 'Agenda',     href: '/agenda' },
    ];
  });


  // Fetch navigation items from API
  useEffect(() => {
    if (navigationItems && navigationItems.length > 0) {
      setNavLinks(
        navigationItems
          .filter((item) => item.is_active ?? true)
          .map((item) => ({ label: item.label, href: normalizeHref(item.href) }))
      );
      setNavLoading(false);
      return;
    }

    const fetchNav = async () => {
      try {
        const res = await fetch('/api/website/navigation');
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setNavLinks(json.data.map((item: any) => ({ label: item.label, href: normalizeHref(item.href) })));
        }
      } catch (err) {
        console.error('[PublicNavbar] Failed to fetch navigation:', err);
        // Use default navLinks if fetch fails
      } finally {
        setNavLoading(false);
      }
    };
    fetchNav();
  }, [navigationItems]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    // Set initial state
    setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => { setHasLogoError(false); }, [logoUrl]);

  const isActive = (href: string) => {
    const cleanHref = href.split('#')[0] || '/';
    if (cleanHref === '/') return pathname === '/';
    return pathname.startsWith(cleanHref);
  };

  // Tambah cache-busting parameter ke URL gambar
  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    // Tambah query param timestamp agar browser tidak cache gambar lama
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Math.floor(Date.now() / 60000)}`; // Revalidate setiap menit
  };

  const cachedLogoUrl = getImageUrl(logoUrl);

  // Pada landing page: background sangat tipis saat di atas, solid saat scroll
  // Di halaman lain: selalu solid
  const isLanding = pathname === '/';

  let bgColor: string;
  let blur: string;
  let border: string;
  let shadow: string;

  if (scrolled || !isLanding) {
    // Solid — saat scroll atau di halaman non-landing
    bgColor = 'rgba(2, 24, 43, 0.96)';
    blur = 'blur(18px)';
    border = '1px solid rgba(56,189,252,0.14)';
    shadow = '0 4px 32px rgba(0,0,0,0.45)';
  } else {
    // Landing page belum scroll — tetap gelap agar tidak ada putih
    bgColor = 'rgba(2, 24, 43, 0.7)';
    blur = 'blur(12px)';
    border = '1px solid transparent';
    shadow = 'none';
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{ background: bgColor, backdropFilter: blur, borderBottom: border, boxShadow: shadow }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-[70px]">

          {/* ── Brand ───────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-3 group shrink-0 no-underline">
            {cachedLogoUrl && !hasLogoError ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-400/30 group-hover:ring-amber-400/60 transition-all shrink-0">
                <Image
                  src={cachedLogoUrl}
                  alt={namaLembaga}
                  fill
                  priority
                  className="object-cover"
                  sizes="36px"
                  onError={() => setHasLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                style={{background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 4px 16px rgba(14,165,233,0.35)'}}>
                <BookOpen size={16} className="text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-semibold text-white text-base leading-tight block tracking-tight">
                {namaLembaga.replace("'", '\u2019')}
              </span>
              <span className="text-amber-400/60 text-[11px] leading-none">
                {namaSekolah ?? 'Tahfidz & Tahsin'}
              </span>
            </div>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition duration-200 ${active ? 'text-white bg-gradient-to-r from-sky-500/20 to-teal-300/10 ring-1 ring-cyan-300' : 'text-white/85 bg-white/3 hover:bg-white/6'}`}
                  title={link.label}
                >
                  {link.label}
                  {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-cyan-300 to-sky-400" />}
                </Link>
              );
            })}
          </nav>

          {/* ── CTA + Mobile toggle ──────────────────────────── */}
          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-400 shadow-md hover:opacity-95 active:scale-95"
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
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-[420px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ background: 'rgba(2, 24, 43, 0.98)', backdropFilter: 'blur(18px)' }}>
        <div className="px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200"
                style={{
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.82)',
                  background: active ? 'linear-gradient(135deg, rgba(56,189,252,0.22), rgba(6,182,212,0.14))' : 'rgba(255,255,255,0.03)',
                  border: active ? '1px solid rgba(56,189,252,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: active ? '0 14px 36px rgba(56,189,252,0.12)' : 'none',
                }}
              >
                {link.label}
                <span className={`h-2 w-2 rounded-full transition ${active ? 'bg-cyan-300' : 'bg-white/20'}`} />
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800 mt-2">
            <Link
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-400"
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
