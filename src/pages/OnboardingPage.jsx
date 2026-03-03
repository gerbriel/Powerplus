/**
 * OnboardingPage — shown after email confirmation when a user has no org membership.
 *
 * Roles & flows:
 *   Head Coach / Gym Owner  → create a new org              (role → new-org → done)
 *   Coach                   → request to join existing org  (role → join-org → pending)
 *   Nutritionist            → request to join existing org  (role → join-org → pending)
 *   Athlete (solo)          → enter app solo                (role → athlete-choice → solo → done)
 *   Athlete (join)          → search & request access       (role → athlete-choice → join-org → pending)
 */

import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Users, User, ChevronRight, Loader2, CheckCircle,
  Building2, Search, Clock, Send, ArrowLeft, Utensils,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../lib/store'
import {
  createOrgWithOwner, markOnboardingComplete, fetchOrgMemberships,
  searchOrgs, createJoinRequest,
} from '../lib/supabase'

// ── Tiny shared UI atoms ──────────────────────────────────────────────────────

function Label({ children }) {
  return (
    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm
        text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500
        transition-colors ${className}`}
      {...props}
    />
  )
}

function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm
        text-zinc-100 focus:outline-none focus:border-purple-500 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

function Btn({ children, variant = 'primary', className = '', ...props }) {
  const base = 'flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50'
  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white',
    ghost: 'border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Auto-generate a URL-safe slug from a name string
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48)
}

const ROLE_LABELS = {
  head_coach:   'Head Coach',
  coach:        'Coach',
  nutritionist: 'Nutritionist / Dietitian',
  athlete:      'Athlete',
}

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Phoenix', 'America/Anchorage',
  'America/Honolulu', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Asia/Tokyo',
]

const FEDERATIONS = [
  '', 'USAPL', 'IPF', 'USPA', 'IPL', 'CPU', 'BP', 'WRPF', 'RPS', 'SPF', 'APF', 'WPC', 'Other',
]

// ── Step 1 — Role choice ──────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  {
    id: 'head_coach',
    icon: <Building2 className="w-5 h-5 text-purple-400" />,
    iconBg: 'bg-purple-500/10 border-purple-500/30 group-hover:bg-purple-500/20',
    chevron: 'group-hover:text-purple-400',
    label: "I'm a head coach / gym owner",
    sub: 'Create & manage your organization, athletes, and staff',
  },
  {
    id: 'coach',
    icon: <Users className="w-5 h-5 text-blue-400" />,
    iconBg: 'bg-blue-500/10 border-blue-500/30 group-hover:bg-blue-500/20',
    chevron: 'group-hover:text-blue-400',
    label: "I'm a coach",
    sub: 'Join an existing gym or team as an assistant / associate coach',
  },
  {
    id: 'nutritionist',
    icon: <Utensils className="w-5 h-5 text-teal-400" />,
    iconBg: 'bg-teal-500/10 border-teal-500/30 group-hover:bg-teal-500/20',
    chevron: 'group-hover:text-teal-400',
    label: "I'm a nutritionist / dietitian",
    sub: 'Join an org to manage athlete nutrition plans',
  },
  {
    id: 'athlete',
    icon: <User className="w-5 h-5 text-green-400" />,
    iconBg: 'bg-green-500/10 border-green-500/30 group-hover:bg-green-500/20',
    chevron: 'group-hover:text-green-400',
    label: "I'm an athlete",
    sub: 'Track training, nutrition, and meets — solo or under a coach',
  },
]

function StepRole({ onNext }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Welcome to PowerPlus 👋</h2>
        <p className="text-sm text-zinc-400 mt-1">How will you primarily use PowerPlus?</p>
      </div>
      <div className="grid gap-3">
        {ROLE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onNext(opt.id)}
            className="group flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700
              hover:border-purple-500 rounded-xl p-4 text-left transition-all"
          >
            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${opt.iconBg}`}>
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-100 text-sm">{opt.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{opt.sub}</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-zinc-600 transition-colors shrink-0 ${opt.chevron}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step — Athlete choice (solo vs join org) ──────────────────────────────────

function StepAthleteChoice({ onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">How do you train?</h2>
        <p className="text-sm text-zinc-400 mt-1">You can always join a coach's org later from your profile.</p>
      </div>
      <div className="grid gap-3">
        <button
          onClick={() => onNext('solo')}
          className="group flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700
            hover:border-purple-500 rounded-xl p-4 text-left transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30
            flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
            <User className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-100 text-sm">Solo / self-coached</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manage my own training and nutrition independently</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 shrink-0" />
        </button>

        <button
          onClick={() => onNext('join')}
          className="group flex items-center gap-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700
            hover:border-purple-500 rounded-xl p-4 text-left transition-all"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30
            flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
            <Search className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-100 text-sm">Join a gym / coach's org</p>
            <p className="text-xs text-zinc-500 mt-0.5">Search for your gym or head coach and request access</p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-purple-400 shrink-0" />
        </button>
      </div>
      <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
        <ArrowLeft className="w-3 h-3" /> Back
      </button>
    </div>
  )
}

// ── Step — New org setup (head coaches) ──────────────────────────────────────

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

// ── Step — Solo athlete confirmation ─────────────────────────────────────────

function StepSoloAthlete({ onFinish, loading, onBack }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Solo athlete mode</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Track your own training, nutrition, and meets. You can search for and join a coach's org at any time.
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        {[
          'Log workouts & sets',
          'Track PRs & meet attempts',
          'Daily check-ins & wellness',
          'Nutrition planning & meal prep',
          'Calculator tools (Wilks, DOTS, 1RM, weight management)',
        ].map((f) => (
          <div key={f} className="flex items-center gap-2.5 text-sm text-zinc-300">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" /> {f}
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Btn variant="ghost" type="button" onClick={onBack} className="flex-1">Back</Btn>
        <Btn onClick={onFinish} disabled={loading} className="flex-1">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Enter PowerPlus
        </Btn>
      </div>
    </div>
  )
}

// ── Step — Search & request to join an org ────────────────────────────────────

function StepJoinOrg({ requestedRole, onSubmit, onBack, loading }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [message, setMessage] = useState('')
  const debounceRef = useRef(null)

  const handleSearch = useCallback((val) => {
    setQuery(val)
    setSelected(null)
    clearTimeout(debounceRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const orgs = await searchOrgs(val)
      setResults(orgs)
      setSearching(false)
    }, 350)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selected) { toast.error('Please select an organization.'); return }
    onSubmit({ orgId: selected.id, orgName: selected.name, message })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-zinc-100">Find your organization</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Search for your gym, team, or coach. Your request goes to their admin for approval.
        </p>
      </div>

      {/* Role badge */}
      <div className="inline-flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1">
        <span className="text-xs text-zinc-400">Joining as</span>
        <span className="text-xs font-semibold text-purple-300">{ROLE_LABELS[requestedRole] || requestedRole}</span>
      </div>

      {/* Search */}
      <div>
        <Label>Search by org name or URL slug</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Iron North Barbell…"
            className="pl-9"
            autoFocus
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
          )}
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && !selected && (
        <div className="border border-zinc-700 rounded-xl overflow-hidden divide-y divide-zinc-800">
          {results.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => { setSelected(org); setResults([]) }}
              className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
                {org.logo_url
                  ? <img src={org.logo_url} alt="" className="w-full h-full object-cover" />
                  : <Building2 className="w-4 h-4 text-zinc-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{org.name}</p>
                <p className="text-xs text-zinc-500">
                  /org/{org.slug}
                  {org.federation && ` · ${org.federation}`}
                  {Number(org.member_count) > 0 && ` · ${org.member_count} members`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && !selected && (
        <p className="text-sm text-zinc-500 text-center py-2">No organizations found for "{query}"</p>
      )}

      {/* Selected org */}
      {selected && (
        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
            {selected.logo_url
              ? <img src={selected.logo_url} alt="" className="w-full h-full object-cover" />
              : <Building2 className="w-4 h-4 text-zinc-400" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100">{selected.name}</p>
            <p className="text-xs text-zinc-500">/org/{selected.slug}</p>
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setQuery('') }}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded"
          >
            Change
          </button>
        </div>
      )}

      {/* Optional message */}
      <div>
        <Label>Message to admin <span className="normal-case text-zinc-600 font-normal">(optional)</span></Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Hi, I train with Coach Smith and was told to sign up here…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm
            text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-purple-500
            transition-colors resize-none"
        />
        <p className="text-xs text-zinc-600 text-right mt-0.5">{message.length}/300</p>
      </div>

      <div className="flex gap-3 pt-1">
        <Btn variant="ghost" type="button" onClick={onBack} className="flex-1">Back</Btn>
        <Btn type="submit" disabled={loading || !selected} className="flex-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Request
        </Btn>
      </div>
    </form>
  )
}

// ── Step — Pending confirmation screen ───────────────────────────────────────

function StepPending({ orgName, requestedRole, onEnter, loading }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
          <Clock className="w-7 h-7 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-zinc-100">Request sent!</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Your request to join <span className="text-zinc-200 font-semibold">{orgName}</span> as a{' '}
            <span className="text-zinc-200 font-semibold">{ROLE_LABELS[requestedRole] || requestedRole}</span> has been sent.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            You'll be notified when the org admin approves or denies your request. In the meantime, you can use PowerPlus in solo mode.
          </p>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2.5">
        {[
          'All solo features are available right now',
          'Check status under Profile → Org Requests',
          "Once approved you'll automatically gain team access",
        ].map((t) => (
          <div key={t} className="flex items-start gap-2.5 text-sm text-zinc-400">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> {t}
          </div>
        ))}
      </div>
      <Btn onClick={onEnter} disabled={loading} className="w-full">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Enter PowerPlus
      </Btn>
    </div>
  )
}

// ── Main OnboardingPage ───────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // step: 'role' | 'new-org' | 'athlete-choice' | 'solo' | 'join-org' | 'pending'
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [pendingInfo, setPendingInfo] = useState(null) // { orgName, requestedRole }

  // ── Role chosen ──────────────────────────────────────────────────────────
  const handleRoleChosen = (role) => {
    setSelectedRole(role)
    if (role === 'head_coach') {
      setStep('new-org')
    } else if (role === 'athlete') {
      setStep('athlete-choice')
    } else {
      // coach | nutritionist → straight to join-org search
      setStep('join-org')
    }
  }

  // ── Finish: create org (head coach) ──────────────────────────────────────
  const finishCoach = async ({ orgName, slug, federation, timezone, weightUnit }) => {
    if (!user?.id) { toast.error('Not signed in.'); return }
    setLoading(true)
    const orgId = await createOrgWithOwner({
      userId: user.id, name: orgName, slug, federation, timezone, weightUnit,
    })
    if (!orgId) {
      toast.error('Could not create organization. The slug may already be taken.')
      setLoading(false)
      return
    }
    await markOnboardingComplete(user.id, 'head_coach')
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

  // ── Finish: solo athlete ──────────────────────────────────────────────────
  const finishSoloAthlete = async () => {
    if (!user?.id) { toast.error('Not signed in.'); return }
    setLoading(true)
    await markOnboardingComplete(user.id, 'athlete')
    useAuthStore.setState({
      profile: { ...profile, onboarding_complete: true, role: 'athlete' },
    })
    setLoading(false)
    navigate('/app', { replace: true })
  }

  // ── Finish: submit join request (coach / nutritionist / athlete) ──────────
  const finishJoinRequest = async ({ orgId, orgName, message }) => {
    if (!user?.id) { toast.error('Not signed in.'); return }
    setLoading(true)
    await markOnboardingComplete(user.id, selectedRole)
    const { error } = await createJoinRequest({
      userId: user.id, orgId, requestedRole: selectedRole, message,
    })
    if (error) {
      if (error.code === '23505') {
        toast('You already have a pending request to this org.', { icon: 'ℹ️' })
      } else {
        toast.error('Failed to send request. Please try again.')
        setLoading(false)
        return
      }
    }
    useAuthStore.setState({
      profile: { ...profile, onboarding_complete: true, role: selectedRole },
    })
    setLoading(false)
    setPendingInfo({ orgName, requestedRole: selectedRole })
    setStep('pending')
  }

  // ── Enter after pending screen ────────────────────────────────────────────
  const enterApp = () => navigate('/app', { replace: true })

  // ── Step dots ────────────────────────────────────────────────────────────
  const stepIndex = { role: 0, 'new-org': 1, 'athlete-choice': 1, solo: 1, 'join-org': 1, pending: 2 }
  const totalDots = step === 'pending' ? 3 : 2
  const currentDot = stepIndex[step] ?? 0

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

      {/* Step dots */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className="w-6 h-px bg-zinc-700" />}
            <div className={`w-2 h-2 rounded-full transition-colors ${i <= currentDot ? 'bg-purple-500' : 'bg-zinc-700'}`} />
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-7">
        {step === 'role' && (
          <StepRole onNext={handleRoleChosen} />
        )}
        {step === 'new-org' && (
          <StepOrgSetup onNext={finishCoach} onBack={() => setStep('role')} loading={loading} />
        )}
        {step === 'athlete-choice' && (
          <StepAthleteChoice
            onNext={(choice) => setStep(choice === 'solo' ? 'solo' : 'join-org')}
            onBack={() => setStep('role')}
          />
        )}
        {step === 'solo' && (
          <StepSoloAthlete onFinish={finishSoloAthlete} onBack={() => setStep('athlete-choice')} loading={loading} />
        )}
        {step === 'join-org' && (
          <StepJoinOrg
            requestedRole={selectedRole}
            onSubmit={finishJoinRequest}
            onBack={() => setStep(selectedRole === 'athlete' ? 'athlete-choice' : 'role')}
            loading={loading}
          />
        )}
        {step === 'pending' && pendingInfo && (
          <StepPending
            orgName={pendingInfo.orgName}
            requestedRole={pendingInfo.requestedRole}
            onEnter={enterApp}
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
