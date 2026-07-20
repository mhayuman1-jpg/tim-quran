'use client';

import { usePathname } from 'next/navigation';
import { SessionProvider } from './providers';
import { SWRProvider } from './swr-provider';

const PRINT_PATH_RE = /^\/raport\/print\//;

/**
 * Provider yang SKIP SessionProvider & SWRProvider untuk halaman print.
 *
 * Mengapa: Root layout membungkus semua route dalam <SessionProvider>.
 * Ketika Playwright (headless Chromium) navigasi ke /raport/print/[id]?_pt=...,
 * SessionProvider fires GET /api/auth/session → error karena tidak ada session.
 * Dengan skip provider di print routes, tidak ada client-side auth fetch sama sekali.
 */
export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (PRINT_PATH_RE.test(pathname)) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <SWRProvider>{children}</SWRProvider>
    </SessionProvider>
  );
}
