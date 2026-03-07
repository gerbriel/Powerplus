import { useState, useEffect, useMemo } from 'react'
import { Zap, CheckCircle2, Circle, Clock, Flame, Droplets, Moon, Dumbbell, MessageSquare, ChevronRight, AlertCircle, Trophy, Scale, Users, TrendingUp, TrendingDown, AlertTriangle, Activity, Target, BarChart2, Shield, Stethoscope, Eye, CreditCard, Building2, Globe, Server, CheckCircle, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatCard } from '../components/ui/StatCard'
import { Slider } from '../components/ui/Slider'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { MOCK_TODAY_WORKOUT, MOCK_NUTRITION_TODAY, MOCK_NOTIFICATIONS, MOCK_ATHLETES, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_STAFF_ASSIGNMENTS, PLAN_META } from '../lib/mockData'
import { useAuthStore, useSettingsStore, useUIStore, useOrgStore, useRosterStore, useTrainingStore, useMeetsStore, useAnalyticsStore, useMessagingStore } from '../lib/store'
import { resolveRole, isStaffRole } from '../lib/store'
import { cn, macroPercent, kgToLbs } from '../lib/utils'
import { saveCheckIn } from '../lib/db'

// Convert a string intensity like "100kg" or "180kg" to the current unit
function convertIntensity(intensity, weightUnit) {
  if (!intensity) return ''
  const match = intensity.match(/^([\d.]+)\s*kg$/i)
  if (match) {
    const kg = parseFloat(match[1])
    if (weightUnit === 'lbs') return `${Math.round(kgToLbs(kg))}lbs`
    return `${kg}kg`
  }
  return intensity
}

export function TodayPage() {
  const { profile, viewAsAthlete, orgMemberships, activeOrgId } = useAuthStore()
  const { weightUnit, toggleWeightUnit } = useSettingsStore()

  // Platform admin gets a dedicated SaaS dashboard
  if (profile?.role === 'super_admin') return <PlatformDashboard />

  const membership = orgMemberships?.find(m => m.org_id === activeOrgId)
  // Any staff member can toggle athlete view to see their own personal data
  const canViewAsAthlete = isStaffRole(profile, membership)
  // Use resolveRole so org_role is the fallback — works even without profile.role
  const isStaff = !viewAsAthlete && isStaffRole(profile, membership)

  if (isStaff) {
    return <StaffDashboard profile={profile} membership={membership} />
  }

  return <AthleteTodayPage profile={profile} weightUnit={weightUnit} toggleWeightUnit={toggleWeightUnit} />
}

// ─── Platform Dashboard (super_admin) ────────────────────────────────────────
function PlatformDashboard() {
  const { orgs } = useOrgStore()
  const { setActivePage } = useUIStore()

  const PLAN_MRR = { starter: 0, team_pro: 149, enterprise: 499 }

  const activeOrgs  = orgs.filter((o) => o.status === 'active')
  const totalMRR    = activeOrgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0)
  const paidOrgs    = activeOrgs.filter((o) => o.plan !== 'starter')
  const totalUsers  = orgs.reduce((s, o) => s + o.members.length, 0)
  const suspendedOrgs = orgs.filter((o) => o.status === 'suspended')

  // Mock recent signups (last 24 h)
  const recentSignups = orgs.slice(0, 3).map((o, i) => ({
    ...o,
    hoursAgo: [2, 7, 14][i],
  }))

  const systemServices = [
    { label: 'API',           ok: true,  latency: '43ms'  },
    { label: 'Database',      ok: true,  latency: '12ms'  },
    { label: 'Auth',          ok: true,  latency: '21ms'  },
    { label: 'Storage',       ok: true,  latency: '89ms'  },
    { label: 'Email / SMTP',  ok: true,  latency: '—'     },
    { label: 'Edge Functions', ok: true, latency: '31ms'  },
  ]

  const quickLinks = [
    { label: 'Billing & Plans', page: 'settings', desc: 'Subscriptions, upgrades, upsell', icon: CreditCard, color: 'text-green-400' },
    { label: 'User Directory',  page: 'settings', desc: 'All users across every org',      icon: Users,      color: 'text-blue-400'  },
    { label: 'Organizations',   page: 'settings', desc: 'Org details, limits, status',     icon: Building2,  color: 'text-purple-400'},
    { label: 'Platform Analytics', page: 'analytics', desc: 'MRR, ARR, growth charts',    icon: BarChart2,  color: 'text-yellow-400'},
  ]

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100">{greeting}, Admin</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Platform overview · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR"         value={`$${totalMRR.toLocaleString()}`} sub="monthly recurring"            icon={TrendingUp} color="green"  trendLabel="+12% vs last month" trend={1} />
        <StatCard label="Active Orgs" value={activeOrgs.length}               sub={`${paidOrgs.length} paid`}    icon={Building2}  color="blue"   />
        <StatCard label="Total Users" value={totalUsers}                      sub="across all orgs"              icon={Users}      color="purple" />
        <StatCard label="New Today"   value={recentSignups.length}            sub="org signups (24 h)"           icon={Zap}        color="yellow" trendLabel="↑ 2 vs yesterday" trend={1} />
      </div>

      {/* Alerts + recent signups */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" /> Platform Alerts
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {suspendedOrgs.length === 0 ? (
              <div className="flex items-center gap-2.5 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-sm text-zinc-300">All systems healthy — no active alerts</p>
              </div>
            ) : (
              suspendedOrgs.map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 p-3 bg-red-500/5 border border-red-500/15 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-200 font-medium">{o.name}</p>
                    <p className="text-xs text-red-400">Suspended · {PLAN_META[o.plan]?.label}</p>
                  </div>
                </div>
              ))
            )}
            {orgs.filter((o) => {
              const pct = (o.members.filter((m) => m.role === 'athlete').length / o.athlete_limit) * 100
              return pct >= 90 && o.status === 'active'
            }).map((o) => (
              <div key={o.id + '-limit'} className="flex items-center gap-2.5 p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-zinc-200 font-medium">{o.name}</p>
                  <p className="text-xs text-yellow-400">Athlete limit ≥90% — upsell opportunity</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Recent signups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> Recent Signups
            </CardTitle>
            <CardSubtitle>New organizations in the last 24 hours</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {recentSignups.map((o) => {
              const planInfo = PLAN_META[o.plan] || PLAN_META.starter
              return (
                <div key={o.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{o.name}</p>
                    <p className="text-xs text-zinc-500">{o.hoursAgo}h ago · {o.members.length} member{o.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Badge color={planInfo.color}>{planInfo.label}</Badge>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold mb-3">Quick Access</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => setActivePage(link.page)}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-left hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group"
            >
              <link.icon className={cn('w-5 h-5 mb-2', link.color)} />
              <p className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100">{link.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{link.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* System status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-400" /> System Status
          </CardTitle>
          <CardSubtitle>Live health check for all platform services</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-zinc-800">
            {systemServices.map((svc) => (
              <div key={svc.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-2 h-2 rounded-full', svc.ok ? 'bg-green-500' : 'bg-red-500')} />
                  <span className="text-sm text-zinc-300">{svc.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {svc.latency !== '—' && (
                    <span className="text-xs text-zinc-500">{svc.latency}</span>
                  )}
                  <Badge color={svc.ok ? 'green' : 'red'}>{svc.ok ? 'Operational' : 'Degraded'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────
function StaffDashboard({ profile, membership }) {
  const role = resolveRole(profile, membership)
  const isNutritionist = role === 'nutritionist'
  const isAdmin = role === 'admin'
  const { setActivePage } = useUIStore()
  const { isDemo, activeOrgId } = useAuthStore()

  // ── Live data — always prefer store data, fall back to mock in demo ──────
  const { athletes: liveAthletes, loadRoster } = useRosterStore()
  const { blocks: liveBlocks, loadOrgTrainingBlocks } = useTrainingStore()
  const { meets: liveMeets, load: loadMeets } = useMeetsStore()
  const { channels, messagesByThread, initMessaging } = useMessagingStore()

  // Load live data on mount for real users
  useEffect(() => {
    if (!isDemo && activeOrgId) {
      loadRoster(activeOrgId)
      loadOrgTrainingBlocks(activeOrgId)
    }
    if (!isDemo && profile?.id && activeOrgId) {
      loadMeets(profile.id, activeOrgId)
    }
    if (!isDemo && activeOrgId) {
      initMessaging({ id: profile?.id }, activeOrgId, isAdmin)
    }
  }, [isDemo, activeOrgId, profile?.id]) // eslint-disable-line

  const athletes       = isDemo ? MOCK_ATHLETES       : liveAthletes
  const trainingBlocks = isDemo ? MOCK_TRAINING_BLOCKS : liveBlocks
  const meets          = isDemo ? MOCK_MEETS           : liveMeets

  // Search filter for athletes
  const [athleteSearch, setAthleteSearch] = useState('')
  const filteredAthletes = useMemo(() => {
    if (!athleteSearch.trim()) return athletes
    const q = athleteSearch.trim().toLowerCase()
    return athletes.filter(a =>
      (a.full_name || a.display_name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    )
  }, [athletes, athleteSearch])

  // Recent messages from messaging store (newest first, limit 5)
  const recentMessages = useMemo(() => {
    if (isDemo) return null // use hardcoded demo array below
    // Gather the last message from each channel thread
    const msgs = []
    for (const ch of channels.slice(0, 10)) {
      const thread = messagesByThread[ch.id]
      if (thread?.length) {
        const last = thread[thread.length - 1]
        msgs.push({ from: last.sender_name || last.sender_id || 'Unknown', msg: last.content || last.text || '', time: last.created_at ? new Date(last.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '', unread: false, role: 'staff', channelName: ch.name })
      }
    }
    return msgs.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5)
  }, [isDemo, channels, messagesByThread])

  const activeBlock = trainingBlocks.find(b => b.status === 'active')
  const upcomingMeet = meets?.[0]
  const daysToMeet = upcomingMeet
    ? Math.ceil((new Date(upcomingMeet.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const flaggedAthletes = athletes.filter(a => a.flags?.length > 0)
  const lowCompliance = athletes.filter(a => a.nutrition_compliance < 80)
  const missedSessions = athletes.filter(a => a.sessions_this_week < a.sessions_planned_this_week)
  const avgCompliance = athletes.length ? Math.round(athletes.reduce((s, a) => s + (a.nutrition_compliance || 0), 0) / athletes.length) : 0
  const avgAdherence  = athletes.length ? Math.round(athletes.reduce((s, a) => s + (a.adherence || 0), 0) / athletes.length) : 0

  const FLAG_META = {
    pain_flag:       { label: 'Pain Flag',       color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    missed_sessions: { label: 'Missed Sessions', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    low_sleep:       { label: 'Low Sleep',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            {greeting}, {profile?.display_name || profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · {
              role === 'nutritionist' ? 'Nutrition & Athlete Overview' :
              role === 'admin' ? 'Head Coach Dashboard' :
              'Coaching Dashboard'
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Athlete search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={athleteSearch}
              onChange={e => setAthleteSearch(e.target.value)}
              placeholder="Search athletes…"
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 w-44"
            />
          </div>
          {!isNutritionist && (
            <Button size="sm" variant="outline" onClick={() => setActivePage?.('programming')}>
              <Activity className="w-3.5 h-3.5" /> Program Builder
            </Button>
          )}
          <Button size="sm" onClick={() => setActivePage?.('roster')}>
            <Users className="w-3.5 h-3.5" /> View Roster
          </Button>
        </div>
      </div>

      {/* Org Pulse Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Athletes" value={`${athletes.length}`} icon={Users} color="purple"
          trendLabel={`${athletes.filter(a => a.sessions_this_week > 0).length} trained today`} trend={1} />
        <StatCard label="Avg Adherence" value={avgAdherence > 0 ? `${avgAdherence}%` : '—'} icon={Zap} color="orange"
          trendLabel="7-day rolling" trend={avgAdherence >= 85 ? 1 : avgAdherence > 0 ? -1 : 0} />
        {!isNutritionist && (
          <StatCard label="Avg Nutrition" value={avgCompliance > 0 ? `${avgCompliance}%` : '—'} icon={Flame} color="teal"
            trendLabel="This week" trend={avgCompliance >= 80 ? 1 : avgCompliance > 0 ? -1 : 0} />
        )}
        <StatCard
          label={daysToMeet ? 'Days to Meet' : 'Active Block'}
          value={daysToMeet ? `${daysToMeet}d` : activeBlock?.phase ?? '—'}
          icon={Trophy}
          color="yellow"
          trendLabel={daysToMeet ? upcomingMeet?.name : activeBlock?.name}
          trend={0}
        />
        {isNutritionist && (
          <StatCard label="Low Compliance" value={`${lowCompliance.length}`} icon={AlertTriangle} color="red"
            trendLabel="Athletes below 80%" trend={lowCompliance.length > 0 ? -1 : 1} />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Athlete Flags / Attention Needed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />Needs Attention
              </CardTitle>
              <span className="text-xs text-zinc-500">{flaggedAthletes.length + missedSessions.filter(a => !a.flags?.includes('missed_sessions')).length} items</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-2">
            {flaggedAthletes.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
                <Avatar name={a.full_name} role="athlete" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{a.full_name}</p>
                  <p className="text-xs text-zinc-500 truncate">{a.injury_notes?.split('.')[0]}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.flags.map(f => (
                    <span key={f} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', FLAG_META[f]?.color ?? 'text-zinc-400 bg-zinc-700 border-zinc-600')}>
                      {FLAG_META[f]?.label ?? f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {missedSessions.filter(a => !a.flags?.includes('missed_sessions')).map(a => (
              <div key={a.id + '-ms'} className="flex items-center gap-3 p-2.5 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
                <Avatar name={a.full_name} role="athlete" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{a.full_name}</p>
                  <p className="text-xs text-zinc-500">{a.sessions_this_week}/{a.sessions_planned_this_week} sessions this week</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-orange-400 bg-orange-500/10 border-orange-500/20">
                  Missed Sessions
                </span>
              </div>
            ))}
            {flaggedAthletes.length === 0 && missedSessions.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-3">No flags — all athletes on track</p>
            )}
          </CardBody>
        </Card>

        {/* Today's Training Activity */}
        {!isNutritionist && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-purple-400" />Today's Training Activity
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {filteredAthletes.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-3">
                  {athleteSearch ? 'No athletes match your search' : 'No athletes on roster yet'}
                </p>
              )}
              {filteredAthletes.map(a => {
                const todayStr = new Date().toISOString().slice(0, 10)
                const trained = a.sessions_this_week > 0 && a.last_session >= todayStr
                const recentSession = a.recent_sessions?.[0]
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-800/30 border border-zinc-700/20">
                    <Avatar name={a.full_name || a.display_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200">{a.full_name || a.display_name}</p>
                      {recentSession ? (
                        <p className="text-xs text-zinc-500 truncate">{recentSession.name}</p>
                      ) : (
                        <p className="text-xs text-zinc-600">No recent session</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {trained ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-medium">Trained</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-500 border border-zinc-600/20 font-medium">Rest</span>
                      )}
                      {recentSession && (
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-bold',
                          recentSession.rpe >= 8.5 ? 'bg-red-500/15 text-red-400' :
                          recentSession.rpe >= 7.5 ? 'bg-orange-500/15 text-orange-400' :
                          'bg-green-500/15 text-green-400'
                        )}>RPE {recentSession.rpe}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        )}

        {/* Nutrition Compliance (all roles) */}
        {isNutritionist && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />Nutrition Compliance — This Week
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {filteredAthletes.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-3">
                  {athleteSearch ? 'No athletes match your search' : 'No athletes on roster yet'}
                </p>
              )}
              {filteredAthletes.map(a => {
                const nc = a.nutrition_compliance ?? 0
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.full_name || a.display_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-zinc-200">{a.full_name || a.display_name}</p>
                        <span className={cn('text-xs font-bold', nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400')}>{nc}%</span>
                      </div>
                      <ProgressBar value={nc} max={100} color={nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'} size="sm" />
                    </div>
                  </div>
                )
              })}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Active Block + Upcoming Meet */}
      <div className="grid md:grid-cols-2 gap-4">
        {activeBlock && !isNutritionist && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />Active Training Block
                </CardTitle>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold border',
                  activeBlock.phase === 'intensification' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                  activeBlock.phase === 'peaking' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' :
                  'bg-blue-500/15 text-blue-300 border-blue-500/30'
                )}>
                  {activeBlock.phase}
                </span>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-zinc-100">{activeBlock.name}</p>
              <p className="text-xs text-zinc-500">{activeBlock.start_date} → {activeBlock.end_date} · {activeBlock.weeks} weeks</p>
              <p className="text-xs text-zinc-400 italic">"{activeBlock.notes}"</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-zinc-800/40 rounded-xl p-2">
                  <p className="text-xs text-zinc-500">Target RPE</p>
                  <p className="text-sm font-bold text-zinc-200">{activeBlock.avg_rpe_target}</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-2">
                  <p className="text-xs text-zinc-500">Sessions</p>
                  <p className="text-sm font-bold text-zinc-200">{activeBlock.sessions_completed}/{activeBlock.sessions_planned}</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-2">
                  <p className="text-xs text-zinc-500">Focus</p>
                  <p className="text-xs font-bold text-zinc-200">{activeBlock.focus}</p>
                </div>
              </div>
              <ProgressBar value={activeBlock.sessions_completed} max={activeBlock.sessions_planned} color="purple" size="sm" />
            </CardBody>
          </Card>
        )}

        {/* Upcoming Meet */}
        {upcomingMeet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />Next Meet
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm font-semibold text-zinc-100">{upcomingMeet.name}</p>
              <p className="text-xs text-zinc-500">{upcomingMeet.date} · {upcomingMeet.location ?? 'TBD'}</p>
              {daysToMeet !== null && (
                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-bold',
                  daysToMeet <= 7 ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                  daysToMeet <= 21 ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' :
                  'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                )}>
                  <Trophy className="w-4 h-4" />
                  {daysToMeet} days away
                </div>
              )}
              <div className="mt-1">
                <p className="text-xs text-zinc-500 mb-2">Athletes registered</p>
                <div className="flex -space-x-2">
                  {athletes.filter(a => a.next_meet_id === upcomingMeet.id).slice(0, 5).map(a => (
                    <div key={a.id} className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0" title={a.full_name}>
                      {a.full_name.charAt(0)}
                    </div>
                  ))}
                  {athletes.filter(a => a.next_meet_id === upcomingMeet.id).length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs text-zinc-400">
                      +{athletes.filter(a => a.next_meet_id === upcomingMeet.id).length - 5}
                    </div>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Nutrition overview for non-nutritionist staff */}
        {!isNutritionist && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />Nutrition Compliance
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {athletes.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-3">No athletes on roster yet</p>
              )}
              {athletes.slice(0, 4).map(a => {
                const nc = a.nutrition_compliance ?? 0
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.full_name || a.display_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-zinc-200 truncate">{a.full_name || a.display_name}</p>
                        <span className={cn('text-xs font-bold ml-2 flex-shrink-0', nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400')}>{nc}%</span>
                      </div>
                      <ProgressBar value={nc} max={100} color={nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'} size="sm" />
                    </div>
                  </div>
                )
              })}
              {athletes.length > 4 && (
                <p className="text-xs text-zinc-600 text-center pt-1">+{athletes.length - 4} more athletes</p>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />Recent Messages
            </CardTitle>
            <button onClick={() => setActivePage?.('messaging')} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5">
              All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {isDemo ? [
            { from: 'Jordan Blake', msg: 'Hip felt a bit tight during squats, should I reduce intensity?', time: '1h ago', unread: true, role: 'athlete' },
            { from: 'Samantha Price', msg: 'Shoulder is feeling better today, can I return to full pressing?', time: '3h ago', unread: true, role: 'athlete' },
            { from: 'Devon Cruz', msg: 'Sorry for missing Wednesday — work emergency. Will double up this week.', time: '5h ago', unread: false, role: 'athlete' },
          ].map((m, i) => (
            <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl text-xs', m.unread ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-800/30 border border-zinc-700/20')}>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', m.unread ? 'bg-blue-700 text-blue-100' : 'bg-zinc-700 text-zinc-300')}>
                {m.from.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-200">{m.from}</span>
                  <span className="text-zinc-500 flex-shrink-0">{m.time}</span>
                </div>
                <p className="text-zinc-400 mt-0.5">{m.msg}</p>
              </div>
              {m.unread && <span className="w-2 h-2 rounded-full bg-blue-400 mt-1 flex-shrink-0" />}
            </div>
          )) : recentMessages && recentMessages.length > 0 ? recentMessages.map((m, i) => (
            <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl text-xs', m.unread ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-800/30 border border-zinc-700/20')}>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', m.unread ? 'bg-blue-700 text-blue-100' : 'bg-zinc-700 text-zinc-300')}>
                {m.from.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-200">{m.from}</span>
                  <span className="text-zinc-500 flex-shrink-0">{m.time}</span>
                </div>
                {m.channelName && <span className="text-zinc-600 text-xs">#{m.channelName} · </span>}
                <p className="text-zinc-400 mt-0.5 truncate">{m.msg}</p>
              </div>
            </div>
          )) : (
            <div className="text-center py-6 space-y-1">
              <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto" />
              <p className="text-xs text-zinc-500">No recent messages</p>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Athlete Today Page ────────────────────────────────────────────────────────
function AthleteTodayPage({ profile, weightUnit, toggleWeightUnit }) {
  const { isDemo, activeOrgId } = useAuthStore()
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [checkinData, setCheckinData] = useState({ sleep_hours: 7, sleep_quality: 7, soreness: 5, motivation: 7, stress: 4, bodyweight: '' })
  const [checkinDone, setCheckinDone] = useState(false)
  const [checkinSaving, setCheckinSaving] = useState(false)
  const [suppChecked, setSuppChecked] = useState({})

  // ── Analytics for real users ─────────────────────────────────────────────
  const { personal, personalLoading, loadPersonalAnalytics } = useAnalyticsStore()

  useEffect(() => {
    if (!isDemo && profile?.id) {
      loadPersonalAnalytics(profile.id, activeOrgId)
    }
  }, [isDemo, profile?.id, activeOrgId]) // eslint-disable-line

  // Check if today's check-in already done by looking at analytics check-in data
  // (personal.bwTrend last entry date matches today)
  useEffect(() => {
    if (!isDemo && personal) {
      const todayStr = new Date().toISOString().slice(0, 10)
      // bwTrend items don't have raw dates; rely on wellnessTrend recency as proxy.
      // We just keep checkinDone in local state — it resets on reload, which is fine
      // since saveCheckIn uses upsert so double-submit is idempotent.
    }
  }, [isDemo, personal])

  const nutrition = isDemo ? MOCK_NUTRITION_TODAY : null
  const workout   = isDemo ? MOCK_TODAY_WORKOUT   : null

  // ── Derived stats from analytics store ──────────────────────────────────
  const streakLabel     = isDemo ? '12d'  : (personal?.totalCompleted != null ? `${personal.totalCompleted}` : '—')
  const adherenceLabel  = isDemo ? '87%'  : (personal?.adherenceScore != null ? `${personal.adherenceScore}%` : '—')
  const sleepLabel      = isDemo ? '6.8h' : (personal?.avgSleep ?? '—')
  const totalE1RM       = isDemo ? '655kg' : (() => {
    if (!personal?.prRows?.length) return '—'
    const tot = personal.prRows.reduce((s, r) => s + (r.e1rm || 0), 0)
    return tot > 0 ? `${tot}kg` : '—'
  })()
  const adherenceTrend  = isDemo ? 1 : (personal?.adherenceScore >= 80 ? 1 : personal?.adherenceScore > 0 ? -1 : 0)
  const sleepTrend      = isDemo ? -1 : (personal?.avgSleep ? (parseFloat(personal.avgSleep) >= 7 ? 1 : -1) : 0)

  // ── Handle check-in submit — save to Supabase ────────────────────────────
  async function handleCheckinSubmit() {
    if (checkinSaving) return
    setCheckinSaving(true)
    try {
      // Sanitize bodyweight input
      const bwRaw = String(checkinData.bodyweight).trim()
      const bw = bwRaw !== '' ? Number(bwRaw) : null
      await saveCheckIn(profile?.id, {
        ...checkinData,
        body_weight: bw,
        bodyweight_unit: weightUnit || 'kg',
        check_type: 'morning',
        check_date: new Date().toISOString().slice(0, 10),
      })
      setCheckinDone(true)
      setCheckinOpen(false)
      // Invalidate analytics so next load picks up the new check-in
      if (!isDemo && profile?.id) {
        useAnalyticsStore.setState({ personalFor: null })
      }
    } catch (err) {
      console.error('[TodayPage] saveCheckIn error:', err)
    } finally {
      setCheckinSaving(false)
    }
  }

  if (!workout || !nutrition) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.display_name || profile?.full_name?.split(' ')[0] || 'Athlete'}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your coach hasn't assigned a workout yet.</p>
        </div>

        {/* Still show check-in + stats for real users even without a workout */}
        <div className="flex justify-end">
          <Button
            variant={checkinDone ? 'success' : 'primary'}
            size="sm"
            onClick={() => !checkinDone && setCheckinOpen(true)}
          >
            {checkinDone ? <><CheckCircle2 className="w-3.5 h-3.5" /> Checked In</> : 'Morning Check-In'}
          </Button>
        </div>

        {!isDemo && personal && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Sessions Done" value={streakLabel} icon={Flame} color="orange" trendLabel="All-time completed" trend={1} />
            <StatCard label="Weekly Adherence" value={adherenceLabel} icon={Zap} color="purple" trendLabel="Last 4 weeks" trend={adherenceTrend} />
            <StatCard label="Avg Sleep" value={sleepLabel} icon={Moon} color="blue" trendLabel="Recent check-ins" trend={sleepTrend} />
            <StatCard label="Total e1RM" value={totalE1RM} sub="SBD" icon={Dumbbell} color="yellow" trendLabel="Best sets" trend={1} />
          </div>
        )}

        <div className="text-center py-10 text-zinc-600">
          <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workout scheduled for today.</p>
        </div>

        {/* Morning Check-In Modal */}
        <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title="Morning Check-In" size="sm">
          <CheckinModalBody checkinData={checkinData} setCheckinData={setCheckinData} onSubmit={handleCheckinSubmit} saving={checkinSaving} />
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {profile?.display_name || profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleWeightUnit}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            <Scale className="w-3 h-3 text-purple-400" />
            {weightUnit.toUpperCase()}
          </button>
          <Button
            variant={checkinDone ? 'success' : 'primary'}
            size="sm"
            onClick={() => !checkinDone && setCheckinOpen(true)}
          >
            {checkinDone ? <><CheckCircle2 className="w-3.5 h-3.5" /> Checked In</> : 'Morning Check-In'}
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={isDemo ? 'Training Streak' : 'Sessions Done'} value={streakLabel} icon={Flame} color="orange" trendLabel={isDemo ? 'Personal best' : 'All-time completed'} trend={1} />
        <StatCard label="Weekly Adherence" value={adherenceLabel} icon={Zap} color="purple" trendLabel={isDemo ? '+2% vs last week' : 'Last 4 weeks'} trend={adherenceTrend} />
        <StatCard label="Avg Sleep" value={sleepLabel} icon={Moon} color="blue" trendLabel={isDemo ? '-0.2h vs goal' : 'Recent check-ins'} trend={sleepTrend} />
        <StatCard label="Total e1RM" value={totalE1RM} sub="SBD" icon={Dumbbell} color="yellow" trendLabel={isDemo ? 'Up 15kg this block' : 'Best sets'} trend={totalE1RM !== '—' ? 1 : 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's Workout */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-purple-400" />
                Today's Workout
              </CardTitle>
              <span className="text-xs font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">~{workout.estimated_duration}min</span>
            </div>
            <CardSubtitle>{workout.name}</CardSubtitle>
          </CardHeader>
          <div className="space-y-2 flex-1">
            {workout.blocks.map((block) => (
              <div key={block.type} className="rounded-lg bg-zinc-700/30 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/50">
                  <span className={cn('w-2 h-2 rounded-full', blockColor(block.type))} />
                  <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{block.label}</span>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {block.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-200 font-medium">{ex.name}</span>
                      <span className="text-zinc-400">
                        {ex.exercise_type === 'cardio'
                          ? (ex.duration_min ? `${ex.duration_min} min` : '1×')
                          : `${ex.sets}×${ex.reps}${ex.intensity ? ` @ ${convertIntensity(ex.intensity, weightUnit)}` : ''}`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-4 w-full" size="sm">
            <Zap className="w-3.5 h-3.5" /> Start Workout
          </Button>
        </Card>

        {/* Nutrition */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Nutrition Today
              </CardTitle>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                nutrition.compliance >= 85 ? 'bg-green-500/10 text-green-400' :
                nutrition.compliance >= 70 ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-red-500/10 text-red-400'
              )}>
                {nutrition.compliance}% compliant
              </span>
            </div>
          </CardHeader>

          <div className="space-y-3">
            <MacroRow label="Calories" actual={nutrition.actual.calories} target={nutrition.plan.calories} unit="kcal" color="orange" />
            <MacroRow label="Protein" actual={nutrition.actual.protein} target={nutrition.plan.protein} unit="g" color="blue" />
            <MacroRow label="Carbs" actual={nutrition.actual.carbs} target={nutrition.plan.carbs} unit="g" color="purple" />
            <MacroRow label="Fat" actual={nutrition.actual.fat} target={nutrition.plan.fat} unit="g" color="yellow" />
          </div>

          {/* Water */}
          <div className="mt-3 p-3 bg-zinc-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Droplets className="w-3.5 h-3.5 text-blue-400" /> Water
              </div>
              <span className="text-xs text-zinc-400">{nutrition.actual.water}ml / {nutrition.plan.water}ml</span>
            </div>
            <ProgressBar value={nutrition.actual.water} max={nutrition.plan.water} color="blue" size="sm" />
          </div>

          {/* Supplements */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Supplements</p>
            <div className="space-y-1.5">
              {nutrition.supplements.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSuppChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full flex items-center gap-2 text-xs text-left hover:bg-zinc-700/30 px-2 py-1.5 rounded-lg transition-colors"
                >
                  {suppChecked[i] || s.taken
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    : <Circle className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  }
                  <span className={suppChecked[i] || s.taken ? 'text-zinc-400 line-through' : 'text-zinc-300'}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Reminders + Messages */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-400" />Reminders</CardTitle></CardHeader>
          <div className="space-y-2">
            {isDemo ? [
              { icon: Dumbbell, text: 'Workout starts at 4:00 PM', urgent: true },
              { icon: Flame, text: 'Log nutrition by 8:00 PM', urgent: false },
              { icon: Moon, text: 'Sleep check-in tomorrow morning', urgent: false },
              { icon: Trophy, text: 'Meet registration deadline: Mar 15', urgent: false },
            ].map((r, i) => (
              <div key={i} className={cn('flex items-center gap-3 p-2.5 rounded-lg text-xs', r.urgent ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-700/30')}>
                <r.icon className={cn('w-3.5 h-3.5 flex-shrink-0', r.urgent ? 'text-yellow-400' : 'text-zinc-400')} />
                <span className={r.urgent ? 'text-yellow-200 font-medium' : 'text-zinc-300'}>{r.text}</span>
              </div>
            )) : (
              <div className="text-center py-4">
                <p className="text-xs text-zinc-600">No reminders for today</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400" />Recent Messages</CardTitle>
              <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-0.5">All <ChevronRight className="w-3 h-3" /></button>
            </div>
          </CardHeader>
          <div className="space-y-2">
            {isDemo ? [
              { from: 'Coach Elena', msg: 'Great job on that top set! Video form looks solid.', time: '11:00 AM', unread: true },
              { from: 'Dr. Priya', msg: 'Don\'t forget your nutrition check-in tonight', time: 'Yesterday', unread: false },
            ].map((m, i) => (
              <div key={i} className={cn('flex items-start gap-3 p-2.5 rounded-lg text-xs', m.unread ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-zinc-700/30')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', m.unread ? 'bg-blue-700 text-blue-100' : 'bg-zinc-700 text-zinc-300')}>
                  {m.from.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{m.from}</span>
                    <span className="text-zinc-500">{m.time}</span>
                  </div>
                  <p className="text-zinc-400 truncate mt-0.5">{m.msg}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 space-y-1">
                <MessageSquare className="w-7 h-7 text-zinc-700 mx-auto" />
                <p className="text-xs text-zinc-600">No recent messages</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Morning Check-In Modal */}
      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title="Morning Check-In" size="sm">
        <CheckinModalBody checkinData={checkinData} setCheckinData={setCheckinData} onSubmit={handleCheckinSubmit} saving={checkinSaving} weightUnit={weightUnit} />
      </Modal>
    </div>
  )
}

// ─── Shared check-in modal body ────────────────────────────────────────────────
function CheckinModalBody({ checkinData, setCheckinData, onSubmit, saving, weightUnit }) {
  return (
    <div className="p-6 space-y-5">
      <Slider
        label="Sleep Duration (hours)"
        value={checkinData.sleep_hours}
        min={3} max={12}
        onChange={(v) => setCheckinData(d => ({ ...d, sleep_hours: v }))}
        colorFn={(v) => v >= 7 ? 'text-green-400' : v >= 6 ? 'text-yellow-400' : 'text-red-400'}
      />
      <Slider
        label="Sleep Quality"
        value={checkinData.sleep_quality}
        onChange={(v) => setCheckinData(d => ({ ...d, sleep_quality: v }))}
        colorFn={(v) => v >= 7 ? 'text-green-400' : v >= 5 ? 'text-yellow-400' : 'text-red-400'}
      />
      <Slider
        label="Soreness Level"
        value={checkinData.soreness}
        onChange={(v) => setCheckinData(d => ({ ...d, soreness: v }))}
        colorFn={(v) => v <= 3 ? 'text-green-400' : v <= 6 ? 'text-yellow-400' : 'text-red-400'}
      />
      <Slider
        label="Motivation Level"
        value={checkinData.motivation}
        onChange={(v) => setCheckinData(d => ({ ...d, motivation: v }))}
        colorFn={(v) => v >= 7 ? 'text-green-400' : v >= 5 ? 'text-yellow-400' : 'text-red-400'}
      />
      <Slider
        label="Stress Level"
        value={checkinData.stress}
        onChange={(v) => setCheckinData(d => ({ ...d, stress: v }))}
        colorFn={(v) => v <= 3 ? 'text-green-400' : v <= 6 ? 'text-yellow-400' : 'text-red-400'}
      />
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          Bodyweight ({weightUnit || 'kg'})
        </label>
        <input
          type="number"
          value={checkinData.bodyweight}
          onChange={(e) => {
            const raw = e.target.value
            // Allow empty, digits, and a single decimal point — strip other chars
            if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
              setCheckinData(d => ({ ...d, bodyweight: raw }))
            }
          }}
          placeholder="e.g. 92.4"
          min="0"
          max="500"
          step="0.1"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
        />
      </div>
      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={saving}
      >
        <CheckCircle2 className="w-4 h-4" />
        {saving ? 'Saving…' : 'Submit Check-In'}
      </Button>
    </div>
  )
}

function MacroRow({ label, actual, target, unit, color }) {
  const pct = macroPercent(actual, target)
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-zinc-400 font-medium">{label}</span>
        <span className="text-zinc-300">{actual}{unit} <span className="text-zinc-600">/ {target}{unit}</span></span>
      </div>
      <ProgressBar value={pct} max={100} color={color} size="sm" />
    </div>
  )
}

function blockColor(type) {
  const map = {
    warmup: 'bg-yellow-400',
    main: 'bg-purple-400',
    accessory: 'bg-blue-400',
    conditioning: 'bg-orange-400',
    mobility: 'bg-green-400',
    gpp: 'bg-teal-400',
  }
  return map[type] || 'bg-zinc-400'
}
