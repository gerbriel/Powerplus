import { useState, useEffect, useCallback } from 'react'
import {
  Trophy, Calendar, MapPin, Users, Plus, ChevronRight,
  Scale, Target, Layers, Edit2, ChevronDown, ChevronUp,
  CheckCircle2, Circle, Link2, Trash2, RefreshCw, Loader2,
  Award, TrendingUp, BarChart2, Save
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { StatCard } from '../components/ui/StatCard'
import { Tabs } from '../components/ui/Tabs'
import { MOCK_MEETS, MOCK_TRAINING_BLOCKS, MOCK_GOALS } from '../lib/mockData'
import { cn, formatDate, kgToLbs } from '../lib/utils'
import { useSettingsStore, useAuthStore, useMeetsStore } from '../lib/store'
import { saveMeet, saveMeetEntry, saveTrainingBlock, deleteMeet, deleteTrainingBlock, saveMeetAttempts } from '../lib/db'

const FEDERATIONS = ['USAPL','IPF','USPA','NASA','RPS','SPF','WPC','Other']
const EQUIPMENT_OPTS = ['raw','single-ply','multi-ply','wraps']
const PHASES = [
  { id: 'accumulation',   label: 'Accumulation',   desc: 'High volume, lower intensity' },
  { id: 'intensification',label: 'Intensification', desc: 'Moderate volume, higher intensity' },
  { id: 'peaking',        label: 'Peaking',         desc: 'Low volume, maximal intensity' },
  { id: 'deload',         label: 'Deload',          desc: 'Recovery week' },
]
const phaseColor = {
  accumulation:    { dot: 'bg-blue-400',   badge: 'text-blue-300 bg-blue-400/10 border-blue-400/20',     bar: 'bg-blue-500'   },
  intensification: { dot: 'bg-purple-400', badge: 'text-purple-300 bg-purple-400/10 border-purple-400/20', bar: 'bg-purple-500' },
  peaking:         { dot: 'bg-orange-400', badge: 'text-orange-300 bg-orange-400/10 border-orange-400/20', bar: 'bg-orange-500' },
  deload:          { dot: 'bg-green-400',  badge: 'text-green-300 bg-green-400/10 border-green-400/20',   bar: 'bg-green-500'  },
}
const statusColor = {
  completed: 'text-green-300 bg-green-400/10 border-green-400/20',
  active:    'text-purple-300 bg-purple-400/10 border-purple-400/20',
  planned:   'text-zinc-300 bg-zinc-400/10 border-zinc-400/20',
}

function useWeightDisplay() {
  const { weightUnit } = useSettingsStore()
  const show = (kg) => {
    if (!kg && kg !== 0) return '—'
    const step = 2.5
    const v = weightUnit === 'lbs' ? Math.round(kgToLbs(kg) / step) * step : kg
    return `${v} ${weightUnit}`
  }
  return { weightUnit, show }
}

// ── Loading spinner ────────────────────────────────────────────────────────
function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

// ── Meets / Results entry modal ───────────────────────────────────────────
function LogResultsModal({ open, onClose, meet, athleteId }) {
  const { isDemo } = useAuthStore()
  const { addHistoryEntry, updateHistoryEntry } = useMeetsStore()
  const { weightUnit } = useSettingsStore()
  const step = weightUnit === 'lbs' ? 2.5 : 2.5
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    weight_class: '', equipment_type: meet?.equipment ?? 'raw',
    squat_result: '', bench_result: '', deadlift_result: '',
    dots_score: '', wilks_score: '', placement: '', notes: '',
  })
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const total = (Number(form.squat_result) || 0) + (Number(form.bench_result) || 0) + (Number(form.deadlift_result) || 0)

  const handleSave = async () => {
    if (!form.squat_result && !form.deadlift_result) return
    setSaving(true)
    const entry = { ...form, total_result: total }
    if (!isDemo && meet?.id && athleteId) {
      const saved = await saveMeetEntry(meet.id, athleteId, entry)
      if (saved) addHistoryEntry({ ...saved, meet: { id: meet.id, name: meet.name, meet_date: meet.meet_date, federation: meet.federation, location: meet.location, status: 'completed' } })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Log Results — ${meet?.name ?? ''}`} size="md">
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weight Class</label>
            <input value={form.weight_class} onChange={e => upd('weight_class', e.target.value)} placeholder="e.g. 93kg"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Placement</label>
            <input type="number" min="1" value={form.placement} onChange={e => upd('placement', e.target.value)} placeholder="#"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        <p className="text-xs font-semibold text-zinc-400">Best Lifts ({weightUnit})</p>
        <div className="grid grid-cols-3 gap-3">
          {[['squat_result','Squat','text-purple-400'],['bench_result','Bench','text-blue-400'],['deadlift_result','Deadlift','text-orange-400']].map(([k,l,c]) => (
            <div key={k}>
              <label className={cn('block text-xs font-medium mb-1.5', c)}>{l}</label>
              <input type="number" step={step} value={form[k]} onChange={e => upd(k, e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 text-center font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-center">
            <p className="text-xs text-zinc-400">Total</p>
            <p className="text-2xl font-black text-yellow-400">{total} {weightUnit}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">DOTS Score</label>
            <input type="number" step="0.1" value={form.dots_score} onChange={e => upd('dots_score', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Wilks Score</label>
            <input type="number" step="0.1" value={form.wilks_score} onChange={e => upd('wilks_score', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="How it went..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />} Save Results
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Add/Edit Meet Modal ────────────────────────────────────────────────────
function MeetFormModal({ open, onClose, existingMeet = null }) {
  const isEdit = !!existingMeet
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { meets: liveBlocks, goals: liveGoals, addMeet, updateMeet } = useMeetsStore()
  const allBlocks = isDemo ? MOCK_TRAINING_BLOCKS : liveBlocks
  const allGoals  = isDemo ? MOCK_GOALS : liveGoals
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(existingMeet || {
    name: '', federation: 'USAPL', location: '', meet_date: '',
    registration_deadline: '', equipment: 'raw', notes: '',
    linked_goal_ids: [], linked_block_ids: [],
  })

  useEffect(() => {
    if (open) setForm(existingMeet || { name: '', federation: 'USAPL', location: '', meet_date: '', registration_deadline: '', equipment: 'raw', notes: '', linked_goal_ids: [], linked_block_ids: [] })
  }, [open, existingMeet])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleGoal = (id) => upd('linked_goal_ids', form.linked_goal_ids?.includes(id) ? form.linked_goal_ids.filter(x => x !== id) : [...(form.linked_goal_ids || []), id])
  const toggleBlock = (id) => upd('linked_block_ids', form.linked_block_ids?.includes(id) ? form.linked_block_ids.filter(x => x !== id) : [...(form.linked_block_ids || []), id])

  const handleSave = async () => {
    if (!form.name?.trim() || !form.meet_date) return
    setSaving(true)
    if (!isDemo && profile?.id) {
      const saved = await saveMeet(profile.id, activeOrgId, form)
      if (saved) {
        if (isEdit) updateMeet(saved.id, saved)
        else addMeet(saved)
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Meet' : 'Add Meet'} size="md">
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meet Name *</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. USAPL Spring Classic 2026"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Federation</label>
            <select value={form.federation} onChange={e => upd('federation', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {FEDERATIONS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Equipment</label>
            <select value={form.equipment} onChange={e => upd('equipment', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {EQUIPMENT_OPTS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Location</label>
          <input value={form.location} onChange={e => upd('location', e.target.value)} placeholder="City, State"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meet Date *</label>
            <input type="date" value={form.meet_date} onChange={e => upd('meet_date', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Registration Deadline</label>
            <input type="date" value={form.registration_deadline} onChange={e => upd('registration_deadline', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        {allGoals.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" /> Link to Goals & PRs
            </label>
            <div className="space-y-1.5">
              {allGoals.map(g => (
                <button key={g.id} onClick={() => toggleGoal(g.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors text-left',
                    form.linked_goal_ids?.includes(g.id) ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                  {form.linked_goal_ids?.includes(g.id) ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        )}
        {allBlocks.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3" /> Link to Training Blocks
            </label>
            <div className="space-y-1.5">
              {allBlocks.map(tb => (
                <button key={tb.id} onClick={() => toggleBlock(tb.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors text-left',
                    form.linked_block_ids?.includes(tb.id) ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                  {form.linked_block_ids?.includes(tb.id) ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', phaseColor[tb.phase]?.dot || 'bg-zinc-400')} />
                  {tb.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={form.notes || ''} onChange={e => upd('notes', e.target.value)} placeholder="Early weigh-in, flight schedules, etc."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Add Meet'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Add/Edit Training Block Modal ─────────────────────────────────────────
function AddBlockModal({ open, onClose, meetFilter = null, existingBlock = null }) {
  const isEdit = !!existingBlock
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { meets: liveMeets, goals: liveGoals, addBlock, updateBlock } = useMeetsStore()
  const allMeets = isDemo ? MOCK_MEETS : liveMeets
  const allGoals = isDemo ? MOCK_GOALS : liveGoals
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(existingBlock || {
    name: '', phase: 'accumulation', start_date: '', end_date: '',
    weeks: 4, focus: '', avg_rpe_target: 7.5, status: 'planned',
    linked_meet_id: meetFilter || '', linked_goal_ids: [], notes: '',
  })

  useEffect(() => {
    if (open) setForm(existingBlock || { name: '', phase: 'accumulation', start_date: '', end_date: '', weeks: 4, focus: '', avg_rpe_target: 7.5, status: 'planned', linked_meet_id: meetFilter || '', linked_goal_ids: [], notes: '' })
  }, [open, existingBlock, meetFilter])

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleGoal = (id) => upd('linked_goal_ids', form.linked_goal_ids.includes(id) ? form.linked_goal_ids.filter(x => x !== id) : [...form.linked_goal_ids, id])

  const handleSave = async () => {
    if (!form.name?.trim()) return
    setSaving(true)
    if (!isDemo && profile?.id) {
      const saved = await saveTrainingBlock(profile.id, activeOrgId, form)
      if (saved) {
        if (isEdit) updateBlock(saved.id, saved)
        else addBlock(saved)
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Block' : 'New Training Block'} size="md">
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Block Name *</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Spring Prep – Block 1 (Hypertrophy)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">Phase</label>
          <div className="grid grid-cols-2 gap-2">
            {PHASES.map(p => (
              <button key={p.id} onClick={() => upd('phase', p.id)}
                className={cn('flex items-start gap-2 p-3 rounded-lg border text-left transition-colors',
                  form.phase === p.id ? 'border-purple-500/50 bg-purple-500/10' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600')}>
                <span className={cn('w-2 h-2 rounded-full mt-0.5', phaseColor[p.id]?.dot || 'bg-zinc-400')} />
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{p.label}</p>
                  <p className="text-xs text-zinc-500">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date</label>
            <input type="date" value={form.start_date} onChange={e => upd('start_date', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
            <input type="date" value={form.end_date} onChange={e => upd('end_date', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Weeks</label>
            <input type="number" min="1" max="16" value={form.weeks} onChange={e => upd('weeks', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target RPE</label>
            <input type="number" min="5" max="10" step="0.5" value={form.avg_rpe_target} onChange={e => upd('avg_rpe_target', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Focus / Theme</label>
          <input value={form.focus} onChange={e => upd('focus', e.target.value)} placeholder="e.g. Volume & Technique"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
          <select value={form.status} onChange={e => upd('status', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {allMeets.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> Link to Meet
            </label>
            <select value={form.linked_meet_id} onChange={e => upd('linked_meet_id', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <option value="">— None —</option>
              {allMeets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        {allGoals.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" /> Link to Goals
            </label>
            <div className="space-y-1.5">
              {allGoals.map(g => (
                <button key={g.id} onClick={() => toggleGoal(g.id)}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors text-left',
                    form.linked_goal_ids.includes(g.id) ? 'bg-purple-500/10 border-purple-500/30 text-purple-200' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                  {form.linked_goal_ids.includes(g.id) ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <Circle className="w-3.5 h-3.5 text-zinc-600" />}
                  {g.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={form.notes} onChange={e => upd('notes', e.target.value)} placeholder="Describe the block intent..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {isEdit ? 'Save Changes' : 'Create Block'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Attempt Planner ──────────────────────────────────────────────────────
function AttemptPlanner({ meet }) {
  const { weightUnit } = useSettingsStore()
  const { isDemo, profile } = useAuthStore()
  const { updateProfile } = useAuthStore()
  const { updateMeet } = useMeetsStore()
  const toUnit = (kg) => weightUnit === 'lbs' ? Math.round(kgToLbs(kg) / 2.5) * 2.5 : kg
  const toKg = (v) => weightUnit === 'lbs' ? v / 2.20462 : v
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newPRs, setNewPRs] = useState([]) // lifted lift names that broke PRs

  // Planned attempt weights
  const [attempts, setAttempts] = useState(() => {
    const base = meet?.attempts || { squat:{1:192.5,2:202.5,3:210}, bench:{1:140,2:147.5,3:152.5}, deadlift:{1:260,2:272.5,3:282.5} }
    if (weightUnit === 'lbs') {
      const c = {}
      Object.entries(base).forEach(([l, vs]) => { c[l]={}; Object.entries(vs).forEach(([a,kg]) => { c[l][a]=toUnit(kg) }) })
      return c
    }
    return base
  })

  // Result state per attempt: 'pending' | 'made' | 'miss'
  const [results, setResults] = useState(() =>
    meet?.attempt_results || { squat:{1:'pending',2:'pending',3:'pending'}, bench:{1:'pending',2:'pending',3:'pending'}, deadlift:{1:'pending',2:'pending',3:'pending'} }
  )

  // Actual weight lifted (may differ from planned if called a different weight)
  const [actuals, setActuals] = useState(() =>
    meet?.attempt_actuals || { squat:{}, bench:{}, deadlift:{} }
  )

  const unit = weightUnit
  const step = unit === 'lbs' ? 5 : 2.5

  const cycleResult = (lift, att) => {
    const cur = results[lift][att]
    const next = cur === 'pending' ? 'made' : cur === 'made' ? 'miss' : 'pending'
    setResults(p => ({ ...p, [lift]: { ...p[lift], [att]: next } }))
    // When marking as made, seed actual = planned if not already set
    if (next === 'made' && !actuals[lift][att]) {
      setActuals(p => ({ ...p, [lift]: { ...p[lift], [att]: attempts[lift][att] } }))
    }
  }

  // Best made attempt per lift (highest attempt number that was made)
  const bestMade = (lift) => {
    for (let a = 3; a >= 1; a--) {
      if (results[lift][a] === 'made') {
        const w = actuals[lift][a] ?? attempts[lift][a]
        return w
      }
    }
    return null
  }

  const sqBest = bestMade('squat')
  const beBest = bestMade('bench')
  const dlBest = bestMade('deadlift')
  const actualTotal = (sqBest || 0) + (beBest || 0) + (dlBest || 0)
  const projTotal3  = (attempts.squat[3]||0) + (attempts.bench[3]||0) + (attempts.deadlift[3]||0)
  const displayTotal = actualTotal > 0 ? actualTotal : projTotal3
  const isLive = Object.values(results).some(r => Object.values(r).some(v => v !== 'pending'))

  const totalKg = unit === 'lbs' ? Math.round(toKg(displayTotal)) : displayTotal
  const liftColors = { squat:'text-purple-400', bench:'text-blue-400', deadlift:'text-orange-400' }
  const resultStyle = {
    pending: 'bg-zinc-800/60 border-zinc-700/40 text-zinc-500',
    made:    'bg-green-500/15 border-green-500/40 text-green-400',
    miss:    'bg-red-500/15 border-red-500/30 text-red-400 line-through opacity-70',
  }
  const resultIcon = { pending: null, made: '✓', miss: '✕' }

  const handleSave = async () => {
    if (!meet?.id || meet.id.startsWith('meet-')) return
    setSaving(true)
    const saved = await saveMeetAttempts(meet.id, attempts, results, actuals)
    if (saved) updateMeet(meet.id, { attempts: saved.attempts, attempt_results: saved.attempt_results, attempt_actuals: saved.attempt_actuals })

    // Check if any best-made lift beats current PRs, auto-update profile
    if (!isDemo && profile) {
      const detail = profile?.prs_detail || {}
      const newDetail = { ...detail }
      const broken = []
      const liftMap = { squat: sqBest, bench: beBest, deadlift: dlBest }
      Object.entries(liftMap).forEach(([lift, best]) => {
        if (!best) return
        const bestKg = toKg(best)
        const curGym = detail[lift]?.gym_1rm ?? 0
        if (bestKg > curGym) {
          newDetail[lift] = { ...(detail[lift] || {}), gym_1rm: bestKg }
          broken.push(lift.charAt(0).toUpperCase() + lift.slice(1))
        }
      })
      if (broken.length > 0) {
        await updateProfile({ prs_detail: newDetail })
        setNewPRs(broken)
        setTimeout(() => setNewPRs([]), 4000)
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Linked goals from store
  const { goals: liveGoals } = useMeetsStore()
  const allGoals = isDemo ? MOCK_GOALS : liveGoals
  const linkedGoals = allGoals.filter(g => meet?.linked_goal_ids?.includes(g.id))

  return (
    <div className="space-y-4">
      {newPRs.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-yellow-300">
            New PR{newPRs.length > 1 ? 's' : ''}! {newPRs.join(', ')} 1RM updated in your profile.
          </p>
        </div>
      )}
      {linkedGoals.length > 0 && (
        <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl space-y-1.5">
          <p className="text-xs font-semibold text-yellow-300 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Linked Goals</p>
          {linkedGoals.map(g => (
            <div key={g.id} className="flex items-center gap-2 text-xs text-zinc-300">
              <CheckCircle2 className="w-3 h-3 text-yellow-400" /> {g.title}
            </div>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{meet?.name || 'Meet'} — Attempt Selection</CardTitle>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/25 px-2 py-0.5 rounded-full">Live</span>
              )}
              <span className="text-xs text-zinc-500">{unit}</span>
            </div>
          </div>
          <CardSubtitle>
            {isLive
              ? 'Tap each attempt to mark Made (✓) or Miss (✕). Actual weight auto-filled on made.'
              : 'Opener = 90–93%, 2nd = 96–99%, 3rd = peak / competition best. Tap cells during meet to track.'}
          </CardSubtitle>
        </CardHeader>
        {['squat','bench','deadlift'].map(lift => (
          <div key={lift} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className={cn('text-sm font-bold capitalize flex items-center gap-2', liftColors[lift])}>
                <span className={cn('w-2 h-2 rounded-full', lift==='squat'?'bg-purple-400':lift==='bench'?'bg-blue-400':'bg-orange-400')} />
                {lift}
              </h3>
              {bestMade(lift) != null && (
                <span className={cn('text-xs font-bold', liftColors[lift])}>
                  Best: {bestMade(lift)} {unit}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1,2,3].map(att => {
                const res = results[lift][att]
                const actual = actuals[lift][att]
                return (
                  <div key={att} className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-500">
                      {att===1?'Opener':att===2?'2nd':'3rd / Peak'}
                    </label>
                    {/* Planned weight */}
                    <div className="relative">
                      <input type="number" step={step} value={attempts[lift][att]}
                        onChange={e => setAttempts(p => ({...p, [lift]:{...p[lift],[att]:Number(e.target.value)}}))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-center font-bold pr-10" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{unit}</span>
                    </div>
                    {/* Pass/Miss toggle */}
                    <button
                      onClick={() => cycleResult(lift, att)}
                      className={cn('w-full py-1.5 rounded-lg border text-xs font-bold transition-all', resultStyle[res])}
                    >
                      {res === 'pending' ? 'tap to mark' : `${resultIcon[res]} ${res.toUpperCase()}`}
                    </button>
                    {/* Actual weight on made */}
                    {res === 'made' && (
                      <div className="relative">
                        <input
                          type="number" step={step}
                          value={actual ?? attempts[lift][att]}
                          onChange={e => setActuals(p => ({...p, [lift]:{...p[lift],[att]:Number(e.target.value)}}))}
                          className="w-full bg-green-500/10 border border-green-500/30 rounded-lg px-2 py-1.5 text-xs text-green-300 text-center font-bold focus:outline-none focus:ring-1 focus:ring-green-500 pr-8"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-700">{unit}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">{isLive ? 'Actual Total' : 'Projected Total (3rd attempts)'}</p>
            <p className="text-2xl font-black text-yellow-400">{displayTotal} {unit}</p>
            {unit==='lbs' && <p className="text-xs text-zinc-500">{totalKg} kg</p>}
            {isLive && actualTotal === 0 && <p className="text-xs text-zinc-600">mark attempts above to calculate</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Approx DOTS</p>
              <p className="text-2xl font-black text-purple-400">~{Math.round(totalKg*0.62)}</p>
            </div>
            {!meet?.id?.startsWith('meet-') && (
              <Button size="xs" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Save className="w-3.5 h-3.5" />}
                {saved ? 'Saved!' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Meet Day Warm-Up Plan</CardTitle>
          <CardSubtitle>Progressive warm-up based on your openers</CardSubtitle>
        </CardHeader>
        <div className="space-y-4">
          {[{lift:'Squat',opener:attempts.squat[1],color:'text-purple-400'},{lift:'Bench',opener:attempts.bench[1],color:'text-blue-400'},{lift:'Deadlift',opener:attempts.deadlift[1],color:'text-orange-400'}].map(({lift,opener,color}) => (
            <div key={lift}>
              <p className={cn('text-xs font-semibold mb-2', color)}>{lift} — Opener: {opener} {unit}</p>
              <div className="flex flex-wrap gap-2">
                {[0.4,0.55,0.65,0.75,0.85,0.93].map(pct => (
                  <span key={pct} className="text-xs bg-zinc-700/60 text-zinc-300 px-2.5 py-1 rounded-lg">
                    {Math.round(opener*pct/step)*step} {unit} <span className="text-zinc-500">({Math.round(pct*100)}%)</span>
                  </span>
                ))}
                <span className="text-xs bg-zinc-700 border border-zinc-600 text-yellow-300 px-2.5 py-1 rounded-lg font-bold">
                  {opener} {unit} — Opener
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Training Blocks Panel ─────────────────────────────────────────────────
function TrainingBlocksPanel({ meetFilter = null }) {
  const [addBlockOpen, setAddBlockOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)
  const [expandedBlock, setExpandedBlock] = useState(null)
  const { isDemo } = useAuthStore()
  const { blocks: liveBlocks, meets: liveMeets, goals: liveGoals, removeBlock } = useMeetsStore()
  const allBlocks = isDemo ? MOCK_TRAINING_BLOCKS : liveBlocks
  const allMeets  = isDemo ? MOCK_MEETS : liveMeets
  const allGoals  = isDemo ? MOCK_GOALS : liveGoals
  const blocks = meetFilter ? allBlocks.filter(tb => tb.linked_meet_id === meetFilter) : allBlocks
  const activeMeet = allMeets.find(m => m.id === meetFilter)

  const handleDelete = async (blockId) => {
    if (isDemo) return
    if (!window.confirm('Delete this training block?')) return
    await deleteTrainingBlock(blockId)
    removeBlock(blockId)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Training Blocks</p>
          {activeMeet && <p className="text-xs text-zinc-500 mt-0.5">Linked to {activeMeet.name}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddBlockOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Block
        </Button>
      </div>

      {blocks.length === 0 && (
        <div className="text-center py-12 text-zinc-500 text-sm">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No training blocks yet.</p>
          <p className="text-xs mt-1">Create a block to plan your prep cycle.</p>
        </div>
      )}

      <div className="space-y-3">
        {blocks.map(tb => {
          const c = phaseColor[tb.phase] || phaseColor.deload
          const pct = tb.sessions_planned > 0 ? Math.round((tb.sessions_completed / tb.sessions_planned) * 100) : 0
          const linkedGoals = allGoals.filter(g => tb.linked_goal_ids?.includes(g.id))
          const linkedMeet  = allMeets.find(m => m.id === tb.linked_meet_id)
          const isExpanded  = expandedBlock === tb.id
          return (
            <Card key={tb.id} className="p-0 overflow-hidden">
              <button className="w-full flex items-start gap-3 p-4 hover:bg-zinc-800/30 transition-colors text-left"
                onClick={() => setExpandedBlock(isExpanded ? null : tb.id)}>
                <span className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0', c.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-200">{tb.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusColor[tb.status])}>{tb.status}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-zinc-400">
                    <span className={cn('px-2 py-0.5 rounded-full border text-xs', c.badge)}>{tb.phase}</span>
                    {tb.start_date && <span>{tb.start_date} → {tb.end_date} · {tb.weeks}w</span>}
                    {tb.focus && <span>· {tb.focus}</span>}
                  </div>
                  {tb.sessions_planned > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{tb.sessions_completed}/{tb.sessions_planned} sessions</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', c.bar)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-zinc-800 p-4 space-y-3 bg-zinc-800/20">
                  {tb.notes && <p className="text-xs text-zinc-400 italic">"{tb.notes}"</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">{tb.avg_rpe_target ?? '—'}</p>
                      <p className="text-xs text-zinc-500">Target RPE</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">{tb.weeks ?? '—'}</p>
                      <p className="text-xs text-zinc-500">Weeks</p>
                    </div>
                  </div>
                  {linkedMeet && (
                    <div className="flex items-center gap-2 p-2.5 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <div>
                        <p className="text-xs font-semibold text-yellow-300">{linkedMeet.name}</p>
                        <p className="text-xs text-zinc-500">{formatDate(linkedMeet.meet_date)}</p>
                      </div>
                    </div>
                  )}
                  {linkedGoals.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5"><Target className="w-3 h-3" /> Linked Goals</p>
                      {linkedGoals.map(g => (
                        <div key={g.id} className="flex items-center gap-2 text-xs text-zinc-300">
                          <CheckCircle2 className="w-3 h-3 text-purple-400" /> {g.title}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="xs" variant="outline" className="flex-1" onClick={() => setEditingBlock(tb)}>
                      <Edit2 className="w-3 h-3" /> Edit Block
                    </Button>
                    {!isDemo && (
                      <Button size="xs" variant="ghost" className="flex-1 text-red-400 hover:text-red-300" onClick={() => handleDelete(tb.id)}>
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <AddBlockModal open={addBlockOpen} onClose={() => setAddBlockOpen(false)} meetFilter={meetFilter} />
      {editingBlock && <AddBlockModal open={!!editingBlock} onClose={() => setEditingBlock(null)} existingBlock={editingBlock} meetFilter={meetFilter} />}
    </div>
  )
}

// ── Meet Detail ──────────────────────────────────────────────────────────
function MeetDetailView({ meet, onBack, onEdit }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [logResultsOpen, setLogResultsOpen] = useState(false)
  const { isDemo, profile } = useAuthStore()
  const { blocks: liveBlocks, goals: liveGoals } = useMeetsStore()
  const allBlocks = isDemo ? MOCK_TRAINING_BLOCKS : liveBlocks
  const allGoals  = isDemo ? MOCK_GOALS : liveGoals
  const linkedBlocks = allBlocks.filter(tb => tb.linked_meet_id === meet.id)
  const linkedGoals  = allGoals.filter(g => meet.linked_goal_ids?.includes(g.id))
  const daysOut = Math.max(0, Math.round((new Date(meet.meet_date) - new Date()) / 86400000))
  const isPast  = new Date(meet.meet_date) < new Date()
  const tabs = [
    { id:'overview', label:'Overview' },
    { id:'attempts', label:'Attempts & Warm-Up' },
    { id:'blocks',   label:'Training Blocks' },
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">{meet.name}</h3>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(meet.meet_date)}</span>
                  {meet.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{meet.location}</span>}
                  {meet.athletes_registered > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{meet.athletes_registered} athletes</span>}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {meet.federation && <Badge color="yellow">{meet.federation}</Badge>}
                  {meet.equipment  && <Badge color="default">{meet.equipment}</Badge>}
                  {meet.status     && <Badge color="green">{meet.status}</Badge>}
                </div>
                {meet.notes && <p className="text-xs text-zinc-400 mt-2 italic">"{meet.notes}"</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              {isPast ? (
                <>
                  <p className="text-xs text-zinc-500">completed</p>
                  <Trophy className="w-8 h-8 text-yellow-400 ml-auto mt-1" />
                </>
              ) : (
                <>
                  <p className="text-3xl font-black text-yellow-400">{daysOut}</p>
                  <p className="text-xs text-zinc-500">days out</p>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button size="xs" variant="outline" onClick={onEdit}><Edit2 className="w-3 h-3" /> Edit Meet</Button>
            {isPast && <Button size="xs" onClick={() => setLogResultsOpen(true)}><Award className="w-3 h-3" /> Log Results</Button>}
          </div>
        </CardBody>
      </Card>
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={isPast ? 'Days Ago' : 'Days Out'} value={daysOut} sub="to meet day" icon={Calendar} color="yellow" />
            <StatCard label="Linked Goals"  value={linkedGoals.length}  sub="active"  icon={Target} color="purple" />
            <StatCard label="Training Blocks" value={linkedBlocks.length} sub="linked" icon={Layers} color="blue" />
          </div>
          {linkedGoals.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-4 h-4 text-purple-400" /> Linked Goals & PRs</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {linkedGoals.map(g => {
                  const pct = g.current_value && g.target_value ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0
                  return (
                    <div key={g.id} className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-zinc-200">{g.title}</p>
                        <span className="text-xs text-zinc-400">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      {g.current_value && <p className="text-xs text-zinc-500 mt-1.5">{g.current_value} / {g.target_value} {g.target_unit}</p>}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}
          {linkedBlocks.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" /> Prep Timeline</CardTitle></CardHeader>
              <CardBody className="space-y-2">
                {linkedBlocks.map(tb => {
                  const c = phaseColor[tb.phase] || phaseColor.deload
                  return (
                    <div key={tb.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/40 rounded-lg">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{tb.name}</p>
                        {tb.start_date && <p className="text-xs text-zinc-500">{tb.start_date} → {tb.end_date}</p>}
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', statusColor[tb.status])}>{tb.status}</span>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}
        </div>
      )}
      {activeTab === 'attempts' && <AttemptPlanner meet={meet} />}
      {activeTab === 'blocks'   && <TrainingBlocksPanel meetFilter={meet.id} />}
      <LogResultsModal open={logResultsOpen} onClose={() => setLogResultsOpen(false)} meet={meet} athleteId={profile?.id} />
    </div>
  )
}

// ── Meet History ──────────────────────────────────────────────────────────
function MeetHistory() {
  const { show } = useWeightDisplay()
  const { isDemo } = useAuthStore()
  const { history: liveHistory } = useMeetsStore()

  const DEMO_HISTORY = [
    { id: 'h1', meet: { name:'Fall Classic 2025', meet_date:'2025-10-18', federation:'USAPL', location:'Chicago, IL' }, squat_result:195, bench_result:140, deadlift_result:267.5, total_result:602.5, dots_score:362.4, wilks_score:358.2, placement:3, weight_class:'93kg', notes:'' },
    { id: 'h2', meet: { name:'Summer Strength 2025', meet_date:'2025-06-14', federation:'USAPL', location:'Austin, TX' }, squat_result:185, bench_result:132.5, deadlift_result:255, total_result:572.5, dots_score:344.7, wilks_score:341.0, placement:2, weight_class:'93kg', notes:'' },
    { id: 'h3', meet: { name:'State Championships 2024', meet_date:'2024-11-09', federation:'USAPL', location:'Nashville, TN' }, squat_result:175, bench_result:125, deadlift_result:245, total_result:545, dots_score:328.1, wilks_score:324.8, placement:4, weight_class:'93kg', notes:'' },
  ]
  const history = isDemo ? DEMO_HISTORY : liveHistory

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No meet history yet.</p>
        <p className="text-xs mt-1">Results will appear here after you log a competition.</p>
        <p className="text-xs mt-1 text-zinc-500">Open a past meet and tap "Log Results" to add your numbers.</p>
      </div>
    )
  }

  // Best lifts across all meets
  const bestSquat    = Math.max(...history.map(h => h.squat_result    || 0))
  const bestBench    = Math.max(...history.map(h => h.bench_result    || 0))
  const bestDeadlift = Math.max(...history.map(h => h.deadlift_result || 0))
  const bestTotal    = Math.max(...history.map(h => h.total_result    || 0))
  const bestDots     = Math.max(...history.map(h => h.dots_score      || 0))

  return (
    <div className="space-y-4">
      {/* PR row */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {[
          { l:'Best Squat',    v:show(bestSquat),    c:'text-purple-400' },
          { l:'Best Bench',    v:show(bestBench),    c:'text-blue-400'   },
          { l:'Best Deadlift', v:show(bestDeadlift), c:'text-orange-400' },
          { l:'Best Total',    v:show(bestTotal),    c:'text-yellow-400' },
          { l:'Best DOTS',     v:bestDots.toFixed(1),c:'text-green-400'  },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">{l}</p>
            <p className={cn('text-sm font-black', c)}>{v}</p>
          </div>
        ))}
      </div>

      {/* Meet cards */}
      {history.map((entry, i) => (
        <Card key={entry.id || i}>
          <CardBody>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">{entry.meet?.name ?? 'Meet'}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {entry.meet?.meet_date ? formatDate(entry.meet.meet_date) : ''}
                  {entry.weight_class && ` · ${entry.weight_class}`}
                  {entry.meet?.location && ` · ${entry.meet.location}`}
                </p>
                {entry.meet?.federation && (
                  <div className="mt-1.5">
                    <Badge color="yellow">{entry.meet.federation}</Badge>
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-yellow-400">{show(entry.total_result)}</p>
                <p className="text-xs text-zinc-400">DOTS: {entry.dots_score?.toFixed?.(1) ?? entry.dots_score ?? '—'}</p>
                {entry.placement && <p className="text-xs text-zinc-400">#{entry.placement} place</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              {[
                { l:'Squat',    v:entry.squat_result,    c:'text-purple-400' },
                { l:'Bench',    v:entry.bench_result,    c:'text-blue-400'   },
                { l:'Deadlift', v:entry.deadlift_result, c:'text-orange-400' },
              ].map(({ l, v, c }) => (
                <div key={l} className="bg-zinc-700/30 rounded-lg py-2">
                  <p className="text-xs text-zinc-500">{l}</p>
                  <p className={cn('text-sm font-bold', c)}>{show(v)}</p>
                </div>
              ))}
            </div>
            {entry.notes && <p className="text-xs text-zinc-500 mt-2 italic">"{entry.notes}"</p>}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

// ── Main MeetsPage ────────────────────────────────────────────────────────
export function MeetsPage() {
  const [tab, setTab] = useState('upcoming')
  const [addMeetOpen, setAddMeetOpen] = useState(false)
  const [selectedMeet, setSelectedMeet] = useState(null)
  const [editMeet, setEditMeet] = useState(null)
  const { weightUnit, toggleWeightUnit } = useSettingsStore()
  const { isDemo, user, activeOrgId } = useAuthStore()
  const { meets: liveMeets, blocks: liveBlocks, goals: liveGoals, loading, load, removeMeet } = useMeetsStore()

  // Load from Supabase on mount / user change
  useEffect(() => {
    if (!isDemo && user?.id) load(user.id, activeOrgId)
  }, [user?.id, activeOrgId, isDemo])

  const allMeets  = isDemo ? MOCK_MEETS  : liveMeets
  const allBlocks = isDemo ? MOCK_TRAINING_BLOCKS : liveBlocks
  const allGoals  = isDemo ? MOCK_GOALS  : liveGoals

  const daysOut = (ds) => Math.max(0, Math.round((new Date(ds) - new Date()) / 86400000))

  // Keep selectedMeet in sync if it was updated
  useEffect(() => {
    if (selectedMeet) {
      const updated = allMeets.find(m => m.id === selectedMeet.id)
      if (updated && updated !== selectedMeet) setSelectedMeet(updated)
    }
  }, [allMeets])

  const handleDeleteMeet = async (meetId) => {
    if (isDemo) return
    if (!window.confirm('Delete this meet and all linked entries?')) return
    await deleteMeet(meetId)
    removeMeet(meetId)
    if (selectedMeet?.id === meetId) setSelectedMeet(null)
  }

  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'blocks',   label: 'Training Blocks' },
    { id: 'history',  label: 'Meet History' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Meets</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Competition calendar, blocks & planning</p>
        </div>
        <div className="flex items-center gap-2">
          {!isDemo && (
            <button onClick={() => load(user?.id, activeOrgId, true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:border-zinc-500 transition-colors">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
          <button onClick={toggleWeightUnit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-300 hover:border-zinc-500 transition-colors">
            <Scale className="w-3.5 h-3.5 text-purple-400" />{weightUnit.toUpperCase()}
          </button>
          <Button size="sm" onClick={() => setAddMeetOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Meet
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {/* Loading state */}
      {!isDemo && loading && <LoadingState label="Loading your meets…" />}

      {/* Meet drill-down */}
      {!loading && selectedMeet && tab === 'upcoming' && (
        <div>
          <button onClick={() => setSelectedMeet(null)} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 mb-4 transition-colors">
            ← Back to all meets
          </button>
          <MeetDetailView
            meet={selectedMeet}
            onBack={() => setSelectedMeet(null)}
            onEdit={() => setEditMeet(selectedMeet)}
          />
        </div>
      )}

      {/* Upcoming meets list */}
      {!loading && !selectedMeet && tab === 'upcoming' && (
        <div className="space-y-4">
          {allMeets.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No upcoming meets.</p>
              <p className="text-xs mt-1">Add your first competition to get started.</p>
            </div>
          ) : (
            <>
              {(() => {
                const upcomingMeets = allMeets.filter(m => new Date(m.meet_date) >= new Date())
                const nextMeet = upcomingMeets[0]
                if (!nextMeet) return null
                const nextDate = new Date(nextMeet.meet_date)
                const nextLabel = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard label="Next Meet"           value={nextLabel}                           sub={nextMeet.name}    icon={Trophy}   color="yellow" />
                    <StatCard label="Athletes Confirmed"  value={nextMeet.athletes_confirmed ?? '—'}  sub={nextMeet.name}    icon={Users}    color="blue"   />
                    <StatCard label="Days Out"            value={daysOut(nextMeet.meet_date)}          sub="from today"       icon={Calendar} color="purple" />
                  </div>
                )
              })()}
              {allMeets.map(meet => {
                const d = daysOut(meet.meet_date)
                const isPast = new Date(meet.meet_date) < new Date()
                const lBlocks = allBlocks.filter(tb => tb.linked_meet_id === meet.id)
                const lGoals  = allGoals.filter(g  => meet.linked_goal_ids?.includes(g.id))
                return (
                  <Card key={meet.id} className="hover:border-zinc-600 transition-colors">
                    <CardBody>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100">{meet.name}</h3>
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-zinc-400">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(meet.meet_date)}</span>
                              {meet.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{meet.location}</span>}
                              {meet.athletes_registered > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{meet.athletes_registered} athletes confirmed</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {meet.federation && <Badge color="yellow">{meet.federation}</Badge>}
                              {meet.equipment  && <Badge color="default">{meet.equipment}</Badge>}
                              {meet.status     && <Badge color={isPast ? 'green' : 'purple'}>{meet.status}</Badge>}
                              {lBlocks.length > 0 && (
                                <span className="text-xs text-blue-300 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Layers className="w-2.5 h-2.5" /> {lBlocks.length} blocks
                                </span>
                              )}
                              {lGoals.length > 0 && (
                                <span className="text-xs text-purple-300 bg-purple-400/10 border border-purple-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Target className="w-2.5 h-2.5" /> {lGoals.length} goals
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {isPast ? (
                            <span className="text-xs text-zinc-500 bg-zinc-700/50 px-2 py-1 rounded-lg">Past</span>
                          ) : (
                            <>
                              <p className="text-2xl font-black text-yellow-400">{d}</p>
                              <p className="text-xs text-zinc-500">days out</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button size="xs" onClick={() => setSelectedMeet(meet)}>
                          <ChevronRight className="w-3.5 h-3.5" /> View Meet
                        </Button>
                        {!isPast && (
                          <Button size="xs" variant="outline" onClick={() => { setSelectedMeet(meet) }}>
                            <Target className="w-3.5 h-3.5" /> Plan Attempts
                          </Button>
                        )}
                        <Button size="xs" variant="ghost" onClick={() => setEditMeet(meet)}>
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        {!isDemo && (
                          <Button size="xs" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteMeet(meet.id)}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </Button>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </>
          )}
        </div>
      )}

      {!loading && tab === 'blocks'  && <TrainingBlocksPanel />}
      {!loading && tab === 'history' && <MeetHistory />}

      <MeetFormModal open={addMeetOpen}  onClose={() => setAddMeetOpen(false)} />
      <MeetFormModal open={!!editMeet}   onClose={() => setEditMeet(null)} existingMeet={editMeet} />
    </div>
  )
}
