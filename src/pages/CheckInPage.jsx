import { useState } from 'react'
import { Moon, Zap, Heart, AlertTriangle, CheckCircle, ChevronRight, Activity } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Slider } from '../components/ui/Slider'
import { useAuthStore } from '../lib/store'
import { cn, getRPEColor } from '../lib/utils'

const STEPS = ['readiness', 'sleep', 'nutrition', 'body', 'subjective', 'done']

function StepDots({ step }) {
  const steps = STEPS.slice(0, -1)
  return (
    <div className="flex items-center gap-1.5 justify-center mt-1">
      {steps.map((s) => (
        <div key={s} className={cn('rounded-full transition-all', step === s ? 'w-4 h-2 bg-purple-400' : steps.indexOf(s) < steps.indexOf(step) ? 'w-2 h-2 bg-purple-600' : 'w-2 h-2 bg-zinc-700')} />
      ))}
    </div>
  )
}

export function CheckInPage() {
  const [step, setStep] = useState('readiness')
  const [data, setData] = useState({
    readiness: 7,
    sleep_hours: 7.5,
    sleep_quality: 7,
    nutrition_adherence: 8,
    hydration: 7,
    body_weight: '',
    soreness: 4,
    motivation: 7,
    stress: 4,
    pain_location: '',
    pain_severity: 0,
    notes: '',
  })

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }))
  const next = () => setStep(STEPS[STEPS.indexOf(step) + 1])
  const prev = () => setStep(STEPS[STEPS.indexOf(step) - 1])

  if (step === 'done') return <DoneScreen data={data} />

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Daily Check-In</h1>
          <p className="text-sm text-zinc-400 mt-1">Quick snapshot of how you're feeling</p>
          <StepDots step={step} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {step === 'readiness' && (
            <ReadinessStep value={data.readiness} onChange={v => update('readiness', v)} />
          )}
          {step === 'sleep' && (
            <SleepStep hours={data.sleep_hours} quality={data.sleep_quality}
              onHours={v => update('sleep_hours', v)} onQuality={v => update('sleep_quality', v)} />
          )}
          {step === 'nutrition' && (
            <NutritionStep adherence={data.nutrition_adherence} hydration={data.hydration}
              onAdherence={v => update('nutrition_adherence', v)} onHydration={v => update('hydration', v)} />
          )}
          {step === 'body' && (
            <BodyStep weight={data.body_weight} soreness={data.soreness} painSeverity={data.pain_severity} painLocation={data.pain_location}
              onWeight={v => update('body_weight', v)} onSoreness={v => update('soreness', v)}
              onPainSeverity={v => update('pain_severity', v)} onPainLocation={v => update('pain_location', v)} />
          )}
          {step === 'subjective' && (
            <SubjectiveStep motivation={data.motivation} stress={data.stress} notes={data.notes}
              onMotivation={v => update('motivation', v)} onStress={v => update('stress', v)} onNotes={v => update('notes', v)} />
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {step !== 'readiness' && (
            <Button variant="ghost" className="flex-1" onClick={prev}>Back</Button>
          )}
          <Button className="flex-1" onClick={next}>
            {step === 'subjective' ? 'Submit Check-In' : 'Continue'} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">{children}</p>
}

function RatingRow({ label, value, onChange, colorFn }) {
  const color = colorFn ? colorFn(value) : 'text-zinc-100'
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={cn('text-lg font-bold tabular-nums', color)}>{value}<span className="text-xs font-normal text-zinc-500">/10</span></span>
      </div>
      <Slider value={value} min={1} max={10} onChange={onChange} colorFn={colorFn} />
    </div>
  )
}

function ReadinessStep({ value, onChange }) {
  const label = value >= 8 ? 'Ready to crush it' : value >= 6 ? 'Feeling decent' : value >= 4 ? 'Average day' : 'Low eough day'
  return (
    <div className="space-y-6">
      <SectionLabel>Overall Readiness</SectionLabel>
      <div className="text-center py-2">
        <p className="text-6xl font-black text-zinc-100 tabular-nums">{value}</p>
        <p className="text-zinc-400 mt-1">{label}</p>
      </div>
      <div className="flex gap-2 justify-center">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={cn('w-8 h-8 rounded-lg text-xs font-bold transition-all', n === value ? 'bg-purple-600 text-white scale-110' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}>{n}</button>
        ))}
      </div>
    </div>
  )
}

function SleepStep({ hours, quality, onHours, onQuality }) {
  return (
    <div className="space-y-6">
      <SectionLabel>Sleep</SectionLabel>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Hours Slept</span>
          <span className="text-lg font-bold text-zinc-100">{hours}h</span>
        </div>
        <input type="range" min={2} max={12} step={0.5} value={hours} onChange={e => onHours(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-600"><span>2h</span><span>8h</span><span>12h</span></div>
      </div>
      <RatingRow label="Sleep Quality" value={quality} onChange={onQuality} />
    </div>
  )
}

function NutritionStep({ adherence, hydration, onAdherence, onHydration }) {
  return (
    <div className="space-y-6">
      <SectionLabel>Nutrition & Hydration</SectionLabel>
      <RatingRow label="Nutrition Adherence" value={adherence} onChange={onAdherence} />
      <RatingRow label="Hydration" value={hydration} onChange={onHydration} />
    </div>
  )
}

function BodyStep({ weight, soreness, painSeverity, painLocation, onWeight, onSoreness, onPainSeverity, onPainLocation }) {
  return (
    <div className="space-y-6">
      <SectionLabel>Body & Recovery</SectionLabel>
      <div>
        <label className="block text-sm text-zinc-300 mb-1.5">Body Weight (lbs)</label>
        <input type="number" step={0.1} value={weight} onChange={e => onWeight(e.target.value)} placeholder="e.g. 183.4"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
      </div>
      <RatingRow label="Overall Soreness" value={soreness} onChange={onSoreness} colorFn={v => v >= 7 ? 'text-red-400' : v >= 5 ? 'text-yellow-400' : 'text-green-400'} />
      <div className="space-y-2 border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-400">Pain / Injury? (optional)</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Severity</span>
          <span className={cn('text-lg font-bold tabular-nums', painSeverity === 0 ? 'text-zinc-500' : painSeverity >= 7 ? 'text-red-400' : 'text-yellow-400')}>
            {painSeverity === 0 ? 'None' : `${painSeverity}/10`}
          </span>
        </div>
        <input type="range" min={0} max={10} value={painSeverity} onChange={e => onPainSeverity(parseInt(e.target.value))}
          className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer" />
        {painSeverity > 0 && (
          <input type="text" value={painLocation} onChange={e => onPainLocation(e.target.value)} placeholder="Location (e.g. left knee, lower back)"
            className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        )}
      </div>
    </div>
  )
}

function SubjectiveStep({ motivation, stress, notes, onMotivation, onStress, onNotes }) {
  return (
    <div className="space-y-6">
      <SectionLabel>Mental & Subjective</SectionLabel>
      <RatingRow label="Motivation" value={motivation} onChange={onMotivation} />
      <RatingRow label="Stress Level" value={stress} onChange={onStress} colorFn={v => v >= 7 ? 'text-red-400' : v >= 5 ? 'text-yellow-400' : 'text-green-400'} />
      <div>
        <label className="block text-sm text-zinc-300 mb-1.5">Anything to flag? (optional)</label>
        <textarea rows={3} value={notes} onChange={e => onNotes(e.target.value)} placeholder="Anything on your mind — coach will see this…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
      </div>
    </div>
  )
}

function DoneScreen({ data }) {
  const getReadinessLabel = (r) => r >= 8 ? { label: 'Outstanding', color: 'text-green-400', icon: '' } : r >= 6 ? { label: 'Good', color: 'text-blue-400', icon: '' } : r >= 4 ? { label: 'Moderate', color: 'text-yellow-400', icon: '' } : { label: 'Low', color: 'text-red-400', icon: '' }
  const { label, color, icon } = getReadinessLabel(data.readiness)

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Check-In Complete!</h2>
          <p className="text-zinc-400 mt-1 text-sm">Your coach can now see today's data</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Readiness</span>
            <span className={cn('text-sm font-bold', color)}>{icon} {label} ({data.readiness}/10)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Sleep</span>
            <span className="text-sm font-bold text-zinc-200">{data.sleep_hours}h · {data.sleep_quality}/10 quality</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Nutrition</span>
            <span className="text-sm font-bold text-zinc-200">{data.nutrition_adherence}/10</span>
          </div>
          {data.body_weight && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Body Weight</span>
              <span className="text-sm font-bold text-zinc-200">{data.body_weight} lbs</span>
            </div>
          )}
          {data.pain_severity > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-sm text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Pain flagged</span>
              <span className="text-sm font-bold text-red-300">{data.pain_severity}/10 — {data.pain_location || 'unspecified'}</span>
            </div>
          )}
        </div>

        <Button className="w-full" onClick={() => window.history.back()}>
          Go to Today's Workout
        </Button>
      </div>
    </div>
  )
}
