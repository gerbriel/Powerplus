import { useState, useMemo } from 'react'
import {
  Users, Shield, Bell, Database, Settings, PlusCircle, Mail, Trash2,
  AlertTriangle, Lock, Globe, Building2, CheckCircle2,
  ChevronDown, ChevronRight, Edit2, RefreshCw, UserPlus, Crown,
  Activity, TrendingUp, TrendingDown, Dumbbell, UtensilsCrossed, Target,
  Send, RotateCcw, Check, X, ToggleLeft, ToggleRight,
  CreditCard, Search, ArrowLeft, BarChart2, Zap, Heart, Moon,
  ClipboardList, Scale, CalendarDays, Award, Flame
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { Tabs } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { MOCK_ATHLETES, MOCK_USERS, MOCK_ORGS, MOCK_TRAINING_BLOCKS, PLAN_META } from '../lib/mockData'
import { useAuthStore, useOrgStore, useGoalsStore, useTrainingStore } from '../lib/store'
import { cn } from '../lib/utils'

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
  const isSuperAdmin = profile?.role === 'super_admin'
  const isHeadCoach = profile?.role === 'admin'
  const canManage = isSuperAdmin || isHeadCoach

  const SUPER_TABS = [
    { id: 'orgs', label: 'Organizations' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'notifications', label: 'Notifications' },
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
            {isSuperAdmin ? 'Manage all organizations, plans, and platform-wide settings'
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

      {tab === 'orgs' && isSuperAdmin && <SuperAdminOrgsTab />}
      {tab === 'analytics' && isSuperAdmin && <PlatformAnalyticsTab />}
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
function PlatformAnalyticsTab() {
  const { orgs } = useOrgStore()
  const [selectedOrg, setSelectedOrg] = useState(null)

  if (selectedOrg) {
    return <OrgAnalyticsView org={selectedOrg} onBack={() => setSelectedOrg(null)} />
  }

  // Platform-level aggregates across all orgs
  const totalAthletes = orgs.reduce((s, o) => s + o.members.filter((m) => m.role === 'athlete').length, 0)
  const totalCoaches = orgs.reduce((s, o) => s + o.members.filter((m) => m.role === 'coach').length, 0)
  const totalNutritionists = orgs.reduce((s, o) => s + o.members.filter((m) => m.role === 'nutritionist').length, 0)
  const totalAdmins = orgs.reduce((s, o) => s + o.members.filter((m) => m.role === 'admin').length, 0)
  const activeOrgs = orgs.filter((o) => o.status === 'active').length
  const suspendedOrgs = orgs.filter((o) => o.status === 'suspended').length
  const totalStorage = orgs.reduce((s, o) => s + (o.storage_gb_used || 0), 0)
  const planBreakdown = Object.keys(PLAN_META).map((p) => ({
    plan: p, meta: PLAN_META[p], count: orgs.filter((o) => o.plan === p).length
  }))

  // Org health scores (derived from mock data richness)
  const orgHealth = orgs.map((o) => {
    const athletes = o.members.filter((m) => m.role === 'athlete').length
    const staff = o.members.filter((m) => m.role !== 'athlete').length
    const pending = o.invitations.filter((i) => i.status === 'pending').length
    const recentActivity = o.activity_log.length
    // Pull real athlete data for org-001, synthetic for others
    const orgAthletes = o.id === 'org-001' ? MOCK_ATHLETES : []
    const avgAdherence = orgAthletes.length > 0
      ? Math.round(orgAthletes.reduce((s, a) => s + a.adherence, 0) / orgAthletes.length)
      : Math.floor(72 + Math.random() * 20)
    const avgSleep = orgAthletes.length > 0
      ? (orgAthletes.reduce((s, a) => s + a.sleep_avg, 0) / orgAthletes.length).toFixed(1)
      : (6.5 + Math.random() * 1.5).toFixed(1)
    const flags = orgAthletes.filter((a) => a.flags?.length > 0).length
    return { org: o, athletes, staff, pending, recentActivity, avgAdherence, avgSleep, flags }
  })

  return (
    <div className="space-y-6">
      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Orgs" value={orgs.length} sub={`${activeOrgs} active · ${suspendedOrgs} suspended`} icon={Building2} color="purple" />
        <StatCard label="Total Athletes" value={totalAthletes} icon={Users} color="blue" />
        <StatCard label="Coaches + Staff" value={totalCoaches + totalNutritionists + totalAdmins} sub={`${totalCoaches} coaches · ${totalNutritionists} nutritionists`} icon={Shield} color="green" />
        <StatCard label="Storage Used" value={`${totalStorage.toFixed(1)}GB`} icon={Database} color="yellow" />
      </div>

      {/* Plan breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-purple-400" /> Plan Distribution</CardTitle>
          <CardSubtitle>Subscription breakdown across all organizations</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-3 gap-4">
            {planBreakdown.map(({ plan, meta, count }) => (
              <div key={plan} className="text-center p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
                <Badge color={meta.color} className="mb-2">{meta.label}</Badge>
                <p className="text-2xl font-bold text-zinc-100 mt-1">{count}</p>
                <p className="text-xs text-zinc-500 mt-0.5">org{count !== 1 ? 's' : ''}</p>
                <p className="text-xs text-zinc-600 mt-1.5">{meta.price}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Org health list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400" /> Organization Health</CardTitle>
          <CardSubtitle>Click any org to drill into coaches, nutritionists, and athletes</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-zinc-800">
            {orgHealth.map(({ org, athletes, staff, avgAdherence, avgSleep, flags, pending }) => {
              const planInfo = PLAN_META[org.plan] || PLAN_META.starter
              const healthScore = Math.round((avgAdherence * 0.5) + (parseFloat(avgSleep) / 9 * 30) + (flags === 0 ? 20 : Math.max(0, 20 - flags * 5)))
              const scoreColor = healthScore >= 75 ? 'text-green-400' : healthScore >= 55 ? 'text-yellow-400' : 'text-red-400'
              return (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0"><Activity className="w-5 h-5 text-zinc-400" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
                      <Badge color={planInfo.color}>{planInfo.label}</Badge>
                      <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label}</Badge>
                      {pending > 0 && <Badge color="yellow">{pending} pending</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{athletes} athletes</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{staff} staff</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{avgAdherence}% adherence</span>
                      <span className="flex items-center gap-1"><Moon className="w-3 h-3" />{avgSleep}h sleep</span>
                      {flags > 0 && <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" />{flags} flags</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden md:block">
                      <p className={`text-lg font-bold ${scoreColor}`}>{healthScore}</p>
                      <p className="text-xs text-zinc-600">health score</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </button>
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
  // For org-001, use real MOCK_ATHLETES data; for others, generate synthetic profiles
  const athleteData = org.id === 'org-001'
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
function SuperAdminOrgsTab() {
  const { orgs, createOrg, updateOrg, deleteOrg, toggleOrgStatus } = useOrgStore()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [expandedOrg, setExpandedOrg] = useState(null)

  const filtered = orgs.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.toLowerCase().includes(search.toLowerCase())
  )
  const totalAthletes = orgs.reduce((s, o) => s + o.members.filter((m) => m.role === 'athlete').length, 0)
  const totalStaff = orgs.reduce((s, o) => s + o.members.filter((m) => m.role !== 'athlete').length, 0)
  const activeOrgs = orgs.filter((o) => o.status === 'active').length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Orgs" value={orgs.length} icon={Building2} color="purple" />
        <StatCard label="Active Orgs" value={activeOrgs} icon={CheckCircle2} color="green" />
        <StatCard label="Total Athletes" value={totalAthletes} icon={Users} color="blue" />
        <StatCard label="Total Staff" value={totalStaff} icon={Shield} color="yellow" />
      </div>

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
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusCircle className="w-3.5 h-3.5" /> New Org
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((org) => {
          const athletes = org.members.filter((m) => m.role === 'athlete').length
          const staff = org.members.filter((m) => m.role !== 'athlete').length
          const pendingInvites = org.invitations.filter((i) => i.status === 'pending').length
          const planInfo = PLAN_META[org.plan] || PLAN_META.starter
          const isExpanded = expandedOrg === org.id

          return (
            <Card key={org.id} className={`transition-all ${org.status === 'suspended' ? 'border-red-500/20 opacity-75' : 'hover:border-zinc-600'}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0"><Activity className="w-5 h-5 text-zinc-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-zinc-100">{org.name}</span>
                    <Badge color={planInfo.color}>{planInfo.label}</Badge>
                    <Badge color={ORG_STATUS_BADGE[org.status]?.color || 'default'}>{ORG_STATUS_BADGE[org.status]?.label || org.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{org.slug} · {org.federation || 'No federation'} · {org.address || 'No address'}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-zinc-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{athletes} athletes</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{staff} staff</span>
                    {pendingInvites > 0 && <span className="flex items-center gap-1 text-yellow-400"><Mail className="w-3 h-3" />{pendingInvites} pending</span>}
                    <span className="text-zinc-600">Created {org.created_at}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => setExpandedOrg(isExpanded ? null : org.id)} className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 rounded-lg transition-colors" title="View details">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                  <button onClick={() => setDeleteConfirm(org.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete org">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {deleteConfirm === org.id && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-300 flex-1">Permanently delete <strong>{org.name}</strong>? All data will be lost.</p>
                  <button onClick={() => setDeleteConfirm(null)} className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1">Cancel</button>
                  <button onClick={() => { deleteOrg(org.id); setDeleteConfirm(null) }} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1 rounded-lg transition-colors">Delete</button>
                </div>
              )}

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Members ({org.members.length})</p>
                  {org.members.map((m) => (
                    <div key={m.user_id} className="flex items-center gap-3 py-1">
                      <Avatar name={m.full_name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-200">{m.full_name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{m.email}</span>
                      </div>
                      <Badge color={roleBadge(m.role)} className="capitalize">{m.role}</Badge>
                    </div>
                  ))}
                  {org.invitations.filter((i) => i.status === 'pending').map((inv) => (
                    <div key={inv.id} className="flex items-center gap-3 py-1 opacity-60">
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center"><Mail className="w-3 h-3 text-zinc-400" /></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-zinc-300">{inv.email}</span>
                        <span className="text-xs text-zinc-500 ml-2">invited {inv.sent_at}</span>
                      </div>
                      <Badge color="yellow" className="capitalize">Invited · {inv.role}</Badge>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Athletes', used: athletes, limit: org.athlete_limit },
                      { label: 'Staff', used: staff, limit: org.staff_limit },
                      { label: 'Storage', used: org.storage_gb_used, limit: org.storage_gb_limit, suffix: 'GB' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-zinc-500">{item.label}</span>
                          <span className="text-xs text-zinc-400">{item.used}{item.suffix || ''}/{item.limit}{item.suffix || ''}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${(item.used / item.limit) > 0.9 ? 'bg-red-500' : (item.used / item.limit) > 0.7 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Building2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No organizations found</p>
          </div>
        )}
      </div>

      <OrgFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={(data) => { createOrg(data); setCreateOpen(false) }} />
      {editTarget && (
        <OrgFormModal open={!!editTarget} onClose={() => setEditTarget(null)} initial={editTarget} onSave={(data) => { updateOrg(editTarget.id, data); setEditTarget(null) }} />
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
  const { profile } = useAuthStore()
  const { orgs } = useOrgStore()
  const { goals } = useGoalsStore()
  const { blocks } = useTrainingStore()
  const org = orgs.find((o) => o.id === profile?.org_id)
  const athletes = org ? org.members.filter((m) => m.role === 'athlete') : []
  const staff = org ? org.members.filter((m) => m.role !== 'athlete') : []
  const completedGoals = goals.filter((g) => g.completed).length
  const activeBlocks = blocks.filter((b) => b.status === 'active').length
  const flaggedAthletes = MOCK_ATHLETES.filter((a) => a.flags?.length > 0).length

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
function TeamTab({ onInvite }) {
  const { profile } = useAuthStore()
  const { orgs, updateMemberRole, removeMember } = useOrgStore()
  const org = orgs.find((o) => o.id === profile?.org_id)
  const members = org?.members || []
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editRole, setEditRole] = useState(null)
  const staff = members.filter((m) => m.role !== 'athlete')
  const athletes = members.filter((m) => m.role === 'athlete')

  function handleRoleChange(userId, newRole) {
    updateMemberRole(profile.org_id, userId, newRole)
    setEditRole(null)
  }
  function handleRemove(userId) {
    removeMember(profile.org_id, userId)
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
  const { profile } = useAuthStore()
  const { orgs, cancelInvite, resendInvite, acceptInvite } = useOrgStore()
  const org = orgs.find((o) => o.id === profile?.org_id)
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

  function handleSend() {
    if (!email.trim() || !orgId) return
    inviteMember(orgId, { email: email.trim(), role, message })
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
              <Button className="flex-1" onClick={handleSend} disabled={!email.trim()}><Send className="w-3.5 h-3.5" /> Send Invitation</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Roles & Permissions Tab ──────────────────────────────────────────────────
function RolesTab({ isSuperAdmin }) {
  const { profile } = useAuthStore()
  const isHeadCoach = profile?.role === 'admin'
  const orgs = useOrgStore(s => s.orgs)
  const org = orgs.find(o => o.id === profile?.org_id) ?? orgs[0]
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

// ─── Org Settings ─────────────────────────────────────────────────────────────
function OrgSettingsTab() {
  const { profile } = useAuthStore()
  const { orgs, updateOrg } = useOrgStore()
  const org = orgs.find((o) => o.id === profile?.org_id)
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
