import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuthStore } from '../lib/store'
import toast from 'react-hot-toast'

// ── Shared layout wrapper ──────────────────────────────────────────────────
function AuthLayout({ children }) {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black">Power<span className="text-purple-400">Plus</span></span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Input helper ──────────────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, required, autoComplete }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

// ── LOGIN PAGE ────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate()
  const { loginAsDemo } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error('Supabase not configured. Use the demo instead.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    if (data.session) {
      // Auth state change in App.jsx will handle redirect
      navigate('/app')
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) { toast.error('Supabase not configured.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setResetSent(true)
  }

  if (showReset) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-black text-zinc-100 mb-1">Reset password</h1>
        <p className="text-sm text-zinc-500 mb-7">We'll send a reset link to your email.</p>

        {resetSent ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-sm text-green-300">
            Check your inbox — reset link sent to <strong>{resetEmail}</strong>.
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <Field label="Email" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send reset link
            </button>
          </form>
        )}

        <button onClick={() => setShowReset(false)} className="w-full mt-4 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          Back to sign in
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-black text-zinc-100 mb-1">Welcome back</h1>
      <p className="text-sm text-zinc-500 mb-7">Sign in to your PowerPlus account.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />

        <div className="flex justify-end">
          <button type="button" onClick={() => setShowReset(true)} className="text-xs text-zinc-500 hover:text-purple-400 transition-colors">
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign in
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      {/* Demo quick-access */}
      <button
        onClick={() => navigate('/demo')}
        className="w-full border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-semibold py-2.5 rounded-lg text-sm transition-colors"
      >
        Explore demo (no account needed)
      </button>

      <p className="text-xs text-zinc-600 text-center mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">Sign up free</Link>
      </p>
    </AuthLayout>
  )
}

// ── SIGNUP PAGE ───────────────────────────────────────────────────────────
export function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!isSupabaseConfigured()) {
      toast.error('Supabase not configured — use demo mode.')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, display_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) { toast.error(error.message); return }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-zinc-100 mb-2">Check your email</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-2">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-semibold text-purple-300 mb-5">{email}</p>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Click the link in that email to activate your account and be taken straight into PowerPlus.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => { setDone(false); setEmail(''); setPassword(''); setFullName('') }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Use a different email
            </button>
            <Link to="/login" className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-semibold">
              Already confirmed? Sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-black text-zinc-100 mb-1">Create your account</h1>
      <p className="text-sm text-zinc-500 mb-7">Free forever for solo athletes.</p>

      <form onSubmit={handleSignup} className="space-y-4">
        <Field label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jordan Blake" required autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
        <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required autoComplete="new-password" />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create account
        </button>
      </form>

      <p className="text-xs text-zinc-600 text-center mt-5">
        By signing up you agree to our{' '}
        <a href="#" className="text-zinc-500 hover:text-zinc-300">Terms</a>{' '}
        and{' '}
        <a href="#" className="text-zinc-500 hover:text-zinc-300">Privacy Policy</a>.
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-600">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <button
        onClick={() => navigate('/demo')}
        className="w-full border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-semibold py-2.5 rounded-lg text-sm transition-colors"
      >
        Try demo first
      </button>

      <p className="text-xs text-zinc-600 text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">Sign in</Link>
      </p>
    </AuthLayout>
  )
}
