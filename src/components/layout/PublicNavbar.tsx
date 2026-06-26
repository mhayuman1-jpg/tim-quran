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

  const defaultNavLinks = [
    { label: 'Beranda', href: '/' },
    { label: 'Profil', href: '/profil', children: [
      { label: 'Profil', href: '/profil' },
      { label: 'Program', href: '/program' },
      { label: 'Galeri', href: '/galeri' },
    ]},
    { label: 'Pengumuman', href: '/pengumuman' },
    { label: 'Artikel', href: '/artikel' },
    { label: 'Agenda', href: '/agenda' },
  ];

  const [navLinks, setNavLinks] = useState<Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>>(defaultNavLinks);
  const [profilDropdownOpen, setProfilDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ensureProfilChildren = (links: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>) => {
    return links.map(link => {
      if (link.label.toLowerCase() === 'profil' && (!link.children || link.children.length === 0)) {
        return { ...link, children: [
          { label: 'Profil', href: '/profil' },
          { label: 'Program', href: '/program' },
          { label: 'Galeri', href: '/galeri' },
        ]};
      }
      return link;
    });
  };

  useEffect(() => {
    if (navigationItems && navigationItems.length > 0) {
      const items = navigationItems
        .filter((item) => item.is_active ?? true)
        .map((item) => ({ label: item.label, href: normalizeHref(item.href) }));
      const filteredItems = items.filter(i =>
        i.label.toLowerCase() !== 'program' && i.label.toLowerCase() !== 'galeri'
      );
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
          const apiLabels = new Set(apiItems.map((i: { label: string; href: string }) => i.label.toLowerCase()));
          const missingDefaults = defaultNavLinks.filter(d => !apiLabels.has(d.label.toLowerCase()));
          setNavLinks(ensureProfilChildren([...apiItems, ...missingDefaults]));
        } else {
          setNavLinks(defaultNavLinks);
        }
      } catch {
        setNavLinks(defaultNavLinks);
      } finally {
        setNavLoading(false);
      }
    };
    fetchNav();
  }, [navigationItems]);

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

  const getImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Math.floor(Date.now() / 60000)}`;
  };

  const cachedLogoUrl = getImageUrl(logoUrl);
  const isLanding = pathname === '/';

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-500 ${
        isLanding && !scrolled ? 'mt-0 sm:mt-4' : 'top-0'
      }`}
    >
      <div
        className={`mx-auto transition-all duration-500 ${
          isLanding && !scrolled
            ? 'max-w-full sm:max-w-5xl rounded-none sm:rounded-full'
            : 'max-w-full rounded-none'
        } ${
          scrolled || !isLanding
            ? 'glass-premium shadow-glass'
            : 'bg-white/70 backdrop-blur-xl border-b sm:border border-white/30 shadow-glass'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 md:h-[68px]">

            {/* Brand */}
            <Link href="/" className="flex items-center gap-3 group shrink-0 no-underline transition-all duration-300">
              {cachedLogoUrl && !hasLogoError ? (
                <div className="relative w-9 h-9 rounded-xl overflow-hidden ring-2 ring-amber-400/30 group-hover:ring-amber-400/60 transition-all duration-300 shrink-0 group-hover:scale-110">
                  <Image
                    src={cachedLogoUrl!}
                    alt={namaLembaga}
                    fill
                    priority
                    className="object-cover transition-transform duration-300 group-hover:scale-125"
                    sizes="36px"
                    onError={() => setHasLogoError(true)}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110"
                  style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)'}}
                >
                  <BookOpen size={16} className="text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <span className="font-semibold text-slate-900 text-base leading-tight block tracking-tight">
                  {namaLembaga.replace("'", '\u2019')}
                </span>
                <span className="text-amber-600/70 text-[11px] leading-none">
                  {namaSekolah ?? 'Tahfidz & Tahsin'}
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                const isExternal = /^https?:\/\//.test(link.href);
                const hasChildren = link.children && link.children.length > 0;

                if (hasChildren) {
                  return (
                    <div key={link.href} className="relative"
                      onMouseEnter={() => setProfilDropdownOpen(true)}
                      onMouseLeave={() => setProfilDropdownOpen(false)}
                    >
                      <button
                        onClick={() => setProfilDropdownOpen(p => !p)}
                        className={`relative inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                          active
                            ? 'text-amber-900 bg-amber-100/80'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-black/3'
                        }`}
                      >
                        {link.label}
                        <ChevronDown size={13} className={`transition-transform duration-200 ${profilDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-amber-400" />}

                      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-2xl border border-black/5 shadow-premium-lg py-2 transition-all duration-200 ${
                        profilDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                      }`}>
                        {link.children!.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => { setProfilDropdownOpen(false); setMenuOpen(false); }}
                              className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                                childActive ? 'text-amber-700 bg-amber-50' : 'text-slate-600 hover:text-slate-900 hover:bg-amber-50/50'
                              }`}
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
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                      active
                        ? 'text-amber-900 bg-amber-100/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-black/3'
                    }`}
                  >
                    {link.label}
                    {active && (
                      <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-amber-400" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* CTA + Mobile toggle */}
            <div className="flex items-center gap-1.5">
              <Link
                href="/wali/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all duration-300"
              >
                <User size={14} />
                <span className="hidden md:inline">Wali Murid</span>
              </Link>
              <Link
                href="/auth/login"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all duration-300 active:scale-95"
                style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)'}}
              >
                <LogIn size={14} />
                Masuk
              </Link>
              <button
                className="lg:hidden touch-target rounded-lg transition-all duration-300 text-amber-700/60 hover:bg-amber-100/50 hover:text-amber-800"
                onClick={() => setMenuOpen(p => !p)}
                aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${
        menuOpen ? 'max-h-[80vh] opacity-100 visible' : 'max-h-0 opacity-0 invisible'
      }`}>
        <div className="mx-4 mt-1 bg-white/95 backdrop-blur-xl rounded-3xl border border-black/5 shadow-premium-lg px-4 py-4 space-y-1 overflow-contain">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            const isExternal = /^https?:\/\//.test(link.href);
            const hasChildren = link.children && link.children.length > 0;

            if (hasChildren) {
              return (
                <div key={link.href}>
                  <button
                    onClick={() => setProfilDropdownOpen(p => !p)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                      active ? 'bg-amber-100/60 text-amber-900' : 'text-slate-700 hover:bg-black/3'
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${profilDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-200 ${profilDropdownOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-4 space-y-0.5 mt-1">
                      {link.children!.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => { setMenuOpen(false); setProfilDropdownOpen(false); }}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                              childActive ? 'bg-amber-100/60 text-amber-900' : 'text-slate-600 hover:bg-black/3'
                            }`}
                          >
                            <span>{child.label}</span>
                            <span className={`h-2 w-2 rounded-full transition-all duration-300 ${childActive ? 'bg-amber-500' : 'bg-amber-200/50'}`} />
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
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                  active && !isExternal ? 'bg-amber-100/60 text-amber-900' : 'text-slate-700 hover:bg-black/3'
                }`}
              >
                <span>{link.label}</span>
                <span className={`h-2 w-2 rounded-full transition-all duration-300 ${active && !isExternal ? 'bg-amber-500' : 'bg-amber-200/50'}`} />
              </Link>
            );
          })}

          <div className="pt-3 border-t border-black/5 mt-3 space-y-2">
            <Link
              href="/wali/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 hover:bg-emerald-100 active:scale-95 transition-all duration-300"
            >
              <User size={15} />
              Wali Murid
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-full text-sm font-semibold text-white transition-all duration-300 active:scale-95"
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
