import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Zap, BarChart3, UtensilsCrossed, Calendar, MessageSquare,
  Trophy, Target, CheckCircle, ChevronRight, Menu, X, ArrowRight,
  Users, TrendingUp, ClipboardList, Dumbbell
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'For Coaches', href: '#coaches' },
  { label: 'For Athletes', href: '#athletes' },
  { label: 'Pricing', href: '#pricing' },
]

const FEATURES = [
  {
    icon: Dumbbell,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    title: 'Smart Programming Engine',
    desc: 'Build multi-week blocks with RPE/percentage-based templates. Auto-progresses training maxes and assigns workouts to individual athletes or the whole team.',
  },
  {
    icon: UtensilsCrossed,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    title: 'Full Nutrition OS',
    desc: 'Meal plan boards, batch-cook prep logs, pantry tracking, and weekly shopping lists. Nutritionist, coach, or athlete — everyone has the right view.',
  },
  {
    icon: BarChart3,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    title: 'Advanced Analytics',
    desc: 'Track strength curves, compliance trends, bodyweight, and meet performance over time. Spot weak points before they become problems.',
  },
  {
    icon: MessageSquare,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    title: 'Team Messaging',
    desc: 'Channels, DMs, announcements, and a wins board — all inside the platform. No more scattered group chats.',
  },
  {
    icon: Trophy,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    title: 'Meet Management',
    desc: 'Plan competition calendars, track opening attempts, record results, and compare dots/wilks across your roster.',
  },
  {
    icon: Target,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    title: 'Goals & Check-ins',
    desc: 'Athletes log daily wellness, set goals, and report pain. Coaches get a live readiness feed before programming each week.',
  },
]

const COACH_BENEFITS = [
  'Full roster view with per-athlete health, compliance & performance',
  'Assign programs to individuals or whole training groups',
  'Review and comment on every logged workout set',
  'Create nutrition plans and monitor daily intake',
  'Invite athletes via email — they join in seconds',
  'Role-based access: head coach, coach, nutritionist, analyst',
]

const ATHLETE_BENEFITS = [
  'Today view: your next session, macros, and goals in one scroll',
  'Log workouts on mobile or desktop — sets, reps, RPE, video',
  'Track your pantry and shopping list from the meal plan',
  'Submit daily check-ins and flag pain areas',
  'See your PR history and strength trends over time',
  'Direct messaging with your coach',
]

const PLANS = [
  {
    name: 'Solo Athlete',
    price: 'Free',
    sub: 'Forever',
    highlight: false,
    features: ['Personal workout log', 'Nutrition & pantry tracking', 'Goals & PRs', 'Meet calendar'],
  },
  {
    name: 'Team Pro',
    price: '$49',
    sub: 'per month',
    highlight: true,
    badge: 'Most Popular',
    features: ['Up to 30 athletes', '5 staff seats', 'Full analytics', 'Team messaging', 'Programming engine', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    sub: 'contact us',
    highlight: false,
    features: ['Unlimited athletes', 'Custom integrations', 'Dedicated onboarding', 'SLA & white-label'],
  },
]

export function LandingPage() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-5 flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => window.scrollTo(0,0)} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight">
              Power<span className="text-purple-400">Plus</span>
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5"
            >
              Log in
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get started free
            </button>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden text-zinc-400" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-5 pb-5 pt-3 flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} className="text-sm text-zinc-400 hover:text-zinc-100 py-1">
                {l.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={() => navigate('/login')} className="text-sm text-zinc-300 border border-zinc-700 rounded-lg py-2">Log in</button>
              <button onClick={() => navigate('/signup')} className="text-sm font-semibold bg-purple-600 text-white rounded-lg py-2">Get started free</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-5 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap className="w-3.5 h-3.5" />
            Built for powerlifters, by powerlifters
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none mb-6">
            The OS your{' '}
            <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
              powerlifting team
            </span>{' '}
            actually needs
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Programming, nutrition, analytics, and communication — one platform for coaches
            and athletes to do their best work together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-7 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-purple-500/25"
            >
              Start free today
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-semibold px-7 py-3.5 rounded-xl text-base transition-colors"
            >
              Explore the demo
            </button>
          </div>

          <p className="text-xs text-zinc-600 mt-4">No credit card required · Free plan available</p>
        </div>

        {/* Mock app preview */}
        <div className="mt-16 max-w-5xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl shadow-purple-500/10">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-zinc-600 font-mono">powerplus.app</span>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4 text-left">
              {/* Fake sidebar */}
              <div className="col-span-1 space-y-2">
                {['Today', 'Workout', 'Nutrition', 'Analytics', 'Roster', 'Meets', 'Messaging'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${i === 0 ? 'bg-purple-600/20 text-purple-300' : 'text-zinc-500'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    {item}
                  </div>
                ))}
              </div>
              {/* Fake content */}
              <div className="col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-24 bg-zinc-700 rounded mb-1" />
                    <div className="h-3 w-36 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-8 w-20 bg-purple-600/30 rounded-lg" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[['Squat', '240kg', '+5kg'], ['Bench', '165kg', '+2.5kg'], ['Dead', '280kg', 'PR!']].map(([lift, val, delta]) => (
                    <div key={lift} className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-xs text-zinc-500">{lift}</p>
                      <p className="text-lg font-bold text-zinc-100 mt-0.5">{val}</p>
                      <p className="text-xs text-green-400">{delta}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 space-y-2">
                  {['5x3 Squat @ 87.5%', '4x4 Pause Bench @ 80%', '3x5 Romanian DL @ 72.5%'].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded border border-purple-500/50 bg-purple-500/10" />
                      <span className="text-xs text-zinc-400">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-5 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">
              Everything your team needs
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              One platform replaces spreadsheets, group chats, and five separate apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
                <div className={`inline-flex p-3 rounded-xl ${bg} mb-4`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-base font-bold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Coaches ──────────────────────────────────────────── */}
      <section id="coaches" className="py-24 px-5 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <Users className="w-3.5 h-3.5" />
              For Coaches
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5">
              Run your entire team from one dashboard
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Stop chasing athletes across apps. PowerPlus puts your full roster,
              their compliance, their lifts, and your programming all in one place.
            </p>
            <ul className="space-y-3">
              {COACH_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="mt-8 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Set up your team <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Roster Overview</p>
            {[
              { name: 'Jordan Blake', status: 'On track', compliance: 94, pr: '+12.5kg total' },
              { name: 'Samantha Price', status: 'Check in needed', compliance: 71, pr: '—' },
              { name: 'Marcus Webb', status: 'On track', compliance: 88, pr: '+5kg squat' },
            ].map(({ name, status, compliance, pr }) => (
              <div key={name} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-200">{name}</p>
                  <p className={`text-xs ${status === 'On track' ? 'text-green-400' : 'text-yellow-400'}`}>{status}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-100">{compliance}%</p>
                  <p className="text-xs text-zinc-500">{pr}</p>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[['12', 'Athletes'], ['94%', 'Avg compliance'], ['3', 'Meets upcoming']].map(([val, label]) => (
                <div key={label} className="bg-zinc-800 rounded-lg p-3 text-center">
                  <p className="text-xl font-black text-purple-400">{val}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── For Athletes ─────────────────────────────────────────── */}
      <section id="athletes" className="py-24 px-5 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          {/* Today card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 order-last md:order-first">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Today · Week 6 · Day 3</p>
                <p className="text-lg font-bold text-zinc-100 mt-0.5">Squat / Upper Accessory</p>
              </div>
              <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full font-semibold">Ready</span>
            </div>
            <div className="space-y-2.5 mb-5">
              {[
                { lift: 'Back Squat', sets: '5x3 @ 87.5% (202.5kg)', done: true },
                { lift: 'Pause Squat', sets: '3x3 @ 75% (172.5kg)', done: true },
                { lift: 'SSB Squat', sets: '4x6 @ RPE 7', done: false },
                { lift: 'Leg Press', sets: '3x12', done: false },
              ].map(({ lift, sets, done }) => (
                <div key={lift} className={`flex items-center gap-3 p-3 rounded-lg ${done ? 'bg-green-500/5 border border-green-500/20' : 'bg-zinc-800'}`}>
                  <div className={`w-4 h-4 rounded flex-shrink-0 ${done ? 'bg-green-500 border-green-500' : 'border border-zinc-600'} flex items-center justify-center`}>
                    {done && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{lift}</p>
                    <p className="text-xs text-zinc-500">{sets}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['2,850', 'kcal target'], ['210g', 'protein'], ['7:45', 'sleep']].map(([val, label]) => (
                <div key={label} className="bg-zinc-800 rounded-lg p-2.5 text-center">
                  <p className="text-base font-bold text-zinc-100">{val}</p>
                  <p className="text-xs text-zinc-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <TrendingUp className="w-3.5 h-3.5" />
              For Athletes
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-5">
              Everything you need to train smarter
            </h2>
            <p className="text-zinc-400 mb-8 leading-relaxed">
              Your coach's program, your macros, your goals — one app, always in your pocket.
              Log workouts in seconds and track your progress over every block.
            </p>
            <ul className="space-y-3">
              {ATHLETE_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-zinc-300">
                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate('/signup')}
              className="mt-8 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Create your free account <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Simple pricing</h2>
            <p className="text-zinc-400 text-lg">Start free. Scale as your team grows.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(({ name, price, sub, highlight, badge, features }) => (
              <div
                key={name}
                className={`relative rounded-2xl p-6 border flex flex-col ${
                  highlight
                    ? 'bg-purple-600/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {badge}
                  </div>
                )}
                <div className="mb-6">
                  <p className="text-sm font-semibold text-zinc-400 mb-2">{name}</p>
                  <p className={`text-4xl font-black ${highlight ? 'text-purple-300' : 'text-zinc-100'}`}>{price}</p>
                  <p className="text-xs text-zinc-500 mt-1">{sub}</p>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-purple-400' : 'text-zinc-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(price === 'Custom' ? '#pricing' : '/signup')}
                  className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    highlight
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300'
                  }`}
                >
                  {price === 'Custom' ? 'Contact us' : 'Get started'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-24 px-5 border-t border-zinc-800/50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-5">
            Ready to build a stronger team?
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Join coaches and athletes who've moved their entire operation into PowerPlus.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors shadow-lg shadow-purple-500/25"
            >
              Start free today <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/demo')}
              className="flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-semibold px-8 py-3.5 rounded-xl text-base transition-colors"
            >
              Explore demo first
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 px-5 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-purple-800 flex items-center justify-center">
              <Shield className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold">Power<span className="text-purple-400">Plus</span></span>
          </div>
          <p className="text-xs text-zinc-600">© 2026 PowerPlus. Built for powerlifters.</p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Contact'].map((l) => (
              <a key={l} href="#" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
