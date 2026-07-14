'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Jellyfish } from '@/components/Jellyfish'
import { Mail, Lock, Smartphone, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      setMousePos({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setLoading(false)
      return
    }

    const role = data?.user?.role

    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'reseller') router.push('/reseller/dashboard')
    else router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <Jellyfish />

      {/* Ambient light orbs */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[100px]"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 blur-[80px]"
          style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      </div>

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <Smartphone size={28} className="text-white relative z-10" strokeWidth={1.8} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">SmartBD Unlock</h1>
          <p className="text-[var(--muted)] mt-1">GSM Service Reseller Platform</p>
        </motion.div>

        {/* Liquid Glass Card */}
        <motion.div
          ref={cardRef}
          className="liquid-glass-card relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            transform: `perspective(1000px) rotateY(${mousePos.x * 2}deg) rotateX(${-mousePos.y * 2}deg)`,
          }}
        >
          {/* Prismatic edge highlight */}
          <div className="absolute -inset-[1px] rounded-[20px] overflow-hidden pointer-events-none z-0">
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: `linear-gradient(135deg, 
                  rgba(99, 102, 241, 0.3) 0%, 
                  rgba(139, 92, 246, 0.3) 25%, 
                  rgba(236, 72, 153, 0.2) 50%, 
                  rgba(59, 130, 246, 0.3) 75%, 
                  rgba(99, 102, 241, 0.3) 100%)`,
                backgroundSize: '200% 200%',
                animation: 'prismaticShift 4s ease infinite',
              }}
            />
          </div>

          {/* Glass surface with light refraction */}
          <div className="liquid-glass-surface rounded-[20px] p-8 relative z-10">
            {/* Moving light reflection */}
            <div
              className="absolute top-0 left-0 w-full h-full rounded-[20px] pointer-events-none overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="absolute w-64 h-64 rounded-full opacity-[0.07] blur-[60px] transition-all duration-300 ease-out"
                style={{
                  background: 'radial-gradient(circle, white, transparent)',
                  left: `calc(50% + ${mousePos.x * 80}px)`,
                  top: `calc(20% + ${mousePos.y * 40}px)`,
                }}
              />
            </div>

            <h2 className="text-xl font-bold text-[var(--foreground)] mb-1 relative">Welcome back</h2>
            <p className="text-sm text-[var(--muted)] mb-6 relative">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-4 relative">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
              {/* Email Input */}
              <div className="liquid-input-wrapper">
                <div className={`liquid-input-container ${focusedField === 'email' ? 'liquid-input-focus' : ''}`}>
                  <Mail size={18} className="liquid-input-icon" />
                  <input
                    type="email"
                    placeholder="Email address"
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="liquid-input"
                  />
                  {/* Focus highlight glow */}
                  <div className="liquid-input-glow" />
                </div>
              </div>

              {/* Password Input */}
              <div className="liquid-input-wrapper">
                <div className={`liquid-input-container ${focusedField === 'password' ? 'liquid-input-focus' : ''}`}>
                  <Lock size={18} className="liquid-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="liquid-input"
                  />
                  <button
                    type="button"
                    className="liquid-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <div className="liquid-input-glow" />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-[var(--muted)] cursor-pointer">
                  <div className="liquid-checkbox">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-4 h-4 rounded-md border border-[var(--input-border)] peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-all flex items-center justify-center">
                      <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  Remember me
                </label>
                <a href="#" className="text-[var(--accent)] hover:underline">Forgot password?</a>
              </div>

              {/* Liquid Glass Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="liquid-submit-btn w-full relative overflow-hidden group"
              >
                <div className="liquid-submit-outer">
                  <div className="liquid-submit-glass">
                    {/* Animated light refraction */}
                    <div className="liquid-submit-refraction" />
                    {/* Top highlight edge */}
                    <div className="liquid-submit-highlight" />
                    {/* Content */}
                    <div className="liquid-submit-content">
                      {loading ? (
                        <div className="liquid-spinner" />
                      ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={18} strokeWidth={2} className="group-hover:translate-x-1 transition-transform duration-300 ease-out" />
                      </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-[var(--muted)] relative">
              Contact admin to create an account
            </div>
          </div>
        </motion.div>


      </motion.div>

      <style jsx>{`
        /* Liquid Glass Card */
        .liquid-glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 1px 0 rgba(255, 255, 255, 0.15) inset;
          transition: transform 0.15s ease-out, box-shadow 0.3s ease;
          will-change: transform;
        }

        .liquid-glass-card:hover {
          box-shadow:
            0 16px 48px rgba(0, 0, 0, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 2px 0 rgba(255, 255, 255, 0.2) inset;
        }

        .liquid-glass-surface {
          position: relative;
        }

        /* Liquid Input */
        .liquid-input-wrapper {
          position: relative;
        }

        .liquid-input-container {
          position: relative;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .liquid-input-container::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .liquid-input-focus {
          border-color: rgba(99, 102, 241, 0.5);
          box-shadow:
            0 0 0 3px rgba(99, 102, 241, 0.15),
            0 0 20px rgba(99, 102, 241, 0.1),
            0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .liquid-input-icon {
          position: absolute;
          left: 14px;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          color: var(--muted);
          z-index: 1;
          transition: color 0.3s ease;
          pointer-events: none;
        }

        .liquid-input-focus .liquid-input-icon {
          color: var(--accent);
        }

        .liquid-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 13px 14px 13px 44px;
          color: var(--foreground);
          font-size: 14px;
          line-height: 1.5;
          position: relative;
          z-index: 1;
        }

        .liquid-input::placeholder {
          color: var(--muted);
          opacity: 0.7;
        }

        .liquid-input-glow {
          position: absolute;
          inset: 0;
          border-radius: 14px;
          background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .liquid-input-focus .liquid-input-glow {
          opacity: 1;
        }

        .liquid-eye-btn {
          position: absolute;
          right: 12px;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s ease;
          z-index: 1;
        }

        .liquid-eye-btn:hover {
          color: var(--foreground);
          background: rgba(255, 255, 255, 0.1);
        }

        /* Liquid Glass Submit Button - iOS 26 Pill Style */
        .liquid-submit-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          border-radius: 9999px;
          position: relative;
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }

        .liquid-submit-outer {
          position: relative;
          border-radius: 9999px;
          padding: 1px;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.8) 0%,
            rgba(139, 92, 246, 0.9) 50%,
            rgba(168, 85, 247, 0.8) 100%
          );
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .liquid-submit-btn:hover .liquid-submit-outer {
          box-shadow:
            0 8px 32px rgba(99, 102, 241, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.2) inset;
          transform: translateY(-2px) scale(1.01);
        }

        .liquid-submit-btn:active .liquid-submit-outer {
          transform: translateY(0) scale(0.99);
          box-shadow:
            0 4px 16px rgba(99, 102, 241, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        }

        .liquid-submit-glass {
          position: relative;
          border-radius: 9999px;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.85) 0%,
            rgba(124, 58, 237, 0.9) 40%,
            rgba(168, 85, 247, 0.95) 70%,
            rgba(139, 92, 246, 0.9) 100%
          );
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          overflow: hidden;
        }

        /* Animated light refraction moving across button */
        .liquid-submit-refraction {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 35%,
            rgba(255, 255, 255, 0.25) 45%,
            rgba(255, 255, 255, 0.15) 55%,
            transparent 65%,
            transparent 100%
          );
          background-size: 250% 100%;
          animation: liquidShine 3s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes liquidShine {
          0% { background-position: 200% 0; }
          100% { background-position: -100% 0; }
        }

        /* Top highlight edge - glass depth */
        .liquid-submit-highlight {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.2) 0%,
            rgba(255, 255, 255, 0.05) 50%,
            transparent 100%
          );
          border-radius: 9999px 9999px 0 0;
          pointer-events: none;
        }

        .liquid-submit-content {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px 28px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
          white-space: nowrap;
        }

        .liquid-spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes prismaticShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }



        .liquid-glass-card-sm {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        /* Checkbox */
        .liquid-checkbox {
          position: relative;
          cursor: pointer;
        }

        .liquid-checkbox input:checked + div {
          background: var(--accent);
          border-color: var(--accent);
        }

        .liquid-checkbox input:checked + div svg {
          opacity: 1;
        }

        /* Dark mode adjustments */
        .dark .liquid-glass-card {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .dark .liquid-input-container {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .dark .liquid-glass-card-sm {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.06);
        }
      `}</style>
    </div>
  )
}
