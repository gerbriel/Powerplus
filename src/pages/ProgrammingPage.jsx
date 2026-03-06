import { useState, useEffect } from 'react'
import {
  Plus, Dumbbell, ChevronDown, ChevronUp, Copy, Edit, Trash2,
  GripVertical, Search, Save, Loader2, Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { cn } from '../lib/utils'
import { useAuthStore, useProgrammingStore } from '../lib/store'
import { saveProgramTemplate, deleteProgramTemplate, saveExercise, deleteExercise, saveWorkoutBuilder } from '../lib/db'

const TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'builder',   label: 'Workout Builder' },
  { id: 'exercises', label: 'Exercise Library' },
]

const BLOCK_TYPES    = ['accumulation', 'intensification', 'peak', 'deload']
const DAYS_OF_WEEK   = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const BLOCK_SECTIONS = [
  { type: 'warmup',       label: 'Warm-Up' },
  { type: 'main',         label: 'Main Lift' },
  { type: 'accessory',    label: 'Accessory Work' },
  { type: 'conditioning', label: 'Conditioning' },
  { type: 'mobility',     label: 'Mobility / Cool-Down' },
]
const CATEGORIES = ['all', 'squat', 'bench', 'deadlift', 'accessory', 'gpp', 'mobility']

/** Client-side sanitize for display / local state (server has its own in db.js). */
function sanitize(val, max = 500) {
  return String(val ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max)
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgrammingPage (root)
// ─────────────────────────────────────────────────────────────────────────────

export function ProgrammingPage() {
  const { isDemo, activeOrgId, user } = useAuthStore()
  const {
    templates: liveTemplates, exercises: liveExercises,
    loading, loadProgramming,
    addTemplate, updateTemplate, removeTemplate,
    addExercise, updateExercise, removeExercise,
    getDemoTemplates, getDemoExercises,
  } = useProgrammingStore()

  const [tab,             setTab]             = useState('templates')
  const [newTemplateOpen, setNewTemplateOpen] = useState(false)

  useEffect(() => {
    if (!isDemo && activeOrgId) loadProgramming(activeOrgId)
  }, [isDemo, activeOrgId])

  const templates = isDemo ? getDemoTemplates() : liveTemplates
  const exercises  = isDemo ? getDemoExercises() : liveExercises

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Programming</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Templates, builders, and exercise library</p>
        </div>
        {tab === 'templates' && (
          <Button size="sm" onClick={() => setNewTemplateOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> New Template
          </Button>
        )}
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'templates' && (
        <TemplatesList
          templates={templates} isDemo={isDemo} loading={loading}
          orgId={activeOrgId} userId={user?.id}
          onNew={() => setNewTemplateOpen(true)}
          onAdd={addTemplate} onUpdate={updateTemplate} onRemove={removeTemplate}
        />
      )}
      {tab === 'builder' && (
        <WorkoutBuilder exercises={exercises} isDemo={isDemo} orgId={activeOrgId} userId={user?.id} />
      )}
      {tab === 'exercises' && (
        <ExerciseLibrary
          exercises={exercises} isDemo={isDemo} orgId={activeOrgId} userId={user?.id}
          onAdd={addExercise} onUpdate={updateExercise} onRemove={removeExercise}
        />
      )}

      <TemplateFormModal
        open={newTemplateOpen}
        onClose={() => setNewTemplateOpen(false)}
        orgId={activeOrgId} userId={user?.id} isDemo={isDemo}
        onSaved={(t) => { addTemplate(t); setNewTemplateOpen(false) }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TemplatesList
// ─────────────────────────────────────────────────────────────────────────────

function TemplatesList({ templates, isDemo, loading, orgId, userId, onNew, onAdd, onUpdate, onRemove }) {
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const handleDelete = async (t) => {
    if (isDemo) { onRemove(t.id); setDeleteTarget(null); return }
    setDeleting(true)
    const ok = await deleteProgramTemplate(t.id)
    setDeleting(false)
    if (ok) { onRemove(t.id); setDeleteTarget(null) }
  }

  const handleDuplicate = async (t) => {
    if (isDemo) {
      onAdd({ ...t, id: 'demo-' + Date.now(), name: t.name + ' (copy)', athletes: 0 })
      return
    }
    const result = await saveProgramTemplate({
      name: t.name + ' (copy)', description: t.description,
      weeks: t.weeks, block_type: t.block_type,
      programming_style: t.programming_style ?? t.style ?? 'hybrid',
      org_id: orgId, created_by: userId, tags: t.tags,
    })
    if (result) onAdd({ ...result, style: result.programming_style, athletes: 0 })
  }

  if (loading && !isDemo) {
    return (
      <div className="py-16 flex items-center justify-center gap-2 text-zinc-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading templates…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <Card key={t.id} className="hover:border-zinc-600 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{t.name}</h3>
                  {t.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{t.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <Badge color="default">{t.weeks}wk</Badge>
                    <Badge color="purple">{t.style ?? t.programming_style}</Badge>
                    <Badge color="blue">{t.block_type}</Badge>
                    <span className="text-xs text-zinc-500">{t.athletes ?? 0} athletes assigned</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button title="Duplicate" onClick={() => handleDuplicate(t)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                  <button title="Edit" onClick={() => setEditTarget(t)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                  <button title="Delete" onClick={() => setDeleteTarget(t)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}

      <button onClick={onNew} className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-sm text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Create New Template
      </button>

      {editTarget && (
        <TemplateFormModal
          open={!!editTarget} template={editTarget}
          orgId={orgId} userId={userId} isDemo={isDemo}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => { onUpdate(updated.id, updated); setEditTarget(null) }}
        />
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Template?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">Delete <span className="font-semibold text-zinc-100">"{deleteTarget?.name}"</span>? This removes all workout days inside it. Cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={() => handleDelete(deleteTarget)}>
              {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TemplateFormModal
// ─────────────────────────────────────────────────────────────────────────────

function TemplateFormModal({ open, onClose, template, orgId, userId, isDemo, onSaved }) {
  const isEdit = !!template
  const blank  = { name: '', description: '', weeks: 12, block_type: 'accumulation', programming_style: 'hybrid' }
  const [form,   setFormState] = useState(blank)
  const [saving, setSaving]    = useState(false)
  const [error,  setError]     = useState(null)

  useEffect(() => {
    setFormState(template
      ? { name: template.name ?? '', description: template.description ?? '', weeks: template.weeks ?? 12, block_type: template.block_type ?? 'accumulation', programming_style: template.programming_style ?? template.style ?? 'hybrid' }
      : blank)
    setError(null)
  }, [template, open])

  const set = (k, v) => setFormState(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const trimmedName = form.name.trim()
    if (!trimmedName) { setError('Template name is required.'); return }
    setSaving(true); setError(null)

    if (isDemo) {
      onSaved({ id: template?.id ?? 'demo-' + Date.now(), ...form, name: trimmedName, style: form.programming_style, athletes: template?.athletes ?? 0 })
      setSaving(false); return
    }

    const result = await saveProgramTemplate({
      id: isEdit ? template.id : undefined,
      name: sanitize(trimmedName, 200),
      description: sanitize(form.description, 2000) || null,
      weeks: Math.max(1, Math.min(52, Number(form.weeks) || 12)),
      block_type: form.block_type,
      programming_style: form.programming_style,
      org_id: orgId, created_by: userId,
    })
    setSaving(false)
    if (!result) { setError('Failed to save. Please try again.'); return }
    onSaved({ ...result, style: result.programming_style, athletes: template?.athletes ?? 0 })
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Template' : 'New Program Template'} size="md">
      <div className="p-6 space-y-4">
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Template Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value.slice(0, 200))} placeholder="e.g. 12-Week Meet Prep" maxLength={200}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration (weeks)</label>
            <input type="number" min={1} max={52} value={form.weeks} onChange={e => set('weeks', Math.max(1, Math.min(52, Number(e.target.value))))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Programming Style</label>
            <select value={form.programming_style} onChange={e => set('programming_style', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <option value="hybrid">Hybrid (% + RPE)</option>
              <option value="percentage">Percentage-Based</option>
              <option value="rpe">RPE-Based</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Block Type</label>
          <div className="grid grid-cols-4 gap-2">
            {BLOCK_TYPES.map(b => (
              <button key={b} onClick={() => set('block_type', b)}
                className={cn('py-2 text-xs font-medium rounded-lg capitalize transition-colors',
                  form.block_type === b ? 'bg-purple-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                )}>{b}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value.slice(0, 2000))} rows={3} maxLength={2000}
            placeholder="Optional — describe the goals and structure of this program"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {isEdit ? 'Save Changes' : 'Create Template'}</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WorkoutBuilder
// ─────────────────────────────────────────────────────────────────────────────

function WorkoutBuilder({ exercises, isDemo, orgId, userId }) {
  const [sessionName,   setSessionName]   = useState('')
  const [dayOfWeek,     setDayOfWeek]     = useState(0)
  const [blocks,        setBlocks]        = useState(BLOCK_SECTIONS.map(s => ({ ...s, exercises: [] })))
  const [expandedBlock, setExpandedBlock] = useState('main')
  const [addExModal,    setAddExModal]    = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)
  const [error,         setError]         = useState(null)

  useEffect(() => {
    if (isDemo) {
      setBlocks(prev => prev.map(b => b.type === 'main'
        ? { ...b, exercises: [{ id: 'demo-1', exercise_id: 'ex-1', name: 'Back Squat', sets: 5, reps: '3', intensity_value: 'RPE 8', intensity_type: 'rpe', rest_seconds: 180, notes: '' }] }
        : b))
    }
  }, [isDemo])

  const updateExField = (blockType, exId, field, value) =>
    setBlocks(prev => prev.map(b => b.type === blockType
      ? { ...b, exercises: b.exercises.map(e => e.id === exId ? { ...e, [field]: value } : e) }
      : b))

  const removeExFromBlock = (blockType, exId) =>
    setBlocks(prev => prev.map(b => b.type === blockType
      ? { ...b, exercises: b.exercises.filter(e => e.id !== exId) } : b))

  const addExToBlock = (blockType, ex) => {
    setBlocks(prev => prev.map(b => b.type === blockType
      ? { ...b, exercises: [...b.exercises, { id: 'new-' + Date.now(), exercise_id: ex.id, name: ex.name, sets: 3, reps: '8-10', intensity_type: '', intensity_value: '', rest_seconds: 90, notes: '' }] }
      : b))
    setAddExModal(null)
  }

  const handleSave = async () => {
    if (isDemo) { setSaved(true); setTimeout(() => setSaved(false), 2000); return }
    setSaving(true); setError(null)
    const { success } = await saveWorkoutBuilder(
      { name: sanitize(sessionName, 200) || 'Untitled Session', day_of_week: dayOfWeek, template_id: null, week_id: null },
      blocks.map(b => ({
        type: b.type,
        exercises: b.exercises.map(e => ({
          exercise_id: e.exercise_id,
          sets: Number(e.sets) || null,
          reps: sanitize(e.reps, 50) || null,
          intensity_type: sanitize(e.intensity_type, 50) || null,
          intensity_value: sanitize(e.intensity_value, 100) || null,
          rest_seconds: Number(e.rest_seconds) || null,
          notes: sanitize(e.notes, 1000) || null,
        })),
      }))
    )
    setSaving(false)
    if (success) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    else setError('Failed to save. Please try again.')
  }

  const totalExercises = blocks.reduce((n, b) => n + b.exercises.length, 0)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workout Builder</CardTitle>
          <CardSubtitle>Build a single day session. Saved workouts are linked to your org.</CardSubtitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Session Name</label>
            <input value={sessionName} onChange={e => setSessionName(e.target.value.slice(0, 200))} placeholder="e.g. Day 1 – Heavy Squat" maxLength={200}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Day of Week</label>
            <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {DAYS_OF_WEEK.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {blocks.map(block => (
        <Card key={block.type} className="p-0 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/20 transition-colors"
            onClick={() => setExpandedBlock(expandedBlock === block.type ? null : block.type)}>
            <div className="flex items-center gap-3">
              <span className={cn('w-3 h-3 rounded-full flex-shrink-0', blockDotColor(block.type))} />
              <span className="text-sm font-semibold text-zinc-200">{block.label}</span>
              <span className="text-xs text-zinc-500">({block.exercises.length} exercises)</span>
            </div>
            {expandedBlock === block.type ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {expandedBlock === block.type && (
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {block.exercises.map(ex => (
                <div key={ex.id} className="flex items-center gap-3 p-3 bg-zinc-700/20 rounded-xl">
                  <GripVertical className="w-4 h-4 text-zinc-500 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="col-span-2 md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 truncate">{ex.name}</div>
                    <input type="number" min={1} max={100} value={ex.sets}
                      onChange={e => updateExField(block.type, ex.id, 'sets', e.target.value)}
                      placeholder="Sets"
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                    <input type="text" value={ex.reps} maxLength={50}
                      onChange={e => updateExField(block.type, ex.id, 'reps', e.target.value.slice(0, 50))}
                      placeholder="Reps"
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                    <input type="text" value={ex.intensity_value} maxLength={100}
                      onChange={e => updateExField(block.type, ex.id, 'intensity_value', e.target.value.slice(0, 100))}
                      placeholder="% / RPE"
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                  </div>
                  <button onClick={() => removeExFromBlock(block.type, ex.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button onClick={() => setAddExModal(block.type)}
                className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl transition-colors flex items-center justify-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Exercise
              </button>
            </div>
          )}
        </Card>
      ))}

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

      <Button className="w-full" disabled={saving || totalExercises === 0} onClick={handleSave}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
         : saved ? <><Check className="w-4 h-4 text-green-400" /> Saved!</>
         : <><Save className="w-4 h-4" /> Save Workout</>}
      </Button>

      <Modal open={!!addExModal} onClose={() => setAddExModal(null)} title="Add Exercise" size="sm">
        <ExercisePickerList exercises={exercises} onPick={ex => addExToBlock(addExModal, ex)} />
      </Modal>
    </div>
  )
}

function ExercisePickerList({ exercises, onPick }) {
  const [search, setSearch] = useState('')
  const filtered = exercises.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-3 border-b border-zinc-800">
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
      </div>
      <div className="space-y-1 p-3 max-h-72 overflow-y-auto">
        {filtered.length === 0 && <p className="text-xs text-zinc-500 text-center py-6">No exercises found.</p>}
        {filtered.map(ex => (
          <button key={ex.id} onClick={() => onPick(ex)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700 rounded-lg transition-colors text-left">
            <div>
              <p className="text-sm font-medium text-zinc-200">{ex.name}</p>
              <p className="text-xs text-zinc-500 capitalize">{ex.category}</p>
            </div>
            {ex.is_competition_lift && <Badge color="purple">Comp</Badge>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExerciseLibrary
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseLibrary({ exercises, isDemo, orgId, userId, onAdd, onUpdate, onRemove }) {
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('all')
  const [formOpen,     setFormOpen]     = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  const filtered = exercises.filter(e => {
    const matchCat    = catFilter === 'all' || e.category === catFilter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleDelete = async (ex) => {
    if (isDemo) { onRemove(ex.id); setDeleteTarget(null); return }
    setDeleting(true)
    const ok = await deleteExercise(ex.id)
    setDeleting(false)
    if (ok) { onRemove(ex.id); setDeleteTarget(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises…"
            className="w-full pl-9 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Exercise
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
              catFilter === c ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            )}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-10 text-center text-zinc-500 text-sm">
          {search || catFilter !== 'all' ? 'No exercises match your filters.' : 'No exercises yet. Add one to get started.'}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2">
        {filtered.map(ex => (
          <div key={ex.id} className="flex items-center justify-between p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors">
            <div>
              <p className="text-sm font-semibold text-zinc-200">{ex.name}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">{ex.category}</p>
            </div>
            <div className="flex items-center gap-2">
              {ex.is_competition_lift && <Badge color="purple">Competition</Badge>}
              <button onClick={() => setEditTarget(ex)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
              <button onClick={() => setDeleteTarget(ex)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <ExerciseFormModal
        open={formOpen || !!editTarget} exercise={editTarget}
        orgId={orgId} userId={userId} isDemo={isDemo}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSaved={ex => { editTarget ? onUpdate(ex.id, ex) : onAdd(ex); setFormOpen(false); setEditTarget(null) }}
      />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Exercise?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">Delete <span className="font-semibold text-zinc-100">"{deleteTarget?.name}"</span>? Workout history is not affected.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleting} onClick={() => handleDelete(deleteTarget)}>
              {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ExerciseFormModal({ open, onClose, exercise, orgId, userId, isDemo, onSaved }) {
  const isEdit = !!exercise
  const blank  = { name: '', category: 'accessory', description: '', is_competition_lift: false, is_global: false }
  const [form,   setFormState] = useState(blank)
  const [saving, setSaving]    = useState(false)
  const [error,  setError]     = useState(null)

  useEffect(() => {
    setFormState(exercise
      ? { name: exercise.name ?? '', category: exercise.category ?? 'accessory', description: exercise.description ?? '', is_competition_lift: exercise.is_competition_lift ?? false, is_global: exercise.is_global ?? false }
      : blank)
    setError(null)
  }, [exercise, open])

  const set = (k, v) => setFormState(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const trimmedName = form.name.trim()
    if (!trimmedName) { setError('Exercise name is required.'); return }
    setSaving(true); setError(null)

    if (isDemo) {
      onSaved({ id: exercise?.id ?? 'demo-ex-' + Date.now(), ...form, name: trimmedName })
      setSaving(false); return
    }

    const result = await saveExercise({
      id: isEdit ? exercise.id : undefined,
      name: sanitize(trimmedName, 200),
      category: form.category,
      description: sanitize(form.description, 2000) || null,
      is_competition_lift: form.is_competition_lift,
      is_global: form.is_global,
      created_by: isEdit ? exercise.created_by : userId,
      org_id: form.is_global ? null : orgId,
    })
    setSaving(false)
    if (!result) { setError('Failed to save. Please try again.'); return }
    onSaved(result)
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Exercise' : 'Add Exercise'} size="sm">
      <div className="p-6 space-y-4">
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Exercise Name <span className="text-red-400">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value.slice(0, 200))} placeholder="e.g. Paused Squat" maxLength={200}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
            {CATEGORIES.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value.slice(0, 2000))} rows={2} maxLength={2000}
            placeholder="Optional coaching notes or technique cues"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_competition_lift} onChange={e => set('is_competition_lift', e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500" />
            <span className="text-xs text-zinc-300">Competition lift</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_global} onChange={e => set('is_global', e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500" />
            <span className="text-xs text-zinc-300">Available to all orgs</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Save className="w-3.5 h-3.5" /> {isEdit ? 'Save Changes' : 'Add Exercise'}</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function blockDotColor(type) {
  const map = { warmup: 'bg-yellow-400', main: 'bg-purple-400', accessory: 'bg-blue-400', conditioning: 'bg-orange-400', mobility: 'bg-green-400', gpp: 'bg-teal-400' }
  return map[type] || 'bg-zinc-400'
}
