import { Toaster } from 'react-hot-toast'
import { useAuthStore, useUIStore, useSettingsStore } from './lib/store'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { MobileNav } from './components/layout/MobileNav'
import { LoginPage } from './components/LoginPage'

// Pages
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
  // All roles land on 'today' — athletes see their personal dashboard,
  // staff see the org/athlete overview dashboard
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
      {/* Sidebar (desktop) */}
      <div className="relative">
        <Sidebar />
      </div>

      {/* Main area */}
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

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}

export default function App() {
  const { profile } = useAuthStore()

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
      {profile ? <AppShell /> : <LoginPage />}
    </>
  )
}
