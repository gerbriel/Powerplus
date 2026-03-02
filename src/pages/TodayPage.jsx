import { useState } from 'react'
import { Zap, CheckCircle2, Circle, Clock, Flame, Droplets, Moon, Dumbbell, MessageSquare, ChevronRight, AlertCircle, Trophy, Scale, Users, TrendingUp, TrendingDown, AlertTriangle, Activity, Target, BarChart2, Shield, Stethoscope, Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatCard } from '../components/ui/StatCard'
import { Slider } from '../components/ui/Slider'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { MOCK_TODAY_WORKOUT, MOCK_NUTRITION_TODAY, MOCK_NOTIFICATIONS, MOCK_ATHLETES, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_STAFF_ASSIGNMENTS } from '../lib/mockData'
import { useAuthStore, useSettingsStore, useUIStore } from '../lib/store'
import { resolveRole, isStaffRole } from '../lib/store'
import { cn, macroPercent, kgToLbs } from '../lib/utils'

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

  const membership = orgMemberships?.find(m => m.org_id === activeOrgId)
  const canViewAsAthlete = membership?.is_self_athlete === true
  // Use resolveRole so org_role is the fallback — works even without profile.role
  const isStaff = !viewAsAthlete && isStaffRole(profile, membership)

  if (isStaff) {
    return <StaffDashboard profile={profile} membership={membership} />
  }

  return <AthleteTodayPage profile={profile} weightUnit={weightUnit} toggleWeightUnit={toggleWeightUnit} />
}

// ─── Staff Dashboard ──────────────────────────────────────────────────────────
function StaffDashboard({ profile, membership }) {
  const role = resolveRole(profile, membership)
  const isNutritionist = role === 'nutritionist'
  const isAdmin = role === 'admin'
  const { setActivePage } = useUIStore()

  const activeBlock = MOCK_TRAINING_BLOCKS.find(b => b.status === 'active')
  const upcomingMeet = MOCK_MEETS?.[0]
  const daysToMeet = upcomingMeet
    ? Math.ceil((new Date(upcomingMeet.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const flaggedAthletes = MOCK_ATHLETES.filter(a => a.flags?.length > 0)
  const lowCompliance = MOCK_ATHLETES.filter(a => a.nutrition_compliance < 80)
  const missedSessions = MOCK_ATHLETES.filter(a => a.sessions_this_week < a.sessions_planned_this_week)
  const avgCompliance = Math.round(MOCK_ATHLETES.reduce((s, a) => s + a.nutrition_compliance, 0) / MOCK_ATHLETES.length)
  const avgAdherence = Math.round(MOCK_ATHLETES.reduce((s, a) => s + a.adherence, 0) / MOCK_ATHLETES.length)

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
            Sunday, March 1, 2026 · {
              role === 'nutritionist' ? 'Nutrition & Athlete Overview' :
              role === 'admin' ? 'Head Coach Dashboard' :
              'Coaching Dashboard'
            }
          </p>
        </div>
        <div className="flex gap-2">
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
        <StatCard label="Athletes" value={`${MOCK_ATHLETES.length}`} icon={Users} color="purple"
          trendLabel={`${MOCK_ATHLETES.filter(a => a.sessions_this_week > 0).length} trained today`} trend={1} />
        <StatCard label="Avg Adherence" value={`${avgAdherence}%`} icon={Zap} color="orange"
          trendLabel="7-day rolling" trend={avgAdherence >= 85 ? 1 : -1} />
        {!isNutritionist && (
          <StatCard label="Avg Nutrition" value={`${avgCompliance}%`} icon={Flame} color="teal"
            trendLabel="This week" trend={avgCompliance >= 80 ? 1 : -1} />
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
              {MOCK_ATHLETES.map(a => {
                const trained = a.sessions_this_week > 0 && a.last_session >= '2026-02-28'
                const recentSession = a.recent_sessions?.[0]
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl bg-zinc-800/30 border border-zinc-700/20">
                    <Avatar name={a.full_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200">{a.full_name}</p>
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
              {MOCK_ATHLETES.map(a => {
                const nc = a.nutrition_compliance
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.full_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-zinc-200">{a.full_name}</p>
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
                  {MOCK_ATHLETES.filter(a => a.next_meet_id === upcomingMeet.id).slice(0, 5).map(a => (
                    <div key={a.id} className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0" title={a.full_name}>
                      {a.full_name.charAt(0)}
                    </div>
                  ))}
                  {MOCK_ATHLETES.filter(a => a.next_meet_id === upcomingMeet.id).length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-xs text-zinc-400">
                      +{MOCK_ATHLETES.filter(a => a.next_meet_id === upcomingMeet.id).length - 5}
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
              {MOCK_ATHLETES.slice(0, 4).map(a => {
                const nc = a.nutrition_compliance
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.full_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs font-medium text-zinc-200 truncate">{a.full_name}</p>
                        <span className={cn('text-xs font-bold ml-2 flex-shrink-0', nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400')}>{nc}%</span>
                      </div>
                      <ProgressBar value={nc} max={100} color={nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'} size="sm" />
                    </div>
                  </div>
                )
              })}
              {MOCK_ATHLETES.length > 4 && (
                <p className="text-xs text-zinc-600 text-center pt-1">+{MOCK_ATHLETES.length - 4} more athletes</p>
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
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {[
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
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Athlete Today Page ────────────────────────────────────────────────────────
function AthleteTodayPage({ profile, weightUnit, toggleWeightUnit }) {
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [checkinData, setCheckinData] = useState({ sleep_hours: 7, sleep_quality: 7, soreness: 5, motivation: 7, stress: 4, bodyweight: '' })
  const [checkinDone, setCheckinDone] = useState(false)
  const [suppChecked, setSuppChecked] = useState({})

  const nutrition = MOCK_NUTRITION_TODAY
  const workout = MOCK_TODAY_WORKOUT

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">
            Good morning, {profile?.display_name || profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Sunday, March 1, 2026 · Week 8 of 12
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
        <StatCard label="Training Streak" value="12d" icon={Flame} color="orange" trendLabel="Personal best" trend={1} />
        <StatCard label="Weekly Adherence" value="87%" icon={Zap} color="purple" trendLabel="+2% vs last week" trend={1} />
        <StatCard label="Avg Sleep" value="6.8h" icon={Moon} color="blue" trendLabel="-0.2h vs goal" trend={-1} />
        <StatCard label="Current e1RM" value="655kg" sub="Total" icon={Dumbbell} color="yellow" trendLabel="Up 15kg this block" trend={1} />
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
            {[
              { icon: Dumbbell, text: 'Workout starts at 4:00 PM', urgent: true },
              { icon: Flame, text: 'Log nutrition by 8:00 PM', urgent: false },
              { icon: Moon, text: 'Sleep check-in tomorrow morning', urgent: false },
              { icon: Trophy, text: 'Meet registration deadline: Mar 15', urgent: false },
            ].map((r, i) => (
              <div key={i} className={cn('flex items-center gap-3 p-2.5 rounded-lg text-xs', r.urgent ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-zinc-700/30')}>
                <r.icon className={cn('w-3.5 h-3.5 flex-shrink-0', r.urgent ? 'text-yellow-400' : 'text-zinc-400')} />
                <span className={r.urgent ? 'text-yellow-200 font-medium' : 'text-zinc-300'}>{r.text}</span>
              </div>
            ))}
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
            {[
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
            ))}
          </div>
        </Card>
      </div>

      {/* Morning Check-In Modal */}
      <Modal open={checkinOpen} onClose={() => setCheckinOpen(false)} title="Morning Check-In" size="sm">
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
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Bodyweight (kg)</label>
            <input
              type="number"
              value={checkinData.bodyweight}
              onChange={(e) => setCheckinData(d => ({ ...d, bodyweight: e.target.value }))}
              placeholder="e.g. 92.4"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => { setCheckinDone(true); setCheckinOpen(false) }}
          >
            <CheckCircle2 className="w-4 h-4" /> Submit Check-In
          </Button>
        </div>
      </Modal>
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
