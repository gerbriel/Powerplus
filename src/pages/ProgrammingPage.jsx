import { useState } from 'react'
import { Plus, Dumbbell, ChevronRight, Copy, Edit, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import { MOCK_EXERCISES } from '../lib/mockData'
import { cn } from '../lib/utils'
import { useAuthStore } from '../lib/store'

const TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'builder', label: 'Workout Builder' },
  { id: 'exercises', label: 'Exercise Library' },
]

const SAMPLE_TEMPLATES = [
  { id: 't1', name: '12-Week Meet Prep – Squat Focus', weeks: 12, style: 'hybrid', block_type: 'accumulation', athletes: 3 },
  { id: 't2', name: '8-Week Bench Specialization', weeks: 8, style: 'rpe', block_type: 'intensification', athletes: 1 },
  { id: 't3', name: 'Off-Season Volume Block', weeks: 10, style: 'percentage', block_type: 'accumulation', athletes: 4 },
  { id: 't4', name: '4-Week Peaking Program', weeks: 4, style: 'hybrid', block_type: 'peak', athletes: 6 },
]

export function ProgrammingPage() {
  const [tab, setTab] = useState('templates')
  const [newTemplateOpen, setNewTemplateOpen] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Programming</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Templates, builders, and exercise library</p>
        </div>
        <Button size="sm" onClick={() => setNewTemplateOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'templates' && <TemplatesList onNew={() => setNewTemplateOpen(true)} />}
      {tab === 'builder' && <WorkoutBuilder />}
      {tab === 'exercises' && <ExerciseLibrary />}

      <Modal open={newTemplateOpen} onClose={() => setNewTemplateOpen(false)} title="New Program Template" size="md">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Template Name</label>
            <input type="text" placeholder="e.g. 12-Week Meet Prep" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Duration (weeks)</label>
              <input type="number" defaultValue={12} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Programming Style</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
                <option value="hybrid">Hybrid (% + RPE)</option>
                <option value="percentage">Percentage-Based</option>
                <option value="rpe">RPE-Based</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Block Type</label>
            <div className="grid grid-cols-4 gap-2">
              {['Accumulation', 'Intensification', 'Peak', 'Deload'].map((b) => (
                <button key={b} className="py-2 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-colors">{b}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
          </div>
          <Button className="w-full" onClick={() => setNewTemplateOpen(false)}>
            <Plus className="w-4 h-4" /> Create Template
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function TemplatesList({ onNew }) {
  return (
    <div className="space-y-3">
      {SAMPLE_TEMPLATES.map((t) => (
        <Card key={t.id} className="hover:border-zinc-600 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">{t.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <Badge color="default">{t.weeks}wk</Badge>
                    <Badge color="purple">{t.style}</Badge>
                    <Badge color="blue">{t.block_type}</Badge>
                    <span className="text-xs text-zinc-500">{t.athletes} athletes assigned</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                  <button className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
      <button onClick={onNew} className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl text-sm text-zinc-500 hover:text-zinc-400 transition-colors flex items-center justify-center gap-2">
        <Plus className="w-4 h-4" /> Create New Template
      </button>
    </div>
  )
}

function WorkoutBuilder() {
  const { isDemo } = useAuthStore()
  const exercises = isDemo ? MOCK_EXERCISES : []
  const [blocks, setBlocks] = useState([
    { type: 'warmup', label: 'Warm-Up', exercises: [] },
    { type: 'main', label: 'Main Lift', exercises: [
      { id: 1, name: 'Back Squat', sets: 5, reps: '3', intensity: 'RPE 8', rest: 180, notes: '' }
    ]},
    { type: 'accessory', label: 'Accessory Work', exercises: [] },
  ])
  const [expandedBlock, setExpandedBlock] = useState('main')
  const [addExModal, setAddExModal] = useState(null)

  const addExercise = (blockType, exercise) => {
    setBlocks(prev => prev.map(b => b.type === blockType
      ? { ...b, exercises: [...b.exercises, { id: Date.now(), name: exercise.name, sets: 3, reps: '8-10', intensity: '', rest: 90, notes: '' }] }
      : b
    ))
    setAddExModal(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workout Builder</CardTitle>
          <CardSubtitle>Build a single day workout. Add to a template week when done.</CardSubtitle>
        </CardHeader>
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Session Name</label>
              <input type="text" placeholder="e.g. Day 1 – Heavy Squat" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Day of Week</label>
              <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {blocks.map((block) => (
        <Card key={block.type} className="p-0 overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-700/20 transition-colors"
            onClick={() => setExpandedBlock(expandedBlock === block.type ? null : block.type)}
          >
            <div className="flex items-center gap-3">
              <span className={cn('w-3 h-3 rounded-full flex-shrink-0', blockDotColor(block.type))} />
              <span className="text-sm font-semibold text-zinc-200">{block.label}</span>
              <span className="text-xs text-zinc-500">({block.exercises.length} exercises)</span>
            </div>
            {expandedBlock === block.type ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>

          {expandedBlock === block.type && (
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {block.exercises.map((ex, i) => (
                <div key={ex.id} className="flex items-center gap-3 p-3 bg-zinc-700/20 rounded-xl">
                  <GripVertical className="w-4 h-4 text-zinc-500 flex-shrink-0 cursor-grab" />
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <input
                      value={ex.name}
                      className="col-span-2 md:col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                      readOnly
                    />
                    {[
                      { key: 'sets', label: 'Sets', type: 'number' },
                      { key: 'reps', label: 'Reps', type: 'text' },
                      { key: 'intensity', label: '% / RPE', type: 'text' },
                    ].map((f) => (
                      <input key={f.key} defaultValue={ex[f.key]} placeholder={f.label} type={f.type}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50" />
                    ))}
                  </div>
                  <button className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAddExModal(block.type)}
                className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-300 border border-dashed border-zinc-700 hover:border-zinc-600 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Exercise
              </button>
            </div>
          )}
        </Card>
      ))}

      <Button className="w-full">Save Workout to Template</Button>

      {/* Add Exercise Modal */}
      <Modal open={!!addExModal} onClose={() => setAddExModal(null)} title="Add Exercise" size="sm">
        <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => addExercise(addExModal, ex)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-700 rounded-lg transition-colors text-left"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">{ex.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{ex.category}</p>
              </div>
              {ex.is_competition_lift && <Badge color="purple">Comp</Badge>}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  )
}

function ExerciseLibrary() {
  const { isDemo } = useAuthStore()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const categories = ['all', 'squat', 'bench', 'deadlift', 'accessory']

  const filtered = (isDemo ? MOCK_EXERCISES : []).filter(e => {
    const matchCat = catFilter === 'all' || e.category === catFilter
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
        />
        <Button size="sm">
          <Plus className="w-3.5 h-3.5" /> Add Exercise
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCatFilter(c)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors',
              catFilter === c ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {filtered.map((ex) => (
          <div key={ex.id} className="flex items-center justify-between p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl hover:border-zinc-600 transition-colors">
            <div>
              <p className="text-sm font-semibold text-zinc-200">{ex.name}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">{ex.category}</p>
            </div>
            <div className="flex items-center gap-2">
              {ex.is_competition_lift && <Badge color="purple">Competition</Badge>}
              <button className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function blockDotColor(type) {
  const map = { warmup: 'bg-yellow-400', main: 'bg-purple-400', accessory: 'bg-blue-400', conditioning: 'bg-orange-400', mobility: 'bg-green-400', gpp: 'bg-teal-400' }
  return map[type] || 'bg-zinc-400'
}
