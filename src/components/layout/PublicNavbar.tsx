'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BookOpen, Menu, X, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';

const navLinks = [
  { label: 'Beranda', href: '/#beranda' },
  { label: 'Profil', href: '/#profil' },
  { label: 'Program', href: '/#program' },
  { label: 'Pengumuman', href: '/#pengumuman' },
  { label: 'Artikel', href: '/artikel' },
  { label: 'Agenda', href: '/#agenda' },
];

interface PublicNavbarProps {
  logoUrl?: string | null;
  namaLembaga?: string;
}

export default function PublicNavbar({ logoUrl, namaLembaga = "Tim Qur'an" }: PublicNavbarProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Tutup menu saat navigasi
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-[#0f172a]/95 shadow-xl shadow-black/20 border-b border-white/5'
        : 'bg-transparent border-b border-white/0'
    } backdrop-blur-md`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 md:h-[72px]">

          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            {logoUrl ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden ring-2 ring-indigo-400/30 group-hover:ring-indigo-400/60 transition-all shrink-0">
                <Image src={logoUrl} alt={namaLembaga} fill className="object-cover" sizes="40px" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
                style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
                <BookOpen size={18} className="text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <span className="font-bold text-white text-lg leading-tight block">
                {namaLembaga.replace("'", '\u2019')}
              </span>
              <span className="text-indigo-300/60 text-xs leading-none">Tahfidz &amp; Tahsin</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.href === '/artikel'
                ? pathname.startsWith('/artikel')
                : pathname === '/' && link.href.startsWith('/#');
              return (
                <a key={link.href} href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-indigo-300 bg-indigo-500/15'
                      : 'text-white/65 hover:text-white hover:bg-white/[0.08]'
                  }`}>
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-2">
            <Link href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-100"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)'}}>
              <Sparkles size={14} /> Masuk
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen(p => !p)}
              aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 px-4 py-4 space-y-1"
          style={{background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)'}}>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors">
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)}
            className="block px-4 py-3 rounded-xl text-sm font-semibold text-white text-center mt-3 transition-all"
            style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
            Masuk ke Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
