// src/middleware.ts
// Auth + RBAC middleware
// - Semua protected routes memerlukan JWT yang valid (redirect ke /login jika tidak ada)
// - KABID_ONLY_ROUTES hanya bisa diakses oleh role 'Kabid'
//   Tim_Quran yang mencoba akses akan di-redirect ke /dashboard?error=forbidden

import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Rute yang hanya boleh diakses oleh Kabid
const KABID_ONLY_ROUTES = ['/kelas', '/semester', '/tim', '/laporan', '/dashboard/kelola-artikel', '/absensi/monitoring', '/website', '/dashboard/website'];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Cek apakah rute ini termasuk KABID_ONLY_ROUTES
    const isKabidOnly = KABID_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isKabidOnly && token?.role !== 'Kabid') {
      // Redirect Tim_Quran ke dashboard dengan pesan forbidden
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Hanya izinkan request yang memiliki token valid
      authorized: ({ token }) => !!token,
    },
  }
);

// Matcher mencakup semua protected routes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/siswa/:path*',
    '/hafalan/:path*',
    '/tahsin/:path*',
    '/absensi/:path*',
    '/raport/:path*',
    '/raport/print/:path*',
    '/scan/:path*',
    '/rekap/:path*',
    '/dashboard/pengumuman/:path*',
    '/pengaturan/:path*',
    '/semester/:path*',
    '/kelas/:path*',
    '/tim/:path*',
    '/laporan/:path*',
    '/dashboard/kelola-artikel/:path*',
    '/website/:path*',
    '/dashboard/website/:path*',
  ],
};
