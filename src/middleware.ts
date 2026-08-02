import { withAuth, NextRequestWithAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

const KABID_ONLY_ROUTES = ['/kelas', '/semester', '/tim', '/dashboard/kelola-artikel', '/absensi/monitoring', '/absensi/kabid-mark', '/website', '/dashboard/website', '/admin', '/kalender-libur'];
const MANAJEMEN_ROUTES = ['/laporan-masuk', '/rekap'];

function isLocalhostOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const isLocalhost = isLocalhostOrigin(origin);
  const allowedOrigin = isLocalhost ? origin : '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-View-Mode, X-View-As-Teacher-Id',
    'Access-Control-Max-Age': '86400',
  };
  if (isLocalhost) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // For API routes, add CORS headers
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.next();
      const corsHeaders = getCorsHeaders(req);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // RBAC for dashboard routes
    const isKabidOnly = KABID_ONLY_ROUTES.some((route) => pathname.startsWith(route));
    if (isKabidOnly && token?.role !== 'Kabid') {
      const url = req.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    const isManajemenOnly = MANAJEMEN_ROUTES.some((route) => pathname.startsWith(route));
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
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Skip auth for API routes (CORS only) and public wali login
        if (pathname.startsWith('/api/')) return true;
        if (pathname === '/wali/login') return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/dashboard-guru/:path*',
    '/siswa/:path*',
    '/hafalan/:path*',
    '/tahsin/:path*',
    '/absensi/:path*',
    '/raport/((?!print/).*)',
    '/scan/:path*',
    '/rekap/:path*',
    '/dashboard/pengumuman/:path*',
    '/pengaturan/:path*',
    '/semester/:path*',
    '/kalender-libur/:path*',
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
