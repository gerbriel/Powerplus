import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronUp, ArrowLeft, Zap } from 'lucide-react'
import { useOrgStore } from '../lib/store'
import { cn } from '../lib/utils'

// ─── Public-facing org page (no auth required) ─────────────────────────────
// Accessible at /org/:slug
export function OrgPublicPage() {
  const { slug } = useParams()
  const { orgs, addLead } = useOrgStore()

  const org = orgs.find((o) => o.slug === slug)

  if (!org) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-center px-4">
        <Zap className="w-10 h-10 text-zinc-600 mb-4" />
        <h1 className="text-2xl font-bold text-zinc-200 mb-2">Organization not found</h1>
        <p className="text-zinc-500 mb-6">The link you followed may be incorrect or this team's page is not published yet.</p>
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm underline underline-offset-2">
          ← Back to PowerPlus
        </Link>
      </div>
    )
  }

  const page = org.public_page || {}

  if (!page.published) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-center px-4">
        <Zap className="w-10 h-10 text-zinc-600 mb-4" />
        <h1 className="text-2xl font-bold text-zinc-200 mb-2">{org.name}</h1>
        <p className="text-zinc-500">This team's page is not yet published.</p>
      </div>
    )
  }

  const accent = page.accent_color || '#a855f7'
  const sections = (page.sections || [])
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order)

  const coaches = org.members.filter(
    (m) => m.org_role === 'head_coach' || m.org_role === 'coach' || m.org_role === 'nutritionist'
  )

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: accent }} />
            <span className="font-bold text-zinc-100 text-sm">{org.name}</span>
          </div>
          <a
            href={`#intake`}
            className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {page.hero_cta || 'Apply Now'}
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}18 0%, transparent 60%)` }}>
        <div className="max-w-5xl mx-auto px-4 py-20 md:py-32 text-center">
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6 border"
            style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}12` }}
          >
            {org.federation || 'Powerlifting'}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
            {page.hero_headline || org.name}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            {page.hero_subheadline || ''}
          </p>
          <a
            href="#intake"
            className="inline-block px-8 py-3.5 rounded-xl text-white font-bold text-base shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: accent, boxShadow: `0 0 32px ${accent}44` }}
          >
            {page.hero_cta || 'Apply to Join'}
          </a>
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-20">
        {sections.map((sec) => (
          <Section
            key={sec.id}
            section={sec}
            accent={accent}
            coaches={coaches}
            orgId={org.id}
            intakeFields={page.intake_fields || []}
            addLead={addLead}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 py-8 text-center">
        <p className="text-xs text-zinc-600">
          Powered by{' '}
          <Link to="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            PowerPlus
          </Link>
        </p>
      </div>
    </div>
  )
}

// ─── Section router ──────────────────────────────────────────────────────────
function Section({ section, accent, coaches, orgId, intakeFields, addLead }) {
  switch (section.type) {
    case 'about':       return <AboutSection section={section} accent={accent} />
    case 'coaches':     return <CoachesSection section={section} accent={accent} coaches={coaches} />
    case 'highlights':  return <HighlightsSection section={section} accent={accent} />
    case 'testimonials':return <TestimonialsSection section={section} accent={accent} />
    case 'faq':         return <FaqSection section={section} accent={accent} />
    case 'intake':      return <IntakeSection id="intake" section={section} accent={accent} orgId={orgId} intakeFields={intakeFields} addLead={addLead} />
    case 'custom':      return <CustomSection section={section} accent={accent} />
    default:            return null
  }
}

// ─── About ───────────────────────────────────────────────────────────────────
function AboutSection({ section, accent }) {
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <p className="text-zinc-400 text-base leading-relaxed max-w-3xl">{section.body}</p>
    </section>
  )
}

// ─── Coaches ─────────────────────────────────────────────────────────────────
function CoachesSection({ section, accent, coaches }) {
  const roleLabel = (r) => ({ head_coach: 'Head Coach', coach: 'Coach', nutritionist: 'Nutritionist' }[r] || r)
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {coaches.map((c) => (
          <div key={c.user_id} className="p-5 bg-zinc-800/40 border border-zinc-700 rounded-2xl flex flex-col items-center text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold mb-4 text-white"
              style={{ backgroundColor: `${accent}30`, border: `2px solid ${accent}50` }}
            >
              {c.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <p className="font-semibold text-zinc-100">{c.full_name}</p>
            <p className="text-sm mt-1" style={{ color: accent }}>{roleLabel(c.org_role)}</p>
          </div>
        ))}
        {coaches.length === 0 && (
          <p className="text-zinc-500 text-sm col-span-3">No coaching staff listed yet.</p>
        )}
      </div>
    </section>
  )
}

// ─── Highlights ──────────────────────────────────────────────────────────────
function HighlightsSection({ section, accent }) {
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 gap-3">
        {(section.items || []).map((item, i) => (
          <div key={i} className="flex items-start gap-3 p-4 bg-zinc-800/30 border border-zinc-700/60 rounded-xl">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <span className="text-sm text-zinc-300">{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Testimonials ────────────────────────────────────────────────────────────
function TestimonialsSection({ section, accent }) {
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 gap-5">
        {(section.items || []).map((t, i) => (
          <div key={i} className="p-6 bg-zinc-800/40 border rounded-2xl" style={{ borderColor: `${accent}30` }}>
            <p className="text-zinc-300 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {t.author?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">{t.author}</p>
                <p className="text-xs text-zinc-500">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FaqSection({ section, accent }) {
  const [open, setOpen] = useState(null)
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <div className="space-y-2">
        {(section.items || []).map((item, i) => (
          <div key={i} className="border border-zinc-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-sm font-medium text-zinc-200">{item.q}</span>
              {open === i
                ? <ChevronUp className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                : <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
            </button>
            {open === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Custom text ─────────────────────────────────────────────────────────────
function CustomSection({ section, accent }) {
  return (
    <section>
      <SectionHeading title={section.title} accent={accent} />
      <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{section.body}</p>
    </section>
  )
}

// ─── Intake form ─────────────────────────────────────────────────────────────
function IntakeSection({ id, section, accent, orgId, intakeFields, addLead }) {
  const [form, setForm] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    intakeFields.forEach((f) => {
      if (f.required && !form[f.id]?.trim()) errs[f.id] = 'This field is required'
    })
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    // Map standard fields to lead shape
    const lead = {
      full_name:   form['f-name']       || form[intakeFields.find((f) => f.type === 'text' && f.label.toLowerCase().includes('name'))?.id] || 'Unknown',
      email:       form['f-email']      || form[intakeFields.find((f) => f.type === 'email')?.id] || '',
      phone:       form['f-phone']      || '',
      experience:  form['f-experience'] || '',
      goals:       form['f-goals']      || '',
      injuries:    form['f-injuries']   || '',
      federation:  form['f-fed']        || '',
      source:      form['f-hear']       || 'Public page',
      status: 'new',
    }
    addLead(orgId, lead)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id={id}>
        <div className="max-w-lg mx-auto text-center py-16">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: `${accent}20`, border: `2px solid ${accent}50` }}
          >
            <CheckCircle2 className="w-8 h-8" style={{ color: accent }} />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Application received!</h3>
          <p className="text-zinc-400 text-sm">Our coaching staff will review your application and reach out within 48 hours.</p>
        </div>
      </section>
    )
  }

  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      {section.body && <p className="text-zinc-400 text-sm mb-6 max-w-2xl">{section.body}</p>}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {intakeFields.map((field) => (
          <div key={field.id}>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {field.type === 'select' ? (
              <select
                value={form[field.id] || ''}
                onChange={(e) => { setForm((p) => ({ ...p, [field.id]: e.target.value })); setErrors((p) => ({ ...p, [field.id]: undefined })) }}
                className={cn(
                  'w-full bg-zinc-800 border rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 transition-all',
                  errors[field.id] ? 'border-red-500 focus:ring-red-500/30' : 'border-zinc-700 focus:ring-purple-500/30'
                )}
              >
                <option value="">Select…</option>
                {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                rows={3}
                placeholder={field.placeholder}
                value={form[field.id] || ''}
                onChange={(e) => { setForm((p) => ({ ...p, [field.id]: e.target.value })); setErrors((p) => ({ ...p, [field.id]: undefined })) }}
                className={cn(
                  'w-full bg-zinc-800 border rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 resize-none transition-all',
                  errors[field.id] ? 'border-red-500 focus:ring-red-500/30' : 'border-zinc-700 focus:ring-purple-500/30'
                )}
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.id] || ''}
                onChange={(e) => { setForm((p) => ({ ...p, [field.id]: e.target.value })); setErrors((p) => ({ ...p, [field.id]: undefined })) }}
                className={cn(
                  'w-full bg-zinc-800 border rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all',
                  errors[field.id] ? 'border-red-500 focus:ring-red-500/30' : 'border-zinc-700 focus:ring-purple-500/30'
                )}
              />
            )}
            {errors[field.id] && <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>}
          </div>
        ))}

        <button
          type="submit"
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.01] mt-2"
          style={{ backgroundColor: accent }}
        >
          Submit Application
        </button>
      </form>
    </section>
  )
}

// ─── Shared heading ───────────────────────────────────────────────────────────
function SectionHeading({ title, accent }) {
  return (
    <div className="mb-8">
      <div className="h-0.5 w-10 mb-4 rounded-full" style={{ backgroundColor: accent }} />
      <h2 className="text-2xl md:text-3xl font-bold text-zinc-100">{title}</h2>
    </div>
  )
}
