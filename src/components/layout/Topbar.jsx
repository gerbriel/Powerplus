import { Bell, Search, Menu, LogOut, User, X, Users, Dumbbell, Target, Trophy, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore, useAuthStore } from '../../lib/store'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { cn, formatRelativeTime } from '../../lib/utils'
import { MOCK_NOTIFICATIONS, MOCK_ATHLETES, MOCK_WEEK_SCHEDULE, MOCK_PAST_WORKOUTS, MOCK_GOALS, MOCK_MEETS, MOCK_MESSAGES } from '../../lib/mockData'
import { useState, useMemo, useRef, useEffect } from 'react'

export function Topbar() {
  const navigate = useNavigate()
  const { setMobileNavOpen, notificationsOpen, setNotificationsOpen } = useUIStore()
  const { profile, handleSignOut, isDemo } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const searchRef = useRef(null)
  const dropdownRef = useRef(null)

  const notifications = isDemo ? MOCK_NOTIFICATIONS : []
  const athletes      = isDemo ? MOCK_ATHLETES : []
  const weekSchedule  = isDemo ? MOCK_WEEK_SCHEDULE : []
  const pastWorkouts  = isDemo ? MOCK_PAST_WORKOUTS : []
  const goals         = isDemo ? MOCK_GOALS : []
  const meets         = isDemo ? MOCK_MEETS : []
  const messages      = isDemo ? MOCK_MESSAGES : []

  const unread = notifications.filter((n) => !n.read).length

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out = []

    athletes.forEach(a => {
      if (a.full_name.toLowerCase().includes(q)) {
        out.push({ type: 'athlete', icon: Users, label: a.full_name, sub: `${a.weight_class} · ${a.federation}`, action: () => navigate('/app/roster'), color: 'text-blue-400' })
      }
    })

    ;[...weekSchedule, ...pastWorkouts].forEach(s => {
      if (s.name?.toLowerCase().includes(q)) {
        out.push({ type: 'workout', icon: Dumbbell, label: s.name, sub: s.date || s.scheduled_date || '', action: () => navigate('/app/workout'), color: 'text-purple-400' })
      }
    })

    goals.forEach(g => {
      if (g.title.toLowerCase().includes(q)) {
        out.push({ type: 'goal', icon: Target, label: g.title, sub: `${g.goal_type} · Target: ${g.target_value}${g.target_unit}`, action: () => navigate('/app/goals'), color: 'text-yellow-400' })
      }
    })

    meets.forEach(m => {
      if (m.name.toLowerCase().includes(q)) {
        out.push({ type: 'meet', icon: Trophy, label: m.name, sub: `${m.meet_date} · ${m.location}`, action: () => navigate('/app/meets'), color: 'text-orange-400' })
      }
    })

    messages.forEach(m => {
      if (m.content.toLowerCase().includes(q)) {
        out.push({ type: 'message', icon: MessageSquare, label: m.sender.name, sub: m.content.slice(0, 60) + (m.content.length > 60 ? '…' : ''), action: () => navigate('/app/messaging'), color: 'text-green-400' })
      }
    })

    return out.slice(0, 8)
  }, [query, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelect(item) {
    item.action()
    setQuery('')
    setSearchFocused(false)
    setActiveIdx(-1)
  }

  function handleKeyDown(e) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setQuery('')
      setSearchFocused(false)
      setActiveIdx(-1)
      searchRef.current?.blur()
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setSearchFocused(false)
        setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = searchFocused && query.trim().length > 0

  const typeLabels = { athlete: 'Athlete', workout: 'Workout', goal: 'Goal', meet: 'Meet', message: 'Message' }

  return (
    <header className="h-16 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu */}
      <button
        className="md:hidden text-zinc-400 hover:text-zinc-100"
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md hidden sm:block relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search athletes, workouts, goals…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSearchFocused(false); setActiveIdx(-1) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {results.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500">No results for "{query}"</div>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {results.map((item, i) => (
                  <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); handleSelect(item) }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      activeIdx === i ? 'bg-zinc-800' : 'hover:bg-zinc-800/60'
                    )}
                  >
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', 'bg-zinc-800')}>
                      <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{item.label}</p>
                      {item.sub && <p className="text-xs text-zinc-500 truncate">{item.sub}</p>}
                    </div>
                    <span className="text-xs text-zinc-600 flex-shrink-0">{typeLabels[item.type]}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="px-4 py-2 border-t border-zinc-800 flex gap-3 text-xs text-zinc-600">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>
          {notificationsOpen && <NotificationsPanel onClose={() => setNotificationsOpen(false)} />}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Avatar name={profile?.full_name} role={profile?.role} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-zinc-200 leading-none">{profile?.display_name || profile?.full_name}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">{profile?.role}</p>
            </div>
          </button>
          {profileOpen && (
            <ProfileDropdown onClose={() => setProfileOpen(false)} profile={profile} handleSignOut={handleSignOut} />
          )}
        </div>
      </div>
    </header>
  )
}

function NotificationsPanel({ onClose }) {
  const { isDemo } = useAuthStore()
  const notifications = isDemo ? MOCK_NOTIFICATIONS : []
  const notifTypeColor = {
    workout_reminder: 'text-purple-400',
    message: 'text-blue-400',
    pr: 'text-yellow-400',
    alert: 'text-red-400',
  }
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-100">Notifications</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
        {notifications.map((n) => (
          <div key={n.id} className={cn('px-4 py-3 hover:bg-zinc-800/50 transition-colors', !n.read && 'bg-purple-500/5')}>
            <div className="flex items-start gap-3">
              <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', !n.read ? 'bg-purple-500' : 'bg-transparent')} />
              <div>
                <p className={cn('text-xs font-semibold', notifTypeColor[n.type] || 'text-zinc-200')}>{n.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{n.body}</p>
                <p className="text-xs text-zinc-600 mt-1">{formatRelativeTime(n.created_at)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileDropdown({ onClose, profile, handleSignOut }) {
  const navigate = useNavigate()
  return (
    <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <p className="text-xs font-semibold text-zinc-200">{profile?.full_name}</p>
        <p className="text-xs text-zinc-500">{profile?.email}</p>
      </div>
      <div className="p-1">
        <button
          onClick={() => { navigate('/app/settings'); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <User className="w-4 h-4" />Profile & Settings
        </button>
        <button
          onClick={async () => { onClose(); await handleSignOut(); navigate('/') }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />Sign Out
        </button>
      </div>
    </div>
  )
}
