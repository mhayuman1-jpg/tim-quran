'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, ExternalLink, Menu, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { useViewMode } from '@/hooks/useViewMode';
import { useRole } from '@/hooks/useRole';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard-guru': 'Dashboard Guru',
  '/siswa': 'Data Siswa',
  '/siswa/print': 'Cetak ID Card',
  '/hafalan': 'Pencatatan Hafalan & Tahsin',
  '/tahsin': 'Pencatatan Hafalan & Tahsin',
  '/tahfidz': 'Pencatatan Tahfidz',
  '/absensi': 'Data Absensi',
  '/absensi/monitoring': 'Monitoring Kehadiran',
  '/raport': "Raport Qur'an",
  '/scan': 'Scan Absensi QR',
  '/rekap': 'Rekap Tahfidz & Tahsin',
  '/laporan': 'Laporan Progres',
  '/kelas': 'Kelola Kelas',
  '/semester': 'Semester',
  '/tim': "Manajemen Tim Qur'an",
  '/dashboard/pengumuman': 'Kelola Pengumuman',
  '/dashboard/kelola-artikel': 'Kelola Artikel',
  '/website': 'Kelola Website',
  '/dashboard/website': 'Kelola Website',
  '/pengaturan': 'Pengaturan Akun',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter(k => k !== '/dashboard' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Panel Manajemen';
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { role } = useRole();
  const { viewAsRole, setViewAsRole, isViewingAsOther } = useViewMode();

  const canSwitchRole = role === 'Kabid' || role === 'Sekretaris';

  const handleRoleSwitch = () => {
    if (isViewingAsOther) {
      setViewAsRole(null);
    } else {
      setViewAsRole('Tim_Quran');
    }
  };

  return (
    <header className="h-16 md:h-14 flex items-center justify-between px-3 sm:px-4 md:px-6 shrink-0" style={{
        borderBottom: '1px solid rgba(226,232,240,0.6)',
        paddingTop: 'max(0px, env(safe-area-inset-top))',
      }}>
      {/* Left */}
      <div className="flex items-center gap-2 md:gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors active:bg-slate-200"
          style={{minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
          aria-label="Buka sidebar">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm md:text-base font-semibold text-slate-800 truncate">{title}</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 md:gap-2">
        <Link href="/" target="_blank" rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all"
          style={{color: '#6366f1', minHeight: '44px', display: 'flex', alignItems: 'center'}}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="Lihat halaman publik">
          <ExternalLink size={16} />
          <span className="hidden md:inline">Website</span>
        </Link>
        {canSwitchRole && (
          <button
            onClick={handleRoleSwitch}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
            style={{
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              color: isViewingAsOther ? '#d97706' : '#6366f1',
              background: isViewingAsOther ? 'rgba(217,119,6,0.08)' : 'rgba(99,102,241,0.08)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = isViewingAsOther ? 'rgba(217,119,6,0.15)' : 'rgba(99,102,241,0.15)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = isViewingAsOther ? 'rgba(217,119,6,0.08)' : 'rgba(99,102,241,0.08)';
            }}
            title={isViewingAsOther ? 'Kembali ke mode asli' : 'Beralih ke mode Tim Qur\'an'}
          >
            <ArrowLeftRight size={16} />
            <span className="hidden md:inline">{isViewingAsOther ? 'Kembali' : 'Mode Guru'}</span>
          </button>
        )}
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors active:bg-red-100"
          style={{minHeight: '44px', display: 'flex', alignItems: 'center'}}
          aria-label="Keluar">
          <LogOut size={16} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
