import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore, useSettingsStore } from './lib/store'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { MobileNav } from './components/layout/MobileNav'

// Auth / marketing pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage, SignupPage } from './pages/AuthPages'
import DemoPage from './pages/DemoPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import { OrgPublicPage } from './pages/OrgPublicPage'

// App pages
import { TodayPage } from './pages/TodayPage'
import { WorkoutPage } from './pages/WorkoutPage'
import { MessagingPage } from './pages/MessagingPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { RosterPage } from './pages/RosterPage'
import { NutritionPage } from './pages/NutritionPage'
import { GoalsPage } from './pages/GoalsPage'
import { MeetsPage } from './pages/MeetsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { CalendarPage } from './pages/CalendarPage'
import { ProgrammingPage } from './pages/ProgrammingPage'
import { AdminPage } from './pages/AdminPage'
import { ProfilePage } from './pages/ProfilePage'
import { CheckInPage } from './pages/CheckInPage'
import { CalculatorsPage } from './pages/CalculatorsPage'
import { InjuryPage } from './pages/InjuryPage'

// Page registry — keyed by the activePage value set in Sidebar/MobileNav
const PAGE_MAP = {
  today: TodayPage,
  workout: WorkoutPage,
  messaging: MessagingPage,
  analytics: AnalyticsPage,
  roster: RosterPage,
  nutrition: NutritionPage,
  goals: GoalsPage,
  meets: MeetsPage,
  resources: ResourcesPage,
  calendar: CalendarPage,
  programming: ProgrammingPage,
  settings: AdminPage,
  dashboard: DashboardRedirect,
  checkin: CheckInPage,
  profile: ProfilePage,
  calculators: CalculatorsPage,
  injury: InjuryPage,
}

/** Redirects /dashboard to the role-appropriate landing page */
function DashboardRedirect() {
  const { profile } = useAuthStore()
  const { setActivePage } = useUIStore()
  const role = profile?.role || 'athlete'
  const landingPage = role === 'super_admin' ? 'settings' : 'today'
  setTimeout(() => setActivePage(landingPage), 0)
  return null
}

function AppShell() {
  const { activePage } = useUIStore()
  const { colorMode } = useSettingsStore()
  const PageComponent = PAGE_MAP[activePage]

  return (
    <div className={`flex h-screen overflow-hidden ${colorMode === 'light' ? 'light bg-[#FEF6ED]' : 'bg-[#0d1117]'}`}>
      <div className="relative">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {PageComponent ? (
            <PageComponent />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
              Page not found
            </div>
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

/** Guards the /app route — redirects to /login if not authenticated */
function ProtectedApp() {
  const { profile } = useAuthStore()
  if (!profile) return <Navigate to="/login" replace />
  return <AppShell />
}

/** Root — subscribes to Supabase auth on mount */
function Root() {
  const { initAuth } = useAuthStore()

  useEffect(() => {
    const unsub = initAuth()
    return unsub
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#27272a',
            color: '#f4f4f5',
            border: '1px solid #3f3f46',
          },
        }}
      />
      <Routes>
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<SignupPage />} />
        <Route path="/demo"          element={<DemoPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/org/:slug"     element={<OrgPublicPage />} />
        <Route path="/app"           element={<ProtectedApp />} />
        {/* Fallback */}
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/Powerplus">
      <Root />
    </BrowserRouter>
  )
}

