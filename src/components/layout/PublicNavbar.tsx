'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, X, LogIn, ChevronDown, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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

  // Default navigation items (always include)
  const defaultNavLinks = [
    { label: 'Beranda',    href: '/' },
    { label: 'Profil',     href: '/profil', children: [
      { label: 'Profil',   href: '/profil' },
      { label: 'Program',  href: '/program' },
      { label: 'Galeri',   href: '/galeri' },
    ]},
    { label: 'Pengumuman', href: '/pengumuman' },
    { label: 'Artikel',    href: '/artikel' },
    { label: 'Agenda',     href: '/agenda' },
  ];

  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>>(defaultNavLinks);
  const [profilDropdownOpen, setProfilDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  // Helper: ensure Profil always has children
  const ensureProfilChildren = (links: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>) => {
    return links.map(link => {
      if (link.label.toLowerCase() === 'profil' && (!link.children || link.children.length === 0)) {
        return {
          ...link,
          children: [
            { label: 'Profil', href: '/profil' },
            { label: 'Program', href: '/program' },
            { label: 'Galeri', href: '/galeri' },
          ],
        };
      }
      return link;
    });
  };

  // Fetch navigation items from API
  useEffect(() => {
    if (navigationItems && navigationItems.length > 0) {
      const items = navigationItems
        .filter((item) => item.is_active ?? true)
        .map((item) => ({ label: item.label, href: normalizeHref(item.href) }));
      
      // Filter out Program and Galeri (they're now children of Profil)
      const filteredItems = items.filter(i => 
        i.label.toLowerCase() !== 'program' && i.label.toLowerCase() !== 'galeri'
      );
      
      // Always merge with default items to ensure critical items are present
      if (filteredItems.length > 0) {
        const apiLabels = new Set(filteredItems.map(i => i.label.toLowerCase()));
        const missingDefaults = defaultNavLinks.filter(d => !apiLabels.has(d.label.toLowerCase()));
        setNavLinks(ensureProfilChildren([...filteredItems, ...missingDefaults]));
      } else {
        setNavLinks(defaultNavLinks);
      }
      setNavLoading(false);
      return;
    }

    const fetchNav = async () => {
      try {
        const res = await fetch('/api/website/navigation');
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const apiItems = json.data
            .map((item: any) => ({ label: item.label, href: normalizeHref(item.href) }))
            .filter((i: { label: string; href: string }) => 
              i.label.toLowerCase() !== 'program' && i.label.toLowerCase() !== 'galeri'
            );
          // Merge: Keep API items in their order, but add missing default items at the end
          const apiLabels = new Set(apiItems.map((i: { label: string; href: string }) => i.label.toLowerCase()));
          const missingDefaults = defaultNavLinks.filter(d => !apiLabels.has(d.label.toLowerCase()));
          setNavLinks(ensureProfilChildren([...apiItems, ...missingDefaults]));
        } else {
          // Use default navLinks if API returns empty
          setNavLinks(defaultNavLinks);
        }
      } catch (err) {
        console.error('[PublicNavbar] Failed to fetch navigation:', err);
        // Use default navLinks if fetch fails
        setNavLinks(defaultNavLinks);
      } finally {
        setNavLoading(false);
      }
    };
    fetchNav();
  }, [navigationItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfilDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    bgColor = 'rgba(255, 251, 235, 0.97)';
    blur = 'blur(18px)';
    border = '1px solid rgba(245,158,11,0.14)';
    shadow = '0 4px 32px rgba(0,0,0,0.08)';
  } else {
    // Landing page belum scroll — tetap transparan
    bgColor = 'rgba(255, 251, 235, 0.85)';
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
          <Link href="/" className="flex items-center gap-3 group shrink-0 no-underline transition-all duration-300">
            {cachedLogoUrl && !hasLogoError ? (
              <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-400/30 group-hover:ring-amber-400/60 group-hover:shadow-lg group-hover:shadow-amber-400/20 transition-all duration-300 shrink-0 will-change-transform group-hover:scale-110">
                <Image
                  src={cachedLogoUrl}
                  alt={namaLembaga}
                  fill
                  priority
                  className="object-cover transition-transform duration-300 group-hover:scale-125"
                  sizes="36px"
                  onError={() => setHasLogoError(true)}
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-500/30 will-change-transform"
                style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)'}}>
                <BookOpen size={16} className="text-white transition-transform duration-300" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-semibold text-slate-900 text-base leading-tight block tracking-tight transition-colors duration-300 group-hover:text-amber-600">
                {namaLembaga.replace("'", '\u2019')}
              </span>
              <span className="text-amber-600/70 text-[11px] leading-none transition-colors duration-300 group-hover:text-amber-500/90">
                {namaSekolah ?? 'Tahfidz & Tahsin'}
              </span>
            </div>
          </Link>

          {/* ── Desktop nav ──────────────────────────────────── */}
          <nav className="hidden lg:flex items-center gap-2 ml-8">
            {navLinks.map((link, idx) => {
              const active = isActive(link.href);
              const isExternal = /^https?:\/\//.test(link.href);
              const hasChildren = link.children && link.children.length > 0;

              if (hasChildren) {
                return (
                  <div 
                    key={link.href} 
                    className="relative"
                    ref={idx === 0 ? dropdownRef : undefined}
                    onMouseEnter={() => setProfilDropdownOpen(true)}
                    onMouseLeave={() => setProfilDropdownOpen(false)}
                  >
                    <button
                      onClick={() => setProfilDropdownOpen(p => !p)}
                      className={`relative inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-out will-change-colors group ${active ? 'text-slate-900 bg-gradient-to-r from-amber-100 to-amber-50 ring-1 ring-amber-300' : 'text-slate-600 bg-amber-50/50 hover:bg-amber-100 hover:text-slate-900'}`}
                    >
                      {link.label}
                      <ChevronDown size={14} className={`transition-transform duration-200 ${profilDropdownOpen ? 'rotate-180' : ''}`} />
                      {active && (
                        <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 animate-pulse-soft" style={{willChange: 'transform'}} />
                      )}
                    </button>
                    
                    {/* Dropdown */}
                    <div 
                      className={`absolute top-full left-0 mt-2 w-48 bg-white rounded-xl border border-amber-100 shadow-lg shadow-amber-500/10 py-2 transition-all duration-200 z-50 ${profilDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                    >
                      {link.children!.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setProfilDropdownOpen(false)}
                            className={`block px-4 py-2.5 text-sm font-medium transition-colors ${childActive ? 'text-amber-700 bg-amber-50' : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50'}`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                  }}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ease-out will-change-colors group ${active ? 'text-slate-900 bg-gradient-to-r from-amber-100 to-amber-50 ring-1 ring-amber-300' : 'text-slate-600 bg-amber-50/50 hover:bg-amber-100 hover:text-slate-900'}`}
                  title={link.label}
                >
                  {link.label}
                  {active && !isExternal && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 animate-pulse-soft" style={{willChange: 'transform'}} />
                  )}
                  {!active && !isExternal && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" style={{willChange: 'transform'}} />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* ── CTA + Mobile toggle ──────────────────────────── */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/wali/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 hover:ring-emerald-300 active:scale-95 transition-all duration-300 will-change-transform group"
            >
              <User size={14} className="transition-transform duration-300 group-hover:scale-110" />
              <span className="hidden md:inline">Wali Murid</span>
            </Link>
            <Link
              href="/auth/login"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-400 shadow-md shadow-amber-500/30 hover:shadow-lg hover:shadow-amber-500/50 active:scale-95 transition-all duration-300 will-change-transform group"
            >
              <LogIn size={15} className="transition-transform duration-300 group-hover:scale-110" />
              Masuk
            </Link>
            <button
              className="lg:hidden touch-target rounded-lg transition-all duration-300 will-change-colors"
              style={{color: 'rgba(120,90,40,0.7)', touchAction: 'manipulation'}}
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              onMouseEnter={e => { 
                (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.15)'; 
                (e.currentTarget as HTMLElement).style.color = '#92400e'; 
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={e => { 
                (e.currentTarget as HTMLElement).style.background = 'transparent'; 
                (e.currentTarget as HTMLElement).style.color = 'rgba(120,90,40,0.7)'; 
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              {menuOpen ? <X size={20} className="animate-rotate" /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────── */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-[80vh] opacity-100 visible' : 'max-h-0 opacity-0 invisible'}`} style={{ background: 'rgba(255, 251, 235, 0.98)', backdropFilter: 'blur(18px)' }}>
          <div className="px-4 py-4 space-y-2 overflow-contain">
          {navLinks.map((link, idx) => {
            const active = isActive(link.href);
            const isExternal = /^https?:\/\//.test(link.href);
            const hasChildren = link.children && link.children.length > 0;

            if (hasChildren) {
              return (
                <div key={link.href}>
                  <button
                    onClick={() => setProfilDropdownOpen(p => !p)}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-out hover:scale-105 will-change-transform"
                    style={{
                      background: active ? 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.08))' : 'rgba(0,0,0,0.02)',
                      animationDelay: menuOpen ? `${idx * 50}ms` : '0ms',
                      animation: menuOpen ? `slideDown 0.4s ease-out backwards` : 'none',
                    }}
                  >
                    <span style={{color: active ? '#92400e' : 'rgba(80,60,30,0.8)'}}>
                      {link.label}
                    </span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${profilDropdownOpen ? 'rotate-180' : ''}`} style={{color: active ? '#92400e' : 'rgba(80,60,30,0.5)'}} />
                  </button>
                  
                  {/* Submenu */}
                  <div className={`overflow-hidden transition-all duration-200 ${profilDropdownOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-4 space-y-1 mt-1">
                      {link.children!.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ease-out hover:scale-105 will-change-transform"
                            style={{
                              background: childActive ? 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.08))' : 'rgba(0,0,0,0.02)',
                            }}
                          >
                            <span style={{color: childActive ? '#92400e' : 'rgba(80,60,30,0.8)'}}>
                              {child.label}
                            </span>
                            <span className={`h-2 w-2 rounded-full transition-all duration-300 ${childActive ? 'bg-amber-500 scale-125' : 'bg-amber-200/50'}`} />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                onClick={() => !isExternal && setMenuOpen(false)}
                style={{
                  animationDelay: menuOpen ? `${idx * 50}ms` : '0ms',
                  animation: menuOpen ? `slideDown 0.4s ease-out backwards` : 'none',
                }}
                className="flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ease-out hover:scale-105 will-change-transform"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = active && !isExternal
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.14))'
                    : 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = active && !isExternal
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(217,119,6,0.08))'
                    : 'rgba(0,0,0,0.02)';
                }}
              >
                <span style={{color: active && !isExternal ? '#92400e' : 'rgba(80,60,30,0.8)'}}>
                  {link.label}
                </span>
                <span className={`h-2 w-2 rounded-full transition-all duration-300 ${active && !isExternal ? 'bg-amber-500 scale-125' : 'bg-amber-200/50'}`} />
              </Link>
            );
          })}

          <div className="pt-3 border-t border-amber-200 mt-2 space-y-2" style={{animation: menuOpen ? 'slideUp 0.4s ease-out 0.15s backwards' : 'none'}}>
            <Link
              href="/wali/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 hover:ring-emerald-300 active:scale-95 transition-all duration-300 will-change-transform"
            >
              <User size={15} />
              Wali Murid
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/50 active:scale-95 will-change-transform"
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
