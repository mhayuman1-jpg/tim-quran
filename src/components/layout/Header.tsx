'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, ExternalLink, Menu, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/app/providers';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/siswa': 'Data Siswa',
  '/siswa/print': 'Cetak ID Card',
  '/hafalan': 'Pencatatan Hafalan & Tahsin',
  '/tahsin': 'Pencatatan Hafalan & Tahsin',
  '/tahfidz': 'Pencatatan Tahfidz',
  '/absensi': 'Data Absensi',
  '/absensi/monitoring': 'Monitoring Kehadiran',
  '/raport': "Raport Qur'an",
  '/scan': 'Scan Absensi QR',
  '/rekap': 'Rekap Bulanan',
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
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{
        borderBottom: '1px solid rgba(226,232,240,0.6)',
      }}>
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Buka sidebar">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-slate-800">{title}</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => toggle()}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle tema"
          title="Toggle tema"
        >
          {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link href="/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{color: '#6366f1'}}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          title="Lihat halaman publik">
          <ExternalLink size={13} />
          <span className="hidden sm:inline">Website</span>
        </Link>
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Keluar">
          <LogOut size={13} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
