export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-[var(--accent)]">404</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Page not found</h2>
          <p className="text-sm text-[var(--muted)]">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <a
          href="/login"
          className="inline-block px-6 py-3 rounded-xl bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Go to login
        </a>
      </div>
    </div>
  )
}
