export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
        <p className="text-sm text-[var(--muted)]">Loading dashboard...</p>
      </div>
    </div>
  )
}
