/**
 * LeadsPage — CRM for leads / intake form submissions.
 * Fully synced to Supabase: all creates, updates and deletes persist.
 * Realtime subscription keeps the list live as new submissions arrive.
 */
import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  UserCheck, UserPlus, Users, Clock, UserX, Search, ChevronRight,
  Trash2, Check, Phone, Mail, Globe, Edit2, Plus, RefreshCw, Loader2,
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

const EXPERIENCE_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Elite / Competitive']

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function LeadsPage() {
  const { profile, activeOrgId } = useAuthStore()
  const { orgs, addLead, updateLead, deleteLead, inviteMember, loadOrgWebsite, subscribeLeads, websiteLoadedFor } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const leads = org?.leads || []
  const staff = (org?.members || []).filter((m) => m.org_role !== 'athlete')

  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('all')
  const [selectedLead, setSelected]   = useState(null)
  const [addOpen, setAddOpen]         = useState(false)
  const [convertLead, setConvertLead] = useState(null)
  const [loading, setLoading]         = useState(false)

  // Load + subscribe on mount / org change
  useEffect(() => {
    if (!org?.id) return
    // Force-reload on first visit (bypass cache)
    const alreadyLoaded = websiteLoadedFor instanceof Set && websiteLoadedFor.has(org.id)
    if (!alreadyLoaded) {
      setLoading(true)
      loadOrgWebsite(org.id).finally(() => setLoading(false))
    }
    const unsub = subscribeLeads(org.id)
    return unsub
  }, [org?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Manual refresh
  function handleRefresh() {
    if (!org?.id) return
    setLoading(true)
    // Clear cache flag so loadOrgWebsite re-fetches
    useOrgStore.setState((s) => {
      const next = new Set(s.websiteLoadedFor)
      next.delete(org.id)
      return { websiteLoadedFor: next }
    })
    loadOrgWebsite(org.id).finally(() => setLoading(false))
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads
      .filter((l) => statusFilter === 'all' || l.status === statusFilter)
      .filter((l) => !q ||
        (l.full_name || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q) ||
        (l.phone || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }, [leads, search, statusFilter])

  const counts = useMemo(() => {
    const c = { all: leads.length, new: 0, contacted: 0, onboarded: 0, declined: 0 }
    leads.forEach((l) => { if (c[l.status] !== undefined) c[l.status]++ })
    return c
  }, [leads])

  async function handleAddLead(data) {
    if (!org) return
    // addLead in store is async — persists to Supabase + updates local state
    await addLead(org.id, {
      ...data,
      source: 'manual',
      status: 'new',
      submitted_at: new Date().toISOString(),
    })
    setAddOpen(false)
  }

  function handleUpdate(updates) {
    if (!org || !selectedLead) return
    updateLead(org.id, selectedLead.id, updates)
    setSelected((prev) => ({ ...prev, ...updates }))
  }

  function handleDelete(leadId) {
    if (!org) return
    deleteLead(org.id, leadId)
    setSelected(null)
    if (convertLead?.id === leadId) setConvertLead(null)
  }

  function handleConvertToAthlete(leadId, email, name) {
    if (!org) return
    updateLead(org.id, leadId, { status: 'onboarded', converted_at: new Date().toISOString() })
    inviteMember(org.id, { email, org_role: 'athlete', message: `Welcome to ${org.name}!` })
    setConvertLead(null)
    setSelected(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" /> Leads
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Track applicants from intake form submissions and manual entries through your pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Refresh leads"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          {org && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </Button>
          )}
        </div>
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
            placeholder="Search by name, email, phone…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ✕
            </button>
          )}
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
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading leads…</span>
            </div>
          ) : (
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
                            <Avatar name={lead.full_name || '?'} size="xs" />
                            <div>
                              <p className="text-zinc-200 font-medium text-sm">{lead.full_name || '—'}</p>
                              <p className="text-xs text-zinc-500">{lead.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{lead.experience || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge color={lead.source === 'manual' ? 'purple' : 'blue'}>
                            {lead.source === 'manual' ? 'Manual' : lead.source === 'Public page' || lead.source === 'website_form' ? 'Website' : lead.source || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3"><Badge color={sm.color}>{sm.label}</Badge></td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(lead.submitted_at)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{assignee?.full_name || '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(lead) }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-500">
                        {search || statusFilter !== 'all'
                          ? 'No leads match your filters.'
                          : leads.length === 0
                            ? 'No leads yet. Add one manually or publish your public page to collect applications.'
                            : 'No leads match your filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add lead modal */}
      {addOpen && (
        <AddLeadModal
          onClose={() => setAddOpen(false)}
          onSave={handleAddLead}
        />
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          staff={staff}
          orgId={org?.id}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
          onDelete={() => handleDelete(selectedLead.id)}
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
  const [saving, setSaving] = useState(false)
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const valid = form.full_name.trim() && form.email.trim()

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title="Add Lead" size="md">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Full Name <span className="text-red-400">*</span></label>
            <input
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              placeholder="Jane Doe"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email <span className="text-red-400">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
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
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Experience Level</label>
            <select
              value={form.experience}
              onChange={(e) => setField('experience', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            >
              <option value="">Select…</option>
              {EXPERIENCE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Goals</label>
          <textarea
            rows={2}
            value={form.goals}
            onChange={(e) => setField('goals', e.target.value)}
            placeholder="What are they looking to achieve?"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Internal Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setField('notes', e.target.value)}
            placeholder="Referral source, first impressions, follow-up reminders…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Add Lead
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Lead detail modal ────────────────────────────────────────────────────────
function LeadDetailModal({ lead, staff, orgId, onClose, onUpdate, onDelete, onConvert }) {
  const [notes, setNotes]       = useState(lead.notes || '')
  const [notesSaved, setNSaved] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Re-sync notes if lead changes externally
  useEffect(() => { setNotes(lead.notes || '') }, [lead.id])

  async function saveNotes() {
    if (saving) return
    setSaving(true)
    onUpdate({ notes: notes.trim() })
    setSaving(false)
    setNSaved(true)
    setTimeout(() => setNSaved(false), 2000)
  }

  const sm = LEAD_STATUS_META[lead.status] || LEAD_STATUS_META.new

  // Helper to read a field that may live in the top-level OR in extra_answers
  function field(key, extraKey) {
    return lead[key] || (extraKey ? lead.extra_answers?.[extraKey] : null)
  }

  return (
    <Modal open onClose={onClose} title={lead.full_name || 'Lead Detail'} size="lg">
      <div className="space-y-5">
        {/* Status badge header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={sm.color} className="text-sm px-3 py-1">{sm.label}</Badge>
          {lead.source && (
            <Badge color={lead.source === 'manual' ? 'purple' : 'blue'}>
              {lead.source === 'manual' ? 'Manually Added' : 'Website Form'}
            </Badge>
          )}
          {lead.converted_at && (
            <Badge color="green">Converted {fmtDate(lead.converted_at)}</Badge>
          )}
        </div>

        {/* Status + assign */}
        <div className="flex flex-wrap gap-3">
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
            { label: 'Email',        value: lead.email },
            { label: 'Phone',        value: lead.phone },
            { label: 'Instagram',    value: lead.instagram },
            { label: 'Service',      value: lead.service },
            { label: 'Age',          value: lead.age },
            { label: 'Height',       value: lead.height },
            { label: 'Weight',       value: lead.bodyweight },
            { label: 'Weight Class', value: lead.weight_class },
            { label: 'Experience',   value: lead.experience },
            { label: 'Federation',   value: lead.federation },
            { label: 'Membership #', value: lead.membership_num },
            { label: 'Source',       value: lead.source },
            { label: 'Applied',      value: fmtDate(lead.submitted_at) },
          ].map((r) => r.value != null && r.value !== '' ? (
            <div key={r.label}>
              <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
              <p className="text-sm text-zinc-200">{r.value}</p>
            </div>
          ) : null)}
        </div>

        {/* Lift maxes */}
        {(lead.squat_max || lead.bench_max || lead.deadlift_max) && (
          <div className="p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wide">Lift Maxes</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Squat',    value: lead.squat_max },
                { label: 'Bench',    value: lead.bench_max },
                { label: 'Deadlift', value: lead.deadlift_max },
              ].filter((r) => r.value).map((r) => (
                <div key={r.label} className="text-center">
                  <p className="text-xs text-zinc-500">{r.label}</p>
                  <p className="text-sm font-semibold text-zinc-100">{r.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technique */}
        {(lead.squat_style || lead.bench_style || lead.deadlift_style) && (
          <div className="grid sm:grid-cols-3 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            {[
              { label: 'Squat Style',    value: lead.squat_style },
              { label: 'Bench Style',    value: lead.bench_style },
              { label: 'Deadlift Style', value: lead.deadlift_style },
            ].filter((r) => r.value).map((r) => (
              <div key={r.label}>
                <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
                <p className="text-sm text-zinc-200">{r.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Schedule & lifestyle */}
        {(lead.days_per_week || lead.training_time || lead.occupation) && (
          <div className="grid sm:grid-cols-2 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            {[
              { label: 'Days/Week',     value: lead.days_per_week },
              { label: 'Training Time', value: lead.training_time },
              { label: 'Occupation',    value: lead.occupation },
              { label: 'Obligations',   value: lead.obligations },
              { label: 'Sleep',         value: lead.sleep_hours ? `${lead.sleep_hours}h / night` : null },
            ].filter((r) => r.value != null).map((r) => (
              <div key={r.label}>
                <p className="text-xs text-zinc-500 mb-0.5">{r.label}</p>
                <p className="text-sm text-zinc-200">{r.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Health scores */}
        {(lead.nutrition_score || lead.stress_score || lead.hydration_score || lead.recovery_score) && (
          <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-800/40 rounded-xl border border-zinc-700">
            {[
              { label: 'Nutrition', value: lead.nutrition_score },
              { label: 'Hydration', value: lead.hydration_score },
              { label: 'Stress',    value: lead.stress_score },
              { label: 'Recovery',  value: lead.recovery_score },
            ].map((r) => (
              <div key={r.label} className="text-center">
                <p className="text-xs text-zinc-500">{r.label}</p>
                <p className="text-lg font-bold text-zinc-100">{r.value ?? '—'}<span className="text-xs text-zinc-500">/10</span></p>
              </div>
            ))}
          </div>
        )}

        {/* Text fields */}
        {[
          { label: 'Goals',                    value: lead.goals },
          { label: 'Injuries / Health Notes',  value: lead.injuries },
          { label: 'Current Program',          value: lead.current_program },
          { label: 'Weak Points / Needs Work', value: lead.weakpoints },
          { label: 'Other Obligations',        value: lead.obligations },
          { label: 'External Stressors',       value: lead.external_stressors },
          { label: 'Expectations for a Coach', value: lead.expectations },
          { label: 'Concerns / Hesitations',   value: lead.concerns },
          { label: 'Learning Style',           value: lead.learner_type },
        ].filter((r) => r.value).map((r) => (
          <div key={r.label}>
            <p className="text-xs font-medium text-zinc-500 mb-1.5">{r.label}</p>
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{r.value}</p>
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
          <Button size="sm" className="mt-2" onClick={saveNotes} disabled={saving}>
            {notesSaved
              ? <><Check className="w-3.5 h-3.5" /> Saved!</>
              : saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : 'Save Notes'}
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
              <Button variant="ghost" size="sm" onClick={() => onUpdate({ status: 'contacted' })}>
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
          <Avatar name={lead.full_name || '?'} size="sm" />
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
