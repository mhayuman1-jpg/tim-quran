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
  '/pesan': 'Pesan Masuk',
  '/laporan': 'Laporan Progres',
  '/kelas': 'Kelola Kelas',
  '/semester': 'Semester',
  '/tim': "Manajemen Tim Qur'an",
  '/dashboard/pengumuman': 'Kelola Pengumuman',
  '/dashboard/kelola-artikel': 'Kelola Artikel',
  '/kelola-testimoni': 'Kelola Testimoni',
  '/website': 'Kelola Website',
  '/dashboard/website': 'Kelola Website',
  '/pengaturan': 'Pengaturan Akun',
  '/wali/dashboard': 'Dashboard Wali Murid',
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
    <header className="h-16 md:h-14 flex items-center justify-between px-4 sm:px-5 md:px-6 shrink-0 bg-white/40 backdrop-blur-md border-b border-black/5">
      {/* Left */}
      <div className="flex items-center gap-2 md:gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden touch-target rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 active:bg-black/10 transition-all"
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
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-indigo-500 hover:bg-indigo-50/80 active:bg-indigo-100 transition-all min-h-[44px]">
          <ExternalLink size={16} />
          <span className="hidden md:inline">Website</span>
        </Link>
        {canSwitchRole && (
          <button onClick={handleRoleSwitch}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all min-h-[44px] ${
              isViewingAsOther
                ? 'text-amber-600 bg-amber-50/80 hover:bg-amber-100/80 active:bg-amber-200/50'
                : 'text-indigo-500 bg-indigo-50/80 hover:bg-indigo-100/80 active:bg-indigo-200/50'
            }`}
            title={isViewingAsOther ? 'Kembali ke mode asli' : 'Beralih ke mode Tim Qur\'an'}
          >
            <ArrowLeftRight size={16} />
            <span className="hidden md:inline">{isViewingAsOther ? 'Kembali' : 'Mode Guru'}</span>
          </button>
        )}
        <div className="w-px h-5 bg-black/5 mx-1" />
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-medium text-slate-400 hover:text-red-500 hover:bg-red-50/80 active:bg-red-100/50 transition-all min-h-[44px]"
          aria-label="Keluar">
          <LogOut size={16} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
