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
import { useViewMode } from '@/hooks/useViewMode';
import { useNavigation } from '@/hooks/useSWRFetcher';
import type { UserRole } from '@/types';

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
  { label: 'Dashboard Guru', href: '/dashboard-guru',     icon: <LayoutDashboard size={16} />, group: 'Utama', roles: ['Kabid', 'Sekretaris'] },

  // ── Akademik ─────────────────────────────────────────────────────────
  { label: 'Data Siswa',     href: '/siswa',              icon: <Users size={16} />,           group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Hafalan & Tahsin', href: '/tahsin',           icon: <BookOpen size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Raport',         href: '/raport',             icon: <FileText size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },

  // ── Kehadiran ────────────────────────────────────────────────────────
  { label: 'Absensi',        href: '/absensi',            icon: <BarChart2 size={16} />,       group: 'Kehadiran', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Monitoring',     href: '/absensi/monitoring', icon: <TrendingUp size={16} />,      group: 'Kehadiran', roles: ['Kabid'] },
  { label: 'Scan QR',        href: '/scan',               icon: <QrCode size={16} />,          group: 'Kehadiran', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },

  // ── Manajemen ────────────────────────────────────────────────────────
  { label: 'Rekap Tahfidz & Tahsin', href: '/rekap',              icon: <Repeat size={16} />,          group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Laporan Progres', href: '/laporan',           icon: <TrendingUp size={16} />,      group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Semester',       href: '/semester',           icon: <CalendarDays size={16} />,    group: 'Manajemen', roles: ['Kabid'] },
  { label: 'Kelas',          href: '/kelas',              icon: <School size={16} />,          group: 'Manajemen', roles: ['Kabid'] },
  { label: "Tim Qur'an",     href: '/tim',                icon: <UserCheck size={16} />,       group: 'Manajemen', roles: ['Kabid'] },

  // ── Konten ───────────────────────────────────────────────────────────
  { label: 'Kelola Pengumuman', href: '/dashboard/pengumuman', icon: <Megaphone size={16} />,       group: 'Konten', roles: ['Kabid', 'Sekretaris', 'Bendahara'] },
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
  Wali_Murid: 'Wali Murid',
};

const ROLE_COLORS: Record<UserRole, string> = {
  Kabid:      '#a5b4fc',
  Tim_Quran:  '#93c5fd',
  Sekretaris: '#6ee7b7',
  Bendahara:  '#fcd34d',
  Wali_Murid: '#34d399',
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userName } = useSession();
  const { role } = useRole();
  const { getEffectiveRole, isViewingAsOther } = useViewMode();
  const effectiveRole = getEffectiveRole(role);
  const { items: navItems } = useNavigation();

  // Build navMap from SWR cached data
  const navMap: Record<string, string> = {};
  if (navItems && Array.isArray(navItems)) {
    navItems.forEach((it: any) => {
      if (it.label && it.href) navMap[it.label] = it.href;
    });
  }

  const visibleMenus = menuItems.filter(item => {
    if (!item.roles || item.roles.length === 0) return true;
    if (!effectiveRole) return false;
    return item.roles.includes(effectiveRole);
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
        style={{background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)'}}>

        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0"
          style={{borderBottom: '1px solid rgba(245,158,11,0.1)'}}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)'}}>
            <BookOpen size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight">Tim Qur&apos;an</p>
            <p className="text-amber-600/70 text-xs leading-tight">Dashboard</p>
          </div>
          <button onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-amber-100 transition-colors"
            style={{minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
            aria-label="Tutup sidebar">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scroll-smooth-touch"
          style={{scrollbarWidth: 'thin', scrollbarColor: 'rgba(217,119,6,0.1) transparent'}}>
          {groups.map(group => {
            const items = visibleMenusWithSyncedHrefs.filter(m => m.group === group);
            return (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2"
                  style={{color: 'rgba(217,119,6,0.5)'}}>
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
                          background: isActive ? 'rgba(245,158,11,0.12)' : 'transparent',
                          color: isActive ? '#b45309' : 'rgba(120,90,40,0.65)',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(245,158,11,0.06)';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(120,90,40,0.9)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(120,90,40,0.65)';
                          }
                        }}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{background: 'linear-gradient(180deg, #d97706, #f59e0b)'}} />
                        )}
                        <span style={{color: isActive ? '#d97706' : 'rgba(217,119,6,0.4)'}}
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
        <div className="p-3 shrink-0" style={{borderTop: '1px solid rgba(245,158,11,0.1)'}}>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl"
            style={{background: 'rgba(245,158,11,0.06)'}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{background: 'linear-gradient(135deg, #d97706, #f59e0b)'}}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                {userName ?? 'Pengguna'}
              </p>
              <p className="text-xs leading-tight"
                style={{color: effectiveRole ? ROLE_COLORS[effectiveRole] : '#d97706'}}>
                {effectiveRole ? ROLE_LABELS[effectiveRole] : ''}
              </p>
              {isViewingAsOther && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Eye size={9} className="text-amber-600/60" />
                  <span className="text-[10px] text-amber-600/60">Mode Mengajar</span>
                </div>
              )}
              {!isViewingAsOther && role === 'Sekretaris' && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Eye size={9} className="text-amber-600/60" />
                  <span className="text-[10px] text-amber-600/60">Dalam pantauan Kabid</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
