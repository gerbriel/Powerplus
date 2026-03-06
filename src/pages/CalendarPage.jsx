import { useState } from 'react'
import { Plus, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Video, Dumbbell, Trophy, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { cn } from '../lib/utils'
import { useAuthStore } from '../lib/store'
import { saveEvent } from '../lib/db'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const SAMPLE_EVENTS = {
  '2026-02-28': [
    { type: 'workout', label: 'Heavy Squat', time: '16:00', color: 'bg-purple-500' },
    { type: 'reminder', label: 'Nutrition log', time: '20:00', color: 'bg-orange-500' },
  ],
  '2026-03-03': [
    { type: 'workout', label: 'Bench Focus', time: '17:00', color: 'bg-purple-500' },
  ],
  '2026-03-05': [
    { type: 'workout', label: 'Heavy Deadlift', time: '16:00', color: 'bg-purple-500' },
  ],
  '2026-03-07': [
    { type: 'workout', label: 'Volume Bench', time: '10:00', color: 'bg-purple-500' },
  ],
  '2026-03-10': [
    { type: 'meeting', label: '1:1 w/ Coach', time: '09:00', color: 'bg-blue-500' },
  ],
  '2026-03-15': [
    { type: 'deadline', label: 'Meet Registration Due', time: '', color: 'bg-red-500' },
  ],
  '2026-04-12': [
    { type: 'meet', label: 'Spring Classic 2026', time: '08:00', color: 'bg-yellow-500' },
  ],
}

export function CalendarPage() {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState(null)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [eventForm, setEventForm] = useState({ type: 'meeting', title: '', date: '', time: '', meeting_url: '' })
  const updEvent = (k, v) => setEventForm(f => ({ ...f, [k]: v }))

  const handleAddEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) return
    if (!isDemo && profile?.id) {
      const startTime = eventForm.time
        ? `${eventForm.date}T${eventForm.time}:00`
        : `${eventForm.date}T00:00:00`
      await saveEvent(profile.id, activeOrgId, {
        title: eventForm.title,
        event_type: eventForm.type.toLowerCase().replace(/\s+/g, '_'),
        start_time: startTime,
        meeting_url: eventForm.meeting_url,
      })
    }
    setEventForm({ type: 'meeting', title: '', date: '', time: '', meeting_url: '' })
    setAddEventOpen(false)
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Monday-first
  const totalDays = lastDay.getDate()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Calendar</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your schedule and upcoming events</p>
        </div>
        <Button size="sm" onClick={() => setAddEventOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Calendar */}
        <div className="md:col-span-2">
          <Card className="p-0 overflow-hidden">
            {/* Month nav */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
              <button onClick={prevMonth} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-sm font-bold text-zinc-100">{MONTH_NAMES[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="h-20 border-b border-r border-zinc-800/50" />
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const events = (isDemo ? SAMPLE_EVENTS[dateKey] : null) || []
                const todayDate = new Date()
                const todayKey = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
                const isToday = dateKey === todayKey
                const isSelected = selectedDay === dateKey
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(dateKey)}
                    className={cn(
                      'h-20 border-b border-r border-zinc-800/50 p-1.5 cursor-pointer hover:bg-zinc-800/40 transition-colors',
                      isSelected && 'bg-purple-500/10',
                    )}
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1',
                      isToday ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    )}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {events.slice(0, 2).map((ev, ei) => (
                        <div key={ei} className={cn('text-xs px-1.5 py-0.5 rounded font-medium truncate text-white', ev.color)}>
                          {ev.label}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <div className="text-xs text-zinc-500 px-1">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader><CardTitle className="text-xs">Event Types</CardTitle></CardHeader>
            <div className="space-y-1.5">
              {[
                { label: 'Workout', color: 'bg-purple-500' },
                { label: 'Meeting', color: 'bg-blue-500' },
                { label: 'Reminder', color: 'bg-orange-500' },
                { label: 'Deadline', color: 'bg-red-500' },
                { label: 'Meet / Competition', color: 'bg-yellow-500' },
              ].map((e) => (
                <div key={e.label} className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className={cn('w-3 h-3 rounded-full flex-shrink-0', e.color)} />
                  {e.label}
                </div>
              ))}
            </div>
          </Card>

          {/* Upcoming events */}
          <Card>
            <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
            <div className="space-y-2.5">
              {isDemo ? [
                { date: 'Today', label: 'Heavy Squat', time: '4:00 PM', icon: Dumbbell, color: 'text-purple-400' },
                { date: 'Mar 10', label: '1:1 with Coach', time: '9:00 AM', icon: Users, color: 'text-blue-400' },
                { date: 'Mar 15', label: 'Meet Registration Due', time: 'Deadline', icon: Trophy, color: 'text-red-400' },
                { date: 'Apr 12', label: 'Spring Classic 2026', time: '8:00 AM', icon: Trophy, color: 'text-yellow-400' },
              ].map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn('mt-0.5', e.color)}>
                    <e.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200">{e.label}</p>
                    <p className="text-xs text-zinc-500">{e.date} · {e.time}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-zinc-600 text-center py-4">No upcoming events</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Event Modal */}
      <Modal open={addEventOpen} onClose={() => setAddEventOpen(false)} title="Add Event" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Event Type</label>
            <select value={eventForm.type} onChange={e => updEvent('type', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <option>Meeting</option>
              <option>Session (Online)</option>
              <option>In-Person Session</option>
              <option>Deadline</option>
              <option>Competition</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
            <input type="text" value={eventForm.title} onChange={e => updEvent('title', e.target.value)}
              placeholder="Event title…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
              <input type="date" value={eventForm.date} onChange={e => updEvent('date', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Time</label>
              <input type="time" value={eventForm.time} onChange={e => updEvent('time', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meeting Link (optional)</label>
            <input type="url" value={eventForm.meeting_url} onChange={e => updEvent('meeting_url', e.target.value)}
              placeholder="https://zoom.us/j/…" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <Button className="w-full" onClick={handleAddEvent} disabled={!eventForm.title.trim() || !eventForm.date}>
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </div>
      </Modal>
    </div>
  )
}
