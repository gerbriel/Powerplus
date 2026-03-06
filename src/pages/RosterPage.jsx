import { useState, useMemo, useEffect } from 'react'
import {
  Users, AlertTriangle, CheckCircle2, Clock, Dumbbell, Eye, MessageSquare,
  ChevronRight, BarChart3, X, Moon, Utensils, TrendingUp, Target, Layers,
  Activity, FileText, Search, SlidersHorizontal, Trophy, Flame,
  ChevronLeft, Plus, Pencil, Trash2, Send, Save, Edit2, Check,
  UtensilsCrossed, CalendarDays, ChevronDown, ChevronUp, Pill, Zap, Apple,
  Sunrise, Sunset, Coffee, History, Package, LayoutGrid, List
} from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatCard } from '../components/ui/StatCard'
import { Modal } from '../components/ui/Modal'
import {
  MOCK_ATHLETES, MOCK_WEEKLY_REVIEW_QUEUE, MOCK_EXERCISE_HISTORY,
  MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_GOALS,
  MOCK_ATHLETE_MEAL_PLANS, MOCK_MEAL_PLAN_RECIPES, MOCK_MEAL_PREP_LOG,
  MOCK_MEAL_HISTORY
} from '../lib/mockData'
import { useSettingsStore, useAuthStore, useUIStore, useNutritionStore, useGoalsStore, useTrainingStore, resolveRole, useRosterStore } from '../lib/store'
import { cn, adherenceColor, flagLabel, formatDate, calcDotsScore, convertWeight } from '../lib/utils'
import { saveTrainingBlock, saveGoal, saveProfile, sendDirectMessage, saveNutritionPlan, saveCoachNote, updateInjury } from '../lib/db'

export function RosterPage() {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const [tab, setTab] = useState('roster')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFlag, setFilterFlag] = useState('all')
  const [filterClass, setFilterClass] = useState('all')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'grid'

  const { isDemo, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes, reviewQueue: liveReviewQueue, loading: rosterLoading, loadRoster } = useRosterStore()

  useEffect(() => {
    if (!isDemo && activeOrgId) loadRoster(activeOrgId)
  }, [isDemo, activeOrgId])

  const athletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const reviewQueue = isDemo ? MOCK_WEEKLY_REVIEW_QUEUE : liveReviewQueue

  const weightClasses = [...new Set(athletes.map(a => a.weight_class))].sort()
  const flagOptions = ['all', 'pain_flag', 'missed_sessions', 'low_sleep']

  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const matchesSearch = !searchQuery || a.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFlag = filterFlag === 'all' || a.flags.includes(filterFlag)
      const matchesClass = filterClass === 'all' || a.weight_class === filterClass
      return matchesSearch && matchesFlag && matchesClass
    })
  }, [athletes, searchQuery, filterFlag, filterClass])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">My Athletes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{athletes.length} athletes on your roster</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('roster')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'roster' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200')}
          >Roster</button>
          <button
            onClick={() => setTab('queue')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
              tab === 'queue' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200')}
          >
            Review Queue
            {reviewQueue.length > 0 && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">{reviewQueue.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'queue' && (
        <div className="space-y-4">
          <QueueStatCards isDemo={isDemo} reviewQueue={reviewQueue} athletes={athletes} />
          <Card>
            <CardHeader><CardTitle>Today's Review Queue</CardTitle></CardHeader>
            <div className="space-y-2">
              {reviewQueue.map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-zinc-700/20 rounded-xl hover:bg-zinc-700/30 transition-colors">
                  <Avatar name={item.athlete} role="athlete" size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200">{item.athlete}</p>
                    <p className="text-xs text-zinc-400">{item.session}</p>
                  </div>
                  <QueueStatusBadge status={item.status} />
                  {item.flag && <FlagBadge flag={item.flag} />}
                  <div className="flex gap-1">
                    {item.status === 'video_pending' && (
                      <Button size="xs" variant="outline"><Eye className="w-3 h-3" /> Watch</Button>
                    )}
                    <Button size="xs" variant="ghost"><MessageSquare className="w-3 h-3" /> Comment</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'roster' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search athletes…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={filterFlag}
                onChange={e => setFilterFlag(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">All Flags</option>
                <option value="pain_flag">Pain Flag</option>
                <option value="missed_sessions">Missed Sessions</option>
                <option value="low_sleep">Low Sleep</option>
              </select>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">All Classes</option>
                {weightClasses.map(wc => <option key={wc} value={wc}>{wc}</option>)}
              </select>
            </div>
            <p className="text-xs text-zinc-500">{filteredAthletes.length} of {athletes.length}</p>
            {/* View toggle */}
            <div className="ml-auto flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
              ><List className="w-3.5 h-3.5" /></button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')}
              ><LayoutGrid className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* List view */}
          {viewMode === 'list' && rosterLoading && !isDemo && (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading athletes…</div>
          )}
          {viewMode === 'list' && (!rosterLoading || isDemo) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-4 px-4 py-2.5 border-b border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <span>Athlete</span>
                <span className="text-center">Squat</span>
                <span className="text-center">Bench</span>
                <span className="text-center">Dead</span>
                <span className="text-center">Adherence</span>
                <span className="text-center">Sessions</span>
                <span></span>
              </div>
              {filteredAthletes.map((athlete, i) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  isLast={i === filteredAthletes.length - 1}
                  onSelect={() => setSelectedAthlete(athlete)}
                />
              ))}
              {filteredAthletes.length === 0 && (
                <div className="py-12 text-center text-zinc-500 text-sm">No athletes match your filters.</div>
              )}
            </div>
          )}

          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAthletes.map((athlete) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  onSelect={() => setSelectedAthlete(athlete)}
                />
              ))}
              {filteredAthletes.length === 0 && (
                <div className="col-span-3 py-12 text-center text-zinc-500 text-sm">No athletes match your filters.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Athlete Profile Modal */}
      {selectedAthlete && (
        <AthleteProfileModal
          athlete={selectedAthlete}
          onClose={() => setSelectedAthlete(null)}
        />
      )}
    </div>
  )
}

function QueueStatCards({ isDemo, reviewQueue, athletes }) {
  const trainedToday  = reviewQueue.filter(i => ['completed', 'in_progress'].includes(i.status)).length
  const totalToday    = reviewQueue.length
  const videosPending = reviewQueue.filter(i => i.has_video && i.status !== 'completed').length
  const painFlagCount = athletes.filter(a => a.flags?.includes('pain_flag')).length
  const missedCount   = athletes.filter(a => a.flags?.includes('missed_sessions')).length
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Trained Today"    value={isDemo ? '4/6' : `${trainedToday}/${totalToday}`}  icon={CheckCircle2}   color="green"  />
      <StatCard label="Videos Pending"   value={isDemo ? '2'   : String(videosPending)}            icon={Eye}            color="purple" />
      <StatCard label="Pain Flags"       value={isDemo ? '1'   : String(painFlagCount)}            icon={AlertTriangle}  color="red"    />
      <StatCard label="Missed This Week" value={isDemo ? '1'   : String(missedCount)}              icon={Clock}          color="orange" />
    </div>
  )
}

function AthleteRow({ athlete, onSelect, isLast }) {
  const { weightUnit } = useSettingsStore()
  const squat = convertWeight(athlete.e1rm_squat, weightUnit)
  const bench = convertWeight(athlete.e1rm_bench, weightUnit)
  const dead  = convertWeight(athlete.e1rm_deadlift, weightUnit)

  const adColor = athlete.adherence >= 85 ? 'text-green-400' : athlete.adherence >= 70 ? 'text-yellow-400' : 'text-red-400'
  const adBar   = athlete.adherence >= 85 ? 'bg-green-500' : athlete.adherence >= 70 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div
      onClick={onSelect}
      className={cn(
        'grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-4 px-4 py-3 items-center cursor-pointer hover:bg-zinc-800/60 transition-colors',
        !isLast && 'border-b border-zinc-800/60'
      )}
    >
      {/* Athlete name + avatar */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={athlete.full_name} role="athlete" size="sm" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{athlete.full_name}</p>
          <p className="text-xs text-zinc-500 truncate">{athlete.weight_class} · {athlete.federation}</p>
        </div>
        {athlete.flags.length > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {athlete.flags.map(f => <FlagBadge key={f} flag={f} />)}
          </div>
        )}
      </div>
      {/* S/B/D */}
      <span className="text-sm font-bold text-purple-400 text-center">{squat}</span>
      <span className="text-sm font-bold text-blue-400 text-center">{bench}</span>
      <span className="text-sm font-bold text-orange-400 text-center">{dead}</span>
      {/* Adherence */}
      <div className="flex flex-col items-center gap-1">
        <span className={cn('text-xs font-bold', adColor)}>{athlete.adherence}%</span>
        <div className="w-full bg-zinc-700 rounded-full h-1">
          <div className={cn('h-1 rounded-full', adBar)} style={{ width: `${athlete.adherence}%` }} />
        </div>
      </div>
      {/* Sessions */}
      <span className="text-xs text-zinc-400 text-center">{athlete.sessions_this_week}/{athlete.sessions_planned_this_week}</span>
      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-zinc-600" />
    </div>
  )
}

function AthleteCard({ athlete, onSelect }) {
  const { weightUnit } = useSettingsStore()
  const total = athlete.e1rm_squat + athlete.e1rm_bench + athlete.e1rm_deadlift
  const dispTotal = weightUnit === 'lbs'
    ? Math.round(total * 2.20462)
    : total

  return (
    <Card className="hover:border-zinc-600 cursor-pointer transition-all" onClick={onSelect}>
      <div className="flex items-start gap-3 mb-4">
        <Avatar name={athlete.full_name} role="athlete" size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100">{athlete.full_name}</p>
          <p className="text-xs text-zinc-400">{athlete.weight_class} · {athlete.federation} · {athlete.equipment_type}</p>
          {athlete.flags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {athlete.flags.map((f) => <FlagBadge key={f} flag={f} />)}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-0.5" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'S', value: convertWeight(athlete.e1rm_squat, weightUnit), color: 'text-purple-400' },
          { label: 'B', value: convertWeight(athlete.e1rm_bench, weightUnit), color: 'text-blue-400' },
          { label: 'D', value: convertWeight(athlete.e1rm_deadlift, weightUnit), color: 'text-orange-400' },
        ].map((l) => (
          <div key={l.label} className="text-center bg-zinc-700/30 rounded-lg py-2">
            <p className="text-xs text-zinc-500 font-medium">{l.label}</p>
            <p className={cn('text-sm font-bold', l.color)}>{l.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Adherence</span>
            <span className={cn('font-bold', adherenceColor(athlete.adherence))}>{athlete.adherence}%</span>
          </div>
          <ProgressBar value={athlete.adherence} max={100} color={athlete.adherence >= 85 ? 'green' : athlete.adherence >= 70 ? 'yellow' : 'red'} size="sm" />
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-700/50">
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Moon className="w-3 h-3" />
          <span>{athlete.sleep_avg}h avg</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Utensils className="w-3 h-3" />
          <span>{athlete.nutrition_compliance}% nutrition</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Activity className="w-3 h-3" />
          <span>{athlete.sessions_this_week}/{athlete.sessions_planned_this_week} sessions</span>
        </div>
      </div>
    </Card>
  )
}

// ─── Full athlete profile modal ─────────────────────────────────────────────

function AthleteProfileModal({ athlete, onClose }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [overlay, setOverlay] = useState(null) // 'message' | 'edit_program' | 'edit_meal_plan' | 'analytics'

  // Role detection
  const { profile, orgMemberships, activeOrgId } = useAuthStore()
  const { setActivePage, setNutritionDeepLink } = useUIStore()
  const membership = orgMemberships?.find(m => m.org_id === activeOrgId)
  const role = resolveRole(profile, membership)
  const isNutritionist = role === 'nutritionist'

  function goToMealPlanner() {
    setNutritionDeepLink({ tab: 'planner', athleteId: athlete.id })
    setActivePage('nutrition')
    onClose()
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Users },
    { id: 'strength', label: 'Strength', icon: TrendingUp },
    { id: 'sessions', label: 'Sessions', icon: Dumbbell },
    { id: 'nutrition', label: 'Nutrition', icon: Utensils },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'notes', label: 'Notes', icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-zinc-800 flex-shrink-0">
          <Avatar name={athlete.full_name} role="athlete" size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-100">{athlete.full_name}</h2>
              <Badge color="purple">{athlete.weight_class}</Badge>
              <Badge color="blue">{athlete.federation}</Badge>
              <Badge color="default">{athlete.equipment_type}</Badge>
              {athlete.flags.map(f => <FlagBadge key={f} flag={f} />)}
            </div>
            <p className="text-xs text-zinc-400 mt-1 truncate">{athlete.bio}</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-zinc-800 flex-shrink-0 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap',
                activeTab === t.id
                  ? 'bg-zinc-800 text-zinc-100 border-b-2 border-purple-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && <OverviewTab athlete={athlete} />}
          {activeTab === 'strength' && <StrengthTab athlete={athlete} />}
          {activeTab === 'sessions' && <SessionsTab athlete={athlete} />}
          {activeTab === 'nutrition' && <NutritionTab athlete={athlete} />}
          {activeTab === 'goals' && <GoalsTab athlete={athlete} />}
          {activeTab === 'notes' && <NotesTab athlete={athlete} />}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          <Button variant="secondary" className="flex-1" onClick={() => setOverlay('message')}>
            <MessageSquare className="w-4 h-4" /> Message
          </Button>
          {isNutritionist ? (
            <Button variant="secondary" className="flex-1" onClick={goToMealPlanner}>
              <UtensilsCrossed className="w-4 h-4" /> Edit Meal Plan
            </Button>
          ) : (
            <Button variant="secondary" className="flex-1" onClick={() => setOverlay('edit_program')}>
              <Dumbbell className="w-4 h-4" /> Edit Program
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={() => setOverlay('analytics')}>
            <BarChart3 className="w-4 h-4" /> Analytics
          </Button>
        </div>
      </div>

      {/* Overlay modals */}
      {overlay === 'message' && (
        <MessageOverlay athlete={athlete} onClose={() => setOverlay(null)} />
      )}
      {overlay === 'edit_program' && (
        <EditProgramOverlay athlete={athlete} onClose={() => setOverlay(null)} />
      )}
      {overlay === 'edit_meal_plan' && (
        <EditMealPlanOverlay athlete={athlete} onClose={() => setOverlay(null)} />
      )}
      {overlay === 'analytics' && (
        <AnalyticsOverlay athlete={athlete} onClose={() => setOverlay(null)} />
      )}
    </div>
  )
}

// ─── Message Overlay ─────────────────────────────────────────────────────────

function MessageOverlay({ athlete, onClose }) {
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const [msg, setMsg] = useState('')
  const [sent, setSent] = useState(false)
  async function handleSend() {
    if (!msg.trim()) return
    setSent(true)
    if (!isDemo && profile?.id && athlete?.id && !athlete.id.startsWith('u-')) {
      await sendDirectMessage(profile.id, athlete.id, activeOrgId, msg.trim())
    }
    setTimeout(onClose, 1200)
  }
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <p className="text-sm font-semibold text-zinc-100 flex-1">Message {athlete.full_name}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={5}
            placeholder={`Hey ${athlete.full_name.split(' ')[0]}, great work this week…`}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            {['Great session today!', 'Check-in reminder', 'Program update ready'].map(quick => (
              <button key={quick} onClick={() => setMsg(quick)}
                className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700">
                {quick}
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={handleSend} disabled={!msg.trim()}>
            {sent ? <><Check className="w-4 h-4" /> Sent!</> : <><Send className="w-4 h-4" /> Send Message</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Program Overlay ─────────────────────────────────────────────────────

function EditProgramOverlay({ athlete, onClose }) {
  const { isDemo, activeOrgId } = useAuthStore()
  const { blocks: storeBlocks } = useTrainingStore()
  const block = storeBlocks.find(b => b.id === athlete.current_block_id)
    ?? (isDemo ? MOCK_TRAINING_BLOCKS.find(b => b.id === athlete.current_block_id) : null)
  const [sessions, setSessions] = useState(block?.sessions_per_week ?? 4)
  const [rpeTarget, setRpeTarget] = useState('7.5–8.5')
  const [focus, setFocus] = useState(block?.focus ?? '')
  const [notes, setNotes] = useState(block?.notes ?? '')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!isDemo && block?.id && !block.id.startsWith('tb-') && athlete?.id) {
      await saveTrainingBlock(athlete.id, activeOrgId, {
        id: block.id,
        name: block.name,
        phase: block.phase,
        focus,
        notes,
      })
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
          <Dumbbell className="w-4 h-4 text-purple-400" />
          <p className="text-sm font-semibold text-zinc-100 flex-1">Edit Program — {athlete.full_name}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {block && (
            <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-xl">
              <Badge color="purple" className="capitalize">{block.phase}</Badge>
              <span className="text-sm text-zinc-300 font-medium">{block.name}</span>
              <Badge color={block.status === 'active' ? 'green' : 'default'} className="ml-auto">{block.status}</Badge>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Sessions / Week</label>
              <input
                type="number" min={1} max={7} value={sessions}
                onChange={e => setSessions(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">RPE Target</label>
              <input
                value={rpeTarget}
                onChange={e => setRpeTarget(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Block Focus</label>
            <input
              value={focus}
              onChange={e => setFocus(e.target.value)}
              placeholder="e.g. Peak strength, squat focus…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Programming Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Adjustments, cues, deload timing…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Program</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Meal Plan Overlay (Nutritionist) ────────────────────────────────────

const MEAL_SLOT_META = {
  breakfast:     { label: 'Breakfast',     icon: Sunrise,         color: 'text-yellow-400' },
  'pre-workout': { label: 'Pre-Workout',   icon: Zap,             color: 'text-orange-400' },
  lunch:         { label: 'Lunch',         icon: Utensils,        color: 'text-green-400'  },
  snack:         { label: 'Snack',         icon: Apple,           color: 'text-pink-400'   },
  dinner:        { label: 'Dinner',        icon: Sunset,          color: 'text-blue-400'   },
  'post-workout':{ label: 'Post-Workout',  icon: Coffee,          color: 'text-emerald-400'},
  supplements:   { label: 'Supplements',   icon: Pill,            color: 'text-purple-400' },
}

const MEAL_DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' }

// Determine day type based on which days have pre-workout or post-workout items
function getDayType(dayPlan) {
  if (!dayPlan) return 'rest'
  const hasSessions = (dayPlan['pre-workout']?.length > 0) || (dayPlan['post-workout']?.length > 0)
  return hasSessions ? 'training' : 'rest'
}

function calcDayTotals(dayPlan) {
  let cal = 0, prot = 0, carbs = 0, fat = 0
  if (!dayPlan) return { calories: 0, protein: 0, carbs: 0, fat: 0 }
  Object.values(dayPlan).forEach(items =>
    items.forEach(item => {
      cal  += item.calories || 0
      prot += item.protein  || 0
      carbs+= item.carbs    || 0
      fat  += item.fat      || 0
    })
  )
  return { calories: cal, protein: prot, carbs, fat }
}

// Reference week start: current week's Monday
const _rosterNow = new Date(); _rosterNow.setHours(0,0,0,0)
const _rosterDow = _rosterNow.getDay()
const BASE_WEEK_DATE = new Date(_rosterNow)
BASE_WEEK_DATE.setDate(_rosterNow.getDate() - (_rosterDow === 0 ? 6 : _rosterDow - 1))

function getWeekRange(offset) {
  const start = new Date(BASE_WEEK_DATE)
  start.setDate(start.getDate() + offset * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` }
}

function getWeekNumber(offset) {
  // Block 2 started Feb 3, base week is week 3 (Feb 23)
  return 3 + offset
}

function deepCopyPlan(plan) {
  if (!plan) return Object.fromEntries(MEAL_DAYS.map(d => [d, Object.fromEntries(Object.keys(MEAL_SLOT_META).map(s => [s, []]))]))
  return JSON.parse(JSON.stringify(plan))
}

function EditMealPlanOverlay({ athlete, onClose }) {
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const { blocks: storeBlocks } = useTrainingStore()
  const { boardPlans, athletePrepLog, athleteRecipes } = useNutritionStore()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState('monday')
  const [mealPlan, setMealPlan] = useState(() => deepCopyPlan(
    boardPlans?.[athlete.id] ?? (isDemo ? MOCK_ATHLETE_MEAL_PLANS?.[athlete.id] : undefined)
  ))
  const [expandedSlots, setExpandedSlots] = useState({ breakfast: true })
  const [addMode, setAddMode] = useState(null) // { slot, type: 'recipe'|'prep'|'custom' }
  const [customForm, setCustomForm] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', notes: '' })
  const [saved, setSaved] = useState(false)
  const [mealHistory, setMealHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  // Derived block + goals for this athlete
  const block = storeBlocks.find(b => b.id === athlete.current_block_id)
    ?? (isDemo ? MOCK_TRAINING_BLOCKS.find(b => b.id === athlete.current_block_id) : null)
  const allGoals = storeGoals.length ? storeGoals : (isDemo ? MOCK_GOALS : [])
  const linkedGoals = allGoals.filter(g => (athlete.goal_ids || []).includes(g.id))

  const weekRange = getWeekRange(weekOffset)
  const weekNum = getWeekNumber(weekOffset)
  const dayPlan = mealPlan[selectedDay] || Object.fromEntries(Object.keys(MEAL_SLOT_META).map(s => [s, []]))
  const dayTotals = calcDayTotals(dayPlan)
  const dayType = getDayType(dayPlan)

  // Athlete targets (derived from linked goals or defaults)
  const targetCalories = athlete.nutrition_targets?.calories || 3200
  const targetProtein  = athlete.nutrition_targets?.protein  || 200

  function toggleSlot(slot) {
    setExpandedSlots(prev => ({ ...prev, [slot]: !prev[slot] }))
  }

  function removeItem(slot, idx) {
    setMealPlan(prev => {
      const next = deepCopyPlan(prev)
      next[selectedDay][slot].splice(idx, 1)
      return next
    })
  }

  function addRecipe(slot, recipe) {
    const item = {
      id: `rp-${Date.now()}`,
      name: recipe.name,
      calories: recipe.macros.calories,
      protein: recipe.macros.protein,
      carbs: recipe.macros.carbs,
      fat: recipe.macros.fat,
      source: 'recipe',
      recipe_id: recipe.id,
      servings: 1,
      notes: '',
    }
    setMealPlan(prev => {
      const next = deepCopyPlan(prev)
      if (!next[selectedDay][slot]) next[selectedDay][slot] = []
      next[selectedDay][slot].push(item)
      return next
    })
    setAddMode(null)
  }

  function addPrepItem(slot, prepItem) {
    const item = {
      id: `pi-${Date.now()}`,
      name: prepItem.name,
      calories: prepItem.macros_per_serving.calories,
      protein: prepItem.macros_per_serving.protein,
      carbs: prepItem.macros_per_serving.carbs,
      fat: prepItem.macros_per_serving.fat,
      source: 'prep',
      servings: 1,
      notes: '',
    }
    setMealPlan(prev => {
      const next = deepCopyPlan(prev)
      if (!next[selectedDay][slot]) next[selectedDay][slot] = []
      next[selectedDay][slot].push(item)
      return next
    })
    setAddMode(null)
  }

  function addCustomItem(slot) {
    if (!customForm.name.trim()) return
    const item = {
      id: `cu-${Date.now()}`,
      name: customForm.name,
      calories: Number(customForm.calories) || 0,
      protein:  Number(customForm.protein)  || 0,
      carbs:    Number(customForm.carbs)    || 0,
      fat:      Number(customForm.fat)      || 0,
      source: 'custom',
      servings: 1,
      notes: customForm.notes,
    }
    setMealPlan(prev => {
      const next = deepCopyPlan(prev)
      if (!next[selectedDay][slot]) next[selectedDay][slot] = []
      next[selectedDay][slot].push(item)
      return next
    })
    setCustomForm({ name: '', calories: '', protein: '', carbs: '', fat: '', notes: '' })
    setAddMode(null)
  }

  async function handleSavePlan() {
    const compliance = Math.min(100, Math.round((dayTotals.calories / targetCalories) * 100))
    const date = new Date(weekRange.start.getTime() + MEAL_DAYS.indexOf(selectedDay) * 86400000).toISOString().split('T')[0]
    const entry = {
      id: `mh-${Date.now()}`,
      athlete_id: athlete.id,
      date,
      week_label: `Week ${weekNum} — ${block?.phase || 'Block'}`,
      block_id: block?.id || null,
      goal_ids: linkedGoals.map(g => g.id),
      day_type: dayType,
      meals: JSON.parse(JSON.stringify(dayPlan)),
      totals: dayTotals,
      targets: { calories: targetCalories, protein: targetProtein },
      compliance_pct: compliance,
      notes: '',
    }
    setMealHistory(prev => [entry, ...prev.filter(e => e.date !== entry.date)])
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    if (!isDemo && athlete?.id && !athlete.id.startsWith('u-')) {
      await saveNutritionPlan(athlete.id, profile?.id, activeOrgId, {
        name: `${athlete.full_name} — Week ${weekNum} Plan`,
        calories_training: targetCalories,
        target_calories:   targetCalories,
        target_protein:    targetProtein,
        block_id:          block?.id || null,
        goal_ids:          linkedGoals.map(g => g.id),
        valid_from:        date,
        coach_notes:       '',
      })
    }
  }

  // All prep items (flattened)
  const mockPrepLog = isDemo ? MOCK_MEAL_PREP_LOG : []
  const allPrepItems = (athletePrepLog?.[athlete.id] ?? mockPrepLog).flatMap(log => log.items || [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[92vh] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <UtensilsCrossed className="w-4 h-4 text-green-400" />
          <p className="text-sm font-semibold text-zinc-100 flex-1">Meal Plan — {athlete.full_name}</p>
          <button onClick={() => setShowHistory(h => !h)} className={cn('p-1.5 rounded-lg transition-colors', showHistory ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800')}>
            <History className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Block context banner */}
        {block && (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-purple-950/40 border-b border-purple-900/40 flex-shrink-0">
            <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span className="text-xs font-medium text-purple-300 truncate">{block.name}</span>
            <span className="text-xs text-purple-500 capitalize ml-1">· {block.phase}</span>
            <span className="ml-auto text-xs text-purple-500 whitespace-nowrap">Wk {weekNum} of {block.weeks}</span>
          </div>
        )}

        {/* Goal pills */}
        {linkedGoals.length > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-800 flex-shrink-0 flex-wrap">
            <Target className="w-3 h-3 text-zinc-500 flex-shrink-0" />
            {linkedGoals.map(g => (
              <span key={g.id} className="text-xs px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300">
                {g.title}
              </span>
            ))}
            <span className="ml-auto text-xs text-zinc-500">Target: {targetCalories} kcal · {targetProtein}g protein</span>
          </div>
        )}

        {/* Week navigator */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-zinc-800 flex-shrink-0">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center">
            <span className="text-xs font-medium text-zinc-200">Week {weekNum}</span>
            <span className="text-xs text-zinc-500 ml-2">{weekRange.label}</span>
          </div>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day selector */}
        <div className="flex gap-1 px-5 py-2.5 border-b border-zinc-800 flex-shrink-0 overflow-x-auto">
          {MEAL_DAYS.map(day => {
            const dp = mealPlan[day] || {}
            const dt = getDayType(dp)
            const totals = calcDayTotals(dp)
            const hasItems = Object.values(dp).some(a => a.length > 0)
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  'flex flex-col items-center px-2.5 py-1.5 rounded-lg transition-colors min-w-[46px] text-center',
                  selectedDay === day ? 'bg-green-900/50 border border-green-700/50 text-green-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                )}
              >
                <span className="text-xs font-medium">{DAY_LABELS[day]}</span>
                <span className={cn('text-[10px] mt-0.5', dt === 'training' ? 'text-orange-400' : 'text-zinc-500')}>
                  {dt === 'training' ? 'Train' : 'Rest'}
                </span>
                {hasItems && <span className="text-[9px] text-zinc-500 mt-0.5">{totals.calories}kcal</span>}
              </button>
            )
          })}
        </div>

        {showHistory ? (
          /* ── History View ── */
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Saved Meal History</p>
            {mealHistory.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 text-sm">No history yet. Save a day's plan to log it.</div>
            ) : (
              mealHistory.map(entry => (
                <div key={entry.id} className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{entry.date}</p>
                      <p className="text-xs text-zinc-500">{entry.week_label} · <span className={cn('capitalize', entry.day_type === 'training' ? 'text-orange-400' : 'text-zinc-500')}>{entry.day_type}</span></p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-bold', entry.compliance_pct >= 85 ? 'text-green-400' : entry.compliance_pct >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                        {entry.compliance_pct}%
                      </p>
                      <p className="text-xs text-zinc-500">compliance</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[['Calories', entry.totals.calories, entry.targets.calories, 'kcal'],
                      ['Protein',  entry.totals.protein,  entry.targets.protein,  'g'],
                      ['Carbs',    entry.totals.carbs,    null,                   'g'],
                      ['Fat',      entry.totals.fat,      null,                   'g'],
                    ].map(([lbl, val, tgt, unit]) => (
                      <div key={lbl} className="bg-zinc-900/60 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-zinc-500">{lbl}</p>
                        <p className="text-xs font-bold text-zinc-200">{val}{unit}</p>
                        {tgt && <p className="text-[9px] text-zinc-600">/ {tgt}{unit}</p>}
                      </div>
                    ))}
                  </div>
                  {/* Slot summary */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(entry.meals).map(([slot, items]) => items.length > 0 && (
                      <span key={slot} className="text-[10px] px-1.5 py-0.5 bg-zinc-700/60 rounded text-zinc-400">
                        {MEAL_SLOT_META[slot]?.label} ({items.length})
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Planner View ── */
          <div className="flex-1 overflow-y-auto">
            {/* Day macro totals */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-800/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300">
                  {dayType === 'training' ? 'Training Day' : 'Rest Day'} Totals
                </span>
                <span className={cn('text-xs font-bold', dayTotals.calories >= targetCalories * 0.9 ? 'text-green-400' : 'text-yellow-400')}>
                  {dayTotals.calories} / {targetCalories} kcal
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', val: dayTotals.calories, tgt: targetCalories, unit: 'kcal', color: 'bg-yellow-500' },
                  { label: 'Protein',  val: dayTotals.protein,  tgt: targetProtein,  unit: 'g',    color: 'bg-blue-500'   },
                  { label: 'Carbs',    val: dayTotals.carbs,    tgt: null,           unit: 'g',    color: 'bg-orange-500' },
                  { label: 'Fat',      val: dayTotals.fat,      tgt: null,           unit: 'g',    color: 'bg-pink-500'   },
                ].map(m => (
                  <div key={m.label} className="bg-zinc-800 rounded-lg p-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-zinc-500">{m.label}</span>
                      <span className="text-zinc-300 font-medium">{m.val}{m.unit}</span>
                    </div>
                    {m.tgt && (
                      <div className="w-full bg-zinc-700 rounded-full h-1">
                        <div className={cn('h-1 rounded-full transition-all', m.color)} style={{ width: `${Math.min(100, Math.round(m.val / m.tgt * 100))}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Meal slots */}
            <div className="p-4 space-y-2">
              {Object.entries(MEAL_SLOT_META).map(([slot, meta]) => {
                const SlotIcon = meta.icon
                const items = dayPlan[slot] || []
                const slotCals = items.reduce((s, i) => s + (i.calories || 0), 0)
                const isOpen = expandedSlots[slot]

                return (
                  <div key={slot} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden">
                    {/* Slot header */}
                    <button
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-zinc-800 transition-colors"
                      onClick={() => toggleSlot(slot)}
                    >
                      <SlotIcon className={cn('w-3.5 h-3.5 flex-shrink-0', meta.color)} />
                      <span className="text-sm font-medium text-zinc-200 flex-1 text-left">{meta.label}</span>
                      {items.length > 0 && <span className="text-xs text-zinc-500">{items.length} item{items.length !== 1 ? 's' : ''} · {slotCals} kcal</span>}
                      {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-3 space-y-2">
                        {/* Items */}
                        {items.map((item, idx) => (
                          <div key={item.id || idx} className="flex items-center gap-2 bg-zinc-900/60 border border-zinc-700/40 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-200 truncate">{item.name}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                                {item.source === 'recipe' && <span className="ml-1 text-green-600"> • Recipe</span>}
                                {item.source === 'prep' && <span className="ml-1 text-blue-600"> • Meal Prep</span>}
                              </p>
                              {item.notes && <p className="text-[10px] text-zinc-600 italic mt-0.5">{item.notes}</p>}
                            </div>
                            <button onClick={() => removeItem(slot, idx)} className="p-1 text-zinc-600 hover:text-red-400 rounded transition-colors flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {/* Add item / picker */}
                        {addMode?.slot === slot ? (
                          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 space-y-2">
                            {/* Type selector */}
                            <div className="flex gap-1.5">
                              {['recipe', 'prep', 'custom'].map(t => (
                                <button
                                  key={t}
                                  onClick={() => setAddMode({ slot, type: t })}
                                  className={cn('flex-1 text-xs py-1.5 rounded-lg capitalize transition-colors border',
                                    addMode.type === t ? 'bg-green-900/40 border-green-700 text-green-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                                  )}
                                >
                                  {t === 'recipe' ? 'Recipe' : t === 'prep' ? 'Meal Prep' : 'Custom'}
                                </button>
                              ))}
                              <button onClick={() => setAddMode(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded-lg">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Recipe picker */}
                            {addMode.type === 'recipe' && (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {(athleteRecipes?.[athlete.id] ?? (isDemo ? MOCK_MEAL_PLAN_RECIPES : [])).map(r => (
                                  <button
                                    key={r.id}
                                    onClick={() => addRecipe(slot, r)}
                                    className="w-full flex items-start gap-2 p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">{r.macros.calories} kcal · {r.macros.protein}g P · {r.prep_time + r.cook_time}min</p>
                                    </div>
                                    <Plus className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Prep picker */}
                            {addMode.type === 'prep' && (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {allPrepItems.length === 0 ? (
                                  <p className="text-xs text-zinc-500 text-center py-3">No meal prep items logged yet.</p>
                                ) : allPrepItems.map((item, i) => (
                                  <button
                                    key={i}
                                    onClick={() => addPrepItem(slot, item)}
                                    className="w-full flex items-start gap-2 p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-left transition-colors"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-zinc-200">{item.name}</p>
                                      <p className="text-[10px] text-zinc-500 mt-0.5">
                                        {item.macros_per_serving?.calories} kcal · {item.macros_per_serving?.protein}g P
                                      </p>
                                    </div>
                                    <Plus className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Custom item form */}
                            {addMode.type === 'custom' && (
                              <div className="space-y-2">
                                <input
                                  value={customForm.name}
                                  onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                                  placeholder="Item name (e.g. Creatine 5g, Whey shake…)"
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500/40"
                                />
                                <div className="grid grid-cols-4 gap-2">
                                  {['calories','protein','carbs','fat'].map(field => (
                                    <div key={field}>
                                      <label className="block text-[10px] text-zinc-500 mb-0.5 capitalize">{field}</label>
                                      <input
                                        type="number"
                                        value={customForm[field]}
                                        onChange={e => setCustomForm(f => ({ ...f, [field]: e.target.value }))}
                                        placeholder="0"
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500/40"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <input
                                  value={customForm.notes}
                                  onChange={e => setCustomForm(f => ({ ...f, notes: e.target.value }))}
                                  placeholder="Notes (optional)"
                                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-green-500/40"
                                />
                                <Button className="w-full text-xs py-1.5" onClick={() => addCustomItem(slot)}>
                                  <Plus className="w-3 h-3" /> Add Item
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddMode({ slot, type: 'recipe' })}
                            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-green-400 hover:bg-zinc-800 rounded-lg border border-dashed border-zinc-700 hover:border-green-700/50 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add item to {meta.label.toLowerCase()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-zinc-800 flex-shrink-0">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1 bg-green-700 hover:bg-green-600" onClick={handleSavePlan}>
            {saved ? <><Check className="w-4 h-4" /> Saved to History!</> : <><Save className="w-4 h-4" /> Save Day Plan</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics Overlay ────────────────────────────────────────────────────────

function AnalyticsOverlay({ athlete, onClose }) {
  const { weightUnit } = useSettingsStore()
  const trend = athlete.check_in_trend || []

  const bwData = trend.map(w => convertWeight(w.bodyweight, weightUnit))
  const bwMin = Math.min(...bwData) - 0.5
  const bwMax = Math.max(...bwData) + 0.5

  const metrics = [
    { label: 'Avg Sleep', value: athlete.sleep_avg + 'h', color: athlete.sleep_avg >= 7 ? 'text-green-400' : athlete.sleep_avg >= 6 ? 'text-yellow-400' : 'text-red-400' },
    { label: 'Avg RPE', value: athlete.rpe_avg_this_week, color: 'text-purple-400' },
    { label: 'Adherence', value: athlete.adherence + '%', color: adherenceColor(athlete.adherence) },
    { label: 'Nutrition', value: athlete.nutrition_compliance + '%', color: adherenceColor(athlete.nutrition_compliance) },
  ]

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <p className="text-sm font-semibold text-zinc-100 flex-1">Analytics — {athlete.full_name}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <p className="text-xs text-zinc-500">{m.label}</p>
                <p className={cn('text-lg font-bold mt-1', m.color)}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* 4-week trend table */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">4-Week Check-In Trend</h3>
            <div className="bg-zinc-800/30 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-800/60">
                  <tr className="text-zinc-500">
                    <th className="text-left px-3 py-2">Week</th>
                    <th className="text-center px-3 py-2">Sleep</th>
                    <th className="text-center px-3 py-2">Soreness</th>
                    <th className="text-center px-3 py-2">Stress</th>
                    <th className="text-center px-3 py-2">Energy</th>
                    <th className="text-center px-3 py-2">BW ({weightUnit})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {trend.map(row => (
                    <tr key={row.week}>
                      <td className="px-3 py-2 font-medium text-zinc-300">{row.week}</td>
                      <td className={cn('px-3 py-2 text-center font-medium', row.sleep >= 7 ? 'text-green-400' : row.sleep >= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.sleep}h</td>
                      <td className={cn('px-3 py-2 text-center', row.soreness <= 5 ? 'text-green-400' : row.soreness <= 7 ? 'text-yellow-400' : 'text-red-400')}>{row.soreness}/10</td>
                      <td className={cn('px-3 py-2 text-center', row.stress <= 4 ? 'text-green-400' : row.stress <= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.stress}/10</td>
                      <td className={cn('px-3 py-2 text-center', row.energy >= 7 ? 'text-green-400' : row.energy >= 5 ? 'text-yellow-400' : 'text-red-400')}>{row.energy}/10</td>
                      <td className="px-3 py-2 text-center text-zinc-300">{convertWeight(row.bodyweight, weightUnit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sparkline bars for sleep */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Sleep Quality Trend</h3>
            <div className="flex items-end gap-2 h-16">
              {trend.map(row => {
                const h = Math.max(8, Math.round((row.sleep / 9) * 64))
                return (
                  <div key={row.week} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn('w-full rounded-t-sm transition-all', row.sleep >= 7 ? 'bg-green-500' : row.sleep >= 6 ? 'bg-yellow-500' : 'bg-red-500')}
                      style={{ height: h }}
                    />
                    <span className="text-xs text-zinc-500">{row.week}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* e1RM summary */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">Current e1RM Summary</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Squat', val: athlete.e1rm_squat, color: 'text-purple-400' },
                { label: 'Bench', val: athlete.e1rm_bench, color: 'text-blue-400' },
                { label: 'Deadlift', val: athlete.e1rm_deadlift, color: 'text-orange-400' },
              ].map(l => (
                <div key={l.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                  <p className="text-xs text-zinc-500">{l.label}</p>
                  <p className={cn('text-lg font-black mt-1', l.color)}>{convertWeight(l.val, weightUnit)}</p>
                  <p className="text-xs text-zinc-600">{weightUnit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ athlete }) {
  const { weightUnit } = useSettingsStore()
  const { isDemo } = useAuthStore()
  const { blocks, meets } = useTrainingStore()
  const block = blocks.find(b => b.id === athlete.current_block_id)
    ?? (isDemo ? MOCK_TRAINING_BLOCKS.find(b => b.id === athlete.current_block_id) : null)
  const meet = meets.find(m => m.id === athlete.next_meet_id)
    ?? (isDemo ? MOCK_MEETS.find(m => m.id === athlete.next_meet_id) : null)
  const total = athlete.e1rm_squat + athlete.e1rm_bench + athlete.e1rm_deadlift
  const dots = calcDotsScore(total, athlete.bodyweight_kg)

  // Editable federation + member ID
  const [editing, setEditing] = useState(false)
  const [federation, setFederation] = useState(athlete.federation || '')
  const [memberId, setMemberId] = useState(athlete.member_id || '')
  const [savedIdent, setSavedIdent] = useState(false)

  function saveIdentity() {
    setSavedIdent(true)
    setEditing(false)
    setTimeout(() => setSavedIdent(false), 2000)
    // Persist federation + member_id to the athlete's profile
    const { isDemo } = useAuthStore.getState()
    if (!isDemo && athlete?.id && !athlete.id.startsWith('u-')) {
      saveProfile(athlete.id, { federation, member_id: memberId.trim() || null })
    }
  }

  return (
    <div className="space-y-5">
      {/* Key stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500">Bodyweight</p>
          <p className="text-lg font-bold text-zinc-100 mt-1">{convertWeight(athlete.bodyweight_kg, weightUnit)}<span className="text-xs text-zinc-500 ml-1">{weightUnit}</span></p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500">e1RM Total</p>
          <p className="text-lg font-bold text-purple-400 mt-1">{convertWeight(total, weightUnit)}<span className="text-xs text-zinc-500 ml-1">{weightUnit}</span></p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500">DOTS</p>
          <p className="text-lg font-bold text-yellow-400 mt-1">{dots}</p>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <p className="text-xs text-zinc-500">Avg Sleep</p>
          <p className={cn('text-lg font-bold mt-1', athlete.sleep_avg >= 7 ? 'text-green-400' : athlete.sleep_avg >= 6 ? 'text-yellow-400' : 'text-red-400')}>
            {athlete.sleep_avg}h
          </p>
        </div>
      </div>

      {/* Federation + Member ID */}
      <div className="bg-zinc-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Federation ID</h3>
          {!editing
            ? <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            : <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                <button onClick={saveIdentity} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold">
                  <Check className="w-3 h-3" /> {savedIdent ? 'Saved!' : 'Save'}
                </button>
              </div>
          }
        </div>
        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Federation</p>
              <p className="text-sm font-semibold text-zinc-100 mt-0.5">{federation || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Member ID</p>
              <p className="text-sm font-semibold text-zinc-100 mt-0.5 font-mono">{memberId || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Federation</label>
              <select
                value={federation}
                onChange={e => setFederation(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              >
                {['USAPL', 'USPA', 'IPF', 'RPS', 'CPU', 'APF', 'WRPF', 'Other'].map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Member ID</label>
              <input
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                placeholder="e.g. USAPL-93-10284"
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
            </div>
          </div>
        )}
      </div>

      {/* Week summary */}
      <div className="bg-zinc-800/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> This Week</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Sessions</p>
            <p className="text-base font-bold text-zinc-100 mt-0.5">{athlete.sessions_this_week}<span className="text-zinc-500 text-xs">/{athlete.sessions_planned_this_week}</span></p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Avg RPE</p>
            <p className="text-base font-bold text-zinc-100 mt-0.5">{athlete.rpe_avg_this_week}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Adherence</p>
            <p className={cn('text-base font-bold mt-0.5', adherenceColor(athlete.adherence))}>{athlete.adherence}%</p>
          </div>
        </div>
      </div>

      {/* Current block + meet */}
      <div className="grid md:grid-cols-2 gap-3">
        {block && (
          <div className="bg-zinc-800/30 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Current Block</p>
            <p className="text-sm font-semibold text-zinc-100">{block.name}</p>
            <p className="text-xs text-zinc-400 mt-1">{formatDate(block.start_date)} → {formatDate(block.end_date)}</p>
            <div className="flex gap-2 mt-2">
              <Badge color="purple" className="capitalize">{block.phase}</Badge>
              <Badge color={block.status === 'active' ? 'green' : 'default'}>{block.status}</Badge>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400">Block Progress</span>
                <span className="text-zinc-400">{block.sessions_completed}/{block.sessions_planned}</span>
              </div>
              <ProgressBar value={block.sessions_completed} max={block.sessions_planned} color="purple" size="sm" />
            </div>
          </div>
        )}
        {meet && (
          <div className="bg-zinc-800/30 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1 flex items-center gap-1"><Trophy className="w-3 h-3" /> Next Meet</p>
            <p className="text-sm font-semibold text-zinc-100">{meet.name}</p>
            <p className="text-xs text-zinc-400 mt-1">{formatDate(meet.meet_date)} · {meet.location}</p>
            <div className="flex gap-2 mt-2">
              <Badge color="blue">{meet.federation}</Badge>
              <Badge color="default">{meet.equipment}</Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Reg deadline: {formatDate(meet.registration_deadline)}</p>
          </div>
        )}
      </div>

      {/* Compliance bars */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Workout Adherence</span>
            <span className={cn('font-bold', adherenceColor(athlete.adherence))}>{athlete.adherence}%</span>
          </div>
          <ProgressBar value={athlete.adherence} max={100} color={athlete.adherence >= 85 ? 'green' : athlete.adherence >= 70 ? 'yellow' : 'red'} />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-400">Nutrition Compliance</span>
            <span className={cn('font-bold', adherenceColor(athlete.nutrition_compliance))}>{athlete.nutrition_compliance}%</span>
          </div>
          <ProgressBar value={athlete.nutrition_compliance} max={100} color={athlete.nutrition_compliance >= 85 ? 'green' : athlete.nutrition_compliance >= 70 ? 'yellow' : 'red'} />
        </div>
      </div>

      {/* Flags */}
      {athlete.flags.length > 0 && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-sm font-semibold text-red-300 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Active Flags</p>
          <div className="flex flex-wrap gap-2">
            {athlete.flags.map((f) => <FlagBadge key={f} flag={f} />)}
          </div>
        </div>
      )}

      {/* Injury notes */}
      {athlete.injury_notes && (
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
          <p className="text-xs font-semibold text-orange-300 mb-1">Injury / Medical Notes</p>
          <p className="text-xs text-zinc-300">{athlete.injury_notes}</p>
        </div>
      )}

      {/* Check-in trend */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">Check-In Trend (4 weeks)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-zinc-500">
                <th className="text-left pb-2 pr-4">Week</th>
                <th className="text-center pb-2 px-2">Sleep (h)</th>
                <th className="text-center pb-2 px-2">Soreness /10</th>
                <th className="text-center pb-2 px-2">Stress /10</th>
                <th className="text-center pb-2 px-2">Energy /10</th>
                <th className="text-center pb-2 px-2">BW ({weightUnit})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {[...athlete.check_in_trend].reverse().map((row) => (
                <tr key={row.week}>
                  <td className="py-2 pr-4 font-medium text-zinc-300">{row.week}</td>
                  <td className={cn('py-2 px-2 text-center font-medium', row.sleep >= 7 ? 'text-green-400' : row.sleep >= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.sleep}</td>
                  <td className={cn('py-2 px-2 text-center', row.soreness <= 5 ? 'text-green-400' : row.soreness <= 7 ? 'text-yellow-400' : 'text-red-400')}>{row.soreness}</td>
                  <td className={cn('py-2 px-2 text-center', row.stress <= 4 ? 'text-green-400' : row.stress <= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.stress}</td>
                  <td className={cn('py-2 px-2 text-center', row.energy >= 7 ? 'text-green-400' : row.energy >= 5 ? 'text-yellow-400' : 'text-red-400')}>{row.energy}</td>
                  <td className="py-2 px-2 text-center text-zinc-300">{convertWeight(row.bodyweight, weightUnit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Strength Tab ─────────────────────────────────────────────────────────────

function StrengthTab({ athlete }) {
  const { weightUnit } = useSettingsStore()
  const { isDemo } = useAuthStore()
  const mockExerciseHistory = isDemo ? MOCK_EXERCISE_HISTORY : {}
  const history = mockExerciseHistory[athlete.full_name] || {}
  const lifts = ['Back Squat', 'Bench Press', 'Conventional Deadlift']
  const liftColors = { 'Back Squat': 'text-purple-400', 'Bench Press': 'text-blue-400', 'Conventional Deadlift': 'text-orange-400' }
  const total = athlete.e1rm_squat + athlete.e1rm_bench + athlete.e1rm_deadlift
  const dots = calcDotsScore(total, athlete.bodyweight_kg)

  return (
    <div className="space-y-5">
      {/* Big 3 e1RM */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { lift: 'Squat', val: athlete.e1rm_squat, color: 'text-purple-400', border: 'border-purple-500/30' },
          { lift: 'Bench', val: athlete.e1rm_bench, color: 'text-blue-400', border: 'border-blue-500/30' },
          { lift: 'Deadlift', val: athlete.e1rm_deadlift, color: 'text-orange-400', border: 'border-orange-500/30' },
        ].map((l) => (
          <div key={l.lift} className={cn('text-center bg-zinc-800/50 border rounded-xl p-4', l.border)}>
            <p className="text-xs text-zinc-400">{l.lift} e1RM</p>
            <p className={cn('text-2xl font-black mt-1', l.color)}>{convertWeight(l.val, weightUnit)}</p>
            <p className="text-xs text-zinc-500">{weightUnit}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-zinc-800/30 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500">e1RM Total</p>
          <p className="text-xl font-black text-zinc-100 mt-1">{convertWeight(total, weightUnit)}<span className="text-sm text-zinc-500 ml-1">{weightUnit}</span></p>
        </div>
        <div className="flex-1 bg-zinc-800/30 rounded-xl p-4 text-center">
          <p className="text-xs text-zinc-500">DOTS Score</p>
          <p className="text-xl font-black text-yellow-400 mt-1">{dots}</p>
        </div>
      </div>

      {/* Lift history tables */}
      {lifts.map(liftName => {
        const entries = history[liftName]
        if (!entries || entries.length === 0) return null
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6)
        const best = entries.reduce((acc, e) => e.e1rm_kg > acc.e1rm_kg ? e : acc, entries[0])
        return (
          <div key={liftName}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn('text-sm font-semibold', liftColors[liftName])}>{liftName}</h3>
              <span className="text-xs text-zinc-500">Best e1RM: <span className="text-zinc-300 font-bold">{convertWeight(best.e1rm_kg, weightUnit)}{weightUnit}</span></span>
            </div>
            <div className="bg-zinc-800/30 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-zinc-800/50">
                  <tr className="text-zinc-500">
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-center px-3 py-2">Weight</th>
                    <th className="text-center px-3 py-2">Reps</th>
                    <th className="text-center px-3 py-2">RPE</th>
                    <th className="text-center px-3 py-2">e1RM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {sorted.map((entry, i) => (
                    <tr key={i} className={i === 0 ? 'bg-purple-500/5' : ''}>
                      <td className="px-3 py-2 text-zinc-400">{formatDate(entry.date)}</td>
                      <td className="px-3 py-2 text-center text-zinc-200 font-medium">{convertWeight(entry.weight_kg, weightUnit)}{weightUnit}</td>
                      <td className="px-3 py-2 text-center text-zinc-300">{entry.reps}</td>
                      <td className="px-3 py-2 text-center text-zinc-400">{entry.rpe}</td>
                      <td className={cn('px-3 py-2 text-center font-bold', liftColors[liftName])}>{convertWeight(entry.e1rm_kg, weightUnit)}{weightUnit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({ athlete }) {
  const { weightUnit } = useSettingsStore()
  const [selected, setSelected] = useState(null)

  const sessions = athlete.recent_sessions || []

  if (selected !== null) {
    const session = sessions[selected]
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Sessions
        </button>

        <div className="bg-zinc-800/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-100">{session.name}</h3>
              <p className="text-xs text-zinc-500 mt-0.5">{formatDate(session.date)}</p>
            </div>
            <Badge color="purple">RPE {session.rpe}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-500">Total Sets</p>
              <p className="text-xl font-black text-zinc-100 mt-1">{session.sets}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-500">Session RPE</p>
              <p className={cn('text-xl font-black mt-1', session.rpe >= 9 ? 'text-red-400' : session.rpe >= 8 ? 'text-orange-400' : 'text-green-400')}>{session.rpe}</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-500">Status</p>
              <p className="text-sm font-bold text-green-400 mt-1">Done</p>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Top Lift</p>
            <p className="text-sm font-semibold text-purple-300">{session.top_lift}</p>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-2">Session Notes</p>
            <p className="text-sm text-zinc-400 italic">No additional notes logged for this session.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Recent Sessions</h3>
        <p className="text-xs text-zinc-500">Click to view details</p>
      </div>
      {sessions.map((session, i) => (
        <button
          key={i}
          onClick={() => setSelected(i)}
          className="w-full text-left bg-zinc-800/30 rounded-xl p-4 flex items-start gap-3 hover:bg-zinc-800/60 hover:border-zinc-600 border border-transparent transition-all"
        >
          <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', i === 0 ? 'bg-purple-400' : 'bg-zinc-600')} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-100">{session.name}</p>
              <p className="text-xs text-zinc-500 flex-shrink-0">{formatDate(session.date)}</p>
            </div>
            <p className="text-xs text-zinc-400 mt-1">Top lift: <span className="text-zinc-300">{session.top_lift}</span></p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-zinc-500">RPE <span className="text-zinc-300 font-medium">{session.rpe}</span></span>
              <span className="text-xs text-zinc-500">Sets <span className="text-zinc-300 font-medium">{session.sets}</span></span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-1" />
        </button>
      ))}
      {sessions.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-8">No recent sessions logged.</p>
      )}
    </div>
  )
}

// ─── Nutrition Tab ────────────────────────────────────────────────────────────

function NutritionTab({ athlete }) {
  const { plan, actual } = athlete.nutrition_macros || { plan: {}, actual: {} }
  const nc = athlete.nutrition_compliance
  const [section, setSection] = useState('overview') // 'overview' | 'macros' | 'plan' | 'pantry' | 'supplements' | 'history'

  const { isDemo } = useAuthStore()
  // Live shared nutrition state
  const { athleteRecipes, athletePrepLog, boardPlans } = useNutritionStore()

  // Pull meal history for this athlete
  const history = (isDemo ? MOCK_MEAL_HISTORY : []).filter(e => e.athlete_id === athlete.id)

  // Use live board plan if available, otherwise fall back to static mock for demo
  const staticPlan   = isDemo ? MOCK_ATHLETE_MEAL_PLANS?.[athlete.id] : undefined
  const liveBoardPlan = boardPlans?.[athlete.id]
  const mealPlan = (liveBoardPlan && Object.keys(liveBoardPlan).length > 0) ? liveBoardPlan : staticPlan

  // Live recipes for this athlete
  const myRecipes = athleteRecipes?.[athlete.id] ?? []

  // Live pantry items with servings remaining
  const prepItems = (athletePrepLog?.[athlete.id] ?? [])
    .flatMap(session =>
      (session.items || []).map(item => ({
        ...item,
        sessionLabel: session.prep_date || session.label || '',
        linkedRecipe: myRecipes.find(r => r.source_recipe_id === item.recipe_id || r.id === item.recipe_id) ?? null,
        remaining: Math.max(0, (item.servings_made || 0) - (item.servings_consumed || 0)),
      }))
    )
    .filter(i => i.remaining > 0)

  // Compute supplement list from meal plan (all days)
  const supplements = mealPlan
    ? [...new Map(
        Object.values(mealPlan)
          .flatMap(d => d.supplements || [])
          .map(s => [s.name, s])
      ).values()]
    : []

  // Macro split percentages (actual)
  const totalMacroCal = (actual.protein || 0) * 4 + (actual.carbs || 0) * 4 + (actual.fat || 0) * 9
  const proteinPct  = totalMacroCal > 0 ? Math.round(((actual.protein || 0) * 4 / totalMacroCal) * 100) : 0
  const carbsPct    = totalMacroCal > 0 ? Math.round(((actual.carbs   || 0) * 4 / totalMacroCal) * 100) : 0
  const fatPct      = totalMacroCal > 0 ? Math.round(((actual.fat     || 0) * 9 / totalMacroCal) * 100) : 0

  // 7-day compliance trend from history (most recent 7)
  const recent7 = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse()
  const avgCompliance = recent7.length > 0
    ? Math.round(recent7.reduce((s, e) => s + e.compliance_pct, 0) / recent7.length)
    : nc
  const trainingDays = history.filter(e => e.day_type === 'training').length
  const restDays     = history.filter(e => e.day_type === 'rest').length

  // Best + worst compliance
  const best  = history.length > 0 ? Math.max(...history.map(e => e.compliance_pct)) : null
  const worst = history.length > 0 ? Math.min(...history.map(e => e.compliance_pct)) : null

  const SECTIONS = [
    { id: 'overview',    label: 'Overview'     },
    { id: 'macros',      label: 'Macros'       },
    { id: 'plan',        label: 'Meal Plan'    },
    { id: 'pantry',      label: 'Pantry'       },
    { id: 'supplements', label: 'Supplements'  },
    { id: 'history',     label: 'History'      },
  ]

  return (
    <div className="space-y-4">
      {/* Section nav */}
      <div className="flex gap-1 bg-zinc-800/50 rounded-xl p-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
              section === s.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            )}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <div className="space-y-4">
          {/* Compliance hero */}
          <div className="flex items-center gap-4 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700/40">
            <div className="text-center min-w-[60px]">
              <p className={cn('text-3xl font-black', adherenceColor(nc))}>{nc}%</p>
              <p className="text-xs text-zinc-500 mt-0.5">7-day</p>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>Compliance</span>
                <span className={adherenceColor(nc)}>{nc >= 85 ? 'Excellent' : nc >= 70 ? 'On Track' : 'Needs Attention'}</span>
              </div>
              <ProgressBar value={nc} max={100} color={nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'} />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
              <p className="text-xs text-zinc-500">Logged Days</p>
              <p className="text-lg font-bold text-zinc-200 mt-0.5">{history.length}</p>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
              <p className="text-xs text-zinc-500">Best Day</p>
              <p className={cn('text-lg font-bold mt-0.5', best != null ? 'text-green-400' : 'text-zinc-600')}>{best != null ? `${best}%` : '—'}</p>
            </div>
            <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
              <p className="text-xs text-zinc-500">Lowest Day</p>
              <p className={cn('text-lg font-bold mt-0.5', worst != null ? (worst < 70 ? 'text-red-400' : 'text-yellow-400') : 'text-zinc-600')}>{worst != null ? `${worst}%` : '—'}</p>
            </div>
          </div>

          {/* Day type breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-orange-950/30 border border-orange-900/40 rounded-xl p-3">
              <p className="text-xs text-zinc-400 font-medium">Training Days</p>
              <p className="text-xl font-bold text-zinc-200 mt-1">{trainingDays}</p>
              {trainingDays > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  avg {Math.round(history.filter(e => e.day_type === 'training').reduce((s, e) => s + e.compliance_pct, 0) / trainingDays)}% compliance
                </p>
              )}
            </div>
            <div className="bg-blue-950/30 border border-blue-900/40 rounded-xl p-3">
              <p className="text-xs text-zinc-500 font-medium">Rest Days</p>
              <p className="text-xl font-bold text-zinc-200 mt-1">{restDays}</p>
              {restDays > 0 && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  avg {Math.round(history.filter(e => e.day_type === 'rest').reduce((s, e) => s + e.compliance_pct, 0) / restDays)}% compliance
                </p>
              )}
            </div>
          </div>

          {/* 7-day trend mini chart */}
          {recent7.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Recent Compliance Trend</p>
              <div className="flex items-end gap-1 h-16">
                {recent7.map((entry, i) => {
                  const h = Math.max(4, Math.round((entry.compliance_pct / 100) * 56))
                  const color = entry.compliance_pct >= 85 ? 'bg-green-500' : entry.compliance_pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-zinc-500">{entry.compliance_pct}%</span>
                      <div className={cn('w-full rounded-t', color)} style={{ height: `${h}px` }} />
                      <span className="text-[9px] text-zinc-600 capitalize">{entry.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Injury note */}
          {athlete.injury_notes && athlete.injury_notes !== 'No active injuries.' && athlete.injury_notes !== 'No active issues.' && (
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
              <p className="text-xs font-semibold text-zinc-400 mb-1">Injury / Health Note</p>
              <p className="text-xs text-zinc-300 leading-relaxed">{athlete.injury_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── MACROS ── */}
      {section === 'macros' && (
        <div className="space-y-4">
          {/* Training vs Rest targets */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Training Day', key: 'plan',    bg: 'bg-orange-950/20 border-orange-900/30' },
              { label: 'Rest Day',     key: 'restPlan', bg: 'bg-blue-950/20 border-blue-900/30'   },
            ].map(col => {
              const vals = col.key === 'plan'
                ? plan
                : {
                    calories: Math.round((plan.calories || 0) * 0.88),
                    protein:  plan.protein,
                    carbs:    Math.round((plan.carbs || 0) * 0.79),
                    fat:      plan.fat,
                  }
              return (
                <div key={col.key} className={cn('rounded-xl p-3 border', col.bg)}>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{col.label}</p>
                  <div className="space-y-1">
                    {[['Calories', vals.calories, 'kcal'],['Protein', vals.protein, 'g'],['Carbs', vals.carbs, 'g'],['Fat', vals.fat, 'g']].map(([lbl, val, unit]) => (
                      <div key={lbl} className="flex justify-between text-xs">
                        <span className="text-zinc-500">{lbl}</span>
                        <span className="font-semibold text-zinc-200">{val}{unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actual vs Target bars */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Today's Actuals vs Target</p>
            <div className="space-y-3">
              {[
                { label: 'Calories', unit: 'kcal', plan: plan.calories, actual: actual.calories, color: 'bg-orange-500',  textColor: 'text-orange-400' },
                { label: 'Protein',  unit: 'g',    plan: plan.protein,  actual: actual.protein,  color: 'bg-blue-500',    textColor: 'text-blue-400'   },
                { label: 'Carbs',    unit: 'g',    plan: plan.carbs,    actual: actual.carbs,    color: 'bg-yellow-500',  textColor: 'text-yellow-400' },
                { label: 'Fat',      unit: 'g',    plan: plan.fat,      actual: actual.fat,      color: 'bg-pink-500',    textColor: 'text-pink-400'   },
              ].map(m => {
                const pct = m.plan > 0 ? Math.round((m.actual / m.plan) * 100) : 0
                const diff = (m.actual || 0) - (m.plan || 0)
                return (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={cn('font-semibold', m.textColor)}>{m.label}</span>
                      <span className="text-zinc-400">
                        <span className={cn('font-bold', pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400')}>{m.actual}{m.unit}</span>
                        <span className="text-zinc-600"> / {m.plan}{m.unit}</span>
                        <span className={cn('ml-2 font-medium', diff >= 0 ? 'text-green-400' : 'text-red-400')}>{diff > 0 ? '+' : ''}{diff}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', m.color)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-0.5 text-right">{pct}% of target</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Macro % split pie-like bars */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Caloric Split (Actual)</p>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div className="bg-blue-500 transition-all"   style={{ width: `${proteinPct}%`  }} title={`Protein ${proteinPct}%`} />
              <div className="bg-yellow-500 transition-all" style={{ width: `${carbsPct}%`    }} title={`Carbs ${carbsPct}%`}     />
              <div className="bg-pink-500 transition-all"   style={{ width: `${fatPct}%`      }} title={`Fat ${fatPct}%`}         />
            </div>
            <div className="flex gap-4 mt-1.5">
              {[['Protein', proteinPct, 'bg-blue-500'],['Carbs', carbsPct, 'bg-yellow-500'],['Fat', fatPct, 'bg-pink-500']].map(([lbl, pct, bg]) => (
                <div key={lbl} className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <div className={cn('w-2 h-2 rounded-sm', bg)} />
                  {lbl} <span className="font-semibold text-zinc-200">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Avg macros from history */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Historical Avg (from {history.length} logged days)</p>
              <div className="grid grid-cols-4 gap-2">
                {(() => {
                  const avgCal  = Math.round(history.reduce((s, e) => s + (e.totals.calories || 0), 0) / history.length)
                  const avgProt = Math.round(history.reduce((s, e) => s + (e.totals.protein  || 0), 0) / history.length)
                  const avgCarb = Math.round(history.reduce((s, e) => s + (e.totals.carbs    || 0), 0) / history.length)
                  const avgFat  = Math.round(history.reduce((s, e) => s + (e.totals.fat      || 0), 0) / history.length)
                  return [
                    { label: 'Calories', val: avgCal,  unit: 'kcal', color: 'text-orange-400' },
                    { label: 'Protein',  val: avgProt, unit: 'g',    color: 'text-blue-400'   },
                    { label: 'Carbs',    val: avgCarb, unit: 'g',    color: 'text-yellow-400' },
                    { label: 'Fat',      val: avgFat,  unit: 'g',    color: 'text-pink-400'   },
                  ].map(m => (
                    <div key={m.label} className="bg-zinc-800/40 rounded-xl p-2 text-center border border-zinc-700/30">
                      <p className="text-[10px] text-zinc-500">{m.label}</p>
                      <p className={cn('text-sm font-bold mt-0.5', m.color)}>{m.val}</p>
                      <p className="text-[9px] text-zinc-600">{m.unit} avg</p>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MEAL PLAN ── */}
      {section === 'plan' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Current Week Plan</p>
            {liveBoardPlan && Object.keys(liveBoardPlan).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded border border-green-800/40">Live</span>
            )}
          </div>

          {!mealPlan || Object.keys(mealPlan).length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-zinc-600">
              <CalendarDays className="w-7 h-7 mb-2 opacity-40" />
              <p className="text-sm">No meal plan assigned yet</p>
              <p className="text-xs mt-1">Assign meals in the Meal Planner</p>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(mealPlan).map(([day, slots]) => {
                const allItems = Object.values(slots).flat().filter(i => i && (i.name || i.recipe_name))
                if (allItems.length === 0) return null
                return (
                  <div key={day} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3">
                    <p className="text-xs font-semibold text-zinc-300 capitalize mb-2">{day}</p>
                    <div className="space-y-1">
                      {Object.entries(slots).map(([slot, items]) => {
                        const slotItems = (items || []).filter(i => i && (i.name || i.recipe_name))
                        if (slotItems.length === 0) return null
                        const slotMeta = MEAL_SLOT_META[slot]
                        return (
                          <div key={slot} className="flex items-start gap-2">
                            <span className="text-[10px] text-zinc-500 w-16 flex-shrink-0 pt-0.5">{slotMeta?.label || slot}</span>
                            <div className="flex flex-wrap gap-1">
                              {slotItems.map((item, idx) => (
                                <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-zinc-700/60 border border-zinc-600/40 rounded text-zinc-300">
                                  {item.name || item.recipe_name}{item.servings > 1 ? ` ×${item.servings}` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PANTRY ── */}
      {section === 'pantry' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prepped & Available</p>
            <span className="text-xs text-zinc-500">{prepItems.length} item{prepItems.length !== 1 ? 's' : ''}</span>
          </div>

          {prepItems.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-zinc-600">
              <Package className="w-7 h-7 mb-2 opacity-40" />
              <p className="text-sm">Nothing prepped yet</p>
              <p className="text-xs mt-1">Items appear here once prep sessions are logged</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prepItems.map((item, i) => (
                <div key={i} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{item.name || item.recipe_name}</p>
                    <span className="text-xs font-bold text-teal-400 ml-2 flex-shrink-0">{item.remaining} srv left</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                    {item.sessionLabel && <span>Prepped: {item.sessionLabel}</span>}
                    {item.servings_made > 0 && <span>{item.servings_made} made</span>}
                    {item.linkedRecipe && (
                      <span className="text-purple-400 truncate">Recipe: {item.linkedRecipe.name}</span>
                    )}
                  </div>
                  {(item.calories_per_serving > 0 || item.protein_per_serving > 0) && (
                    <div className="flex gap-3 mt-1.5 text-[10px] text-zinc-500">
                      {item.calories_per_serving > 0 && <span>{item.calories_per_serving} kcal/srv</span>}
                      {item.protein_per_serving > 0  && <span>{item.protein_per_serving}g protein</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Assigned recipes summary */}
          {myRecipes.length > 0 && (
            <div className="mt-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Assigned Recipes ({myRecipes.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {myRecipes.map(r => (
                  <span key={r.id} className="text-[10px] px-2 py-1 bg-purple-900/30 border border-purple-800/40 rounded-full text-purple-300">
                    {r.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SUPPLEMENTS ── */}
      {section === 'supplements' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Assigned Supplements</p>
            <span className="text-xs text-zinc-500">{supplements.length} items</span>
          </div>

          {supplements.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-zinc-600">
              <Pill className="w-7 h-7 mb-2 opacity-40" />
              <p className="text-sm">No supplements assigned yet</p>
              <p className="text-xs mt-1">Add supplements via the Meal Planner → Supplements slot</p>
            </div>
          ) : (
            <div className="space-y-2">
              {supplements.map((supp, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-800/40 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{supp.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                      {supp.calories > 0 && <span>{supp.calories} kcal</span>}
                      {supp.protein > 0  && <span>{supp.protein}g protein</span>}
                      {supp.notes && <span className="truncate italic">{supp.notes}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700/60 rounded text-zinc-400 flex-shrink-0">
                    {supp.source === 'custom' ? 'Custom' : supp.source}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Supplement compliance from history */}
          {history.length > 0 && (() => {
            const suppLogs = history.flatMap(e => e.meals?.supplements || [])
            const total = suppLogs.length
            const done  = suppLogs.filter(s => s.completed).length
            const suppPct = total > 0 ? Math.round((done / total) * 100) : 0
            return total > 0 ? (
              <div className="mt-2 p-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-zinc-400">Supplement Adherence</p>
                  <span className={cn('text-sm font-bold', suppPct >= 85 ? 'text-green-400' : suppPct >= 70 ? 'text-yellow-400' : 'text-red-400')}>{suppPct}%</span>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${suppPct}%` }} />
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">{done} of {total} supplement doses taken across {history.length} logged days</p>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* ── HISTORY ── */}
      {section === 'history' && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-zinc-600">
              <History className="w-7 h-7 mb-2 opacity-40" />
              <p className="text-sm">No meal history logged yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
                  <p className="text-xs text-zinc-500">Avg Compliance</p>
                  <p className={cn('text-xl font-bold mt-0.5', avgCompliance >= 85 ? 'text-green-400' : avgCompliance >= 70 ? 'text-yellow-400' : 'text-red-400')}>{avgCompliance}%</p>
                </div>
                <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
                  <p className="text-xs text-zinc-500">Total Days</p>
                  <p className="text-xl font-bold text-zinc-200 mt-0.5">{history.length}</p>
                </div>
              </div>

              <div className="space-y-2">
                {[...history].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
                  <div key={entry.id} className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">{entry.date}</p>
                        <p className="text-[10px] text-zinc-500">{entry.week_label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', entry.day_type === 'training' ? 'bg-orange-900/40 text-orange-400' : 'bg-blue-900/40 text-blue-400')}>
                          {entry.day_type === 'training' ? 'Training' : 'Rest'}
                        </span>
                        <span className={cn('text-sm font-bold', entry.compliance_pct >= 85 ? 'text-green-400' : entry.compliance_pct >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                          {entry.compliance_pct}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        ['Cal', entry.totals.calories, 'kcal', entry.targets?.calories],
                        ['Prot', entry.totals.protein, 'g',    entry.targets?.protein],
                        ['Carbs', entry.totals.carbs, 'g',     null],
                        ['Fat', entry.totals.fat, 'g',         null],
                      ].map(([lbl, val, unit, tgt]) => (
                        <div key={lbl} className="bg-zinc-900/60 rounded-lg p-1.5 text-center">
                          <p className="text-[9px] text-zinc-600">{lbl}</p>
                          <p className="text-[10px] font-bold text-zinc-300">{val}{unit}</p>
                          {tgt && <p className="text-[9px] text-zinc-600">/{tgt}</p>}
                        </div>
                      ))}
                    </div>
                    {entry.notes ? <p className="text-[10px] text-zinc-500 italic mt-1.5">"{entry.notes}"</p> : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ athlete }) {
  const { weightUnit } = useSettingsStore()
  const { isDemo, profile } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const allGoals = storeGoals.length ? storeGoals : (isDemo ? MOCK_GOALS : [])
  const linkedGoals = allGoals.filter(g => (athlete.goal_ids || []).includes(g.id))

  // Local CRUD state — starts with linked goals, can add/edit/delete
  const [goals, setGoals] = useState(linkedGoals.map(g => ({ ...g })))
  const [editingId, setEditingId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: '', goal_type: 'performance', target_value: '', target_unit: 'kg', target_date: '', notes: '' })
  const [confirmDelete, setConfirmDelete] = useState(null)

  async function saveEdit(id, patch) {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g))
    setEditingId(null)
    if (!isDemo && profile?.id && id && !id.startsWith('g')) {
      await saveGoal(athlete.id, { id, ...patch }, profile.id)
    }
  }

  async function addGoal() {
    if (!newGoal.title.trim()) return
    const g = { ...newGoal, id: 'new-' + Date.now(), current_value: 0, target_value: Number(newGoal.target_value) || 0, completed: false, progress_history: [] }
    setGoals(prev => [...prev, g])
    setNewGoal({ title: '', goal_type: 'performance', target_value: '', target_unit: 'kg', target_date: '', notes: '' })
    setShowAdd(false)
    if (!isDemo && athlete?.id) {
      await saveGoal(athlete.id, { ...newGoal, target_value: Number(newGoal.target_value) || 0 }, profile?.id)
    }
  }

  function deleteGoal(id) {
    setGoals(prev => prev.filter(g => g.id !== id))
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Goals ({goals.length})</h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-zinc-800/40 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-300">New Goal</p>
          <input
            value={newGoal.title}
            onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
            placeholder="Goal title (e.g. Squat 230kg)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newGoal.goal_type}
              onChange={e => setNewGoal(p => ({ ...p, goal_type: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="performance">Performance</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="nutrition">Nutrition</option>
              <option value="habit">Habit</option>
            </select>
            <input
              value={newGoal.target_value}
              onChange={e => setNewGoal(p => ({ ...p, target_value: e.target.value }))}
              placeholder="Target"
              type="number"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none"
            />
            <input
              value={newGoal.target_unit}
              onChange={e => setNewGoal(p => ({ ...p, target_unit: e.target.value }))}
              placeholder="Unit (kg, lbs…)"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none"
            />
          </div>
          <input
            value={newGoal.target_date}
            onChange={e => setNewGoal(p => ({ ...p, target_date: e.target.value }))}
            type="date"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          <textarea
            value={newGoal.notes}
            onChange={e => setNewGoal(p => ({ ...p, notes: e.target.value }))}
            placeholder="Notes…"
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" onClick={addGoal}>Add Goal</Button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showAdd && (
        <p className="text-sm text-zinc-500 text-center py-8">No goals yet. Click + Add Goal to create one.</p>
      )}

      {goals.map(goal => {
        const pct = goal.target_value > 0 ? Math.round(((goal.current_value || 0) / goal.target_value) * 100) : 0
        const start = goal.progress_history?.[0]?.value ?? 0
        const isEditing = editingId === goal.id

        return (
          <div key={goal.id} className="bg-zinc-800/30 rounded-xl p-4">
            {isEditing ? (
              <GoalEditForm goal={goal} onSave={patch => saveEdit(goal.id, patch)} onCancel={() => setEditingId(null)} />
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{goal.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 capitalize">{goal.goal_type} · Target: {goal.target_date ? formatDate(goal.target_date) : '—'}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-sm font-black', goal.completed ? 'text-green-400' : 'text-purple-400')}>{pct}%</span>
                    <button onClick={() => setEditingId(goal.id)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(goal.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {confirmDelete === goal.id && (
                  <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <p className="text-xs text-red-300 flex-1">Delete this goal?</p>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400 hover:text-zinc-200">No</button>
                    <button onClick={() => deleteGoal(goal.id)} className="text-xs text-red-400 hover:text-red-300 font-semibold ml-2">Yes, delete</button>
                  </div>
                )}
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Start: {start} {goal.target_unit}</span>
                  <span>Now: {goal.current_value ?? '—'} {goal.target_unit}</span>
                  <span>Target: {goal.target_value} {goal.target_unit}</span>
                </div>
                <ProgressBar value={goal.current_value || 0} max={goal.target_value} color={goal.completed ? 'green' : 'purple'} />
                {goal.notes && <p className="text-xs text-zinc-400 mt-2">{goal.notes}</p>}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function GoalEditForm({ goal, onSave, onCancel }) {
  const [title, setTitle] = useState(goal.title)
  const [target_value, setTargetValue] = useState(goal.target_value)
  const [target_unit, setTargetUnit] = useState(goal.target_unit)
  const [target_date, setTargetDate] = useState(goal.target_date || '')
  const [notes, setNotes] = useState(goal.notes || '')
  const [current_value, setCurrentValue] = useState(goal.current_value || 0)

  return (
    <div className="space-y-3">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Current</label>
          <input type="number" value={current_value} onChange={e => setCurrentValue(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Target</label>
          <input type="number" value={target_value} onChange={e => setTargetValue(Number(e.target.value))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Unit</label>
          <input value={target_unit} onChange={e => setTargetUnit(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none" />
        </div>
      </div>
      <input type="date" value={target_date} onChange={e => setTargetDate(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notes…"
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none resize-none" />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="flex-1" onClick={() => onSave({ title, target_value, target_unit, target_date, notes, current_value })}>
          <Save className="w-3.5 h-3.5" /> Save
        </Button>
      </div>
    </div>
  )
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ athlete }) {
  const { isDemo, profile } = useAuthStore()
  const initNotes = athlete.coach_notes
    ? [{ id: 1, text: athlete.coach_notes, timestamp: '2026-02-20 09:00', pinned: false }]
    : []
  const [notesList, setNotesList] = useState(initNotes)
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Injury notes
  const [injuryText, setInjuryText] = useState(athlete.injury_notes || '')
  const [editingInjury, setEditingInjury] = useState(false)
  const [savedInjury, setSavedInjury] = useState(false)

  async function addNote() {
    if (!newNote.trim()) return
    const now = new Date()
    const ts = now.toISOString().slice(0, 16).replace('T', ' ')
    const noteId = Date.now()
    setNotesList(prev => [{ id: noteId, text: newNote.trim(), timestamp: ts, pinned: false }, ...prev])
    setNewNote('')
    if (!isDemo && profile?.id && athlete?.id && !athlete.id.startsWith('u-')) {
      await saveCoachNote(profile.id, athlete.id, newNote.trim(), noteId)
    }
  }

  function startEdit(note) {
    setEditingId(note.id)
    setEditText(note.text)
  }

  async function saveEdit(id) {
    setNotesList(prev => prev.map(n => n.id === id ? { ...n, text: editText } : n))
    setEditingId(null)
    if (!isDemo && profile?.id && athlete?.id && !athlete.id.startsWith('u-')) {
      await saveCoachNote(profile.id, athlete.id, editText, id)
    }
  }

  function deleteNote(id) {
    setNotesList(prev => prev.filter(n => n.id !== id))
    setConfirmDelete(null)
  }

  async function saveInjury() {
    setSavedInjury(true)
    setEditingInjury(false)
    setTimeout(() => setSavedInjury(false), 2000)
    if (!isDemo && athlete?.id && !athlete.id.startsWith('u-')) {
      // Find the most recent non-mock injury log id from athlete data if available
      const injuryId = athlete.injury_log_id
      if (injuryId && !String(injuryId).startsWith('inj-')) {
        await updateInjury(injuryId, { coach_notes: injuryText.trim() || null })
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Add note */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-purple-400" /> Coach Notes
        </label>
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          placeholder="Add a note about this athlete…"
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote() }}
        />
        <Button onClick={addNote} disabled={!newNote.trim()} className="w-full">
          <Plus className="w-4 h-4" /> Add Note
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {notesList.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-4">No notes yet. Add one above.</p>
        )}
        {notesList.map(note => (
          <div key={note.id} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4">
            {editingId === note.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveEdit(note.id)}><Save className="w-3.5 h-3.5" /> Save</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-zinc-500">{note.timestamp}</p>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(note)} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(note.id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {confirmDelete === note.id && (
                  <div className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <p className="text-xs text-red-300 flex-1">Delete this note?</p>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-zinc-400">No</button>
                    <button onClick={() => deleteNote(note.id)} className="text-xs text-red-400 font-semibold ml-2">Delete</button>
                  </div>
                )}
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{note.text}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Injury notes */}
      <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Injury / Medical Log
          </p>
          {!editingInjury
            ? <button onClick={() => setEditingInjury(true)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            : <div className="flex gap-2">
                <button onClick={() => { setEditingInjury(false); setInjuryText(athlete.injury_notes || '') }} className="text-xs text-zinc-500">Cancel</button>
                <button onClick={saveInjury} className="text-xs text-orange-400 font-semibold">{savedInjury ? 'Saved' : 'Save'}</button>
              </div>
          }
        </div>
        {editingInjury
          ? <textarea
              value={injuryText}
              onChange={e => setInjuryText(e.target.value)}
              rows={3}
              className="w-full bg-zinc-900/60 border border-orange-500/30 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
            />
          : <p className="text-sm text-zinc-300">{injuryText || 'No injuries or medical notes on file.'}</p>
        }
      </div>
    </div>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function QueueStatusBadge({ status }) {
  const map = {
    completed: { label: 'Done', color: 'green' },
    video_pending: { label: 'Video', color: 'purple' },
    missed: { label: 'Missed', color: 'red' },
    in_progress: { label: 'Active', color: 'blue' },
  }
  const s = map[status] || { label: status, color: 'default' }
  return <Badge color={s.color}>{s.label}</Badge>
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

