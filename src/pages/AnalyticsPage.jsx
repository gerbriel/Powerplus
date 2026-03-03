import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, Users, Zap, Moon, Flame, Activity, Trophy, AlertTriangle, CreditCard, Building2, Globe, CheckCircle2 } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { StatCard } from '../components/ui/StatCard'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { MOCK_STRENGTH_TREND, MOCK_ADHERENCE_TREND, MOCK_TEAM_ADHERENCE, MOCK_ATHLETES, PLAN_META } from '../lib/mockData'
import { cn, adherenceColor } from '../lib/utils'
import { useAuthStore, useOrgStore } from '../lib/store'

const CHART_COLORS = {
  squat: '#d946ef',
  bench: '#3b82f6',
  deadlift: '#f97316',
  adherence: '#22c55e',
  nutrition: '#eab308',
}

const chartTooltipStyle = {
  contentStyle: { backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '8px', color: '#f4f4f5', fontSize: '12px' },
  labelStyle: { color: '#a1a1aa' },
}

export function AnalyticsPage() {
  const { profile } = useAuthStore()
  const role = profile?.role || 'athlete'
  const [tab, setTab] = useState(role === 'athlete' ? 'personal' : 'team')

  // Platform admins see SaaS-level analytics, not athlete data
  if (role === 'super_admin') return <PlatformAnalyticsView />

  const tabs = role === 'athlete'
    ? [{ id: 'personal', label: 'My Progress' }]
    : [
        { id: 'team', label: 'Team', icon: Users },
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
      {tab === 'team' && <TeamAnalytics />}
      {tab === 'staff' && <StaffAnalytics />}
    </div>
  )
}

function PlatformAnalyticsView() {
  const { orgs } = useOrgStore()

  const PLAN_MRR = { starter: 0, team_pro: 149, enterprise: 499 }

  const activeOrgs  = useMemo(() => orgs.filter((o) => o.status === 'active'), [orgs])
  const totalMRR    = useMemo(() => activeOrgs.reduce((s, o) => s + (PLAN_MRR[o.plan] || 0), 0), [activeOrgs])
  const totalARR    = totalMRR * 12
  const paidOrgs    = useMemo(() => activeOrgs.filter((o) => o.plan !== 'starter'), [activeOrgs])
  const conversion  = orgs.length > 0 ? Math.round((paidOrgs.length / orgs.length) * 100) : 0
  const totalUsers  = useMemo(() => orgs.reduce((s, o) => s + o.members.length, 0), [orgs])
  const newThisMonth = Math.round(orgs.length * 0.18) // mock: ~18% new this month

  const mrrTrend = [
    { month: 'Sep', mrr: Math.round(totalMRR * 0.58), orgs: Math.round(orgs.length * 0.62) },
    { month: 'Oct', mrr: Math.round(totalMRR * 0.67), orgs: Math.round(orgs.length * 0.70) },
    { month: 'Nov', mrr: Math.round(totalMRR * 0.73), orgs: Math.round(orgs.length * 0.76) },
    { month: 'Dec', mrr: Math.round(totalMRR * 0.80), orgs: Math.round(orgs.length * 0.82) },
    { month: 'Jan', mrr: Math.round(totalMRR * 0.87), orgs: Math.round(orgs.length * 0.88) },
    { month: 'Feb', mrr: Math.round(totalMRR * 0.93), orgs: Math.round(orgs.length * 0.94) },
    { month: 'Mar', mrr: totalMRR,                    orgs: orgs.length },
  ]

  const signupTrend = [
    { week: 'W-6', signups: 4, churned: 1 },
    { week: 'W-5', signups: 3, churned: 0 },
    { week: 'W-4', signups: 7, churned: 1 },
    { week: 'W-3', signups: 5, churned: 0 },
    { week: 'W-2', signups: 6, churned: 2 },
    { week: 'W-1', signups: 8, churned: 1 },
    { week: 'Now', signups: 3, churned: 0 },
  ]

  const planBreakdown = Object.keys(PLAN_META).map((p) => ({
    plan: p,
    meta: PLAN_META[p],
    count: orgs.filter((o) => o.plan === p).length,
    mrr: orgs.filter((o) => o.plan === p && o.status === 'active').reduce((s) => s + (PLAN_MRR[p] || 0), 0),
  }))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Platform Analytics</h1>
        <p className="text-sm text-zinc-400 mt-0.5">MRR, ARR, signups, churn, and org-level billing metrics</p>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="MRR"         value={`$${totalMRR.toLocaleString()}`}  sub="monthly recurring"           icon={TrendingUp}  color="green"  trendLabel="+12% vs last month" trend={1} />
        <StatCard label="ARR"         value={`$${totalARR.toLocaleString()}`}   sub="annualized run rate"         icon={CreditCard}  color="purple" />
        <StatCard label="Active Orgs" value={activeOrgs.length}                 sub={`${conversion}% paid`}       icon={Building2}   color="blue"   trendLabel={`+${newThisMonth} this month`} trend={1} />
        <StatCard label="Total Users" value={totalUsers}                        sub={`across ${orgs.length} orgs`} icon={Users}       color="yellow" />
      </div>

      {/* MRR growth line chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" /> MRR Growth
          </CardTitle>
          <CardSubtitle>Monthly recurring revenue and org count over the last 7 months</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mrrTrend} margin={{ top: 5, right: 12, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Line type="monotone" dataKey="mrr"  name="MRR ($)"   stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                <Line type="monotone" dataKey="orgs" name="Org Count" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Signups vs churn + plan mix */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Weekly Signups vs Churn
            </CardTitle>
            <CardSubtitle>Net new organizations per week</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={signupTrend} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltipStyle} />
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
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" /> Revenue by Plan
            </CardTitle>
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

      {/* Org table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-400" /> All Organizations
          </CardTitle>
          <CardSubtitle>Subscription status and usage across every org</CardSubtitle>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Organization', 'Plan', 'Status', 'Athletes', 'MRR', 'ARR'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, i) => {
                  const planInfo = PLAN_META[org.plan] || PLAN_META.starter
                  const mrr = PLAN_MRR[org.plan] || 0
                  const athletes = org.members.filter((m) => m.role === 'athlete').length
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
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function PersonalAnalytics() {
  const { isDemo } = useAuthStore()
  const strengthTrend  = isDemo ? MOCK_STRENGTH_TREND : []
  const adherenceTrend = isDemo ? MOCK_ADHERENCE_TREND : []
  const radarData = isDemo ? [
    { subject: 'Squat', A: 84 },
    { subject: 'Bench', A: 79 },
    { subject: 'Deadlift', A: 88 },
    { subject: 'Nutrition', A: 84 },
    { subject: 'Sleep', A: 68 },
    { subject: 'Adherence', A: 87 },
  ] : []
  const prRows = isDemo ? [
    { lift: 'Squat',    rm1: 210,   rm3: 195, e1rm: 220, date: 'Feb 28', source: 'Gym' },
    { lift: 'Bench',    rm1: 147,   rm3: 140, e1rm: 155, date: 'Feb 24', source: 'Gym' },
    { lift: 'Deadlift', rm1: 272.5, rm3: 255, e1rm: 280, date: 'Feb 25', source: 'Gym' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Workouts Completed" value={isDemo ? '47' : '—'} sub="this block" icon={Zap} color="purple" />
        <StatCard label="Adherence Rate" value={isDemo ? '87%' : '—'} sub="8-week avg" icon={Activity} color="green" trendLabel={isDemo ? '+2% vs last' : undefined} trend={isDemo ? 1 : undefined} />
        <StatCard label="Avg Sleep" value={isDemo ? '6.8h' : '—'} sub="this week" icon={Moon} color="blue" trendLabel={isDemo ? '-0.2h vs goal' : undefined} trend={isDemo ? -1 : undefined} />
        <StatCard label="Nutrition Score" value={isDemo ? '84%' : '—'} sub="this week" icon={Flame} color="orange" trendLabel={isDemo ? '+4% vs last' : undefined} trend={isDemo ? 1 : undefined} />
      </div>

      {/* Strength trend */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated 1RM Trend</CardTitle>
          <CardSubtitle>Monthly progression on competition lifts (kg)</CardSubtitle>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={strengthTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
              <Line type="monotone" dataKey="squat" stroke={CHART_COLORS.squat} strokeWidth={2} dot={{ fill: CHART_COLORS.squat, r: 4 }} name="Squat" />
              <Line type="monotone" dataKey="bench" stroke={CHART_COLORS.bench} strokeWidth={2} dot={{ fill: CHART_COLORS.bench, r: 4 }} name="Bench" />
              <Line type="monotone" dataKey="deadlift" stroke={CHART_COLORS.deadlift} strokeWidth={2} dot={{ fill: CHART_COLORS.deadlift, r: 4 }} name="Deadlift" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Adherence trend */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Adherence & Nutrition</CardTitle>
            <CardSubtitle>Weekly compliance percentages</CardSubtitle>
          </CardHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adherenceTrend} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="week" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip {...chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }} />
                <Bar dataKey="adherence" fill={CHART_COLORS.adherence} radius={[3, 3, 0, 0]} name="Workout %" />
                <Bar dataKey="nutrition" fill={CHART_COLORS.nutrition} radius={[3, 3, 0, 0]} name="Nutrition %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Profile</CardTitle>
            <CardSubtitle>Current cycle overview (0–100%)</CardSubtitle>
          </CardHeader>
          <div className="h-48">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="#3f3f46" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <Radar name="Athlete" dataKey="A" stroke="#d946ef" fill="#d946ef" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-zinc-500">No performance data yet</div>
            )}
          </div>
        </Card>
      </div>

      {/* PR log */}
      <Card>
        <CardHeader><CardTitle>Personal Records — Competition Lifts</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {['Lift', '1RM', '3RM', 'e1RM', 'Date', 'Source'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {prRows.length > 0 ? prRows.map((r) => (
                <tr key={r.lift} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-zinc-200">{r.lift}</td>
                  <td className="py-2.5 pr-4 text-purple-400 font-bold">{r.rm1}kg</td>
                  <td className="py-2.5 pr-4 text-zinc-300">{r.rm3}kg</td>
                  <td className="py-2.5 pr-4 text-yellow-400 font-bold">{r.e1rm}kg</td>
                  <td className="py-2.5 pr-4 text-zinc-400">{r.date}</td>
                  <td className="py-2.5"><Badge color="default">{r.source}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-zinc-500">No PR records yet — log your maxes to track progress</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function TeamAnalytics() {
  const { isDemo } = useAuthStore()
  const teamAdherence = isDemo ? MOCK_TEAM_ADHERENCE : []
  const athletes      = isDemo ? MOCK_ATHLETES : []

  const avgAdherence = athletes.length
    ? Math.round(athletes.reduce((s, a) => s + a.adherence, 0) / athletes.length)
    : null
  const flagCount = athletes.reduce((s, a) => s + (a.flags?.length > 0 ? 1 : 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Team Adherence"  value={avgAdherence != null ? `${avgAdherence}%` : '—'} sub="this week"       icon={Zap}           color="purple" />
        <StatCard label="Active Athletes" value={athletes.length > 0 ? String(athletes.length) : '—'} sub={athletes.length > 0 ? `on roster` : 'no athletes yet'} icon={Users} color="blue" />
        <StatCard label="Nutrition Avg"   value={isDemo ? '83%' : '—'}                               sub="compliance"    icon={Flame}         color="orange" />
        <StatCard label="Flags Active"    value={athletes.length > 0 ? String(flagCount) : '—'}      sub="needs attention" icon={AlertTriangle} color="red" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Team Adherence by Athlete</CardTitle></CardHeader>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamAdherence} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <YAxis dataKey="athlete" type="category" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="adherence" fill="#d946ef" radius={[0, 3, 3, 0]} name="Adherence %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Athletes Needing Attention</CardTitle></CardHeader>
          <div className="space-y-3">
            {athletes.filter(a => a.flags.length > 0).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 bg-zinc-700/30 rounded-lg">
                <Avatar name={a.full_name} role="athlete" size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200">{a.full_name}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {a.flags.map((flag) => (
                      <FlagBadge key={flag} flag={flag} />
                    ))}
                  </div>
                </div>
                <span className={cn('text-sm font-bold', adherenceColor(a.adherence))}>{a.adherence}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Full roster */}
      <Card>
        <CardHeader><CardTitle>Roster Overview</CardTitle></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {['Athlete', 'Class', 'Adherence', 'e1RM Total', 'Squat', 'Bench', 'Deadlift', 'Last Session'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 pb-2 pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {athletes.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={a.full_name} role="athlete" size="xs" />
                      <span className="font-medium text-zinc-200">{a.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-zinc-400">{a.weight_class}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold', adherenceColor(a.adherence))}>{a.adherence}%</span>
                      <ProgressBar value={a.adherence} max={100} color={a.adherence >= 85 ? 'green' : a.adherence >= 70 ? 'yellow' : 'red'} size="sm" className="w-16" />
                    </div>
                  </td>
                  <td className="py-3 pr-3 font-bold text-zinc-200">{a.e1rm_squat + a.e1rm_bench + a.e1rm_deadlift}kg</td>
                  <td className="py-3 pr-3 text-purple-400">{a.e1rm_squat}kg</td>
                  <td className="py-3 pr-3 text-blue-400">{a.e1rm_bench}kg</td>
                  <td className="py-3 pr-3 text-orange-400">{a.e1rm_deadlift}kg</td>
                  <td className="py-3 text-zinc-400 text-xs">{a.last_session}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StaffAnalytics() {
  const { isDemo } = useAuthStore()
  const coachRows = isDemo ? [
    { name: 'Elena Torres', athletes: 6, adherence: 86, adj: 4, response: '47min', injury: '0.3/mo' },
    { name: 'Coach Marcus', athletes: 3, adherence: 91, adj: 2, response: '22min', injury: '0.1/mo' },
  ] : []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Coach Avg Response"  value={isDemo ? '47min' : '—'} sub="last 7 days"  icon={Activity}      color="blue"   />
        <StatCard label="Program Adjustments" value={isDemo ? '12'    : '—'} sub="this week"    icon={Zap}           color="purple" />
        <StatCard label="Athlete Retention"   value={isDemo ? '100%'  : '—'} sub="all-time"     icon={Users}         color="green"  />
        <StatCard label="Injury Reports"      value={isDemo ? '2'     : '—'} sub="active cases" icon={AlertTriangle} color="red"    />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coach Performance Dashboard</CardTitle>
          <CardSubtitle>Constructive metrics to support coaching quality</CardSubtitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                {['Coach', 'Athletes', 'Avg Adherence', 'Adj/Week', 'Avg Response', 'Injury Rate'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-500 pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {coachRows.length > 0 ? coachRows.map((c) => (
                <tr key={c.name} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.name} role="coach" size="xs" />
                      <span className="font-medium text-zinc-200">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-zinc-400">{c.athletes}</td>
                  <td className="py-3 pr-4"><span className={cn('font-bold', adherenceColor(c.adherence))}>{c.adherence}%</span></td>
                  <td className="py-3 pr-4 text-zinc-300">{c.adj}</td>
                  <td className="py-3 pr-4 text-zinc-300">{c.response}</td>
                  <td className="py-3"><Badge color="green">{c.injury}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-zinc-500">No coaching data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function FlagBadge({ flag }) {
  const map = {
    pain_flag: { label: 'Pain', color: 'red' },
    missed_sessions: { label: 'Missed', color: 'orange' },
    low_sleep: { label: 'Low Sleep', color: 'blue' },
  }
  const f = map[flag] || { label: flag, color: 'default' }
  return <Badge color={f.color}>{f.label}</Badge>
}
