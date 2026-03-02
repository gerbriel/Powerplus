import { useState } from 'react'
import { useAuthStore } from '../lib/store'
import { Button } from './ui/Button'
import { Shield, Zap, Users, UtensilsCrossed, BarChart3, Globe } from 'lucide-react'

const DEMO_ROLES = [
  {
    role: 'super_admin',
    label: 'Platform Admin',
    description: 'Manage all organizations, billing, and platform-wide settings',
    icon: Globe,
    color: 'border-rose-500/40 hover:border-rose-400',
    badgeColor: 'bg-rose-600/20 text-rose-300',
  },
  {
    role: 'admin',
    label: 'Admin / Head Coach',
    description: 'Org overview, all analytics, team management, billing',
    icon: Shield,
    color: 'border-purple-500/40 hover:border-purple-400',
    badgeColor: 'bg-purple-600/20 text-purple-300',
  },
  {
    role: 'coach',
    label: 'Coach / Trainer',
    description: 'Roster management, programming, athlete review queue',
    icon: Zap,
    color: 'border-blue-500/40 hover:border-blue-400',
    badgeColor: 'bg-blue-600/20 text-blue-300',
  },
  {
    role: 'nutritionist',
    label: 'Nutritionist',
    description: 'Nutrition plans, compliance tracking, check-in reviews',
    icon: UtensilsCrossed,
    color: 'border-green-500/40 hover:border-green-400',
    badgeColor: 'bg-green-600/20 text-green-300',
  },
  {
    role: 'athlete',
    label: 'Athlete',
    description: 'Today view, workout logging, nutrition, goals & PRs',
    icon: BarChart3,
    color: 'border-yellow-500/40 hover:border-yellow-400',
    badgeColor: 'bg-yellow-600/20 text-yellow-300',
  },
]

export function LoginPage() {
  const { loginAsDemo } = useAuthStore()
  const [selected, setSelected] = useState(null)

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-800 shadow-lg shadow-purple-500/30 mb-4">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black text-zinc-100 tracking-tight">
          Power<span className="text-purple-400">Plus</span>
        </h1>
        <p className="text-zinc-400 mt-2 text-base max-w-sm mx-auto">
          The all-in-one Powerlifting Team OS — programming, nutrition, analytics, and communication.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {['Programming Engine', 'Real-time Messaging', 'Nutrition Tracking', 'Analytics', 'Meet Planning', 'Video Review'].map((f) => (
          <span key={f} className="text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700 px-3 py-1 rounded-full">{f}</span>
        ))}
      </div>

      {/* Role selector */}
      <div className="w-full max-w-xl">
        <p className="text-sm font-semibold text-zinc-400 text-center mb-4">Choose a role to explore the demo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DEMO_ROLES.map(({ role, label, description, icon: Icon, color, badgeColor }) => (
            <button
              key={role}
              onClick={() => setSelected(role)}
              className={`relative text-left p-4 rounded-xl border bg-zinc-900 transition-all duration-150 ${color} ${selected === role ? 'ring-2 ring-offset-1 ring-offset-zinc-950 ring-purple-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${badgeColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
              </div>
              {selected === role && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <Button
          className="w-full mt-4"
          size="lg"
          disabled={!selected}
          onClick={() => loginAsDemo(selected)}
        >
          Enter as {selected ? DEMO_ROLES.find(r => r.role === selected)?.label : '…'}
        </Button>

        <p className="text-xs text-zinc-600 text-center mt-4">
          Demo mode — no account required. Connect Supabase to enable real auth.
        </p>
      </div>
    </div>
  )
}
