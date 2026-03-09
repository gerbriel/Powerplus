import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import {
  Users, Shield, Bell, Database, Settings, PlusCircle, Mail, Trash2,
  AlertTriangle, Lock, Globe, Building2, CheckCircle2,
  ChevronDown, ChevronRight, Edit2, RefreshCw, UserPlus, Crown,
  Activity, TrendingUp, TrendingDown, Dumbbell, UtensilsCrossed, Target,
  Send, RotateCcw, Check, X, ToggleLeft, ToggleRight,
  CreditCard, Search, ArrowLeft, BarChart2, Zap, Heart, Moon,
  ClipboardList, Scale, CalendarDays, Award, Flame,
  Link2, Eye, EyeOff, ExternalLink, GripVertical, Plus, FileText,
  MessageSquare, Star, HelpCircle, Image, ChevronUp, Palette,
  Phone, UserCheck, UserX, Clock, Filter, SlidersHorizontal, Copy,
  CheckSquare, XSquare, ArrowUpRight, Server
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { Tabs } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { MOCK_ATHLETES, MOCK_USERS, MOCK_ORGS, MOCK_TRAINING_BLOCKS, PLAN_META, DEFAULT_INTAKE_FIELDS } from '../lib/mockData'
import { useAuthStore, useOrgStore, useGoalsStore, useTrainingStore } from '../lib/store'
import { cn } from '../lib/utils'
import { fetchOrgJoinRequests, approveJoinRequest, denyJoinRequest } from '../lib/supabase'

const ROLE_MATRIX = [
  { permission: 'View Athlete Profiles', super_admin: true, admin: true, coach: true, nutritionist: true, athlete: false },
  { permission: 'Edit Athlete Profiles', super_admin: true, admin: true, coach: true, nutritionist: false, athlete: false },
  { permission: 'Create Workout Programs', super_admin: true, admin: true, coach: true, nutritionist: false, athlete: false },
  { permission: 'Log Workouts', super_admin: true, admin: true, coach: true, nutritionist: false, athlete: true },
  { permission: 'View Nutrition Data', super_admin: true, admin: true, coach: true, nutritionist: true, athlete: true },
  { permission: 'Edit Nutrition Plans', super_admin: true, admin: true, coach: false, nutritionist: true, athlete: false },
  { permission: 'Manage Channels', super_admin: true, admin: true, coach: true, nutritionist: false, athlete: false },
  { permission: 'Send Messages', super_admin: true, admin: true, coach: true, nutritionist: true, athlete: true },
  { permission: 'View Analytics', super_admin: true, admin: true, coach: true, nutritionist: false, athlete: false },
  { permission: 'Export Data', super_admin: true, admin: true, coach: false, nutritionist: false, athlete: false },
  { permission: 'Manage Team Members', super_admin: true, admin: true, coach: false, nutritionist: false, athlete: false },
  { permission: 'Manage Organizations', super_admin: true, admin: false, coach: false, nutritionist: false, athlete: false },
  { permission: 'Billing Access', super_admin: true, admin: true, coach: false, nutritionist: false, athlete: false },
]

const ORG_STATUS_BADGE = {
  active: { color: 'green', label: 'Active' },
  suspended: { color: 'red', label: 'Suspended' },
  pending: { color: 'yellow', label: 'Pending' },
}

const ROLE_OPTIONS = ['admin', 'coach', 'nutritionist', 'athlete']
const ROLE_BADGE_MAP = { super_admin: 'red', admin: 'purple', coach: 'blue', nutritionist: 'green', athlete: 'yellow' }
function roleBadge(role) { return ROLE_BADGE_MAP[role] || 'default' }

function activityDot(type) {
  const map = {
    join: 'bg-green-400', update: 'bg-blue-400', payment: 'bg-purple-400',
    checkin: 'bg-yellow-400', nutrition: 'bg-teal-400', invite: 'bg-indigo-400',
    flag: 'bg-red-400', workout: 'bg-orange-400'
  }
  return map[type] || 'bg-zinc-500'
}



// ─── Main Page ────────────────────────────────────────────────────────────────
export function AdminPage() {
  const { profile } = useAuthStore()
  const { loadAllOrgs, loadPlatformUsers } = useOrgStore()
  const isSuperAdmin = profile?.platform_role === 'super_admin' || profile?.role === 'super_admin'
  const isHeadCoach = profile?.role === 'head_coach' || profile?.role === 'admin' || profile?.org_role === 'head_coach' || profile?.org_role === 'owner'
  const canManage = isSuperAdmin || isHeadCoach

  // Load real Supabase data for super_admin on mount
  useEffect(() => {
    if (isSuperAdmin) {
      loadAllOrgs()
      loadPlatformUsers()
    }
  }, [isSuperAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  const SUPER_TABS = [
    { id: 'orgs',      label: 'Organizations' },
    { id: 'users',     label: 'Users' },
    { id: 'analytics', label: 'Platform Analytics' },
    { id: 'billing',   label: 'Billing & Plans' },
    { id: 'demo',      label: 'Demo Sandbox' },
    { id: 'system',    label: 'System' },
  ]
  const ADMIN_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'team', label: 'Team Members' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'org', label: 'Org Settings' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger Zone' },
  ]
  const BASIC_TABS = [
    { id: 'notifications', label: 'Notifications' },
    { id: 'danger', label: 'Danger Zone' },
  ]

  const visibleTabs = isSuperAdmin ? SUPER_TABS : isHeadCoach ? ADMIN_TABS : BASIC_TABS
  const [tab, setTab] = useState(visibleTabs[0].id)
  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            {isSuperAdmin
              ? <><Globe className="w-5 h-5 text-rose-400" /> Platform Admin</>
              : isHeadCoach
              ? <><Shield className="w-5 h-5 text-purple-400" /> Admin</>
              : <><Settings className="w-5 h-5 text-zinc-400" /> Settings</>}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {isSuperAdmin ? 'Billing orgs, subscriptions, user accounts, platform health'
              : isHeadCoach ? 'Org settings, team management, invitations, and permissions'
              : 'Your notification preferences and account settings'}
          </p>
        </div>
        {isHeadCoach && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Invite Member
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl">
          <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-300 capitalize">{profile?.role}</span> role · Team management and org settings are restricted to Admin (Head Coach).
          </p>
        </div>
      )}

      <Tabs tabs={visibleTabs} activeTab={tab} onChange={setTab} />

      {tab === 'orgs'      && isSuperAdmin && <SuperAdminOrgsTab />}
      {tab === 'users'     && isSuperAdmin && <PlatformUsersTab />}
      {tab === 'analytics' && isSuperAdmin && <PlatformAnalyticsTab />}
      {tab === 'billing'   && isSuperAdmin && <PlatformBillingTab />}
      {tab === 'demo'      && isSuperAdmin && <DemoSandboxTab />}
      {tab === 'system'    && isSuperAdmin && <PlatformSystemTab />}
      {tab === 'overview' && isHeadCoach && <OverviewTab />}
      {tab === 'team' && isHeadCoach && <TeamTab onInvite={() => setInviteOpen(true)} />}
      {tab === 'invitations' && isHeadCoach && <InvitationsTab />}
      {tab === 'org' && isHeadCoach && <OrgSettingsTab />}
      {tab === 'roles' && canManage && <RolesTab isSuperAdmin={isSuperAdmin} />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'danger' && <DangerZoneTab />}

      {isHeadCoach && <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} orgId={profile?.org_id} />}
    </div>
  )
}

// ─── Platform Analytics (Super Admin) ────────────────────────────────────────
const chartTooltipStyle = {
  contentStyle: { backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px' },
  labelStyle: { color: '#a1a1aa' },
}

const PLAN_MRR = { starter: 0, team_pro: 149, enterprise: 499 }

// ─── Platform Analytics (Super Admin — SaaS metrics) ─────────────────────────
function PlatformAnalyticsTab() {
  const { orgs, platformUsers } = useOrgStore()

  // Separate production orgs from demo orgs — demo orgs are excluded from ALL metrics
  const productionOrgs = orgs.filter((o) => !o.is_demo)

  // Only count users not flagged as demo — real Supabase users have undefined (falsy) is_demo
  const productionPlatformUsers = useMemo(
    () => platformUsers.filter((u) => !u.is_demo),
    [platformUsers]
  )

  // Revenue — production orgs only
  const billingOrgs = productionOrgs  // alias for clarity in billing calcs
  const totalMRR = billingOrgs.filter((o) => o.status === 'active').reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)
  const totalARR = totalMRR * 12
  const activeOrgs = productionOrgs.filter((o) => o.status === 'active').length
  const suspendedOrgs = productionOrgs.filter((o) => o.status === 'suspended').length
  const paidOrgs = billingOrgs.filter((o) => o.plan !== 'starter' && o.status === 'active').length
  const conversionRate = billingOrgs.length > 0 ? Math.round((paidOrgs / billingOrgs.length) * 100) : 0
  const totalStorage = productionOrgs.reduce((s, o) => s + (o.storage_gb_used || 0), 0)
  const totalStorageLimit = productionOrgs.reduce((s, o) => s + (o.storage_gb_limit || 2), 0)
  const totalMembers = productionOrgs.reduce((s, o) => s + (o.members || []).length, 0)
  const totalAthletes = productionOrgs.reduce((s, o) => s + (o.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length, 0)
  const totalStaff = totalMembers - totalAthletes

  const planBreakdown = Object.keys(PLAN_META).map((p) => ({
    plan: p, meta: PLAN_META[p],
    count: billingOrgs.filter((o) => o.plan === p).length,
    mrr: billingOrgs.filter((o) => o.plan === p && o.status === 'active').reduce((s) => s + (PLAN_MRR[p] || 0), 0),
  }))

  // Org growth by month — production orgs only
  const orgGrowth = useMemo(() => {
    const months = {}
    productionOrgs.forEach((o) => {
      if (!o.created_at) return
      const key = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months[key] = (months[key] || 0) + 1
    })
    return Object.entries(months).slice(-8).map(([month, count]) => ({ month, count }))
  }, [productionOrgs])

  // User growth by month — production users only
  const userGrowth = useMemo(() => {
    const months = {}
    productionPlatformUsers.forEach((u) => {
      if (!u.created_at) return
      const key = new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months[key] = (months[key] || 0) + 1
    })
    return Object.entries(months).slice(-8).map(([month, count]) => ({ month, count }))
  }, [productionPlatformUsers])

  // Churn risk — production orgs only (suspended demo orgs don't count)
  const churnRisk = productionOrgs.filter((o) => {
    if (o.status === 'suspended') return true
    const athletePct = ((o.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length / (o.athlete_limit || 10)) * 100
    return athletePct >= 90 && o.status === 'active'
  })

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR" value={`$${totalMRR.toLocaleString()}`} sub={`$${totalARR.toLocaleString()} ARR`} icon={TrendingUp} color="green" />
        <StatCard label="Paying Orgs" value={paidOrgs} sub={`${conversionRate}% conversion`} icon={Building2} color="purple" />
        <StatCard label="Production Users" value={productionPlatformUsers.length || (totalAthletes + totalStaff)} sub={`${totalAthletes} athletes · ${totalStaff} staff`} icon={Users} color="blue" />
        <StatCard label="Active Orgs" value={activeOrgs} sub={`${suspendedOrgs} suspended`} icon={Activity} color="yellow" />
      </div>

      {/* Org growth + User growth */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-400" /> Org Signups by Month</CardTitle>
            <CardSubtitle>New organizations created per month</CardSubtitle>
          </CardHeader>
          <CardBody>
            {orgGrowth.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No data yet</p>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orgGrowth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="count" name="New Orgs" fill="#a855f7" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> User Signups by Month</CardTitle>
            <CardSubtitle>New user profiles created per month</CardSubtitle>
          </CardHeader>
          <CardBody>
            {userGrowth.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No data yet</p>
            ) : (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={userGrowth} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="count" name="New Users" fill="#3b82f6" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Plan breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-green-400" /> Revenue by Plan</CardTitle>
          <CardSubtitle>Billing orgs only — demo orgs excluded</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-4">
            {planBreakdown.map(({ plan, meta, count, mrr }) => (
              <div key={plan} className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700 text-center">
                <Badge color={meta.color} className="mb-2">{meta.label}</Badge>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{count}</p>
                <p className="text-xs text-zinc-500">org{count !== 1 ? 's' : ''}</p>
                <p className="text-sm font-semibold text-green-400 mt-2">
                  {mrr > 0 ? `$${mrr.toLocaleString()}/mo` : 'Free'}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{meta.price}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Storage + churn risk */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="w-4 h-4 text-blue-400" /> Platform Health</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'Active orgs',           value: activeOrgs,     of: productionOrgs.length, color: 'bg-green-500' },
              { label: 'Paid conversion (ex. demo)', value: paidOrgs,  of: billingOrgs.length,    color: 'bg-purple-500' },
              { label: 'Storage used',           value: +totalStorage.toFixed(1), of: totalStorageLimit, color: 'bg-yellow-500', suffix: 'GB' },
            ].map((item) => {
              const pct = Math.min(item.of > 0 ? (item.value / item.of) * 100 : 0, 100)
              return (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-zinc-400">{item.label}</span>
                    <span className="text-xs text-zinc-300 font-medium">{item.value}{item.suffix || ''} / {item.of}{item.suffix || ''}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" /> Churn Risk & Upsell</CardTitle>
            <CardSubtitle>Suspended orgs and orgs near limits</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {churnRisk.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">No risk flags</p>
            ) : churnRisk.map((o) => {
              const athletePct = ((o.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length / (o.athlete_limit || 10)) * 100
              return (
                <div key={o.id} className={`flex items-center gap-3 p-2 rounded-lg border ${o.status === 'suspended' ? 'bg-red-500/5 border-red-500/15' : 'bg-yellow-500/5 border-yellow-500/15'}`}>
                  {o.status === 'suspended'
                    ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    : <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium">{o.name}</p>
                    <p className={`text-xs ${o.status === 'suspended' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {o.status === 'suspended' ? `Suspended · ${PLAN_META[o.plan]?.label}` : `Athlete limit ${Math.round(athletePct)}% full — upsell`}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// ─── Platform Users (Super Admin) ─────────────────────────────────────────────
function PlatformUsersTab() {
  const { platformUsers, orgs } = useOrgStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)

  // Build membership map from orgs (populated by fetchAllOrgsForSuperAdmin)
  const userOrgMap = useMemo(() => {
    const map = {}
    orgs.forEach((org) => {
      ;(org.members || []).forEach((m) => {
        if (!map[m.user_id]) map[m.user_id] = []
        map[m.user_id].push({
          orgId:     org.id,
          orgName:   org.name,
          orgPlan:   org.plan,
          orgStatus: org.status,
          is_demo:   !!org.is_demo,
          org_role:  m.org_role || m.role,
          status:    m.status,
          joined_at: m.joined_at,
        })
      })
    })
    return map
  }, [orgs])

  // Memberships for a user: prefer u.memberships (mock) if it's a real array,
  // otherwise fall back to userOrgMap built from loaded orgs (Supabase path)
  const getMemberships = useCallback((u) => {
    if (Array.isArray(u.memberships) && u.memberships.length > 0) return u.memberships
    return userOrgMap[u.id] || []
  }, [userOrgMap])

  // A user is "demo-only" if:
  //  (a) explicitly flagged is_demo: true (mock data), OR
  //  (b) has at least one org membership and every org is a demo org
  // Users with NO org memberships are NOT demo — they're real users without an org yet.
  const isUserDemo = useCallback((u) => {
    if (u.is_demo === true) return true
    const memberships = getMemberships(u)
    if (memberships.length === 0) return false
    return memberships.every((m) => m.is_demo)
  }, [getMemberships])

  // Primary display role: first non-demo org role → profile role field → null
  const getPrimaryRole = useCallback((u) => {
    const memberships = getMemberships(u)
    const prodMembership = memberships.find((m) => !m.is_demo)
    return prodMembership?.org_role || u.role || null
  }, [getMemberships])

  // Production users: not demo-only
  const productionUsers = useMemo(
    () => platformUsers.filter((u) => !isUserDemo(u)),
    [platformUsers, isUserDemo]
  )

  // Demo users count for the info banner
  const demoUserCount = useMemo(
    () => platformUsers.filter((u) => isUserDemo(u)).length,
    [platformUsers, isUserDemo]
  )

  const filtered = productionUsers.filter((u) => {
    const matchSearch = (u.full_name || u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const primaryRole = getPrimaryRole(u)
    const matchRole = roleFilter === 'all' || u.platform_role === roleFilter || primaryRole === roleFilter
    return matchSearch && matchRole
  })

  const athleteCount = useMemo(
    () => productionUsers.filter((u) => getPrimaryRole(u) === 'athlete').length,
    [productionUsers, getPrimaryRole]
  )
  const staffCount = useMemo(
    () => productionUsers.filter((u) => {
      const r = getPrimaryRole(u)
      return r !== 'athlete' && u.platform_role !== 'super_admin'
    }).length,
    [productionUsers, getPrimaryRole]
  )
  const superAdminCount = productionUsers.filter((u) => u.platform_role === 'super_admin').length

  return (
    <div className="space-y-5">
      {demoUserCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg text-xs text-amber-400">
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          {demoUserCount} demo-only user{demoUserCount !== 1 ? 's' : ''} hidden — view them in the <strong>Demo Sandbox</strong> tab.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Production Users" value={productionUsers.length} icon={Users} color="purple" />
        <StatCard label="Athletes" value={athleteCount} icon={Activity} color="blue" />
        <StatCard label="Staff / Coaches" value={staffCount} icon={Shield} color="green" />
        <StatCard label="Super Admins" value={superAdminCount} icon={Crown} color="red" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
          <option value="all">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="head_coach">Head Coach</option>
          <option value="coach">Coach</option>
          <option value="nutritionist">Nutritionist</option>
          <option value="athlete">Athlete</option>
        </select>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Org · Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const memberships = getMemberships(u)
                  const primaryRole = getPrimaryRole(u)
                  return (
                    <tr key={u.id} className={`border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 cursor-pointer ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`} onClick={() => setSelectedUser({ ...u, memberships })}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.full_name || u.display_name || u.email} size="xs" />
                          <div>
                            <p className="text-zinc-200 font-medium text-sm">{u.full_name || u.display_name || u.email}</p>
                            <p className="text-xs text-zinc-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {memberships.length === 0 ? (
                          <div className="flex items-center gap-1.5">
                            {primaryRole ? (
                              <Badge color={roleBadge(primaryRole)} className="capitalize text-xs">
                                {primaryRole === 'head_coach' ? 'Head Coach' : primaryRole}
                              </Badge>
                            ) : null}
                            <span className="text-xs text-zinc-600">No org yet</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {memberships.map((m) => (
                              <div key={m.orgId} className="flex items-center gap-1.5 flex-wrap">
                                <Badge color={roleBadge(m.org_role)} className="capitalize text-xs">
                                  {m.org_role === 'head_coach' ? 'Head Coach' : m.org_role || 'user'}
                                </Badge>
                                <span className={`text-xs ${m.is_demo ? 'text-zinc-600 italic' : 'text-zinc-400'}`}>
                                  {m.orgName}{m.is_demo ? ' (demo)' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Eye className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-300" />
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* User drill-down modal */}
      {selectedUser && (
        <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Detail" size="sm">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.full_name || selectedUser.email} size="lg" />
              <div>
                <p className="text-base font-semibold text-zinc-100">{selectedUser.full_name || selectedUser.display_name || selectedUser.email}</p>
                <p className="text-sm text-zinc-400">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {selectedUser.platform_role === 'super_admin'
                    ? <Badge color="red">Super Admin</Badge>
                    : (() => {
                        // First non-demo org role → profile.role field → "Member"
                        const primaryOrgRole = (selectedUser.memberships || []).find(m => !m.is_demo)?.org_role
                        const displayRole = primaryOrgRole || selectedUser.role || null
                        if (!displayRole) return <Badge color="default">Member</Badge>
                        return (
                          <Badge color={roleBadge(displayRole)} className="capitalize">
                            {displayRole === 'head_coach' ? 'Head Coach' : displayRole}
                          </Badge>
                        )
                      })()
                  }
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-zinc-500 mb-0.5">Joined</p>
                <p className="text-zinc-200 font-medium">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : '—'}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-zinc-500 mb-0.5">Platform Role</p>
                <p className="text-zinc-200 font-medium capitalize">{selectedUser.platform_role || 'user'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Organization Memberships ({selectedUser.memberships.length})</p>
              {selectedUser.memberships.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-500">No org memberships yet</p>
                  {selectedUser.role && selectedUser.role !== 'athlete' && (
                    <p className="text-xs text-zinc-600">Profile role: <span className="text-zinc-400 capitalize">{selectedUser.role === 'head_coach' ? 'Head Coach' : selectedUser.role}</span> — user has not been added to an org</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedUser.memberships.map((m) => (
                    <div key={m.orgId} className="p-2.5 bg-zinc-800/40 rounded-lg space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{m.orgName}</span>
                          {m.is_demo && <Badge color="default" className="text-xs">Demo</Badge>}
                        </div>
                        <Badge color={roleBadge(m.org_role)} className="capitalize text-xs">
                          {m.org_role === 'head_coach' ? 'Head Coach' : m.org_role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        {m.orgPlan && <span className="capitalize">{PLAN_META[m.orgPlan]?.label || m.orgPlan}</span>}
                        {m.orgStatus && <span className={m.orgStatus === 'active' ? 'text-green-500' : 'text-red-400'}>{m.orgStatus}</span>}
                        {m.joined_at && <span>Joined {m.joined_at}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Platform Billing (Super Admin) ──────────────────────────────────────────
function PlatformBillingTab() {
  const { orgs } = useOrgStore()

  // Exclude demo orgs from all billing views
  const billingOrgs = orgs.filter((o) => !o.is_demo)
  const paidOrgs = billingOrgs.filter((o) => o.plan !== 'starter' && o.status === 'active')
  const freeOrgs = billingOrgs.filter((o) => o.plan === 'starter')
  const totalMRR = paidOrgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)

  return (
    <div className="space-y-5">
      {/* MRR summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR" value={`$${totalMRR.toLocaleString()}`} sub="billing orgs only" icon={TrendingUp} color="green" />
        <StatCard label="ARR" value={`$${(totalMRR * 12).toLocaleString()}`} icon={CreditCard} color="purple" />
        <StatCard label="Paid Orgs" value={paidOrgs.length} icon={CheckCircle2} color="blue" />
        <StatCard label="Free Orgs" value={freeOrgs.length} sub="upsell candidates" icon={Building2} color="yellow" />
      </div>

      {/* Stripe integration notice */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <CreditCard className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-300">Stripe integration ready</p>
          <p className="text-xs text-zinc-400 mt-0.5">Each org has <code className="text-blue-400">stripe_customer_id</code> and <code className="text-blue-400">stripe_subscription_id</code> columns. Connect Stripe to sync billing data here automatically.</p>
        </div>
      </div>

      {/* Paid subscriptions */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">Active Subscriptions</p>
        {paidOrgs.length === 0 ? (
          <Card>
            <CardBody className="py-10 text-center text-zinc-500">
              <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No paid subscriptions yet</p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {paidOrgs.map((org) => {
              const planInfo = PLAN_META[org.plan] || PLAN_META.starter
              const mrr = PLAN_MRR[org.plan] || 0
              const athletes = (org.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length
              const athletePct = Math.round((athletes / (org.athlete_limit || 10)) * 100)
              return (
                <Card key={org.id}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-700/60 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
                        <Badge color={planInfo.color}>{planInfo.label}</Badge>
                        <Badge color="green">Active</Badge>
                        {org.stripe_subscription_id && <Badge color="default" className="text-xs font-mono">Stripe ✓</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                        <span>{athletes}/{org.athlete_limit} athletes ({athletePct}%)</span>
                        <span>{org.billing_email || org.federation || 'No billing email'}</span>
                        <span>Since {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}</span>
                      </div>
                      {/* Limit bar */}
                      <div className="mt-2 h-1 bg-zinc-700 rounded-full w-48">
                        <div className={`h-full rounded-full ${athletePct >= 90 ? 'bg-red-500' : athletePct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(athletePct, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-green-400">${mrr}/mo</p>
                      <p className="text-xs text-zinc-500">${(mrr * 12).toLocaleString()}/yr</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Free / upsell candidates */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">Free Tier — Upsell Candidates</p>
        {freeOrgs.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-4">No free orgs</p>
        ) : (
          <div className="space-y-2">
            {freeOrgs.map((org) => {
              const athletes = (org.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length
              const pct = Math.round((athletes / (org.athlete_limit || 10)) * 100)
              return (
                <div key={org.id} className="flex items-center gap-4 p-3 bg-zinc-900 border border-zinc-700 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200 font-medium">{org.name}</span>
                      <Badge color="default">Starter</Badge>
                      {org.status === 'suspended' && <Badge color="red">Suspended</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full">
                        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0">{athletes}/{org.athlete_limit} athletes</span>
                    </div>
                  </div>
                  {pct >= 70 && <Badge color="yellow">Upsell</Badge>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Demo orgs — clearly separated */}
      {orgs.filter((o) => o.is_demo).length > 0 && (
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wide font-semibold mb-3 flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5" /> Demo Orgs (excluded from billing)
          </p>
          <div className="space-y-2 opacity-50">
            {orgs.filter((o) => o.is_demo).map((org) => (
              <div key={org.id} className="flex items-center gap-3 p-3 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl">
                <span className="text-sm text-zinc-400">{org.name}</span>
                <Badge color="default" className="text-xs">Demo · Not billed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Demo Sandbox Tab (Super Admin) ──────────────────────────────────────────
function DemoSandboxTab() {
  const { orgs, loadOrgMembers, updateOrg } = useOrgStore()
  const { platformUsers } = useOrgStore()
  const demoOrgs = orgs.filter((o) => o.is_demo)
  const [selectedOrg, setSelectedOrg] = useState(null)

  useEffect(() => {
    demoOrgs.forEach((o) => {
      if ((o.members || []).length === 0) loadOrgMembers(o.id)
    })
  }, [demoOrgs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Use is_demo flag directly — no indirect org-membership lookup
  const demoUsers = platformUsers.filter((u) => u.is_demo === true && u.platform_role !== 'super_admin')
  const liveUsers = platformUsers.filter((u) => !u.is_demo)

  return (
    <div className="space-y-6">
      {/* Header notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Demo Sandbox — isolated from production</p>
          <p className="text-xs text-zinc-400 mt-1">
            Organizations flagged <code className="text-amber-400">is_demo = true</code> are shown here only.
            They are excluded from billing, MRR, analytics, and the main Organizations tab.
            Demo users assigned to demo orgs are also isolated below.
          </p>
        </div>
      </div>

      {demoOrgs.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <EyeOff className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No demo orgs yet.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Run <code className="text-zinc-400">UPDATE organizations SET is_demo = true WHERE name ILIKE '%iron north%'</code> in Supabase to mark one.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Demo org cards */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Demo Organizations ({demoOrgs.length})</p>
            <div className="space-y-3">
              {demoOrgs.map((org) => {
                const athletes = (org.members || []).filter((m) => (m.org_role || m.role) === 'athlete')
                const staff = (org.members || []).filter((m) => (m.org_role || m.role) !== 'athlete')
                const planInfo = PLAN_META[org.plan] || PLAN_META.starter
                const isSelected = selectedOrg === org.id

                return (
                  <Card key={org.id} className="border-dashed border-amber-500/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
                          <Badge color="default" className="text-xs">Demo · Not billed</Badge>
                          <Badge color={planInfo.color}>{planInfo.label}</Badge>
                          <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label || org.status}</Badge>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">/{org.slug} · {org.federation || 'No federation'}</p>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                          <span><Users className="w-3 h-3 inline mr-1" />{athletes.length} athletes</span>
                          <span><Shield className="w-3 h-3 inline mr-1" />{staff.length} staff</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedOrg(isSelected ? null : org.id)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Members</p>
                        {(org.members || []).length === 0 ? (
                          <p className="text-xs text-zinc-600">No members loaded yet</p>
                        ) : (
                          (org.members || []).map((m) => (
                            <div key={m.user_id} className="flex items-center gap-3 py-1">
                              <Avatar name={m.full_name} size="xs" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-zinc-200">{m.full_name || 'Unknown'}</span>
                                <span className="text-xs text-zinc-500 ml-2">{m.email}</span>
                              </div>
                              <Badge color={roleBadge(m.org_role || m.role)} className="capitalize text-xs">{m.org_role || m.role}</Badge>
                            </div>
                          ))
                        )}
                        <div className="mt-3 pt-2 border-t border-zinc-800/60">
                          <button
                            onClick={() => updateOrg(org.id, { is_demo: false })}
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Promote to production org
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Demo users */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Demo Users ({demoUsers.length})</p>
            {demoUsers.length === 0 ? (
              <p className="text-sm text-zinc-600">No users assigned to demo orgs yet.</p>
            ) : (
              <Card>
                <CardBody className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">User</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Demo Org</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoUsers.map((u) => {
                        const membership = demoOrgs.flatMap((o) => (o.members || []).filter((m) => m.user_id === u.id).map((m) => ({ orgName: o.name, role: m.org_role || m.role })))[0]
                        return (
                          <tr key={u.id} className="border-b border-zinc-800/50 last:border-0">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={u.full_name || u.email} size="xs" />
                                <div>
                                  <p className="text-zinc-200 text-sm">{u.full_name || u.email}</p>
                                  <p className="text-xs text-zinc-500">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Badge color={roleBadge(membership?.role)} className="capitalize text-xs">{membership?.role || '—'}</Badge>
                            </td>
                            <td className="px-4 py-2 text-xs text-amber-400/80">{membership?.orgName || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Live users (non-demo, non-super_admin) for reference */}
          <div className="p-3 bg-zinc-800/30 border border-zinc-700 rounded-xl">
            <p className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-300">{liveUsers.length}</span> production users not in any demo org.
              These are real paying/trial accounts shown in the Users and Analytics tabs.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Platform System (Super Admin) ────────────────────────────────────────────
function PlatformSystemTab() {
  const { orgs } = useOrgStore()
  const totalStorage = orgs.reduce((s, o) => s + (o.storage_gb_used || 0), 0)
  const totalStorageLimit = orgs.reduce((s, o) => s + (o.storage_gb_limit || 0), 0)
  const storagePct = totalStorageLimit > 0 ? Math.round((totalStorage / totalStorageLimit) * 100) : 0

  const systemItems = [
    { label: 'API',           status: 'operational', latency: '43ms' },
    { label: 'Database',      status: 'operational', latency: '12ms' },
    { label: 'Auth',          status: 'operational', latency: '21ms' },
    { label: 'Storage',       status: 'operational', latency: '89ms' },
    { label: 'Email / SMTP',  status: 'operational', latency: '—'    },
    { label: 'Edge Functions', status: 'operational', latency: '31ms' },
  ]

  return (
    <div className="space-y-5">
      {/* Service status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" /> Service Status
          </CardTitle>
          <CardSubtitle>All systems nominal</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-zinc-800">
            {systemItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-sm text-zinc-200">{item.label}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {item.latency !== '—' && <span>{item.latency}</span>}
                  <Badge color="green">Operational</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Storage across all orgs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-yellow-400" /> Storage Across All Orgs
          </CardTitle>
          <CardSubtitle>{totalStorage.toFixed(1)} GB used of {totalStorageLimit} GB allocated</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-zinc-400">Total utilisation</span>
              <span className="text-xs text-zinc-300 font-medium">{storagePct}%</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full">
              <div
                className={`h-full rounded-full transition-all ${storagePct > 85 ? 'bg-red-500' : storagePct > 65 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {orgs.map((org) => {
              const pct = Math.round((org.storage_gb_used / org.storage_gb_limit) * 100)
              return (
                <div key={org.id} className="py-2.5 flex items-center gap-3">
                  <span className="text-sm text-zinc-300 flex-1">{org.name}</span>
                  <div className="flex items-center gap-2 w-40">
                    <div className="flex-1 h-1.5 bg-zinc-700 rounded-full">
                      <div className={`h-full rounded-full ${pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-zinc-500 w-16 text-right">{org.storage_gb_used}/{org.storage_gb_limit}GB</span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Org Analytics Drill-down ─────────────────────────────────────────────────
function OrgAnalyticsView({ org, onBack }) {
  const { isDemo } = useAuthStore()
  const [subTab, setSubTab] = useState('overview')
  const SUB_TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'coaches', label: 'Coaches' },
    { id: 'nutritionists', label: 'Nutritionists' },
    { id: 'athletes', label: 'Athletes' },
  ]
  const coaches = org.members.filter((m) => m.role === 'coach' || m.role === 'admin')
  const nutritionists = org.members.filter((m) => m.role === 'nutritionist')
  const athletes = org.members.filter((m) => m.role === 'athlete')
  // For org-001 in demo mode, use real MOCK_ATHLETES data; for others, generate synthetic profiles
  const athleteData = (isDemo && org.id === 'org-001')
    ? MOCK_ATHLETES
    : athletes.map((m, i) => ({
        id: m.user_id,
        full_name: m.full_name,
        weight_class: ['59kg','66kg','74kg','83kg','93kg','105kg'][i % 6],
        federation: org.federation || 'USAPL',
        adherence: 65 + Math.floor(i * 7.3) % 30,
        e1rm_squat: 120 + i * 15,
        e1rm_bench: 80 + i * 10,
        e1rm_deadlift: 160 + i * 18,
        sleep_avg: +(6.0 + (i * 0.3) % 2.5).toFixed(1),
        nutrition_compliance: 60 + Math.floor(i * 8.1) % 35,
        rpe_avg_this_week: +(7 + (i * 0.2) % 1.5).toFixed(1),
        sessions_this_week: 3 + (i % 3),
        sessions_planned_this_week: 5,
        flags: i === 1 ? ['pain_flag'] : i === 3 ? ['low_sleep'] : [],
        bodyweight_kg: 65 + i * 6,
        last_session: '2026-02-26',
        avatar_url: null,
        nutrition_macros: {
          plan: { calories: 2800 + i * 200, protein: 180 + i * 10, carbs: 320 + i * 20, fat: 80 },
          actual: { calories: 2400 + i * 150, protein: 155 + i * 8, carbs: 275 + i * 15, fat: 72 },
        },
      }))

  const planInfo = PLAN_META[org.plan] || PLAN_META.starter

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Analytics
        </button>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
        <span className="text-sm text-zinc-200 font-medium">{org.name}</span>
        <Badge color={planInfo.color}>{planInfo.label}</Badge>
        <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label}</Badge>
      </div>

      <Tabs tabs={SUB_TABS} activeTab={subTab} onChange={setSubTab} />

      {subTab === 'overview' && <OrgOverviewAnalytics org={org} coaches={coaches} nutritionists={nutritionists} athletes={athletes} athleteData={athleteData} />}
      {subTab === 'coaches' && <CoachesAnalytics coaches={coaches} org={org} athleteData={athleteData} />}
      {subTab === 'nutritionists' && <NutritionistsAnalytics nutritionists={nutritionists} athleteData={athleteData} />}
      {subTab === 'athletes' && <AthletesAnalytics athleteData={athleteData} org={org} />}
    </div>
  )
}

// ─── Org Overview Analytics ───────────────────────────────────────────────────
function OrgOverviewAnalytics({ org, coaches, nutritionists, athletes, athleteData }) {
  const avgAdherence = athleteData.length > 0
    ? Math.round(athleteData.reduce((s, a) => s + a.adherence, 0) / athleteData.length)
    : 0
  const avgSleep = athleteData.length > 0
    ? (athleteData.reduce((s, a) => s + a.sleep_avg, 0) / athleteData.length).toFixed(1)
    : '—'
  const avgNutrition = athleteData.length > 0
    ? Math.round(athleteData.reduce((s, a) => s + a.nutrition_compliance, 0) / athleteData.length)
    : 0
  const flagged = athleteData.filter((a) => a.flags?.length > 0)
  const storagePercent = Math.round((org.storage_gb_used / org.storage_gb_limit) * 100)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Athletes" value={athletes.length} icon={Users} color="blue" />
        <StatCard label="Avg Adherence" value={`${avgAdherence}%`} icon={Target} color={avgAdherence >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Avg Sleep" value={`${avgSleep}h`} icon={Moon} color={parseFloat(avgSleep) >= 7 ? 'green' : 'yellow'} />
        <StatCard label="Pain Flags" value={flagged.length} icon={AlertTriangle} color={flagged.length > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Staff breakdown */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> Staff</CardTitle></CardHeader>
          <CardBody className="space-y-2.5">
            {[
              { label: 'Head Coach / Admin', count: org.members.filter((m) => m.role === 'admin').length, color: 'text-purple-400' },
              { label: 'Coaches', count: coaches.filter((m) => m.role === 'coach').length, color: 'text-blue-400' },
              { label: 'Nutritionists', count: nutritionists.length, color: 'text-green-400' },
              { label: 'Athletes', count: athletes.length, color: 'text-yellow-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-zinc-800">
              {[
                { label: 'Athletes/Coach', value: coaches.length > 0 ? (athletes.length / coaches.length).toFixed(1) : '—' },
                { label: 'Athletes/Nutritionist', value: nutritionists.length > 0 ? (athletes.length / nutritionists.length).toFixed(1) : '—' },
              ].map(([k, v]) => typeof k === 'string' && (
                <div key={k} className="flex items-center justify-between py-0.5">
                  <span className="text-xs text-zinc-500">{k}</span>
                  <span className="text-xs text-zinc-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Athlete health */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Athlete Health</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[
              { label: 'Avg training adherence', value: `${avgAdherence}%`, warn: avgAdherence < 75 },
              { label: 'Avg sleep', value: `${avgSleep}h`, warn: parseFloat(avgSleep) < 6.5 },
              { label: 'Avg nutrition compliance', value: `${avgNutrition}%`, warn: avgNutrition < 70 },
              { label: 'Active flags', value: flagged.length, warn: flagged.length > 0 },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{item.label}</span>
                <span className={`text-sm font-semibold ${item.warn ? 'text-yellow-400' : 'text-zinc-200'}`}>{item.value}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Plan & usage */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-yellow-400" /> Plan & Usage</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'Athletes', used: athletes.length, limit: org.athlete_limit },
              { label: 'Staff', used: org.members.filter((m) => m.role !== 'athlete').length, limit: org.staff_limit },
              { label: 'Storage', used: org.storage_gb_used, limit: org.storage_gb_limit, suffix: 'GB' },
            ].map((item) => {
              const pct = Math.min((item.used / item.limit) * 100, 100)
              const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">{item.label}</span>
                    <span className="text-xs text-zinc-300">{item.used}{item.suffix || ''}/{item.limit}{item.suffix || ''}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} /></div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Activity log */}
      {org.activity_log.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle><CardSubtitle>{org.name}</CardSubtitle></CardHeader>
          <CardBody>
            {org.activity_log.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activityDot(item.type)}`} />
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{item.text}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ─── Coaches Analytics ────────────────────────────────────────────────────────
function CoachesAnalytics({ coaches, org, athleteData }) {
  const [selected, setSelected] = useState(null)
  const coach = selected ? coaches.find((c) => c.user_id === selected) : null

  if (coach) {
    return <CoachDrilldown coach={coach} org={org} athleteData={athleteData} onBack={() => setSelected(null)} />
  }

  if (coaches.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-zinc-500">
          <Shield className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No coaches in this organization</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Coaches — click to drill in</p>
      {coaches.map((c) => {
        const assignedCount = c.athlete_count ?? Math.floor(athleteData.length / coaches.length)
        const assignedAthletes = athleteData.slice(0, assignedCount)
        const avgAdherence = assignedAthletes.length > 0
          ? Math.round(assignedAthletes.reduce((s, a) => s + a.adherence, 0) / assignedAthletes.length)
          : 0
        const flags = assignedAthletes.filter((a) => a.flags?.length > 0).length
        return (
          <button key={c.user_id} onClick={() => setSelected(c.user_id)} className="w-full text-left group">
            <Card className="hover:border-zinc-500 transition-all">
              <div className="flex items-center gap-4">
                <Avatar name={c.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">{c.full_name}</span>
                    <Badge color={roleBadge(c.role)} className="capitalize">{c.role === 'admin' ? 'Head Coach' : c.role}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{c.email} · Joined {c.joined_at}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{assignedCount} athletes</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{avgAdherence}% avg adherence</span>
                    {flags > 0 && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" />{flags} flags</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

function CoachDrilldown({ coach, org, athleteData, onBack }) {
  const assignedCount = coach.athlete_count ?? Math.ceil(athleteData.length / 2)
  const myAthletes = athleteData.slice(0, assignedCount)
  const avgAdherence = myAthletes.length > 0 ? Math.round(myAthletes.reduce((s, a) => s + a.adherence, 0) / myAthletes.length) : 0
  const avgRPE = myAthletes.length > 0 ? (myAthletes.reduce((s, a) => s + a.rpe_avg_this_week, 0) / myAthletes.length).toFixed(1) : '—'
  const flags = myAthletes.filter((a) => a.flags?.length > 0)

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Coaches
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={coach.full_name} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100">{coach.full_name}</h2>
            <Badge color={roleBadge(coach.role)} className="capitalize">{coach.role === 'admin' ? 'Head Coach' : coach.role}</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{coach.email} · {org.name} · Joined {coach.joined_at}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Athletes Managed" value={myAthletes.length} icon={Users} color="blue" />
        <StatCard label="Avg Adherence" value={`${avgAdherence}%`} icon={Target} color={avgAdherence >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Avg RPE This Week" value={avgRPE} icon={Flame} color="orange" />
        <StatCard label="Open Flags" value={flags.length} icon={AlertTriangle} color={flags.length > 0 ? 'red' : 'green'} />
      </div>

      {flags.length > 0 && (
        <Card className="border-red-500/20">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Athletes Needing Attention</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {flags.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                <Avatar name={a.full_name} size="sm" />
                <div className="flex-1">
                  <span className="text-sm text-zinc-200">{a.full_name}</span>
                  <p className="text-xs text-red-400 mt-0.5">{a.flags.map((f) => f.replace('_', ' ')).join(', ')}</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>{a.adherence}% adherence</p>
                  <p>{a.sleep_avg}h sleep</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Athlete Roster</CardTitle><CardSubtitle>Training & wellness overview for all assigned athletes</CardSubtitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Athlete</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Adherence</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">RPE</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sessions</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sleep</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Squat / Bench / DL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {myAthletes.map((a, i) => (
                  <tr key={a.id} className={`border-b border-zinc-800 last:border-0 ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={a.full_name} size="xs" />
                        <div>
                          <p className="text-zinc-200 font-medium">{a.full_name}</p>
                          <p className="text-xs text-zinc-500">{a.weight_class} · {a.federation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${a.adherence >= 85 ? 'text-green-400' : a.adherence >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{a.adherence}%</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${a.rpe_avg_this_week <= 7.5 ? 'text-green-400' : a.rpe_avg_this_week <= 8.5 ? 'text-yellow-400' : 'text-red-400'}`}>{a.rpe_avg_this_week}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${a.sessions_this_week >= a.sessions_planned_this_week ? 'text-green-400' : 'text-yellow-400'}`}>{a.sessions_this_week}/{a.sessions_planned_this_week}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-semibold ${a.sleep_avg >= 7 ? 'text-green-400' : a.sleep_avg >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{a.sleep_avg}h</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-zinc-300">{a.e1rm_squat} / {a.e1rm_bench} / {a.e1rm_deadlift} kg</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.flags?.length > 0
                        ? <Badge color="red">{a.flags[0].replace('_', ' ')}</Badge>
                        : <Badge color="green">Healthy</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Nutritionists Analytics ──────────────────────────────────────────────────
function NutritionistsAnalytics({ nutritionists, athleteData }) {
  const [selected, setSelected] = useState(null)
  const nutri = selected ? nutritionists.find((n) => n.user_id === selected) : null

  if (nutri) {
    return <NutritionistDrilldown nutri={nutri} athleteData={athleteData} onBack={() => setSelected(null)} />
  }

  if (nutritionists.length === 0) {
    return (
      <Card>
        <CardBody className="py-12 text-center text-zinc-500">
          <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No nutritionists in this organization</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">Nutritionists — click to drill in</p>
      {nutritionists.map((n) => {
        const clientCount = n.athlete_count ?? Math.ceil(athleteData.length / nutritionists.length)
        const myAthletes = athleteData.slice(0, clientCount)
        const avgCompliance = myAthletes.length > 0
          ? Math.round(myAthletes.reduce((s, a) => s + a.nutrition_compliance, 0) / myAthletes.length)
          : 0
        const avgCalDeficit = myAthletes.length > 0
          ? Math.round(myAthletes.reduce((s, a) => {
              const plan = a.nutrition_macros?.plan?.calories || 0
              const actual = a.nutrition_macros?.actual?.calories || 0
              return s + (plan - actual)
            }, 0) / myAthletes.length)
          : 0
        return (
          <button key={n.user_id} onClick={() => setSelected(n.user_id)} className="w-full text-left group">
            <Card className="hover:border-zinc-500 transition-all">
              <div className="flex items-center gap-4">
                <Avatar name={n.full_name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{n.full_name}</span>
                    <Badge color="green">Nutritionist</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{n.email} · Joined {n.joined_at}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{clientCount} clients</span>
                    <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" />{avgCompliance}% avg compliance</span>
                    <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-orange-400" />avg deficit: {avgCalDeficit} kcal</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
              </div>
            </Card>
          </button>
        )
      })}
    </div>
  )
}

function NutritionistDrilldown({ nutri, athleteData, onBack }) {
  const clientCount = nutri.athlete_count ?? Math.ceil(athleteData.length / 2)
  const myAthletes = athleteData.slice(0, clientCount)
  const avgCompliance = myAthletes.length > 0
    ? Math.round(myAthletes.reduce((s, a) => s + a.nutrition_compliance, 0) / myAthletes.length)
    : 0

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Nutritionists
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={nutri.full_name} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-100">{nutri.full_name}</h2>
            <Badge color="green">Nutritionist</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{nutri.email} · Joined {nutri.joined_at}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Clients" value={myAthletes.length} icon={Users} color="green" />
        <StatCard label="Avg Compliance" value={`${avgCompliance}%`} icon={Target} color={avgCompliance >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Plans On Track" value={myAthletes.filter((a) => a.nutrition_compliance >= 80).length} icon={CheckCircle2} color="blue" />
        <StatCard label="Needs Attention" value={myAthletes.filter((a) => a.nutrition_compliance < 70).length} icon={AlertTriangle} color="yellow" />
      </div>

      <Card>
        <CardHeader><CardTitle>Client Nutrition Overview</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Athlete</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Compliance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Calories Plan</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Calories Actual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Protein Plan/Actual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Bodyweight</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {myAthletes.map((a, i) => {
                  const planCal = a.nutrition_macros?.plan?.calories ?? 0
                  const actualCal = a.nutrition_macros?.actual?.calories ?? 0
                  const planPro = a.nutrition_macros?.plan?.protein ?? 0
                  const actualPro = a.nutrition_macros?.actual?.protein ?? 0
                  const deficit = planCal - actualCal
                  return (
                    <tr key={a.id} className={`border-b border-zinc-800 last:border-0 ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={a.full_name} size="xs" />
                          <div>
                            <p className="text-zinc-200 font-medium">{a.full_name}</p>
                            <p className="text-xs text-zinc-500">{a.weight_class}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-semibold ${a.nutrition_compliance >= 85 ? 'text-green-400' : a.nutrition_compliance >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{a.nutrition_compliance}%</span>
                          <div className="w-16 h-1 bg-zinc-700 rounded-full"><div className={`h-full rounded-full ${a.nutrition_compliance >= 85 ? 'bg-green-500' : a.nutrition_compliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${a.nutrition_compliance}%` }} /></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-300">{planCal} kcal</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium ${deficit > 200 ? 'text-orange-400' : deficit < -100 ? 'text-blue-400' : 'text-zinc-300'}`}>{actualCal} kcal</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-300">{planPro}g / {actualPro}g</td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-300">{a.bodyweight_kg}kg</td>
                      <td className="px-4 py-3 text-center">
                        {a.nutrition_compliance >= 85
                          ? <Badge color="green">On Track</Badge>
                          : a.nutrition_compliance >= 70
                          ? <Badge color="yellow">Review</Badge>
                          : <Badge color="red">At Risk</Badge>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Athletes Analytics ───────────────────────────────────────────────────────
function AthletesAnalytics({ athleteData, org }) {
  const [selected, setSelected] = useState(null)
  const [sortBy, setSortBy] = useState('adherence')
  const [filterFlag, setFilterFlag] = useState(false)

  const athlete = selected ? athleteData.find((a) => a.id === selected) : null
  if (athlete) {
    return <AthleteDrilldown athlete={athlete} org={org} onBack={() => setSelected(null)} />
  }

  const sorted = useMemo(() => {
    let list = filterFlag ? athleteData.filter((a) => a.flags?.length > 0) : [...athleteData]
    list.sort((a, b) => {
      if (sortBy === 'adherence') return b.adherence - a.adherence
      if (sortBy === 'sleep') return b.sleep_avg - a.sleep_avg
      if (sortBy === 'nutrition') return b.nutrition_compliance - a.nutrition_compliance
      if (sortBy === 'total') return (b.e1rm_squat + b.e1rm_bench + b.e1rm_deadlift) - (a.e1rm_squat + a.e1rm_bench + a.e1rm_deadlift)
      return 0
    })
    return list
  }, [athleteData, sortBy, filterFlag])

  const avgAdherence = athleteData.length > 0 ? Math.round(athleteData.reduce((s, a) => s + a.adherence, 0) / athleteData.length) : 0
  const avgNutrition = athleteData.length > 0 ? Math.round(athleteData.reduce((s, a) => s + a.nutrition_compliance, 0) / athleteData.length) : 0
  const avgSleep = athleteData.length > 0 ? (athleteData.reduce((s, a) => s + a.sleep_avg, 0) / athleteData.length).toFixed(1) : '—'
  const flagged = athleteData.filter((a) => a.flags?.length > 0).length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Athletes" value={athleteData.length} icon={Users} color="blue" />
        <StatCard label="Avg Adherence" value={`${avgAdherence}%`} icon={Target} color={avgAdherence >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Avg Nutrition" value={`${avgNutrition}%`} icon={UtensilsCrossed} color={avgNutrition >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Flags" value={flagged} icon={AlertTriangle} color={flagged > 0 ? 'red' : 'green'} />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-zinc-500">Sort by:</span>
        {[['adherence', 'Adherence'], ['sleep', 'Sleep'], ['nutrition', 'Nutrition'], ['total', 'Total (SBD)']].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${sortBy === k ? 'bg-purple-600/20 border-purple-500/40 text-purple-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>{label}</button>
        ))}
        <button onClick={() => setFilterFlag((p) => !p)} className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ml-2 ${filterFlag ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}>
          {filterFlag ? 'Clear filter' : 'Flagged only'}
        </button>
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Athlete</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Adherence</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nutrition</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sleep</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">SBD Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Last Session</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a, i) => {
                  const sbdTotal = a.e1rm_squat + a.e1rm_bench + a.e1rm_deadlift
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a.id)}
                      className={`border-b border-zinc-800 last:border-0 cursor-pointer hover:bg-zinc-800/40 transition-colors ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={a.full_name} size="xs" />
                          <div>
                            <p className="text-zinc-200 font-medium">{a.full_name}</p>
                            <p className="text-xs text-zinc-500">{a.weight_class} · {a.federation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${a.adherence >= 85 ? 'text-green-400' : a.adherence >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{a.adherence}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${a.nutrition_compliance >= 85 ? 'text-green-400' : a.nutrition_compliance >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>{a.nutrition_compliance}%</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${a.sleep_avg >= 7 ? 'text-green-400' : a.sleep_avg >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{a.sleep_avg}h</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-300 font-medium">{sbdTotal}kg</td>
                      <td className="px-4 py-3 text-center text-xs text-zinc-400">{a.last_session}</td>
                      <td className="px-4 py-3 text-center">
                        {a.flags?.length > 0
                          ? <Badge color="red">{a.flags[0].replace('_', ' ')}</Badge>
                          : <Badge color="green">Healthy</Badge>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function AthleteDrilldown({ athlete: a, org, onBack }) {
  const sbdTotal = a.e1rm_squat + a.e1rm_bench + a.e1rm_deadlift
  const calDiff = (a.nutrition_macros?.actual?.calories ?? 0) - (a.nutrition_macros?.plan?.calories ?? 0)
  const proDiff = (a.nutrition_macros?.actual?.protein ?? 0) - (a.nutrition_macros?.plan?.protein ?? 0)

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Athletes
      </button>

      <div className="flex items-center gap-4">
        <Avatar name={a.full_name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-zinc-100">{a.full_name}</h2>
            <Badge color="yellow">{a.weight_class}</Badge>
            <Badge color="default">{a.federation}</Badge>
            {a.flags?.map((f) => <Badge key={f} color="red">{f.replace('_', ' ')}</Badge>)}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{org.name} · Last session: {a.last_session}</p>
          {a.bio && <p className="text-xs text-zinc-400 mt-1 max-w-md">{a.bio}</p>}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Adherence" value={`${a.adherence}%`} icon={Target} color={a.adherence >= 85 ? 'green' : 'yellow'} />
        <StatCard label="Nutrition" value={`${a.nutrition_compliance}%`} icon={UtensilsCrossed} color={a.nutrition_compliance >= 80 ? 'green' : 'yellow'} />
        <StatCard label="Avg Sleep" value={`${a.sleep_avg}h`} icon={Moon} color={a.sleep_avg >= 7 ? 'green' : 'red'} />
        <StatCard label="Avg RPE" value={a.rpe_avg_this_week} icon={Flame} color="orange" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Strength */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-purple-400" /> Strength (e1RM)</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {[
              { lift: 'Squat', value: a.e1rm_squat, color: 'bg-purple-500' },
              { lift: 'Bench', value: a.e1rm_bench, color: 'bg-blue-500' },
              { lift: 'Deadlift', value: a.e1rm_deadlift, color: 'bg-orange-500' },
            ].map((lift) => (
              <div key={lift.lift}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">{lift.lift}</span>
                  <span className="text-sm font-bold text-zinc-200">{lift.value} kg</span>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full">
                  <div className={`h-full rounded-full ${lift.color}`} style={{ width: `${Math.min((lift.value / 400) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Est. Total</span>
              <span className="text-sm font-bold text-zinc-100">{sbdTotal} kg</span>
            </div>
          </CardBody>
        </Card>

        {/* Nutrition macros */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-green-400" /> Nutrition Macros</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'Calories', plan: a.nutrition_macros?.plan?.calories, actual: a.nutrition_macros?.actual?.calories, unit: 'kcal' },
              { label: 'Protein', plan: a.nutrition_macros?.plan?.protein, actual: a.nutrition_macros?.actual?.protein, unit: 'g' },
              { label: 'Carbs', plan: a.nutrition_macros?.plan?.carbs, actual: a.nutrition_macros?.actual?.carbs, unit: 'g' },
              { label: 'Fat', plan: a.nutrition_macros?.plan?.fat, actual: a.nutrition_macros?.actual?.fat, unit: 'g' },
            ].map((m) => {
              const pct = m.plan > 0 ? Math.round((m.actual / m.plan) * 100) : 0
              const barColor = pct >= 90 ? 'bg-green-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-red-500'
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-400">{m.label}</span>
                    <span className="text-xs text-zinc-300">{m.actual}{m.unit} <span className="text-zinc-600">/ {m.plan}{m.unit}</span></span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )
            })}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Calorie balance</span>
              <span className={`text-sm font-semibold ${calDiff > 0 ? 'text-blue-400' : calDiff < -200 ? 'text-orange-400' : 'text-green-400'}`}>
                {calDiff > 0 ? '+' : ''}{calDiff} kcal
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Weekly check-in trend */}
      {a.check_in_trend && a.check_in_trend.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Weekly Check-in Trend</CardTitle></CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Week', 'Sleep', 'Soreness', 'Stress', 'Energy', 'Bodyweight'].map((h) => (
                      <th key={h} className={`px-3 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide ${h === 'Week' ? 'text-left' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {a.check_in_trend.map((row, i) => (
                    <tr key={row.week} className={`border-b border-zinc-800 last:border-0 ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}>
                      <td className="px-3 py-2 text-sm font-medium text-zinc-300">{row.week}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${row.sleep >= 7 ? 'text-green-400' : row.sleep >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{row.sleep}h</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${row.soreness <= 4 ? 'text-green-400' : row.soreness <= 7 ? 'text-yellow-400' : 'text-red-400'}`}>{row.soreness}/10</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${row.stress <= 4 ? 'text-green-400' : row.stress <= 6 ? 'text-yellow-400' : 'text-red-400'}`}>{row.stress}/10</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${row.energy >= 7 ? 'text-green-400' : row.energy >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{row.energy}/10</span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-zinc-300">{row.bodyweight}kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent sessions */}
      {a.recent_sessions && a.recent_sessions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-orange-400" /> Recent Sessions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {a.recent_sessions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">{s.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.date} · {s.sets} sets · RPE {s.rpe}</p>
                  {s.top_lift && <p className="text-xs text-purple-400 mt-0.5">Top: {s.top_lift}</p>}
                </div>
                <span className={`text-xs font-semibold mt-1 ${s.rpe <= 7 ? 'text-green-400' : s.rpe <= 8.5 ? 'text-yellow-400' : 'text-red-400'}`}>RPE {s.rpe}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Coach notes */}
      {a.coach_notes && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-zinc-400" /> Coach Notes</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-300 leading-relaxed">{a.coach_notes}</p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ─── Super Admin: All Organizations ──────────────────────────────────────────
// ─── Org Detail Modal ─────────────────────────────────────────────────────────
function OrgDetailModal({ org, onClose, onEdit, onToggleStatus, onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  if (!org) return null

  const athletes = (org.members || []).filter((m) => (m.org_role || m.role) === 'athlete')
  const staff = (org.members || []).filter((m) => (m.org_role || m.role) !== 'athlete')
  const pendingInvites = (org.invitations || []).filter((i) => i.status === 'pending')
  const planInfo = PLAN_META[org.plan] || PLAN_META.starter
  const athletePct = Math.min((athletes.length / (org.athlete_limit || 10)) * 100, 100)
  const staffPct = Math.min((staff.length / (org.staff_limit || 2)) * 100, 100)
  const storagePct = Math.min(((org.storage_gb_used || 0) / (org.storage_gb_limit || 2)) * 100, 100)

  return (
    <Modal open={!!org} onClose={onClose} title="Organization Detail" size="lg">
      <div className="flex flex-col gap-0">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-zinc-100">{org.name}</h3>
                  <Badge color={planInfo.color}>{planInfo.label}</Badge>
                  <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label || org.status}</Badge>
                  {org.is_demo && <Badge color="default">Demo</Badge>}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">/{org.slug} · {org.federation || 'No federation'} · {org.address || 'No location'}</p>
                <p className="text-xs text-zinc-600 mt-0.5">Created {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={onEdit} className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
              <button onClick={onToggleStatus} className={`p-2 rounded-lg transition-colors ${org.status === 'active' ? 'text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-zinc-500 hover:text-green-400 hover:bg-green-500/10'}`} title={org.status === 'active' ? 'Suspend' : 'Reactivate'}>
                {org.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => setDeleteConfirm(true)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          {deleteConfirm && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300 flex-1">Permanently delete <strong>{org.name}</strong>? This cannot be undone.</p>
              <button onClick={() => setDeleteConfirm(false)} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1">Cancel</button>
              <button onClick={() => { onDelete(); onClose() }} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg">Delete</button>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Usage bars */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Usage</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Athletes', used: athletes.length, limit: org.athlete_limit || 10, pct: athletePct },
                { label: 'Staff', used: staff.length, limit: org.staff_limit || 2, pct: staffPct },
                { label: 'Storage', used: +(org.storage_gb_used || 0).toFixed(1), limit: org.storage_gb_limit || 2, pct: storagePct, suffix: 'GB' },
              ].map((item) => (
                <div key={item.label} className="p-3 bg-zinc-800/40 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-zinc-500">{item.label}</span>
                    <span className="text-xs font-medium text-zinc-300">{item.used}{item.suffix || ''}/{item.limit}{item.suffix || ''}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.pct >= 90 ? 'bg-red-500' : item.pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">{Math.round(item.pct)}% used</p>
                </div>
              ))}
            </div>
          </div>

          {/* Billing */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Billing</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-800/40 rounded-xl">
                <p className="text-xs text-zinc-500 mb-0.5">Plan</p>
                <p className="text-sm font-semibold text-zinc-200">{planInfo.label} — {planInfo.price}</p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-xl">
                <p className="text-xs text-zinc-500 mb-0.5">Billing Email</p>
                <p className="text-sm text-zinc-300">{org.billing_email || <span className="text-zinc-600 italic">Not set</span>}</p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-xl">
                <p className="text-xs text-zinc-500 mb-0.5">Stripe Customer</p>
                <p className="text-sm text-zinc-300">{org.stripe_customer_id ? <span className="text-green-400 font-mono text-xs">{org.stripe_customer_id.slice(0, 18)}…</span> : <span className="text-zinc-600 italic">Not connected</span>}</p>
              </div>
              <div className="p-3 bg-zinc-800/40 rounded-xl">
                <p className="text-xs text-zinc-500 mb-0.5">Subscription ID</p>
                <p className="text-sm text-zinc-300">{org.stripe_subscription_id ? <span className="text-green-400 font-mono text-xs">{org.stripe_subscription_id.slice(0, 18)}…</span> : <span className="text-zinc-600 italic">Not connected</span>}</p>
              </div>
              {org.trial_ends_at && (
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl col-span-2">
                  <p className="text-xs text-yellow-500 mb-0.5">Trial Ends</p>
                  <p className="text-sm font-semibold text-yellow-300">{new Date(org.trial_ends_at).toLocaleDateString()}</p>
                </div>
              )}
              {org.is_demo && (
                <div className="col-span-2 p-3 bg-zinc-800/60 border border-dashed border-zinc-700 rounded-xl text-center">
                  <p className="text-xs text-zinc-500">Demo org — not billed</p>
                </div>
              )}
            </div>
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Members ({(org.members || []).length})</p>
            {(org.members || []).length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-3">No members yet</p>
            ) : (
              <div className="space-y-1.5">
                {(org.members || []).map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/30">
                    <Avatar name={m.full_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-200">{m.full_name || 'Unknown'}</span>
                      <span className="text-xs text-zinc-500 ml-2">{m.email}</span>
                    </div>
                    <Badge color={roleBadge(m.org_role || m.role)} className="capitalize text-xs">{m.org_role || m.role}</Badge>
                    <span className="text-xs text-zinc-600">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Pending Invitations ({pendingInvites.length})</p>
              <div className="space-y-1.5">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/20 opacity-70">
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"><Mail className="w-3 h-3 text-zinc-400" /></div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-300">{inv.email}</span>
                      <span className="text-xs text-zinc-500 ml-2">sent {inv.sent_at}</span>
                    </div>
                    <Badge color="yellow" className="text-xs capitalize">{inv.org_role || inv.role}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

function SuperAdminOrgsTab() {
  const { orgs, _allOrgsLoaded, createOrg, updateOrg, deleteOrg, toggleOrgStatus } = useOrgStore()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailOrg, setDetailOrg] = useState(null)

  // Exclude demo orgs — they live in the Demo Sandbox tab
  const productionOrgs = orgs.filter((o) => !o.is_demo)

  const filtered = productionOrgs.filter((o) => {
    const matchSearch = (o.name || '').toLowerCase().includes(search.toLowerCase()) || (o.slug || '').toLowerCase().includes(search.toLowerCase())
    const matchPlan = planFilter === 'all' || o.plan === planFilter
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchPlan && matchStatus
  })

  const totalAthletes = productionOrgs.reduce((s, o) => s + (o.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length, 0)
  const totalStaff = productionOrgs.reduce((s, o) => s + (o.members || []).filter((m) => (m.org_role || m.role) !== 'athlete').length, 0)
  const activeOrgs = productionOrgs.filter((o) => o.status === 'active').length
  const demoCount = orgs.filter((o) => o.is_demo).length

  return (
    <div className="space-y-5">
      {demoCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-lg text-xs text-amber-400">
          <EyeOff className="w-3.5 h-3.5 flex-shrink-0" />
          {demoCount} demo org{demoCount !== 1 ? 's' : ''} hidden — view them in the <strong>Demo Sandbox</strong> tab.
        </div>
      )}
      {!_allOrgsLoaded && orgs.length === 0 && (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading organizations…
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Production Orgs" value={productionOrgs.length} sub={`${demoCount} demo (hidden)`} icon={Building2} color="purple" />
        <StatCard label="Active Orgs" value={activeOrgs} icon={CheckCircle2} color="green" />
        <StatCard label="Total Athletes" value={totalAthletes} icon={Users} color="blue" />
        <StatCard label="Total Staff" value={totalStaff} icon={Shield} color="yellow" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
          <option value="all">All plans</option>
          {Object.entries(PLAN_META).map(([key, m]) => <option key={key} value={key}>{m.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="w-3.5 h-3.5" /> New Org
        </Button>
      </div>

      <div className="space-y-3">
        {_allOrgsLoaded && filtered.length === 0 && (
          <Card>
            <CardBody className="py-10 text-center text-zinc-500">
              <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">{search ? 'No organizations match your search' : 'No organizations yet'}</p>
            </CardBody>
          </Card>
        )}
        {filtered.map((org) => {
          const athletes = (org.members || []).filter((m) => (m.org_role || m.role) === 'athlete').length
          const staff = (org.members || []).filter((m) => (m.org_role || m.role) !== 'athlete').length
          const pendingInvites = (org.invitations || []).filter((i) => i.status === 'pending').length
          const planInfo = PLAN_META[org.plan] || PLAN_META.starter
          const athletePct = Math.round((athletes / (org.athlete_limit || 10)) * 100)

          return (
            <Card key={org.id} className={`transition-all cursor-pointer ${org.status === 'suspended' ? 'border-red-500/20 opacity-80' : 'hover:border-zinc-600'}`} onClick={() => setDetailOrg(org)}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-700/80 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
                    <Badge color={planInfo.color}>{planInfo.label}</Badge>
                    <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label || org.status}</Badge>
                    {org.is_demo && <Badge color="default" className="text-xs">Demo</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">/{org.slug} · {org.federation || 'No federation'} · {org.address || 'No location'}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{athletes} athletes</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{staff} staff</span>
                    {pendingInvites > 0 && <span className="flex items-center gap-1 text-yellow-400"><Mail className="w-3 h-3" />{pendingInvites} pending</span>}
                    {athletePct >= 80 && <span className="flex items-center gap-1 text-orange-400"><Zap className="w-3 h-3" />{athletePct}% full</span>}
                    <span className="text-zinc-600">Created {org.created_at ? new Date(org.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                  {/* Mini athlete capacity bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-24 h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${athletePct >= 90 ? 'bg-red-500' : athletePct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(athletePct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-zinc-600">{athletes}/{org.athlete_limit || 10} capacity</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setDetailOrg(org)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors" title="View details">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditTarget(org)} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit org">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleOrgStatus(org.id)}
                    className={`p-1.5 rounded-lg transition-colors ${org.status === 'active' ? 'text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10' : 'text-zinc-500 hover:text-green-400 hover:bg-green-500/10'}`}
                    title={org.status === 'active' ? 'Suspend org' : 'Reactivate org'}
                  >
                    {org.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <OrgFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={(data) => { createOrg(data); setCreateOpen(false) }} />
      {editTarget && (
        <OrgFormModal open={!!editTarget} onClose={() => setEditTarget(null)} initial={editTarget} onSave={(data) => { updateOrg(editTarget.id, data); setEditTarget(null) }} />
      )}
      {detailOrg && (
        <OrgDetailModal
          org={detailOrg}
          onClose={() => setDetailOrg(null)}
          onEdit={() => { setEditTarget(detailOrg); setDetailOrg(null) }}
          onToggleStatus={() => toggleOrgStatus(detailOrg.id)}
          onDelete={() => deleteOrg(detailOrg.id)}
        />
      )}
    </div>
  )
}

// ─── Org Form Modal ───────────────────────────────────────────────────────────
function OrgFormModal({ open, onClose, initial = null, onSave }) {
  const blank = { name: '', federation: '', timezone: 'America/New_York', weight_unit: 'lbs', plan: 'starter', address: '' }
  const [form, setForm] = useState(initial ? { name: initial.name, federation: initial.federation || '', timezone: initial.timezone || 'America/New_York', weight_unit: initial.weight_unit || 'lbs', plan: initial.plan || 'starter', address: initial.address || '' } : blank)
  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: v }))

  function handleSave() {
    if (!form.name.trim()) return
    onSave(form)
    if (!initial) setForm(blank)
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Organization' : 'Create Organization'} size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Organization Name *</label>
          <input value={form.name} onChange={(e) => f('name')(e.target.value)} placeholder="e.g. Ironside Barbell Club" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Federation</label>
            <input value={form.federation} onChange={(e) => f('federation')(e.target.value)} placeholder="USAPL, IPF, RPS…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address / City</label>
            <input value={form.address} onChange={(e) => f('address')(e.target.value)} placeholder="City, State" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plan</label>
            <select value={form.plan} onChange={(e) => f('plan')(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              {Object.entries(PLAN_META).map(([key, meta]) => <option key={key} value={key}>{meta.label} — {meta.price}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weight Unit</label>
            <select value={form.weight_unit} onChange={(e) => f('weight_unit')(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Timezone</label>
          <select value={form.timezone} onChange={(e) => f('timezone')(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
            {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney'].map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
        {PLAN_META[form.plan] && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
            {[{ label: 'Athletes', value: PLAN_META[form.plan].athletes }, { label: 'Staff', value: PLAN_META[form.plan].staff }, { label: 'Storage', value: PLAN_META[form.plan].storage }].map((item) => (
              <div key={item.label}>
                <p className="text-sm font-bold text-zinc-200">{item.value}</p>
                <p className="text-xs text-zinc-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!form.name.trim()}>{initial ? 'Save Changes' : 'Create Organization'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Head Coach: Overview (interconnected data) ───────────────────────────────
function OverviewTab() {
  const { profile, activeOrgId, isDemo } = useAuthStore()
  const { orgs } = useOrgStore()
  const { goals } = useGoalsStore()
  const { blocks } = useTrainingStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const athletes = org ? org.members.filter((m) => m.role === 'athlete') : []
  const staff = org ? org.members.filter((m) => m.role !== 'athlete') : []
  const completedGoals = goals.filter((g) => g.completed).length
  const activeBlocks = blocks.filter((b) => b.status === 'active').length
  const mockAthletes = isDemo ? MOCK_ATHLETES : []
  const flaggedAthletes = mockAthletes.filter((a) => a.flags?.length > 0).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Athletes" value={athletes.length || 24} trend="+3 this month" trendUp icon={Users} color="purple" />
        <StatCard label="Active Staff" value={staff.length || 4} icon={Shield} color="blue" />
        <StatCard label="Goals Completed" value={`${completedGoals}/${goals.length}`} icon={Target} color="green" />
        <StatCard label="Pain Flags" value={flaggedAthletes} icon={AlertTriangle} color="yellow" />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-purple-400" /> Training</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[['Active blocks', activeBlocks], ['Avg adherence', '87%'], ['Sessions this week', 42], ['Avg RPE', '7.8']].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{k}</span>
                <span className="text-sm font-semibold text-zinc-200">{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-green-400" /> Nutrition</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[['Avg compliance', '84%'], ['Plans active', athletes.length || 24], ['Shopping budgets set', 18], ['Custom recipes', 6]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{k}</span>
                <span className="text-sm font-semibold text-zinc-200">{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Wellness</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {[['Avg sleep', '7.2h'], ['Check-in rate', '91%'], ['Pain flags open', flaggedAthletes], ['Avg stress', '4.8 / 10']].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{k}</span>
                <span className={`text-sm font-semibold ${k === 'Pain flags open' && flaggedAthletes > 0 ? 'text-red-400' : 'text-zinc-200'}`}>{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {org && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardSubtitle>Live feed — workouts, nutrition, check-ins, and invites</CardSubtitle>
          </CardHeader>
          <CardBody>
            {(org.activity_log || []).map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${activityDot(item.type)}`} />
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">{item.text}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {org && (
        <Card>
          <CardHeader><CardTitle>Plan & Usage</CardTitle></CardHeader>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-zinc-400">Current Plan</span>
              <Badge color={PLAN_META[org.plan]?.color || 'default'}>{PLAN_META[org.plan]?.label || org.plan}</Badge>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Athletes', used: athletes.length || 24, limit: org.athlete_limit },
                { label: 'Staff Seats', used: staff.length || 4, limit: org.staff_limit },
                { label: 'Storage', used: org.storage_gb_used, limit: org.storage_gb_limit, suffix: 'GB' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400">{item.label}</span>
                    <span className="text-xs text-zinc-300">{item.used}{item.suffix || ''} / {item.limit}{item.suffix || ''}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 font-medium mt-4">Upgrade Plan →</button>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ─── Head Coach: Team Members ─────────────────────────────────────────────────
// ── Join Requests Panel ───────────────────────────────────────────────────────

function JoinRequestsPanel({ orgId, onApproved }) {
  const { isDemo } = useAuthStore()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null) // requestId being processed

  const ROLE_LABELS = {
    head_coach: 'Head Coach', coach: 'Coach',
    nutritionist: 'Nutritionist', athlete: 'Athlete',
  }

  const load = async () => {
    setLoading(true)
    const data = await fetchOrgJoinRequests(orgId)
    setRequests(data)
    setLoading(false)
  }

  useEffect(() => { if (orgId && !isDemo) load() }, [orgId])

  const handleApprove = async (req) => {
    setBusy(req.id)
    const ok = await approveJoinRequest(req.id)
    if (ok) {
      toast.success(`${req.profiles?.full_name || 'User'} approved and added to org.`)
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
      onApproved?.()
    } else {
      toast.error('Failed to approve request.')
    }
    setBusy(null)
  }

  const handleDeny = async (req) => {
    setBusy(req.id)
    const ok = await denyJoinRequest(req.id)
    if (ok) {
      toast.success('Request denied.')
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
    } else {
      toast.error('Failed to deny request.')
    }
    setBusy(null)
  }

  if (isDemo) return null

  return (
    <div className="border-t border-zinc-800 pt-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-300">Join Requests</p>
          {requests.length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Clock className="w-4 h-4 text-zinc-600 animate-pulse" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-xs text-zinc-600 text-center py-4">No pending requests</p>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <Card key={req.id} className="p-0 border-yellow-500/20 bg-yellow-500/5">
              <div className="flex items-start gap-3 p-3">
                <Avatar name={req.profiles?.full_name || '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">
                      {req.profiles?.full_name || 'Unknown'}
                    </span>
                    <Badge color="yellow" className="capitalize text-xs">
                      {ROLE_LABELS[req.requested_role] || req.requested_role}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{req.profiles?.email}</p>
                  {req.message && (
                    <p className="text-xs text-zinc-400 mt-1 italic">"{req.message}"</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleApprove(req)}
                    disabled={busy === req.id}
                    className="p-1.5 text-zinc-500 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    {busy === req.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDeny(req)}
                    disabled={busy === req.id}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Deny"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamTab({ onInvite }) {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, updateMemberRole, removeMember, loadOrgMembers } = useOrgStore()
  const orgId = activeOrgId || profile?.org_id
  const org = orgs.find((o) => o.id === orgId)
  const members = org?.members || []
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editRole, setEditRole] = useState(null)
  // Use org_role as the canonical field (Supabase); fall back to role (mock data)
  const staff = members.filter((m) => (m.org_role || m.role) !== 'athlete')
  const athletes = members.filter((m) => (m.org_role || m.role) === 'athlete')

  // Load real members from Supabase on mount
  useEffect(() => {
    if (orgId) loadOrgMembers(orgId)
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRoleChange(userId, newRole) {
    updateMemberRole(orgId, userId, newRole)
    setEditRole(null)
  }
  function handleRemove(userId) {
    removeMember(orgId, userId)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-300">Staff ({staff.length})</p>
          <button onClick={onInvite} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Invite staff</button>
        </div>
        <div className="space-y-2">
          {staff.map((member) => (
            <MemberRow key={member.user_id} member={member} isMe={member.user_id === profile?.id}
              editRole={editRole?.userId === member.user_id ? editRole : null}
              onEditRole={() => setEditRole({ userId: member.user_id, currentRole: member.role })}
              onRoleChange={(role) => handleRoleChange(member.user_id, role)}
              onCancelEdit={() => setEditRole(null)}
              confirmDelete={confirmDelete?.userId === member.user_id ? confirmDelete : null}
              onDelete={() => setConfirmDelete({ userId: member.user_id, name: member.full_name })}
              onConfirmDelete={() => handleRemove(member.user_id)}
              onCancelDelete={() => setConfirmDelete(null)}
            />
          ))}
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-zinc-300">Athletes ({athletes.length})</p>
          <button onClick={onInvite} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><UserPlus className="w-3 h-3" /> Invite athlete</button>
        </div>
        <div className="space-y-2">
          {athletes.map((member) => (
            <MemberRow key={member.user_id} member={member} isMe={member.user_id === profile?.id}
              editRole={editRole?.userId === member.user_id ? editRole : null}
              onEditRole={() => setEditRole({ userId: member.user_id, currentRole: member.role })}
              onRoleChange={(role) => handleRoleChange(member.user_id, role)}
              onCancelEdit={() => setEditRole(null)}
              confirmDelete={confirmDelete?.userId === member.user_id ? confirmDelete : null}
              onDelete={() => setConfirmDelete({ userId: member.user_id, name: member.full_name })}
              onConfirmDelete={() => handleRemove(member.user_id)}
              onCancelDelete={() => setConfirmDelete(null)}
            />
          ))}
        </div>
      </div>
      <button onClick={onInvite} className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-sm text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
        <PlusCircle className="w-4 h-4" /> Invite New Member
      </button>

      {/* Join Requests — only shown to head coaches / owners */}
      <JoinRequestsPanel orgId={activeOrgId || profile?.org_id} onApproved={() => {}} />
    </div>
  )
}

function MemberRow({ member, isMe, editRole, onEditRole, onRoleChange, onCancelEdit, confirmDelete, onDelete, onConfirmDelete, onCancelDelete }) {
  return (
    <Card className="hover:border-zinc-600 transition-all p-0">
      <div className="flex items-center gap-3 p-3">
        <Avatar name={member.full_name} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-100">{member.full_name}</span>
            {isMe && <span className="text-xs text-zinc-500">(you)</span>}
            {editRole ? (
              <div className="flex items-center gap-1">
                <select defaultValue={member.role} onChange={(e) => onRoleChange(e.target.value)} className="bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none">
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
                <button onClick={onCancelEdit} className="p-0.5 text-zinc-500 hover:text-zinc-200"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <Badge color={roleBadge(member.role)} className="capitalize">{member.role}</Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {member.email}
            {member.athlete_count != null && member.athlete_count > 0 && ` · ${member.athlete_count} athletes`}
            {member.joined_at && ` · Joined ${member.joined_at}`}
          </p>
        </div>
        {!isMe && (
          <div className="flex items-center gap-1">
            <button onClick={onEditRole} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Change role"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remove member"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      {confirmDelete && (
        <div className="mx-3 mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
          <p className="text-xs text-red-300 flex-1">Remove <strong>{confirmDelete.name}</strong> from this org?</p>
          <button onClick={onCancelDelete} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-0.5">No</button>
          <button onClick={onConfirmDelete} className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-0.5">Remove</button>
        </div>
      )}
    </Card>
  )
}

// ─── Head Coach: Invitations ──────────────────────────────────────────────────
function InvitationsTab() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, cancelInvite, resendInvite, acceptInvite } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const invitations = org?.invitations || []
  const [resent, setResent] = useState({})
  const [inviteOpen, setInviteOpen] = useState(false)

  function handleResend(invId) {
    resendInvite(profile.org_id, invId)
    setResent((p) => ({ ...p, [invId]: true }))
    setTimeout(() => setResent((p) => ({ ...p, [invId]: false })), 2000)
  }

  function handleAccept(invId) {
    const inv = invitations.find((i) => i.id === invId)
    if (inv) acceptInvite(profile.org_id, invId, { full_name: inv.email.split('@')[0] })
  }

  const pending = invitations.filter((i) => i.status === 'pending')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Pending Invitations</p>
          <p className="text-xs text-zinc-500 mt-0.5">Resend, accept (demo simulate), or cancel outgoing invites</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus className="w-3.5 h-3.5" /> Invite</Button>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-700 rounded-xl">
          <Mail className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No pending invitations</p>
          <button onClick={() => setInviteOpen(true)} className="mt-2 text-xs text-purple-400 hover:text-purple-300">Send an invitation →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((inv) => (
            <Card key={inv.id} className="hover:border-zinc-600 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-zinc-700/80 flex items-center justify-center flex-shrink-0"><Mail className="w-4 h-4 text-zinc-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">{inv.email}</span>
                    <Badge color={roleBadge(inv.role)} className="capitalize">{inv.role}</Badge>
                    <Badge color="yellow">Pending</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Invited {inv.sent_at}{inv.message ? ` · "${inv.message}"` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleResend(inv.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${resent[inv.id] ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600'}`}
                  >
                    {resent[inv.id] ? <Check className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                    {resent[inv.id] ? 'Sent!' : 'Resend'}
                  </button>
                  <button
                    onClick={() => handleAccept(inv.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Accept (demo)
                  </button>
                  <button onClick={() => cancelInvite(profile.org_id, inv.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Cancel invitation">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} orgId={profile?.org_id} />
    </div>
  )
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteModal({ open, onClose, orgId }) {
  const { inviteMember } = useOrgStore()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('athlete')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!email.trim() || !orgId) return
    setLoading(true)
    await inviteMember(orgId, { email: email.trim(), org_role: role, message })
    setLoading(false)
    setSent(true)
    setTimeout(() => { setSent(false); setEmail(''); setRole('athlete'); setMessage(''); onClose() }, 1400)
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite Team Member" size="sm">
      <div className="p-6 space-y-4">
        {sent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6 text-green-400" /></div>
            <p className="text-sm font-semibold text-zinc-200">Invitation sent!</p>
            <p className="text-xs text-zinc-500 mt-1">{email}</p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Role *</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                <option value="athlete">Athlete</option>
                <option value="coach">Coach</option>
                <option value="nutritionist">Nutritionist</option>
                <option value="admin">Admin (Head Coach)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                {role === 'admin' && 'Admin role gives full org access — use carefully.'}
                {role === 'coach' && 'Coaches can manage programs, view all athletes, and send messages.'}
                {role === 'nutritionist' && 'Nutritionists can edit nutrition plans and view athlete data.'}
                {role === 'athlete' && 'Athletes can log workouts, view their plan, and message staff.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Personal Message <span className="text-zinc-600">(optional)</span></label>
              <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Welcome to the team…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleSend} disabled={!email.trim() || loading}>
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {loading ? 'Sending…' : 'Send Invitation'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Roles & Permissions Tab ──────────────────────────────────────────────────
function RolesTab({ isSuperAdmin }) {
  const { profile, activeOrgId } = useAuthStore()
  const isHeadCoach = profile?.role === 'admin'
  const orgs = useOrgStore(s => s.orgs)
  const org = orgs.find(o => o.id === (activeOrgId || profile?.org_id)) ?? orgs[0]
  const members = org?.members ?? []

  const cols = isSuperAdmin
    ? ['Permission', 'Platform Admin', 'Org Admin', 'Coach', 'Nutritionist', 'Athlete']
    : ['Permission', 'Admin', 'Coach', 'Nutritionist', 'Athlete']
  const roleKeys = isSuperAdmin
    ? ['super_admin', 'admin', 'coach', 'nutritionist', 'athlete']
    : ['admin', 'coach', 'nutritionist', 'athlete']

  // ── Per-member overrides state ──
  const PERM_KEYS = [
    { key: 'can_view_nutrition',    label: 'View Nutrition' },
    { key: 'can_edit_nutrition',    label: 'Edit Nutrition' },
    { key: 'can_view_workouts',     label: 'View Workouts' },
    { key: 'can_edit_workouts',     label: 'Edit Workouts' },
    { key: 'can_view_checkins',     label: 'View Check-ins' },
    { key: 'can_create_meal_prep',  label: 'Meal Prep' },
    { key: 'can_assign_meal_prep',  label: 'Assign Prep' },
  ]

  const defaultPerms = (orgRole) => ({
    can_view_nutrition:   ['admin','coach','nutritionist'].includes(orgRole),
    can_edit_nutrition:   ['admin','nutritionist'].includes(orgRole),
    can_view_workouts:    ['admin','coach','nutritionist','athlete'].includes(orgRole),
    can_edit_workouts:    ['admin','coach'].includes(orgRole),
    can_view_checkins:    ['admin','coach','nutritionist'].includes(orgRole),
    can_create_meal_prep: ['admin','nutritionist'].includes(orgRole),
    can_assign_meal_prep: ['admin','nutritionist'].includes(orgRole),
  })

  const [memberPerms, setMemberPerms] = useState(() =>
    Object.fromEntries(members.map(m => [m.user_id, defaultPerms(m.org_role)]))
  )
  const [memberRoles, setMemberRoles] = useState(() =>
    Object.fromEntries(members.map(m => [m.user_id, m.org_role]))
  )
  const [savedMembers, setSavedMembers] = useState({})
  const [upgradeModal, setUpgradeModal] = useState(null) // { member, newRole }

  const togglePerm = (userId, key) =>
    setMemberPerms(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: !prev[userId]?.[key] },
    }))

  const changeRole = (userId, newRole, member) => {
    const currentRole = memberRoles[userId]
    const isPromotion = ['coach','nutritionist','admin'].includes(newRole) && currentRole === 'athlete'
    if (isPromotion) {
      setUpgradeModal({ member, newRole })
    } else {
      applyRoleChange(userId, newRole)
    }
  }

  const applyRoleChange = (userId, newRole) => {
    setMemberRoles(prev => ({ ...prev, [userId]: newRole }))
    setMemberPerms(prev => ({ ...prev, [userId]: defaultPerms(newRole) }))
    setUpgradeModal(null)
  }

  const savePerms = (userId) => {
    setSavedMembers(prev => ({ ...prev, [userId]: true }))
    setTimeout(() => setSavedMembers(prev => ({ ...prev, [userId]: false })), 2000)
  }

  return (
    <div className="space-y-6">
      {/* ── Role permission matrix (read-only reference) ── */}
      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-2">
          <CardTitle>Role Permission Matrix</CardTitle>
          <CardSubtitle>Default capabilities assigned to each role</CardSubtitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {cols.map((c, i) => <th key={c} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 ${i === 0 ? 'text-left' : 'text-center'}`}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row, i) => (
                <tr key={row.permission} className={`border-b border-zinc-800 last:border-0 ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}>
                  <td className="px-4 py-2.5 text-sm text-zinc-300">{row.permission}</td>
                  {roleKeys.map((r) => (
                    <td key={r} className="px-4 py-2.5 text-center">
                      {row[r] ? <span className="text-green-400 text-base">✓</span> : <span className="text-zinc-700 text-base">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Per-member permissions (head coach only) ── */}
      {(isHeadCoach || isSuperAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />Member Permissions
            </CardTitle>
            <CardSubtitle>Override individual permissions or change roles for any member</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {members.map(member => {
              const role = memberRoles[member.user_id] ?? member.org_role
              const perms = memberPerms[member.user_id] ?? defaultPerms(role)
              const isSelf = member.user_id === profile?.id
              const saved = savedMembers[member.user_id]

              return (
                <div key={member.user_id} className="p-4 bg-zinc-800/30 border border-zinc-700/40 rounded-2xl space-y-3">
                  {/* Member header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.full_name} size="sm" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-100">{member.full_name}</p>
                        <p className="text-xs text-zinc-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Role selector */}
                      <select
                        value={role}
                        disabled={isSelf}
                        onChange={e => changeRole(member.user_id, e.target.value, member)}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="athlete">Athlete</option>
                        <option value="coach">Coach</option>
                        <option value="nutritionist">Nutritionist</option>
                        <option value="admin">Admin</option>
                      </select>
                      {/* Save button */}
                      <Button size="xs" variant={saved ? 'outline' : 'primary'} onClick={() => savePerms(member.user_id)} disabled={isSelf}>
                        {saved ? <><Check className="w-3 h-3 text-green-400" /> Saved</> : 'Save'}
                      </Button>
                    </div>
                  </div>

                  {/* Permission toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {PERM_KEYS.map(({ key, label }) => {
                      const on = perms[key] ?? false
                      return (
                        <button
                          key={key}
                          disabled={isSelf}
                          onClick={() => togglePerm(member.user_id, key)}
                          className={cn(
                            'flex items-center gap-2 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all text-left',
                            on
                              ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                              : 'bg-zinc-800/40 border-zinc-700/30 text-zinc-500 hover:border-zinc-600',
                            isSelf && 'opacity-40 cursor-not-allowed'
                          )}
                        >
                          {on
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                            : <X className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                          }
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  {member.is_self_athlete && (
                    <p className="text-xs text-teal-400/70 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" />This staff member also trains — they can toggle "View as Athlete" in the sidebar.
                    </p>
                  )}
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      {/* ── Role upgrade confirmation modal ── */}
      {upgradeModal && (
        <Modal title="Promote Member" onClose={() => setUpgradeModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              You're about to promote{' '}
              <span className="font-semibold text-zinc-100">{upgradeModal.member.full_name}</span>{' '}
              from <span className="text-yellow-400 font-medium">Athlete</span> to{' '}
              <span className="text-purple-300 font-medium capitalize">{upgradeModal.newRole}</span>.
            </p>
            <div className="p-3 bg-zinc-800/60 border border-zinc-700/40 rounded-xl text-xs text-zinc-400 space-y-1">
              <p>• Their personal data and history will be preserved.</p>
              <p>• They will gain access to staff views and athlete management tools.</p>
              <p>• They can still be assigned as an athlete in any org they belong to.</p>
              <p>• This change only applies to your organization.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setUpgradeModal(null)}>Cancel</Button>
              <Button size="sm" onClick={() => applyRoleChange(upgradeModal.member.user_id, upgradeModal.newRole)}>
                Confirm Promotion
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Public Page Editor (Head Coach) ─────────────────────────────────────────
export function PublicPageTab() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, updatePublicPage, addPageSection, updatePageSection, deletePageSection, loadOrgWebsite, subscribeLeads } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const page = org?.public_page || {}
  const slug = org?.slug || ''

  const [activeView, setActiveView] = useState('settings') // 'settings' | 'sections' | 'intake' | 'preview_link'
  const [saved, setSaved] = useState(false)

  // Load website data from Supabase on mount / org change
  useEffect(() => {
    if (org?.id) {
      loadOrgWebsite(org.id)
      // Subscribe to realtime new leads
      const unsub = subscribeLeads(org.id)
      return unsub
    }
  }, [org?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Hero / settings form — re-sync when page data loads
  const [heroForm, setHeroForm] = useState({
    hero_headline:    page.hero_headline    || '',
    hero_subheadline: page.hero_subheadline || '',
    hero_cta:         page.hero_cta         || 'Apply to Join',
    accent_color:     page.accent_color     || '#a855f7',
    custom_url:       page.custom_url       || '',
  })

  // Keep heroForm in sync when org/page data loads from Supabase
  useEffect(() => {
    setHeroForm({
      hero_headline:    page.hero_headline    || '',
      hero_subheadline: page.hero_subheadline || '',
      hero_cta:         page.hero_cta         || 'Apply to Join',
      accent_color:     page.accent_color     || '#a855f7',
      custom_url:       page.custom_url       || '',
    })
  }, [page.hero_headline, page.hero_subheadline, page.hero_cta, page.accent_color, page.custom_url]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveHero() {
    if (!org) return
    updatePublicPage(org.id, heroForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function togglePublished() {
    if (!org) return
    updatePublicPage(org.id, { published: !page.published })
  }

  const internalUrl = `/org/${slug}`
  // Build the full absolute URL, respecting Vite's BASE_URL (e.g. /Powerplus/)
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const internalFullUrl = window.location.origin + base + internalUrl
  const publicUrl = (page.custom_url || heroForm.custom_url)
    ? (page.custom_url || heroForm.custom_url)
    : internalFullUrl
  const previewUrl = internalFullUrl

  const SECTION_TYPES = [
    { type: 'about',        label: 'About',         icon: FileText },
    { type: 'coaches',      label: 'Meet the Staff', icon: Users },
    { type: 'highlights',   label: 'What You Get',  icon: CheckSquare },
    { type: 'testimonials', label: 'Testimonials',  icon: MessageSquare },
    { type: 'faq',          label: 'FAQ',           icon: HelpCircle },
    { type: 'custom',       label: 'Custom Text',   icon: Edit2 },
  ]

  const sections = (page.sections || []).sort((a, b) => a.order - b.order)
  const hasIntake = sections.some((s) => s.type === 'intake')

  return (
    <div className="space-y-5">
      {/* Top bar — published toggle + link */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${page.published ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${page.published ? 'bg-green-400' : 'bg-zinc-600'}`} />
                {page.published ? 'Published' : 'Draft'}
              </div>
              {page.published && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors truncate max-w-xs"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {publicUrl}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(publicUrl)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" /> Copy Link
              </button>
              <Button size="sm" variant={page.published ? 'ghost' : 'primary'} onClick={togglePublished}>
                {page.published
                  ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</>
                  : <><Eye className="w-3.5 h-3.5" /> Publish Page</>}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {[
          { id: 'settings', label: 'Hero & Branding' },
          { id: 'sections', label: 'Sections' },
          { id: 'intake',   label: 'Intake Form' },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeView === v.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Hero & branding */}
      {activeView === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Hero & Branding</CardTitle>
            <CardSubtitle>The first thing visitors see at the top of your public page</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {[
              { label: 'Headline',    key: 'hero_headline',    placeholder: 'Train with Iron North Athletics' },
              { label: 'Sub-headline', key: 'hero_subheadline', placeholder: 'Elite powerlifting coaching for serious athletes' },
              { label: 'CTA Button',  key: 'hero_cta',         placeholder: 'Apply to Join' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
                <input
                  value={heroForm[f.key]}
                  onChange={(e) => setHeroForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={heroForm.accent_color}
                  onChange={(e) => setHeroForm((p) => ({ ...p, accent_color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  value={heroForm.accent_color}
                  onChange={(e) => setHeroForm((p) => ({ ...p, accent_color: e.target.value }))}
                  className="w-32 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                {/* Quick presets */}
                <div className="flex gap-2">
                  {['#a855f7', '#3b82f6', '#22c55e', '#f97316', '#ef4444', '#ec4899'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setHeroForm((p) => ({ ...p, accent_color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
                      style={{ backgroundColor: c, borderColor: heroForm.accent_color === c ? '#fff' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <Button size="sm" onClick={saveHero}>
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Changes'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Custom Domain card */}
      {activeView === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
            <CardSubtitle>Use your own domain (e.g. ironnothathletics.com) so your public page lives there instead of the Powerplus URL.</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-5">
            {/* Input */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Your Domain</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                  <input
                    value={heroForm.custom_url}
                    onChange={(e) => setHeroForm((p) => ({ ...p, custom_url: e.target.value }))}
                    placeholder="ironnorthathletics.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  />
                </div>
                {heroForm.custom_url && (
                  <a
                    href={`https://${heroForm.custom_url.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-purple-400 hover:text-purple-300 bg-zinc-800 border border-zinc-700 rounded-xl transition-colors whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Test
                  </a>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {heroForm.custom_url
                  ? <><span className="text-green-400">✓</span> Save this, then follow the DNS steps below to activate it.</>
                  : <>Default URL: <span className="font-mono text-zinc-400">{window.location.origin}{internalUrl}</span></>
                }
              </p>
            </div>

            {/* How it works explanation */}
            <div className="bg-zinc-800/50 border border-zinc-700/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-400 text-[10px] font-bold">?</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200 mb-1">How does this work?</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Your public page is hosted on GitHub Pages. To make it appear at your own domain, you point your domain's DNS to GitHub Pages and tell GitHub which domain to use. Visitors to <span className="text-zinc-300 font-mono">{heroForm.custom_url || 'your-domain.com'}</span> will see your Powerplus page — no "github.io" in the URL.
                  </p>
                </div>
              </div>
            </div>

            {/* Step-by-step DNS instructions */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Setup — 3 steps</p>

              {/* Step 1 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-0.5">1</div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-medium text-zinc-300">Add DNS records at your registrar</p>
                  <p className="text-xs text-zinc-500">Log into GoDaddy / Namecheap / Cloudflare / wherever you bought the domain. Add these records:</p>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden text-xs font-mono">
                    <div className="px-3 py-2 border-b border-zinc-700 grid grid-cols-3 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <span>Type</span><span>Name</span><span>Value</span>
                    </div>
                    {/* For apex/root domain */}
                    <div className="px-3 py-2 border-b border-zinc-800 grid grid-cols-3 text-zinc-300 gap-1">
                      <span className="text-blue-400">A</span>
                      <span>@</span>
                      <span className="text-zinc-400 text-[10px]">185.199.108.153</span>
                    </div>
                    <div className="px-3 py-2 border-b border-zinc-800 grid grid-cols-3 text-zinc-300 gap-1">
                      <span className="text-blue-400">A</span>
                      <span>@</span>
                      <span className="text-zinc-400 text-[10px]">185.199.109.153</span>
                    </div>
                    <div className="px-3 py-2 border-b border-zinc-800 grid grid-cols-3 text-zinc-300 gap-1">
                      <span className="text-blue-400">A</span>
                      <span>@</span>
                      <span className="text-zinc-400 text-[10px]">185.199.110.153</span>
                    </div>
                    <div className="px-3 py-2 border-b border-zinc-800 grid grid-cols-3 text-zinc-300 gap-1">
                      <span className="text-blue-400">A</span>
                      <span>@</span>
                      <span className="text-zinc-400 text-[10px]">185.199.111.153</span>
                    </div>
                    {/* www subdomain */}
                    <div className="px-3 py-2 grid grid-cols-3 text-zinc-300 gap-1">
                      <span className="text-green-400">CNAME</span>
                      <span>www</span>
                      <span className="text-zinc-400 text-[10px]">gerbriel.github.io</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600">The 4 A records point your root domain to GitHub's servers. The CNAME handles www.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-0.5">2</div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Set your custom domain in GitHub repository settings</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Go to <span className="text-zinc-300 font-mono">github.com/gerbriel/Powerplus</span> → Settings → Pages → "Custom domain" → enter your domain → Save. GitHub will verify DNS and issue a free SSL certificate (takes ~10 min).
                  </p>
                  <a
                    href="https://github.com/gerbriel/Powerplus/settings/pages"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 bg-zinc-800 border border-zinc-700/60 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open GitHub Pages Settings
                  </a>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 mt-0.5">3</div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-medium text-zinc-300">Update the Vite base path (developer step)</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Once your domain is verified in GitHub, the app's <span className="text-zinc-300 font-mono">vite.config.js</span> base path needs to change from <span className="text-zinc-300 font-mono">'/Powerplus/'</span> to <span className="text-zinc-300 font-mono">'/'</span> — since your domain is now the root. Push the change and the deploy workflow re-builds automatically.
                  </p>
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs font-mono text-zinc-400 space-y-1">
                    <p className="text-zinc-600">{'// vite.config.js — change this line:'}</p>
                    <p><span className="text-red-400 line-through">base: '/Powerplus/'</span></p>
                    <p><span className="text-green-400">base: '/'</span></p>
                  </div>
                  <p className="text-[10px] text-zinc-600">After this change, all routes work at your-domain.com/ instead of gerbriel.github.io/Powerplus/</p>
                </div>
              </div>
            </div>

            <Button size="sm" onClick={saveHero}>
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Domain'}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Sections editor */}
      {activeView === 'sections' && (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Page Sections</CardTitle>
              <CardSubtitle>Add, reorder, edit, or hide sections on your public page</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {sections.map((sec, idx) => (
                <SectionEditorRow
                  key={sec.id}
                  section={sec}
                  idx={idx}
                  total={sections.length}
                  orgId={org.id}
                  sections={sections}
                  updatePageSection={updatePageSection}
                  deletePageSection={deletePageSection}
                />
              ))}
              {sections.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-6">No sections yet. Add one below.</p>
              )}
            </CardBody>
          </Card>

          {/* Add section */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Add a Section</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SECTION_TYPES.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => {
                      if (!org) return
                      addPageSection(org.id, {
                        type,
                        title: label,
                        body: '',
                        items: type === 'highlights' ? [''] : type === 'testimonials' ? [{ author: '', role: '', text: '' }] : type === 'faq' ? [{ q: '', a: '' }] : [],
                        order: sections.length + 1,
                      })
                    }}
                    className="flex items-center gap-2 p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-purple-500/50 hover:bg-zinc-700/30 transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{label}</span>
                  </button>
                ))}
                {!hasIntake && (
                  <button
                    onClick={() => {
                      if (!org) return
                      addPageSection(org.id, {
                        type: 'intake',
                        title: 'Apply to Join',
                        body: 'Fill out the form below and we\'ll be in touch within 48 hours.',
                        order: sections.length + 1,
                      })
                    }}
                    className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-all text-left"
                  >
                    <ClipboardList className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-purple-300">Intake Form</span>
                  </button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Intake form builder */}
      {activeView === 'intake' && org && (
        <IntakeFormBuilder org={org} page={page} />
      )}
    </div>
  )
}

// ─── Section editor row ───────────────────────────────────────────────────────
function SectionEditorRow({ section, idx, total, orgId, sections, updatePageSection, deletePageSection }) {
  const [expanded, setExpanded] = useState(false)
  const { reorderSections } = useOrgStore()
  const typeLabel = { about: 'About', coaches: 'Meet the Staff', highlights: 'What You Get', testimonials: 'Testimonials', faq: 'FAQ', custom: 'Custom', intake: 'Intake Form' }

  function move(dir) {
    const newSecs = [...sections]
    const target = idx + dir
    if (target < 0 || target >= newSecs.length) return
    ;[newSecs[idx], newSecs[target]] = [newSecs[target], newSecs[idx]]
    reorderSections(orgId, newSecs.map((s, i) => ({ ...s, order: i + 1 })))
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden', section.visible ? 'border-zinc-700' : 'border-zinc-800 opacity-60')}>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-800/30">
        <GripVertical className="w-4 h-4 text-zinc-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-zinc-200">{section.title}</span>
            <Badge color="default" className="text-xs">{typeLabel[section.type] || section.type}</Badge>
            {!section.visible && <Badge color="default" className="text-xs opacity-60">Hidden</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => move(-1)} disabled={idx === 0} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
          <button onClick={() => move(1)} disabled={idx === total - 1} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
          <button
            onClick={() => updatePageSection(orgId, section.id, { visible: !section.visible })}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deletePageSection(orgId, section.id)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-4 bg-zinc-900/50 border-t border-zinc-800 space-y-3">
          <SectionContentEditor section={section} orgId={orgId} updatePageSection={updatePageSection} />
        </div>
      )}
    </div>
  )
}

// ─── Per-section content editor ──────────────────────────────────────────────
function SectionContentEditor({ section, orgId, updatePageSection }) {
  const [local, setLocal] = useState({ title: section.title, body: section.body, items: JSON.parse(JSON.stringify(section.items || [])) })
  const [saved, setSaved] = useState(false)

  function save() {
    updatePageSection(orgId, section.id, local)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Section Title</label>
        <input
          value={local.title}
          onChange={(e) => setLocal((p) => ({ ...p, title: e.target.value }))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </div>

      {(section.type === 'about' || section.type === 'custom' || section.type === 'intake') && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Body Text</label>
          <textarea
            rows={4}
            value={local.body}
            onChange={(e) => setLocal((p) => ({ ...p, body: e.target.value }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
        </div>
      )}

      {section.type === 'highlights' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Bullet Points</label>
          <div className="space-y-2">
            {local.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const arr = [...local.items]
                    arr[i] = e.target.value
                    setLocal((p) => ({ ...p, items: arr }))
                  }}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
                <button onClick={() => setLocal((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setLocal((p) => ({ ...p, items: [...p.items, ''] }))} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>
        </div>
      )}

      {section.type === 'testimonials' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Testimonials</label>
          <div className="space-y-3">
            {local.items.map((t, i) => (
              <div key={i} className="p-3 bg-zinc-800/60 rounded-xl space-y-2 border border-zinc-700">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-zinc-500 font-medium">#{i + 1}</span>
                  <button onClick={() => setLocal((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} className="text-zinc-500 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                {[{ key: 'text', label: 'Quote', rows: 2 }, { key: 'author', label: 'Name' }, { key: 'role', label: 'Role / Weight Class' }].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-zinc-600">{f.label}</label>
                    {f.rows
                      ? <textarea rows={f.rows} value={t[f.key] || ''} onChange={(e) => { const arr = [...local.items]; arr[i] = { ...arr[i], [f.key]: e.target.value }; setLocal((p) => ({ ...p, items: arr })) }} className="w-full mt-0.5 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none resize-none" />
                      : <input value={t[f.key] || ''} onChange={(e) => { const arr = [...local.items]; arr[i] = { ...arr[i], [f.key]: e.target.value }; setLocal((p) => ({ ...p, items: arr })) }} className="w-full mt-0.5 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none" />}
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setLocal((p) => ({ ...p, items: [...p.items, { author: '', role: '', text: '' }] }))} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add testimonial
            </button>
          </div>
        </div>
      )}

      {section.type === 'faq' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-2">Questions</label>
          <div className="space-y-3">
            {local.items.map((item, i) => (
              <div key={i} className="p-3 bg-zinc-800/60 rounded-xl space-y-2 border border-zinc-700">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-zinc-500 font-medium">Q{i + 1}</span>
                  <button onClick={() => setLocal((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} className="text-zinc-500 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
                {[{ key: 'q', label: 'Question' }, { key: 'a', label: 'Answer', rows: 2 }].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs text-zinc-600">{f.label}</label>
                    {f.rows
                      ? <textarea rows={f.rows} value={item[f.key] || ''} onChange={(e) => { const arr = [...local.items]; arr[i] = { ...arr[i], [f.key]: e.target.value }; setLocal((p) => ({ ...p, items: arr })) }} className="w-full mt-0.5 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none resize-none" />
                      : <input value={item[f.key] || ''} onChange={(e) => { const arr = [...local.items]; arr[i] = { ...arr[i], [f.key]: e.target.value }; setLocal((p) => ({ ...p, items: arr })) }} className="w-full mt-0.5 bg-zinc-700 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none" />}
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setLocal((p) => ({ ...p, items: [...p.items, { q: '', a: '' }] }))} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add question
            </button>
          </div>
        </div>
      )}

      <Button size="sm" onClick={save}>{saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Section'}</Button>
    </div>
  )
}

// ─── Intake form builder ──────────────────────────────────────────────────────
function IntakeFormBuilder({ org, page }) {
  const { updateIntakeFields } = useOrgStore()
  const [fields, setFields] = useState(JSON.parse(JSON.stringify(page.intake_fields || [])))
  const [saved, setSaved] = useState(false)

  const FIELD_TYPES = [
    { type: 'text',     label: 'Short Text' },
    { type: 'email',    label: 'Email' },
    { type: 'textarea', label: 'Long Text' },
    { type: 'select',   label: 'Dropdown' },
  ]

  function updateField(id, updates) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f))
  }

  function removeField(id) {
    setFields((prev) => prev.filter((f) => f.id !== id))
  }

  function addField() {
    setFields((prev) => [...prev, { id: `f-${Date.now()}`, label: 'New Field', type: 'text', required: false, placeholder: '' }])
  }

  function save() {
    updateIntakeFields(org.id, fields)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intake Form Fields</CardTitle>
        <CardSubtitle>Configure what information you collect from potential athletes</CardSubtitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {fields.map((field, idx) => (
          <div key={field.id} className="p-3 bg-zinc-800/40 border border-zinc-700 rounded-xl space-y-2">
            <div className="flex items-start gap-2 justify-between">
              <div className="flex-1 grid sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Label</label>
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  >
                    {FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Placeholder</label>
                  <input
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>
              <button onClick={() => removeField(field.id)} className="mt-5 p-1.5 text-zinc-500 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {field.type === 'select' && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Options (one per line)</label>
                <textarea
                  rows={3}
                  value={(field.options || []).join('\n')}
                  onChange={(e) => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none resize-none font-mono"
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                className="rounded border-zinc-600"
              />
              <span className="text-xs text-zinc-400">Required</span>
            </label>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="ghost" onClick={addField}>
            <Plus className="w-3.5 h-3.5" /> Add Field
          </Button>
          <Button size="sm" onClick={save}>
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Form'}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Leads Tab (Head Coach) ───────────────────────────────────────────────────
const LEAD_STATUS_META = {
  new:        { label: 'New',        color: 'blue'  },
  contacted:  { label: 'Contacted',  color: 'yellow' },
  onboarded:  { label: 'Onboarded', color: 'green'  },
  declined:   { label: 'Declined',  color: 'red'    },
}

function fmtLeadDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

export function LeadsTab() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, updateLead, deleteLead, loadOrgWebsite, subscribeLeads } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const leads = org?.leads || []
  const staff = org?.members?.filter((m) => m.org_role !== 'athlete') || []

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [selectedLead, setSelected] = useState(null)

  // Load leads from Supabase on mount / org change
  useEffect(() => {
    if (org?.id) {
      loadOrgWebsite(org.id)
      const unsub = subscribeLeads(org.id)
      return unsub
    }
  }, [org?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .filter((l) => !q
        || (l.full_name || '').toLowerCase().includes(q)
        || (l.email || '').toLowerCase().includes(q)
        || (l.phone || '').toLowerCase().includes(q)
      )
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }, [leads, search, statusFilter])

  const counts = useMemo(() => {
    const c = { all: leads.length, new: 0, contacted: 0, onboarded: 0, declined: 0 }
    leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++ })
    return c
  }, [leads])

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads"   value={counts.all}       icon={Users}     color="purple" />
        <StatCard label="New"           value={counts.new}       icon={Clock}     color="blue"   />
        <StatCard label="Onboarded"     value={counts.onboarded} icon={UserCheck} color="green"  />
        <StatCard label="Declined"      value={counts.declined}  icon={UserX}     color="red"    />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {['all', 'new', 'contacted', 'onboarded', 'declined'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                statusFilter === s ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {s} {counts[s] > 0 && <span className="ml-0.5 opacity-60">({counts[s]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Assigned</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const sm = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new
                  const assignee = staff.find((m) => m.user_id === lead.assigned_to)
                  return (
                    <tr
                      key={lead.id}
                      className={cn('border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/20 cursor-pointer transition-colors', i % 2 === 0 ? 'bg-zinc-800/10' : '')}
                      onClick={() => setSelected(lead)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lead.full_name} size="xs" />
                          <div>
                            <p className="text-zinc-200 font-medium text-sm">{lead.full_name}</p>
                            <p className="text-xs text-zinc-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{lead.experience || '—'}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{lead.source || '—'}</td>
                      <td className="px-4 py-3"><Badge color={sm.color}>{sm.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtLeadDate(lead.submitted_at)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{assignee?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(lead) }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                      {leads.length === 0
                        ? 'No applications yet. Publish your public page to start collecting leads.'
                        : 'No leads match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          staff={staff}
          orgId={org?.id}
          updateLead={updateLead}
          deleteLead={deleteLead}
          onClose={() => setSelected(null)}
          onUpdate={(updates) => {
            updateLead(org?.id, selectedLead.id, updates)
            setSelected((prev) => ({ ...prev, ...updates }))
          }}
        />
      )}
    </div>
  )
}

// ─── Lead detail / edit modal ─────────────────────────────────────────────────
function LeadDetailModal({ lead, staff, orgId, onClose, onUpdate, deleteLead }) {
  const [notes, setNotes] = useState(lead.notes || '')
  const [notesSaved, setNotesSaved] = useState(false)

  // re-sync notes textarea when a different lead is opened
  useEffect(() => { setNotes(lead.notes || '') }, [lead.id])

  function saveNotes() {
    onUpdate({ notes: notes.slice(0, 5000) })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <Modal open onClose={onClose} title={lead.full_name} size="lg">
      <div className="space-y-5">
        {/* Top row — status + assign */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Status</label>
            <select
              value={lead.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Assign To</label>
            <select
              value={lead.assigned_to || ''}
              onChange={(e) => onUpdate({ assigned_to: e.target.value || null })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">Unassigned</option>
              {staff.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Application details */}
        <div className="grid sm:grid-cols-2 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
          {[
            { label: 'Email',        value: lead.email },
            { label: 'Phone',        value: lead.phone || '—' },
            { label: 'Instagram',    value: lead.instagram || '—' },
            { label: 'Service',      value: lead.service || '—' },
            { label: 'Age',          value: lead.age || '—' },
            { label: 'Height',       value: lead.height || '—' },
            { label: 'Weight',       value: lead.bodyweight || '—' },
            { label: 'Weight Class', value: lead.weight_class || '—' },
            { label: 'Experience',   value: lead.experience || '—' },
            { label: 'Federation',   value: lead.federation || '—' },
            { label: 'Membership #', value: lead.membership_num || '—' },
            { label: 'Source',       value: lead.source || '—' },
            { label: 'Applied',      value: fmtLeadDate(lead.submitted_at) },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
              <p className="text-sm text-zinc-200">{r.value}</p>
            </div>
          ))}
        </div>

        {/* Lift stats */}
        {(lead.squat_max || lead.bench_max || lead.deadlift_max) && (
          <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Lift Maxes</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Squat',     value: lead.squat_max },
                { label: 'Bench',     value: lead.bench_max },
                { label: 'Deadlift',  value: lead.deadlift_max },
              ].map((r) => r.value ? (
                <div key={r.label} className="text-center">
                  <p className="text-xs text-zinc-500">{r.label}</p>
                  <p className="text-sm font-semibold text-zinc-100">{r.value}</p>
                </div>
              ) : null)}
            </div>
          </div>
        )}

        {/* Technique */}
        {(lead.squat_style || lead.bench_style || lead.deadlift_style) && (
          <div className="grid sm:grid-cols-3 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Squat Style</p>
              <p className="text-sm text-zinc-200">{lead.squat_style || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Bench Style</p>
              <p className="text-sm text-zinc-200">{lead.bench_style || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Deadlift Style</p>
              <p className="text-sm text-zinc-200">{lead.deadlift_style || '—'}</p>
            </div>
          </div>
        )}

        {/* Schedule & lifestyle */}
        {(lead.days_per_week || lead.training_time || lead.occupation) && (
          <div className="grid sm:grid-cols-2 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            {[
              { label: 'Days/Week',      value: lead.days_per_week },
              { label: 'Training Time',  value: lead.training_time },
              { label: 'Occupation',     value: lead.occupation },
              { label: 'Sleep',          value: lead.sleep_schedule ? `${lead.sleep_schedule} (${lead.sleep_hours || '?'}h)` : lead.sleep_hours ? `${lead.sleep_hours}h/night` : null },
            ].filter(r => r.value).map((r) => (
              <div key={r.label}>
                <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
                <p className="text-sm text-zinc-200">{r.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Health scores */}
        {(lead.nutrition_score || lead.stress_score) && (
          <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            {[
              { label: 'Nutrition', value: lead.nutrition_score },
              { label: 'Hydration', value: lead.hydration_score },
              { label: 'Stress',    value: lead.stress_score },
              { label: 'Recovery',  value: lead.recovery_score },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <p className="text-xs text-zinc-500">{r.label}</p>
                <p className="text-lg font-bold text-zinc-100">{r.value || '—'}<span className="text-xs text-zinc-500">/10</span></p>
              </div>
            ))}
          </div>
        )}

        {/* Textarea fields */}
        {[
          { key: 'goals',              label: 'Goals',                    value: lead.goals },
          { key: 'injuries',           label: 'Injuries / Health Notes',  value: lead.injuries },
          { key: 'weakpoints',         label: 'Weak Points / Needs Work', value: lead.weakpoints },
          { key: 'obligations',        label: 'Other Obligations',        value: lead.obligations },
          { key: 'external_stressors', label: 'External Stressors',       value: lead.external_stressors },
          { key: 'expectations',       label: 'Expectations for a Coach', value: lead.expectations },
          { key: 'concerns',           label: 'Concerns / Hesitations',   value: lead.concerns },
          { key: 'learner_type',       label: 'Learning Style',           value: lead.learner_type },
        ].filter(r => r.value).map((r) => (
          <div key={r.key}>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">{r.label}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{r.value}</p>
          </div>
        ))}

        {/* Internal notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Internal Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private notes about this applicant…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
          <Button size="sm" className="mt-2" onClick={saveNotes}>
            {notesSaved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Notes'}
          </Button>
        </div>

        <div className="flex justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={() => { deleteLead(orgId, lead.id); onClose() }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Lead
          </button>
          {lead.status !== 'onboarded' && (
            <Button size="sm" onClick={() => { onUpdate({ status: 'onboarded' }); onClose() }}>
              <UserCheck className="w-3.5 h-3.5" /> Mark as Onboarded
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Org Settings ─────────────────────────────────────────────────────────────
function OrgSettingsTab() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, updateOrg } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const [form, setForm] = useState({ name: org?.name || '', federation: org?.federation || '', timezone: org?.timezone || 'America/New_York', weight_unit: org?.weight_unit || 'lbs' })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    if (org) updateOrg(org.id, form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card>
      <CardHeader><CardTitle>Organization Settings</CardTitle><CardSubtitle>Changes here apply to your entire org</CardSubtitle></CardHeader>
      <CardBody className="space-y-4">
        {[
          { label: 'Team Name', key: 'name', type: 'text' },
          { label: 'Federation', key: 'federation', type: 'text', placeholder: 'USAPL, IPF, RPS…' },
          { label: 'Timezone', key: 'timezone', type: 'select', options: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Australia/Sydney'] },
          { label: 'Weight Unit', key: 'weight_unit', type: 'select', options: ['lbs', 'kg'] },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
            {f.type === 'select'
              ? <select value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">{f.options.map((o) => <option key={o}>{o}</option>)}</select>
              : <input value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            }
          </div>
        ))}
        <Button size="sm" onClick={handleSave}>{saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Changes'}</Button>
      </CardBody>
    </Card>
  )
}

// ─── Notifications ────────────────────────────────────────────────────────────
function NotificationsTab() {
  return (
    <Card>
      <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        {[
          { label: 'New athlete joins', desc: 'Notify admins when an athlete joins the org' },
          { label: 'Missed check-in alerts', desc: 'Alert coaches when athletes miss 3+ check-ins' },
          { label: 'Pain flag escalations', desc: 'Notify head coach of pain ratings ≥ 7' },
          { label: 'Invitation accepted', desc: 'Notify admin when an invited user accepts' },
          { label: 'Weekly digest', desc: 'Send weekly adherence summary every Monday' },
          { label: 'Budget exceeded', desc: 'Alert nutritionist when athlete exceeds shopping budget' },
        ].map((n, i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-2 border-b border-zinc-800 last:border-0">
            <div>
              <p className="text-sm font-medium text-zinc-200">{n.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{n.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-purple-500/30 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
            </label>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerZoneTab() {
  return (
    <Card className="border-red-500/20">
      <CardHeader><CardTitle className="text-red-400">Danger Zone</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        {[
          { title: 'Export All Data', desc: 'Download a full backup of your organization data', label: 'Export', variant: 'ghost' },
          { title: 'Leave Organization', desc: 'Remove yourself from this org. You will lose access immediately.', label: 'Leave', variant: 'ghost' },
          { title: 'Delete Organization', desc: 'Permanently delete all data. This cannot be undone.', label: 'Delete', variant: 'danger' },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
            <div>
              <p className="text-sm font-medium text-zinc-200">{item.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
            <Button variant={item.variant} size="sm" className={item.variant === 'ghost' ? 'text-red-400 hover:text-red-300' : ''}>{item.label}</Button>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}
