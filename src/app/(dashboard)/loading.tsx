// src/app/(dashboard)/loading.tsx
// Loading skeleton global untuk dashboard.
// Ditampilkan secara otomatis oleh Next.js selama page component sedang loading.
// Tidak perlu 'use client' — server component sudah cukup.

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Memuat halaman...">
      {/* Page header skeleton */}
      <div>
        <div className="h-7 bg-gray-200 rounded-lg w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-36" />
      </div>

      {/* Top stat cards skeleton (3 kolom) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-10 w-10 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Content area skeleton (tabel atau kartu penuh) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {/* Judul blok */}
        <div className="flex items-center justify-between mb-5">
          <div className="h-5 bg-gray-200 rounded w-40" />
          <div className="h-9 bg-gray-200 rounded-lg w-28" />
        </div>

        {/* Baris tabel skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-1/6" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>

        {/* Pagination skeleton */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
            <div className="h-8 w-8 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
