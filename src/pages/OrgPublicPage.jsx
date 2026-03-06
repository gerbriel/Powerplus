import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CheckCircle2, ChevronDown, ChevronUp, Zap, Star, Trophy, Users, ArrowRight, Mail, Phone, Instagram, Globe, Loader2 } from 'lucide-react'
import { useOrgStore } from '../lib/store'
import { fetchPublicOrgBySlug } from '../lib/supabase'
import { submitIntakeLead } from '../lib/db'
import { cn } from '../lib/utils'

// ─── Public-facing org page (no auth required) ─────────────────────────────
// Accessible at /org/:slug
export function OrgPublicPage() {
  const { slug } = useParams()
  const { orgs, addLead } = useOrgStore()

  // Try store first (when logged-in admin previews their own page); fall back to Supabase fetch
  const storeOrg = orgs.find((o) => o.slug === slug)

  const [liveData, setLiveData] = useState(null)   // { org, page, staff }
  const [loading, setLoading]   = useState(!storeOrg)
  const [fetchErr, setFetchErr] = useState(false)

  useEffect(() => {
    if (storeOrg) return  // already have it in the store
    setLoading(true)
    fetchPublicOrgBySlug(slug).then((result) => {
      if (result) setLiveData(result)
      else setFetchErr(true)
      setLoading(false)
    }).catch(() => { setFetchErr(true); setLoading(false) })
  }, [slug, storeOrg])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-center px-4">
        <Loader2 className="w-8 h-8 text-zinc-600 animate-spin mb-4" />
        <p className="text-zinc-500 text-sm">Loading team page…</p>
      </div>
    )
  }

  // Resolve org + page from store (admin preview) or Supabase fetch (public)
  let org, page, coaches, athleteCount
  if (storeOrg) {
    org          = storeOrg
    page         = storeOrg.public_page || {}
    coaches      = (storeOrg.members || []).filter((m) => ['head_coach','coach','nutritionist'].includes(m.org_role))
    athleteCount = (storeOrg.members || []).filter((m) => m.org_role === 'athlete').length
  } else if (liveData) {
    org          = liveData.org
    page         = liveData.page ? {
      published:        liveData.page.published,
      hero_headline:    liveData.page.hero_headline    || '',
      hero_subheadline: liveData.page.hero_subheadline || '',
      hero_cta:         liveData.page.hero_cta         || 'Apply to Join',
      accent_color:     liveData.page.accent_color     || '#a855f7',
      logo_url:         liveData.page.logo_url         || null,
      custom_url:       liveData.page.custom_url       || '',
      sections:         liveData.page.sections         || [],
      intake_fields:    liveData.page.intake_fields    || [],
    } : {}
    coaches      = liveData.staff || []
    athleteCount = 0
  } else {
    // Not found
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

  // Derive stats from mock data for social proof
  const stats = [
    { label: 'Athletes Coached', value: Math.max(athleteCount + 18, 24) + '+' },
    { label: 'Competition Meets', value: '47+' },
    { label: 'Coaching Staff', value: coaches.length },
    { label: 'Federation', value: org.federation || 'USAPL' },
  ]

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100 font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0d1117]/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}25` }}>
              <Zap className="w-4 h-4" style={{ color: accent }} />
            </div>
            <span className="font-bold text-zinc-100 text-sm">{org.name}</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
            {sections.filter(s => s.type !== 'intake').slice(0, 3).map(s => (
              <a key={s.id} href={`#sec-${s.id}`} className="hover:text-zinc-200 transition-colors">{s.title}</a>
            ))}
          </div>
          <a
            href="#intake"
            className="px-4 py-2 rounded-full text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-lg flex items-center gap-1.5"
            style={{ backgroundColor: accent, boxShadow: `0 0 20px ${accent}40` }}
          >
            {page.hero_cta || 'Apply Now'}
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${accent}22 0%, transparent 70%)` }}
      >
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />

        <div className="relative max-w-5xl mx-auto px-4 py-24 md:py-36 text-center">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8 border"
            style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}10` }}
          >
            <Trophy className="w-3.5 h-3.5" />
            {org.federation || 'Powerlifting'} · {org.address || 'Elite Coaching'}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.05] tracking-tight">
            {page.hero_headline || org.name}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            {page.hero_subheadline || ''}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#intake"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold text-base shadow-xl transition-all hover:scale-105 hover:shadow-2xl"
              style={{ backgroundColor: accent, boxShadow: `0 0 40px ${accent}40` }}
            >
              {page.hero_cta || 'Apply to Join'}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-zinc-300 font-semibold text-base bg-zinc-800/60 border border-zinc-700 hover:bg-zinc-700/60 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-y border-zinc-800 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content sections */}
      <div className="max-w-5xl mx-auto px-4 pb-24 space-y-24 pt-16">
        {sections.map((sec) => (
          <Section
            key={sec.id}
            section={sec}
            accent={accent}
            coaches={coaches}
            orgId={org.id}
            orgName={org.name}
            intakeFields={page.intake_fields || []}
            addLead={addLead}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-zinc-900/30 py-10">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${accent}25` }}>
              <Zap className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
            <span className="text-sm font-semibold text-zinc-400">{org.name}</span>
          </div>
          <p className="text-xs text-zinc-600">
            Powered by{' '}
            <Link to="/" className="text-zinc-500 hover:text-zinc-300 transition-colors font-medium">
              PowerPlus
            </Link>
            {' '}· Powerlifting Team OS
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Section router ──────────────────────────────────────────────────────────
function Section({ section, accent, coaches, orgId, orgName, intakeFields, addLead }) {
  const sectionId = `sec-${section.id}`
  switch (section.type) {
    case 'about':        return <AboutSection id={sectionId} section={section} accent={accent} />
    case 'coaches':      return <CoachesSection id={sectionId} section={section} accent={accent} coaches={coaches} />
    case 'highlights':   return <HighlightsSection id={sectionId} section={section} accent={accent} />
    case 'testimonials': return <TestimonialsSection id={sectionId} section={section} accent={accent} />
    case 'faq':          return <FaqSection id={sectionId} section={section} accent={accent} />
    case 'intake':       return <IntakeSection id="intake" section={section} accent={accent} orgId={orgId} orgName={orgName} intakeFields={intakeFields} addLead={addLead} />
    case 'custom':       return <CustomSection id={sectionId} section={section} accent={accent} />
    default:             return null
  }
}

// ─── About ───────────────────────────────────────────────────────────────────
function AboutSection({ id, section, accent }) {
  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">{section.body}</p>
    </section>
  )
}

// ─── Coaches ─────────────────────────────────────────────────────────────────
function CoachesSection({ id, section, accent, coaches }) {
  const roleLabel = (r) => ({ head_coach: 'Head Coach', coach: 'Coach', nutritionist: 'Nutritionist' }[r] || r)
  const roleBadgeColor = (r) => ({
    head_coach: accent,
    coach: '#3b82f6',
    nutritionist: '#22c55e',
  }[r] || '#71717a')

  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
        {coaches.map((c) => (
          <div
            key={c.user_id}
            className="group p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center text-center hover:border-zinc-700 transition-all"
            style={{ boxShadow: `0 0 0 0px ${accent}` }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-extrabold mb-5 text-white relative"
              style={{ background: `linear-gradient(135deg, ${accent}40, ${accent}20)`, border: `2px solid ${accent}40` }}
            >
              {c.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              {c.org_role === 'head_coach' && (
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                  <Star className="w-2.5 h-2.5 text-yellow-900 fill-yellow-900" />
                </div>
              )}
            </div>
            <p className="font-bold text-zinc-100 text-base">{c.full_name}</p>
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ color: roleBadgeColor(c.org_role), backgroundColor: `${roleBadgeColor(c.org_role)}18`, border: `1px solid ${roleBadgeColor(c.org_role)}30` }}
            >
              {roleLabel(c.org_role)}
            </span>
            {c.bio && <p className="text-xs text-zinc-500 mt-3 leading-relaxed line-clamp-2">{c.bio}</p>}
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
function HighlightsSection({ id, section, accent }) {
  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 gap-3">
        {(section.items || []).map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${accent}20` }}>
              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: accent }} />
            </div>
            <span className="text-sm text-zinc-300 leading-relaxed">{item}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Testimonials ────────────────────────────────────────────────────────────
function TestimonialsSection({ id, section, accent }) {
  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <div className="grid sm:grid-cols-2 gap-5">
        {(section.items || []).map((t, i) => (
          <div
            key={i}
            className="relative p-7 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors"
          >
            {/* Quote mark */}
            <div className="absolute top-4 right-5 text-6xl font-serif leading-none opacity-10 select-none" style={{ color: accent }}>"</div>
            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, si) => (
                <Star key={si} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed mb-6 relative z-10">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}80)` }}
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
function FaqSection({ id, section, accent }) {
  const [open, setOpen] = useState(null)
  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <div className="space-y-2 max-w-3xl">
        {(section.items || []).map((item, i) => (
          <div key={i} className="border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-zinc-800/40 transition-colors gap-4"
            >
              <span className="text-sm font-medium text-zinc-200">{item.q}</span>
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border border-zinc-700" style={{ borderColor: open === i ? `${accent}50` : undefined, backgroundColor: open === i ? `${accent}15` : undefined }}>
                {open === i
                  ? <ChevronUp className="w-3.5 h-3.5" style={{ color: accent }} />
                  : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
              </div>
            </button>
            {open === i && (
              <div className="px-5 pb-5">
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
function CustomSection({ id, section, accent }) {
  return (
    <section id={id}>
      <SectionHeading title={section.title} accent={accent} />
      <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line max-w-3xl">{section.body}</p>
    </section>
  )
}

// ─── Intake form ─────────────────────────────────────────────────────────────
function IntakeSection({ id, section, accent, orgId, orgName, intakeFields, addLead }) {
  const [form, setForm] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    intakeFields.forEach((f) => {
      if (f.type === 'section_heading') return
      if (f.required && !form[f.id]?.trim()) errs[f.id] = 'This field is required'
    })
    return errs
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    const lead = {
      // ── Contact ──────────────────────────────────────────────
      full_name:   [form['f-first-name'], form['f-last-name']].filter(Boolean).join(' ') || form['f-name'] || 'Unknown',
      email:       form['f-email']       || '',
      phone:       form['f-phone']       || '',
      instagram:   form['f-instagram']   || '',
      // ── Service ──────────────────────────────────────────────
      service:     form['f-service']     || '',
      coach_pref:  form['f-coach-pref']  || '',
      // ── Personal ─────────────────────────────────────────────
      age:              form['f-age']          ? parseInt(form['f-age'], 10)       : null,
      occupation:       form['f-occupation']   || '',
      height:           form['f-height']       || '',
      bodyweight:       form['f-weight']       || '',
      weight_class:     form['f-weight-class'] || '',
      obligations:      form['f-obligations']  || '',
      // ── Schedule ─────────────────────────────────────────────
      days_per_week:    form['f-days-per-week'] ? parseInt(form['f-days-per-week'], 10) : null,
      training_days:    form['f-training-days']  || '',
      training_time:    form['f-training-time']  || '',
      sleep_schedule:   form['f-sleep-schedule'] || '',
      sleep_hours:      form['f-sleep-hours'] ? parseFloat(form['f-sleep-hours']) : null,
      // ── Lifting Stats ────────────────────────────────────────
      squat_max:        form['f-squat-max']      || '',
      bench_max:        form['f-bench-max']      || '',
      deadlift_max:     form['f-deadlift-max']   || '',
      squat_freq:       form['f-squat-freq']  ? parseInt(form['f-squat-freq'], 10)  : null,
      bench_freq:       form['f-bench-freq']  ? parseInt(form['f-bench-freq'], 10)  : null,
      deadlift_freq:    form['f-deadlift-freq'] ? parseInt(form['f-deadlift-freq'], 10) : null,
      // ── Technique ────────────────────────────────────────────
      squat_style:      form['f-squat-style']    || '',
      bench_style:      form['f-bench-style']    || '',
      deadlift_style:   form['f-deadlift-style'] || '',
      current_program:  form['f-current-program']|| '',
      weakpoints:       form['f-weakpoints']     || '',
      // ── Background ───────────────────────────────────────────
      experience:       form['f-experience']     || '',
      federation:       form['f-fed']            || '',
      membership_num:   form['f-membership']     || '',
      injuries:         form['f-injuries']       || '',
      // ── Health ───────────────────────────────────────────────
      nutrition_score:  form['f-nutrition-score']  ? parseInt(form['f-nutrition-score'], 10)  : null,
      hydration_score:  form['f-hydration-score']  ? parseInt(form['f-hydration-score'], 10)  : null,
      stress_score:     form['f-stress-score']     ? parseInt(form['f-stress-score'], 10)     : null,
      recovery_score:   form['f-recovery']         ? parseInt(form['f-recovery'], 10)         : null,
      external_stressors: form['f-external-stressors'] || '',
      // ── Coaching Fit ─────────────────────────────────────────
      learner_type:     form['f-learner-type']   || '',
      expectations:     form['f-expectations']   || '',
      concerns:         form['f-concerns']       || '',
      goals:            form['f-goals']          || '',
      // ── Source ───────────────────────────────────────────────
      source:           form['f-hear']           || 'Public page',
      status: 'new',
      // ── Overflow: any custom / future fields ─────────────────
      extra_answers: Object.fromEntries(
        Object.entries(form).filter(([k]) =>
          !['f-first-name','f-last-name','f-name','f-email','f-phone','f-instagram',
            'f-service','f-coach-pref','f-age','f-occupation','f-height','f-weight',
            'f-weight-class','f-obligations','f-days-per-week','f-training-days',
            'f-training-time','f-sleep-schedule','f-sleep-hours','f-squat-max',
            'f-bench-max','f-deadlift-max','f-squat-freq','f-bench-freq','f-deadlift-freq',
            'f-squat-style','f-bench-style','f-deadlift-style','f-current-program',
            'f-weakpoints','f-experience','f-fed','f-membership','f-injuries',
            'f-nutrition-score','f-hydration-score','f-stress-score','f-recovery',
            'f-external-stressors','f-learner-type','f-expectations','f-concerns',
            'f-goals','f-hear'].includes(k)
        )
      ),
    }
    // Submit to Supabase (no auth required — public RLS policy)
    submitIntakeLead(orgId, lead).catch(() => {})
    // Also update local store if the admin is previewing their own page
    if (typeof addLead === 'function') addLead(orgId, lead)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <section id={id}>
        <div className="max-w-lg mx-auto text-center py-16">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}15)`, border: `2px solid ${accent}40` }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: accent }} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-100 mb-3">Application received!</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">Our coaching staff will review your application and reach out within 48 hours. Check your email for a confirmation.</p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-zinc-400">
            <Mail className="w-3.5 h-3.5" /> Check your inbox for a confirmation
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id={id}>
      <div className="max-w-2xl">
        <SectionHeading title={section.title} accent={accent} />
        {section.body && <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{section.body}</p>}

        <div
          className="p-6 md:p-8 rounded-3xl border"
          style={{ background: `linear-gradient(135deg, ${accent}08, transparent)`, borderColor: `${accent}25` }}
        >
          <form onSubmit={handleSubmit} className="space-y-1">
            <IntakeFieldList fields={intakeFields} form={form} setForm={setForm} errors={errors} setErrors={setErrors} accent={accent} />

            <button
              type="submit"
              className="w-full py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.01] flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: accent, boxShadow: `0 4px 20px ${accent}40` }}
            >
              Submit Application
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-xs text-zinc-600">
              We'll review your application and respond within 48 hours.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

// ─── Renders a list of intake fields, grouping `half` fields into pairs ──────
function IntakeFieldList({ fields, form, setForm, errors, setErrors, accent }) {
  const rows = []
  let i = 0
  while (i < fields.length) {
    const f = fields[i]
    if (f.type === 'section_heading') {
      rows.push(<IntakeField key={f.id} field={f} form={form} setForm={setForm} errors={errors} setErrors={setErrors} accent={accent} />)
      i++
    } else if (f.half && fields[i + 1]?.half && fields[i + 1]?.type !== 'section_heading') {
      // Pair two half-width fields side by side
      rows.push(
        <div key={f.id + '-pair'} className="grid grid-cols-2 gap-4">
          <IntakeField field={f} form={form} setForm={setForm} errors={errors} setErrors={setErrors} accent={accent} />
          <IntakeField field={fields[i + 1]} form={form} setForm={setForm} errors={errors} setErrors={setErrors} accent={accent} />
        </div>
      )
      i += 2
    } else {
      rows.push(<IntakeField key={f.id} field={f} form={form} setForm={setForm} errors={errors} setErrors={setErrors} accent={accent} />)
      i++
    }
  }
  return <div className="space-y-4">{rows}</div>
}

// ─── Reusable intake field ────────────────────────────────────────────────────
function IntakeField({ field, form, setForm, errors, setErrors, accent }) {
  // Section heading — not an input, just a visual divider
  if (field.type === 'section_heading') {
    return (
      <div className="pt-4 pb-1">
        <div className="h-px w-full mb-3" style={{ background: `linear-gradient(90deg, ${accent}50, transparent)` }} />
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>{field.label}</p>
      </div>
    )
  }

  const baseClass = cn(
    'w-full bg-zinc-800/80 border rounded-xl px-3.5 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all',
    errors[field.id] ? 'border-red-500/60 focus:ring-red-500/20' : 'border-zinc-700 focus:border-zinc-600'
  )
  const focusRingStyle = { '--tw-ring-color': `${accent}40` }

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === 'select' ? (
        <select
          value={form[field.id] || ''}
          onChange={(e) => { setForm((p) => ({ ...p, [field.id]: e.target.value })); setErrors((p) => ({ ...p, [field.id]: undefined })) }}
          className={baseClass}
          style={focusRingStyle}
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
          className={cn(baseClass, 'resize-none')}
          style={focusRingStyle}
        />
      ) : (
        <input
          type={field.type}
          placeholder={field.placeholder}
          value={form[field.id] || ''}
          onChange={(e) => { setForm((p) => ({ ...p, [field.id]: e.target.value })); setErrors((p) => ({ ...p, [field.id]: undefined })) }}
          className={baseClass}
          style={focusRingStyle}
        />
      )}
      {errors[field.id] && <p className="text-xs text-red-400 mt-1">{errors[field.id]}</p>}
    </div>
  )
}

// ─── Shared heading ───────────────────────────────────────────────────────────
function SectionHeading({ title, accent }) {
  return (
    <div className="mb-10">
      <div className="h-1 w-12 mb-5 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}50)` }} />
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-zinc-100 tracking-tight">{title}</h2>
    </div>
  )
}
