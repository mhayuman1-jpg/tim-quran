'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  FileText, QrCode, BarChart2, Repeat, TrendingUp,
  School, UserCheck, Megaphone, Newspaper, Settings, Globe, X,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { useRole } from '@/hooks/useRole';
import type { UserRole } from '@/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  kabidOnly?: boolean;
  group?: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} />, group: 'Utama' },
  { label: 'Data Siswa', href: '/siswa', icon: <Users size={16} />, group: 'Akademik' },
  { label: 'Hafalan', href: '/hafalan', icon: <BookOpen size={16} />, group: 'Akademik' },
  { label: 'Tahsin', href: '/tahsin', icon: <ClipboardList size={16} />, group: 'Akademik' },
  { label: 'Raport', href: '/raport', icon: <FileText size={16} />, group: 'Akademik' },
  { label: 'Absensi', href: '/absensi', icon: <BarChart2 size={16} />, group: 'Kehadiran' },
  { label: 'Monitoring', href: '/absensi/monitoring', icon: <TrendingUp size={16} />, group: 'Kehadiran', kabidOnly: true },
  { label: 'Scan QR', href: '/scan', icon: <QrCode size={16} />, group: 'Kehadiran' },
  { label: 'Rekap Bulanan', href: '/rekap', icon: <Repeat size={16} />, group: 'Manajemen' },
  { label: 'Laporan', href: '/laporan', icon: <TrendingUp size={16} />, group: 'Manajemen', kabidOnly: true },
  { label: 'Kelas', href: '/kelas', icon: <School size={16} />, group: 'Manajemen', kabidOnly: true },
  { label: "Tim Qur'an", href: '/tim', icon: <UserCheck size={16} />, group: 'Manajemen', kabidOnly: true },
  { label: 'Pengumuman', href: '/pengumuman', icon: <Megaphone size={16} />, group: 'Konten' },
  { label: 'Artikel', href: '/kelola-artikel', icon: <Newspaper size={16} />, group: 'Konten', kabidOnly: true },
  { label: 'Kelola Website', href: '/website', icon: <Globe size={16} />, group: 'Konten', kabidOnly: true },
  { label: 'Pengaturan', href: '/pengaturan', icon: <Settings size={16} />, group: 'Akun' },
];

function getRoleLabel(role: UserRole | undefined) {
  if (role === 'Kabid') return 'Kepala Bidang';
  if (role === 'Tim_Quran') return "Tim Qur'an";
  return '';
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { userName } = useSession();
  const { role, isKabid } = useRole();

  const visibleMenus = menuItems.filter(item => !item.kabidOnly || isKabid());
  const groups = Array.from(new Set(visibleMenus.map(m => m.group)));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside className={[
        'w-[240px] flex flex-col h-screen shrink-0',
        'fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:relative lg:translate-x-0 lg:z-auto lg:transition-none',
      ].join(' ')}
        style={{background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)'}}>

        {/* Logo area */}
        <div className="flex h-16 items-center gap-3 px-5 shrink-0" style={{borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
            <BookOpen size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm leading-tight">Tim Qur&apos;an</p>
            <p className="text-indigo-400/60 text-xs leading-tight">Dashboard</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors" aria-label="Tutup sidebar">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" style={{scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent'}}>
          {groups.map(group => {
            const items = visibleMenus.filter(m => m.group === group);
            return (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2" style={{color: 'rgba(165,180,252,0.4)'}}>
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const isActive =
                      item.href === '/dashboard' ? pathname === '/dashboard'
                      : item.href === '/absensi' ? pathname === '/absensi'
                      : pathname.startsWith(item.href);

                    return (
                      <Link key={item.href} href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all relative group"
                        style={{
                          background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
                        }}
                        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'; } }}
                        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; } }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                            style={{background: 'linear-gradient(180deg, #6366f1, #8b5cf6)'}} />
                        )}
                        <span style={{color: isActive ? '#818cf8' : 'rgba(255,255,255,0.35)'}} className="shrink-0 ml-1">
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
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{background: 'rgba(255,255,255,0.05)'}}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
              style={{background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'}}>
              {userName ? userName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{userName ?? 'Pengguna'}</p>
              <p className="text-xs leading-tight" style={{color: role === 'Kabid' ? '#a5b4fc' : '#93c5fd'}}>
                {getRoleLabel(role)}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
