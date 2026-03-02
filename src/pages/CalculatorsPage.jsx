import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Calculator, TrendingUp, Target, Layers, ChevronDown } from 'lucide-react'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn, calcE1RM, calcE1RMBrzycki, calcE1RMLombardi, calcDotsScore, calcWilks, calcGlossbrenner, calcAttemptSuggestions, calcTonnage, convertWeight } from '../lib/utils'
import { useSettingsStore } from '../lib/store'
import { MOCK_EXERCISE_HISTORY, MOCK_ATHLETES } from '../lib/mockData'

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'e1rm',     label: 'e1RM',            icon: TrendingUp },
  { id: 'scores',   label: 'Score Calculator', icon: Calculator },
  { id: 'attempts', label: 'Attempt Selection', icon: Target },
  { id: 'tonnage',  label: 'Volume & Tonnage',  icon: Layers },
]

// ─── Shared Number Input ─────────────────────────────────────────────────────
function NumInput({ label, value, onChange, min = 0, step = 1, unit = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">{label}{unit && <span className="ml-1 text-zinc-500">({unit})</span>}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
      />
    </div>
  )
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function ResultBox({ label, value, color = 'text-purple-400', sub }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl px-4 py-3 text-center border border-zinc-700/50">
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — e1RM Calculator
// ═══════════════════════════════════════════════════════════════════════════════
function E1RMTab() {
  const { weightUnit } = useSettingsStore()
  const [weightInput, setWeightInput] = useState(100)
  const [reps, setReps] = useState(3)
  const [formula, setFormula] = useState('epley')
  const [selectedAthlete, setSelectedAthlete] = useState('Jordan Blake')
  const [selectedExercise, setSelectedExercise] = useState('Back Squat')

  const athletes = Object.keys(MOCK_EXERCISE_HISTORY)
  const exercises = Object.keys(MOCK_EXERCISE_HISTORY[selectedAthlete] || {})

  // Convert input to kg for calculation
  const weightKg = weightUnit === 'lbs' ? weightInput / 2.20462 : weightInput

  const e1rmKg = formula === 'epley'
    ? calcE1RM(weightKg, reps)
    : formula === 'brzycki'
    ? calcE1RMBrzycki(weightKg, reps)
    : calcE1RMLombardi(weightKg, reps)

  const displayE1RM = weightUnit === 'lbs' ? Math.round(e1rmKg * 2.20462) : e1rmKg

  // Trend data
  const historyData = (MOCK_EXERCISE_HISTORY[selectedAthlete]?.[selectedExercise] || []).map((d) => ({
    ...d,
    display_e1rm: weightUnit === 'lbs' ? Math.round(d.e1rm_kg * 2.20462) : d.e1rm_kg,
    display_weight: weightUnit === 'lbs' ? Math.round(d.weight_kg * 2.20462) : d.weight_kg,
    label: d.date.slice(5), // MM-DD
  }))

  const latestE1RM = historyData.length > 0 ? historyData[historyData.length - 1].display_e1rm : null
  const firstE1RM = historyData.length > 0 ? historyData[0].display_e1rm : null
  const gain = latestE1RM && firstE1RM ? latestE1RM - firstE1RM : null

  return (
    <div className="space-y-6">
      {/* Calculator */}
      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">One-Rep Max Estimator</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumInput
              label="Weight Lifted"
              value={weightInput}
              onChange={setWeightInput}
              min={0}
              step={weightUnit === 'lbs' ? 5 : 2.5}
              unit={weightUnit}
            />
            <NumInput label="Reps Performed" value={reps} onChange={setReps} min={1} step={1} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-400">Formula</label>
              <select
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                <option value="epley">Epley</option>
                <option value="brzycki">Brzycki</option>
                <option value="lombardi">Lombardi</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            <ResultBox label={`Est. e1RM (${weightUnit})`} value={displayE1RM} color="text-purple-400" />
            <ResultBox label={`90% (${weightUnit})`} value={Math.round(displayE1RM * 0.9)} color="text-blue-400" />
            <ResultBox label={`85% (${weightUnit})`} value={Math.round(displayE1RM * 0.85)} color="text-teal-400" />
            <ResultBox label={`80% (${weightUnit})`} value={Math.round(displayE1RM * 0.8)} color="text-green-400" />
          </div>
        </CardBody>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">e1RM Trend</h3>
            <div className="flex gap-2 flex-wrap">
              <select
                value={selectedAthlete}
                onChange={(e) => {
                  setSelectedAthlete(e.target.value)
                  const exs = Object.keys(MOCK_EXERCISE_HISTORY[e.target.value] || {})
                  setSelectedExercise(exs[0] || '')
                }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                {athletes.map((a) => <option key={a}>{a}</option>)}
              </select>
              <select
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
              >
                {exercises.map((ex) => <option key={ex}>{ex}</option>)}
              </select>
            </div>
          </div>

          {gain !== null && (
            <div className="flex gap-3 flex-wrap">
              <Badge variant={gain >= 0 ? 'success' : 'danger'}>
                {gain >= 0 ? '+' : ''}{gain} {weightUnit} since {historyData[0]?.date}
              </Badge>
              <Badge variant="default">Latest e1RM: {latestE1RM} {weightUnit}</Badge>
            </div>
          )}

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#a1a1aa' }}
                  formatter={(val) => [`${val} ${weightUnit}`, 'e1RM']}
                />
                <Line type="monotone" dataKey="display_e1rm" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Raw history table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-right pb-2 font-medium">Weight ({weightUnit})</th>
                  <th className="text-right pb-2 font-medium">Reps</th>
                  <th className="text-right pb-2 font-medium">RPE</th>
                  <th className="text-right pb-2 font-medium">e1RM ({weightUnit})</th>
                </tr>
              </thead>
              <tbody>
                {[...historyData].reverse().map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-1.5 text-zinc-300">{row.date}</td>
                    <td className="py-1.5 text-right text-zinc-200">{row.display_weight}</td>
                    <td className="py-1.5 text-right text-zinc-200">{row.reps}</td>
                    <td className="py-1.5 text-right text-zinc-400">@{row.rpe}</td>
                    <td className="py-1.5 text-right font-medium text-purple-400">{row.display_e1rm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Score Calculator (DOTS / Wilks / Glossbrenner)
// ═══════════════════════════════════════════════════════════════════════════════
function ScoresTab() {
  const { weightUnit } = useSettingsStore()
  const [squat, setSquat] = useState(weightUnit === 'lbs' ? 450 : 205)
  const [bench, setBench] = useState(weightUnit === 'lbs' ? 300 : 135)
  const [deadlift, setDeadlift] = useState(weightUnit === 'lbs' ? 550 : 250)
  const [bw, setBw] = useState(weightUnit === 'lbs' ? 205 : 93)
  const [isMale, setIsMale] = useState(true)

  const toKgVal = (v) => weightUnit === 'lbs' ? v / 2.20462 : v

  const totalKg = toKgVal(squat) + toKgVal(bench) + toKgVal(deadlift)
  const bwKg = toKgVal(bw)
  const totalDisplay = weightUnit === 'lbs' ? Math.round(totalKg * 2.20462) : Math.round(totalKg)

  const dots = calcDotsScore(totalKg, bwKg, isMale)
  const wilks = calcWilks(totalKg, bwKg, isMale)
  const glossbrenner = calcGlossbrenner(totalKg, bwKg, isMale)

  const dotsLevel = dots >= 450 ? 'Elite' : dots >= 380 ? 'Advanced' : dots >= 300 ? 'Intermediate' : 'Novice'
  const dotsColor = dots >= 450 ? 'text-yellow-400' : dots >= 380 ? 'text-purple-400' : dots >= 300 ? 'text-blue-400' : 'text-zinc-400'

  const unit = weightUnit

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Lifter Info</h3>
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
              {['Male', 'Female'].map((s) => (
                <button
                  key={s}
                  onClick={() => setIsMale(s === 'Male')}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    (s === 'Male') === isMale ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label="Squat" value={squat} onChange={setSquat} step={weightUnit === 'lbs' ? 5 : 2.5} unit={unit} />
            <NumInput label="Bench" value={bench} onChange={setBench} step={weightUnit === 'lbs' ? 5 : 2.5} unit={unit} />
            <NumInput label="Deadlift" value={deadlift} onChange={setDeadlift} step={weightUnit === 'lbs' ? 5 : 2.5} unit={unit} />
            <NumInput label="Bodyweight" value={bw} onChange={setBw} step={weightUnit === 'lbs' ? 1 : 0.5} unit={unit} />
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
            <span>Total:</span>
            <span className="text-zinc-100 font-semibold">{totalDisplay} {unit}</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-purple-500/30">
          <CardBody className="text-center space-y-2">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">DOTS Score</div>
            <div className={cn('text-4xl font-bold', dotsColor)}>{dots}</div>
            <Badge variant={dots >= 380 ? 'success' : 'default'}>{dotsLevel}</Badge>
            <p className="text-xs text-zinc-500 pt-1">IPF official formula — best cross-weight class comparison</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center space-y-2">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Wilks2020 Score</div>
            <div className="text-4xl font-bold text-blue-400">{wilks}</div>
            <div className="text-xs text-zinc-500">Updated 2020 Wilks formula</div>
            <p className="text-xs text-zinc-500 pt-1">Widely recognized cross-federation standard</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center space-y-2">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Glossbrenner</div>
            <div className="text-4xl font-bold text-teal-400">{glossbrenner}</div>
            <div className="text-xs text-zinc-500">DOTS + Wilks2020 average</div>
            <p className="text-xs text-zinc-500 pt-1">Used in some open fed rankings</p>
          </CardBody>
        </Card>
      </div>

      {/* Score breakdown */}
      <Card>
        <CardBody>
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">Score Comparison</h3>
          <div className="space-y-3">
            {[
              { label: 'DOTS', val: dots, max: 600, color: 'bg-purple-500' },
              { label: 'Wilks2020', val: wilks, max: 600, color: 'bg-blue-500' },
              { label: 'Glossbrenner', val: glossbrenner, max: 600, color: 'bg-teal-500' },
            ].map(({ label, val, max, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-zinc-200 font-medium">{val}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', color)}
                    style={{ width: `${Math.min(100, (val / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-zinc-800/40 rounded-lg text-xs text-zinc-400 space-y-1">
            <p><strong className="text-zinc-300">Elite (DOTS 450+):</strong> World-class / podium-level performance</p>
            <p><strong className="text-zinc-300">Advanced (380–449):</strong> National qualifier level</p>
            <p><strong className="text-zinc-300">Intermediate (300–379):</strong> Competitive locally / regionally</p>
            <p><strong className="text-zinc-300">Novice (&lt;300):</strong> Developing competitor</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Attempt Selection
// ═══════════════════════════════════════════════════════════════════════════════
function AttemptsTab() {
  const { weightUnit } = useSettingsStore()
  const [squatE1RM, setSquatE1RM] = useState(weightUnit === 'lbs' ? 485 : 220)
  const [benchE1RM, setBenchE1RM] = useState(weightUnit === 'lbs' ? 330 : 150)
  const [deadliftE1RM, setDeadliftE1RM] = useState(weightUnit === 'lbs' ? 600 : 272)
  const [strategy, setStrategy] = useState('conservative')

  const toKgVal = (v) => weightUnit === 'lbs' ? v / 2.20462 : v
  const fromKg = (v) => weightUnit === 'lbs' ? Math.round(v * 2.20462 / 2.5) * 2.5 : v

  const lifts = [
    { name: 'Squat', e1rm: squatE1RM, setter: setSquatE1RM, color: 'text-purple-400' },
    { name: 'Bench', e1rm: benchE1RM, setter: setBenchE1RM, color: 'text-blue-400' },
    { name: 'Deadlift', e1rm: deadliftE1RM, setter: setDeadliftE1RM, color: 'text-orange-400' },
  ]

  const unit = weightUnit

  return (
    <div className="space-y-6">
      {/* Strategy selector */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Meet Day Strategy</h3>
            <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
              {['conservative', 'aggressive'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors',
                    strategy === s ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {lifts.map(({ name, e1rm, setter }) => (
              <NumInput
                key={name}
                label={`${name} Training e1RM`}
                value={e1rm}
                onChange={setter}
                step={weightUnit === 'lbs' ? 5 : 2.5}
                unit={unit}
              />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Attempt tables */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {lifts.map(({ name, e1rm, color }) => {
          const suggestions = calcAttemptSuggestions(toKgVal(e1rm))
          if (!suggestions) return null
          const { opener, second, thirdConservative, thirdAggressive } = suggestions
          const third = strategy === 'conservative' ? thirdConservative : thirdAggressive

          const rows = [
            { attempt: '1st Opener', kg: opener, pct: 90, note: 'Guaranteed make' },
            { attempt: '2nd', kg: second, pct: 96, note: 'Confidence builder' },
            { attempt: '3rd', kg: third, pct: strategy === 'aggressive' ? 103 : 100, note: strategy === 'aggressive' ? 'PR attempt' : 'Training max' },
          ]

          return (
            <Card key={name}>
              <CardBody className="space-y-3">
                <h4 className={cn('text-sm font-bold', color)}>{name}</h4>
                <div className="text-xs text-zinc-500">Training e1RM: {e1rm} {unit}</div>
                <div className="space-y-2">
                  {rows.map(({ attempt, kg, pct, note }) => (
                    <div key={attempt} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
                      <div>
                        <div className="text-xs font-semibold text-zinc-300">{attempt}</div>
                        <div className="text-xs text-zinc-500">{note}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-zinc-100">{fromKg(kg)} {unit}</div>
                        <div className="text-xs text-zinc-500">{pct}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Projected total */}
      <Card>
        <CardBody className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Projected Total</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {lifts.map(({ name, e1rm, color }) => {
              const s = calcAttemptSuggestions(toKgVal(e1rm))
              const third = strategy === 'conservative' ? s?.thirdConservative : s?.thirdAggressive
              return (
                <ResultBox key={name} label={name} value={`${fromKg(third || 0)} ${unit}`} color={color} />
              )
            })}
            <ResultBox
              label="Est. Total"
              value={`${lifts.reduce((sum, { e1rm }) => {
                const s = calcAttemptSuggestions(toKgVal(e1rm))
                const third = strategy === 'conservative' ? s?.thirdConservative : s?.thirdAggressive
                return sum + fromKg(third || 0)
              }, 0)} ${unit}`}
              color="text-yellow-400"
            />
          </div>
          <div className="p-3 bg-zinc-800/40 rounded-lg text-xs text-zinc-400 space-y-1.5">
            <p className="font-medium text-zinc-300">Meet Day Tips:</p>
            <p>• <strong className="text-zinc-300">Opener</strong>: Should be a "gym warm-up" weight — easy triple territory. Non-negotiable make.</p>
            <p>• <strong className="text-zinc-300">2nd attempt</strong>: Build confidence. This is your floor total contribution.</p>
            <p>• <strong className="text-zinc-300">3rd attempt</strong>: Only go for a PR if 2nd felt fast. Don't chase numbers you haven't hit in training.</p>
            <p>• Adjust for meet-day equipment, warm-up quality, and travel fatigue (±2.5–5%).</p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Volume & Tonnage
// ═══════════════════════════════════════════════════════════════════════════════
function TonnageTab() {
  const { weightUnit } = useSettingsStore()

  // Manual entry rows
  const [rows, setRows] = useState([
    { exercise: 'Back Squat', sets: 4, reps: 3, weight: weightUnit === 'lbs' ? 440 : 200 },
    { exercise: 'Bench Press', sets: 4, reps: 3, weight: weightUnit === 'lbs' ? 286 : 130 },
    { exercise: 'Conventional Deadlift', sets: 3, reps: 2, weight: weightUnit === 'lbs' ? 550 : 250 },
    { exercise: 'Romanian Deadlift', sets: 3, reps: 5, weight: weightUnit === 'lbs' ? 330 : 150 },
    { exercise: 'Close Grip Bench', sets: 3, reps: 5, weight: weightUnit === 'lbs' ? 220 : 100 },
  ])

  const updateRow = (i, key, val) => {
    const next = [...rows]
    next[i] = { ...next[i], [key]: key === 'exercise' ? val : Number(val) }
    setRows(next)
  }

  const addRow = () => setRows([...rows, { exercise: '', sets: 3, reps: 5, weight: 0 }])
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i))

  const toKgRow = (row) => {
    const wKg = weightUnit === 'lbs' ? row.weight / 2.20462 : row.weight
    return wKg * row.sets * row.reps
  }

  const totalTonnageKg = rows.reduce((sum, r) => sum + toKgRow(r), 0)
  const totalTonnage = weightUnit === 'lbs' ? Math.round(totalTonnageKg * 2.20462) : Math.round(totalTonnageKg)
  const totalSets = rows.reduce((sum, r) => sum + r.sets, 0)
  const totalReps = rows.reduce((sum, r) => sum + r.sets * r.reps, 0)
  const avgIntensity = rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + r.weight, 0) / rows.length) : 0

  // Trend data from mock history for selected athlete
  const [selectedAthlete, setSelectedAthlete] = useState('Jordan Blake')
  const athletes = Object.keys(MOCK_EXERCISE_HISTORY)

  // Build weekly tonnage from history
  const exerciseHistories = Object.entries(MOCK_EXERCISE_HISTORY[selectedAthlete] || {})
  const weeklyMap = {}
  exerciseHistories.forEach(([, entries]) => {
    entries.forEach(({ date, weight_kg, reps }) => {
      const week = date.slice(0, 7) // YYYY-MM
      weeklyMap[week] = (weeklyMap[week] || 0) + weight_kg * reps
    })
  })
  const weeklyTonnageData = Object.entries(weeklyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, kg]) => ({
      month,
      tonnage: weightUnit === 'lbs' ? Math.round(kg * 2.20462) : Math.round(kg),
    }))

  const unit = weightUnit

  return (
    <div className="space-y-6">
      {/* Manual session entry */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Session Volume Planner</h3>
            <button
              onClick={addRow}
              className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/40 rounded-lg px-3 py-1.5 hover:border-purple-400/60 transition-colors"
            >
              + Add Exercise
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left pb-2 font-medium">Exercise</th>
                  <th className="text-center pb-2 font-medium">Sets</th>
                  <th className="text-center pb-2 font-medium">Reps</th>
                  <th className="text-center pb-2 font-medium">Weight ({unit})</th>
                  <th className="text-right pb-2 font-medium">Tonnage ({unit})</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const rowTonnage = weightUnit === 'lbs'
                    ? Math.round(toKgRow(row) * 2.20462)
                    : Math.round(toKgRow(row))
                  return (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="py-1.5 pr-2">
                        <input
                          value={row.exercise}
                          onChange={(e) => updateRow(i, 'exercise', e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 w-full focus:outline-none focus:border-purple-500"
                        />
                      </td>
                      {['sets', 'reps', 'weight'].map((key) => (
                        <td key={key} className="py-1.5 px-1 text-center">
                          <input
                            type="number"
                            value={row[key]}
                            min={0}
                            step={key === 'weight' ? (weightUnit === 'lbs' ? 5 : 2.5) : 1}
                            onChange={(e) => updateRow(i, key, e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 w-16 text-center focus:outline-none focus:border-purple-500"
                          />
                        </td>
                      ))}
                      <td className="py-1.5 text-right font-medium text-purple-400">{rowTonnage.toLocaleString()}</td>
                      <td className="py-1.5 pl-2">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-zinc-600 hover:text-red-400 text-lg leading-none"
                          title="Remove"
                        >×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <ResultBox label={`Total Tonnage (${unit})`} value={totalTonnage.toLocaleString()} color="text-purple-400" />
            <ResultBox label="Total Sets" value={totalSets} color="text-blue-400" />
            <ResultBox label="Total Reps" value={totalReps} color="text-teal-400" />
            <ResultBox label={`Avg Intensity (${unit})`} value={avgIntensity} color="text-orange-400" />
          </div>
        </CardBody>
      </Card>

      {/* Historical tonnage trend */}
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Monthly Tonnage Trend</h3>
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
            >
              {athletes.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTonnageData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                  formatter={(val) => [`${val.toLocaleString()} ${unit}`, 'Tonnage']}
                />
                <Line type="monotone" dataKey="tonnage" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3, fill: '#14b8a6' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-zinc-500">Tonnage calculated from top-set history data. Reflects monthly volume accumulation across all tracked lifts.</p>
        </CardBody>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState('e1rm')
  const { weightUnit, toggleWeightUnit } = useSettingsStore()

  const CONTENT = {
    e1rm: <E1RMTab />,
    scores: <ScoresTab />,
    attempts: <AttemptsTab />,
    tonnage: <TonnageTab />,
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Calculators</h1>
          <p className="text-sm text-zinc-400">Sport-science tools for training analysis & meet day prep</p>
        </div>
        <button
          onClick={toggleWeightUnit}
          className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          {weightUnit === 'kg' ? 'kg' : 'lbs'}
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === id
                ? 'bg-purple-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {CONTENT[activeTab]}
    </div>
  )
}
