'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen,
  FileText, QrCode, BarChart2, Repeat, TrendingUp,
  School, UserCheck, Megaphone, Newspaper, Settings, Globe, X, Eye,
  CalendarDays,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useRole } from '@/hooks/useRole';
import type { UserRole } from '@/types';
import { useEffect, useState } from 'react';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
  /** Roles yang boleh melihat menu ini. Kosong = semua role. */
  roles?: UserRole[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
  // ── Utama ────────────────────────────────────────────────────────────
  { label: 'Dashboard',      href: '/dashboard',          icon: <LayoutDashboard size={16} />, group: 'Utama' },

  // ── Akademik ─────────────────────────────────────────────────────────
  { label: 'Data Siswa',     href: '/siswa',              icon: <Users size={16} />,           group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Hafalan & Tahsin', href: '/tahsin',           icon: <BookOpen size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran'] },
  { label: 'Raport',         href: '/raport',             icon: <FileText size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran'] },

  // ── Kehadiran ────────────────────────────────────────────────────────
  { label: 'Absensi',        href: '/absensi',            icon: <BarChart2 size={16} />,       group: 'Kehadiran', roles: ['Kabid', 'Tim_Quran'] },
  { label: 'Monitoring',     href: '/absensi/monitoring', icon: <TrendingUp size={16} />,      group: 'Kehadiran', roles: ['Kabid'] },
  { label: 'Scan QR',        href: '/scan',               icon: <QrCode size={16} />,          group: 'Kehadiran', roles: ['Kabid', 'Tim_Quran'] },

  // ── Manajemen ────────────────────────────────────────────────────────
  { label: 'Rekap Bulanan',  href: '/rekap',              icon: <Repeat size={16} />,          group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Laporan',        href: '/laporan',            icon: <TrendingUp size={16} />,      group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Semester',       href: '/semester',           icon: <CalendarDays size={16} />,     group: 'Manajemen', roles: ['Kabid'] },
  { label: 'Kelas',          href: '/kelas',              icon: <School size={16} />,          group: 'Manajemen', roles: ['Kabid'] },
  { label: "Tim Qur'an",     href: '/tim',                icon: <UserCheck size={16} />,       group: 'Manajemen', roles: ['Kabid'] },

  // ── Konten ───────────────────────────────────────────────────────────
  { label: 'Kelola Pengumuman', href: '/dashboard/pengumuman', icon: <Megaphone size={16} />,       group: 'Konten', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Kelola Artikel',    href: '/dashboard/kelola-artikel', icon: <Newspaper size={16} />,       group: 'Konten', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Kelola Website',    href: '/dashboard/website', icon: <Globe size={16} />,           group: 'Konten', roles: ['Kabid'] },

  // ── Akun ─────────────────────────────────────────────────────────────
  { label: 'Pengaturan',     href: '/pengaturan',         icon: <Settings size={16} />,        group: 'Akun' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  Kabid:      'Kepala Bidang',
  Tim_Quran:  "Tim Qur'an",
  Sekretaris: 'Sekretaris',
  Bendahara:  'Bendahara',
};

const ROLE_COLORS: Record<UserRole, string> = {
  Kabid:      '#a5b4fc',
  Tim_Quran:  '#93c5fd',
  Sekretaris: '#6ee7b7',
  Bendahara:  '#fcd34d',
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userName } = useSession();
  const { role } = useRole();
  const [navMap, setNavMap] = useState<Record<string, string>>({});

  // Fetch public navigation items and build a map label->href so admin sidebar
  // uses the same hrefs as the public navbar (keeps menus in sync).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/website/navigation');
        const json = await res.json();
        if (mounted && json.data && Array.isArray(json.data)) {
          const map: Record<string, string> = {};
          json.data.forEach((it: any) => {
            if (it.label && it.href) map[it.label] = it.href;
          });
          setNavMap(map);
        }
      } catch {
        // ignore — fall back to hardcoded menu
      }
    })();
    return () => { mounted = false; };
  }, []);

  const visibleMenus = menuItems.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!role) return false;
    return item.roles.includes(role);
  });

  // If navMap provides alternate hrefs for public items, use them here so
  // the admin sidebar links point to the same destinations as the public navbar.
  const visibleMenusWithSyncedHrefs = visibleMenus.map(m => ({ ...m, href: navMap[m.label] ?? m.href }));

  const groups = Array.from(new Set(visibleMenusWithSyncedHrefs.map(m => m.group)));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden overflow-contain"
          onClick={onClose} aria-hidden="true" />
      )}

      <aside className={[
        'w-[240px] flex flex-col h-screen shrink-0',
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:relative lg:translate-x-0 lg:z-auto lg:transition-none',
      ].join(' ')}
        style={{background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)'}}>

        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0"
          style={{borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
            <BookOpen size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Tim Qur&apos;an</p>
            <p className="text-indigo-400/60 text-xs leading-tight">Dashboard</p>
          </div>
          <button onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            style={{minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            aria-label="Tutup sidebar">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scroll-smooth-touch"
          style={{scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent'}}>
          {groups.map(group => {
            const items = visibleMenusWithSyncedHrefs.filter(m => m.group === group);
            return (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2"
                  style={{color: 'rgba(165,180,252,0.4)'}}>
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive =
                      item.href === '/dashboard' ? pathname === '/dashboard'
                      : item.href === '/absensi'  ? pathname === '/absensi'
                      : pathname.startsWith(item.href);

                    return (
                      <Link key={item.href} href={item.href}
                        className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-all relative min-h-[44px]"
                        style={{
                          background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                          }
                        }}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{background: 'linear-gradient(180deg, #6366f1, #8b5cf6)'}} />
                        )}
                        <span style={{color: isActive ? '#818cf8' : 'rgba(255,255,255,0.35)'}}
                          className="shrink-0 ml-1">
                          {item.icon}
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="p-3 shrink-0" style={{borderTop: '1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{background: 'rgba(255,255,255,0.05)'}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">
                {userName ?? 'Pengguna'}
              </p>
              <p className="text-xs leading-tight"
                style={{color: role ? ROLE_COLORS[role] : '#a5b4fc'}}>
                {role ? ROLE_LABELS[role] : ''}
              </p>
              {/* Indikator pemantauan Kabid untuk Sekretaris */}
              {role === 'Sekretaris' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Eye size={9} className="text-emerald-400/60" />
                  <span className="text-[10px] text-emerald-400/60">Dalam pantauan Kabid</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
