import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { Calculator, TrendingUp, Target, Layers, ChevronDown, Scale, Flame, Droplets, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { cn, calcE1RM, calcE1RMBrzycki, calcE1RMLombardi, calcDotsScore, calcWilks, calcGlossbrenner, calcAttemptSuggestions, calcTonnage, convertWeight, lbsToKg, kgToLbs, calcBMR, calcTDEE, calcMacrosFromCalories, calcBulkMacros, calcWeightProjection, calcWeightGainProjection, IPF_WEIGHT_CLASSES_MALE, IPF_WEIGHT_CLASSES_FEMALE, weightClassLabel, getWeightClassInfo } from '../lib/utils'
import { useSettingsStore, useAuthStore } from '../lib/store'
import { MOCK_EXERCISE_HISTORY, MOCK_ATHLETES } from '../lib/mockData'

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { id: 'e1rm',       label: 'e1RM',            icon: TrendingUp },
  { id: 'scores',     label: 'Score Calculator', icon: Calculator },
  { id: 'attempts',   label: 'Attempt Selection', icon: Target },
  { id: 'tonnage',    label: 'Volume & Tonnage',  icon: Layers },
  { id: 'weightmgmt', label: 'Weight Management', icon: Scale },
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
  const { isDemo } = useAuthStore()
  const exerciseHistory = isDemo ? MOCK_EXERCISE_HISTORY : {}
  const [weightInput, setWeightInput] = useState(100)
  const [reps, setReps] = useState(3)
  const [formula, setFormula] = useState('epley')
  const [selectedAthlete, setSelectedAthlete] = useState('Jordan Blake')
  const [selectedExercise, setSelectedExercise] = useState('Back Squat')

  const athletes = Object.keys(exerciseHistory)
  const exercises = Object.keys(exerciseHistory[selectedAthlete] || {})

  // Convert input to kg for calculation
  const weightKg = weightUnit === 'lbs' ? weightInput / 2.20462 : weightInput

  const e1rmKg = formula === 'epley'
    ? calcE1RM(weightKg, reps)
    : formula === 'brzycki'
    ? calcE1RMBrzycki(weightKg, reps)
    : calcE1RMLombardi(weightKg, reps)

  const displayE1RM = weightUnit === 'lbs' ? Math.round(e1rmKg * 2.20462) : e1rmKg

  // Trend data
  const historyData = (exerciseHistory[selectedAthlete]?.[selectedExercise] || []).map((d) => ({
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
                  const exs = Object.keys(exerciseHistory[e.target.value] || {})
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
  const { isDemo } = useAuthStore()
  const exerciseHistory = isDemo ? MOCK_EXERCISE_HISTORY : {}

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
  const athletes = Object.keys(exerciseHistory)

  // Build weekly tonnage from history
  const exerciseHistories = Object.entries(exerciseHistory[selectedAthlete] || {})
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
// TAB 5 — Weight Management (Make Weight + General Weight Loss)
// ═══════════════════════════════════════════════════════════════════════════════

const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label: 'Sedentary',    sub: 'Desk job, little exercise' },
  { id: 'light',       label: 'Light',        sub: '1–3 days/week training' },
  { id: 'moderate',    label: 'Moderate',     sub: '3–5 days/week training' },
  { id: 'active',      label: 'Active',       sub: '6–7 days hard training' },
  { id: 'very_active', label: 'Very Active',  sub: '2x/day or physical job' },
]

function MacroBar({ label, grams, calories, color, pct }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-200 font-medium">{grams}g <span className="text-zinc-500">({calories} kcal)</span></span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function InfoRow({ label, value, color = 'text-zinc-100', sub }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-400">{label}</span>
      <div className="text-right">
        <span className={cn('text-sm font-semibold', color)}>{value}</span>
        {sub && <div className="text-xs text-zinc-500">{sub}</div>}
      </div>
    </div>
  )
}

function WeightMgmtTab() {
  const { weightUnit } = useSettingsStore()
  const isLbs = weightUnit === 'lbs'
  const toDisplay = (kg) => isLbs ? Math.round(kgToLbs(kg) * 10) / 10 : kg
  const toKgLocal = (v) => isLbs ? lbsToKg(v) : v
  const unit = isLbs ? 'lbs' : 'kg'

  // ── Mode toggle ──────────────────────────────────────────────────
  const [mode, setMode] = useState('makeweight') // 'makeweight' | 'loseweight' | 'bulkgain'

  // ── Shared inputs ────────────────────────────────────────────────
  const [isMale, setIsMale]   = useState(true)
  const [currentBW, setCurrentBW] = useState(isLbs ? 198 : 90)

  // ── Make Weight inputs ───────────────────────────────────────────
  const classes = isMale ? IPF_WEIGHT_CLASSES_MALE : IPF_WEIGHT_CLASSES_FEMALE
  const [targetClass, setTargetClass] = useState(isLbs ? 83 : 83) // kg
  const [meetWeeks, setMeetWeeks]     = useState(12)
  const [hasWaterCut, setHasWaterCut] = useState(true)

  // ── Lose Weight inputs ───────────────────────────────────────────
  const [age, setAge]           = useState(25)
  const [heightCm, setHeightCm] = useState(175)
  const [heightUnit, setHeightUnit] = useState('cm') // 'cm' | 'in'
  // display ↔ storage helpers
  const heightDisplay = heightUnit === 'in' ? Math.round(heightCm / 2.54 * 10) / 10 : heightCm
  const onHeightChange = (v) => setHeightCm(heightUnit === 'in' ? Math.round(v * 2.54) : v)
  const onHeightUnitToggle = (u) => {
    setHeightUnit(u)
    // value stays the same cm internally — display just recalculates
  }
  const [goalBW, setGoalBW]     = useState(isLbs ? 187 : 85)
  const [activity, setActivity] = useState('moderate')
  const [deficit, setDeficit]   = useState(500) // kcal/day

  // ── Bulk / Gain inputs ───────────────────────────────────────────
  const [bulkGoalBW, setBulkGoalBW]       = useState(isLbs ? 220 : 100)
  const [bulkActivity, setBulkActivity]   = useState('active')
  const [surplus, setSurplus]             = useState(300) // kcal/day above TDEE
  const [bulkType, setBulkType]           = useState('lean') // 'lean' | 'aggressive'

  // ── Make Weight calculations ─────────────────────────────────────
  const mwResults = useMemo(() => {
    const currentKg  = toKgLocal(currentBW)
    const targetKg   = targetClass
    const totalToLose = currentKg - targetKg
    if (totalToLose <= 0) return { status: 'already_in', totalToLose: 0 }

    const dietLoss  = hasWaterCut ? Math.max(0, totalToLose - 3) : totalToLose // reserve up to 3 kg for water cut
    const weeklyRate = meetWeeks > 0 ? dietLoss / meetWeeks : 0
    const dailyDeficit = Math.round(weeklyRate * 7700 / 7) // 7700 kcal ≈ 1 kg fat
    const isSafe = weeklyRate <= 1.0  // > 1 kg/week is aggressive for strength athletes
    const waterCutNeeded = hasWaterCut ? Math.min(3, totalToLose) : 0
    const waterCutPct = currentKg > 0 ? (waterCutNeeded / currentKg) * 100 : 0
    const waterCutFeasible = waterCutPct <= 5  // < 5% BW water cut is considered manageable

    const projection = []
    for (let w = 0; w <= meetWeeks; w++) {
      projection.push({ week: w, weight: Math.round((currentKg - weeklyRate * w) * 10) / 10 })
    }

    return {
      status: isSafe ? 'safe' : 'aggressive',
      currentKg, targetKg, totalToLose, dietLoss, weeklyRate: Math.round(weeklyRate * 100) / 100,
      dailyDeficit, waterCutNeeded: Math.round(waterCutNeeded * 10) / 10,
      waterCutFeasible, waterCutPct: Math.round(waterCutPct * 10) / 10,
      projection,
    }
  }, [currentBW, targetClass, meetWeeks, hasWaterCut, isMale, weightUnit])

  // ── Lose Weight calculations ─────────────────────────────────────
  const lwResults = useMemo(() => {
    const currentKg = toKgLocal(currentBW)
    const goalKg    = toKgLocal(goalBW)
    const bmr  = calcBMR(currentKg, heightCm, age, isMale)
    const tdee = calcTDEE(bmr, activity)
    const targetCals = Math.max(1200, tdee - deficit)
    const macros = calcMacrosFromCalories(targetCals, goalKg)
    const totalToLoseKg = Math.max(0, currentKg - goalKg)
    const weeklyLossKg = deficit * 7 / 7700
    const weeksNeeded = weeklyLossKg > 0 ? Math.ceil(totalToLoseKg / weeklyLossKg) : 0
    const projection = calcWeightProjection(currentKg, weeklyLossKg, weeksNeeded)
    const proteinCals = macros.protein * 4
    const carbCals    = macros.carbs * 4
    const fatCals     = macros.fat * 9
    return {
      bmr, tdee, targetCals, macros, totalToLoseKg: Math.round(totalToLoseKg * 10) / 10,
      weeklyLossKg: Math.round(weeklyLossKg * 100) / 100, weeksNeeded, projection,
      proteinCals, carbCals, fatCals, isSafe: deficit <= 750,
    }
  }, [currentBW, goalBW, heightCm, age, isMale, activity, deficit, weightUnit])

  // ── Bulk / Gain calculations ─────────────────────────────────────
  const bgResults = useMemo(() => {
    const currentKg = toKgLocal(currentBW)
    const goalKg    = toKgLocal(bulkGoalBW)
    const bmr  = calcBMR(currentKg, heightCm, age, isMale)
    const tdee = calcTDEE(bmr, bulkActivity)
    // Lean bulk: 200–300 kcal surplus; aggressive: 500+ kcal surplus
    const effectiveSurplus = bulkType === 'lean' ? Math.min(surplus, 400) : surplus
    const targetCals = tdee + effectiveSurplus
    const macros = calcBulkMacros(targetCals, goalKg)
    // ~0.45 kg muscle/week max natural for lean bulk; fat gain is faster at higher surplus
    const weeklyGainKg = effectiveSurplus * 7 / 7700
    const totalToGainKg = Math.max(0, goalKg - currentKg)
    const weeksNeeded = weeklyGainKg > 0 ? Math.ceil(totalToGainKg / weeklyGainKg) : 0
    const projection = calcWeightGainProjection(currentKg, weeklyGainKg, weeksNeeded)
    const proteinCals = macros.protein * 4
    const carbCals    = macros.carbs * 4
    const fatCals     = macros.fat * 9
    // Fat gain estimate: at lean bulk ~20-30% of gain is fat; aggressive ~40-50%
    const fatGainPct  = bulkType === 'lean' ? 0.25 : 0.45
    const estimatedMusclePct = 1 - fatGainPct
    // Next weight class up
    const nextClasses = isMale ? IPF_WEIGHT_CLASSES_MALE : IPF_WEIGHT_CLASSES_FEMALE
    const nextClass = nextClasses.find((c) => c > currentKg) ?? null
    return {
      bmr, tdee, targetCals, macros, totalToGainKg: Math.round(totalToGainKg * 10) / 10,
      weeklyGainKg: Math.round(weeklyGainKg * 100) / 100, weeksNeeded, projection,
      proteinCals, carbCals, fatCals, effectiveSurplus,
      fatGainPct, estimatedMusclePct, nextClass,
      isSafe: bulkType === 'lean' || effectiveSurplus <= 500,
    }
  }, [currentBW, bulkGoalBW, heightCm, age, isMale, bulkActivity, surplus, bulkType, weightUnit])

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 bg-zinc-800 rounded-xl p-1 w-fit">
        {[
          { id: 'makeweight', label: '⚖️ Make Weight' },
          { id: 'loseweight', label: '🔥 Lose Weight' },
          { id: 'bulkgain',   label: '💪 Bulk / Gain' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              mode === id ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Shared: Sex + Current BW */}
      <Card>
        <CardBody className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200">Athlete Info</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sex toggle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-400">Sex</label>
              <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                {['Male', 'Female'].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setIsMale(s === 'Male')
                      setTargetClass(s === 'Male' ? 83 : 69)
                    }}
                    className={cn(
                      'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                      (s === 'Male') === isMale ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <NumInput
              label={`Current Bodyweight (${unit})`}
              value={currentBW}
              onChange={setCurrentBW}
              step={isLbs ? 0.5 : 0.1}
              min={isLbs ? 80 : 35}
            />
            {(mode === 'loseweight' || mode === 'bulkgain') && (
              <NumInput
                label="Age"
                value={age}
                onChange={setAge}
                min={13}
                step={1}
              />
            )}
          </div>
        </CardBody>
      </Card>

      {/* ── MAKE WEIGHT MODE ─────────────────────────────────────── */}
      {mode === 'makeweight' && (
        <>
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Meet Prep Inputs</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Weight class selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-400">Target Weight Class</label>
                  <select
                    value={targetClass}
                    onChange={(e) => setTargetClass(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>{weightClassLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <NumInput
                  label="Weeks Until Meet"
                  value={meetWeeks}
                  onChange={setMeetWeeks}
                  min={1}
                  step={1}
                />
                {/* Water cut toggle */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-400">Planning a Water Cut?</label>
                  <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                    {['Yes', 'No'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setHasWaterCut(s === 'Yes')}
                        className={cn(
                          'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                          (s === 'Yes') === hasWaterCut ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Results */}
          {mwResults.status === 'already_in' ? (
            <Card className="border-green-500/30">
              <CardBody className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-400">Already in weight class</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Your current bodyweight is at or below the target class. No cut needed.</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResultBox
                  label="Total to Lose"
                  value={`${toDisplay(mwResults.totalToLose)} ${unit}`}
                  color="text-orange-400"
                />
                <ResultBox
                  label="Diet Loss"
                  value={`${toDisplay(mwResults.dietLoss)} ${unit}`}
                  color="text-yellow-400"
                  sub="via caloric deficit"
                />
                <ResultBox
                  label="Weekly Loss Rate"
                  value={`${toDisplay(mwResults.weeklyRate)} ${unit}/wk`}
                  color={mwResults.status === 'safe' ? 'text-green-400' : 'text-red-400'}
                />
                <ResultBox
                  label="Daily Deficit Needed"
                  value={`${mwResults.dailyDeficit} kcal`}
                  color={mwResults.dailyDeficit < 750 ? 'text-teal-400' : 'text-orange-400'}
                />
              </div>

              {hasWaterCut && (
                <Card className={cn('border', mwResults.waterCutFeasible ? 'border-blue-500/30' : 'border-red-500/40')}>
                  <CardBody className="flex items-start gap-3">
                    <Droplets className={cn('w-4 h-4 mt-0.5 flex-shrink-0', mwResults.waterCutFeasible ? 'text-blue-400' : 'text-red-400')} />
                    <div className="space-y-0.5">
                      <p className={cn('text-sm font-semibold', mwResults.waterCutFeasible ? 'text-blue-300' : 'text-red-400')}>
                        Water Cut: {toDisplay(mwResults.waterCutNeeded)} {unit} ({mwResults.waterCutPct}% BW)
                      </p>
                      <p className="text-xs text-zinc-400">
                        {mwResults.waterCutFeasible
                          ? 'This is within the manageable range (≤5% BW). Ensure 24–48 hr rehydration window before lifting.'
                          : '⚠️ This water cut exceeds 5% bodyweight — risky for performance and health. Consider cutting to a higher weight class or extending your diet phase.'}
                      </p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {mwResults.status === 'aggressive' && (
                <Card className="border-red-500/30">
                  <CardBody className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Aggressive cut — performance risk</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Losing more than 1 kg/week significantly increases muscle loss risk for strength athletes. Consider targeting a higher weight class or extending the prep timeline.</p>
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Week-by-week chart */}
              <Card>
                <CardBody className="space-y-3">
                  <h3 className="text-sm font-semibold text-zinc-200">Weight Projection (Diet Phase)</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mwResults.projection.map(d => ({ ...d, weight: toDisplay(d.weight) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#71717a' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={['auto', 'auto']} unit={` ${unit}`} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                          formatter={(val) => [`${val} ${unit}`, 'Bodyweight']}
                          labelFormatter={(w) => `Week ${w}`}
                        />
                        <ReferenceLine y={toDisplay(mwResults.targetKg)} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `Target: ${toDisplay(mwResults.targetKg)} ${unit}`, fontSize: 10, fill: '#a78bfa', position: 'insideTopRight' }} />
                        <Line type="monotone" dataKey="weight" stroke="#fb923c" strokeWidth={2} dot={{ r: 2, fill: '#fb923c' }} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>

              {/* Guidance notes */}
              <Card>
                <CardBody>
                  <h3 className="text-sm font-semibold text-zinc-200 mb-3">Meet Prep Guidelines</h3>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs text-zinc-400">
                    <div className="space-y-1.5 bg-zinc-800/40 rounded-lg p-3">
                      <p className="font-semibold text-zinc-300">Diet Phase</p>
                      <p>• Max safe rate: 0.5–1% BW/week for strength athletes</p>
                      <p>• Keep protein high (≥2g/kg) to preserve muscle</p>
                      <p>• Reduce carbs before fat — protect training energy</p>
                    </div>
                    <div className="space-y-1.5 bg-zinc-800/40 rounded-lg p-3">
                      <p className="font-semibold text-zinc-300">Water Cut</p>
                      <p>• ≤3% BW: safe with 24 hr rehydration</p>
                      <p>• 3–5% BW: manageable, requires careful rehydration protocol</p>
                      <p>• &gt;5% BW: not recommended — significant strength loss</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}

      {/* ── LOSE WEIGHT MODE ─────────────────────────────────────── */}
      {mode === 'loseweight' && (
        <>
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Body & Goal Inputs</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Height with cm/in toggle */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">Height</label>
                    <div className="flex gap-0.5 bg-zinc-700 rounded-md p-0.5">
                      {['cm', 'in'].map((u) => (
                        <button
                          key={u}
                          onClick={() => onHeightUnitToggle(u)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                            heightUnit === u ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={heightUnit === 'in' ? 40 : 100}
                    step={heightUnit === 'in' ? 0.5 : 1}
                    value={heightDisplay}
                    onChange={(e) => onHeightChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <NumInput
                  label={`Goal Weight (${unit})`}
                  value={goalBW}
                  onChange={setGoalBW}
                  step={isLbs ? 0.5 : 0.1}
                  min={isLbs ? 80 : 35}
                />
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-zinc-400 block mb-1">Daily Deficit (kcal)</label>
                  <input
                    type="range"
                    min={200}
                    max={1000}
                    step={50}
                    value={deficit}
                    onChange={(e) => setDeficit(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-0.5">
                    <span>200</span>
                    <span className="text-purple-400 font-semibold">{deficit} kcal/day</span>
                    <span>1000</span>
                  </div>
                </div>
              </div>

              {/* Activity level */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2">Activity Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {ACTIVITY_LEVELS.map(({ id, label, sub }) => (
                    <button
                      key={id}
                      onClick={() => setActivity(id)}
                      className={cn(
                        'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors',
                        activity === id
                          ? 'border-purple-500 bg-purple-500/10 text-purple-300'
                          : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                      )}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-xs opacity-70 mt-0.5 leading-tight">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* TDEE & deficit results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultBox label="BMR" value={`${lwResults.bmr.toLocaleString()} kcal`} color="text-zinc-300" sub="at rest" />
            <ResultBox label="TDEE" value={`${lwResults.tdee.toLocaleString()} kcal`} color="text-blue-400" sub="maintenance" />
            <ResultBox label="Target Intake" value={`${lwResults.targetCals.toLocaleString()} kcal`} color="text-purple-400" sub={`−${deficit} deficit`} />
            <ResultBox
              label="Weekly Loss"
              value={`${toDisplay(lwResults.weeklyLossKg)} ${unit}/wk`}
              color={lwResults.isSafe ? 'text-green-400' : 'text-orange-400'}
              sub={lwResults.isSafe ? 'sustainable' : 'aggressive'}
            />
          </div>

          {/* Macro breakdown */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">Macro Breakdown at Target Calories</h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  {lwResults.targetCals.toLocaleString()} kcal/day
                </div>
              </div>
              <div className="space-y-3">
                <MacroBar
                  label="Protein"
                  grams={lwResults.macros.protein}
                  calories={lwResults.proteinCals}
                  color="bg-blue-500"
                  pct={Math.round((lwResults.proteinCals / lwResults.targetCals) * 100)}
                />
                <MacroBar
                  label="Carbohydrates"
                  grams={lwResults.macros.carbs}
                  calories={lwResults.carbCals}
                  color="bg-teal-500"
                  pct={Math.round((lwResults.carbCals / lwResults.targetCals) * 100)}
                />
                <MacroBar
                  label="Fat"
                  grams={lwResults.macros.fat}
                  calories={lwResults.fatCals}
                  color="bg-yellow-500"
                  pct={Math.round((lwResults.fatCals / lwResults.targetCals) * 100)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Protein', pct: Math.round((lwResults.proteinCals / lwResults.targetCals) * 100), color: 'text-blue-400' },
                  { label: 'Carbs',   pct: Math.round((lwResults.carbCals   / lwResults.targetCals) * 100), color: 'text-teal-400' },
                  { label: 'Fat',     pct: Math.round((lwResults.fatCals    / lwResults.targetCals) * 100), color: 'text-yellow-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <div className={cn('text-lg font-bold', color)}>{pct}%</div>
                    <div className="text-xs text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">Protein set at 2.2g/kg goal bodyweight to preserve muscle during a deficit. Fat floored at 25% of calories. Remaining calories assigned to carbs.</p>
            </CardBody>
          </Card>

          {/* Projection chart */}
          {lwResults.weeksNeeded > 0 && lwResults.weeksNeeded <= 52 && (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200">Weight Loss Projection</h3>
                  <Badge color="purple">{lwResults.weeksNeeded} weeks to goal</Badge>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lwResults.projection.map(d => ({ ...d, weight: toDisplay(d.weight) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={['auto', 'auto']} unit={` ${unit}`} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                        formatter={(val) => [`${val} ${unit}`, 'Bodyweight']}
                        labelFormatter={(w) => `Week ${w}`}
                      />
                      <ReferenceLine y={toDisplay(toKgLocal(goalBW))} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: `Goal: ${goalBW} ${unit}`, fontSize: 10, fill: '#a78bfa', position: 'insideTopRight' }} />
                      <Line type="monotone" dataKey="weight" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2, fill: '#22d3ee' }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Summary stats */}
          <Card>
            <CardBody className="space-y-0">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Summary</h3>
              <InfoRow
                label="Total Weight to Lose"
                value={`${toDisplay(lwResults.totalToLoseKg)} ${unit}`}
                color={lwResults.totalToLoseKg > 0 ? 'text-orange-400' : 'text-green-400'}
              />
              <InfoRow
                label="Estimated Timeline"
                value={lwResults.weeksNeeded > 0 ? `~${lwResults.weeksNeeded} weeks` : '—'}
                sub={lwResults.weeksNeeded > 0 ? `≈ ${Math.round(lwResults.weeksNeeded / 4.33)} months` : undefined}
              />
              <InfoRow
                label="Caloric Deficit"
                value={`${deficit.toLocaleString()} kcal/day`}
                color={lwResults.isSafe ? 'text-green-400' : 'text-orange-400'}
                sub={lwResults.isSafe ? 'Sustainable for strength athletes' : 'High — monitor strength closely'}
              />
              <InfoRow label="Formula" value="Mifflin-St Jeor BMR" sub="Industry standard for active individuals" />
            </CardBody>
          </Card>
        </>
      )}

      {/* ── BULK / GAIN MODE ─────────────────────────────────────── */}
      {mode === 'bulkgain' && (
        <>
          <Card>
            <CardBody className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Bulk Inputs</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Height with cm/in toggle */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">Height</label>
                    <div className="flex gap-0.5 bg-zinc-700 rounded-md p-0.5">
                      {['cm', 'in'].map((u) => (
                        <button
                          key={u}
                          onClick={() => onHeightUnitToggle(u)}
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                            heightUnit === u ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                          )}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min={heightUnit === 'in' ? 40 : 100}
                    step={heightUnit === 'in' ? 0.5 : 1}
                    value={heightDisplay}
                    onChange={(e) => onHeightChange(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <NumInput
                  label={`Goal Weight (${unit})`}
                  value={bulkGoalBW}
                  onChange={setBulkGoalBW}
                  step={isLbs ? 0.5 : 0.1}
                  min={isLbs ? 80 : 35}
                />
                {/* Bulk type */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-400">Bulk Type</label>
                  <div className="flex gap-1 bg-zinc-800 rounded-lg p-0.5">
                    {[
                      { id: 'lean',       label: 'Lean' },
                      { id: 'aggressive', label: 'Aggressive' },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => {
                          setBulkType(id)
                          setSurplus(id === 'lean' ? 300 : 600)
                        }}
                        className={cn(
                          'flex-1 py-1.5 rounded-md text-xs font-medium transition-colors',
                          bulkType === id ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Surplus slider */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-medium text-zinc-400 block mb-1">Daily Surplus (kcal)</label>
                  <input
                    type="range"
                    min={100}
                    max={bulkType === 'lean' ? 400 : 800}
                    step={50}
                    value={surplus}
                    onChange={(e) => setSurplus(Number(e.target.value))}
                    className="w-full accent-green-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-0.5">
                    <span>100</span>
                    <span className="text-green-400 font-semibold">+{surplus} kcal/day</span>
                    <span>{bulkType === 'lean' ? 400 : 800}</span>
                  </div>
                </div>
              </div>

              {/* Activity level */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2">Activity Level</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {ACTIVITY_LEVELS.map(({ id, label, sub }) => (
                    <button
                      key={id}
                      onClick={() => setBulkActivity(id)}
                      className={cn(
                        'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors',
                        bulkActivity === id
                          ? 'border-green-500 bg-green-500/10 text-green-300'
                          : 'border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600'
                      )}
                    >
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="text-xs opacity-70 mt-0.5 leading-tight">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lean vs Aggressive info callout */}
              <div className={cn(
                'rounded-lg p-3 text-xs space-y-1 border',
                bulkType === 'lean'
                  ? 'bg-green-500/5 border-green-500/20 text-green-300'
                  : 'bg-orange-500/5 border-orange-500/20 text-orange-300'
              )}>
                {bulkType === 'lean' ? (
                  <>
                    <p className="font-semibold">Lean Bulk (100–400 kcal surplus)</p>
                    <p className="text-zinc-400">Slower gains with minimal fat accumulation. Ideal for athletes who need to stay in or near a weight class. Expect ~0.1–0.25 kg/week gain.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Aggressive Bulk (400–800 kcal surplus)</p>
                    <p className="text-zinc-400">Faster mass gain but with more fat. Best in an off-season when weight class isn't a constraint. Expect ~0.25–0.5 kg/week gain.</p>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* TDEE & surplus results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultBox label="BMR" value={`${bgResults.bmr.toLocaleString()} kcal`} color="text-zinc-300" sub="at rest" />
            <ResultBox label="TDEE" value={`${bgResults.tdee.toLocaleString()} kcal`} color="text-blue-400" sub="maintenance" />
            <ResultBox label="Target Intake" value={`${bgResults.targetCals.toLocaleString()} kcal`} color="text-green-400" sub={`+${bgResults.effectiveSurplus} surplus`} />
            <ResultBox
              label="Weekly Gain"
              value={`+${toDisplay(bgResults.weeklyGainKg)} ${unit}/wk`}
              color={bgResults.isSafe ? 'text-teal-400' : 'text-orange-400'}
              sub={bgResults.isSafe ? 'controlled' : 'fast bulk'}
            />
          </div>

          {/* Body composition estimate */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-green-500/20">
              <CardBody className="text-center space-y-1">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">Estimated Muscle Gain</div>
                <div className="text-3xl font-bold text-green-400">{Math.round(bgResults.estimatedMusclePct * 100)}%</div>
                <div className="text-xs text-zinc-500">of total weight gained</div>
                <div className="text-xs text-zinc-400 mt-1">
                  ~{toDisplay(Math.round(bgResults.totalToGainKg * bgResults.estimatedMusclePct * 10) / 10)} {unit} lean mass
                </div>
              </CardBody>
            </Card>
            <Card className="border-yellow-500/20">
              <CardBody className="text-center space-y-1">
                <div className="text-xs text-zinc-400 uppercase tracking-wider">Estimated Fat Gain</div>
                <div className="text-3xl font-bold text-yellow-400">{Math.round(bgResults.fatGainPct * 100)}%</div>
                <div className="text-xs text-zinc-500">of total weight gained</div>
                <div className="text-xs text-zinc-400 mt-1">
                  ~{toDisplay(Math.round(bgResults.totalToGainKg * bgResults.fatGainPct * 10) / 10)} {unit} body fat
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Macro breakdown */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">Macro Breakdown at Target Calories</h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <Flame className="w-3.5 h-3.5 text-green-400" />
                  {bgResults.targetCals.toLocaleString()} kcal/day
                </div>
              </div>
              <div className="space-y-3">
                <MacroBar
                  label="Protein"
                  grams={bgResults.macros.protein}
                  calories={bgResults.proteinCals}
                  color="bg-blue-500"
                  pct={Math.round((bgResults.proteinCals / bgResults.targetCals) * 100)}
                />
                <MacroBar
                  label="Carbohydrates"
                  grams={bgResults.macros.carbs}
                  calories={bgResults.carbCals}
                  color="bg-green-500"
                  pct={Math.round((bgResults.carbCals / bgResults.targetCals) * 100)}
                />
                <MacroBar
                  label="Fat"
                  grams={bgResults.macros.fat}
                  calories={bgResults.fatCals}
                  color="bg-yellow-500"
                  pct={Math.round((bgResults.fatCals / bgResults.targetCals) * 100)}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Protein', pct: Math.round((bgResults.proteinCals / bgResults.targetCals) * 100), color: 'text-blue-400' },
                  { label: 'Carbs',   pct: Math.round((bgResults.carbCals   / bgResults.targetCals) * 100), color: 'text-green-400' },
                  { label: 'Fat',     pct: Math.round((bgResults.fatCals    / bgResults.targetCals) * 100), color: 'text-yellow-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="bg-zinc-800/40 rounded-lg p-2 text-center">
                    <div className={cn('text-lg font-bold', color)}>{pct}%</div>
                    <div className="text-xs text-zinc-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">Protein set at 2.0g/kg goal bodyweight to support muscle synthesis. Fat at 30% of calories. Remaining calories assigned to carbohydrates for training performance.</p>
            </CardBody>
          </Card>

          {/* Projection chart */}
          {bgResults.weeksNeeded > 0 && bgResults.weeksNeeded <= 52 && (
            <Card>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-200">Weight Gain Projection</h3>
                  <Badge color="purple">{bgResults.weeksNeeded} weeks to goal</Badge>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bgResults.projection.map(d => ({ ...d, weight: toDisplay(d.weight) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#71717a' }} label={{ value: 'Week', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#71717a' }} domain={['auto', 'auto']} unit={` ${unit}`} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                        formatter={(val) => [`${val} ${unit}`, 'Bodyweight']}
                        labelFormatter={(w) => `Week ${w}`}
                      />
                      <ReferenceLine y={toDisplay(toKgLocal(bulkGoalBW))} stroke="#4ade80" strokeDasharray="4 4" label={{ value: `Goal: ${bulkGoalBW} ${unit}`, fontSize: 10, fill: '#4ade80', position: 'insideTopRight' }} />
                      <Line type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2} dot={{ r: 2, fill: '#4ade80' }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Weight class progression */}
          {bgResults.nextClass && (
            <Card className="border-purple-500/20">
              <CardBody>
                <h3 className="text-sm font-semibold text-zinc-200 mb-3">Weight Class Progression</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-zinc-800/60 rounded-lg p-3 text-center border border-zinc-700/50">
                    <div className="text-xs text-zinc-400 mb-1">Current Class</div>
                    <div className="text-lg font-bold text-zinc-200">
                      {(isMale ? IPF_WEIGHT_CLASSES_MALE : IPF_WEIGHT_CLASSES_FEMALE).find(c => toKgLocal(currentBW) <= c) >= 9999
                        ? '120+ kg' : `≤${(isMale ? IPF_WEIGHT_CLASSES_MALE : IPF_WEIGHT_CLASSES_FEMALE).find(c => toKgLocal(currentBW) <= c)} kg`}
                    </div>
                  </div>
                  <div className="text-zinc-500 text-xl">→</div>
                  <div className="flex-1 bg-green-500/10 rounded-lg p-3 text-center border border-green-500/30">
                    <div className="text-xs text-zinc-400 mb-1">Next Class Up</div>
                    <div className="text-lg font-bold text-green-400">
                      {bgResults.nextClass >= 9999 ? '120+ kg' : `≤${bgResults.nextClass} kg`}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">Moving up a weight class gives you more room to add strength without competing at a bodyweight disadvantage.</p>
              </CardBody>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardBody className="space-y-0">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Summary</h3>
              <InfoRow
                label="Total Weight to Gain"
                value={`+${toDisplay(bgResults.totalToGainKg)} ${unit}`}
                color="text-green-400"
              />
              <InfoRow
                label="Estimated Timeline"
                value={bgResults.weeksNeeded > 0 ? `~${bgResults.weeksNeeded} weeks` : '—'}
                sub={bgResults.weeksNeeded > 0 ? `≈ ${Math.round(bgResults.weeksNeeded / 4.33)} months` : undefined}
              />
              <InfoRow
                label="Daily Caloric Surplus"
                value={`+${bgResults.effectiveSurplus} kcal/day`}
                color="text-green-400"
              />
              <InfoRow
                label="Bulk Type"
                value={bulkType === 'lean' ? 'Lean Bulk' : 'Aggressive Bulk'}
                color={bulkType === 'lean' ? 'text-teal-400' : 'text-orange-400'}
                sub={bulkType === 'lean' ? 'Minimise fat, stay near weight class' : 'Maximise mass in off-season'}
              />
              <InfoRow label="Formula" value="Mifflin-St Jeor BMR" sub="Industry standard for active individuals" />
            </CardBody>
          </Card>

          {/* Bulk guidelines */}
          <Card>
            <CardBody>
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">Bulking Guidelines for Strength Athletes</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-xs text-zinc-400">
                <div className="space-y-1.5 bg-zinc-800/40 rounded-lg p-3">
                  <p className="font-semibold text-zinc-300">Nutrition</p>
                  <p>• Hit protein target every day — muscle synthesis requires consistent amino acid availability</p>
                  <p>• Prioritise carbs around training for performance and glycogen</p>
                  <p>• Don't exceed 500 kcal surplus unless in a true off-season</p>
                </div>
                <div className="space-y-1.5 bg-zinc-800/40 rounded-lg p-3">
                  <p className="font-semibold text-zinc-300">Training</p>
                  <p>• Progressive overload is essential — calories without stimulus = fat gain</p>
                  <p>• Track monthly strength PRs to confirm mass is going to muscle</p>
                  <p>• Re-evaluate every 4–6 weeks: adjust surplus if gaining too fast/slow</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
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
    weightmgmt: <WeightMgmtTab />,
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
