export default function OrdersLoading() {
  return (
    <div>
      <header className="header sticky top-0 z-20 px-6 py-4 flex items-center justify-between">
        <div>
          <div className="h-6 w-32 rounded-lg bg-white/5 animate-pulse" />
          <div className="h-4 w-20 rounded-lg bg-white/5 animate-pulse mt-1" />
        </div>
      </header>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-10 w-64 rounded-xl bg-white/5 animate-pulse" />
            <div className="flex gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 w-16 rounded-full bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="h-9 w-28 rounded-xl bg-white/5 animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="glass p-0 overflow-hidden rounded-2xl">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-40 rounded-lg bg-white/5 animate-pulse" />
                        <div className="h-4 w-20 rounded-lg bg-white/5 animate-pulse" />
                      </div>
                      <div className="h-3 w-32 rounded-lg bg-white/5 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="h-6 w-16 rounded-lg bg-white/5 animate-pulse" />
                    <div className="h-6 w-20 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2 flex-1">
                      <div className="w-2 h-2 rounded-full bg-white/5 animate-pulse" />
                      <div className="h-3 w-16 rounded-lg bg-white/5 animate-pulse" />
                      {j < 2 && <div className="flex-1 h-px bg-white/5" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-[var(--card-border)]">
                <div className="h-3 w-24 rounded-lg bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
