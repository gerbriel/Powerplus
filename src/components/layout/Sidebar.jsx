import { useNavigate, useLocation } from 'react-router-dom'
import { useUIStore, useAuthStore, useOrgStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, MessageSquare,
  Calendar, BarChart3, Trophy, Users, Settings, BookOpen,
  Target, ChevronLeft, ChevronRight, Zap, Shield, Calculator,
  Globe, Building2, Stethoscope, Eye, EyeOff, Activity, UserCheck,
} from 'lucide-react'

// Nav items per role — `path` is the segment after /app/
const STAFF_NAV = {
  admin: [
    { id: 'today',       path: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, section: 'main' },
    { id: 'roster',      path: 'roster',      label: 'Roster',        icon: Users,           section: 'main' },
    { id: 'programming', path: 'programming', label: 'Programming',   icon: Dumbbell,        section: 'main' },
    { id: 'workout',     path: 'workout',     label: 'Training Mgmt', icon: Activity,        section: 'main' },
    { id: 'nutrition',   path: 'nutrition',   label: 'Nutrition',     icon: UtensilsCrossed, section: 'main' },
    { id: 'messaging',   path: 'messaging',   label: 'Messaging',     icon: MessageSquare,   section: 'main' },
    { id: 'calendar',    path: 'calendar',    label: 'Calendar',      icon: Calendar,        section: 'main' },
    { id: 'analytics',   path: 'analytics',   label: 'Analytics',     icon: BarChart3,       section: 'main' },
    { id: 'meets',       path: 'meets',       label: 'Meets',         icon: Trophy,          section: 'main' },
    { id: 'website',     path: 'website',     label: 'Website',       icon: Globe,           section: 'tools' },
    { id: 'leads',       path: 'leads',       label: 'Leads',         icon: UserCheck,       section: 'tools' },
    { id: 'resources',   path: 'resources',   label: 'Resources',     icon: BookOpen,        section: 'tools' },
    { id: 'calculators', path: 'calculators', label: 'Calculators',   icon: Calculator,      section: 'tools' },
    { id: 'settings',    path: 'settings',    label: 'Settings',      icon: Settings,        section: 'tools' },
  ],
  coach: [
    { id: 'today',       path: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, section: 'main' },
    { id: 'roster',      path: 'roster',      label: 'My Athletes',   icon: Users,           section: 'main' },
    { id: 'programming', path: 'programming', label: 'Programming',   icon: Dumbbell,        section: 'main' },
    { id: 'workout',     path: 'workout',     label: 'Training Mgmt', icon: Activity,        section: 'main' },
    { id: 'nutrition',   path: 'nutrition',   label: 'Nutrition',     icon: UtensilsCrossed, section: 'main' },
    { id: 'messaging',   path: 'messaging',   label: 'Messaging',     icon: MessageSquare,   section: 'main' },
    { id: 'calendar',    path: 'calendar',    label: 'Calendar',      icon: Calendar,        section: 'main' },
    { id: 'analytics',   path: 'analytics',   label: 'Analytics',     icon: BarChart3,       section: 'main' },
    { id: 'meets',       path: 'meets',       label: 'Meets',         icon: Trophy,          section: 'main' },
    { id: 'website',     path: 'website',     label: 'Website',       icon: Globe,           section: 'tools' },
    { id: 'leads',       path: 'leads',       label: 'Leads',         icon: UserCheck,       section: 'tools' },
    { id: 'resources',   path: 'resources',   label: 'Resources',     icon: BookOpen,        section: 'tools' },
    { id: 'calculators', path: 'calculators', label: 'Calculators',   icon: Calculator,      section: 'tools' },
  ],
  nutritionist: [
    { id: 'today',       path: 'dashboard',   label: 'Dashboard',       icon: LayoutDashboard, section: 'main' },
    { id: 'roster',      path: 'roster',      label: 'My Athletes',     icon: Users,           section: 'main' },
    { id: 'nutrition',   path: 'nutrition',   label: 'Nutrition Plans', icon: UtensilsCrossed, section: 'main' },
    { id: 'injury',      path: 'injury',      label: 'Injuries',        icon: Stethoscope,     section: 'main' },
    { id: 'messaging',   path: 'messaging',   label: 'Messaging',       icon: MessageSquare,   section: 'main' },
    { id: 'analytics',   path: 'analytics',   label: 'Analytics',       icon: BarChart3,       section: 'main' },
    { id: 'resources',   path: 'resources',   label: 'Resources',       icon: BookOpen,        section: 'tools' },
  ],
}

const ATHLETE_NAV = [
  { id: 'today',       path: 'dashboard',   label: 'Today',        icon: Zap,             section: 'main' },
  { id: 'workout',     path: 'workout',     label: 'Workouts',     icon: Dumbbell,        section: 'main' },
  { id: 'nutrition',   path: 'nutrition',   label: 'Nutrition',    icon: UtensilsCrossed, section: 'main' },
  { id: 'injury',      path: 'injury',      label: 'Injuries',     icon: Stethoscope,     section: 'main' },
  { id: 'messaging',   path: 'messaging',   label: 'Messages',     icon: MessageSquare,   section: 'main' },
  { id: 'calendar',    path: 'calendar',    label: 'Calendar',     icon: Calendar,        section: 'main' },
  { id: 'goals',       path: 'goals',       label: 'Goals & PRs',  icon: Target,          section: 'main' },
  { id: 'meets',       path: 'meets',       label: 'Meets',        icon: Trophy,          section: 'main' },
  { id: 'resources',   path: 'resources',   label: 'Resources',    icon: BookOpen,        section: 'tools' },
  { id: 'calculators', path: 'calculators', label: 'Calculators',  icon: Calculator,      section: 'tools' },
]

const NAV_ITEMS = {
  super_admin: [
    { id: 'today',     path: 'dashboard', label: 'Platform Dashboard', icon: Globe,     section: 'main' },
    { id: 'settings',  path: 'settings',  label: 'Organizations',      icon: Building2, section: 'main' },
    { id: 'analytics', path: 'analytics', label: 'Platform Analytics', icon: BarChart3, section: 'main' },
  ],
  admin: STAFF_NAV.admin,
  coach: STAFF_NAV.coach,
  nutritionist: STAFF_NAV.nutritionist,
  athlete: ATHLETE_NAV,
}

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { profile, viewAsAthlete, toggleViewAsAthlete, orgMemberships, activeOrgId } = useAuthStore()
  const { orgs } = useOrgStore()

  // Derive role — check platform_role first (super_admin), then profile.role,
  // then fall back to the org membership's org_role, then 'athlete'.
  const membership = orgMemberships.find((m) => m.org_id === activeOrgId)
  const orgRole = membership?.org_role   // 'head_coach' | 'coach' | 'nutritionist' | 'athlete'

  const resolvedRole = (() => {
    if (profile?.platform_role === 'super_admin') return 'super_admin'
    const r = profile?.role || orgRole
    if (!r) return 'athlete'
    if (r === 'head_coach' || r === 'owner') return 'admin'
    if (r === 'super_admin') return 'super_admin'
    if (r === 'coach') return 'coach'
    if (r === 'nutritionist') return 'nutritionist'
    if (r === 'admin') return 'admin'
    return 'athlete'
  })()

  const role = resolvedRole
  const canViewAsAthlete = role === 'admin' || role === 'coach' || role === 'nutritionist'
  const effectiveItems = (canViewAsAthlete && viewAsAthlete) ? ATHLETE_NAV : (NAV_ITEMS[role] || NAV_ITEMS.athlete)

  const userOrg = profile?.org_id ? orgs.find((o) => o.id === profile.org_id) : null
  const mainItems = effectiveItems.filter((i) => i.section === 'main')
  const toolItems = effectiveItems.filter((i) => i.section === 'tools')

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-zinc-800 gap-3', sidebarCollapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <span className="text-sm font-bold text-zinc-100">PowerPlus</span>
            {role === 'super_admin' ? (
              <span className="block text-xs text-rose-400 font-semibold">Platform Admin</span>
            ) : userOrg ? (
              <span className="block text-xs text-zinc-500 truncate">{userOrg.name}</span>
            ) : (
              <span className="block text-xs text-zinc-500">Team OS</span>
            )}
          </div>
        )}
      </div>

      {/* View-as-Athlete toggle (only for self-athlete staff) */}
      {canViewAsAthlete && (
        <div className={cn('border-b border-zinc-800 px-2 py-2', sidebarCollapsed && 'flex justify-center')}>
          <button
            onClick={() => {
              toggleViewAsAthlete()
              navigate('/app/dashboard')
            }}
            title={viewAsAthlete ? 'Switch to Staff View' : 'View as Athlete'}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all w-full',
              viewAsAthlete
                ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/25'
                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
              sidebarCollapsed && 'justify-center px-0 w-10'
            )}
          >
            {viewAsAthlete
              ? <><EyeOff className="w-3.5 h-3.5 flex-shrink-0" />{!sidebarCollapsed && 'Athlete View'}</>
              : <><Eye className="w-3.5 h-3.5 flex-shrink-0" />{!sidebarCollapsed && 'View as Athlete'}</>
            }
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {viewAsAthlete && canViewAsAthlete && !sidebarCollapsed && (
          <p className="text-xs text-yellow-500/70 font-semibold uppercase tracking-wider px-3 mb-2">
            Athlete View
          </p>
        )}
        <NavGroup items={mainItems} location={location} navigate={navigate} collapsed={sidebarCollapsed} />
        {toolItems.length > 0 && (
          <>
            {!sidebarCollapsed && <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider px-3 mt-4 mb-1">Tools</div>}
            <NavGroup items={toolItems} location={location} navigate={navigate} collapsed={sidebarCollapsed} />
          </>
        )}
      </nav>

      {/* Profile */}
      <div className={cn('p-3 border-t border-zinc-800', sidebarCollapsed && 'flex justify-center')}>
        {sidebarCollapsed ? (
          <Avatar name={profile?.full_name} role={role} size="sm" />
        ) : (
          <div className="flex items-center gap-3 px-1">
            <Avatar name={profile?.full_name} role={role} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">{profile?.full_name}</p>
              <Badge color={roleBadgeColor(role)} className="mt-0.5">{role}</Badge>
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -right-3 w-6 h-6 bg-zinc-700 border border-zinc-600 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-600 transition-all z-10 hidden md:flex"
        style={{ transform: 'translateY(-50%)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}

function NavGroup({ items, location, navigate, collapsed }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon
        const active = location.pathname === `/Powerplus/app/${item.path}` ||
                       location.pathname.startsWith(`/Powerplus/app/${item.path}/`)
        return (
          <li key={item.id}>
            <button
              onClick={() => navigate(`/app/${item.path}`)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                collapsed ? 'justify-center' : '',
                active
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              )}
            >
              <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function roleBadgeColor(role) {
  const map = { super_admin: 'red', admin: 'purple', coach: 'blue', nutritionist: 'green', athlete: 'yellow' }
  return map[role] || 'default'
}
