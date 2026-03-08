import { useState, useMemo, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Users, Zap, Moon, Flame, Activity, Trophy,
  AlertTriangle, CreditCard, Building2, Globe, CheckCircle2,
  Scale, Heart, Target, RefreshCw, Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  AreaChart, Area,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { StatCard } from '../components/ui/StatCard'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import {
  MOCK_STRENGTH_TREND, MOCK_ADHERENCE_TREND, MOCK_TEAM_ADHERENCE,
  MOCK_ATHLETES, PLAN_META,
} from '../lib/mockData'
import { cn, adherenceColor } from '../lib/utils'
import { useAuthStore, useOrgStore, useAnalyticsStore } from '../lib/store'

const CC = {
  squat: '#d946ef', bench: '#3b82f6', deadlift: '#f97316',
  adherence: '#22c55e', nutrition: '#eab308', volume: '#8b5cf6',
  sleep: '#60a5fa', stress: '#f87171', soreness: '#fb923c',
  motivation: '#34d399', bw: '#a78bfa',
}

const TT = {
  contentStyle: { backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px' },
  labelStyle: { color: '#a1a1aa' },
}

const DEMO_WELLNESS = [
  { week: 'W-7', sleep: 7.1, stress: 4.2, soreness: 3.8, motivation: 7.0 },
  { week: 'W-6', sleep: 6.8, stress: 5.1, soreness: 4.5, motivation: 6.5 },
  { week: 'W-5', sleep: 7.4, stress: 3.9, soreness: 3.2, motivation: 7.8 },
  { week: 'W-4', sleep: 6.5, stress: 5.8, soreness: 5.1, motivation: 6.2 },
  { week: 'W-3', sleep: 7.0, stress: 4.4, soreness: 4.0, motivation: 7.2 },
  { week: 'W-2', sleep: 7.2, stress: 3.8, soreness: 3.5, motivation: 7.6 },
  { week: 'W-1', sleep: 6.9, stress: 4.6, soreness: 4.2, motivation: 7.0 },
]
const DEMO_VOLUME = [
  { week: 'W-7', volume: 18400 }, { week: 'W-6', volume: 21200 },
  { week: 'W-5', volume: 19800 }, { week: 'W-4', volume: 23500 },
  { week: 'W-3', volume: 22100 }, { week: 'W-2', volume: 25300 },
  { week: 'W-1', volume: 24800 },
]
const DEMO_BW = [
  { date: 'Jan 7', bw: 92.2 }, { date: 'Jan 14', bw: 91.8 },
  { date: 'Jan 21', bw: 91.4 }, { date: 'Jan 28', bw: 91.0 },
  { date: 'Feb 4', bw: 90.8 }, { date: 'Feb 11', bw: 90.5 },
  { date: 'Feb 18', bw: 90.2 }, { date: 'Feb 25', bw: 89.9 },
]
const DEMO_TEAM_WELLNESS = [
  { date: 'Feb 18', sleep: 7.1, stress: 4.2, soreness: 3.9 },
  { date: 'Feb 19', sleep: 6.9, stress: 4.8, soreness: 4.1 },
  { date: 'Feb 20', sleep: 7.3, stress: 3.9, soreness: 3.5 },
  { date: 'Feb 21', sleep: 6.8, stress: 5.2, soreness: 4.6 },
  { date: 'Feb 22', sleep: 7.0, stress: 4.5, soreness: 4.0 },
  { date: 'Feb 23', sleep: 7.2, stress: 4.1, soreness: 3.7 },
  { date: 'Feb 24', sleep: 6.6, stress: 5.0, soreness: 4.3 },
]
const DEMO_TEAM_VOLUME = [
  { week: 'W-7', volume: 142 }, { week: 'W-6', volume: 168 },
  { week: 'W-5', volume: 155 }, { week: 'W-4', volume: 182 },
  { week: 'W-3', volume: 174 }, { week: 'W-2', volume: 198 },
  { week: 'W-1', volume: 191 },
]
const DEMO_INJURY_BY_PART = [
  { part: 'Lower Back', active: 1, resolved: 2 },
  { part: 'Knee', active: 1, resolved: 1 },
  { part: 'Shoulder', active: 0, resolved: 3 },
]
const DEMO_RADAR = [
  { subject: 'Squat', A: 84 }, { subject: 'Bench', A: 79 },
  { subject: 'Deadlift', A: 88 }, { subject: 'Nutrition', A: 84 },
  { subject: 'Sleep', A: 68 }, { subject: 'Adherence', A: 87 },
]

export function AnalyticsPage() {
  const { profile } = useAuthStore()
  const role = profile?.role || 'athlete'
  const [tab, setTab] = useState(role === 'athlete' ? 'personal' : 'team')

  if (role === 'super_admin') return <PlatformAnalyticsView />

  const tabs = role === 'athlete'
    ? [{ id: 'personal', label: 'My Progress' }]
    : [
        { id: 'team',     label: 'Team',          icon: Users },
        { id: 'personal', label: 'Athlete Detail', icon: Activity },
        ...(role === 'admin' ? [{ id: 'staff', label: 'Staff', icon: Trophy }] : []),
      ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Performance insights and trends</p>
      </div>
      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />
      {tab === 'personal' && <PersonalAnalytics />}
      {tab === 'team'     && <TeamAnalytics />}
      {tab === 'staff'    && <StaffAnalytics />}
    </div>
  )
}

function PlatformAnalyticsView() {
  const { orgs } = useOrgStore()
  const PLAN_MRR = { starter: 0, team_pro: 149, enterprise: 499 }

  // Exclude demo orgs from ALL production metrics
  const productionOrgs = useMemo(() => orgs.filter(o => !o.is_demo), [orgs])

  const activeOrgs  = useMemo(() => productionOrgs.filter(o => o.status === 'active'), [productionOrgs])
  const totalMRR    = useMemo(() => activeOrgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0), [activeOrgs])
  const totalARR    = totalMRR * 12
  const paidOrgs    = useMemo(() => activeOrgs.filter(o => o.plan !== 'starter'), [activeOrgs])
  const conversion  = productionOrgs.length > 0 ? Math.round((paidOrgs.length / productionOrgs.length) * 100) : 0
  const totalUsers  = useMemo(() => productionOrgs.reduce((s, o) => s + (o.members?.length || 0), 0), [productionOrgs])
  const newThisMonth = Math.round(productionOrgs.length * 0.18)

  const signupTrend = useMemo(() => {
    const buckets = {}
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const key = i === 0 ? 'W-Now' : `W-${i}`
      buckets[key] = { week: key, signups: 0, churned: 0 }
    }
    for (const org of productionOrgs) {
      if (!org.created_at) continue
      const daysAgo = Math.floor((now - new Date(org.created_at)) / 86400000)
      const wk = Math.floor(daysAgo / 7)
      if (wk <= 6) {
        const key = wk === 0 ? 'W-Now' : `W-${wk}`
        if (buckets[key]) buckets[key].signups++
      }
    }
    return Object.values(buckets)
  }, [productionOrgs])

  const mrrTrend = [
    { month: 'Sep', mrr: Math.round(totalMRR * 0.58), orgs: Math.round(productionOrgs.length * 0.62) },
    { month: 'Oct', mrr: Math.round(totalMRR * 0.67), orgs: Math.round(productionOrgs.length * 0.70) },
    { month: 'Nov', mrr: Math.round(totalMRR * 0.73), orgs: Math.round(productionOrgs.length * 0.76) },
    { month: 'Dec', mrr: Math.round(totalMRR * 0.80), orgs: Math.round(productionOrgs.length * 0.82) },
    { month: 'Jan', mrr: Math.round(totalMRR * 0.87), orgs: Math.round(productionOrgs.length * 0.88) },
    { month: 'Feb', mrr: Math.round(totalMRR * 0.93), orgs: Math.round(productionOrgs.length * 0.94) },
    { month: 'Mar', mrr: totalMRR,                    orgs: productionOrgs.length },
  ]

  const planBreakdown = Object.keys(PLAN_META).map(p => ({
    plan: p, meta: PLAN_META[p],
    count: productionOrgs.filter(o => o.plan === p).length,
    mrr:   productionOrgs.filter(o => o.plan === p && o.status === 'active').reduce(s => s + (PLAN_MRR[p] || 0), 0),
  }))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Platform Analytics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">MRR, ARR, signups, churn, and org-level billing metrics</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR"         value={`$${totalMRR.toLocaleString()}`}            sub="monthly recurring"                      icon={TrendingUp}  color="green"  trendLabel="+12% vs last month" trend={1} />
        <StatCard label="ARR"         value={`$${totalARR.toLocaleString()}`}            sub="annualized run rate"                    icon={CreditCard}  color="purple" />
        <StatCard label="Active Orgs" value={activeOrgs.length}                          sub={`${conversion}% paid`}                  icon={Building2}   color="blue"   trendLabel={`+${newThisMonth} this month`} trend={1} />
        <StatCard label="Total Users" value={totalUsers}                                 sub={`across ${productionOrgs.length} orgs`} icon={Users}       color="yellow" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" /> MRR Growth</CardTitle>
          <CardSubtitle>Monthly recurring revenue and org count over the last 7 months</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrTrend} margin={{ top: 5, right: 12, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...TT} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Line type="monotone" dataKey="mrr"  name="MRR ($)"   stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                <Line type="monotone" dataKey="orgs" name="Org Count" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4 text-purple-400" /> Weekly Signups vs Churn</CardTitle>
            <CardSubtitle>Net new organizations per week</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupTrend} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                  <Bar dataKey="signups" name="New Signups" fill="#a855f7" radius={[3,3,0,0]} />
                  <Bar dataKey="churned" name="Churned"     fill="#ef4444" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-400" /> Revenue by Plan</CardTitle>
            <CardSubtitle>MRR contribution per subscription tier</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {planBreakdown.map(({ plan, meta, count, mrr }) => {
                const pct = totalMRR > 0 ? Math.round((mrr / totalMRR) * 100) : 0
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge color={meta.color}>{meta.label}</Badge>
                        <span className="text-xs text-zinc-500">{count} org{count !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-200">
                        {mrr > 0 ? `$${mrr.toLocaleString()}/mo` : 'Free'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${plan === 'enterprise' ? 'bg-yellow-500' : plan === 'team_pro' ? 'bg-purple-500' : 'bg-zinc-600'}`}
                        style={{ width: `${pct || (plan === 'starter' ? 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="w-4 h-4 text-zinc-400" /> Production Organizations</CardTitle>
          <CardSubtitle>Subscription status and usage — demo orgs excluded</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Organization','Plan','Status','Athletes','MRR','ARR'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productionOrgs.map((org, i) => {
                  const planInfo = PLAN_META[org.plan] || PLAN_META.starter
                  const mrr = PLAN_MRR[org.plan] || 0
                  const athletes = (org.members || []).filter(m => (m.org_role || m.role) === 'athlete').length
                  return (
                    <tr key={org.id} className={`border-b border-zinc-800/60 last:border-0 ${i % 2 === 0 ? 'bg-zinc-800/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                          </div>
                          <span className="text-sm font-medium text-zinc-200">{org.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge color={planInfo.color}>{planInfo.label}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge color={org.status === 'active' ? 'green' : 'red'} className="capitalize">{org.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{athletes}/{org.athlete_limit}</td>
                      <td className="px-4 py-3 text-green-400 font-medium">{mrr > 0 ? `$${mrr}` : '—'}</td>
                      <td className="px-4 py-3 text-zinc-400">{mrr > 0 ? `$${(mrr * 12).toLocaleString()}` : '—'}</td>
                    </tr>
                  )
                })}
                {productionOrgs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">No production organizations yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function PersonalAnalytics() {
  const { user, isDemo, activeOrgId } = useAuthStore()
  const { personal, personalLoading, loadPersonalAnalytics, invalidatePersonal } = useAnalyticsStore()

  useEffect(() => {
    if (!isDemo && user?.id) loadPersonalAnalytics(user.id, activeOrgId)
  }, [user?.id, activeOrgId, isDemo])

  const strengthTrend  = isDemo ? MOCK_STRENGTH_TREND  : (personal?.strengthTrend  ?? [])
  const adherenceTrend = isDemo ? MOCK_ADHERENCE_TREND : (personal?.adherenceTrend ?? [])
  const wellnessTrend  = isDemo ? DEMO_WELLNESS        : (personal?.wellnessTrend  ?? [])
  const volumeTrend    = isDemo ? DEMO_VOLUME          : (personal?.volumeTrend    ?? [])
  const bwTrend        = isDemo ? DEMO_BW              : (personal?.bwTrend        ?? [])
  const radarData      = isDemo ? DEMO_RADAR           : (personal?.radarData      ?? [])
  const prRows         = isDemo ? [
    { lift: 'Squat',    weight: 210,   reps: 1, e1rm: 220, date: 'Feb 28' },
    { lift: 'Bench',    weight: 147,   reps: 1, e1rm: 155, date: 'Feb 24' },
    { lift: 'Deadlift', weight: 272.5, reps: 1, e1rm: 280, date: 'Feb 25' },
  ] : (personal?.prRows ?? [])

  const totalCompleted = isDemo ? 47     : (personal?.totalCompleted ?? null)
  const adherenceScore = isDemo ? 87     : (personal?.adherenceScore ?? null)
  const avgSleep       = isDemo ? '6.8h' : (personal?.avgSleep       ?? null)
  const nutScore       = isDemo ? 84     : (personal?.nutScore        ?? null)
  const avgRPE         = isDemo ? 7.2    : (personal?.avgRPE          ?? null)
  const activeInj      = isDemo ? 0      : (personal?.activeInjuries  ?? null)

  if (!isDemo && personalLoading) return <LoadingState label="Loading your analytics…" />

  return (
    <div className="space-y-6">
      {!isDemo && (
        <div className="flex justify-end">
          <button
            onClick={() => { invalidatePersonal(); loadPersonalAnalytics(user?.id, activeOrgId) }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh data
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Workouts Completed" value={totalCompleted != null ? String(totalCompleted) : '—'} sub="last 6 months"  icon={Zap}      color="purple" />
        <StatCard label="Adherence Rate"     value={adherenceScore != null ? `${adherenceScore}%`  : '—'} sub="4-week avg"    icon={Activity} color="green"  trendLabel={adherenceScore >= 80 ? '+on track' : undefined} trend={adherenceScore >= 80 ? 1 : undefined} />
        <StatCard label="Avg Sleep"          value={avgSleep ?? '—'}                                        sub="this week"     icon={Moon}     color="blue"   />
        <StatCard label="Nutrition Score"    value={nutScore != null ? `${nutScore}%` : '—'}               sub="compliance"    icon={Flame}    color="orange" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Avg Session RPE"    value={avgRPE != null ? String(avgRPE) : '—'}                                         sub="last 14 sessions"  icon={BarChart3}    color="yellow" />
        <StatCard label="Active Injuries"    value={activeInj != null ? String(activeInj) : '—'}                                  sub="flagged"            icon={AlertTriangle} color={activeInj > 0 ? 'red' : 'green'} />
        <StatCard label="Best Squat e1RM"    value={prRows.find(r => r.lift === 'Squat')    ? `${prRows.find(r => r.lift === 'Squat').e1rm}kg`    : '—'} sub="all-time" icon={Trophy} color="purple" />
        <StatCard label="Best Deadlift e1RM" value={prRows.find(r => r.lift === 'Deadlift') ? `${prRows.find(r => r.lift === 'Deadlift').e1rm}kg` : '—'} sub="all-time" icon={Trophy} color="orange" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated 1RM Trend</CardTitle>
          <CardSubtitle>Monthly progression on competition lifts — kg (Epley formula)</CardSubtitle>
        </CardHeader>
        <CardBody>
          {strengthTrend.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={strengthTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                  <Line type="monotone" dataKey="squat"    stroke={CC.squat}    strokeWidth={2} dot={{ fill: CC.squat,    r: 4 }} name="Squat"    connectNulls />
                  <Line type="monotone" dataKey="bench"    stroke={CC.bench}    strokeWidth={2} dot={{ fill: CC.bench,    r: 4 }} name="Bench"    connectNulls />
                  <Line type="monotone" dataKey="deadlift" stroke={CC.deadlift} strokeWidth={2} dot={{ fill: CC.deadlift, r: 4 }} name="Deadlift" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No strength data yet — log completed workout sets to see your e1RM trend" />
          )}
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Adherence & Nutrition</CardTitle>
            <CardSubtitle>Weekly compliance percentages</CardSubtitle>
          </CardHeader>
          <CardBody>
            {adherenceTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adherenceTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                    <Bar dataKey="adherence" fill={CC.adherence} radius={[3,3,0,0]} name="Workout %" />
                    <Bar dataKey="nutrition" fill={CC.nutrition} radius={[3,3,0,0]} name="Nutrition %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Log completed sessions and nutrition to see compliance" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Training Volume</CardTitle>
            <CardSubtitle>Total kg lifted per week</CardSubtitle>
          </CardHeader>
          <CardBody>
            {volumeTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CC.volume} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CC.volume} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Area type="monotone" dataKey="volume" stroke={CC.volume} fill="url(#volGrad)" strokeWidth={2} name="Volume (kg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No volume data yet" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Wellness Trend</CardTitle>
            <CardSubtitle>Weekly avg sleep (hrs), stress, soreness & motivation (1–10)</CardSubtitle>
          </CardHeader>
          <CardBody>
            {wellnessTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wellnessTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="sleep"      stroke={CC.sleep}      strokeWidth={2} name="Sleep (h)"  dot={false} />
                    <Line type="monotone" dataKey="stress"     stroke={CC.stress}     strokeWidth={2} name="Stress"     dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="soreness"   stroke={CC.soreness}   strokeWidth={2} name="Soreness"   dot={false} strokeDasharray="2 2" />
                    <Line type="monotone" dataKey="motivation" stroke={CC.motivation} strokeWidth={2} name="Motivation" dot={false} strokeDasharray="6 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Submit daily check-ins to track wellness trends" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bodyweight Trend</CardTitle>
            <CardSubtitle>From check-in logs (kg)</CardSubtitle>
          </CardHeader>
          <CardBody>
            {bwTrend.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bwTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CC.bw} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CC.bw} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                    <Tooltip {...TT} />
                    <Area type="monotone" dataKey="bw" stroke={CC.bw} fill="url(#bwGrad)" strokeWidth={2} name="Bodyweight (kg)" dot={{ fill: CC.bw, r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Log bodyweight in check-ins to track your cut/bulk" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Profile</CardTitle>
            <CardSubtitle>Current cycle overview (0–100)</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-52">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11 }} />
                    <Radar name="Athlete" dataKey="A" stroke={CC.squat} fill={CC.squat} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="Complete sessions and check-ins to build your profile" />
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly RPE Trend</CardTitle>
            <CardSubtitle>Average session RPE per week (1–10)</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-52">
              {adherenceTrend.some(w => w.rpe != null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={adherenceTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} domain={[1, 10]} />
                    <Tooltip {...TT} />
                    <Line type="monotone" dataKey="rpe" stroke={CC.nutrition} strokeWidth={2} name="Avg RPE" dot={{ fill: CC.nutrition, r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="RPE data will appear after completing workouts" />
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Personal Records — Competition Lifts</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  {['Lift','Top Set','Reps','e1RM','Date'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {prRows.length > 0 ? prRows.map(r => (
                  <tr key={r.lift} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-200">{r.lift}</td>
                    <td className="py-3 px-4 text-zinc-300">{r.weight}kg</td>
                    <td className="py-3 px-4 text-zinc-400">{r.reps}</td>
                    <td className="py-3 px-4 text-yellow-400 font-bold">{r.e1rm}kg</td>
                    <td className="py-3 px-4 text-zinc-400">{r.date}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                      No PR records yet — log completed sets to track your maxes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {!isDemo && personal?.injuryHistory?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Injury History
            </CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    {['Body Part','Severity','Status','Reported'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-zinc-500 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {personal.injuryHistory.map(inj => (
                    <tr key={inj.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 text-zinc-200 font-medium">{inj.body_part}</td>
                      <td className="py-3 px-4">
                        <Badge color={inj.severity === 'severe' ? 'red' : inj.severity === 'moderate' ? 'orange' : 'yellow'}>{inj.severity}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={inj.status === 'active' ? 'red' : 'green'}>{inj.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-xs">
                        {new Date(inj.reported_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function TeamAnalytics() {
  const { isDemo, activeOrgId } = useAuthStore()
  const { team, teamLoading, loadTeamAnalytics, invalidateTeam } = useAnalyticsStore()

  useEffect(() => {
    if (!isDemo && activeOrgId) loadTeamAnalytics(activeOrgId)
  }, [activeOrgId, isDemo])

  const athletes      = isDemo ? MOCK_ATHLETES       : (team?.athletes         ?? [])
  const teamAdherence = isDemo ? MOCK_TEAM_ADHERENCE : (team?.teamAdherence    ?? [])
  const volumeTrend   = isDemo ? DEMO_TEAM_VOLUME    : (team?.teamVolumeTrend  ?? [])
  const wellnessTrend = isDemo ? DEMO_TEAM_WELLNESS  : (team?.teamWellnessTrend ?? [])
  const injuryByPart  = isDemo ? DEMO_INJURY_BY_PART : (team?.injuryByPart     ?? [])
  const flagged       = isDemo ? athletes.filter(a => a.flags?.length > 0) : (team?.flagged ?? [])

  const avgAdherence   = isDemo
    ? (athletes.length ? Math.round(athletes.reduce((s, a) => s + a.adherence, 0) / athletes.length) : null)
    : (team?.avgTeamAdherence ?? null)
  const teamNutScore   = isDemo ? 83 : (team?.teamNutScore   ?? null)
  const activeInjuries = isDemo ? 2  : (team?.activeInjuries ?? null)
  const totalPRs       = isDemo ? 11 : (team?.totalPRs       ?? null)

  if (!isDemo && teamLoading) return <LoadingState label="Loading team analytics…" />

  return (
    <div className="space-y-6">
      {!isDemo && (
        <div className="flex justify-end">
          <button
            onClick={() => { invalidateTeam(); loadTeamAnalytics(activeOrgId) }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh data
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Adherence"  value={avgAdherence   != null ? `${avgAdherence}%`     : '—'} sub="4-week avg"      icon={Zap}           color="purple" />
        <StatCard label="Active Athletes" value={athletes.length > 0 ? String(athletes.length)  : '—'} sub="on roster"       icon={Users}         color="blue"   />
        <StatCard label="Team Nutrition"  value={teamNutScore   != null ? `${teamNutScore}%`     : '—'} sub="compliance avg"  icon={Flame}         color="orange" />
        <StatCard label="Active Injuries" value={activeInjuries != null ? String(activeInjuries) : '—'} sub="flagged"         icon={AlertTriangle} color={activeInjuries > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team PRs (90d)"    value={totalPRs != null ? String(totalPRs) : '—'}                                                                                                       sub="new records set"  icon={Trophy} color="yellow" />
        <StatCard label="Athletes Flagged"  value={String(flagged.length)}                                                                                                                          sub="needs attention"  icon={AlertTriangle} color={flagged.length > 0 ? 'orange' : 'green'} />
        <StatCard label="Avg Squat e1RM"    value={athletes.filter(a => a.e1rm_squat > 0).length    ? `${Math.round(athletes.filter(a => a.e1rm_squat > 0).reduce((s, a) => s + a.e1rm_squat, 0)    / athletes.filter(a => a.e1rm_squat > 0).length)}kg`    : '—'} sub="team avg" icon={Target} color="purple" />
        <StatCard label="Avg Deadlift e1RM" value={athletes.filter(a => a.e1rm_deadlift > 0).length ? `${Math.round(athletes.filter(a => a.e1rm_deadlift > 0).reduce((s, a) => s + a.e1rm_deadlift, 0) / athletes.filter(a => a.e1rm_deadlift > 0).length)}kg` : '—'} sub="team avg" icon={Target} color="orange" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Team Adherence by Athlete</CardTitle></CardHeader>
          <CardBody>
            {teamAdherence.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamAdherence} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                    <YAxis dataKey="athlete" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
                    <Tooltip {...TT} />
                    <Bar dataKey="adherence" fill={CC.squat} radius={[0,3,3,0]} name="Adherence %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No session data yet for this org" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Volume Trend</CardTitle>
            <CardSubtitle>Total tonnes lifted per week across all athletes</CardSubtitle>
          </CardHeader>
          <CardBody>
            {volumeTrend.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <defs>
                      <linearGradient id="tvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CC.volume} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CC.volume} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Area type="monotone" dataKey="volume" stroke={CC.volume} fill="url(#tvGrad)" strokeWidth={2} name="Volume (t)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No volume data yet" />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Team Wellness</CardTitle>
            <CardSubtitle>Daily avg sleep, stress & soreness from check-ins</CardSubtitle>
          </CardHeader>
          <CardBody>
            {wellnessTrend.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wellnessTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                    <Line type="monotone" dataKey="sleep"    stroke={CC.sleep}    strokeWidth={2} name="Sleep (h)" dot={false} />
                    <Line type="monotone" dataKey="stress"   stroke={CC.stress}   strokeWidth={2} name="Stress"    dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="soreness" stroke={CC.soreness} strokeWidth={2} name="Soreness"  dot={false} strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="Check-in data will appear once athletes submit check-ins" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Injury Overview</CardTitle>
            <CardSubtitle>Active vs resolved injuries by body part</CardSubtitle>
          </CardHeader>
          <CardBody>
            {injuryByPart.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={injuryByPart} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="part" type="category" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                    <Bar dataKey="active"   name="Active"   fill="#ef4444" radius={[0,3,3,0]} stackId="a" />
                    <Bar dataKey="resolved" name="Resolved" fill="#3f3f46" radius={[0,3,3,0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart label="No injuries reported for this org" />
            )}
          </CardBody>
        </Card>
      </div>

      {flagged.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" /> Athletes Needing Attention
            </CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {flagged.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 bg-zinc-700/30 rounded-lg">
                  <Avatar name={a.full_name} role="athlete" size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200">{a.display_name || a.full_name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(a.flags || []).map(flag => <FlagBadge key={flag} flag={flag} />)}
                      {(a.computed_adherence != null && a.computed_adherence < 60) && <Badge color="orange">Low Adherence</Badge>}
                    </div>
                  </div>
                  <span className={cn('text-sm font-bold', adherenceColor(a.computed_adherence ?? a.adherence))}>
                    {a.computed_adherence ?? a.adherence}%
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Roster Overview</CardTitle></CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  {['Athlete','Class','Adherence','Total e1RM','Squat','Bench','Deadlift','Sleep','Stress','Last Session'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-zinc-500 px-3 py-3 first:pl-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {athletes.length > 0 ? athletes.map(a => (
                  <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={a.full_name} role="athlete" size="xs" />
                        <span className="font-medium text-zinc-200">{a.display_name || a.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-400">{a.weight_class || '—'}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-bold', adherenceColor(a.adherence))}>{a.adherence}%</span>
                        <ProgressBar value={a.adherence} max={100} color={a.adherence >= 85 ? 'green' : a.adherence >= 70 ? 'yellow' : 'red'} size="sm" className="w-14" />
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-zinc-200">{(a.e1rm_squat||0)+(a.e1rm_bench||0)+(a.e1rm_deadlift||0)}kg</td>
                    <td className="py-3 px-3 text-purple-400">{a.e1rm_squat    > 0 ? `${a.e1rm_squat}kg`    : '—'}</td>
                    <td className="py-3 px-3 text-blue-400"  >{a.e1rm_bench    > 0 ? `${a.e1rm_bench}kg`    : '—'}</td>
                    <td className="py-3 px-3 text-orange-400">{a.e1rm_deadlift > 0 ? `${a.e1rm_deadlift}kg` : '—'}</td>
                    <td className="py-3 px-3 text-zinc-400">{a.sleep_avg  > 0 ? `${a.sleep_avg}h`    : '—'}</td>
                    <td className="py-3 px-3 text-zinc-400">{a.stress_avg > 0 ? `${a.stress_avg}/10` : '—'}</td>
                    <td className="py-3 px-3 text-zinc-400 text-xs">{a.last_session || '—'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-zinc-500">No athletes on this roster yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function StaffAnalytics() {
  const { isDemo, activeOrgId } = useAuthStore()
  const { team, teamLoading, loadTeamAnalytics, invalidateTeam } = useAnalyticsStore()

  useEffect(() => {
    if (!isDemo && activeOrgId) loadTeamAnalytics(activeOrgId)
  }, [activeOrgId, isDemo])

  const coachRows = isDemo ? [
    { user_id: 'c1', name: 'Elena Torres', org_role: 'head_coach', athletes: 6, adherence: 86, activeInjuries: 0 },
    { user_id: 'c2', name: 'Coach Marcus', org_role: 'coach',      athletes: 3, adherence: 91, activeInjuries: 1 },
  ] : (team?.staffRows ?? [])

  const athletes       = isDemo ? MOCK_ATHLETES : (team?.athletes ?? [])
  const avgAdherence   = isDemo ? 88            : (team?.avgTeamAdherence ?? null)
  const activeInjuries = isDemo ? 2             : (team?.activeInjuries   ?? null)
  const totalPRs       = isDemo ? 11            : (team?.totalPRs         ?? null)
  const teamNutScore   = isDemo ? 83            : (team?.teamNutScore     ?? null)

  if (!isDemo && teamLoading) return <LoadingState label="Loading staff analytics…" />

  return (
    <div className="space-y-6">
      {!isDemo && (
        <div className="flex justify-end">
          <button
            onClick={() => { invalidateTeam(); loadTeamAnalytics(activeOrgId) }}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh data
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Staff Members"    value={coachRows.length > 0 ? String(coachRows.length) : '—'} sub="coaches & admins"   icon={Users}         color="blue"   />
        <StatCard label="Team Adherence"   value={avgAdherence   != null ? `${avgAdherence}%`     : '—'} sub="avg across roster"  icon={Activity}      color="green"  />
        <StatCard label="Active Injuries"  value={activeInjuries != null ? String(activeInjuries) : '—'} sub="active cases"       icon={AlertTriangle} color={activeInjuries > 0 ? 'red' : 'green'} />
        <StatCard label="Team Nutrition"   value={teamNutScore   != null ? `${teamNutScore}%`     : '—'} sub="compliance avg"     icon={Flame}         color="orange" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coaching Staff Overview</CardTitle>
          <CardSubtitle>Per-coach metrics — athlete load, team adherence, active injury cases</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  {['Staff Member','Role','Athletes','Avg Adherence','Active Injuries','Joined'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-zinc-500 px-4 py-3 first:pl-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {coachRows.length > 0 ? coachRows.map(c => (
                  <tr key={c.user_id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 pl-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={c.name} role="coach" size="xs" />
                        <span className="font-medium text-zinc-200">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge color="blue" className="capitalize">{(c.org_role || '').replace(/_/g,' ')}</Badge>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{c.athletes ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className={cn('font-bold', adherenceColor(c.adherence))}>
                        {typeof c.adherence === 'number' ? `${c.adherence}%` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge color={c.activeInjuries > 0 ? 'red' : 'green'}>{c.activeInjuries ?? 0}</Badge>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-xs">
                      {c.joined_at ? new Date(c.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-zinc-500">No coaching staff found for this org</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Athlete Roster Health</CardTitle>
          <CardSubtitle>e1RM total and adherence per athlete (top 12)</CardSubtitle>
        </CardHeader>
        <CardBody>
          {athletes.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={athletes.slice(0, 12).map(a => ({
                    name: (a.display_name || a.full_name || '').split(' ')[0],
                    total: (a.e1rm_squat||0) + (a.e1rm_bench||0) + (a.e1rm_deadlift||0),
                    adh: a.adherence || 0,
                  }))}
                  margin={{ top: 5, right: 10, bottom: 24, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                  <YAxis yAxisId="left"  tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0,100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }} />
                  <Bar yAxisId="left"  dataKey="total" name="e1RM Total (kg)" fill={CC.squat}     radius={[3,3,0,0]} />
                  <Bar yAxisId="right" dataKey="adh"   name="Adherence %"     fill={CC.adherence} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="No athlete data available for this org" />
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function FlagBadge({ flag }) {
  const map = {
    pain_flag:       { label: 'Pain',      color: 'red' },
    missed_sessions: { label: 'Missed',    color: 'orange' },
    low_sleep:       { label: 'Low Sleep', color: 'blue' },
  }
  const f = map[flag] || { label: flag, color: 'default' }
  return <Badge color={f.color}>{f.label}</Badge>
}

function EmptyChart({ label }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[100px] text-sm text-zinc-500 text-center px-4">
      {label}
    </div>
  )
}

function LoadingState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
      <Loader2 className="w-6 h-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
