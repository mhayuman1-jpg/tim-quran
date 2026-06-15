// src/middleware.ts
// Auth + RBAC middleware
// - Semua protected routes memerlukan JWT yang valid (redirect ke /login jika tidak ada)
// - KABID_ONLY_ROUTES hanya bisa diakses oleh role 'Kabid'
// - /raport/print/:path* DIKECUALIKAN dari middleware — auth ditangani di page.tsx
//   menggunakan Node.js crypto (tidak tersedia di Edge Runtime).

import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Rute yang hanya boleh diakses oleh Kabid
const KABID_ONLY_ROUTES = ['/kelas', '/semester', '/tim', '/dashboard/kelola-artikel', '/absensi/monitoring', '/website', '/dashboard/website', '/admin'];

// Rute yang boleh diakses oleh Kabid dan Sekretaris
const MANAJEMEN_ROUTES = ['/laporan-masuk', '/rekap'];

// Rute wali yang tidak perlu autentikasi
const PUBLIC_WALI_ROUTES = ['/wali/login'];

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Lewati rute publik wali
    const isPublicWali = PUBLIC_WALI_ROUTES.some((route) =>
      pathname === route
    );
    if (isPublicWali) return NextResponse.next();

    // Cek apakah rute ini termasuk KABID_ONLY_ROUTES
    const isKabidOnly = KABID_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isKabidOnly && token?.role !== 'Kabid') {
      // Redirect non-Kabid ke dashboard dengan pesan forbidden
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Cek MANAJEMEN_ROUTES (hanya Kabid + Sekretaris)
    const isManajemenOnly = MANAJEMEN_ROUTES.some((route) =>
      pathname.startsWith(route)
    );

    if (isManajemenOnly && token?.role !== 'Kabid' && token?.role !== 'Sekretaris') {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        // Izinkan akses ke halaman login wali tanpa token
        if (PUBLIC_WALI_ROUTES.some((route) => pathname === route)) return true;
        return !!token;
      },
    },
  }
);

// Matcher mencakup semua protected routes.
// /raport/print/* DIKECUALIKAN via regex negative lookahead agar Playwright
// bisa mengakses halaman cetak dengan signed print-token tanpa session cookie.
// Auth untuk /raport/print dikerjakan di page.tsx (Node.js runtime, bukan Edge).
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard-guru/:path*',
    '/siswa/:path*',
    '/hafalan/:path*',
    '/tahsin/:path*',
    '/absensi/:path*',
    // Cocokkan /raport/* KECUALI /raport/print/* (untuk Playwright)
    '/raport/((?!print/).*)',
    '/scan/:path*',
    '/rekap/:path*',
    '/dashboard/pengumuman/:path*',
    '/pengaturan/:path*',
    '/semester/:path*',
    '/kelas/:path*',
    '/tim/:path*',
    '/laporan/:path*',
    '/laporan-kirim/:path*',
    '/laporan-masuk/:path*',
    '/dashboard/kelola-artikel/:path*',
    '/website/:path*',
    '/dashboard/website/:path*',
    '/admin/:path*',
    '/wali/:path*',
  ],
};
