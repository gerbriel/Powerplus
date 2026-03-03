import { useUIStore, useAuthStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { X, Zap, Dumbbell, UtensilsCrossed, MessageSquare, Calendar, Target, Trophy, BookOpen, LayoutDashboard, Users, BarChart3, Settings, Shield, Globe, Stethoscope, Eye, EyeOff, Activity, Code2, UserCheck } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'

const STAFF_NAV = {
  admin: [
    { id: 'today', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'programming', label: 'Programming', icon: Code2 },
    { id: 'workout', label: 'Training Mgmt', icon: Activity },
    { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'meets', label: 'Meets', icon: Trophy },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'leads', label: 'Leads', icon: UserCheck },
    { id: 'resources', label: 'Resources', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ],
  coach: [
    { id: 'today', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roster', label: 'My Athletes', icon: Users },
    { id: 'programming', label: 'Programming', icon: Code2 },
    { id: 'workout', label: 'Training Mgmt', icon: Activity },
    { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'meets', label: 'Meets', icon: Trophy },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'leads', label: 'Leads', icon: UserCheck },
    { id: 'resources', label: 'Resources', icon: BookOpen },
  ],
  nutritionist: [
    { id: 'today', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'roster', label: 'My Athletes', icon: Users },
    { id: 'nutrition', label: 'Nutrition Plans', icon: UtensilsCrossed },
    { id: 'injury', label: 'Injuries', icon: Stethoscope },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resources', label: 'Resources', icon: BookOpen },
  ],
}

const ATHLETE_NAV = [
  { id: 'today', label: 'Today', icon: Zap },
  { id: 'workout', label: 'Workouts', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { id: 'injury', label: 'Injuries', icon: Stethoscope },
  { id: 'messaging', label: 'Messages', icon: MessageSquare },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'goals', label: 'Goals & PRs', icon: Target },
  { id: 'meets', label: 'Meets', icon: Trophy },
  { id: 'resources', label: 'Resources', icon: BookOpen },
]

const NAV_ITEMS = {
  super_admin: [
    { id: 'settings', label: 'Organizations', icon: Globe },
    { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
  ],
  admin: STAFF_NAV.admin,
  coach: STAFF_NAV.coach,
  nutritionist: STAFF_NAV.nutritionist,
  athlete: ATHLETE_NAV,
}

function roleBadgeColor(role) {
  const map = { super_admin: 'red', admin: 'purple', coach: 'blue', nutritionist: 'green', athlete: 'yellow' }
  return map[role] || 'default'
}

export function MobileNav() {
  const { mobileNavOpen, setMobileNavOpen, activePage, setActivePage } = useUIStore()
  const { profile, viewAsAthlete, toggleViewAsAthlete, orgMemberships, activeOrgId } = useAuthStore()

  const membership = orgMemberships.find((m) => m.org_id === activeOrgId)
  const orgRole = membership?.org_role

  // Same role resolution as Sidebar — org_role is ground truth, profile.role is preferred
  const role = (() => {
    const r = profile?.role || orgRole
    if (!r) return 'athlete'
    if (r === 'head_coach' || r === 'owner') return 'admin'
    if (r === 'super_admin') return 'super_admin'
    if (r === 'coach') return 'coach'
    if (r === 'nutritionist') return 'nutritionist'
    if (r === 'admin') return 'admin'
    return 'athlete'
  })()

  // Any staff member can toggle athlete view to see their own personal data
  const canViewAsAthlete = role === 'admin' || role === 'coach' || role === 'nutritionist'
  // When staff are in athlete view, show the athlete nav; otherwise show their staff nav.
  const items = (canViewAsAthlete && viewAsAthlete) ? ATHLETE_NAV : (NAV_ITEMS[role] || NAV_ITEMS.athlete)

  if (!mobileNavOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNavOpen(false)} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-zinc-100">PowerPlus</span>
              <span className="block text-xs text-zinc-500">Team OS</span>
            </div>
          </div>
          <button onClick={() => setMobileNavOpen(false)} className="text-zinc-400 hover:text-zinc-100 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View-as-Athlete toggle */}
        {canViewAsAthlete && (
          <div className="px-3 pt-3">
            <button
              onClick={() => {
                toggleViewAsAthlete()
                setActivePage(viewAsAthlete ? 'today' : 'today')
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all border',
                viewAsAthlete
                  ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              )}
            >
              {viewAsAthlete ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {viewAsAthlete ? 'Back to Staff View' : 'View as Athlete'}
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {viewAsAthlete && canViewAsAthlete && (
            <p className="text-xs text-yellow-500/70 font-semibold uppercase tracking-wider px-3 mb-2">Athlete View</p>
          )}
          <ul className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon
              const active = activePage === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setActivePage(item.id); setMobileNavOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      active
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <Avatar name={profile?.full_name} role={role} size="sm" />
            <div>
              <p className="text-xs font-semibold text-zinc-200">{profile?.full_name}</p>
              <Badge color={roleBadgeColor(role)} className="mt-0.5">{role}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
