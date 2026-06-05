'use client';
// src/app/(dashboard)/error.tsx
// Error boundary untuk dashboard — Next.js requires 'use client'.
// Menampilkan pesan error yang user-friendly dengan opsi retry.

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error ke console (bisa diganti dengan error tracking service)
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Ikon peringatan */}
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-50 mb-5">
        <svg
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Pesan utama */}
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        Terjadi Kesalahan
      </h2>
      <p className="text-sm text-gray-500 mb-1 max-w-sm">
        Halaman ini mengalami masalah saat memuat. Silakan coba lagi atau hubungi administrator
        jika masalah terus berlanjut.
      </p>

      {/* Detail error (hanya di development) */}
      {process.env.NODE_ENV === 'development' && error?.message && (
        <p className="mt-2 mb-4 text-xs text-red-400 font-mono bg-red-50 border border-red-100 rounded px-3 py-2 max-w-md break-all">
          {error.message}
        </p>
      )}

      {/* Tombol retry */}
      <button
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        Coba Lagi
      </button>
    </div>
  );
}
