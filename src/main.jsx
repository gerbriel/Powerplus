import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// ─── Stale auth token cleanup (Bug 6) ────────────────────────────────────────
// During development it's common to switch Supabase projects, leaving stale
// sb-<old-ref>-auth-token keys in localStorage that cause silent auth errors.
// On boot, remove any Supabase token that doesn't belong to the current project.
;(() => {
  try {
    const currentRef = (import.meta.env.VITE_SUPABASE_URL || '')
      .replace('https://', '')
      .split('.')[0]
    if (!currentRef) return
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token') && !k.includes(currentRef))
      .forEach((k) => localStorage.removeItem(k))
  } catch (_) { /* storage access may be blocked in some environments */ }
})()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
