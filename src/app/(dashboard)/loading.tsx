export default function DashboardLoading() {
  return (
    <div className="space-y-5 sm:space-y-6 animate-pulse max-w-5xl" aria-label="Memuat halaman...">
      {/* Greeting skeleton */}
      <div className="shell-card">
        <div className="inner-card">
          <div className="h-3 w-36 rounded bg-black/5 mb-2" />
          <div className="h-6 w-64 rounded bg-black/5 mb-1.5" />
          <div className="h-4 w-48 rounded bg-black/5" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shell-card">
            <div className="inner-card">
              <div className="h-3 w-24 rounded bg-black/5 mb-3" />
              <div className="h-8 w-16 rounded bg-black/5 mb-3" />
              <div className="h-1.5 w-full rounded-full bg-black/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="shell-card">
        <div className="inner-card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-black/5" />
            <div className="space-y-1.5">
              <div className="h-4 w-28 rounded bg-black/5" />
              <div className="h-3 w-20 rounded bg-black/5" />
            </div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-12 rounded bg-black/5" />
                <div className="flex-1 h-7 rounded-lg bg-black/5" />
                <div className="h-3 w-8 rounded bg-black/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
