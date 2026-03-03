/**
 * LeadsPage — CRM for leads / intake form submissions.
 * Supports manual lead creation, status pipeline, assignment, and converting to athlete.
 */
import { useState, useMemo } from 'react'
import {
  UserCheck, UserPlus, Users, Clock, UserX, Search, ChevronRight,
  Trash2, Check, Phone, Mail, Globe, Edit2, Plus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { Modal } from '../components/ui/Modal'
import { useAuthStore, useOrgStore } from '../lib/store'
import { cn } from '../lib/utils'

const LEAD_STATUS_META = {
  new:       { label: 'New',       color: 'blue'   },
  contacted: { label: 'Contacted', color: 'yellow' },
  onboarded: { label: 'Onboarded', color: 'green'  },
  declined:  { label: 'Declined',  color: 'red'    },
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function LeadsPage() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, addLead, updateLead, deleteLead, inviteMember } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const leads = org?.leads || []
  const staff = org?.members.filter((m) => m.org_role !== 'athlete') || []

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('all')
  const [selectedLead, setSelected]   = useState(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [convertLead, setConvertLead] = useState(null)

  const filtered = useMemo(() => {
    return leads
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .filter((l) => !search ||
        l.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.email?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }, [leads, search, statusFilter])

  const counts = useMemo(() => {
    const c = { all: leads.length, new: 0, contacted: 0, onboarded: 0, declined: 0 }
    leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++ })
    return c
  }, [leads])

  function handleAddLead(data) {
    addLead(org.id, {
      id: `lead-${Date.now()}`,
      ...data,
      source: 'manual',
      status: 'new',
      submitted_at: new Date().toISOString().slice(0, 10),
    })
    setAddOpen(false)
  }

  function handleUpdate(updates) {
    updateLead(org.id, selectedLead.id, updates)
    setSelected((prev) => ({ ...prev, ...updates }))
  }

  function handleConvertToAthlete(leadId, inviteEmail, fullName) {
    // Mark lead as onboarded
    updateLead(org.id, leadId, { status: 'onboarded', converted_at: new Date().toISOString().slice(0, 10) })
    // Send an invitation to the lead's email as an athlete
    inviteMember(org.id, { email: inviteEmail, org_role: 'athlete', message: `Welcome to ${org.name}!` })
    setConvertLead(null)
    setSelected(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" /> Leads
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Track applicants from intake form submissions and manual entries through your pipeline.
          </p>
        </div>
        {org && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Leads"   value={counts.all}       icon={Users}     color="purple" />
        <StatCard label="New"           value={counts.new}       icon={Clock}     color="blue"   />
        <StatCard label="Onboarded"     value={counts.onboarded} icon={UserCheck} color="green"  />
        <StatCard label="Declined"      value={counts.declined}  icon={UserX}     color="red"    />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          {['all', 'new', 'contacted', 'onboarded', 'declined'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize',
                statusFilter === s ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              {s}{counts[s] > 0 && <span className="ml-0.5 opacity-60"> ({counts[s]})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Applicant', 'Experience', 'Source', 'Status', 'Date', 'Assigned'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const sm = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new
                  const assignee = staff.find((m) => m.user_id === lead.assigned_to)
                  return (
                    <tr
                      key={lead.id}
                      className={cn(
                        'border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/20 cursor-pointer transition-colors',
                        i % 2 === 0 ? 'bg-zinc-800/10' : ''
                      )}
                      onClick={() => setSelected(lead)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lead.full_name} size="xs" />
                          <div>
                            <p className="text-zinc-200 font-medium text-sm">{lead.full_name}</p>
                            <p className="text-xs text-zinc-500">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{lead.experience || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge color={lead.source === 'manual' ? 'purple' : 'blue'}>
                          {lead.source === 'manual' ? 'Manual' : lead.source === 'website_form' ? 'Website' : lead.source || '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3"><Badge color={sm.color}>{sm.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{lead.submitted_at}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{assignee?.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <button onClick={(e) => { e.stopPropagation(); setSelected(lead) }} className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                      {leads.length === 0
                        ? 'No leads yet. Add one manually or publish your public page to collect applications.'
                        : 'No leads match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Add lead modal */}
      {addOpen && (
        <AddLeadModal onClose={() => setAddOpen(false)} onSave={handleAddLead} />
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          staff={staff}
          orgId={org?.id}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={() => { deleteLead(org.id, selectedLead.id); setSelected(null) }}
          onConvert={() => setConvertLead(selectedLead)}
        />
      )}

      {/* Convert confirmation modal */}
      {convertLead && (
        <ConvertToAthleteModal
          lead={convertLead}
          onClose={() => setConvertLead(null)}
          onConfirm={() => handleConvertToAthlete(convertLead.id, convertLead.email, convertLead.full_name)}
        />
      )}
    </div>
  )
}

// ─── Add lead modal ───────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', experience: '', goals: '', notes: '',
  })
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const valid = form.full_name.trim() && form.email.trim()

  return (
    <Modal open onClose={onClose} title="Add Lead" size="md">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name *</label>
            <input
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="jane@example.com"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Experience Level</label>
            <select
              value={form.experience}
              onChange={(e) => set('experience', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">Select…</option>
              {['Beginner', 'Intermediate', 'Advanced', 'Elite / Competitive'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Goals</label>
          <textarea
            rows={2}
            value={form.goals}
            onChange={(e) => set('goals', e.target.value)}
            placeholder="What are they looking to achieve?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Internal Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Referral source, first impressions, follow-up reminders…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid} onClick={() => onSave(form)}>
            <UserPlus className="w-3.5 h-3.5" /> Add Lead
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Lead detail modal ────────────────────────────────────────────────────────
function LeadDetailModal({ lead, staff, onClose, onUpdate, onDelete, onConvert }) {
  const [notes, setNotes]       = useState(lead.notes || '')
  const [notesSaved, setNSaved] = useState(false)

  function saveNotes() {
    onUpdate({ notes })
    setNSaved(true)
    setTimeout(() => setNSaved(false), 2000)
  }

  const sm = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new

  return (
    <Modal open onClose={onClose} title={lead.full_name} size="lg">
      <div className="space-y-5">
        {/* Status badge header */}
        <div className="flex items-center gap-2">
          <Badge color={sm.color} className="text-sm px-3 py-1">{sm.label}</Badge>
          {lead.source && (
            <Badge color={lead.source === 'manual' ? 'purple' : 'blue'}>
              {lead.source === 'manual' ? 'Manually Added' : 'Website Form'}
            </Badge>
          )}
        </div>

        {/* Status + assign */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Status</label>
            <select
              value={lead.status}
              onChange={(e) => onUpdate({ status: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              {Object.entries(LEAD_STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Assign To</label>
            <select
              value={lead.assigned_to || ''}
              onChange={(e) => onUpdate({ assigned_to: e.target.value || null })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">Unassigned</option>
              {staff.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Contact info */}
        <div className="grid sm:grid-cols-2 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
          {[
            { label: 'Email',        value: lead.email,       icon: Mail  },
            { label: 'Phone',        value: lead.phone || '—', icon: Phone },
            { label: 'Experience',   value: lead.experience || '—' },
            { label: 'Source',       value: lead.source || '—' },
            { label: 'Applied',      value: lead.submitted_at },
            { label: 'Federation',   value: lead.federation || '—' },
          ].map((r) => (
            <div key={r.label}>
              <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
              <p className="text-sm text-zinc-200">{r.value}</p>
            </div>
          ))}
        </div>

        {/* Lift maxes (from website form) */}
        {(lead.extra_answers?.['f-squat-max'] || lead.extra_answers?.['f-bench-max'] || lead.extra_answers?.['f-deadlift-max']) && (
          <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Lift Maxes</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Squat',    value: lead.extra_answers?.['f-squat-max'] },
                { label: 'Bench',    value: lead.extra_answers?.['f-bench-max'] },
                { label: 'Deadlift', value: lead.extra_answers?.['f-deadlift-max'] },
              ].filter(r => r.value).map((r) => (
                <div key={r.label} className="text-center">
                  <p className="text-xs text-zinc-500">{r.label}</p>
                  <p className="text-sm font-semibold text-zinc-100">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals / notes from form */}
        {[
          { label: 'Goals',             value: lead.goals },
          { label: 'Injuries / Health', value: lead.injuries },
          { label: 'Weak Points',       value: lead.extra_answers?.['f-weakpoints'] },
          { label: 'Expectations',      value: lead.extra_answers?.['f-expectations'] },
          { label: 'Concerns',          value: lead.extra_answers?.['f-concerns'] },
        ].filter(r => r.value).map((r) => (
          <div key={r.label}>
            <p className="text-xs font-medium text-zinc-500 mb-1">{r.label}</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{r.value}</p>
          </div>
        ))}

        {/* Internal notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Internal Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private notes about this applicant…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
          <Button size="sm" className="mt-2" onClick={saveNotes}>
            {notesSaved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : 'Save Notes'}
          </Button>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Lead
          </button>
          <div className="flex gap-2">
            {lead.status === 'new' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUpdate({ status: 'contacted' })}
              >
                <Mail className="w-3.5 h-3.5" /> Mark Contacted
              </Button>
            )}
            {lead.status !== 'onboarded' && (
              <Button size="sm" onClick={onConvert}>
                <UserCheck className="w-3.5 h-3.5" /> Convert to Athlete
              </Button>
            )}
            {lead.status === 'onboarded' && (
              <Badge color="green" className="self-center">✓ Onboarded</Badge>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Convert to athlete confirmation ─────────────────────────────────────────
function ConvertToAthleteModal({ lead, onClose, onConfirm }) {
  return (
    <Modal open onClose={onClose} title="Convert to Athlete" size="sm">
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700 flex items-center gap-3">
          <Avatar name={lead.full_name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">{lead.full_name}</p>
            <p className="text-xs text-zinc-500">{lead.email}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-400">
          This will mark the lead as <strong className="text-green-400">Onboarded</strong> and send an invitation to{' '}
          <strong className="text-zinc-200">{lead.email}</strong> to join your roster as an athlete.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm}>
            <UserCheck className="w-3.5 h-3.5" /> Confirm &amp; Send Invite
          </Button>
        </div>
      </div>
    </Modal>
  )
}
