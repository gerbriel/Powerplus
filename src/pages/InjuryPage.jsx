import { useState } from 'react'
import {
  Plus, Save, X, Check, ChevronDown, ChevronUp, Activity,
  Shield, Archive, CheckCircle2, AlertCircle, Heart, TrendingUp,
  MessageSquare, Stethoscope, Edit2, Trash2, User, Calendar,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { MOCK_INJURY_LOGS, MOCK_ATHLETES } from '../lib/mockData'
import { useAuthStore, isStaffRole } from '../lib/store'
import { cn } from '../lib/utils'
import { reportInjury, updateInjury } from '../lib/db'

// Pain level helpers
function painColor(level) {
  if (level === 0) return 'text-green-400 bg-green-500/15 border-green-500/30'
  if (level <= 2) return 'text-green-400 bg-green-500/15 border-green-500/30'
  if (level <= 4) return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
  if (level <= 6) return 'text-orange-400 bg-orange-500/15 border-orange-500/30'
  return 'text-red-400 bg-red-500/15 border-red-500/30'
}
function painLabel(level) {
  if (level === 0) return 'None'
  if (level <= 2) return 'Mild'
  if (level <= 4) return 'Moderate'
  if (level <= 6) return 'Significant'
  return 'Severe'
}

// ─── Staff Injury Overview (sees all athletes) ───────────────────────────────
function StaffInjuryView() {
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  const { isDemo } = useAuthStore()
  const mockAthletes    = isDemo ? MOCK_ATHLETES : []
  const mockInjuryLogs  = isDemo ? MOCK_INJURY_LOGS : []
  const athletesWithInjuries = mockAthletes.map((a) => ({
    ...a,
    injuries: mockInjuryLogs.filter((inj) => inj.athlete_id === a.id),
  }))
  const flagged = athletesWithInjuries.filter((a) => a.injuries.some((i) => !i.resolved))

  if (selectedAthlete) {
    const athlete = mockAthletes.find((a) => a.id === selectedAthlete)
    const injuries = mockInjuryLogs.filter((i) => i.athlete_id === selectedAthlete)
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedAthlete(null)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          <ChevronUp className="w-4 h-4 rotate-270" />← Back to All Athletes
        </button>
        <AthleteInjuryDetail athlete={athlete} injuries={injuries} staffView />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-red-400">{flagged.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Athletes with active injuries</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">
            {mockInjuryLogs.filter((i) => !i.resolved).length}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Active injury reports</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">
            {mockInjuryLogs.filter((i) => !i.resolved && i.reported_to_coach).length}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Reported to coaching staff</p>
        </CardBody></Card>
      </div>

      {/* Active flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />Active Injury Flags
          </CardTitle>
          <CardSubtitle>Athletes currently managing injuries</CardSubtitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {flagged.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-8 h-8 mx-auto mb-2 text-green-500/40" />
              <p className="text-sm text-zinc-500">No active injury flags — all clear!</p>
            </div>
          ) : (
            flagged.map((a) => {
              const activeInj = a.injuries.filter((i) => !i.resolved)
              const maxPain = Math.max(...activeInj.map((i) => i.pain_level))
              return (
                <button key={a.id} onClick={() => setSelectedAthlete(a.id)}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/50 rounded-xl transition-colors text-left group">
                  <Avatar name={a.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-100">{a.full_name}</span>
                      <span className="text-xs text-zinc-500">{a.weight_class}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {activeInj.map((inj) => (
                        <span key={inj.id} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', painColor(inj.pain_level))}>
                          {inj.body_area} · {inj.pain_level}/10
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activeInj.some((i) => i.pain_level >= 7) && (
                      <Badge color="red">High Pain</Badge>
                    )}
                    {activeInj.some((i) => !i.reported_to_coach) && (
                      <Badge color="yellow">Unreported</Badge>
                    )}
                    <ChevronDown className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 -rotate-90 transition-colors" />
                  </div>
                </button>
              )
            })
          )}
        </CardBody>
      </Card>

      {/* All athletes list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />All Athletes
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-2">
          {athletesWithInjuries.map((a) => {
            const active = a.injuries.filter((i) => !i.resolved)
            const resolved = a.injuries.filter((i) => i.resolved)
            return (
              <button key={a.id} onClick={() => setSelectedAthlete(a.id)}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-700/40 rounded-xl transition-colors text-left group">
                <Avatar name={a.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-zinc-200">{a.full_name}</span>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {active.length > 0 ? `${active.length} active` : 'No active injuries'}
                    {resolved.length > 0 && ` · ${resolved.length} resolved`}
                  </p>
                </div>
                {active.length > 0
                  ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-green-500/50 flex-shrink-0" />
                }
              </button>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Athlete Injury Detail (shared by both athlete self-view and staff drill-down) ─
function AthleteInjuryDetail({ athlete, injuries: initialInjuries, staffView = false }) {
  const { isDemo, profile } = useAuthStore()
  const athleteId = athlete?.id ?? profile?.id
  const [injuries, setInjuries] = useState(initialInjuries ?? [])
  const [logModal, setLogModal] = useState(null)
  const [addModal, setAddModal] = useState(false)
  const [resolveConfirm, setResolveConfirm] = useState(null)
  const [coachNoteModal, setCoachNoteModal] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(null)

  const [logForm, setLogForm] = useState({ date: '', pain_level: 5, note: '' })
  const [addForm, setAddForm] = useState({
    body_area: '', pain_level: 5, description: '',
    movement_affected: '', injury_date: new Date().toISOString().slice(0, 10),
  })
  const [coachNoteForm, setCoachNoteForm] = useState('')

  const active = injuries.filter((i) => !i.resolved)
  const resolved = injuries.filter((i) => i.resolved)

  const submitLog = () => {
    if (!logForm.date || !logForm.note.trim()) return
    setInjuries((prev) => prev.map((inj) => {
      if (inj.id !== logModal) return inj
      return {
        ...inj,
        pain_level: logForm.pain_level,
        log_history: [...inj.log_history, {
          date: logForm.date, pain_level: logForm.pain_level,
          note: logForm.note, reporter: staffView ? 'coach' : 'athlete',
        }],
      }
    }))
    setLogModal(null)
    setLogForm({ date: '', pain_level: 5, note: '' })
  }

  const submitAdd = async () => {
    if (!addForm.body_area.trim() || !addForm.description.trim()) return
    const newInj = {
      id: `inj-${Date.now()}`,
      athlete_id: athleteId ?? 'u-ath-001',
      body_area: addForm.body_area,
      pain_level: addForm.pain_level,
      injury_date: addForm.injury_date,
      description: addForm.description,
      movement_affected: addForm.movement_affected.split(',').map((s) => s.trim()).filter(Boolean),
      resolved: false, resolved_date: null,
      reported_to_coach: staffView,
      coach_notes: '',
      log_history: [{
        date: addForm.injury_date, pain_level: addForm.pain_level,
        note: 'Initial report.', reporter: staffView ? 'coach' : 'athlete',
      }],
    }
    setInjuries((prev) => [...prev, newInj])
    if (!isDemo && athleteId) {
      await reportInjury(athleteId, { ...addForm, reported_to_coach: staffView })
    }
    setAddModal(false)
    setAddForm({ body_area: '', pain_level: 5, description: '', movement_affected: '', injury_date: new Date().toISOString().slice(0, 10) })
  }

  const markResolved = async (id) => {
    const resolvedDate = new Date().toISOString().slice(0, 10)
    setInjuries((prev) => prev.map((inj) => inj.id !== id ? inj : {
      ...inj, resolved: true, resolved_date: resolvedDate,
      log_history: [...inj.log_history, {
        date: resolvedDate, pain_level: 0,
        note: 'Marked as resolved.', reporter: staffView ? 'coach' : 'athlete',
      }],
    }))
    if (!isDemo && !id.startsWith('inj-')) {
      await updateInjury(id, { resolved: true, resolved_date: resolvedDate })
    }
    setResolveConfirm(null)
  }

  const saveCoachNote = async (id) => {
    setInjuries((prev) => prev.map((inj) => inj.id !== id ? inj : { ...inj, coach_notes: coachNoteForm }))
    if (!isDemo && !id.startsWith('inj-')) {
      await updateInjury(id, { coach_notes: coachNoteForm })
    }
    setCoachNoteModal(null)
  }

  const toggleCoach = (id) => setInjuries((prev) => prev.map((inj) =>
    inj.id !== id ? inj : { ...inj, reported_to_coach: !inj.reported_to_coach }
  ))

  return (
    <div className="space-y-4">
      {/* Athlete header (staff view only) */}
      {staffView && athlete && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardBody className="py-3">
            <div className="flex items-center gap-3">
              <Avatar name={athlete.full_name} size="sm" />
              <div>
                <p className="text-sm font-bold text-zinc-100">{athlete.full_name}</p>
                <p className="text-xs text-zinc-400">{athlete.weight_class} · {athlete.federation}</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Badge color={active.length > 0 ? 'red' : 'green'}>
                  {active.length > 0 ? `${active.length} active` : 'Clear'}
                </Badge>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">
            {active.length} active · {resolved.length} resolved
          </h2>
        </div>
        <Button size="sm" onClick={() => setAddModal(true)}>
          <Plus className="w-3.5 h-3.5" /> {staffView ? 'Log Injury' : 'Report Injury'}
        </Button>
      </div>

      {/* Active injuries */}
      {active.length === 0 ? (
        <Card>
          <CardBody className="text-center py-10">
            <Heart className="w-8 h-8 mx-auto mb-2 text-green-500/40" />
            <p className="text-sm text-zinc-500">No active injuries{staffView ? ' for this athlete' : ''}!</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map((inj) => {
            const trend = inj.log_history.length >= 2
              ? inj.log_history[inj.log_history.length - 1].pain_level
                - inj.log_history[inj.log_history.length - 2].pain_level
              : 0
            return (
              <Card key={inj.id} className="border-red-500/20">
                <CardBody className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-zinc-100">{inj.body_area}</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Since {inj.injury_date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', painColor(inj.pain_level))}>
                        {inj.pain_level}/10 · {painLabel(inj.pain_level)}
                      </span>
                      {trend < 0 && (
                        <span title="Improving" className="flex items-center gap-1 text-xs text-green-400">
                          <TrendingUp className="w-3.5 h-3.5 rotate-180" /> Improving
                        </span>
                      )}
                      {trend > 0 && (
                        <span title="Worsening" className="flex items-center gap-1 text-xs text-red-400">
                          <TrendingUp className="w-3.5 h-3.5" /> Worsening
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-300">{inj.description}</p>

                  {/* Affected movements */}
                  {inj.movement_affected?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {inj.movement_affected.map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-full">{m}</span>
                      ))}
                    </div>
                  )}

                  {/* Coach notes */}
                  {inj.coach_notes ? (
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Coach Note
                        {staffView && (
                          <button onClick={() => { setCoachNoteModal(inj.id); setCoachNoteForm(inj.coach_notes) }}
                            className="ml-auto text-zinc-500 hover:text-purple-300 transition-colors">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </p>
                      <p className="text-xs text-zinc-300">{inj.coach_notes}</p>
                    </div>
                  ) : staffView ? (
                    <button onClick={() => { setCoachNoteModal(inj.id); setCoachNoteForm('') }}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" /> Add coaching note
                    </button>
                  ) : null}

                  {/* Log history mini */}
                  <div className="space-y-1 pt-1 border-t border-zinc-800">
                    <p className="text-xs text-zinc-600 uppercase tracking-wider font-semibold mb-1">Recent log</p>
                    {inj.log_history.slice(-3).map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-600 w-20 flex-shrink-0">{entry.date}</span>
                        <span className={cn('font-bold flex-shrink-0 w-10',
                          entry.pain_level === 0 ? 'text-green-400' : entry.pain_level <= 3 ? 'text-green-400' : entry.pain_level <= 6 ? 'text-yellow-400' : 'text-red-400'
                        )}>{entry.pain_level === 0 ? 'Resolved' : `${entry.pain_level}/10`}</span>
                        <span className="text-zinc-400 truncate">{entry.note}</span>
                        <span className="text-zinc-600 flex-shrink-0">{entry.reporter}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button size="xs" variant="outline" className="flex-1"
                      onClick={() => { setLogModal(inj.id); setLogForm({ date: new Date().toISOString().slice(0, 10), pain_level: inj.pain_level, note: '' }) }}>
                      <Activity className="w-3 h-3" /> Log Update
                    </Button>
                    {!staffView && (
                      <Button size="xs" variant="outline"
                        onClick={() => toggleCoach(inj.id)}
                        className={inj.reported_to_coach ? 'text-purple-400 border-purple-500/40' : ''}>
                        <Shield className="w-3 h-3" />
                        {inj.reported_to_coach ? 'Reported' : 'Report to Coach'}
                      </Button>
                    )}
                    <Button size="xs" variant="ghost"
                      onClick={() => setResolveConfirm(inj.id)}
                      className="text-green-400 hover:bg-green-500/10">
                      <Check className="w-3 h-3" /> Mark Resolved
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Resolved history */}
      {resolved.length > 0 && (
        <Card>
          <CardBody>
            <button onClick={() => setShowHistory((p) => !p)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors w-full">
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Archive className="w-4 h-4" />
              Injury History ({resolved.length} resolved)
            </button>
            {showHistory && (
              <div className="mt-3 space-y-2">
                {resolved.map((inj) => (
                  <div key={inj.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-semibold text-zinc-300 text-sm">{inj.body_area}</span>
                        <span className="text-xs text-zinc-600">{inj.injury_date} → {inj.resolved_date}</span>
                      </div>
                      <button onClick={() => setExpandedHistory(expandedHistory === inj.id ? null : inj.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        {expandedHistory === inj.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {inj.log_history.length} entries
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">{inj.description}</p>
                    {expandedHistory === inj.id && (
                      <div className="space-y-1.5 mt-2 pt-2 border-t border-zinc-800">
                        {inj.log_history.map((entry, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-zinc-600 flex-shrink-0 w-20">{entry.date}</span>
                            <span className={cn('font-bold flex-shrink-0 w-14',
                              entry.pain_level === 0 ? 'text-green-400' : entry.pain_level <= 3 ? 'text-green-400' : entry.pain_level <= 6 ? 'text-yellow-400' : 'text-red-400'
                            )}>{entry.pain_level === 0 ? '✓' : `${entry.pain_level}/10`}</span>
                            <span className="text-zinc-400 flex-1">{entry.note}</span>
                            <span className="text-zinc-600 flex-shrink-0">{entry.reporter}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Log Update Modal */}
      <Modal open={!!logModal} onClose={() => setLogModal(null)} title="Log Pain Update" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
            <input type="date" value={logForm.date}
              onChange={(e) => setLogForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Pain Level: <span className="font-bold text-zinc-200">{logForm.pain_level}/10</span>
              <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded', painColor(logForm.pain_level))}>{painLabel(logForm.pain_level)}</span>
            </label>
            <input type="range" min="0" max="10" value={logForm.pain_level}
              onChange={(e) => setLogForm((p) => ({ ...p, pain_level: Number(e.target.value) }))}
              className="w-full accent-purple-500" />
            <div className="flex justify-between text-xs text-zinc-600 mt-1"><span>0 – No pain</span><span>10 – Severe</span></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea value={logForm.note}
              onChange={(e) => setLogForm((p) => ({ ...p, note: e.target.value }))}
              rows={3} placeholder="How does it feel today? Any changes?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setLogModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={submitLog}><Save className="w-3.5 h-3.5" /> Save Update</Button>
          </div>
        </div>
      </Modal>

      {/* Add Injury Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={staffView ? 'Log Injury for Athlete' : 'Report New Injury'} size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body Area *</label>
            <input value={addForm.body_area}
              onChange={(e) => setAddForm((p) => ({ ...p, body_area: e.target.value }))}
              placeholder="e.g. Right knee, Lower back, Left shoulder"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date of Injury</label>
            <input type="date" value={addForm.injury_date}
              onChange={(e) => setAddForm((p) => ({ ...p, injury_date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Pain Level: <span className="font-bold text-zinc-200">{addForm.pain_level}/10</span>
            </label>
            <input type="range" min="0" max="10" value={addForm.pain_level}
              onChange={(e) => setAddForm((p) => ({ ...p, pain_level: Number(e.target.value) }))}
              className="w-full accent-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description *</label>
            <textarea value={addForm.description}
              onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Describe the pain, how it occurred, symptoms…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Movements Affected <span className="text-zinc-600 font-normal">(comma-separated)</span>
            </label>
            <input value={addForm.movement_affected}
              onChange={(e) => setAddForm((p) => ({ ...p, movement_affected: e.target.value }))}
              placeholder="e.g. Squat, Deadlift, Romanian Deadlift"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={submitAdd}>
              <Plus className="w-3.5 h-3.5" /> {staffView ? 'Log Injury' : 'Report Injury'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Resolve Confirm */}
      <Modal open={!!resolveConfirm} onClose={() => setResolveConfirm(null)} title="Mark as Resolved?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">
            This will move the injury to the resolved history. The full log is preserved and can still be viewed.
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setResolveConfirm(null)}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-500"
              onClick={() => markResolved(resolveConfirm)}>
              <Check className="w-3.5 h-3.5" /> Mark Resolved
            </Button>
          </div>
        </div>
      </Modal>

      {/* Coach Note Modal (staff only) */}
      <Modal open={!!coachNoteModal} onClose={() => setCoachNoteModal(null)} title="Coaching Note" size="sm">
        <div className="p-6 space-y-4">
          <textarea value={coachNoteForm}
            onChange={(e) => setCoachNoteForm(e.target.value)}
            rows={4} placeholder="Add a note about this injury, load modifications, treatment plan…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setCoachNoteModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={() => saveCoachNote(coachNoteModal)}>
              <Save className="w-3.5 h-3.5" /> Save Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function InjuryPage() {
  const { profile, viewAsAthlete, isDemo, orgMemberships, activeOrgId } = useAuthStore()
  const membership = orgMemberships?.find((m) => m.org_id === activeOrgId)
  const isStaff = isStaffRole(profile, membership) && !viewAsAthlete

  const demoAthlete  = isDemo ? MOCK_ATHLETES[0] : null
  const demoInjuries = isDemo ? MOCK_INJURY_LOGS : []

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-red-400" /> Injury Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {isStaff
              ? 'Monitor and manage athlete injury reports across your roster'
              : 'Track your injuries, log pain updates, and share with your coaching staff'}
          </p>
        </div>
      </div>

      {isStaff ? (
        <StaffInjuryView />
      ) : (
        <AthleteInjuryDetail athlete={demoAthlete} injuries={demoInjuries} />
      )}
    </div>
  )
}
