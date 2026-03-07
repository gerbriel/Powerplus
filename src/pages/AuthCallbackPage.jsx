import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { handleAuthSession } = useAuthStore()

  // 'verifying' | 'set_password' | 'saving' | 'success' | 'error'
  const [status, setStatus] = useState('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  // Password-set form state (used when status === 'set_password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Detect token type from both hash and query params.
        // Supabase v2 puts type=invite / type=recovery in the hash for old-style links,
        // and in query params for PKCE links. Check both.
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
        const queryParams = new URLSearchParams(window.location.search)
        const tokenType = hashParams.get('type') || queryParams.get('type')

        // Exchange PKCE code for session (signup confirmations and modern invite links)
        const code = queryParams.get('code')
        if (code) {
          const { data: exchanged, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeErr) throw exchangeErr
          // After exchange, check if this was a recovery/invite type from the next_url or
          // inspect the user object — Supabase sets user.email_confirmed_at only AFTER confirm,
          // so a freshly-exchanged recovery session means the user needs to set a password.
          const exchangedType = exchanged?.user?.recovery_sent_at ? 'recovery' : null
          if (tokenType === 'invite' || tokenType === 'recovery' || exchangedType === 'recovery') {
            setStatus('set_password')
            return
          }
        }

        // For hash-based tokens (older invite/recovery links), type is in the hash
        if (tokenType === 'invite' || tokenType === 'recovery') {
          // Session is already set from the hash token — just show set-password form
          await new Promise(r => setTimeout(r, 500))
          setStatus('set_password')
          return
        }

        // ── Normal email confirmation ─────────────────────────────────────
        await new Promise(r => setTimeout(r, 500))
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (!session) {
          await new Promise(r => setTimeout(r, 1500))
          const { data: retry, error: retryErr } = await supabase.auth.getSession()
          if (retryErr || !retry.session) {
            throw new Error('Confirmation link may have expired. Please try signing in.')
          }
          await handleAuthSession(retry.session)
        } else {
          await handleAuthSession(session)
        }

        setStatus('success')
        const dest = getDestination()
        setTimeout(() => navigate(dest, { replace: true }), 1200)
      } catch (err) {
        console.error('Auth callback error:', err)
        setErrorMsg(err.message || 'Something went wrong. Please try signing in.')
        setStatus('error')
      }
    }

    processCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Determine where to send the user after auth ──────────────────────────
  // Super admins go straight to /app — they have no org and don't need onboarding.
  const getDestination = () => {
    const { orgMemberships, profile } = useAuthStore.getState()
    const isSuperAdmin = profile?.platform_role === 'super_admin' || profile?.role === 'super_admin'
    if (isSuperAdmin) return '/app'
    return (!profile?.onboarding_complete && orgMemberships.length === 0) ? '/onboarding' : '/app'
  }

  // ── Handle password set submission ──────────────────────────────────────
  const handleSetPassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (password.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setPwError('Passwords do not match.')
      return
    }
    setStatus('saving')
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      const { data: { session } } = await supabase.auth.getSession()
      await handleAuthSession(session)
      setStatus('success')
      setTimeout(() => navigate(getDestination(), { replace: true }), 1200)
    } catch (err) {
      console.error('Set password error:', err)
      setPwError(err.message || 'Failed to set password. Please try again.')
      setStatus('set_password')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 px-5">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-black text-zinc-100">
          Power<span className="text-purple-400">Plus</span>
        </span>
      </div>

      {/* Status card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-xs text-center">

        {status === 'verifying' && (
          <>
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-base font-semibold text-zinc-200">Verifying your link…</p>
            <p className="text-sm text-zinc-500 mt-1">Just a moment.</p>
          </>
        )}

        {/* ── Set password form (invite / password reset) ── */}
        {(status === 'set_password' || status === 'saving') && (
          <form onSubmit={handleSetPassword} className="text-left">
            <p className="text-base font-semibold text-zinc-200 text-center mb-1">Set your password</p>
            <p className="text-sm text-zinc-500 text-center mb-6">Choose a password to secure your account.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoComplete="new-password"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  autoComplete="new-password"
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              {pwError && (
                <p className="text-xs text-red-400">{pwError}</p>
              )}

              <button
                type="submit"
                disabled={status === 'saving'}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {status === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === 'saving' ? 'Saving…' : 'Set password & continue'}
              </button>
            </div>
          </form>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <p className="text-base font-semibold text-zinc-200">You're all set!</p>
            <p className="text-sm text-zinc-500 mt-1">Taking you to the app…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <p className="text-base font-semibold text-zinc-200">Verification failed</p>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{errorMsg}</p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                Go to sign in
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="w-full border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                Create new account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
