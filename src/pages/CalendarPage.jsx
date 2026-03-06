import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Dumbbell, Trophy, Users, Trash2, Edit2, X, Save, Check, Video, MapPin } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { cn, formatRelativeTime } from '../lib/utils'
import { useAuthStore, useCalendarStore } from '../lib/store'
import { saveEvent, updateEvent, deleteCalendarEvent } from '../lib/db'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Demo events are offset from today so they're always in the near future
function buildDemoEvents() {
  const today = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  const offset = (days) => { const d = new Date(today); d.setDate(d.getDate() + days); return fmt(d) }
  return [
    { id: 's1', event_type: 'session',  title: 'Heavy Squat',            start_time: `${offset(-1)}T16:00:00`, location: 'Main gym' },
    { id: 's2', event_type: 'other',    title: 'Nutrition log',           start_time: `${offset(0)}T20:00:00`,  location: '' },
    { id: 's3', event_type: 'session',  title: 'Bench Focus',             start_time: `${offset(2)}T17:00:00`,  location: '' },
    { id: 's4', event_type: 'meeting',  title: '1:1 w/ Coach',            start_time: `${offset(4)}T09:00:00`,  meeting_url: 'https://zoom.us/j/example' },
    { id: 's5', event_type: 'deadline', title: 'Meet Registration Due',   start_time: `${offset(9)}T00:00:00`,  location: '' },
    { id: 's6', event_type: 'meet',     title: 'Spring Classic 2026',     start_time: `${offset(37)}T08:00:00`, location: 'Convention Center' },
  ]
}

const EVENT_COLORS = {
  session:  'bg-purple-500',
  meeting:  'bg-blue-500',
  meet:     'bg-yellow-500',
  deadline: 'bg-red-500',
  other:    'bg-orange-500',
}

const EVENT_ICONS = {
  session:  Dumbbell,
  meeting:  Users,
  meet:     Trophy,
  deadline: Trophy,
  other:    Trophy,
}

const BLANK_FORM = { title: '', event_type: 'meeting', date: '', time: '', end_date: '', end_time: '', location: '', meeting_url: '', description: '', attendee_ids: '' }

function fmtTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return '' }
}

export function CalendarPage() {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const calStore = useCalendarStore()
  const { events: storeEvents, loadEvents, addEvent: storeAdd, updateEvent: storeUpdate, removeEvent: storeRemove } = calStore

  const [year, setYear]           = useState(new Date().getFullYear())
  const [month, setMonth]         = useState(new Date().getMonth())
  const [addOpen, setAddOpen]     = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [form, setForm]           = useState(BLANK_FORM)
  const [saving, setSaving]       = useState(false)
  const [draggedId, setDraggedId] = useState(null)

  // Load events on mount and whenever org changes (store guards against redundant fetches)
  useEffect(() => {
    if (!isDemo && profile?.id) {
      loadEvents(activeOrgId, profile.id)
    }
  }, [isDemo, activeOrgId, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build events map: dateKey → events[]
  const allEvents = isDemo ? buildDemoEvents() : storeEvents

  const eventsByDate = allEvents.reduce((map, ev) => {
    const key = (ev.start_time ?? '').slice(0, 10)
    if (!key) return map
    if (!map[key]) map[key] = []
    map[key].push(ev)
    return map
  }, {})

  // Calendar grid helpers
  const firstDay  = new Date(year, month, 1)
  const lastDay   = new Date(year, month + 1, 0)
  const startDow  = (firstDay.getDay() + 6) % 7 // Mon-first
  const totalDays = lastDay.getDate()

  const cells = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const todayDate = new Date()
  const todayKey  = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`

  // Upcoming = future events sorted ascending, first 6
  const upcoming = allEvents
    .filter(ev => ev.start_time && ev.start_time.slice(0,10) >= todayKey)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .slice(0, 6)

  // ── Drag-and-drop handlers ──
  const handleDragStart = useCallback((e, eventId) => {
    e.dataTransfer.setData('eventId', eventId)
    setDraggedId(eventId)
  }, [])

  const handleDrop = useCallback(async (e, dateKey) => {
    e.preventDefault()
    const eventId = e.dataTransfer.getData('eventId')
    setDraggedId(null)
    if (!eventId) return
    const existing = allEvents.find(ev => ev.id === eventId)
    if (!existing) return
    const existingTime = existing.start_time?.slice(11) ?? '00:00:00'
    const newStart     = `${dateKey}T${existingTime}`
    const prevStart    = existing.start_time

    // Optimistic update
    storeUpdate(eventId, { start_time: newStart })

    if (!isDemo) {
      const result = await updateEvent(eventId, { start_time: newStart })
      if (!result) {
        // Revert on DB failure
        storeUpdate(eventId, { start_time: prevStart })
      }
    }
  }, [allEvents, isDemo, storeUpdate])

  // ── Add event ──
  const openAdd = (dateKey) => {
    setForm({ ...BLANK_FORM, date: dateKey ?? todayKey })
    setEditEvent(null)
    setAddOpen(true)
  }

  const openEdit = (ev) => {
    const dateStr = (ev.start_time ?? '').slice(0, 10)
    const timeStr = (ev.start_time ?? '').slice(11, 16)
    setForm({
      title:        ev.title ?? '',
      event_type:   ev.event_type ?? 'meeting',
      date:         dateStr,
      time:         timeStr,
      end_date:     (ev.end_time ?? '').slice(0, 10),
      end_time:     (ev.end_time ?? '').slice(11, 16),
      location:     ev.location ?? '',
      meeting_url:  ev.meeting_url ?? '',
      description:  ev.description ?? '',
      attendee_ids: (ev.attendee_ids ?? []).join(', '),
    })
    setEditEvent(ev)
    setAddOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return
    setSaving(true)

    const startTime    = form.time ? `${form.date}T${form.time}:00` : `${form.date}T00:00:00`
    const endTime      = form.end_date ? (form.end_time ? `${form.end_date}T${form.end_time}:00` : `${form.end_date}T00:00:00`) : null
    const attendeeIds  = form.attendee_ids
      ? form.attendee_ids.split(',').map(s => s.trim()).filter(Boolean)
      : []

    const payload = {
      title:        form.title,
      event_type:   form.event_type,
      start_time:   startTime,
      end_time:     endTime,
      location:     form.location,
      meeting_url:  form.meeting_url,
      description:  form.description,
      attendee_ids: attendeeIds,
    }

    if (editEvent) {
      // Optimistic update
      storeUpdate(editEvent.id, payload)
      if (!isDemo) {
        const result = await updateEvent(editEvent.id, payload)
        if (!result) {
          // Revert store on DB failure
          storeUpdate(editEvent.id, editEvent)
        }
      }
    } else {
      // Optimistic create
      const tempId = `tmp-${Date.now()}`
      storeAdd({ id: tempId, org_id: activeOrgId, created_by: profile?.id, ...payload })

      if (!isDemo && profile?.id) {
        const saved = await saveEvent(profile.id, activeOrgId, payload)
        if (saved?.id) {
          storeRemove(tempId)
          storeAdd({ ...saved })
        } else {
          // Revert on DB failure
          storeRemove(tempId)
        }
      }
    }

    setSaving(false)
    setAddOpen(false)
    setForm(BLANK_FORM)
    setEditEvent(null)
  }

  const handleDelete = async (ev) => {
    storeRemove(ev.id)
    if (!isDemo && !ev.id.startsWith('tmp')) {
      await deleteCalendarEvent(ev.id)
    }
    setAddOpen(false)
    setEditEvent(null)
    setForm(BLANK_FORM)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Calendar</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your schedule and upcoming events</p>
        </div>
        <Button size="sm" onClick={() => openAdd(null)}>
          <Plus className="w-3.5 h-3.5" /> Add Event
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* ── Calendar grid ── */}
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
              {WEEKDAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-zinc-500">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} className="h-24 border-b border-r border-zinc-800/50" />
                const dateKey = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                const dayEvents = eventsByDate[dateKey] ?? []
                const isToday = dateKey === todayKey
                return (
                  <div
                    key={day}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, dateKey)}
                    onClick={() => openAdd(dateKey)}
                    className="h-24 border-b border-r border-zinc-800/50 p-1.5 cursor-pointer hover:bg-zinc-800/30 transition-colors group relative"
                  >
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 mx-auto',
                      isToday ? 'bg-purple-600 text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                    )}>
                      {day}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          draggable={!isDemo}
                          onDragStart={isDemo ? undefined : e => { e.stopPropagation(); handleDragStart(e, ev.id) }}
                          onDragEnd={() => setDraggedId(null)}
                          onClick={e => { e.stopPropagation(); openEdit(ev) }}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium truncate text-white cursor-pointer hover:opacity-80 transition-opacity',
                            EVENT_COLORS[ev.event_type] ?? 'bg-orange-500',
                            draggedId === ev.id && 'opacity-40'
                          )}
                          title={ev.title}
                        >
                          {fmtTime(ev.start_time) && <span className="opacity-70 mr-1">{fmtTime(ev.start_time)}</span>}
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-zinc-500 px-1">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
          {!isDemo && (
            <p className="text-xs text-zinc-600 mt-2 text-center">Drag events to reschedule · Click event to edit · Click day to add</p>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader><CardTitle className="text-xs">Event Types</CardTitle></CardHeader>
            <div className="space-y-1.5">
              {[
                { label: 'Session',            color: 'bg-purple-500' },
                { label: 'Meeting',            color: 'bg-blue-500' },
                { label: 'Meet / Competition', color: 'bg-yellow-500' },
                { label: 'Deadline',           color: 'bg-red-500' },
                { label: 'Other',              color: 'bg-orange-500' },
              ].map(e => (
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
              {upcoming.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center py-4">No upcoming events</p>
              ) : upcoming.map(ev => {
                const Icon = EVENT_ICONS[ev.event_type] ?? Trophy
                const colorClass = (EVENT_COLORS[ev.event_type] ?? 'bg-orange-500').replace('bg-', 'text-')
                const dateLabel = ev.start_time?.slice(0,10) === todayKey ? 'Today' : new Date(ev.start_time + (ev.start_time.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <button key={ev.id} onClick={() => openEdit(ev)} className="w-full flex items-start gap-3 text-left hover:bg-zinc-800/40 rounded-xl p-1.5 -mx-1.5 transition-colors">
                    <div className={cn('mt-0.5', colorClass)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{ev.title}</p>
                      <p className="text-xs text-zinc-500">{dateLabel}{fmtTime(ev.start_time) ? ` · ${fmtTime(ev.start_time)}` : ''}</p>
                      {ev.location && <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5" />{ev.location}</p>}
                      {ev.meeting_url && <p className="text-xs text-blue-400/70 flex items-center gap-1 mt-0.5"><Video className="w-2.5 h-2.5" />Online</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Add / Edit Event Modal ── */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditEvent(null); setForm(BLANK_FORM) }} title={editEvent ? 'Edit Event' : 'Add Event'} size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Event Type</label>
            <select value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              <option value="meeting">Meeting</option>
              <option value="session">Session / Workout</option>
              <option value="meet">Meet / Competition</option>
              <option value="deadline">Deadline</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title…" maxLength={200}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Start Time</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">End Time</label>
              <input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Location</label>
            <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Main gym, Room 3…" maxLength={300}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meeting Link (optional)</label>
            <input type="url" value={form.meeting_url} onChange={e => setForm(f => ({ ...f, meeting_url: e.target.value }))}
              placeholder="https://zoom.us/j/…" maxLength={500}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Optional notes…" maxLength={1000}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            {editEvent && !isDemo && (
              <Button variant="destructive" onClick={() => handleDelete(editEvent)} className="flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" className="flex-1" onClick={() => { setAddOpen(false); setEditEvent(null); setForm(BLANK_FORM) }}>
              <X className="w-4 h-4" /> Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.title.trim() || !form.date || saving}>
              {saving ? 'Saving…' : editEvent ? <><Save className="w-4 h-4" /> Save</> : <><Plus className="w-4 h-4" /> Add</>}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
