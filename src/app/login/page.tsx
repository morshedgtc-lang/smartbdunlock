'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Jellyfish } from '@/components/Jellyfish'
import { Mail, Lock, Smartphone, ArrowRight, Eye, EyeOff, User, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'verify-otp' | 'pending'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  const [otpEmail, setOtpEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)

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

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setTimeout(() => setResendCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCountdown])

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode)
    setError('')
    setSuccess('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    })
    const data = await res.json()

    if (!res.ok) {
      if (data.code === 'EMAIL_NOT_VERIFIED') {
        setOtpEmail(loginEmail)
        setMode('verify-otp')
        setResendCountdown(60)
        setError('')
        setLoading(false)
        return
      }
      if (data.code === 'PENDING_APPROVAL') {
        setMode('pending')
        setError('')
        setLoading(false)
        return
      }
      setError(data.error || 'Login failed')
      setLoading(false)
      return
    }

    const role = data?.user?.role
    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'reseller') router.push('/reseller/dashboard')
    else router.push('/login')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        confirmPassword: regConfirmPassword,
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Registration failed')
      setLoading(false)
      return
    }

    setOtpEmail(regEmail)
    setMode('verify-otp')
    setResendCountdown(60)
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, otp: otpCode }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Verification failed')
      setLoading(false)
      return
    }

    setMode('pending')
    setLoading(false)
  }

  const handleResendOtp = useCallback(async () => {
    if (resendCountdown > 0) return
    setError('')
    const res = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to resend')
      return
    }
    setResendCountdown(60)
    setSuccess('New code sent to your email')
  }, [resendCountdown, otpEmail])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <Jellyfish />

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
          <p className="text-[var(--muted)] mt-1">GSM Service Platform</p>
        </motion.div>

        <motion.div
          ref={cardRef}
          className="liquid-glass-card relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: `perspective(1000px) rotateY(${mousePos.x * 2}deg) rotateX(${-mousePos.y * 2}deg)` }}
        >
          <div className="absolute -inset-[1px] rounded-[20px] overflow-hidden pointer-events-none z-0">
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.3) 25%, rgba(236,72,153,0.2) 50%, rgba(59,130,246,0.3) 75%, rgba(99,102,241,0.3) 100%)',
                backgroundSize: '200% 200%',
                animation: 'prismaticShift 4s ease infinite',
              }}
            />
          </div>

          <div className="liquid-glass-surface rounded-[20px] p-8 relative z-10">
            <div className="absolute top-0 left-0 w-full h-full rounded-[20px] pointer-events-none overflow-hidden" aria-hidden="true">
              <div className="absolute w-64 h-64 rounded-full opacity-[0.07] blur-[60px] transition-all duration-300 ease-out"
                style={{
                  background: 'radial-gradient(circle, white, transparent)',
                  left: `calc(50% + ${mousePos.x * 80}px)`,
                  top: `calc(20% + ${mousePos.y * 40}px)`,
                }}
              />
            </div>

            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Welcome back</h2>
                  <p className="text-sm text-[var(--muted)] mb-6">Sign in to your account</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'login-email' ? 'liquid-input-focus' : ''}`}>
                        <Mail size={18} className="liquid-input-icon" />
                        <input type="email" placeholder="Gmail address" autoComplete="email"
                          value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                          onFocus={() => setFocusedField('login-email')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" />
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'login-password' ? 'liquid-input-focus' : ''}`}>
                        <Lock size={18} className="liquid-input-icon" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete="current-password"
                          value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                          onFocus={() => setFocusedField('login-password')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" />
                        <button type="button" className="liquid-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="liquid-submit-btn w-full relative overflow-hidden group">
                      <div className="liquid-submit-outer">
                        <div className="liquid-submit-glass">
                          <div className="liquid-submit-refraction" />
                          <div className="liquid-submit-highlight" />
                          <div className="liquid-submit-content">
                            {loading ? <div className="liquid-spinner" /> : <><span>Sign In</span><ArrowRight size={18} strokeWidth={2} className="group-hover:translate-x-1 transition-transform duration-300 ease-out" /></>}
                          </div>
                        </div>
                      </div>
                    </button>
                  </form>
                </motion.div>
              )}

              {mode === 'register' && (
                <motion.div key="register" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Create account</h2>
                  <p className="text-sm text-[var(--muted)] mb-6">Join SmartBD Unlock today</p>

                  <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'reg-name' ? 'liquid-input-focus' : ''}`}>
                        <User size={18} className="liquid-input-icon" />
                        <input type="text" placeholder="Full name" autoComplete="name"
                          value={regName} onChange={e => setRegName(e.target.value)}
                          onFocus={() => setFocusedField('reg-name')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" required />
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'reg-username' ? 'liquid-input-focus' : ''}`}>
                        <User size={18} className="liquid-input-icon" />
                        <input type="text" placeholder="Username" autoComplete="username"
                          value={regUsername} onChange={e => setRegUsername(e.target.value)}
                          onFocus={() => setFocusedField('reg-username')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" required />
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'reg-email' ? 'liquid-input-focus' : ''}`}>
                        <Mail size={18} className="liquid-input-icon" />
                        <input type="email" placeholder="Gmail address (@gmail.com)" autoComplete="email"
                          value={regEmail} onChange={e => setRegEmail(e.target.value)}
                          onFocus={() => setFocusedField('reg-email')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" required />
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'reg-password' ? 'liquid-input-focus' : ''}`}>
                        <Lock size={18} className="liquid-input-icon" />
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password" autoComplete="new-password"
                          value={regPassword} onChange={e => setRegPassword(e.target.value)}
                          onFocus={() => setFocusedField('reg-password')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" required />
                        <button type="button" className="liquid-eye-btn" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'reg-confirm' ? 'liquid-input-focus' : ''}`}>
                        <Lock size={18} className="liquid-input-icon" />
                        <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" autoComplete="new-password"
                          value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('reg-confirm')} onBlur={() => setFocusedField(null)}
                          className="liquid-input" required />
                        <button type="button" className="liquid-eye-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="liquid-submit-btn w-full relative overflow-hidden group">
                      <div className="liquid-submit-outer">
                        <div className="liquid-submit-glass">
                          <div className="liquid-submit-refraction" />
                          <div className="liquid-submit-highlight" />
                          <div className="liquid-submit-content">
                            {loading ? <div className="liquid-spinner" /> : <><span>Create Account</span><ArrowRight size={18} strokeWidth={2} className="group-hover:translate-x-1 transition-transform duration-300 ease-out" /></>}
                          </div>
                        </div>
                      </div>
                    </button>
                  </form>
                </motion.div>
              )}

              {mode === 'verify-otp' && (
                <motion.div key="verify-otp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Mail size={28} className="text-indigo-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Verify your email</h2>
                    <p className="text-sm text-[var(--muted)]">We sent a 6-digit code to</p>
                    <p className="text-sm font-medium text-[var(--accent)] mt-1">{otpEmail}</p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
                    )}
                    {success && (
                      <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>
                    )}

                    <div className="liquid-input-wrapper">
                      <div className={`liquid-input-container ${focusedField === 'otp-code' ? 'liquid-input-focus' : ''}`}>
                        <ShieldCheck size={18} className="liquid-input-icon" />
                        <input type="text" placeholder="Enter 6-digit code" maxLength={6}
                          inputMode="numeric" pattern="[0-9]*"
                          value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          onFocus={() => setFocusedField('otp-code')} onBlur={() => setFocusedField(null)}
                          className="liquid-input text-center text-lg tracking-[0.5em] font-mono" required />
                        <div className="liquid-input-glow" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading || otpCode.length !== 6} className="liquid-submit-btn w-full relative overflow-hidden group">
                      <div className="liquid-submit-outer">
                        <div className="liquid-submit-glass">
                          <div className="liquid-submit-refraction" />
                          <div className="liquid-submit-highlight" />
                          <div className="liquid-submit-content">
                            {loading ? <div className="liquid-spinner" /> : <><span>Verify Email</span><CheckCircle2 size={18} /></>}
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="text-center">
                      {resendCountdown > 0 ? (
                        <p className="text-sm text-[var(--muted)] flex items-center justify-center gap-1.5">
                          <Clock size={14} /> Resend code in {resendCountdown}s
                        </p>
                      ) : (
                        <button type="button" onClick={handleResendOtp} className="text-sm text-[var(--accent)] hover:underline font-medium">
                          Resend code
                        </button>
                      )}
                    </div>

                    <div className="text-center">
                      <button type="button" onClick={() => { switchMode('login'); setOtpCode('') }} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                        Back to sign in
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {mode === 'pending' && (
                <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock size={28} className="text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Account Pending Approval</h2>
                    <p className="text-sm text-[var(--muted)] mb-6">
                      Your email has been verified. An admin will review and approve your account shortly.
                    </p>
                    <div className="liquid-glass-card-sm mb-6">
                      <p className="text-xs text-[var(--muted)]">
                        You&apos;ll be able to log in once your account is approved. Check back later or contact support if you have questions.
                      </p>
                    </div>
                    <button onClick={() => switchMode('login')} className="text-sm text-[var(--accent)] hover:underline font-medium">
                      Back to sign in
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(mode === 'login' || mode === 'register') && (
              <div className="mt-6 text-center text-sm text-[var(--muted)] relative">
                {mode === 'login' ? (
                  <>Don&apos;t have an account?{' '}
                    <button onClick={() => switchMode('register')} className="text-[var(--accent)] hover:underline font-medium">Sign up</button></>
                ) : (
                  <>Already have an account?{' '}
                    <button onClick={() => switchMode('login')} className="text-[var(--accent)] hover:underline font-medium">Sign in</button></>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        .liquid-glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          -webkit-backdrop-filter: blur(40px) saturate(200%) brightness(1.1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 1px 0 rgba(255, 255, 255, 0.15) inset;
          transition: transform 0.15s ease-out, box-shadow 0.3s ease;
          will-change: transform;
        }
        .liquid-glass-card:hover { box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1) inset, 0 2px 0 rgba(255, 255, 255, 0.2) inset; }
        .liquid-glass-surface { position: relative; }
        .liquid-input-wrapper { position: relative; }
        .liquid-input-container {
          position: relative; background: rgba(255, 255, 255, 0.06); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); overflow: hidden;
        }
        .liquid-input-container::before { content: ''; position: absolute; inset: 0; border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%); pointer-events: none; }
        .liquid-input-focus { border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1), 0 4px 16px rgba(0, 0, 0, 0.1); }
        .liquid-input-icon { position: absolute; left: 14px; top: 0; bottom: 0; display: flex; align-items: center; color: var(--muted); z-index: 1; transition: color 0.3s ease; pointer-events: none; }
        .liquid-input-focus .liquid-input-icon { color: var(--accent); }
        .liquid-input { width: 100%; background: transparent; border: none; outline: none; padding: 13px 14px 13px 44px; color: var(--foreground); font-size: 14px; line-height: 1.5; position: relative; z-index: 1; }
        .liquid-input::placeholder { color: var(--muted); opacity: 0.7; }
        .liquid-input-glow { position: absolute; inset: 0; border-radius: 14px; background: radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1), transparent); opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .liquid-input-focus .liquid-input-glow { opacity: 1; }
        .liquid-eye-btn { position: absolute; right: 12px; top: 0; bottom: 0; display: flex; align-items: center; background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 8px; transition: all 0.2s ease; z-index: 1; }
        .liquid-eye-btn:hover { color: var(--foreground); background: rgba(255, 255, 255, 0.1); }
        .liquid-submit-btn { background: none; border: none; cursor: pointer; padding: 0; border-radius: 9999px; position: relative; outline: none; -webkit-tap-highlight-color: transparent; }
        .liquid-submit-outer { position: relative; border-radius: 9999px; padding: 1px; background: linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.9) 50%, rgba(168,85,247,0.8) 100%); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .liquid-submit-btn:hover .liquid-submit-outer { box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.2) inset; transform: translateY(-2px) scale(1.01); }
        .liquid-submit-btn:active .liquid-submit-outer { transform: translateY(0) scale(0.99); }
        .liquid-submit-glass { position: relative; border-radius: 9999px; background: linear-gradient(135deg, rgba(99,102,241,0.85) 0%, rgba(124,58,237,0.9) 40%, rgba(168,85,247,0.95) 70%, rgba(139,92,246,0.9) 100%); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); overflow: hidden; }
        .liquid-submit-refraction { position: absolute; inset: 0; background: linear-gradient(105deg, transparent 0%, transparent 35%, rgba(255,255,255,0.25) 45%, rgba(255,255,255,0.15) 55%, transparent 65%, transparent 100%); background-size: 250% 100%; animation: liquidShine 3s ease-in-out infinite; pointer-events: none; }
        @keyframes liquidShine { 0% { background-position: 200% 0; } 100% { background-position: -100% 0; } }
        .liquid-submit-highlight { position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, transparent 100%); border-radius: 9999px 9999px 0 0; pointer-events: none; }
        .liquid-submit-content { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 14px 28px; color: white; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; position: relative; z-index: 1; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); white-space: nowrap; }
        .liquid-spinner { width: 22px; height: 22px; border: 2.5px solid rgba(255, 255, 255, 0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes prismaticShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        .liquid-glass-card-sm { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 16px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
        .dark .liquid-glass-card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.08); }
        .dark .liquid-input-container { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.06); }
        .dark .liquid-glass-card-sm { background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.06); }
      `}</style>
    </div>
  )
}
