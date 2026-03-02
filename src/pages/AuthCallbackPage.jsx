import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { handleAuthSession } = useAuthStore()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      // Parse hash or query params for tokens
      // Supabase v2 automatically handles PKCE code exchange via onAuthStateChange,
      // but we also poll getSession as a fallback.
      try {
        // Give Supabase's internal listener a moment to process the URL
        await new Promise(r => setTimeout(r, 500))

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          setErrorMsg(error.message)
          setStatus('error')
          return
        }

        if (session) {
          // Let the store handle setting up profile
          await handleAuthSession(session)
          setStatus('success')
          // Short delay so the success state is visible, then redirect
          setTimeout(() => navigate('/app', { replace: true }), 1200)
        } else {
          // No session yet — maybe the code hasn't been exchanged
          // Try once more after another delay
          await new Promise(r => setTimeout(r, 1500))
          const { data: retry, error: retryErr } = await supabase.auth.getSession()
          if (retryErr || !retry.session) {
            setErrorMsg('Confirmation link may have expired. Please try signing in.')
            setStatus('error')
          } else {
            await handleAuthSession(retry.session)
            setStatus('success')
            setTimeout(() => navigate('/app', { replace: true }), 1200)
          }
        }
      } catch (err) {
        console.error('Unexpected callback error:', err)
        setErrorMsg('Something went wrong. Please try signing in.')
        setStatus('error')
      }
    }

    processCallback()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
            <p className="text-base font-semibold text-zinc-200">Verifying your email…</p>
            <p className="text-sm text-zinc-500 mt-1">Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-4" />
            <p className="text-base font-semibold text-zinc-200">Email confirmed!</p>
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
