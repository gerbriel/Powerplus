import { useState, useRef } from 'react'
import {
  Dumbbell, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Video, AlertTriangle, Plus, ArrowLeft, Camera, ImageIcon,
  Trash2, Star, BarChart2, FileText, Scale, Edit2, Eye,
  Timer, Heart, Zap, MapPin, Clock, Target, Search, X,
  Filter, TrendingUp, Trophy, Calendar, Link2, Layers, Save, PenLine,
  Users, Activity, ChevronRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { ProgressBar } from '../components/ui/ProgressBar'
import { MOCK_TODAY_WORKOUT, MOCK_PAST_WORKOUTS, MOCK_GOALS, MOCK_WEEK_SCHEDULE, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_ATHLETES, MOCK_STAFF_ASSIGNMENTS } from '../lib/mockData'
import { cn, calcE1RM, calcDotsScore, convertWeight, toKg, kgToLbs } from '../lib/utils'
import { useSettingsStore, useGoalsStore, useAuthStore, useUIStore, resolveRole, isStaffRole } from '../lib/store'

// ─── Helpers ────────────────────────────────────────────────────────────────
function convertIntensity(intensity, weightUnit) {
  if (!intensity) return ''
  const match = intensity.match(/^([\d.]+)\s*kg$/i)
  if (match) {
    const kg = parseFloat(match[1])
    if (weightUnit === 'lbs') return `${Math.round(kgToLbs(kg))}lbs`
    return `${kg}kg`
  }
  return intensity // RPE, BW, etc. pass through unchanged
}

// ─── View enum ──────────────────────────────────────────────────────────────
const VIEW = { LIST: 'list', ACTIVE: 'active', HISTORY_DETAIL: 'history_detail' }

export function WorkoutPage() {
  const { profile, viewAsAthlete, orgMemberships, activeOrgId } = useAuthStore()
  const membership = orgMemberships?.find(m => m.org_id === activeOrgId)
  const canViewAsAthlete = membership?.is_self_athlete === true
  const isStaff = !viewAsAthlete && isStaffRole(profile, membership)

  if (isStaff) return <StaffTrainingPage profile={profile} membership={membership} />

  return <AthleteWorkoutPage />
}

function AthleteWorkoutPage() {
  const [view, setView] = useState(VIEW.LIST)
  const [activeWorkout, setActiveWorkout] = useState(null)
  const [selectedHistory, setSelectedHistory] = useState(null)
  const [expandedBlock, setExpandedBlock] = useState('main')
  const [logModal, setLogModal] = useState(null)
  const [logData, setLogData] = useState({})
  const [completedSets, setCompletedSets] = useState({})
  const [painModal, setPainModal] = useState(false)
  const [editHistoryModal, setEditHistoryModal] = useState(null)
  const [cardioModal, setCardioModal] = useState(null)
  const [cardioData, setCardioData] = useState({})
  // History search/filter
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState('all') // all | squat | bench | deadlift | pr | high_rpe
  const [workoutTab, setWorkoutTab] = useState('schedule') // schedule | blocks | history
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [customWorkouts, setCustomWorkouts] = useState([])
  const [customModal, setCustomModal] = useState(false)
  const { weightUnit, toggleWeightUnit, gymLocations, preferredLocation, preferredWorkoutTime, preferredDuration } = useSettingsStore()
  const { goals, pushPRToGoals } = useGoalsStore()
  const activeGym = gymLocations?.find(l => l.id === preferredLocation) || gymLocations?.[0]

  const handleStartWorkout = (workout) => {
    setActiveWorkout(workout)
    setCompletedSets({})
    setExpandedBlock('main')
    setView(VIEW.ACTIVE)
  }

  const handleSaveSet = () => {
    const key = `${logModal.exerciseId}-${logModal.setIndex}`
    const weightKg = toKg(logData.weight, weightUnit)
    const entry = { ...logData, weight_kg: weightKg, media: logData.media || [] }
    setCompletedSets(prev => ({ ...prev, [key]: entry }))
    // Auto-update linked goals if this is marked as a PR or top set
    if ((logData.pr || logData.is_top_set) && weightKg) {
      pushPRToGoals(logModal.exerciseName, calcE1RM(weightKg, Number(logData.reps) || 1))
    }
    setLogData({})
    setLogModal(null)
  }

  const handleSaveCardio = () => {
    const key = `${cardioModal.exercise.id}-0`
    setCompletedSets(prev => ({ ...prev, [key]: { ...cardioData, is_cardio: true } }))
    setCardioData({})
    setCardioModal(null)
  }

  const handleCompleteWorkout = () => {
    setView(VIEW.LIST)
    setActiveWorkout(null)
    setCompletedSets({})
  }

  const handleSaveCustomWorkout = (workout) => {
    setCustomWorkouts(prev => [workout, ...prev])
    setCustomModal(false)
  }

  // ── History filtering ────────────────────────────────────────────────────
  const allHistory = [
    ...customWorkouts,
    ...MOCK_PAST_WORKOUTS,
  ]
  const filteredHistory = allHistory.filter((s) => {
    const q = historySearch.toLowerCase()
    const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.date.includes(q) ||
      (s.blocks ?? []).flatMap(b => b.exercises).some(e => e.name.toLowerCase().includes(q))
    const matchesFilter = historyFilter === 'all' ||
      (historyFilter === 'custom' && s.is_custom) ||
      (historyFilter === 'squat' && (s.blocks ?? []).flatMap(b => b.exercises).some(e => e.name.toLowerCase().includes('squat'))) ||
      (historyFilter === 'bench' && (s.blocks ?? []).flatMap(b => b.exercises).some(e => e.name.toLowerCase().includes('bench'))) ||
      (historyFilter === 'deadlift' && (s.blocks ?? []).flatMap(b => b.exercises).some(e => e.name.toLowerCase().includes('deadlift'))) ||
      (historyFilter === 'pr' && (s.blocks ?? []).flatMap(b => b.exercises).flatMap(e => e.sets_logged ?? []).some(sl => sl.is_top_set)) ||
      (historyFilter === 'high_rpe' && s.avg_rpe >= 8.5)
    return matchesSearch && matchesFilter
  })

  // ── Render ─────────────────────────────────────────────────────────────────
  if (view === VIEW.HISTORY_DETAIL && selectedHistory) {
    return (
      <HistoryDetailView
        session={selectedHistory}
        weightUnit={weightUnit}
        onBack={() => setView(VIEW.LIST)}
        onEdit={() => setEditHistoryModal(selectedHistory)}
        editModal={editHistoryModal}
        onCloseEdit={() => setEditHistoryModal(null)}
      />
    )
  }

  if (view === VIEW.ACTIVE && activeWorkout) {
    return (
      <ActiveWorkoutView
        workout={activeWorkout}
        weightUnit={weightUnit}
        toggleWeightUnit={toggleWeightUnit}
        expandedBlock={expandedBlock}
        setExpandedBlock={setExpandedBlock}
        completedSets={completedSets}
        logModal={logModal}
        setLogModal={setLogModal}
        logData={logData}
        setLogData={setLogData}
        painModal={painModal}
        setPainModal={setPainModal}
        cardioModal={cardioModal}
        setCardioModal={setCardioModal}
        cardioData={cardioData}
        setCardioData={setCardioData}
        onSaveSet={handleSaveSet}
        onSaveCardio={handleSaveCardio}
        onComplete={handleCompleteWorkout}
      />
    )
  }

  // LIST view
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Workouts</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Schedule, history &amp; PRs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setCustomModal(true)}>
            <PenLine className="w-3.5 h-3.5" /> Log Custom
          </Button>
          {/* Global unit toggle */}
          <button
            onClick={toggleWeightUnit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-semibold text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-purple-400" />
            {weightUnit.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { id: 'schedule', label: 'Schedule', icon: Calendar },
          { id: 'blocks', label: 'Training Blocks', icon: Layers },
          { id: 'history', label: 'History', icon: FileText },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setWorkoutTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              workoutTab === t.id
                ? 'bg-zinc-800 text-zinc-100 border-b-2 border-purple-500'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {workoutTab === 'schedule' && (
        <>
          {/* Can't do assigned workout banner */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Can't do the assigned workout?</p>
                <p className="text-xs text-zinc-500 mt-0.5">Log a custom session instead — it'll appear in your history.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCustomModal(true)}>
              <PenLine className="w-3.5 h-3.5" /> Create
            </Button>
          </div>

          {/* ── This Week ── */}
          <WeekScheduleCard
            weightUnit={weightUnit}
            onStartWorkout={handleStartWorkout}
            onViewWorkout={(s) => { setSelectedHistory(s); setView(VIEW.HISTORY_DETAIL) }}
          />

          {/* e1RM / DOTS summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-purple-400" /> Current e1RMs
                </CardTitle>
                <span className="text-xs text-zinc-500">in {weightUnit}</span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { lift: 'Squat', e1rm_kg: 220 },
                  { lift: 'Bench', e1rm_kg: 155 },
                  { lift: 'Deadlift', e1rm_kg: 280 },
                ].map((l) => {
                  const display = weightUnit === 'lbs' ? kgToLbs(l.e1rm_kg) : l.e1rm_kg
                  return (
                    <div key={l.lift} className="text-center p-3 bg-zinc-700/30 rounded-xl">
                      <p className="text-xs text-zinc-400 font-medium">{l.lift}</p>
                      <p className="text-2xl font-black text-zinc-100 mt-1">{display}</p>
                      <p className="text-xs text-zinc-500">{weightUnit}</p>
                    </div>
                  )
                })}
              </div>
              {/* DOTS score */}
              <DotsScoreRow weightUnit={weightUnit} />
            </CardBody>
          </Card>
        </>
      )}

      {workoutTab === 'blocks' && (
        <TrainingBlocksView
          weightUnit={weightUnit}
          selectedBlock={selectedBlock}
          setSelectedBlock={setSelectedBlock}
        />
      )}

      {workoutTab === 'history' && (
        <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <CardTitle>Session History</CardTitle>
            <span className="text-xs text-zinc-500">{filteredHistory.length} sessions</span>
          </div>
          {/* Search bar */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search sessions, exercises, dates…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
            {historySearch && (
              <button onClick={() => setHistorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
              </button>
            )}
          </div>
          {/* Filter chips */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'custom', label: 'Custom' },
              { id: 'squat', label: 'Squat' },
              { id: 'bench', label: 'Bench' },
              { id: 'deadlift', label: 'Deadlift' },
              { id: 'pr', label: '⭐ Top Sets' },
              { id: 'high_rpe', label: 'High RPE' },
            ].map(f => (
              <button key={f.id} onClick={() => setHistoryFilter(f.id)}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  historyFilter === f.id
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                {f.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardBody>
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No sessions match your search.</div>
          ) : (
          <div className="space-y-1">
            {filteredHistory.map((s) => {
              const blocks = s.blocks ?? []
              const volDisplay = s.total_volume_kg
                ? (weightUnit === 'lbs' ? `${Math.round(kgToLbs(s.total_volume_kg)).toLocaleString()} lbs` : `${s.total_volume_kg.toLocaleString()} kg`)
                : null
              const mediaCount = blocks.flatMap(b => b.exercises ?? []).flatMap(e => e.sets_logged ?? []).flatMap(sl => sl.media ?? []).length
              const hasPR = blocks.flatMap(b => b.exercises ?? []).flatMap(e => e.sets_logged ?? []).some(sl => sl.is_top_set)
              const mainExercises = [...new Set(blocks.filter(b => b.type === 'main').flatMap(b => b.exercises ?? []).map(e => e.name))]
              const block = s.linked_block_id ? MOCK_TRAINING_BLOCKS.find(b => b.id === s.linked_block_id) : null
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedHistory(s); setView(VIEW.HISTORY_DETAIL) }}
                  className="w-full flex items-center justify-between p-3 hover:bg-zinc-700/30 rounded-xl transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={cn('w-4 h-4 flex-shrink-0', s.is_custom ? 'text-purple-400' : 'text-green-400')} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{s.name}</p>
                        {s.is_custom && <span className="text-xs px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/25 text-purple-300 rounded-full font-medium">Custom</span>}
                        {hasPR && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-500">{s.date}</span>
                        {s.total_sets && <><span className="text-zinc-700">·</span><span className="text-xs text-zinc-500">{s.total_sets} sets</span></>}
                        {volDisplay && <><span className="text-zinc-700">·</span><span className="text-xs text-zinc-500">{volDisplay}</span></>}
                        {mainExercises.length > 0 && (
                          <><span className="text-zinc-700">·</span>
                          <span className="text-xs text-zinc-500">{mainExercises.join(', ')}</span></>
                        )}
                        {s.is_custom && s.exercise_count > 0 && (
                          <><span className="text-zinc-700">·</span>
                          <span className="text-xs text-zinc-500">{s.exercise_count} exercise{s.exercise_count !== 1 ? 's' : ''}</span></>
                        )}
                        {block && (
                          <><span className="text-zinc-700">·</span>
                          <span className="text-xs text-zinc-500 flex items-center gap-0.5"><Layers className="w-2.5 h-2.5" />{block.name.split('–')[0].trim()}</span></>
                        )}
                        {mediaCount > 0 && (
                          <><span className="text-zinc-700">·</span>
                          <span className="text-xs text-blue-400 flex items-center gap-0.5"><Camera className="w-3 h-3" />{mediaCount}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.avg_rpe && (
                      <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg',
                        s.avg_rpe >= 9 ? 'text-red-300 bg-red-500/10' : s.avg_rpe >= 8 ? 'text-orange-300 bg-orange-500/10' : 'text-zinc-300 bg-zinc-700')}>
                        RPE {s.avg_rpe}
                      </span>
                    )}
                    <Eye className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  </div>
                </button>
              )
            })}
          </div>
          )}
        </CardBody>
        </Card>
      )}

      <CustomWorkoutModal open={customModal} onClose={() => setCustomModal(false)} onSave={handleSaveCustomWorkout} />
    </div>
  )
}

// ─── Custom Workout Modal ─────────────────────────────────────────────────────
function CustomWorkoutModal({ open, onClose, onSave }) {
  const blankExercise = () => ({ id: Date.now() + Math.random(), name: '', sets: '', reps: '', weight: '', rpe: '', notes: '' })
  const [form, setForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    notes: '',
    exercises: [blankExercise()],
  })

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const setEx = (idx, k, v) => setForm(prev => {
    const exercises = [...prev.exercises]
    exercises[idx] = { ...exercises[idx], [k]: v }
    return { ...prev, exercises }
  })
  const addEx  = () => setForm(prev => ({ ...prev, exercises: [...prev.exercises, blankExercise()] }))
  const removeEx = (idx) => setForm(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }))

  const handleSave = () => {
    if (!form.name.trim()) return
    const exercises = form.exercises.filter(e => e.name.trim())
    onSave({
      id: `custom_${Date.now()}`,
      name: form.name,
      date: form.date,
      is_custom: true,
      reason: form.reason,
      notes: form.notes,
      exercise_count: exercises.length,
      total_sets: exercises.reduce((s, e) => s + (Number(e.sets) || 0), 0),
      avg_rpe: null,
      total_volume_kg: null,
      blocks: [{
        type: 'main',
        exercises: exercises.map(e => ({
          name: e.name,
          sets_logged: Array.from({ length: Number(e.sets) || 1 }).map(() => ({
            reps: Number(e.reps) || 0,
            weight: e.weight,
            rpe: e.rpe,
            is_top_set: false,
            media: [],
          })),
        })),
      }],
    })
    // reset
    setForm({ name: '', date: new Date().toISOString().split('T')[0], reason: '', notes: '', exercises: [blankExercise()] })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Custom Workout" size="lg">
      <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
        {/* Name + date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Workout Name *</label>
            <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Modified Lower Body"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
            <input type="date" value={form.date} onChange={e => setF('date', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reason for substitution <span className="text-zinc-600 font-normal">(optional)</span></label>
          <input value={form.reason} onChange={e => setF('reason', e.target.value)} placeholder="e.g. Equipment unavailable, injury, travel…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Exercises</p>
            <button onClick={addEx} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Add Exercise
            </button>
          </div>
          <div className="space-y-2">
            {form.exercises.map((ex, idx) => (
              <div key={ex.id} className="bg-zinc-700/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={ex.name} onChange={e => setEx(idx, 'name', e.target.value)} placeholder={`Exercise ${idx + 1} name`}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  {form.exercises.length > 1 && (
                    <button onClick={() => removeEx(idx)} className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'sets',   label: 'Sets',   placeholder: '4' },
                    { key: 'reps',   label: 'Reps',   placeholder: '5' },
                    { key: 'weight', label: 'Weight', placeholder: '100kg' },
                    { key: 'rpe',    label: 'RPE',    placeholder: '8' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-zinc-500 mb-1">{f.label}</label>
                      <input value={ex[f.key]} onChange={e => setEx(idx, f.key, e.target.value)} placeholder={f.placeholder}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Notes</label>
                  <input value={ex.notes} onChange={e => setEx(idx, 'notes', e.target.value)} placeholder="Form cues, modifications…"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">General Notes</label>
          <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2}
            placeholder="How did it feel? Any issues?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}><Save className="w-4 h-4" /> Save Workout</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Training Blocks View ────────────────────────────────────────────────────
function TrainingBlocksView({ weightUnit, selectedBlock, setSelectedBlock }) {
  const phaseMeta = {
    accumulation: { color: 'text-blue-300 bg-blue-500/10 border-blue-500/20', label: 'Accumulation' },
    intensification: { color: 'text-purple-300 bg-purple-500/10 border-purple-500/20', label: 'Intensification' },
    peaking: { color: 'text-orange-300 bg-orange-500/10 border-orange-500/20', label: 'Peaking' },
    deload: { color: 'text-teal-300 bg-teal-500/10 border-teal-500/20', label: 'Deload' },
  }
  const statusMeta = {
    completed: { color: 'text-green-300 bg-green-500/10', label: 'Completed' },
    active: { color: 'text-purple-300 bg-purple-500/10', label: 'Active' },
    planned: { color: 'text-zinc-400 bg-zinc-700/50', label: 'Planned' },
  }

  if (selectedBlock) {
    return <BlockDetailModal block={selectedBlock} weightUnit={weightUnit} onBack={() => setSelectedBlock(null)} />
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        {MOCK_TRAINING_BLOCKS.filter(b => b.status === 'active').length} active ·{' '}
        {MOCK_TRAINING_BLOCKS.filter(b => b.status === 'completed').length} completed ·{' '}
        {MOCK_TRAINING_BLOCKS.filter(b => b.status === 'planned').length} planned
      </p>
      {MOCK_TRAINING_BLOCKS.map((block) => {
        const phase = phaseMeta[block.phase] || phaseMeta.accumulation
        const status = statusMeta[block.status] || statusMeta.planned
        const pct = Math.round((block.sessions_completed / block.sessions_planned) * 100)
        const linkedGoal = MOCK_GOALS.find(g => block.linked_goal_ids?.includes(g.id))
        const linkedMeet = block.linked_meet_id ? MOCK_MEETS.find(m => m.id === block.linked_meet_id) : null
        return (
          <button
            key={block.id}
            onClick={() => setSelectedBlock(block)}
            className="w-full text-left p-4 bg-zinc-800/60 border border-zinc-700/60 rounded-2xl hover:border-zinc-500 hover:bg-zinc-800 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', phase.color)}>
                    {phase.label}
                  </span>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.color)}>
                    {status.label}
                  </span>
                  {block.status === 'active' && (
                    <span className="flex items-center gap-1 text-xs text-purple-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                      In progress
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-zinc-100 group-hover:text-white transition-colors">{block.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{block.start_date} → {block.end_date}</p>
                {block.focus && (
                  <p className="text-xs text-zinc-400 mt-1">{block.focus}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-black text-zinc-100">{pct}%</p>
                <p className="text-xs text-zinc-500">{block.sessions_completed}/{block.sessions_planned} sessions</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', block.status === 'active' ? 'bg-purple-500' : block.status === 'completed' ? 'bg-green-500' : 'bg-zinc-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              {block.avg_rpe_target && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Avg RPE {block.avg_rpe_target}
                </span>
              )}
              {linkedMeet && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" /> {linkedMeet.name}
                </span>
              )}
              {linkedGoal && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Target className="w-3 h-3 text-teal-400" /> {linkedGoal.title}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Block Detail Modal ───────────────────────────────────────────────────────
function BlockDetailModal({ block, weightUnit, onBack }) {
  const [detailTab, setDetailTab] = useState('overview')
  const { goals } = useGoalsStore()

  const pct = Math.round((block.sessions_completed / block.sessions_planned) * 100)
  const phaseMeta = {
    accumulation: { color: 'text-blue-300 bg-blue-500/10 border-blue-500/20', label: 'Accumulation' },
    intensification: { color: 'text-purple-300 bg-purple-500/10 border-purple-500/20', label: 'Intensification' },
    peaking: { color: 'text-orange-300 bg-orange-500/10 border-orange-500/20', label: 'Peaking' },
    deload: { color: 'text-teal-300 bg-teal-500/10 border-teal-500/20', label: 'Deload' },
  }
  const phase = phaseMeta[block.phase] || phaseMeta.accumulation

  const linkedGoals = MOCK_GOALS.filter(g => block.linked_goal_ids?.includes(g.id))
  const linkedMeet = block.linked_meet_id ? MOCK_MEETS.find(m => m.id === block.linked_meet_id) : null
  const blockSessions = MOCK_PAST_WORKOUTS.filter(s => s.linked_block_id === block.id)

  const sessionsByWeek = blockSessions.reduce((acc, s) => {
    const week = s.week_label || s.date?.slice(0, 7) || 'Week'
    if (!acc[week]) acc[week] = []
    acc[week].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All Training Blocks
      </button>

      {/* Header card */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={cn('text-xs font-semibold px-2.5 py-0.5 rounded-full border', phase.color)}>{phase.label}</span>
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                  block.status === 'active' ? 'text-purple-300 bg-purple-500/10' :
                  block.status === 'completed' ? 'text-green-300 bg-green-500/10' : 'text-zinc-400 bg-zinc-700/50')}>
                  {block.status.charAt(0).toUpperCase() + block.status.slice(1)}
                </span>
              </div>
              <h2 className="text-lg font-black text-zinc-100">{block.name}</h2>
              <p className="text-sm text-zinc-400 mt-0.5">{block.start_date} → {block.end_date}</p>
              {block.focus && <p className="text-sm text-zinc-300 mt-2">{block.focus}</p>}
            </div>
            {/* Progress ring-ish */}
            <div className="text-center flex-shrink-0">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="#3f3f46" strokeWidth="6" />
                  <circle cx="32" cy="32" r="26" fill="none"
                    stroke={block.status === 'completed' ? '#4ade80' : '#a855f7'}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-100">{pct}%</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{block.sessions_completed}/{block.sessions_planned}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {block.avg_rpe_target && (
              <div className="text-center p-2 bg-zinc-700/30 rounded-xl">
                <p className="text-xs text-zinc-500">Avg RPE</p>
                <p className="text-lg font-black text-zinc-100">{block.avg_rpe_target}</p>
              </div>
            )}
            <div className="text-center p-2 bg-zinc-700/30 rounded-xl">
              <p className="text-xs text-zinc-500">Sessions</p>
              <p className="text-lg font-black text-zinc-100">{block.sessions_planned}</p>
            </div>
            {block.weeks && (
              <div className="text-center p-2 bg-zinc-700/30 rounded-xl">
                <p className="text-xs text-zinc-500">Weeks</p>
                <p className="text-lg font-black text-zinc-100">{block.weeks}</p>
              </div>
            )}
          </div>

          {/* Linked meet */}
          {linkedMeet && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
              <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-yellow-300">{linkedMeet.name}</p>
                <p className="text-xs text-zinc-500">{linkedMeet.meet_date}</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'sessions', label: `Sessions (${blockSessions.length})` },
          { id: 'goals', label: `Goals (${linkedGoals.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setDetailTab(t.id)}
            className={cn('px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
              detailTab === t.id ? 'bg-zinc-800 text-zinc-100 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {detailTab === 'overview' && (
        <Card>
          <CardBody className="space-y-4">
            {block.focus && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Focus</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{block.focus}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-700/30 rounded-xl">
                <p className="text-xs text-zinc-500">Phase</p>
                <p className="text-sm font-semibold text-zinc-200 capitalize mt-0.5">{block.phase}</p>
              </div>
              {block.avg_rpe_target && (
                <div className="p-3 bg-zinc-700/30 rounded-xl">
                  <p className="text-xs text-zinc-500">Avg RPE Target</p>
                  <p className="text-sm font-semibold text-zinc-200 mt-0.5">{block.avg_rpe_target}</p>
                </div>
              )}
              <div className="p-3 bg-zinc-700/30 rounded-xl">
                <p className="text-xs text-zinc-500">Duration</p>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">{block.weeks} weeks</p>
              </div>
              <div className="p-3 bg-zinc-700/30 rounded-xl">
                <p className="text-xs text-zinc-500">Sessions/Week</p>
                <p className="text-sm font-semibold text-zinc-200 mt-0.5">{Math.round(block.sessions_planned / (block.weeks || 4))}</p>
              </div>
            </div>
            {block.notes && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Coach Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed italic">&ldquo;{block.notes}&rdquo;</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Sessions tab */}
      {detailTab === 'sessions' && (
        <Card>
          <CardBody>
            {blockSessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {block.status === 'planned' ? 'Sessions will appear here once the block starts.' : 'No logged sessions yet.'}
              </div>
            ) : (
              <div className="space-y-1">
                {Object.entries(sessionsByWeek).map(([week, sessions]) => (
                  <div key={week}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1 py-2">{week}</p>
                    {sessions.map(s => {
                      const vol = weightUnit === 'lbs'
                        ? `${Math.round(kgToLbs(s.total_volume_kg)).toLocaleString()} lbs`
                        : `${s.total_volume_kg.toLocaleString()} kg`
                      const hasPR = s.blocks?.flatMap(b => b.exercises).flatMap(e => e.sets_logged).some(sl => sl.is_top_set)
                      return (
                        <div key={s.id} className="flex items-center justify-between p-2.5 hover:bg-zinc-700/30 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-zinc-200">{s.name}</p>
                                {hasPR && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                              </div>
                              <p className="text-xs text-zinc-500">{s.date} · {s.total_sets} sets · {vol}</p>
                            </div>
                          </div>
                          <span className={cn('text-xs font-semibold px-2 py-1 rounded-lg',
                            s.avg_rpe >= 9 ? 'text-red-300 bg-red-500/10' : s.avg_rpe >= 8 ? 'text-orange-300 bg-orange-500/10' : 'text-zinc-300 bg-zinc-700')}>
                            RPE {s.avg_rpe}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Goals tab */}
      {detailTab === 'goals' && (
        <div className="space-y-3">
          {linkedGoals.length === 0 ? (
            <Card><CardBody>
              <div className="text-center py-6 text-zinc-500 text-sm">No goals linked to this block.</div>
            </CardBody></Card>
          ) : linkedGoals.map(g => {
            const startVal = g.progress_history?.[0]?.value ?? g.current_value
            const pctGoal = Math.min(100, Math.round(((g.current_value - startVal) / ((g.target_value || 1) - startVal)) * 100))
            const display = (v) => weightUnit === 'lbs' && g.target_unit === 'kg' ? `${Math.round(kgToLbs(v))} lbs` : `${v} ${g.target_unit || ''}`
            return (
              <Card key={g.id}>
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-zinc-100">{g.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{g.target_date}</p>
                    </div>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                      g.status === 'on_track' ? 'text-green-300 bg-green-500/10' : 'text-yellow-300 bg-yellow-500/10')}>
                      {g.status === 'on_track' ? 'On Track' : 'In Progress'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                    <span>{display(g.current_value)}</span>
                    <span className="text-zinc-100 font-bold">{pctGoal}%</span>
                    <span>{display(g.target_value)}</span>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.max(0, pctGoal)}%` }} />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Week Schedule Card ──────────────────────────────────────────────────────
function WeekScheduleCard({ weightUnit, onStartWorkout, onViewWorkout }) {
  const { gymLocations, preferredLocation, preferredWorkoutTime, preferredDuration } = useSettingsStore()
  const activeGym = gymLocations?.find(l => l.id === preferredLocation) || gymLocations?.[0]
  const [previewSession, setPreviewSession] = useState(null)

  const statusConfig = {
    completed: { dot: 'bg-green-400', badge: 'text-green-300 bg-green-500/10 border-green-500/20', label: 'Done' },
    today: { dot: 'bg-purple-400 animate-pulse', badge: 'text-purple-300 bg-purple-500/10 border-purple-500/30', label: 'Today' },
    scheduled: { dot: 'bg-zinc-500', badge: 'text-zinc-400 bg-zinc-700 border-zinc-600', label: 'Scheduled' },
    rest: { dot: 'bg-zinc-700', badge: 'text-zinc-600 bg-zinc-800 border-zinc-700', label: 'Rest' },
  }

  const completedCount = MOCK_WEEK_SCHEDULE.filter(s => s.status === 'completed').length
  const totalCount = MOCK_WEEK_SCHEDULE.length

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" /> This Week
              </CardTitle>
              <p className="text-xs text-zinc-500 mt-0.5">
                {completedCount}/{totalCount} sessions complete · Week 8 of Block 2
              </p>
            </div>
            {/* Week progress mini-bar */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }} />
              </div>
              <span className="text-xs text-zinc-500">{Math.round((completedCount / totalCount) * 100)}%</span>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-1.5">
            {MOCK_WEEK_SCHEDULE.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.scheduled
              const block = s.linked_block_id ? MOCK_TRAINING_BLOCKS.find(b => b.id === s.linked_block_id) : null
              const mainExercises = s.blocks
                ? [...new Set(s.blocks.filter(b => b.type === 'main').flatMap(b => b.exercises).map(e => e.name))]
                : []
              const topSet = s.blocks
                ? s.blocks.flatMap(b => b.exercises).flatMap(e => e.sets_logged || []).find(sl => sl?.is_top_set)
                : null

              return (
                <div key={s.id}
                  className={cn('flex items-center gap-3 p-3 rounded-xl border transition-all',
                    s.status === 'today' ? 'border-purple-500/30 bg-purple-500/5' : 'border-transparent hover:bg-zinc-700/20'
                  )}>
                  {/* Day badge */}
                  <div className={cn('w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0',
                    s.status === 'today' ? 'bg-purple-600/30' : s.status === 'completed' ? 'bg-green-500/10' : 'bg-zinc-700/40'
                  )}>
                    <span className={cn('text-xs font-bold leading-none',
                      s.status === 'today' ? 'text-purple-300' : s.status === 'completed' ? 'text-green-400' : 'text-zinc-400'
                    )}>{s.day}</span>
                    <span className="text-[10px] text-zinc-500 leading-none mt-0.5">{s.date.slice(8)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn('text-sm font-semibold truncate',
                        s.status === 'today' ? 'text-purple-200' : s.status === 'completed' ? 'text-zinc-200' : 'text-zinc-400'
                      )}>{s.name}</p>
                      <span className={cn('text-xs px-1.5 py-0.5 rounded border', cfg.badge)}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-zinc-500">{s.estimated_duration} min</span>
                      {mainExercises.length > 0 && (
                        <><span className="text-zinc-700">·</span>
                        <span className="text-xs text-zinc-500 truncate">{mainExercises.slice(0, 2).join(', ')}</span></>
                      )}
                      {/* Top set result if completed */}
                      {topSet && weightUnit && (
                        <><span className="text-zinc-700">·</span>
                        <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-400" />
                          {weightUnit === 'lbs' ? Math.round(kgToLbs(topSet.weight_kg)) : topSet.weight_kg} {weightUnit} × {topSet.reps}
                        </span></>
                      )}
                      {/* Training block pill */}
                      {block && (
                        <span className="text-xs text-zinc-500 flex items-center gap-0.5">
                          <Layers className="w-2.5 h-2.5" /> {block.phase}
                        </span>
                      )}
                      {activeGym && s.status !== 'completed' && (
                        <span className="text-xs text-zinc-600 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {activeGym.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    {s.status === 'today' ? (
                      <Button size="sm" onClick={() => onStartWorkout(MOCK_TODAY_WORKOUT)}>Start</Button>
                    ) : s.status === 'completed' ? (
                      <button
                        onClick={() => onViewWorkout(s)}
                        className="text-xs px-2.5 py-1.5 bg-zinc-700/60 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>
                    ) : (
                      <button
                        onClick={() => setPreviewSession(s)}
                        className="text-xs px-2.5 py-1.5 bg-zinc-700/60 border border-zinc-600 text-zinc-400 rounded-lg hover:bg-zinc-600 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Scheduled session preview modal */}
      <ScheduledWorkoutModal
        session={previewSession}
        weightUnit={weightUnit}
        onClose={() => setPreviewSession(null)}
      />
    </>
  )
}

// ─── Scheduled Workout Preview Modal ────────────────────────────────────────
function ScheduledWorkoutModal({ session, weightUnit, onClose }) {
  if (!session) return null
  const block = session.linked_block_id ? MOCK_TRAINING_BLOCKS.find(b => b.id === session.linked_block_id) : null
  const conv = (kg) => weightUnit === 'lbs' ? `${Math.round(kgToLbs(kg))} lbs` : `${kg} kg`

  // For completed sessions, gather top sets
  const topSets = session.blocks
    ? session.blocks.flatMap(b => b.exercises).flatMap(e =>
        (e.sets_logged || []).filter(s => s?.is_top_set).map(s => ({ ...s, exercise: e.name }))
      )
    : []

  return (
    <Modal open={true} onClose={onClose}
      title={session.status === 'completed' ? session.name : `Preview – ${session.name}`}
      size="sm">
      <div className="p-5 space-y-4">
        {/* Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-400 flex items-center gap-1"><Calendar className="w-3 h-3" />{session.date}</span>
          <span className="text-xs text-zinc-400 flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration || session.estimated_duration} min</span>
          {session.avg_rpe && (
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg',
              session.avg_rpe >= 9 ? 'text-red-300 bg-red-500/10' : 'text-orange-300 bg-orange-500/10')}>
              RPE {session.avg_rpe}
            </span>
          )}
        </div>

        {/* Training block context */}
        {block && (
          <div className="p-2.5 bg-purple-500/5 border border-purple-500/20 rounded-lg flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-purple-300">{block.name}</p>
              <p className="text-xs text-zinc-500">{block.phase} · Target RPE {block.avg_rpe_target}</p>
            </div>
          </div>
        )}

        {/* Session notes if completed */}
        {session.notes && (
          <div className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg">
            <p className="text-xs text-zinc-400 italic">"{session.notes}"</p>
          </div>
        )}

        {/* Top sets if completed */}
        {topSets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Top Sets</p>
            <div className="space-y-1.5">
              {topSets.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                  <span className="text-xs text-zinc-300">{s.exercise}</span>
                  <div className="text-right">
                    <span className="text-xs font-bold text-yellow-400">{conv(s.weight_kg)} × {s.reps}</span>
                    <p className="text-xs text-zinc-500">e1RM {conv(calcE1RM(s.weight_kg, s.reps))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blocks preview */}
        <div className="space-y-3">
          {(session.blocks || []).map((block) => (
            <div key={block.type}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('w-2 h-2 rounded-full', blockDot(block.type))} />
                <p className="text-xs font-semibold text-zinc-300">{block.label}</p>
              </div>
              <div className="space-y-1 pl-4">
                {block.exercises.map((ex) => {
                  const isCardio = ex.exercise_type === 'cardio'
                  const linkedGoalIds = ex.linked_goal_ids || []
                  return (
                    <div key={ex.id} className="flex items-start justify-between gap-2 py-1 border-b border-zinc-800/50 last:border-0">
                      <div>
                        <span className="text-xs text-zinc-200">{ex.name}</span>
                        {linkedGoalIds.length > 0 && (
                          <span className="ml-1.5 text-xs text-purple-400 flex items-center gap-0.5 inline-flex">
                            <Target className="w-2.5 h-2.5" />
                          </span>
                        )}
                        {ex.notes && <p className="text-xs text-zinc-500 mt-0.5 italic">{ex.notes}</p>}
                      </div>
                      <span className="text-xs text-zinc-500 flex-shrink-0 font-mono">
                        {isCardio
                          ? `${ex.duration_min || '?'} min`
                          : `${ex.sets}×${ex.reps}${ex.intensity ? ` @ ${ex.intensity}` : ''}`
                        }
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <Button variant="ghost" className="w-full" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

// ─── DOTS score widget ───────────────────────────────────────────────────────
function DotsScoreRow({ weightUnit }) {
  const [bw, setBw] = useState(83)
  const squat = 220, bench = 155, deadlift = 280
  const total = squat + bench + deadlift
  const dots = calcDotsScore(total, bw, true)

  const bwDisplay = weightUnit === 'lbs' ? kgToLbs(bw) : bw
  const totalDisplay = weightUnit === 'lbs'
    ? `${kgToLbs(total)} lbs`
    : `${total} kg`

  return (
    <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-purple-300 uppercase tracking-wide">DOTS Score</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total {totalDisplay} · BW {bwDisplay} {weightUnit}</p>
        </div>
        <p className="text-3xl font-black text-purple-300">{dots}</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500 flex-shrink-0">Body weight ({weightUnit})</label>
        <input
          type="number"
          value={weightUnit === 'lbs' ? kgToLbs(bw) : bw}
          onChange={(e) => {
            const v = Number(e.target.value)
            setBw(weightUnit === 'lbs' ? Math.round(v / 2.20462 * 10) / 10 : v)
          }}
          className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
        />
        <div className={cn('h-1.5 flex-1 rounded-full overflow-hidden bg-zinc-700')}>
          <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
            style={{ width: `${Math.min(100, (dots / 500) * 100)}%` }} />
        </div>
        <span className="text-xs text-zinc-500 flex-shrink-0">
          {dots >= 400 ? 'Elite' : dots >= 300 ? 'Advanced' : dots >= 200 ? 'Intermediate' : 'Novice'}
        </span>
      </div>
    </div>
  )
}

// ─── Active Workout View ─────────────────────────────────────────────────────
function ActiveWorkoutView({
  workout, weightUnit, toggleWeightUnit,
  expandedBlock, setExpandedBlock,
  completedSets, logModal, setLogModal, logData, setLogData,
  painModal, setPainModal,
  cardioModal, setCardioModal, cardioData, setCardioData,
  onSaveSet, onSaveCardio, onComplete,
}) {
  const { gymLocations, preferredLocation, preferredWorkoutTime } = useSettingsStore()
  const activeGym = gymLocations?.find(l => l.id === preferredLocation) || gymLocations?.[0]
  const allExercises = workout.blocks.flatMap(b => b.exercises)
  const allKeys = allExercises.flatMap(ex =>
    ex.exercise_type === 'cardio'
      ? [`${ex.id}-0`]
      : Array.from({ length: ex.sets }, (_, i) => `${ex.id}-${i}`)
  )
  const doneCount = allKeys.filter(k => completedSets[k]).length
  const progress = allKeys.length ? Math.round((doneCount / allKeys.length) * 100) : 0

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">{workout.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-xs text-zinc-400">{doneCount}/{allKeys.length} sets done · {progress}% complete</span>
            {activeGym && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <MapPin className="w-2.5 h-2.5 text-teal-400" style={{ color: 'var(--brand-primary)' }} />
                {activeGym.name}
              </span>
            )}
            {preferredWorkoutTime && (
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="w-2.5 h-2.5" style={{ color: 'var(--brand-primary)' }} />
                {preferredWorkoutTime}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {/* Unit toggle */}
          <button
            onClick={toggleWeightUnit}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            <Scale className="w-3 h-3 text-purple-400" /> {weightUnit.toUpperCase()}
          </button>
          <Button variant="ghost" size="sm" onClick={() => setPainModal(true)}>
            <AlertTriangle className="w-3.5 h-3.5" /> Flag
          </Button>
          <Button size="sm" onClick={onComplete} disabled={progress < 100}>
            {progress === 100 ? 'Finish' : `${progress}%`}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Linked goals */}
      <LinkedGoalsPanel workout={workout} completedSets={completedSets} weightUnit={weightUnit} />

      {/* Blocks */}
      {workout.blocks.map((block) => (
        <Card key={block.type} className="p-0 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/20 transition-colors"
            onClick={() => setExpandedBlock(expandedBlock === block.type ? null : block.type)}
          >
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', blockDot(block.type))} />
              <span className="text-sm font-semibold text-zinc-200">{block.label}</span>
              <span className="text-xs text-zinc-500">({block.exercises.length})</span>
            </div>
            {expandedBlock === block.type
              ? <ChevronUp className="w-4 h-4 text-zinc-400" />
              : <ChevronDown className="w-4 h-4 text-zinc-400" />
            }
          </button>
          {expandedBlock === block.type && (
            <div className="border-t border-zinc-800 p-4 space-y-4">
              {block.exercises.map((ex) => (
                <ActiveExerciseCard
                  key={ex.id}
                  exercise={ex}
                  weightUnit={weightUnit}
                  completedSets={completedSets}
                  onLogSet={(setIndex) => setLogModal({ exerciseId: ex.id, setIndex, exerciseName: ex.name })}
                  onLogCardio={(exercise) => { setCardioModal({ exercise }); setCardioData({ actual_duration_min: exercise.duration_min || '' }) }}
                />
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Log Set Modal */}
      <LogSetModal
        open={!!logModal}
        onClose={() => { setLogModal(null); setLogData({}) }}
        logData={logData}
        setLogData={setLogData}
        onSave={onSaveSet}
        weightUnit={weightUnit}
        exerciseName={logModal?.exerciseName}
      />

      {/* Cardio Log Modal */}
      <CardioLogModal
        open={!!cardioModal}
        onClose={() => { setCardioModal(null); setCardioData({}) }}
        exercise={cardioModal?.exercise}
        cardioData={cardioData}
        setCardioData={setCardioData}
        onSave={onSaveCardio}
      />

      {/* Pain Modal */}
      <PainFlagModal open={painModal} onClose={() => setPainModal(false)} />
    </div>
  )
}

// ─── Active Exercise Card ────────────────────────────────────────────────────
function ActiveExerciseCard({ exercise, weightUnit, completedSets, onLogSet, onLogCardio }) {
  const isCardio = exercise.exercise_type === 'cardio'

  if (isCardio) {
    const key = `${exercise.id}-0`
    const logged = completedSets[key]
    return (
      <div className="border border-orange-500/30 rounded-xl overflow-hidden bg-orange-500/5">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-zinc-200">{exercise.name}</span>
            <Badge color="orange" className="text-xs">Cardio</Badge>
          </div>
          <span className="text-xs font-mono text-orange-300">
            {exercise.duration_min ? `${exercise.duration_min} min` : 'Duration TBD'}
          </span>
        </div>
        {exercise.notes && (
          <p className="px-4 pb-2 text-xs text-zinc-400 italic">"{exercise.notes}"</p>
        )}
        <div className="px-4 pb-3">
          {logged ? (
            <div className="flex items-center gap-2 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-200">
                {logged.actual_duration_min || exercise.duration_min} min
                {logged.avg_hr ? ` · Avg HR ${logged.avg_hr} bpm` : ''}
                {logged.distance_km ? ` · ${logged.distance_km} km` : ''}
              </span>
            </div>
          ) : (
            <Button size="xs" variant="ghost" className="border border-orange-500/30 text-orange-300 hover:bg-orange-500/10" onClick={() => onLogCardio(exercise)}>
              <Timer className="w-3 h-3" /> Log Cardio
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-zinc-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-700/20">
        <div>
          <span className="text-sm font-semibold text-zinc-200">{exercise.name}</span>
          {exercise.notes && <p className="text-xs text-zinc-400 mt-0.5 italic">"{exercise.notes}"</p>}
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {exercise.sets}×{exercise.reps}{exercise.intensity ? ` @ ${convertIntensity(exercise.intensity, weightUnit)}` : ''}
        </span>
      </div>
      <div className="px-4 py-3 space-y-2">
        {Array.from({ length: exercise.sets }).map((_, i) => {
          const key = `${exercise.id}-${i}`
          const logged = completedSets[key]
          const displayWeight = logged ? (weightUnit === 'lbs' ? kgToLbs(logged.weight_kg) : logged.weight_kg) : null
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-8 font-mono tabular-nums">S{i + 1}</span>
              <div className="flex-1 h-px bg-zinc-700" />
              {logged ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="text-xs font-semibold text-green-400">
                    {displayWeight} {weightUnit} × {logged.reps}
                    {logged.rpe && <span className="text-zinc-400"> @ RPE {logged.rpe}</span>}
                  </span>
                  {logged.is_top_set && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                  {logged.media?.length > 0 && <Camera className="w-3 h-3 text-blue-400" />}
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
              ) : (
                <Button size="xs" variant="ghost" onClick={() => onLogSet(i)}>
                  <Plus className="w-3 h-3" /> Log
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Log Set Modal ───────────────────────────────────────────────────────────
function LogSetModal({ open, onClose, logData, setLogData, onSave, weightUnit, exerciseName }) {
  const fileRef = useRef(null)
  const e1rmKg = logData.weight && logData.reps
    ? calcE1RM(toKg(Number(logData.weight), weightUnit), Number(logData.reps))
    : null
  const e1rmDisplay = e1rmKg ? (weightUnit === 'lbs' ? kgToLbs(e1rmKg) : e1rmKg) : null

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    const newMedia = files.map(f => ({
      type: f.type.startsWith('video') ? 'video' : 'photo',
      url: URL.createObjectURL(f),
      label: f.name,
      file: f,
    }))
    setLogData(d => ({ ...d, media: [...(d.media || []), ...newMedia] }))
  }

  const removeMedia = (idx) => {
    setLogData(d => ({ ...d, media: (d.media || []).filter((_, i) => i !== idx) }))
  }

  return (
    <Modal open={open} onClose={onClose} title={`Log Set${exerciseName ? ` – ${exerciseName}` : ''}`} size="sm">
      <div className="p-5 space-y-4">
        {/* Weight / Reps / RPE */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weight ({weightUnit})</label>
            <input type="number" step={weightUnit === 'lbs' ? 2.5 : 1.25}
              value={logData.weight || ''}
              onChange={(e) => setLogData(d => ({ ...d, weight: e.target.value }))}
              placeholder={weightUnit === 'lbs' ? '315' : '142.5'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Reps</label>
            <input type="number" min="1"
              value={logData.reps || ''}
              onChange={(e) => setLogData(d => ({ ...d, reps: e.target.value }))}
              placeholder="3"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">RPE</label>
            <input type="number" step="0.5" min="1" max="10"
              value={logData.rpe || ''}
              onChange={(e) => setLogData(d => ({ ...d, rpe: e.target.value }))}
              placeholder="8"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
          </div>
        </div>

        {/* e1RM preview */}
        {e1rmDisplay && (
          <div className="flex items-center justify-between p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <span className="text-xs text-purple-300">e1RM</span>
            <span className="text-sm font-bold text-purple-200">{e1rmDisplay} {weightUnit}</span>
          </div>
        )}

        {/* Tags */}
        <div className="flex gap-2">
          <button onClick={() => setLogData(d => ({ ...d, is_top_set: !d.is_top_set }))}
            className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              logData.is_top_set ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
            )}>
            <Star className="w-3 h-3" /> Top Set
          </button>
          <button onClick={() => setLogData(d => ({ ...d, pr: !d.pr }))}
            className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              logData.pr ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' : 'border-zinc-600 text-zinc-400 hover:border-zinc-500'
            )}>
            PR
          </button>
        </div>

        {/* Media upload */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Photos / Videos</label>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileChange} />
          <div className="flex flex-wrap gap-2">
            {(logData.media || []).map((m, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 group">
                {m.type === 'photo'
                  ? <img src={m.url} className="w-full h-full object-cover" alt="" />
                  : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-700">
                      <Video className="w-6 h-6 text-blue-400" />
                    </div>
                  )
                }
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-zinc-700 hover:border-purple-500 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-purple-400 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">Add</span>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={logData.notes || ''}
            onChange={(e) => setLogData(d => ({ ...d, notes: e.target.value }))}
            placeholder="How did it feel?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
          />
        </div>

        <Button className="w-full" onClick={onSave}>
          <CheckCircle2 className="w-4 h-4" /> Save Set
        </Button>
      </div>
    </Modal>
  )
}

// ─── Cardio Log Modal ────────────────────────────────────────────────────────
function CardioLogModal({ open, onClose, exercise, cardioData, setCardioData, onSave }) {
  if (!exercise) return null
  return (
    <Modal open={open} onClose={onClose} title={`Log Cardio – ${exercise.name}`} size="sm">
      <div className="p-5 space-y-4">
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-200">
          <span className="font-semibold">Assigned:</span> {exercise.duration_min ? `${exercise.duration_min} min` : 'Open duration'}
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Actual Duration (min)</label>
            <input type="number" min="1" step="1"
              value={cardioData.actual_duration_min || ''}
              onChange={(e) => setCardioData(d => ({ ...d, actual_duration_min: e.target.value }))}
              placeholder={exercise.duration_min || '10'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Avg Heart Rate (bpm)</label>
            <input type="number" min="60" max="220"
              value={cardioData.avg_hr || ''}
              onChange={(e) => setCardioData(d => ({ ...d, avg_hr: e.target.value }))}
              placeholder="135"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Distance (km) — optional</label>
            <input type="number" min="0" step="0.1"
              value={cardioData.distance_km || ''}
              onChange={(e) => setCardioData(d => ({ ...d, distance_km: e.target.value }))}
              placeholder="3.5"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Perceived Effort (RPE)</label>
            <input type="number" min="1" max="10" step="0.5"
              value={cardioData.rpe || ''}
              onChange={(e) => setCardioData(d => ({ ...d, rpe: e.target.value }))}
              placeholder="5"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={cardioData.notes || ''}
            onChange={(e) => setCardioData(d => ({ ...d, notes: e.target.value }))}
            placeholder="How did it feel?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 resize-none"
          />
        </div>
        <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={onSave}>
          <Heart className="w-4 h-4" /> Log Cardio
        </Button>
      </div>
    </Modal>
  )
}

// ─── Pain Flag Modal ─────────────────────────────────────────────────────────
function PainFlagModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Report Pain / Discomfort" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body Area</label>
          <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
            {['Lower Back','Left Knee','Right Knee','Left Hip','Right Hip','Left Shoulder','Right Shoulder','Wrist / Elbow','Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Severity (0–10)</label>
          <input type="range" min="0" max="10" className="w-full accent-red-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea rows={3} placeholder="Describe what happened…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 resize-none" />
        </div>
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-300">
          Your coach will be notified immediately.
        </div>
        <Button variant="danger" className="w-full" onClick={onClose}>
          <AlertTriangle className="w-4 h-4" /> Report Pain
        </Button>
      </div>
    </Modal>
  )
}

// ─── History Detail View ─────────────────────────────────────────────────────
function HistoryDetailView({ session, weightUnit, onBack, onEdit, editModal, onCloseEdit }) {
  const allMedia = session.blocks
    .flatMap(b => b.exercises)
    .flatMap(e => (e.sets_logged || []).flatMap(s => (s.media || []).map(m => ({ ...m, exercise: e.name, set: s.set }))))

  const totalVolKg = session.blocks
    .flatMap(b => b.exercises)
    .flatMap(e => e.sets_logged || [])
    .reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0)

  const topSets = session.blocks
    .flatMap(b => b.exercises)
    .flatMap(e => (e.sets_logged || []).filter(s => s.is_top_set).map(s => ({ ...s, exercise: e.name })))

  const convertW = (kg) => weightUnit === 'lbs' ? kgToLbs(kg) : kg

  const block = session.linked_block_id ? MOCK_TRAINING_BLOCKS.find(b => b.id === session.linked_block_id) : null
  const totalSets = session.total_sets || session.blocks.flatMap(b => b.exercises).flatMap(e => e.sets_logged || []).length

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-zinc-100">{session.name}</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{session.date}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit2 className="w-3.5 h-3.5" /> Edit Notes
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: BarChart2, label: 'Avg RPE', value: session.avg_rpe },
          { icon: Dumbbell, label: 'Sets', value: totalSets },
          { icon: Scale, label: 'Volume', value: weightUnit === 'lbs' ? `${Math.round(kgToLbs(totalVolKg)).toLocaleString()}` : `${totalVolKg.toLocaleString()}`, sub: weightUnit },
        ].map((s) => (
          <div key={s.label} className="text-center p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
            <s.icon className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-black text-zinc-100">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}{s.sub ? ` (${s.sub})` : ''}</p>
          </div>
        ))}
      </div>

      {/* Training block context */}
      {block && (
        <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl flex items-center gap-3">
          <Layers className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-purple-300">{block.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{block.phase} · RPE target {block.avg_rpe_target} · {block.focus}</p>
          </div>
        </div>
      )}

      {/* Session notes */}
      {session.notes && (
        <div className="p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Coach Notes</p>
          <p className="text-sm text-zinc-300">{session.notes}</p>
        </div>
      )}

      {/* Top sets */}
      {topSets.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Top Sets</CardTitle></CardHeader>
          <CardBody>
            <div className="space-y-2">
              {topSets.map((s, i) => {
                const e1rmKg = calcE1RM(s.weight_kg, s.reps)
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{s.exercise}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {convertW(s.weight_kg)} {weightUnit} × {s.reps} @ RPE {s.rpe}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">e1RM</p>
                      <p className="text-sm font-bold text-purple-300">{convertW(e1rmKg)} {weightUnit}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Full exercise log */}
      {session.blocks.map((block) => (
        <Card key={block.type}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', blockDot(block.type))} />
              <CardTitle>{block.label}</CardTitle>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {block.exercises.map((ex) => (
                <div key={ex.id}>
                  <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide mb-2">{ex.name}</p>
                  <div className="space-y-1.5">
                    {ex.sets_logged.map((s) => {
                      const mediaCount = (s.media || []).length
                      return (
                        <div key={s.set} className={cn('flex items-center justify-between px-3 py-2 rounded-lg text-sm',
                          s.is_top_set ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-zinc-800/40'
                        )}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500 w-8 tabular-nums">S{s.set}</span>
                            <span className="font-semibold text-zinc-200">
                              {convertW(s.weight_kg)} {weightUnit} × {s.reps}
                            </span>
                            <span className="text-xs text-zinc-500">RPE {s.rpe}</span>
                            {s.is_top_set && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">{convertW(calcE1RM(s.weight_kg, s.reps))} {weightUnit} e1RM</span>
                            {mediaCount > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-blue-400">
                                <Camera className="w-3 h-3" /> {mediaCount}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}

      {/* Media gallery */}
      {allMedia.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="w-4 h-4 text-blue-400" /> Media ({allMedia.length})</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {allMedia.map((m, i) => (
                <div key={i} className="rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 aspect-square flex flex-col">
                  {m.type === 'photo' && m.url ? (
                    <img src={m.url} className="w-full h-full object-cover" alt={m.label} />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
                      {m.type === 'video' ? <Video className="w-8 h-8 text-blue-400" /> : <ImageIcon className="w-8 h-8 text-zinc-500" />}
                      <p className="text-xs text-zinc-400 text-center truncate w-full">{m.label || 'Media'}</p>
                      <p className="text-xs text-zinc-600">{m.exercise} · S{m.set}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Edit notes modal */}
      <Modal open={!!editModal} onClose={onCloseEdit} title="Edit Session Notes" size="sm">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Session Notes</label>
            <textarea rows={5} defaultValue={session.notes}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
          </div>
          <Button className="w-full" onClick={onCloseEdit}>Save Notes</Button>
        </div>
      </Modal>
    </div>
  )
}

function blockDot(type) {
  const map = { warmup: 'bg-yellow-400', main: 'bg-purple-400', accessory: 'bg-blue-400', conditioning: 'bg-orange-400', mobility: 'bg-green-400' }
  return map[type] || 'bg-zinc-400'
}

// ─── Linked Goals Panel (shown inside active workout) ───────────────────────
function LinkedGoalsPanel({ workout, completedSets, weightUnit }) {
  const { goals, updateGoalProgress, markGoalComplete } = useGoalsStore()
  const [editingGoal, setEditingGoal] = useState(null)
  const [editVal, setEditVal] = useState('')

  // Gather all goal IDs linked from any exercise in this workout
  const linkedGoalIds = [...new Set(
    workout.blocks.flatMap(b => b.exercises).flatMap(e => e.linked_goal_ids || [])
  )]
  const linkedGoals = goals.filter(g => linkedGoalIds.includes(g.id))
  if (linkedGoals.length === 0) return null

  // Find the best logged e1RM for squat/bench/deadlift from this session
  const bestE1RM = {}
  workout.blocks.flatMap(b => b.exercises).forEach(ex => {
    const keys = Array.from({ length: ex.sets }, (_, i) => `${ex.id}-${i}`)
    keys.forEach(k => {
      const s = completedSets[k]
      if (!s?.weight_kg || !s?.reps) return
      const e1 = calcE1RM(s.weight_kg, Number(s.reps))
      const name = ex.name.toLowerCase()
      const key = name.includes('squat') ? 'squat' : name.includes('bench') ? 'bench' : name.includes('deadlift') ? 'deadlift' : null
      if (key && (!bestE1RM[key] || e1 > bestE1RM[key])) bestE1RM[key] = e1
    })
  })

  const goalTypeIcon = {}

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-300">
          <Target className="w-4 h-4" /> Linked Goals & PRs
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-2">
        {linkedGoals.map(g => {
          const pct = g.current_value && g.target_value
            ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
            : 0
          const displayCurrent = weightUnit === 'lbs' && g.target_unit === 'kg'
            ? `${Math.round(kgToLbs(g.current_value || 0))} lbs`
            : `${g.current_value ?? '—'} ${g.target_unit}`
          const displayTarget = weightUnit === 'lbs' && g.target_unit === 'kg'
            ? `${Math.round(kgToLbs(g.target_value))} lbs`
            : `${g.target_value} ${g.target_unit}`

          // Check if a live e1RM from this session exceeds current progress
          const liftKey = g.title.toLowerCase().includes('squat') ? 'squat'
            : g.title.toLowerCase().includes('bench') ? 'bench'
            : g.title.toLowerCase().includes('deadlift') ? 'deadlift' : null
          const sessionBest = liftKey ? bestE1RM[liftKey] : null
          const hasNewBest = sessionBest && (!g.current_value || sessionBest > g.current_value)

          return (
            <div key={g.id} className={cn(
              'p-3 rounded-xl border transition-all',
              g.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-zinc-800/60 border-zinc-700/50'
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-base">{goalTypeIcon[g.goal_type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-semibold truncate', g.completed ? 'text-green-300 line-through' : 'text-zinc-200')}>{g.title}</p>
                    {hasNewBest && (
                      <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                        <TrendingUp className="w-3 h-3" /> Session best: {weightUnit === 'lbs' ? Math.round(kgToLbs(sessionBest)) : Math.round(sessionBest)} {weightUnit} e1RM
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {hasNewBest && (
                    <button
                      onClick={() => updateGoalProgress(g.id, Math.round(sessionBest * 10) / 10)}
                      className="text-xs px-2 py-1 bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-500/25 transition-colors"
                    >
                      Update
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingGoal(g.id); setEditVal(g.current_value ?? '') }}
                    className="text-xs px-2 py-1 bg-zinc-700 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => markGoalComplete(g.id, !g.completed)}
                    className={cn('w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                      g.completed ? 'bg-green-500 border-green-400' : 'border-zinc-600 hover:border-green-500')}
                  >
                    {g.completed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>
              {g.target_value && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">{displayCurrent} → {displayTarget}</span>
                    <span className={cn('font-bold', pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-zinc-300')}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-purple-500')}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
              {editingGoal === g.id && (
                <div className="flex gap-2 mt-2">
                  <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                    className="flex-1 bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    placeholder={`Current (${g.target_unit})`} />
                  <button onClick={() => { updateGoalProgress(g.id, Number(editVal)); setEditingGoal(null) }}
                    className="px-2 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500">Save</button>
                  <button onClick={() => setEditingGoal(null)}
                    className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600">×</button>
                </div>
              )}
            </div>
          )
        })}
      </CardBody>
    </Card>
  )
}

// ─── Staff Training Management Page ──────────────────────────────────────────
function StaffTrainingPage({ profile, membership }) {
  const { setActivePage } = useUIStore()
  const role = resolveRole(profile, membership)
  const isNutritionist = role === 'nutritionist'
  const [tab, setTab] = useState('overview') // overview | athletes | blocks

  const activeBlock = MOCK_TRAINING_BLOCKS.find(b => b.status === 'active')
  const upcomingBlock = MOCK_TRAINING_BLOCKS.find(b => b.status === 'planned')
  const completedBlocks = MOCK_TRAINING_BLOCKS.filter(b => b.status === 'completed')

  const PHASE_COLORS = {
    hypertrophy:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
    intensification: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    peaking:         'bg-orange-500/15 text-orange-300 border-orange-500/30',
    offseason:       'bg-zinc-700/50 text-zinc-400 border-zinc-600/30',
  }

  if (isNutritionist) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Training Overview
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Athlete training context for nutrition planning</p>
        </div>
        <div className="grid gap-4">
          {MOCK_ATHLETES.map(a => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={a.full_name} role="athlete" size="sm" />
                  <div>
                    <CardTitle>{a.full_name}</CardTitle>
                    <p className="text-xs text-zinc-500">{a.sessions_this_week}/{a.sessions_planned_this_week} sessions this week · RPE avg {a.rpe_avg_this_week}</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">Training Load</p>
                    <p className={cn('text-sm font-bold', a.rpe_avg_this_week >= 8.5 ? 'text-red-400' : a.rpe_avg_this_week >= 7.5 ? 'text-orange-400' : 'text-green-400')}>
                      {a.rpe_avg_this_week >= 8.5 ? 'High' : a.rpe_avg_this_week >= 7.5 ? 'Moderate' : 'Low'}
                    </p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">Sessions</p>
                    <p className="text-sm font-bold text-zinc-200">{a.sessions_this_week}/{a.sessions_planned_this_week}</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">Calories needed</p>
                    <p className="text-sm font-bold text-zinc-200">
                      {a.rpe_avg_this_week >= 8 ? '+200–400' : a.sessions_this_week < a.sessions_planned_this_week ? '−100–200' : 'On target'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Training Management
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">Manage blocks, monitor sessions, assign workouts</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setActivePage?.('programming')}>
            <Dumbbell className="w-3.5 h-3.5" /> Program Builder
          </Button>
          <Button size="sm" onClick={() => setActivePage?.('roster')}>
            <Users className="w-3.5 h-3.5" /> View Roster
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'athletes', label: 'Athlete Sessions', icon: Users },
          { id: 'blocks', label: 'Training Blocks', icon: Layers },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              tab === t.id ? 'bg-zinc-800 text-zinc-100 border-b-2 border-purple-500' : 'text-zinc-500 hover:text-zinc-300'
            )}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Active Block */}
          {activeBlock && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" /> Active Block: {activeBlock.name}
                  </CardTitle>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-semibold', PHASE_COLORS[activeBlock.phase] ?? 'bg-zinc-700 text-zinc-300 border-zinc-600')}>
                    {activeBlock.phase}
                  </span>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Start', value: activeBlock.start_date },
                    { label: 'End', value: activeBlock.end_date },
                    { label: 'Sessions', value: `${activeBlock.sessions_completed}/${activeBlock.sessions_planned}` },
                    { label: 'RPE Target', value: activeBlock.avg_rpe_target },
                  ].map(s => (
                    <div key={s.label} className="bg-zinc-800/40 rounded-xl p-2">
                      <p className="text-xs text-zinc-500">{s.label}</p>
                      <p className="text-sm font-bold text-zinc-200">{s.value}</p>
                    </div>
                  ))}
                </div>
                <ProgressBar value={activeBlock.sessions_completed} max={activeBlock.sessions_planned} color="purple" size="sm" />
                <p className="text-xs text-zinc-500 italic">"{activeBlock.notes}"</p>
              </CardBody>
            </Card>
          )}

          {/* Quick session status grid */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" /> This Week's Sessions
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {MOCK_ATHLETES.map(a => {
                const pct = Math.round((a.sessions_this_week / a.sessions_planned_this_week) * 100)
                const behind = a.sessions_this_week < a.sessions_planned_this_week
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.full_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-zinc-200">{a.full_name}</p>
                        <span className={cn('text-xs font-bold ml-2 flex-shrink-0', pct >= 100 ? 'text-green-400' : behind ? 'text-orange-400' : 'text-zinc-300')}>
                          {a.sessions_this_week}/{a.sessions_planned_this_week}
                        </span>
                      </div>
                      <ProgressBar value={a.sessions_this_week} max={a.sessions_planned_this_week} color={pct >= 100 ? 'green' : behind ? 'orange' : 'yellow'} size="sm" />
                    </div>
                    {behind && <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
                  </div>
                )
              })}
            </CardBody>
          </Card>

          {/* Upcoming block */}
          {upcomingBlock && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yellow-400" /> Next Block: {upcomingBlock.name}
                </CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Phase', value: upcomingBlock.phase },
                  { label: 'Starts', value: upcomingBlock.start_date },
                  { label: 'Weeks', value: `${upcomingBlock.weeks}wk` },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">{s.label}</p>
                    <p className="text-sm font-bold text-zinc-200 capitalize">{s.value}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Athlete Sessions tab */}
      {tab === 'athletes' && (
        <div className="space-y-3">
          {MOCK_ATHLETES.map(a => {
            const recentSession = a.recent_sessions?.[0]
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar name={a.full_name} role="athlete" size="sm" />
                    <div className="flex-1 min-w-0">
                      <CardTitle>{a.full_name}</CardTitle>
                      <p className="text-xs text-zinc-500">{a.sessions_this_week}/{a.sessions_planned_this_week} sessions this week</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {a.flags?.map(f => (
                        <span key={f} className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium',
                          f === 'pain_flag' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                          f === 'missed_sessions' ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                          'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                        )}>{f.replace('_', ' ')}</span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                {recentSession && (
                  <CardBody>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                        <p className="text-xs text-zinc-500">Last Session</p>
                        <p className="text-xs font-semibold text-zinc-200 mt-0.5">{recentSession.name}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                        <p className="text-xs text-zinc-500">Date</p>
                        <p className="text-xs font-semibold text-zinc-200 mt-0.5">{recentSession.date}</p>
                      </div>
                      <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                        <p className="text-xs text-zinc-500">RPE</p>
                        <p className={cn('text-sm font-bold mt-0.5', recentSession.rpe >= 8.5 ? 'text-red-400' : recentSession.rpe >= 7.5 ? 'text-orange-400' : 'text-green-400')}>
                          {recentSession.rpe}
                        </p>
                      </div>
                    </div>
                    {a.coach_notes && (
                      <p className="text-xs text-zinc-500 mt-2 italic">Coach note: {a.coach_notes}</p>
                    )}
                  </CardBody>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Blocks tab */}
      {tab === 'blocks' && (
        <div className="space-y-3">
          {MOCK_TRAINING_BLOCKS.map(b => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{b.name}</CardTitle>
                    <p className="text-xs text-zinc-500 mt-0.5">{b.start_date} → {b.end_date} · {b.weeks} weeks</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-semibold capitalize', PHASE_COLORS[b.phase] ?? 'bg-zinc-700 text-zinc-300 border-zinc-600')}>{b.phase}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-semibold',
                      b.status === 'active' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                      b.status === 'completed' ? 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30' :
                      'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                    )}>{b.status}</span>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">Sessions</p>
                    <p className="text-sm font-bold text-zinc-200">{b.sessions_completed}/{b.sessions_planned}</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">RPE Target</p>
                    <p className="text-sm font-bold text-zinc-200">{b.avg_rpe_target}</p>
                  </div>
                  <div className="bg-zinc-800/40 rounded-xl p-2">
                    <p className="text-xs text-zinc-500">Focus</p>
                    <p className="text-xs font-bold text-zinc-200">{b.focus}</p>
                  </div>
                </div>
                {b.status !== 'planned' && (
                  <ProgressBar value={b.sessions_completed} max={b.sessions_planned} color={b.status === 'completed' ? 'green' : 'purple'} size="sm" />
                )}
                <p className="text-xs text-zinc-500 italic">"{b.notes}"</p>
              </CardBody>
            </Card>
          ))}
          <Button className="w-full" variant="outline" onClick={() => setActivePage?.('programming')}>
            <Dumbbell className="w-3.5 h-3.5" /> Create New Block in Program Builder
          </Button>
        </div>
      )}
    </div>
  )
}


