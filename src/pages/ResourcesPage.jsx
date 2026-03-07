import { useState, useMemo, useEffect } from 'react'
import {
  BookOpen, Search, Tag, Video, FileText, ChevronRight, ExternalLink,
  Plus, Pencil, Trash2, Check, X, Loader2, RefreshCw,
  Link2, Play,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { MOCK_RESOURCES } from '../lib/mockData'
import { cn } from '../lib/utils'
import { useAuthStore, useOrgStore } from '../lib/store'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['all', 'technique', 'meet_day', 'recovery', 'nutrition', 'rules', 'general']

const CATEGORY_META = {
  technique:  { label: 'Technique',  color: 'blue',   icon: '🏋️' },
  meet_day:   { label: 'Meet Day',   color: 'yellow', icon: '🏆' },
  recovery:   { label: 'Recovery',   color: 'green',  icon: '🛌' },
  nutrition:  { label: 'Nutrition',  color: 'orange', icon: '🥗' },
  rules:      { label: 'Rules',      color: 'purple', icon: '📋' },
  general:    { label: 'General',    color: 'default',icon: '📄' },
}

const COACH_ROLES = ['owner', 'head_coach', 'coach']

function fmtDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ResourcesPage() {
  const { profile, activeOrgId, orgMemberships, isDemo } = useAuthStore()
  const { orgs, loadOrgResources, addResource, updateResource: storeUpdateResource, deleteResource, subscribeResources } = useOrgStore()
  const org = orgs.find((o) => o.id === (activeOrgId || profile?.org_id))
  const orgId = org?.id

  const membership = orgMemberships.find((m) => m.org_id === orgId)
  const isCoach = COACH_ROLES.includes(membership?.org_role) || COACH_ROLES.includes(profile?.role)

  const [search, setSearch]         = useState('')
  const [activeCategory, setActive] = useState('all')
  const [selected, setSelected]     = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    if (!orgId || isDemo) return
    setLoading(true)
    loadOrgResources(orgId).finally(() => setLoading(false))
    const unsub = subscribeResources(orgId)
    return unsub
  }, [orgId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRefresh() {
    if (!orgId || loading) return
    setLoading(true)
    useOrgStore.setState((s) => {
      const next = new Set(s.resourcesLoadedFor)
      next.delete(orgId)
      return { resourcesLoadedFor: next }
    })
    loadOrgResources(orgId).finally(() => setLoading(false))
  }

  const rawResources = isDemo ? MOCK_RESOURCES : (org?.resources || [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rawResources
      .filter((r) => activeCategory === 'all' || r.category === activeCategory)
      .filter((r) =>
        !q ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        (r.tags || []).some((t) => (t || '').toLowerCase().includes(q))
      )
      .filter((r) => isCoach || r.is_published !== false)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [rawResources, search, activeCategory, isCoach])

  const counts = useMemo(() => {
    const c = { all: rawResources.filter((r) => isCoach || r.is_published !== false).length }
    CATEGORIES.slice(1).forEach((cat) => {
      c[cat] = rawResources.filter((r) => r.category === cat && (isCoach || r.is_published !== false)).length
    })
    return c
  }, [rawResources, isCoach])

  async function handleSaveNew(data) {
    if (!orgId || !profile?.id) return
    await addResource(orgId, profile.id, data)
    setShowAdd(false)
  }

  function handleSaveEdit(data) {
    if (!orgId || !editTarget) return
    storeUpdateResource(orgId, editTarget.id, data)
    if (selected?.id === editTarget.id) setSelected((p) => ({ ...p, ...data }))
    setEditTarget(null)
  }

  function handleDelete(resourceId) {
    if (!orgId) return
    deleteResource(orgId, resourceId)
    if (selected?.id === resourceId) setSelected(null)
  }

  // ── Detail View ─────────────────────────────────────────────────────────────
  if (selected) {
    const meta = CATEGORY_META[selected.category] || CATEGORY_META.general
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
          >
            ← Back to Resources
          </button>
          {isCoach && !isDemo && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditTarget(selected)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{meta.icon}</span>
            <h1 className="text-xl font-bold text-zinc-100">{selected.title}</h1>
            {!selected.is_published && (
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">Draft</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-1">
            <Badge color={meta.color}>{meta.label}</Badge>
            {(selected.tags || []).map((t) => <Badge key={t} color="default">{t}</Badge>)}
          </div>
          <p className="text-xs text-zinc-500 mb-4">Updated {fmtDate(selected.updated_at)}</p>

          {(selected.video_url || selected.file_url) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.video_url && (
                <a href={selected.video_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors">
                  <Play className="w-4 h-4 text-purple-400" /> Watch Video
                </a>
              )}
              {selected.file_url && (
                <a href={selected.file_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors">
                  <ExternalLink className="w-4 h-4 text-zinc-400" /> Open File / Link
                </a>
              )}
            </div>
          )}

          <div className="prose prose-invert max-w-none">
            <ResourceContent content={selected.content} title={selected.title} />
          </div>
        </div>

        {editTarget && (
          <ResourceFormModal resource={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
        )}
      </div>
    )
  }

  // ── List View ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Resource Library</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Technique guides, meet day protocols, and playbooks</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isDemo && (
            <button onClick={handleRefresh} disabled={loading} title="Refresh"
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          )}
          {isCoach && !isDemo && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Resource
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, content, or tag…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-9 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setActive(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize',
              activeCategory === cat
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            )}
          >
            {cat === 'all'
              ? `All (${counts.all})`
              : `${cat.replace('_', ' ')}${counts[cat] ? ` (${counts[cat]})` : ''}`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && !rawResources.length && (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading resources…
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-zinc-500 text-sm">
          {rawResources.length === 0
            ? isCoach && !isDemo
              ? <span>No resources yet. <button onClick={() => setShowAdd(true)} className="text-purple-400 hover:text-purple-300 underline">Add the first one.</button></span>
              : 'Your coaching staff hasn\'t uploaded any resources yet.'
            : 'No resources match your search or filter.'}
        </div>
      )}

      {/* Resources grid */}
      {filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((resource) => {
            const meta = CATEGORY_META[resource.category] || CATEGORY_META.general
            return (
              <Card key={resource.id}
                className={cn('cursor-pointer hover:border-zinc-600 transition-all group', !resource.is_published && 'opacity-60 border-dashed')}
                onClick={() => setSelected(resource)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0 leading-none mt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">{resource.title}</h3>
                      {!resource.is_published && <span className="text-xs text-zinc-600 flex-shrink-0">(Draft)</span>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <Badge color={meta.color}>{meta.label}</Badge>
                      {(resource.tags || []).slice(0, 2).map((t) => <Badge key={t} color="default">{t}</Badge>)}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1.5">Updated {fmtDate(resource.updated_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {resource.video_url && <Play className="w-3.5 h-3.5 text-purple-400" />}
                    {resource.file_url && <Link2 className="w-3.5 h-3.5 text-zinc-500" />}
                    {isCoach && !isDemo && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditTarget(resource) }}
                          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(resource.id) }}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showAdd && (
        <ResourceFormModal onClose={() => setShowAdd(false)} onSave={handleSaveNew} />
      )}
      {editTarget && !selected && (
        <ResourceFormModal resource={editTarget} onClose={() => setEditTarget(null)} onSave={handleSaveEdit} />
      )}
    </div>
  )
}

// ─── Content Renderer ─────────────────────────────────────────────────────────
function ResourceContent({ content, title }) {
  if (!content) {
    return (
      <p className="text-sm text-zinc-500 italic">
        No content yet — your coaching staff will add details soon.
      </p>
    )
  }
  return (
    <div className="text-sm text-zinc-300 space-y-3 leading-relaxed">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))  return <h2 key={i} className="text-lg font-bold text-zinc-100 mt-4 mb-1">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-zinc-200 mt-3 mb-0.5">{line.slice(4)}</h3>
        if (line.startsWith('#### ')) return <h4 key={i} className="text-sm font-semibold text-zinc-300 mt-2">{line.slice(5)}</h4>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <p key={i} className="text-zinc-400 pl-3">• {line.slice(2)}</p>
        if (line.trim() === '') return <div key={i} className="h-1" />
        const parts = line.split(/\*\*(.+?)\*\*/)
        if (parts.length > 1) {
          return (
            <p key={i} className="text-zinc-300">
              {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-zinc-100">{p}</strong> : p)}
            </p>
          )
        }
        return <p key={i} className="text-zinc-400">{line}</p>
      })}
    </div>
  )
}

// ─── Resource Form Modal ──────────────────────────────────────────────────────
function ResourceFormModal({ resource, onClose, onSave }) {
  const isEdit = !!resource
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title:        resource?.title        || '',
    content:      resource?.content      || '',
    category:     resource?.category     || 'general',
    video_url:    resource?.video_url    || '',
    file_url:     resource?.file_url     || '',
    tags:         (resource?.tags || []).join(', '),
    is_published: resource?.is_published !== false,
  })

  const upd = (key, val) => setForm((p) => ({ ...p, [key]: val }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const data = {
      title:        form.title.trim().slice(0, 200),
      content:      form.content.trim(),
      category:     form.category,
      video_url:    form.video_url.trim() || null,
      file_url:     form.file_url.trim() || null,
      tags:         form.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 10),
      is_published: form.is_published,
    }
    await onSave(data)
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Resource' : 'Add Resource'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
          <input value={form.title} onChange={(e) => upd('title', e.target.value)} maxLength={200} required
            placeholder="e.g. Meet Day Checklist"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
          <select value={form.category} onChange={(e) => upd('category', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/40">
            {CATEGORIES.slice(1).map((cat) => (
              <option key={cat} value={cat}>{CATEGORY_META[cat]?.label || cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tags <span className="text-zinc-600">(comma-separated)</span></label>
          <input value={form.tags} onChange={(e) => upd('tags', e.target.value)}
            placeholder="squat, technique, competition"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Content <span className="text-zinc-600">(supports ## headings, - bullets, **bold**)</span>
          </label>
          <textarea value={form.content} onChange={(e) => upd('content', e.target.value)} rows={10} maxLength={50000}
            placeholder={"## Overview\nWrite your resource content here…\n\n### Key Points\n- Point one\n- Point two"}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 resize-y font-mono" />
          <p className="text-xs text-zinc-600 mt-1 text-right">{form.content.length.toLocaleString()} / 50,000</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Video URL <span className="text-zinc-600">(optional)</span></label>
          <input value={form.video_url} onChange={(e) => upd('video_url', e.target.value)} type="url"
            placeholder="https://youtube.com/watch?v=…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">File / Link URL <span className="text-zinc-600">(optional)</span></label>
          <input value={form.file_url} onChange={(e) => upd('file_url', e.target.value)} type="url"
            placeholder="https://drive.google.com/…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
        </div>

        <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.is_published} onChange={(e) => upd('is_published', e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-purple-500/30 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
          </label>
          <div>
            <p className="text-sm font-medium text-zinc-200">{form.is_published ? 'Published' : 'Draft'}</p>
            <p className="text-xs text-zinc-500">{form.is_published ? 'Visible to all org members' : 'Only visible to coaches'}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" disabled={!form.title.trim() || saving}>
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : isEdit
                ? <><Check className="w-3.5 h-3.5" /> Save Changes</>
                : <><Plus className="w-3.5 h-3.5" /> Add Resource</>}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
