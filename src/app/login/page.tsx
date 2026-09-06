'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Jellyfish } from '@/components/Jellyfish'
import { Mail, Lock, Smartphone, ArrowRight, Eye, EyeOff, Clock } from 'lucide-react'

type AuthMode = 'login' | 'register' | 'pending'

function AuthInput({ icon: Icon, type = 'text', placeholder, value, onChange, name, required, right }: {
  icon: React.ElementType; type?: string; placeholder: string; value: string; onChange: (v: string) => void; name: string; required?: boolean; right?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="relative">
      <div className={`relative flex items-center rounded-2xl border transition-all duration-300 ${
        focused
          ? 'border-indigo-500/50 bg-white/[0.08] shadow-[0_0_0_3px_rgba(99,102,241,0.12),0_4px_20px_rgba(99,102,241,0.08)]'
          : 'border-white/[0.08] bg-white/[0.04] hover:border-white/[0.14]'
      }`}>
        <div className={`pl-4 transition-colors duration-300 ${focused ? 'text-indigo-400' : 'text-white/30'}`}>
          <Icon size={18} />
        </div>
        <input
          type={type} placeholder={placeholder} value={value} name={name} required={required}
          autoComplete={name}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent border-none outline-none py-3.5 px-3 text-[15px] text-white placeholder:text-white/25"
        />
        {right && <div className="pr-3">{right}</div>}
      </div>
    </div>
  )
}

function PasswordToggle({ show, onClick }: { show: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-white/30 hover:text-white/60 transition-colors p-1">
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  )
}

function SubmitButton({ loading, children, disabled }: { loading: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full relative group rounded-2xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] group-hover:animate-[shimmer_2s_ease_in-out_infinite]" />
      <div className="absolute inset-[1px] rounded-[15px] bg-black/40 group-hover:bg-black/30 transition-colors" />
      <div className="relative flex items-center justify-center gap-2 py-3.5 px-6 text-white font-semibold text-[15px]">
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : children}
      </div>
    </button>
  )
}

function AlertMessage({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const styles = type === 'error'
    ? 'bg-red-500/10 border-red-500/20 text-red-300'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className={`px-4 py-3 rounded-xl border text-sm ${styles}`}>
      {children}
    </motion.div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!cardRef.current) return
      const r = cardRef.current.getBoundingClientRect()
      setMousePos({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 })
    }
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])

  const switchMode = (m: AuthMode) => { setMode(m); setError(''); setShowPassword(false); setShowConfirmPassword(false) }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: loginPassword }) })
    const data = await res.json()
    if (!res.ok) {
      if (data.code === 'PENDING_APPROVAL') { setMode('pending'); setLoading(false); return }
      setError(data.error || 'Login failed'); setLoading(false); return
    }
    const role = data?.user?.role
    if (role === 'admin') router.push('/admin/dashboard')
    else if (role === 'reseller') router.push('/reseller/dashboard')
    else router.push('/login')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    if (regPassword !== regConfirmPassword) { setError('Passwords do not match'); setLoading(false); return }
    const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: regEmail, password: regPassword, confirmPassword: regConfirmPassword }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return }
    setMode('pending'); setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#070714]">
      <Jellyfish />

      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[140px] bg-indigo-600" />
        <div className="absolute bottom-[10%] right-[15%] w-[400px] h-[400px] rounded-full opacity-[0.05] blur-[120px] bg-purple-600" />
        <div className="absolute top-[60%] left-[50%] -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[100px] bg-blue-600" />
      </div>

      <motion.div className="w-full max-w-[420px] relative z-10"
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>

        {/* Logo */}
        <motion.div className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}>
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25">
            <Smartphone size={24} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SmartBD Unlock</h1>
          <p className="text-white/30 text-sm mt-1">GSM Service Platform</p>
        </motion.div>

        {/* Card */}
        <motion.div ref={cardRef}
          className="relative rounded-[24px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40"
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ transform: `perspective(1000px) rotateY(${mousePos.x * 1.5}deg) rotateX(${-mousePos.y * 1.5}deg)` }}>

          <div className="absolute top-0 left-0 w-full h-full rounded-[24px] pointer-events-none overflow-hidden" aria-hidden="true">
            <div className="absolute w-72 h-72 rounded-full opacity-[0.04] blur-[50px] transition-all duration-500 ease-out bg-white"
              style={{ left: `calc(50% + ${mousePos.x * 60}px)`, top: `calc(15% + ${mousePos.y * 30}px)` }} />
          </div>

          <div className="relative z-10 p-7">
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div key="login" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white">Welcome back</h2>
                    <p className="text-white/30 text-sm mt-1">Sign in to your account</p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-3">
                    {error && <AlertMessage type="error">{error}</AlertMessage>}
                    <AuthInput icon={Mail} type="email" placeholder="Email address" value={loginEmail} onChange={setLoginEmail} name="login-email" />
                    <AuthInput icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Password" value={loginPassword} onChange={setLoginPassword} name="login-password"
                      right={<PasswordToggle show={showPassword} onClick={() => setShowPassword(!showPassword)} />} />
                    <div className="pt-2">
                      <SubmitButton loading={loading}>
                        <span>Sign In</span>
                        <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                      </SubmitButton>
                    </div>
                  </form>
                </motion.div>
              )}

              {mode === 'register' && (
                <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white">Create account</h2>
                    <p className="text-white/30 text-sm mt-1">Join SmartBD Unlock today</p>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-3">
                    {error && <AlertMessage type="error">{error}</AlertMessage>}
                    <AuthInput icon={Mail} type="email" placeholder="Email address" value={regEmail} onChange={setRegEmail} name="reg-email" />
                    <AuthInput icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Password" value={regPassword} onChange={setRegPassword} name="reg-password"
                      right={<PasswordToggle show={showPassword} onClick={() => setShowPassword(!showPassword)} />} />
                    <AuthInput icon={Lock} type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={regConfirmPassword} onChange={setRegConfirmPassword} name="reg-confirm"
                      right={<PasswordToggle show={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)} />} />
                    <div className="pt-2">
                      <SubmitButton loading={loading}>
                        <span>Create Account</span>
                        <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
                      </SubmitButton>
                    </div>
                  </form>
                </motion.div>
              )}

              {mode === 'pending' && (
                <motion.div key="pending" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3 }}>
                  <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                      <Clock size={26} className="text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Account Pending</h2>
                    <p className="text-white/30 text-sm mb-5 leading-relaxed">
                      Your account has been created. An admin will review and approve it.
                    </p>
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-5">
                      <p className="text-xs text-white/20 leading-relaxed">
                        You&apos;ll be able to log in once approved. Check back later or contact support.
                      </p>
                    </div>
                    <button onClick={() => switchMode('login')} className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                      Back to sign in
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(mode === 'login' || mode === 'register') && (
              <div className="mt-6 pt-5 border-t border-white/[0.06] text-center text-sm">
                {mode === 'login' ? (
                  <p className="text-white/25">
                    Don&apos;t have an account?{' '}
                    <button onClick={() => switchMode('register')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign up</button>
                  </p>
                ) : (
                  <p className="text-white/25">
                    Already have an account?{' '}
                    <button onClick={() => switchMode('login')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign in</button>
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        <p className="text-center text-[11px] text-white/15 mt-6">Enterprise GSM Service Platform v1.0</p>
      </motion.div>

      <style jsx>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  )
}
