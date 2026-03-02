import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../lib/store'

const DEMO_ROLES = [
  {
    id: 'head_coach',
    label: 'Head Coach',
    emoji: '🏋️',
    description: 'Full roster access, program builder, org analytics, billing.',
  },
  {
    id: 'athlete',
    label: 'Athlete',
    emoji: '⚡',
    description: 'Personal dashboard, workout log, nutrition tracking, today view.',
  },
  {
    id: 'assistant_coach',
    label: 'Assistant Coach',
    emoji: '📋',
    description: 'Roster view, assign workouts, monitor athlete progress.',
  },
  {
    id: 'nutritionist',
    label: 'Nutritionist',
    emoji: '🥗',
    description: 'Meal plans, recipe library, prep logs, shopping lists.',
  },
  {
    id: 'sport_scientist',
    label: 'Sport Scientist',
    emoji: '📊',
    description: 'Analytics dashboards, load management, readiness scores.',
  },
  {
    id: 'org_admin',
    label: 'Org Admin',
    emoji: '🔑',
    description: 'Members, roles, settings, integrations, subscription.',
  },
]

export default function DemoPage() {
  const navigate = useNavigate()
  const { loginAsDemo } = useAuthStore()
  const [selected, setSelected] = useState('head_coach')
  const [loading, setLoading] = useState(false)

  const enter = async () => {
    setLoading(true)
    await loginAsDemo(selected)
    navigate('/app', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-zinc-100">
            Power<span className="text-purple-400">Plus</span>
          </span>
        </Link>
        <Link to="/signup" className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors">
          Create real account
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-purple-400 bg-purple-400/10 border border-purple-400/20 px-3 py-1 rounded-full">
              DEMO MODE
            </span>
            <h1 className="text-2xl font-black text-zinc-100 mt-4 mb-2">
              Explore PowerPlus
            </h1>
            <p className="text-sm text-zinc-400">
              Choose a role to see the app from that perspective. No account required.
            </p>
          </div>

          {/* Role grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
            {DEMO_ROLES.map(role => (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  selected === role.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl leading-none mt-0.5">{role.emoji}</span>
                  <div>
                    <p className={`text-sm font-semibold mb-0.5 ${selected === role.id ? 'text-purple-300' : 'text-zinc-200'}`}>
                      {role.label}
                    </p>
                    <p className="text-xs text-zinc-500 leading-snug">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Enter button */}
          <button
            onClick={enter}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            Enter as {DEMO_ROLES.find(r => r.id === selected)?.label}
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Footer note */}
          <p className="text-xs text-zinc-600 text-center mt-5">
            Demo data is read-only and resets on refresh.{' '}
            <Link to="/signup" className="text-purple-500 hover:text-purple-400 font-semibold">
              Sign up
            </Link>{' '}
            to save your work.
          </p>
        </div>
      </div>
    </div>
  )
}
