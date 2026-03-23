import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore, useUIStore, useSettingsStore } from './lib/store'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { MobileNav } from './components/layout/MobileNav'

// Auth / marketing pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage, SignupPage } from './pages/AuthPages'
import DemoPage from './pages/DemoPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import OnboardingPage from './pages/OnboardingPage'
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
import { WebsitePage } from './pages/WebsitePage'
import { LeadsPage } from './pages/LeadsPage'

function AppShell() {
  const { colorMode } = useSettingsStore()

  return (
    <div className={`flex h-screen overflow-hidden ${colorMode === 'light' ? 'light bg-[#FEF6ED]' : 'bg-[#0d1117]'}`}>
      <div className="relative">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

/** Guards the /app route — redirects to /login if not authenticated,
 *  or to /onboarding if the user is real (non-demo) and has no org yet.
 *  Super admins bypass onboarding entirely — they manage the platform, not an org. */
function ProtectedApp() {
  const { profile, orgMemberships, authReady } = useAuthStore()
  if (!authReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0d1117]">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!profile) return <Navigate to="/login" replace />
  // Super admins skip onboarding — they have no org and don't need one
  const isSuperAdmin = profile.platform_role === 'super_admin' || profile.role === 'super_admin'
  if (isSuperAdmin) return <Outlet />
  // Demo users skip onboarding
  const isDemo = profile.id?.startsWith('mock-') || profile.id?.startsWith('demo-') || profile.isDemo
  // Real non-super-admin users with no org and onboarding not complete → onboarding
  if (!isDemo && !profile.onboarding_complete && orgMemberships.length === 0) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
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
        {/* Public routes */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/signup"        element={<SignupPage />} />
        <Route path="/demo"          element={<DemoPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/onboarding"    element={<OnboardingPage />} />
        <Route path="/org/:slug"     element={<OrgPublicPage />} />

        {/* Protected app routes */}
        <Route path="/app" element={<ProtectedApp />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<TodayPage />} />
            <Route path="workout"     element={<WorkoutPage />} />
            <Route path="training"    element={<WorkoutPage />} />
            <Route path="programming" element={<ProgrammingPage />} />
            <Route path="roster"      element={<RosterPage />} />
            <Route path="roster/:athleteId" element={<RosterPage />} />
            <Route path="nutrition"   element={<NutritionPage />} />
            <Route path="checkin"     element={<CheckInPage />} />
            <Route path="goals"       element={<GoalsPage />} />
            <Route path="injury"      element={<InjuryPage />} />
            <Route path="meets"       element={<MeetsPage />} />
            <Route path="meets/:meetId" element={<MeetsPage />} />
            <Route path="messaging"   element={<MessagingPage />} />
            <Route path="calendar"    element={<CalendarPage />} />
            <Route path="analytics"   element={<AnalyticsPage />} />
            <Route path="leads"       element={<LeadsPage />} />
            <Route path="resources"   element={<ResourcesPage />} />
            <Route path="calculators" element={<CalculatorsPage />} />
            <Route path="settings"    element={<AdminPage />} />
            <Route path="profile"     element={<ProfilePage />} />
            <Route path="website"     element={<WebsitePage />} />
            {/* Fallback inside app — redirect to dashboard */}
            <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
          </Route>
        </Route>

        {/* Global fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
