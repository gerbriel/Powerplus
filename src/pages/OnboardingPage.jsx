/**
 * OnboardingPage — shown to real (non-demo) users after email confirmation
 * when they don't yet have an org.
 *
 * Flow:
 *   Step 1 — Welcome / role choice  (head coach vs solo athlete)
 *   Step 2 — Org setup              (only for head coaches)
 *   Step 3 — Done                   (create org, mark onboarding complete, enter app)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Users, User, ChevronRight, Loader2, CheckCircle, Building2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../lib/store'
import { createOrgWithOwner, markOnboardingComplete, fetchOrgMemberships } from '../lib/supabase'

// ── Small helpers ─────────────────────────────────────────────────────────────

function Label({ children }) {
  return <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">{children}</label>
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors ${className}`}
      {...props}
    />
  )
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-purple-500 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// Auto-generate a URL-safe slug from a name string
function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Australia/Sydney',
  'Asia/Tokyo',
]

const FEDERATIONS = [
  '',
  'USAPL',
  'IPF',
  'USPA',
  'IPL',
  'CPU',
  'BP',
  'WRPF',
  'RPS',
  'SPF',
  'APF',
  'WPC',
  'Other',
]

// ── Step 1 — Role choice ──────────────────────────────────────────────────────

function StepRole({ onNext }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Welcome to PowerPlus 👋</h2>
        <p className="text-sm text-zinc-400 mt-1">How will you primarily use PowerPlus?</p>
      </div>

      <div className="grid gap-3">
        <button
          onClick={() => onNext('coach')}
          className="group flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-purple-500 rounded-xl p-4 text-left transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-100 text-sm">I'm a coach / gym owner</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manage athletes, build programs, run your org</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-colors shrink-0" />
        </button>

        <button
          onClick={() => onNext('athlete')}
          className="group flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-purple-500 rounded-xl p-4 text-left transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-100 text-sm">I'm a solo athlete</p>
            <p className="text-xs text-zinc-500 mt-0.5">Track my own training, nutrition, and meets</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0" />
        </button>
      </div>
    </div>
  )
}

// ── Step 2 — Org setup (coaches only) ────────────────────────────────────────

function StepOrgSetup({ onNext, onBack, loading }) {
  const [orgName, setOrgName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [federation, setFederation] = useState('')
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
  )
  const [weightUnit, setWeightUnit] = useState('lbs')

  const handleNameChange = (v) => {
    setOrgName(v)
    if (!slugManual) setSlug(slugify(v))
  }

  const handleSlugChange = (v) => {
    setSlugManual(true)
    setSlug(slugify(v))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!orgName.trim()) { toast.error('Org name is required.'); return }
    if (!slug.trim()) { toast.error('URL slug is required.'); return }
    onNext({ orgName: orgName.trim(), slug, federation, timezone, weightUnit })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Set up your organization</h2>
        <p className="text-sm text-zinc-400 mt-1">You can change all of this later in Settings.</p>
      </div>

      {/* Org name */}
      <div>
        <Label>Organization name</Label>
        <Input
          value={orgName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Iron North Barbell"
          required
          autoFocus
        />
      </div>

      {/* Slug */}
      <div>
        <Label>Public URL slug</Label>
        <div className="flex items-center gap-0 bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-purple-500 transition-colors">
          <span className="text-xs text-zinc-600 px-3 py-2.5 border-r border-zinc-700 shrink-0 select-none">/org/</span>
          <input
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            placeholder="iron-north"
            required
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1">
          Your intake page will be at{' '}
          <span className="text-zinc-400">powerplus.app/org/{slug || 'your-slug'}</span>
        </p>
      </div>

      {/* Federation */}
      <div>
        <Label>Primary federation <span className="normal-case text-zinc-600 font-normal">(optional)</span></Label>
        <Select value={federation} onChange={(e) => setFederation(e.target.value)}>
          {FEDERATIONS.map((f) => (
            <option key={f} value={f}>{f || '— None / unsanctioned —'}</option>
          ))}
        </Select>
      </div>

      {/* Timezone + weight unit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Timezone</Label>
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Weight unit</Label>
          <Select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value)}>
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Create organization
        </button>
      </div>
    </form>
  )
}

// ── Step 3 — Solo athlete (no org) ────────────────────────────────────────────

function StepSoloAthlete({ onFinish, loading, onBack }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Solo athlete mode</h2>
        <p className="text-sm text-zinc-400 mt-1">
          You're all set. Track your own training, nutrition, and meets. You can join a coach's org later via an invite link.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        {[
          'Log workouts & sets',
          'Track PRs & meet attempts',
          'Daily check-ins & wellness',
          'Nutrition planning & meal prep',
          'Calculator tools (Wilks, DOTS, 1RM)',
        ].map((f) => (
          <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            {f}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          Back
        </button>
        <button
          onClick={onFinish}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enter PowerPlus
        </button>
      </div>
    </div>
  )
}

// ── Main OnboardingPage ───────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, profile, setProfile, orgMemberships } = useAuthStore()
  const [step, setStep] = useState('role')   // 'role' | 'org' | 'athlete'
  const [loading, setLoading] = useState(false)

  // ── Finish for coaches: create org then enter app ────────────────────────
  const finishCoach = async ({ orgName, slug, federation, timezone, weightUnit }) => {
    if (!user?.id) { toast.error('Not signed in.'); return }
    setLoading(true)
    const orgId = await createOrgWithOwner({
      userId: user.id,
      name: orgName,
      slug,
      federation,
      timezone,
      weightUnit,
    })
    if (!orgId) {
      toast.error('Could not create organization. The slug may already be taken.')
      setLoading(false)
      return
    }
    await markOnboardingComplete(user.id, 'head_coach')
    // Re-fetch memberships so the store has the new org
    const memberships = await fetchOrgMemberships(user.id)
    useAuthStore.setState({
      orgMemberships: memberships,
      activeOrgId: orgId,
      profile: { ...profile, onboarding_complete: true, role: 'head_coach' },
    })
    setLoading(false)
    toast.success(`${orgName} created!`)
    navigate('/app', { replace: true })
  }

  // ── Finish for solo athletes: mark complete and enter app ─────────────────
  const finishAthlete = async () => {
    if (!user?.id) { toast.error('Not signed in.'); return }
    setLoading(true)
    await markOnboardingComplete(user.id, 'athlete')
    useAuthStore.setState({
      profile: { ...profile, onboarding_complete: true, role: 'athlete' },
    })
    setLoading(false)
    navigate('/app', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-5 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-base font-black text-zinc-100">
          Power<span className="text-purple-400">Plus</span>
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['role', step === 'org' ? 'org' : 'athlete'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-zinc-700" />}
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                (i === 0 && step === 'role') || (i === 1 && step !== 'role')
                  ? 'bg-purple-500'
                  : 'bg-zinc-700'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
        {step === 'role' && (
          <StepRole
            onNext={(role) => setStep(role === 'coach' ? 'org' : 'athlete')}
          />
        )}

        {step === 'org' && (
          <StepOrgSetup
            onNext={finishCoach}
            onBack={() => setStep('role')}
            loading={loading}
          />
        )}

        {step === 'athlete' && (
          <StepSoloAthlete
            onFinish={finishAthlete}
            onBack={() => setStep('role')}
            loading={loading}
          />
        )}
      </div>

      <p className="text-xs text-zinc-700 mt-6">
        Signed in as <span className="text-zinc-500">{user?.email ?? profile?.email}</span>
      </p>
    </div>
  )
}
