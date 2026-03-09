import { useState } from 'react'
import {
  Camera, Save, Lock, Bell, Moon, Sun, Globe, Scale,
  MapPin, Clock, Plus, Trash2, Check, Star, Palette, Dumbbell
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { Tabs } from '../components/ui/Tabs'
import { useAuthStore, useSettingsStore } from '../lib/store'
import { roleColor, cn } from '../lib/utils'
import { saveProfile } from '../lib/db'

const TABS = [
  { id: 'profile',       label: 'Profile' },
  { id: 'account',       label: 'Account' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'preferences',   label: 'Preferences' },
]

export function ProfilePage() {
  const { user, profile, isDemo } = useAuthStore()
  const [tab, setTab] = useState('profile')
  const displayName = profile?.full_name || profile?.display_name || user?.name || 'Athlete'
  const displayEmail = profile?.email || user?.email || 'athlete@powerplus.app'
  const role = profile?.role || user?.role || 'athlete'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile & Settings</h1>
      </div>

      {/* Profile header */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar name={displayName} size="xl" />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--brand-primary)' }}>
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{displayName}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{displayEmail}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge color={role === 'admin' ? 'red' : role === 'coach' ? 'blue' : role === 'nutritionist' ? 'green' : 'purple'}>
                  {role}
                </Badge>
                {(profile?.created_at || user?.created_at) && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Joined {new Date(profile?.created_at || user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      {tab === 'profile'       && <ProfileTab user={user} profile={profile} isDemo={isDemo} />}
      {tab === 'account'       && <AccountTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'preferences'   && <PreferencesTab />}
    </div>
  )
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ user, profile, isDemo }) {
  const isAthlete = !profile?.role || profile?.role === 'athlete'
  const nameParts = (profile?.full_name || '').split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [weightClass, setWeightClass] = useState(profile?.weight_class || '')
  const [federation, setFederation] = useState(profile?.federation || '')
  const [equipment, setEquipment] = useState(profile?.equipment_type || '')
  const [prSquat, setPrSquat] = useState(profile?.pr_squat ?? '')
  const [prBench, setPrBench] = useState(profile?.pr_bench ?? '')
  const [prDeadlift, setPrDeadlift] = useState(profile?.pr_deadlift ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSavePersonal = async () => {
    setSaving(true)
    const full_name = [firstName, lastName].filter(Boolean).join(' ')
    if (!isDemo && (user?.id || profile?.id)) {
      await saveProfile(user?.id || profile?.id, { full_name, bio })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveAthleteDetails = async () => {
    setSaving(true)
    if (!isDemo && (user?.id || profile?.id)) {
      await saveProfile(user?.id || profile?.id, { weight_class: weightClass, federation, equipment_type: equipment })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSavePRs = async () => {
    setSaving(true)
    if (!isDemo && (user?.id || profile?.id)) {
      await saveProfile(user?.id || profile?.id, {
        pr_squat:    prSquat    !== '' ? Number(prSquat)    : null,
        pr_bench:    prBench    !== '' ? Number(prBench)    : null,
        pr_deadlift: prDeadlift !== '' ? Number(prDeadlift) : null,
      })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Personal Info</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="pp-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="pp-input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bio</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell your team about yourself…"
              className="pp-input w-full resize-none" />
          </div>
          <Button size="sm" onClick={handleSavePersonal} disabled={saving}>
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
          </Button>
        </CardBody>
      </Card>

      {isAthlete && (
        <Card>
          <CardHeader><CardTitle>Athlete Details</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Weight Class</label>
                <select value={weightClass} onChange={e => setWeightClass(e.target.value)} className="pp-input w-full">
                  {['','59kg','66kg','74kg','83kg','93kg','105kg','120kg','120kg+'].map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Federation</label>
                <select value={federation} onChange={e => setFederation(e.target.value)} className="pp-input w-full">
                  {['','USAPL','IPF','USPA','RPS','SPF'].map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Equipment</label>
                <select value={equipment} onChange={e => setEquipment(e.target.value)} className="pp-input w-full">
                  {['','raw','wraps','single_ply','multi_ply'].map(o => <option key={o} value={o}>{o ? o.replace('_',' ') : '— Select —'}</option>)}
                </select>
              </div>
            </div>
            <Button size="sm" onClick={handleSaveAthleteDetails} disabled={saving}>
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </Button>
          </CardBody>
        </Card>
      )}

      {isAthlete && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              Benchmark PRs
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Your current all-time personal records. Coaches use these for programming percentages.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Squat', value: prSquat, setter: setPrSquat },
                { label: 'Bench', value: prBench, setter: setPrBench },
                { label: 'Deadlift', value: prDeadlift, setter: setPrDeadlift },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="9999"
                      step="0.5"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder="—"
                      className="pp-input w-full pr-8"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                      style={{ color: 'var(--text-muted)' }}>kg</span>
                  </div>
                </div>
              ))}
            </div>
            {(prSquat || prBench || prDeadlift) ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(80,165,177,0.06)', border: '1px solid rgba(80,165,177,0.2)', color: 'var(--text-secondary)' }}>
                <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                Total: <strong style={{ color: 'var(--text-primary)' }}>
                  {((Number(prSquat) || 0) + (Number(prBench) || 0) + (Number(prDeadlift) || 0)).toFixed(1)} kg
                </strong>
              </div>
            ) : null}
            <Button size="sm" onClick={handleSavePRs} disabled={saving}>
              {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save PRs</>}
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Email & Password</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email Address</label>
            <input type="email" defaultValue="athlete@powerplus.app" className="pp-input w-full" />
          </div>
          <Button size="sm">Update Email</Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {['Current Password','New Password','Confirm New Password'].map((lbl) => (
            <div key={lbl}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{lbl}</label>
              <input type="password" className="pp-input w-full" />
            </div>
          ))}
          <Button size="sm"><Lock className="w-3.5 h-3.5" /> Update Password</Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-red-400">Delete Account</CardTitle></CardHeader>
        <CardBody>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Permanently delete your account and all associated data.</p>
          <Button variant="danger" size="sm">Delete My Account</Button>
        </CardBody>
      </Card>
    </div>
  )
}

// ── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const groups = [
    { title: 'Workouts', items: [
      { label: 'New workout assigned', desc: 'When coach assigns or updates your program' },
      { label: 'Workout reminders', desc: '30 min before scheduled sessions' },
      { label: 'Coach feedback', desc: 'When a coach comments on your session' },
    ]},
    { title: 'Messaging', items: [
      { label: 'Direct messages', desc: 'When someone sends you a DM' },
      { label: 'Channel mentions', desc: 'When you are @mentioned in a channel' },
      { label: 'Channel activity', desc: 'New messages in channels you follow' },
    ]},
    { title: 'Check-ins', items: [
      { label: 'Daily check-in reminder', desc: 'Reminder to log your daily check-in' },
      { label: 'Weekly check-in', desc: 'Reminder for weekly bodyweight/nutrition check-in' },
    ]},
  ]
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.title}>
          <CardHeader><CardTitle>{g.title}</CardTitle></CardHeader>
          <CardBody className="space-y-0">
            {g.items.map((item, i) => (
              <div key={i} className={`flex items-start justify-between gap-4 py-3 ${i < g.items.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--brand-primary)]"
                    style={{ background: 'var(--bg-hover)' }} />
                </label>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  )
}

// ── Preferences Tab ──────────────────────────────────────────────────────────
function PreferencesTab() {
  const {
    weightUnit, setWeightUnit,
    colorMode, setColorMode,
    gymLocations, preferredLocation, preferredWorkoutTime, preferredDuration,
    setPreferredLocation, setPreferredWorkoutTime, setPreferredDuration,
    addGymLocation, removeGymLocation, setDefaultLocation,
  } = useSettingsStore()

  const [newGymName, setNewGymName] = useState('')
  const [newGymAddress, setNewGymAddress] = useState('')
  const [addingGym, setAddingGym] = useState(false)

  const handleAddGym = () => {
    if (!newGymName.trim()) return
    addGymLocation({ name: newGymName.trim(), address: newGymAddress.trim() })
    setNewGymName('')
    setNewGymAddress('')
    setAddingGym(false)
  }

  return (
    <div className="space-y-4">

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {/* Color mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Theme</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Teal & navy brand palette</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              {[
                { id: 'dark', icon: Moon, label: 'Dark' },
                { id: 'light', icon: Sun, label: 'Light' },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setColorMode(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={colorMode === id
                    ? { background: 'var(--brand-primary)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Color palette preview */}
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Brand Palette</p>
            <div className="flex gap-2">
              {[
                { hex: '#50A5B1', label: 'Teal' },
                { hex: '#F1600D', label: 'Orange' },
                { hex: '#FEF6ED', label: 'Cream' },
                { hex: '#1A265A', label: 'Navy' },
              ].map(({ hex, label }) => (
                <div key={hex} className="flex-1 text-center">
                  <div className="w-full h-8 rounded-lg mb-1 border border-white/10" style={{ background: hex }} />
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Weight unit */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <Scale className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} /> Weight Unit
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Applies across workouts, goals & analytics</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
              {['kg', 'lbs'].map((u) => (
                <button key={u} onClick={() => setWeightUnit(u)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                  style={weightUnit === u
                    ? { background: 'var(--brand-primary)', color: '#fff' }
                    : { color: 'var(--text-secondary)' }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Gym Locations ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
              Gym Locations
            </CardTitle>
            <Button size="xs" variant="outline" onClick={() => setAddingGym(true)}>
              <Plus className="w-3 h-3" /> Add Gym
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {gymLocations.map((loc) => (
            <div key={loc.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{
                background: loc.id === preferredLocation ? 'rgba(80,165,177,0.08)' : 'var(--bg-elevated)',
                border: `1px solid ${loc.id === preferredLocation ? 'rgba(80,165,177,0.3)' : 'var(--border-default)'}`,
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: loc.id === preferredLocation ? 'var(--brand-primary)' : 'var(--bg-hover)' }}>
                <MapPin className="w-3.5 h-3.5" style={{ color: loc.id === preferredLocation ? '#fff' : 'var(--text-muted)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{loc.name}</p>
                {loc.address && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{loc.address}</p>}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {loc.isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(80,165,177,0.15)', color: 'var(--brand-primary)' }}>
                    Default
                  </span>
                )}
                {loc.id !== preferredLocation && (
                  <button onClick={() => setPreferredLocation(loc.id)}
                    className="text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                    title="Set as preferred">
                    Select
                  </button>
                )}
                {loc.id === preferredLocation && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--brand-primary)' }}>
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
                {!loc.isDefault && (
                  <button onClick={() => removeGymLocation(loc.id)}
                    className="p-1 rounded transition-colors hover:text-red-400"
                    style={{ color: 'var(--text-muted)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {addingGym && (
            <div className="space-y-2 pt-1">
              <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>New Location</p>
              <input value={newGymName} onChange={e => setNewGymName(e.target.value)}
                placeholder="Gym name *" className="pp-input w-full" />
              <input value={newGymAddress} onChange={e => setNewGymAddress(e.target.value)}
                placeholder="Address (optional)" className="pp-input w-full" />
              <div className="flex gap-2">
                <Button size="xs" variant="ghost" onClick={() => setAddingGym(false)} className="flex-1">Cancel</Button>
                <Button size="xs" onClick={handleAddGym} className="flex-1">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Workout Time & Duration ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            Default Workout Schedule
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            These defaults are auto-assigned when a new workout session is created. You can always override them per session.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Preferred Start Time
              </label>
              <input type="time" value={preferredWorkoutTime}
                onChange={e => setPreferredWorkoutTime(e.target.value)}
                className="pp-input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Default Duration
              </label>
              <select value={preferredDuration} onChange={e => setPreferredDuration(e.target.value)}
                className="pp-input w-full">
                {['45','60','75','90','105','120'].map(n => <option key={n} value={n}>{n} min</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Preferred Gym Location
            </label>
            <select value={preferredLocation} onChange={e => setPreferredLocation(e.target.value)}
              className="pp-input w-full">
              {gymLocations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
            </select>
          </div>
          <div className="p-3 rounded-xl flex items-start gap-3" style={{ background: 'rgba(80,165,177,0.06)', border: '1px solid rgba(80,165,177,0.2)' }}>
            <Star className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              When you start a workout, it will be automatically tagged with <strong style={{ color: 'var(--text-primary)' }}>{gymLocations.find(l => l.id === preferredLocation)?.name || 'your gym'}</strong> at <strong style={{ color: 'var(--text-primary)' }}>{preferredWorkoutTime}</strong> for <strong style={{ color: 'var(--text-primary)' }}>{preferredDuration} min</strong>.
            </p>
          </div>
          <Button size="sm"><Save className="w-3.5 h-3.5" /> Save Defaults</Button>
        </CardBody>
      </Card>

      {/* ── Display Preferences ────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Display</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {[
            { label: 'Date Format', options: ['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD'] },
            { label: 'Week Starts On', options: ['Sunday','Monday'] },
          ].map((f) => (
            <div key={f.label} className="flex items-center justify-between">
              <label className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</label>
              <select className="pp-input">
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </CardBody>
      </Card>

    </div>
  )
}
