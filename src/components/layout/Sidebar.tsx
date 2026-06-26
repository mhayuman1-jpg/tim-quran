'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import Image from 'next/image';
import {
  LayoutDashboard, Users, BookOpen,
  FileText, BarChart2, Repeat, TrendingUp,
  School, UserCheck, Megaphone, Newspaper, Settings, Globe, X, Eye,
  CalendarDays, MessageCircle, MessageSquareQuote,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useRole } from '@/hooks/useRole';
import { useViewMode } from '@/hooks/useViewMode';
import { useNavigation } from '@/hooks/useSWRFetcher';
import { toImageUrl } from '@/lib/storage/urls';
import type { UserRole } from '@/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  group?: string;
  roles?: UserRole[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard',      href: '/dashboard',          icon: <LayoutDashboard size={16} />, group: 'Utama' },
  { label: 'Dashboard Guru', href: '/dashboard-guru',     icon: <LayoutDashboard size={16} />, group: 'Utama', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Data Siswa',     href: '/siswa',              icon: <Users size={16} />,           group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Hafalan & Tahsin', href: '/tahsin',           icon: <BookOpen size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Raport',         href: '/raport',             icon: <FileText size={16} />,        group: 'Akademik', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Absensi',        href: '/absensi',            icon: <BarChart2 size={16} />,       group: 'Kehadiran', roles: ['Kabid', 'Tim_Quran', 'Sekretaris'] },
  { label: 'Monitoring',     href: '/absensi/monitoring', icon: <TrendingUp size={16} />,      group: 'Kehadiran', roles: ['Kabid'] },
  { label: 'Pesan',              href: '/pesan',              icon: <MessageCircle size={16} />,    group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Rekap Tahfidz & Tahsin', href: '/rekap',              icon: <Repeat size={16} />,          group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Laporan Progres', href: '/laporan',           icon: <TrendingUp size={16} />,      group: 'Manajemen', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Semester',       href: '/semester',           icon: <CalendarDays size={16} />,    group: 'Manajemen', roles: ['Kabid'] },
  { label: 'Kelas',          href: '/kelas',              icon: <School size={16} />,          group: 'Manajemen', roles: ['Kabid'] },
  { label: "Tim Qur'an",     href: '/tim',                icon: <UserCheck size={16} />,       group: 'Manajemen', roles: ['Kabid'] },
  { label: 'Kelola Pengumuman', href: '/dashboard/pengumuman', icon: <Megaphone size={16} />,       group: 'Konten', roles: ['Kabid', 'Sekretaris', 'Bendahara'] },
  { label: 'Kelola Artikel',    href: '/dashboard/kelola-artikel', icon: <Newspaper size={16} />,       group: 'Konten', roles: ['Kabid', 'Sekretaris'] },
  { label: 'Kelola Testimoni',  href: '/kelola-testimoni', icon: <MessageSquareQuote size={16} />,  group: 'Konten', roles: ['Kabid'] },
  { label: 'Kelola Website',    href: '/dashboard/website', icon: <Globe size={16} />,           group: 'Konten', roles: ['Kabid'] },
  { label: 'Pengaturan',     href: '/pengaturan',         icon: <Settings size={16} />,        group: 'Akun' },
];

const ROLE_LABELS: Record<UserRole, string> = {
  Kabid: 'Kepala Bidang',
  Tim_Quran: "Tim Qur'an",
  Sekretaris: 'Sekretaris',
  Bendahara: 'Bendahara',
  Wali_Murid: 'Wali Murid',
};

const ROLE_COLORS: Record<UserRole, string> = {
  Kabid: '#6366f1',
  Tim_Quran: '#3b82f6',
  Sekretaris: '#10b981',
  Bendahara: '#f59e0b',
  Wali_Murid: '#34d399',
};

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userName, session } = useSession();
  const userPhotoUrl = session?.user?.photo_url || null;
  const { role } = useRole();
  const { getEffectiveRole, isViewingAsOther } = useViewMode();
  const effectiveRole = getEffectiveRole(role);
  const { items: navItems } = useNavigation();

  const { data: unreadData } = useSWR('/api/messages/unread-count', {
    refreshInterval: 30000,
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

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

  const visibleMenusWithSyncedHrefs = visibleMenus.map(m => ({ ...m, href: navMap[m.label] ?? m.href }));
  const groups = Array.from(new Set(visibleMenusWithSyncedHrefs.map(m => m.group)));

  const isActiveItem = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/absensi') return pathname === '/absensi';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden overflow-contain"
          onClick={onClose} aria-hidden="true" />
      )}

      <aside className={[
        'w-[250px] flex flex-col h-screen shrink-0',
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:relative lg:translate-x-0 lg:z-auto lg:transition-none',
      ].join(' ')}
        style={{ background: '#fcfbf9' }}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0 border-b border-black/5">
          <div className="w-9 h-9 rounded-full shrink-0 shadow-sm overflow-hidden bg-white">
            <Image src="/favicon.png" alt="Logo Tim Qur'an" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 text-sm leading-tight tracking-tight">Tim Qur'an</p>
            <p className="text-amber-600/70 text-[11px] leading-tight">Dashboard</p>
          </div>
          <button onClick={onClose}
            className="lg:hidden touch-target rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors"
            aria-label="Tutup sidebar">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6 scroll-smooth-touch"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.06) transparent' }}>
          {groups.map(group => {
            const items = visibleMenusWithSyncedHrefs.filter(m => m.group === group);
            return (
              <div key={group}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] px-3 mb-2 text-slate-400">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive = isActiveItem(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative min-h-[44px] ${
                          isActive
                            ? 'text-amber-800 bg-amber-50/80 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-black/[0.03]'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-gradient-to-b from-amber-500 to-amber-400" />
                        )}
                        <span className={`shrink-0 ml-1 relative transition-colors duration-200 ${
                          isActive ? 'text-amber-500' : 'text-slate-400 group-hover:text-slate-500'
                        }`}>
                          {item.icon}
                          {item.label === 'Pesan' && unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-3 pb-3 shrink-0">
          <div className="shell-card">
            <div className="inner-card !p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden shadow-sm bg-amber-100 flex items-center justify-center">
                  {userPhotoUrl ? (
                    <Image
                      src={toImageUrl(userPhotoUrl, 'timquran-profile-photos') || ''}
                      alt={userName || 'User'}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-amber-700 font-bold text-xs">
                      {userName ? userName.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate leading-tight">
                    {userName ?? 'Pengguna'}
                  </p>
                  <p className="text-xs leading-tight" style={{ color: effectiveRole ? ROLE_COLORS[effectiveRole] : '#d97706' }}>
                    {effectiveRole ? ROLE_LABELS[effectiveRole] : ''}
                  </p>
                </div>
              </div>
              {(isViewingAsOther || role === 'Sekretaris') && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-black/5">
                  <Eye size={10} className="text-amber-500/60" />
                  <span className="text-[10px] text-amber-600/60 font-medium">
                    {isViewingAsOther ? 'Mode Mengajar' : 'Dalam pantauan Kabid'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
