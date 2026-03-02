import { useState } from 'react'
import {
  Target, Trophy, Plus, CheckCircle2, TrendingUp, Calendar,
  Edit2, Trash2, X, Check, Star, Link2, Dumbbell, ChevronDown,
  ChevronUp, BarChart2, Circle, Layers, Info, History, ArrowRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { MOCK_PAST_WORKOUTS, MOCK_TRAINING_BLOCKS, MOCK_MEETS } from '../lib/mockData'
import { cn, kgToLbs, calcE1RM } from '../lib/utils'
import { useGoalsStore, useSettingsStore } from '../lib/store'

const GOAL_TYPES = [
  { id: 'strength', label: 'Strength', icon: 'strength', color: 'purple' },
  { id: 'nutrition', label: 'Nutrition', icon: 'nutrition', color: 'green' },
  { id: 'meet', label: 'Meet', icon: 'meet', color: 'yellow' },
  { id: 'process', label: 'Process', icon: 'process', color: 'blue' },
]

const typeColor = { strength: 'purple', nutrition: 'green', meet: 'yellow', process: 'blue' }
const typeIcon  = {}

const FILTER_TABS = [
  { id: 'active',    label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'all',       label: 'All' },
]

// ── Add / Edit Goal Modal ────────────────────────────────────────────────────
function GoalModal({ open, onClose, existing = null }) {
  const { addGoal } = useGoalsStore()
  const isEdit = !!existing
  const [form, setForm] = useState(existing || {
    goal_type: 'strength', title: '', target_value: '', target_unit: 'kg',
    current_value: '', target_date: '', notes: '',
  })
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.title.trim()) return
    const goal = {
      ...form,
      target_value: form.target_value ? Number(form.target_value) : null,
      current_value: form.current_value ? Number(form.current_value) : null,
    }
    if (!isEdit) addGoal(goal)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Goal' : 'Add New Goal'} size="sm">
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Goal Type</label>
          <div className="grid grid-cols-4 gap-2">
            {GOAL_TYPES.map(t => (
              <button key={t.id} onClick={() => upd('goal_type', t.id)}
                className={cn('flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all',
                  form.goal_type === t.id ? 'bg-purple-500/15 border-purple-500/40 text-purple-200' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                <span className="text-lg">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
          <input value={form.title} onChange={e => upd('title', e.target.value)}
            placeholder="e.g. 650kg Total by August"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current</label>
            <input type="number" value={form.current_value} onChange={e => upd('current_value', e.target.value)}
              placeholder="610"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target</label>
            <input type="number" value={form.target_value} onChange={e => upd('target_value', e.target.value)}
              placeholder="650"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Unit</label>
            <input value={form.target_unit} onChange={e => upd('target_unit', e.target.value)}
              placeholder="kg"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Date (optional)</label>
          <input type="date" value={form.target_date || ''} onChange={e => upd('target_date', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={form.notes || ''} onChange={e => upd('notes', e.target.value)}
            placeholder="Context, strategy, milestone notes…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}><Plus className="w-4 h-4" /> {isEdit ? 'Save' : 'Add Goal'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Goal Detail Modal ────────────────────────────────────────────────────────
function GoalDetailModal({ goal, open, onClose }) {
  const { weightUnit } = useSettingsStore()
  const { updateGoalProgress } = useGoalsStore()
  const [editVal, setEditVal] = useState('')
  const [editing, setEditing] = useState(false)

  if (!goal) return null

  const pct = goal.current_value != null && goal.target_value
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0

  const conv = (v) => (weightUnit === 'lbs' && goal.target_unit === 'kg') ? Math.round(kgToLbs(v)) : v
  const showUnit = (weightUnit === 'lbs' && goal.target_unit === 'kg') ? 'lbs' : goal.target_unit

  // Linked workouts — sessions where an exercise has linked_goal_ids including this goal,
  // or where a main exercise name matches the goal lift keyword
  const allSessions = [...MOCK_PAST_WORKOUTS]
  const linkedSessions = allSessions.filter(s =>
    s.blocks.flatMap(b => b.exercises).some(e =>
      (e.linked_goal_ids || []).includes(goal.id) ||
      (goal.goal_type === 'strength' && (
        (e.name?.toLowerCase().includes('squat') && goal.title.toLowerCase().includes('squat')) ||
        (e.name?.toLowerCase().includes('bench') && goal.title.toLowerCase().includes('bench')) ||
        (e.name?.toLowerCase().includes('deadlift') && goal.title.toLowerCase().includes('deadlift'))
      ))
    )
  )

  // Linked training blocks
  const linkedBlocks = MOCK_TRAINING_BLOCKS.filter(b => (b.linked_goal_ids || []).includes(goal.id))

  // Linked meets
  const linkedMeets = MOCK_MEETS.filter(m => (m.linked_goal_ids || []).includes(goal.id))

  // Progress history sorted ascending
  const history = [...(goal.progress_history || [])].sort((a, b) => a.date.localeCompare(b.date))

  // Delta from first to last entry
  const delta = history.length >= 2 ? history[history.length - 1].value - history[0].value : null

  // Breakdown of what's driving progress
  const drivers = []
  if (linkedSessions.length) drivers.push({ icon: Dumbbell, label: 'Workout sessions', count: linkedSessions.length, color: 'text-purple-400' })
  if (linkedBlocks.length) drivers.push({ icon: Layers, label: 'Training blocks', count: linkedBlocks.length, color: 'text-blue-400' })
  if (linkedMeets.length) drivers.push({ icon: Trophy, label: 'Meet targets', count: linkedMeets.length, color: 'text-yellow-400' })

  return (
    <Modal open={open} onClose={onClose} title="Goal Detail" size="sm">
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl">{typeIcon[goal.goal_type]}</span>
          <div>
            <h2 className="text-base font-bold text-zinc-100">{goal.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge color={typeColor[goal.goal_type]}>{goal.goal_type}</Badge>
              {goal.target_date && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {goal.target_date}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        {goal.notes && (
          <div className="p-2.5 bg-zinc-800 border border-zinc-700/50 rounded-lg">
            <p className="text-xs text-zinc-400 italic">"{goal.notes}"</p>
          </div>
        )}

        {/* Progress bar breakdown */}
        <div className="p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Progress</p>
            <span className={cn('text-lg font-black', pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-purple-300')}>
              {pct}%
            </span>
          </div>
          <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700',
              pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-teal-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-purple-500')}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Start: {conv(history[0]?.value ?? 0)} {showUnit}</span>
            <span className="text-zinc-300 font-semibold">Current: {conv(goal.current_value ?? 0)} {showUnit}</span>
            <span>Target: {conv(goal.target_value)} {showUnit}</span>
          </div>
          {delta !== null && (
            <p className="text-xs text-green-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{conv(delta)} {showUnit} total progress since tracking began
            </p>
          )}
          {/* Remaining */}
          {goal.target_value && goal.current_value && goal.current_value < goal.target_value && (
            <p className="text-xs text-zinc-500">
              {conv(goal.target_value - goal.current_value)} {showUnit} remaining to target
            </p>
          )}
        </div>

        {/* What's driving the bar */}
        {drivers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">What's driving this</p>
            <div className="grid grid-cols-3 gap-2">
              {drivers.map((d) => (
                <div key={d.label} className="flex flex-col items-center gap-1 p-2.5 bg-zinc-800 rounded-xl border border-zinc-700/50">
                  <d.icon className={cn('w-4 h-4', d.color)} />
                  <span className="text-lg font-black text-zinc-100">{d.count}</span>
                  <span className="text-[10px] text-zinc-500 text-center leading-tight">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress history timeline */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Progress History</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {[...history].reverse().map((h, i) => {
                const pctH = goal.target_value ? Math.min(100, Math.round((h.value / goal.target_value) * 100)) : null
                return (
                  <div key={i} className="flex items-center gap-3 p-2 bg-zinc-800/60 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-200">{conv(h.value)} {showUnit}</span>
                        {pctH !== null && <span className="text-xs text-zinc-500">{pctH}%</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-zinc-500">{h.date}</span>
                        {h.source && <><span className="text-zinc-700">·</span><span className="text-xs text-zinc-500 truncate">{h.source}</span></>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Linked training blocks */}
        {linkedBlocks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Training Blocks</p>
            <div className="space-y-1.5">
              {linkedBlocks.map(b => (
                <div key={b.id} className="flex items-center gap-2 p-2.5 bg-blue-500/5 border border-blue-500/15 rounded-lg">
                  <Layers className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">{b.name}</p>
                    <p className="text-xs text-zinc-500">{b.phase} · {b.start_date} → {b.end_date}</p>
                  </div>
                  <Badge color={b.status === 'active' ? 'green' : b.status === 'completed' ? 'default' : 'blue'}>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked meets */}
        {linkedMeets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Meets</p>
            <div className="space-y-1.5">
              {linkedMeets.map(m => (
                <div key={m.id} className="flex items-center gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200">{m.name}</p>
                    <p className="text-xs text-zinc-500">{m.meet_date} · {m.federation} · {m.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Linked workout sessions */}
        {linkedSessions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Linked Sessions</p>
            <div className="space-y-1.5">
              {linkedSessions.map(s => {
                const topSet = s.blocks.flatMap(b => b.exercises).flatMap(e => e.sets_logged).find(sl => sl.is_top_set)
                const e1rm = topSet ? calcE1RM(topSet.weight_kg, topSet.reps) : null
                return (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-zinc-800/60 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{s.name}</p>
                      <p className="text-xs text-zinc-500">{s.date} · RPE {s.avg_rpe}</p>
                    </div>
                    {e1rm && (
                      <div className="text-right">
                        <p className="text-xs font-bold text-purple-300">{conv(e1rm)} {showUnit}</p>
                        <p className="text-xs text-zinc-500">e1RM</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Update progress inline */}
        <div className="pt-2 border-t border-zinc-700/50">
          <p className="text-xs font-semibold text-zinc-400 mb-2">Update Progress</p>
          {editing ? (
            <div className="flex gap-2">
              <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                placeholder={`New value (${goal.target_unit})`} autoFocus />
              <button onClick={() => { updateGoalProgress(goal.id, Number(editVal)); setEditing(false) }}
                className="px-3 py-2 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setEditing(false)}
                className="px-2 py-2 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => { setEditing(true); setEditVal(goal.current_value ?? '') }}
              className="w-full p-2.5 bg-zinc-800 border border-dashed border-zinc-600 rounded-lg text-xs text-zinc-400 hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Log new value
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal }) {
  const { updateGoalProgress, markGoalComplete, removeGoal } = useGoalsStore()
  const { weightUnit } = useSettingsStore()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(goal.current_value ?? '')
  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const pct = goal.current_value != null && goal.target_value
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0

  const showUnit = weightUnit === 'lbs' && goal.target_unit === 'kg' ? 'lbs' : goal.target_unit
  const conv = (v) => (weightUnit === 'lbs' && goal.target_unit === 'kg') ? Math.round(kgToLbs(v)) : v

  // Find sessions that contain exercises linked to this goal
  const linkedSessions = MOCK_PAST_WORKOUTS.filter(s =>
    s.blocks.flatMap(b => b.exercises).some(e =>
      (e.linked_goal_ids || []).includes(goal.id) ||
      (goal.goal_type === 'strength' && (
        e.name?.toLowerCase().includes('squat') && goal.title.toLowerCase().includes('squat') ||
        e.name?.toLowerCase().includes('bench') && goal.title.toLowerCase().includes('bench') ||
        e.name?.toLowerCase().includes('deadlift') && goal.title.toLowerCase().includes('deadlift')
      ))
    )
  )

  const linkedBlocks = MOCK_TRAINING_BLOCKS.filter(b => (b.linked_goal_ids || []).includes(goal.id))

  const daysLeft = goal.target_date
    ? Math.max(0, Math.round((new Date(goal.target_date) - new Date()) / 86400000))
    : null

  const barColor = pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-teal-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-purple-500'

  // Last progress entry
  const lastEntry = goal.progress_history?.length
    ? goal.progress_history[goal.progress_history.length - 1]
    : null

  return (
    <>
      <Card className={cn(goal.completed ? 'opacity-75 border-green-500/20' : '')}>
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">{typeIcon[goal.goal_type]}</div>
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setDetailOpen(true)}
                    className={cn('text-sm font-semibold text-left hover:underline transition-colors',
                      goal.completed ? 'text-zinc-400 line-through' : 'text-zinc-100 hover:text-purple-300')}
                  >
                    {goal.title}
                  </button>
                  <Badge color={typeColor[goal.goal_type]}>{goal.goal_type}</Badge>
                  {goal.completed && <Badge color="green">Completed ✓</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {goal.target_date && (
                    <p className="text-xs text-zinc-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {goal.target_date}
                      {daysLeft !== null && !goal.completed && (
                        <span className={cn('ml-1', daysLeft <= 14 ? 'text-orange-400' : 'text-zinc-500')}>
                          · {daysLeft}d left
                        </span>
                      )}
                    </p>
                  )}
                  {linkedBlocks.length > 0 && (
                    <span className="text-xs text-blue-400 flex items-center gap-0.5">
                      <Layers className="w-2.5 h-2.5" /> {linkedBlocks.length} block{linkedBlocks.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {lastEntry && (
                    <span className="text-xs text-zinc-500">Last: {lastEntry.date}</span>
                  )}
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setDetailOpen(true)}
                  className="w-6 h-6 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-purple-400 hover:border-purple-500/40 transition-colors"
                  title="View detail">
                  <BarChart2 className="w-3 h-3" />
                </button>
                <button onClick={() => markGoalComplete(goal.id, !goal.completed)}
                  className={cn('w-6 h-6 rounded-full border flex items-center justify-center transition-all',
                    goal.completed ? 'bg-green-500 border-green-400' : 'border-zinc-600 hover:border-green-400 hover:bg-green-500/10')}
                  title={goal.completed ? 'Mark incomplete' : 'Mark complete'}>
                  {goal.completed ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Circle className="w-3.5 h-3.5 text-zinc-500" />}
                </button>
                <button onClick={() => setEditGoalOpen(true)}
                  className="w-6 h-6 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => removeGoal(goal.id)}
                  className="w-6 h-6 rounded-lg border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Progress */}
            {goal.target_value != null && (
              <div className="mt-2.5">
                <div className="flex justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-400">{conv(goal.current_value ?? 0)} {showUnit}</span>
                    <span className="text-zinc-600">→</span>
                    <span className="text-zinc-400">{conv(goal.target_value)} {showUnit}</span>
                  </div>
                  <button
                    onClick={() => setDetailOpen(true)}
                    className={cn('font-bold hover:underline transition-colors',
                      pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-zinc-300')}>
                    {pct}% ↗
                  </button>
                </div>
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden cursor-pointer" onClick={() => setDetailOpen(true)}>
                  <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {/* Progress history mini-sparkline (last 4 values) */}
            {goal.progress_history?.length > 1 && (
              <button
                onClick={() => setDetailOpen(true)}
                className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-purple-400 transition-colors"
              >
                <History className="w-3 h-3" />
                {goal.progress_history.length} updates · Click to view history
                <ArrowRight className="w-3 h-3" />
              </button>
            )}

            {/* Inline progress update */}
            {editing ? (
              <div className="flex items-center gap-2 mt-2.5">
                <input type="number" value={editVal} onChange={e => setEditVal(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  placeholder={`New value (${goal.target_unit})`} autoFocus />
                <button onClick={() => { updateGoalProgress(goal.id, Number(editVal)); setEditing(false) }}
                  className="px-2.5 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-500 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-2 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-lg hover:bg-zinc-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button onClick={() => { setEditing(true); setEditVal(goal.current_value ?? '') }}
                className="mt-2 text-xs text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Update progress
              </button>
            )}

            {/* Expand: linked sessions */}
            {linkedSessions.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                {linkedSessions.length} linked session{linkedSessions.length > 1 ? 's' : ''}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {expanded && (
              <div className="mt-2 space-y-1.5 border-t border-zinc-700/50 pt-2.5">
                {linkedSessions.map(s => {
                  const topSet = s.blocks.flatMap(b => b.exercises).flatMap(e => e.sets_logged).find(sl => sl.is_top_set)
                  return (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-zinc-800/60 rounded-lg text-xs">
                      <div>
                        <p className="text-zinc-300 font-medium">{s.name}</p>
                        <p className="text-zinc-500">{s.date} · RPE {s.avg_rpe}</p>
                      </div>
                      {topSet && (
                        <span className="text-yellow-400 font-semibold">
                          {weightUnit === 'lbs' ? Math.round(kgToLbs(topSet.weight_kg)) : topSet.weight_kg} {weightUnit} × {topSet.reps}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
      <GoalModal open={editGoalOpen} onClose={() => setEditGoalOpen(false)} existing={goal} />
      <GoalDetailModal goal={goal} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </>
  )
}

// ── PR Board ─────────────────────────────────────────────────────────────────
function PRBoard({ weightUnit }) {
  const conv = (kg) => weightUnit === 'lbs' ? Math.round(kgToLbs(kg) / 2.5) * 2.5 : kg
  const unit = weightUnit

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-400 mb-3">Personal Records</h2>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          {
            lift: 'Squat', color: 'text-purple-400', border: 'border-purple-500/30',
            prs: [
              { type: '1RM (Gym)', weight_kg: 210, date: 'Feb 28, 2026' },
              { type: '1RM (Meet)', weight_kg: 195, date: 'Oct 2025' },
              { type: '3RM', weight_kg: 200, date: 'Feb 21, 2026' },
              { type: 'e1RM Top Set', weight_kg: 220, date: 'Feb 28, 2026' },
            ],
          },
          {
            lift: 'Bench', color: 'text-blue-400', border: 'border-blue-500/30',
            prs: [
              { type: '1RM (Gym)', weight_kg: 147, date: 'Feb 24, 2026' },
              { type: '1RM (Meet)', weight_kg: 140, date: 'Oct 2025' },
              { type: '3RM', weight_kg: 140, date: 'Feb 17, 2026' },
              { type: 'e1RM Top Set', weight_kg: 155, date: 'Feb 24, 2026' },
            ],
          },
          {
            lift: 'Deadlift', color: 'text-orange-400', border: 'border-orange-500/30',
            prs: [
              { type: '1RM (Gym)', weight_kg: 272.5, date: 'Feb 25, 2026' },
              { type: '1RM (Meet)', weight_kg: 267.5, date: 'Oct 2025' },
              { type: '3RM', weight_kg: 260, date: 'Feb 18, 2026' },
              { type: 'e1RM Top Set', weight_kg: 280, date: 'Feb 25, 2026' },
            ],
          },
        ].map((lift) => (
          <Card key={lift.lift} className={`border ${lift.border}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn('text-base font-black', lift.color)}>{lift.lift}</h3>
              <Trophy className={cn('w-4 h-4', lift.color)} />
            </div>
            <div className="space-y-2">
              {lift.prs.map((pr) => (
                <div key={pr.type} className="flex items-center justify-between py-1.5 border-b border-zinc-800 last:border-0">
                  <span className="text-xs text-zinc-400">{pr.type}</span>
                  <div className="text-right">
                    <span className={cn('text-sm font-bold', lift.color)}>{conv(pr.weight_kg)} {unit}</span>
                    <p className="text-xs text-zinc-600">{pr.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ── Main GoalsPage ────────────────────────────────────────────────────────────
export function GoalsPage() {
  const { goals } = useGoalsStore()
  const { weightUnit } = useSettingsStore()
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [filterTab, setFilterTab] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')

  const activeGoals    = goals.filter(g => !g.completed)
  const completedGoals = goals.filter(g => g.completed)
  const visibleGoals = (filterTab === 'active' ? activeGoals : filterTab === 'completed' ? completedGoals : goals)
    .filter(g => typeFilter === 'all' || g.goal_type === typeFilter)

  const nearDeadline = activeGoals.filter(g => {
    if (!g.target_date) return false
    return Math.round((new Date(g.target_date) - new Date()) / 86400000) <= 30
  })

  const avgProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((sum, g) => {
        const pct = g.current_value && g.target_value ? Math.min(100, (g.current_value / g.target_value) * 100) : 0
        return sum + pct
      }, 0) / activeGoals.length)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Goals & PRs</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Track your targets, link to workouts, auto-update from sessions</p>
        </div>
        <Button size="sm" onClick={() => setAddGoalOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Goals" value={activeGoals.length} icon={Target} color="purple" />
        <StatCard label="Completed" value={completedGoals.length} sub="all time" icon={CheckCircle2} color="green" />
        <StatCard label="Avg Progress" value={`${avgProgress}%`} sub="active goals" icon={TrendingUp} color="blue" />
        <StatCard label="Due Soon" value={nearDeadline.length} sub="within 30 days" icon={Calendar} color="yellow" />
      </div>

      {/* Near-deadline banner */}
      {nearDeadline.length > 0 && (
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
          <Calendar className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-orange-300">Upcoming deadlines</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {nearDeadline.map(g => g.title).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs + type chips */}
      <div className="space-y-2">
        <div className="flex gap-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-1 w-fit">
          {FILTER_TABS.map(t => (
            <button key={t.id} onClick={() => setFilterTab(t.id)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                filterTab === t.id ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200')}>
              {t.label}
              <span className="ml-1.5 text-xs opacity-60">
                {t.id === 'active' ? activeGoals.length : t.id === 'completed' ? completedGoals.length : goals.length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', ...GOAL_TYPES.map(t => t.id)].map(id => {
            const t = GOAL_TYPES.find(t => t.id === id)
            return (
              <button key={id} onClick={() => setTypeFilter(id)}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  typeFilter === id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                {t ? `${t.icon} ${t.label}` : 'All Types'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Goals list */}
      <div className="space-y-3">
        {visibleGoals.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            {filterTab === 'completed' ? 'No completed goals yet.' : 'No goals here. Add one above.'}
          </div>
        ) : (
          visibleGoals.map(g => <GoalCard key={g.id} goal={g} />)
        )}
      </div>

      {/* PR Board */}
      <PRBoard weightUnit={weightUnit} />

      {/* Add Goal Modal */}
      <GoalModal open={addGoalOpen} onClose={() => setAddGoalOpen(false)} />
    </div>
  )
}
