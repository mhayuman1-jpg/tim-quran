'use client';

import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, ExternalLink, Menu } from 'lucide-react';
import Link from 'next/link';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/siswa': 'Data Siswa',
  '/siswa/print': 'Cetak ID Card',
  '/hafalan': 'Pencatatan Hafalan',
  '/tahsin': 'Pencatatan Tahsin',
  '/absensi': 'Data Absensi',
  '/absensi/monitoring': 'Monitoring Kehadiran',
  '/raport': "Raport Qur'an",
  '/scan': 'Scan Absensi QR',
  '/rekap': 'Rekap Bulanan',
  '/laporan': 'Laporan Progres',
  '/kelas': 'Kelola Kelas',
  '/tim': "Manajemen Tim Qur'an",
  '/pengumuman': 'Pengumuman',
  '/kelola-artikel': 'Kelola Artikel',
  '/website': 'Kelola Website',
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

  return (
    <header className="h-14 flex items-center justify-between px-4 sm:px-6 shrink-0"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.04)',
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
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Keluar">
          <LogOut size={13} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
