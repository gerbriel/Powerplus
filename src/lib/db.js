/**
 * db.js — Supabase persistence helpers for all user-facing input surfaces.
 *
 * All public functions:
 *  1. Guard on isSupabaseConfigured() — silently no-op for demo/offline mode
 *  2. Sanitize every user-supplied string through sanitizeText() before writing
 *  3. Log errors to the console but never throw, so the UI never crashes on a DB error
 *
 * Sanitization rules:
 *  - Strip leading/trailing whitespace
 *  - Collapse runs of whitespace to single spaces
 *  - Remove control characters (ASCII < 0x20 except tab/newline)
 *  - Truncate to per-field limits to prevent oversized payloads
 *  - Numeric fields are coerced with Number() and clamped to valid ranges
 *  - Boolean fields are coerced with Boolean()
 *  - Date strings are validated as ISO dates; invalid dates become null
 */

import { supabase, isSupabaseConfigured, createChannel, sendMessage, editMessage, updateChannel, upsertOrgPublicPage as sbUpsertOrgPublicPage, fetchOrgPublicPage as sbFetchOrgPublicPage, fetchOrgLeads as sbFetchOrgLeads, insertLead as sbInsertLead, updateLeadRecord as sbUpdateLeadRecord, deleteLeadRecord as sbDeleteLeadRecord, fetchOrgResources as sbFetchOrgResources, insertResource as sbInsertResource, updateResourceRecord as sbUpdateResourceRecord, deleteResourceRecord as sbDeleteResourceRecord } from './supabase'

// ─── Sanitization utilities ───────────────────────────────────────────────────

/** Strip control chars, collapse whitespace, trim, and truncate. */
function sanitizeText(value, maxLen = 1000) {
  if (value == null) return null
  return String(value)
    // remove control characters (keep \t and \n)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')   // collapse runs of spaces/tabs
    .trim()
    .slice(0, maxLen)
    || null  // empty string → null
}

/** Coerce a number to float, clamp to [min, max], return null if NaN. */
function sanitizeNumber(value, min = -Infinity, max = Infinity) {
  const n = Number(value)
  if (!isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

/** Parse and validate an ISO date string (YYYY-MM-DD). Returns null if invalid. */
function sanitizeDate(value) {
  if (!value) return null
  const s = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : s
}

/** Coerce to boolean. */
function sanitizeBool(value) {
  return Boolean(value)
}

/** Sanitize an array of strings (e.g. movement_affected). */
function sanitizeStringArray(arr, itemMaxLen = 100) {
  if (!Array.isArray(arr)) return []
  return arr
    .map(s => sanitizeText(s, itemMaxLen))
    .filter(Boolean)
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

/**
 * Save a daily check-in.
 * Called from CheckInPage when the athlete submits the final step.
 */
export async function saveCheckIn(athleteId, data) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:       athleteId,
    check_date:       sanitizeDate(data.check_date) ?? new Date().toISOString().slice(0, 10),
    check_type:       ['morning','post_workout','evening'].includes(data.check_type) ? data.check_type : 'morning',
    sleep_hours:      sanitizeNumber(data.sleep_hours, 0, 24),
    sleep_quality:    sanitizeNumber(data.sleep_quality, 1, 10),
    stress_level:     sanitizeNumber(data.stress, 1, 10),
    soreness_level:   sanitizeNumber(data.soreness, 0, 10),
    motivation_level: sanitizeNumber(data.motivation, 1, 10),
    bodyweight:       sanitizeNumber(data.body_weight, 0, 500) || null,
    bodyweight_unit:  ['kg','lbs'].includes(data.bodyweight_unit) ? data.bodyweight_unit : 'kg',
    notes:            sanitizeText(data.notes, 500),
  }

  const { data: saved, error } = await supabase
    .from('daily_checkins')
    .upsert(row, { onConflict: 'athlete_id,check_date,check_type' })
    .select()
    .single()

  if (error) { console.error('[db] saveCheckIn:', error.message); return null }
  return saved
}

// ─── Workout sessions & sets ──────────────────────────────────────────────────

/**
 * Upsert a workout session (create on start, update status on complete).
 */
export async function saveWorkoutSession(athleteId, session) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:           athleteId,
    name:                 sanitizeText(session.name, 200) ?? 'Workout',
    scheduled_date:       sanitizeDate(session.scheduled_date) ?? new Date().toISOString().slice(0, 10),
    status:               ['planned','in_progress','completed','missed','skipped'].includes(session.status) ? session.status : 'planned',
    overall_rpe:          sanitizeNumber(session.overall_rpe, 1, 10),
    notes:                sanitizeText(session.notes, 1000),
    started_at:           session.started_at ? new Date(session.started_at).toISOString() : null,
    completed_at:         session.completed_at ? new Date(session.completed_at).toISOString() : null,
  }

  // If an id is provided, update; otherwise insert
  if (session.id && !session.id.startsWith('local-')) {
    const { data: updated, error } = await supabase
      .from('workout_sessions')
      .update(row)
      .eq('id', session.id)
      .select()
      .single()
    if (error) { console.error('[db] saveWorkoutSession update:', error.message); return null }
    return updated
  }

  const { data: inserted, error } = await supabase
    .from('workout_sessions')
    .insert(row)
    .select()
    .single()
  if (error) { console.error('[db] saveWorkoutSession insert:', error.message); return null }
  return inserted
}

/**
 * Save a single logged set.
 */
export async function saveWorkoutSet(sessionId, setData) {
  if (!isSupabaseConfigured() || !sessionId) return null

  const row = {
    session_id:       sessionId,
    set_number:       sanitizeNumber(setData.set_number, 1, 999) ?? 1,
    planned_reps:     sanitizeNumber(setData.planned_reps, 0, 100),
    planned_weight:   sanitizeNumber(setData.planned_weight, 0, 1500),
    planned_rpe:      sanitizeNumber(setData.planned_rpe, 1, 10),
    performed_reps:   sanitizeNumber(setData.reps, 0, 100),
    performed_weight: sanitizeNumber(setData.weight_kg, 0, 1500),
    performed_rpe:    sanitizeNumber(setData.rpe, 1, 10),
    is_pr:            sanitizeBool(setData.pr),
    is_top_set:       sanitizeBool(setData.is_top_set),
    pain_area:        sanitizeText(setData.pain_area, 100),
    pain_level:       setData.pain_level ? String(sanitizeNumber(setData.pain_level, 0, 10)) : null,
    notes:            sanitizeText(setData.notes, 500),
    logged_at:        new Date().toISOString(),
  }

  const { data: saved, error } = await supabase
    .from('workout_sets')
    .insert(row)
    .select()
    .single()

  if (error) { console.error('[db] saveWorkoutSet:', error.message); return null }
  return saved
}

// ─── Goals ────────────────────────────────────────────────────────────────────

/**
 * Upsert a goal. Pass id for updates; omit for inserts.
 */
export async function saveGoal(athleteId, goal, createdBy = null) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const validTypes = ['strength','nutrition','meet','process']
  const row = {
    athlete_id:     athleteId,
    created_by:     createdBy ?? athleteId,
    goal_type:      validTypes.includes(goal.goal_type) ? goal.goal_type : 'process',
    title:          sanitizeText(goal.title, 200),
    description:    sanitizeText(goal.description, 1000),
    target_value:   sanitizeNumber(goal.target_value, 0),
    target_unit:    sanitizeText(goal.target_unit, 20),
    current_value:  sanitizeNumber(goal.current_value, 0),
    target_date:    sanitizeDate(goal.target_date),
    completed:      sanitizeBool(goal.completed),
    notes:          sanitizeText(goal.notes, 1000),
  }

  if (!row.title) { console.warn('[db] saveGoal: title required'); return null }

  if (goal.id && !goal.id.startsWith('g')) {
    const { data, error } = await supabase
      .from('goals').update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', goal.id).select().single()
    if (error) { console.error('[db] saveGoal update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase
    .from('goals').insert(row).select().single()
  if (error) { console.error('[db] saveGoal insert:', error.message); return null }
  return data
}

/**
 * Mark a goal as completed (or uncomplete it).
 */
export async function completeGoal(goalId, completed = true) {
  if (!isSupabaseConfigured() || !goalId) return null
  const { data, error } = await supabase
    .from('goals')
    .update({ completed, completed_at: completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq('id', goalId)
    .select().single()
  if (error) { console.error('[db] completeGoal:', error.message); return null }
  return data
}

/**
 * Delete a goal.
 */
export async function deleteGoal(goalId) {
  if (!isSupabaseConfigured() || !goalId) return false
  const { error } = await supabase.from('goals').delete().eq('id', goalId)
  if (error) { console.error('[db] deleteGoal:', error.message); return false }
  return true
}

// ─── Meets ────────────────────────────────────────────────────────────────────

/**
 * Upsert a meet.
 */
export async function saveMeet(createdBy, orgId, meet) {
  if (!isSupabaseConfigured() || !createdBy) return null

  const validFeds = ['USAPL','IPF','USPA','NASA','RPS','SPF','WPC','Other']
  const validStatuses = ['upcoming','registered','completed','cancelled']
  const validEquipment = ['raw','single-ply','multi-ply','wraps']

  const row = {
    created_by:            createdBy,
    org_id:                orgId ?? null,
    name:                  sanitizeText(meet.name, 200),
    federation:            validFeds.includes(meet.federation) ? meet.federation : 'Other',
    equipment:             validEquipment.includes(meet.equipment) ? meet.equipment : 'raw',
    location:              sanitizeText(meet.location, 200),
    meet_date:             sanitizeDate(meet.meet_date),
    registration_deadline: sanitizeDate(meet.registration_deadline),
    status:                validStatuses.includes(meet.status) ? meet.status : 'upcoming',
    website_url:           sanitizeText(meet.website_url, 500),
    notes:                 sanitizeText(meet.notes, 1000),
    // linked arrays — only valid UUIDs (filter out mock 'g1'/'tb-1' style ids)
    linked_goal_ids:  (Array.isArray(meet.linked_goal_ids)  ? meet.linked_goal_ids  : []).filter(id => id && !/^(g|tb|meet)-/.test(id)),
    linked_block_ids: (Array.isArray(meet.linked_block_ids) ? meet.linked_block_ids : []).filter(id => id && !/^(g|tb|meet)-/.test(id)),
    attempts:         meet.attempts ?? null,
  }

  if (!row.name) { console.warn('[db] saveMeet: name required'); return null }

  if (meet.id && !meet.id.startsWith('meet-')) {
    const { data, error } = await supabase.from('meets').update(row).eq('id', meet.id).select().single()
    if (error) { console.error('[db] saveMeet update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('meets').insert(row).select().single()
  if (error) { console.error('[db] saveMeet insert:', error.message); return null }
  return data
}

/**
 * Delete a meet by id.
 */
export async function deleteMeet(meetId) {
  if (!isSupabaseConfigured() || !meetId) return false
  const { error } = await supabase.from('meets').delete().eq('id', meetId)
  if (error) { console.error('[db] deleteMeet:', error.message); return false }
  return true
}

/**
 * Save attempt planner for a specific meet (updates attempts jsonb column).
 */
export async function saveMeetAttempts(meetId, attempts) {
  if (!isSupabaseConfigured() || !meetId) return null
  // Validate structure: { squat:{1,2,3}, bench:{1,2,3}, deadlift:{1,2,3} }
  const lifts = ['squat','bench','deadlift']
  const clean = {}
  for (const lift of lifts) {
    if (!attempts[lift]) { clean[lift] = { 1: 0, 2: 0, 3: 0 }; continue }
    clean[lift] = {
      1: sanitizeNumber(attempts[lift][1], 0, 1500),
      2: sanitizeNumber(attempts[lift][2], 0, 1500),
      3: sanitizeNumber(attempts[lift][3], 0, 1500),
    }
  }
  const { data, error } = await supabase.from('meets').update({ attempts: clean }).eq('id', meetId).select().single()
  if (error) { console.error('[db] saveMeetAttempts:', error.message); return null }
  return data
}

/**
 * Save athlete meet entry (attempts + results).
 */
export async function saveMeetEntry(meetId, athleteId, entry) {
  if (!isSupabaseConfigured() || !meetId || !athleteId) return null

  const row = {
    meet_id:        meetId,
    athlete_id:     athleteId,
    weight_class:   sanitizeText(entry.weight_class, 20),
    equipment_type: sanitizeText(entry.equipment_type, 30),
    squat_opener:   sanitizeNumber(entry.squat_opener, 0, 1500),
    bench_opener:   sanitizeNumber(entry.bench_opener, 0, 1500),
    deadlift_opener:sanitizeNumber(entry.deadlift_opener, 0, 1500),
    squat_result:   sanitizeNumber(entry.squat_result, 0, 1500),
    bench_result:   sanitizeNumber(entry.bench_result, 0, 1500),
    deadlift_result:sanitizeNumber(entry.deadlift_result, 0, 1500),
    total_result:   sanitizeNumber(entry.total_result, 0, 4500),
    dots_score:     sanitizeNumber(entry.dots_score, 0, 1000),
    wilks_score:    sanitizeNumber(entry.wilks_score, 0, 1000),
    placement:      sanitizeNumber(entry.placement, 1, 999),
    notes:          sanitizeText(entry.notes, 500),
  }

  const { data, error } = await supabase
    .from('athlete_meet_entries')
    .upsert(row, { onConflict: 'meet_id,athlete_id' })
    .select().single()
  if (error) { console.error('[db] saveMeetEntry:', error.message); return null }
  return data
}

// ─── Injury logs ──────────────────────────────────────────────────────────────

/**
 * Insert a new injury report.
 */
export async function reportInjury(athleteId, form) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:         athleteId,
    body_area:          sanitizeText(form.body_area, 100),
    pain_level:         sanitizeNumber(form.pain_level, 0, 10),
    injury_date:        sanitizeDate(form.injury_date) ?? new Date().toISOString().slice(0, 10),
    description:        sanitizeText(form.description, 1000),
    movement_affected:  sanitizeStringArray(
      typeof form.movement_affected === 'string'
        ? form.movement_affected.split(',')
        : form.movement_affected,
      100
    ),
    resolved:           false,
    reported_to_coach:  sanitizeBool(form.reported_to_coach),
  }

  if (!row.body_area || !row.description) { console.warn('[db] reportInjury: body_area and description required'); return null }

  const { data, error } = await supabase.from('injury_logs').insert(row).select().single()
  if (error) { console.error('[db] reportInjury:', error.message); return null }
  return data
}

/**
 * Update injury pain level / add a progress note (stored as coach_notes update).
 */
export async function updateInjury(injuryId, updates) {
  if (!isSupabaseConfigured() || !injuryId) return null

  const allowed = {}
  if (updates.pain_level != null)     allowed.pain_level    = sanitizeNumber(updates.pain_level, 0, 10)
  if (updates.coach_notes != null)    allowed.coach_notes   = sanitizeText(updates.coach_notes, 1000)
  if (updates.resolved != null)       allowed.resolved      = sanitizeBool(updates.resolved)
  if (updates.resolved_date != null)  allowed.resolved_date = sanitizeDate(updates.resolved_date)
  if (updates.reported_to_coach != null) allowed.reported_to_coach = sanitizeBool(updates.reported_to_coach)

  const { data, error } = await supabase
    .from('injury_logs').update(allowed).eq('id', injuryId).select().single()
  if (error) { console.error('[db] updateInjury:', error.message); return null }
  return data
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Save profile edits (personal info, athlete details, bio).
 */
export async function saveProfile(userId, updates) {
  if (!isSupabaseConfigured() || !userId) return null

  const allowedFederations = ['USAPL','IPF','USPA','NASA','RPS','SPF','WPC','Other','']
  const allowedEquipment   = ['raw','raw w/ wraps','single-ply','multi-ply','']

  const row = {}
  if (updates.full_name   != null) row.full_name    = sanitizeText(updates.full_name, 100)
  if (updates.display_name!= null) row.display_name = sanitizeText(updates.display_name, 60)
  if (updates.bio         != null) row.bio          = sanitizeText(updates.bio, 500)
  if (updates.weight_class!= null) row.weight_class = sanitizeText(updates.weight_class, 20)
  if (updates.member_id   != null) row.member_id    = sanitizeText(updates.member_id, 60)
  if (updates.federation  != null) row.federation   = allowedFederations.includes(updates.federation?.toLowerCase?.() ?? updates.federation) ? updates.federation : null
  if (updates.equipment_type != null) {
    const eq = (updates.equipment_type ?? '').toLowerCase()
    row.equipment_type = allowedEquipment.includes(eq) ? eq : null
  }

  if (Object.keys(row).length === 0) return null

  const { data, error } = await supabase
    .from('profiles').update(row).eq('id', userId).select().single()
  if (error) { console.error('[db] saveProfile:', error.message); return null }
  return data
}

// ─── Nutrition log ────────────────────────────────────────────────────────────

/**
 * Log daily nutrition actuals (macros + compliance).
 */
export async function saveNutritionLog(athleteId, log) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:       athleteId,
    log_date:         sanitizeDate(log.log_date) ?? new Date().toISOString().slice(0, 10),
    is_training_day:  sanitizeBool(log.is_training_day ?? true),
    calories_actual:  sanitizeNumber(log.calories_actual, 0, 20000),
    protein_actual:   sanitizeNumber(log.protein_actual, 0, 1000),
    carbs_actual:     sanitizeNumber(log.carbs_actual, 0, 2000),
    fat_actual:       sanitizeNumber(log.fat_actual, 0, 1000),
    water_actual:     sanitizeNumber(log.water_actual, 0, 20000),
    compliance_score: sanitizeNumber(log.compliance_score, 0, 100),
    hunger_level:     sanitizeNumber(log.hunger_level, 1, 10),
    energy_level:     sanitizeNumber(log.energy_level, 1, 10),
    notes:            sanitizeText(log.notes, 500),
  }

  const { data, error } = await supabase
    .from('nutrition_logs')
    .upsert(row, { onConflict: 'athlete_id,log_date' })
    .select().single()
  if (error) { console.error('[db] saveNutritionLog:', error.message); return null }
  return data
}

// ─── Training blocks ──────────────────────────────────────────────────────────

/**
 * Upsert a training block.
 */
export async function saveTrainingBlock(athleteId, orgId, block) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const validPhases = ['accumulation','intensification','peak','deload','transition','peaking']
  const validStatuses = ['planned','active','completed']

  const row = {
    athlete_id:     athleteId,
    org_id:         orgId ?? null,
    name:           sanitizeText(block.name, 200),
    phase:          validPhases.includes(block.phase) ? block.phase : 'accumulation',
    start_date:     sanitizeDate(block.start_date),
    end_date:       sanitizeDate(block.end_date),
    weeks:          sanitizeNumber(block.weeks, 1, 52),
    status:         validStatuses.includes(block.status) ? block.status : 'planned',
    focus:          sanitizeText(block.focus, 300),
    avg_rpe_target: sanitizeNumber(block.avg_rpe_target, 1, 10),
    notes:          sanitizeText(block.notes, 1000),
    // linked ids — strip mock-id patterns
    linked_meet_id:  (block.linked_meet_id && !/^(g|tb|meet)-/.test(block.linked_meet_id)) ? block.linked_meet_id : null,
    linked_goal_ids: (Array.isArray(block.linked_goal_ids) ? block.linked_goal_ids : []).filter(id => id && !/^(g|tb|meet)-/.test(id)),
  }

  if (!row.name) { console.warn('[db] saveTrainingBlock: name required'); return null }

  if (block.id && !block.id.startsWith('tb-')) {
    const { data, error } = await supabase.from('training_blocks').update(row).eq('id', block.id).select().single()
    if (error) { console.error('[db] saveTrainingBlock update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('training_blocks').insert(row).select().single()
  if (error) { console.error('[db] saveTrainingBlock insert:', error.message); return null }
  return data
}

/**
 * Delete a training block by id.
 * Used by staff on the Training Management page.
 */
export async function deleteTrainingBlock(blockId) {
  if (!isSupabaseConfigured() || !blockId) return false
  const { error } = await supabase.from('training_blocks').delete().eq('id', blockId)
  if (error) { console.error('[db] deleteTrainingBlock:', error.message); return false }
  return true
}

/**
 * Create or update an org-level training block (staff side — no athlete_id required).
 * Sanitizes all inputs before writing to Supabase.
 */
export async function saveOrgTrainingBlock(createdBy, orgId, block) {
  if (!isSupabaseConfigured() || !orgId) return null

  const validPhases   = ['accumulation','intensification','peak','peaking','deload','transition','offseason','hypertrophy']
  const validStatuses = ['planned','active','completed']

  const row = {
    org_id:              orgId,
    created_by:          createdBy ?? null,
    name:                sanitizeText(block.name, 200),
    phase:               validPhases.includes(block.phase) ? block.phase : null,
    block_type:          ['accumulation','intensification','peak','deload','transition'].includes(block.phase)
                           ? block.phase
                           : null,
    start_date:          sanitizeDate(block.start_date),
    end_date:            sanitizeDate(block.end_date),
    weeks:               sanitizeNumber(block.weeks, 1, 52),
    status:              validStatuses.includes(block.status) ? block.status : 'planned',
    focus:               sanitizeText(block.focus, 300),
    avg_rpe_target:      sanitizeNumber(block.avg_rpe_target, 1, 10),
    sessions_planned:    sanitizeNumber(block.sessions_planned, 0, 9999),
    sessions_completed:  sanitizeNumber(block.sessions_completed, 0, 9999),
    notes:               sanitizeText(block.notes, 1000),
    color:               sanitizeText(block.color, 30),
  }

  if (!row.name) { console.warn('[db] saveOrgTrainingBlock: name required'); return null }

  if (block.id && !block.id.startsWith('tb-')) {
    const { data, error } = await supabase
      .from('training_blocks').update(row).eq('id', block.id).select().single()
    if (error) { console.error('[db] saveOrgTrainingBlock update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase
    .from('training_blocks').insert(row).select().single()
  if (error) { console.error('[db] saveOrgTrainingBlock insert:', error.message); return null }
  return data
}

// ─── Calendar events ──────────────────────────────────────────────────────────

/**
 * Save a calendar event.
 */
export async function saveEvent(createdBy, orgId, event) {
  if (!isSupabaseConfigured() || !createdBy) return null

  const validTypes = ['session','meeting','meet','deadline','other']
  const row = {
    created_by:   createdBy,
    org_id:       orgId ?? null,
    title:        sanitizeText(event.title, 200),
    description:  sanitizeText(event.description, 1000),
    event_type:   validTypes.includes(event.event_type) ? event.event_type : 'other',
    start_time:   event.start_time ? new Date(event.start_time).toISOString() : null,
    end_time:     event.end_time   ? new Date(event.end_time).toISOString()   : null,
    location:     sanitizeText(event.location, 300),
    meeting_url:  sanitizeText(event.meeting_url, 500),
    attendee_ids: Array.isArray(event.attendee_ids) ? event.attendee_ids.filter(id => typeof id === 'string' && id.length > 0) : [],
  }

  if (!row.title || !row.start_time) { console.warn('[db] saveEvent: title and start_time required'); return null }

  const { data, error } = await supabase.from('events').insert(row).select().single()
  if (error) { console.error('[db] saveEvent:', error.message); return null }
  return data
}

// ─── Meal prep recipes ────────────────────────────────────────────────────────

/**
 * Upsert a meal prep recipe.
 */
export async function saveMealPrepRecipe(createdBy, orgId, recipe) {
  if (!isSupabaseConfigured() || !createdBy) return null

  const validMealTypes = ['breakfast','lunch','dinner','snack','pre-workout','post-workout','']

  const row = {
    created_by:  createdBy,
    org_id:      orgId ?? null,
    name:        sanitizeText(recipe.name, 200),
    meal_type:   validMealTypes.includes(recipe.meal_type) ? recipe.meal_type : null,
    prep_time:   sanitizeNumber(recipe.prep_time, 0, 600),
    cook_time:   sanitizeNumber(recipe.cook_time, 0, 600),
    servings:    sanitizeNumber(recipe.servings, 1, 100) ?? 1,
    macros_per_serving: {
      calories: sanitizeNumber(recipe.macros_per_serving?.calories, 0, 10000) ?? 0,
      protein:  sanitizeNumber(recipe.macros_per_serving?.protein,  0, 500)  ?? 0,
      carbs:    sanitizeNumber(recipe.macros_per_serving?.carbs,    0, 1000) ?? 0,
      fat:      sanitizeNumber(recipe.macros_per_serving?.fat,      0, 500)  ?? 0,
    },
    ingredients:  Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map(i => ({ name: sanitizeText(i.name, 100), amount: sanitizeText(i.amount, 50) })).filter(i => i.name)
      : [],
    instructions: sanitizeText(recipe.instructions, 5000),
    tags:         sanitizeStringArray(recipe.tags, 50),
  }

  if (!row.name) { console.warn('[db] saveMealPrepRecipe: name required'); return null }

  if (recipe.id && !recipe.id.startsWith('r-')) {
    const { data, error } = await supabase
      .from('meal_prep_recipes')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', recipe.id).select().single()
    if (error) { console.error('[db] saveMealPrepRecipe update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('meal_prep_recipes').insert(row).select().single()
  if (error) { console.error('[db] saveMealPrepRecipe insert:', error.message); return null }
  return data
}

// ─── Shopping lists ───────────────────────────────────────────────────────────

/**
 * Upsert a shopping list.
 */
export async function saveShoppingList(athleteId, createdBy, orgId, list) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:  athleteId,
    created_by:  createdBy ?? athleteId,
    org_id:      orgId ?? null,
    label:       sanitizeText(list.label, 200),
    week_start:  sanitizeDate(list.week_start),
    week_end:    sanitizeDate(list.week_end),
    budget:      sanitizeNumber(list.budget, 0, 100000),
    status:      ['active','completed'].includes(list.status) ? list.status : 'active',
    notes:       sanitizeText(list.notes, 500),
  }

  if (!row.label) { console.warn('[db] saveShoppingList: label required'); return null }

  if (list.id && !list.id.startsWith('sl-')) {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', list.id).select().single()
    if (error) { console.error('[db] saveShoppingList update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('shopping_lists').insert(row).select().single()
  if (error) { console.error('[db] saveShoppingList insert:', error.message); return null }
  return data
}

/**
 * Upsert a single shopping list item (check/uncheck or add new).
 */
export async function saveShoppingListItem(listId, item, addedBy = null) {
  if (!isSupabaseConfigured() || !listId) return null

  const row = {
    list_id:   listId,
    name:      sanitizeText(item.name, 200),
    amount:    sanitizeText(item.amount, 100),
    weight_g:  sanitizeNumber(item.weight_g, 0, 100000),
    price:     sanitizeNumber(item.price, 0, 100000),
    checked:   sanitizeBool(item.checked ?? false),
    notes:     sanitizeText(item.notes, 300),
    added_by:  addedBy ?? null,
  }

  if (!row.name) return null

  if (item.id && !item.id.startsWith('sli-')) {
    const { data, error } = await supabase
      .from('shopping_list_items').update(row).eq('id', item.id).select().single()
    if (error) { console.error('[db] saveShoppingListItem update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('shopping_list_items').insert(row).select().single()
  if (error) { console.error('[db] saveShoppingListItem insert:', error.message); return null }
  return data
}

/**
 * Toggle the checked state of a shopping list item.
 */
export async function toggleShoppingItem(itemId, checked) {
  if (!isSupabaseConfigured() || !itemId) return null
  const { data, error } = await supabase
    .from('shopping_list_items').update({ checked: sanitizeBool(checked) }).eq('id', itemId).select().single()
  if (error) { console.error('[db] toggleShoppingItem:', error.message); return null }
  return data
}

// ─── Nutrition Plans ──────────────────────────────────────────────────────────

/**
 * Upsert a nutrition plan record for an athlete.
 * Used by the coach's Meal Plan editor in the Roster modal.
 */
export async function saveNutritionPlan(athleteId, createdBy, orgId, planData) {
  if (!isSupabaseConfigured() || !athleteId) return null

  const row = {
    athlete_id:              athleteId,
    created_by:              createdBy ?? null,
    last_edited_by:          createdBy ?? null,
    org_id:                  orgId ?? null,
    name:                    sanitizeText(planData.name, 200) || 'Meal Plan',
    calories_training:       sanitizeNumber(planData.calories_training ?? planData.target_calories, 0, 50000),
    calories_rest:           sanitizeNumber(planData.calories_rest, 0, 50000),
    protein_g:               sanitizeNumber(planData.protein_g ?? planData.target_protein, 0, 2000),
    carbs_g:                 sanitizeNumber(planData.carbs_g, 0, 2000),
    fat_g:                   sanitizeNumber(planData.fat_g, 0, 2000),
    fiber_g:                 sanitizeNumber(planData.fiber_g, 0, 200),
    water_ml:                sanitizeNumber(planData.water_ml, 0, 20000),
    cadence:                 planData.cadence ?? 'weekly',
    valid_from:              sanitizeDate(planData.valid_from),
    valid_to:                sanitizeDate(planData.valid_to),
    linked_training_block_id: planData.block_id ?? null,
    linked_goal_ids:         Array.isArray(planData.goal_ids) ? planData.goal_ids : [],
    coach_notes:             sanitizeText(planData.coach_notes, 2000),
    athlete_can_edit:        sanitizeBool(planData.athlete_can_edit ?? false),
    active:                  true,
    updated_at:              new Date().toISOString(),
  }

  // Upsert on id if a real DB id was supplied (not a mock 'np-' prefixed id)
  if (planData.id && !planData.id.startsWith('np-')) {
    const { data, error } = await supabase
      .from('nutrition_plans')
      .update(row)
      .eq('id', planData.id)
      .select().single()
    if (error) { console.error('[db] saveNutritionPlan update:', error.message); return null }
    return data
  }

  const { data, error } = await supabase.from('nutrition_plans').insert(row).select().single()
  if (error) { console.error('[db] saveNutritionPlan insert:', error.message); return null }
  return data
}

// ─── Coach Notes ──────────────────────────────────────────────────────────────

/**
 * Persist a coach note for an athlete using the audit_logs table.
 * action = 'coach_note', entity_type = 'athlete', entity_id = athleteId,
 * changes = { note: <text>, note_id: <local id> }
 */
export async function saveCoachNote(staffId, athleteId, noteText, noteId = null) {
  if (!isSupabaseConfigured() || !staffId || !athleteId) return null
  const sanitized = sanitizeText(noteText, 2000)
  if (!sanitized) return null

  const row = {
    actor_id:    staffId,
    action:      'coach_note',
    entity_type: 'athlete',
    entity_id:   athleteId,
    changes:     { note: sanitized, ...(noteId != null ? { note_id: String(noteId) } : {}) },
  }

  const { data, error } = await supabase.from('audit_logs').insert(row).select().single()
  if (error) { console.error('[db] saveCoachNote:', error.message); return null }
  return data
}

// ─── Direct Messaging ─────────────────────────────────────────────────────────

/**
 * Send a direct message from a coach/staff member to an athlete.
 * Finds or creates the DM channel, then inserts the message.
 */
export async function sendDirectMessage(fromId, toAthleteId, orgId, content) {
  if (!isSupabaseConfigured() || !fromId || !toAthleteId) return null
  const sanitized = sanitizeText(content, 2000)
  if (!sanitized) return null

  try {
    // Find or create a DM channel between the two users
    let channelId = null

    const { data: existing } = await supabase
      .rpc('find_dm_channel', { p_org_id: orgId, p_user_a: fromId, p_user_b: toAthleteId })
    if (existing) {
      channelId = existing
    } else {
      // Create a new DM channel
      const { data: chan, error: chanErr } = await supabase
        .from('channels')
        .insert({
          org_id:       orgId,
          name:         `dm-${fromId}-${toAthleteId}`,
          description:  '',
          channel_type: 'dm',
          created_by:   fromId,
        })
        .select().single()
      if (chanErr) { console.error('[db] sendDirectMessage createChannel:', chanErr.message); return null }
      channelId = chan.id

      // Add both users as members
      await supabase.from('channel_members').insert([
        { channel_id: channelId, user_id: fromId },
        { channel_id: channelId, user_id: toAthleteId },
      ])
    }

    if (!channelId) return null

    const { data, error } = await supabase
      .from('messages')
      .insert({ channel_id: channelId, sender_id: fromId, content: sanitized, message_type: 'text' })
      .select().single()
    if (error) { console.error('[db] sendDirectMessage insert message:', error.message); return null }
    return data
  } catch (err) {
    console.error('[db] sendDirectMessage:', err.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Programming — exercises
// ─────────────────────────────────────────────────────────────────────────────

import {
  createExercise as sbCreateExercise,
  updateExercise as sbUpdateExercise,
  deleteExercise as sbDeleteExercise,
  createProgramTemplate as sbCreateProgramTemplate,
  updateProgramTemplate as sbUpdateProgramTemplate,
  deleteProgramTemplate as sbDeleteProgramTemplate,
  upsertWorkoutTemplate as sbUpsertWorkoutTemplate,
  saveWorkoutTemplateExercises as sbSaveWorkoutTemplateExercises,
} from './supabase'

/**
 * Sanitize and upsert an exercise.
 * @param {object} fields — { name, category, muscle_groups, equipment, description,
 *                            video_url, technique_tags, is_competition_lift,
 *                            created_by, org_id, is_global }
 */
export async function saveExercise(fields) {
  if (!isSupabaseConfigured()) return null
  const sanitized = {
    name:               sanitizeText(fields.name, 200),
    category:           sanitizeText(fields.category, 50),
    description:        sanitizeText(fields.description, 2000) ?? null,
    video_url:          sanitizeText(fields.video_url, 500) ?? null,
    is_competition_lift: Boolean(fields.is_competition_lift),
    is_global:          Boolean(fields.is_global),
    created_by:         fields.created_by ?? null,
    org_id:             fields.org_id ?? null,
    muscle_groups:      Array.isArray(fields.muscle_groups)
                          ? fields.muscle_groups.map(s => sanitizeText(s, 100)).filter(Boolean)
                          : null,
    equipment:          Array.isArray(fields.equipment)
                          ? fields.equipment.map(s => sanitizeText(s, 100)).filter(Boolean)
                          : null,
    technique_tags:     Array.isArray(fields.technique_tags)
                          ? fields.technique_tags.map(s => sanitizeText(s, 100)).filter(Boolean)
                          : null,
  }
  if (!sanitized.name || !sanitized.category) {
    console.warn('[db] saveExercise: name and category are required')
    return null
  }
  if (fields.id) {
    return sbUpdateExercise(fields.id, sanitized)
  }
  return sbCreateExercise(sanitized)
}

/** Delete an exercise by id. */
export async function deleteExercise(id) {
  if (!isSupabaseConfigured() || !id) return false
  return sbDeleteExercise(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Programming — program templates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize and save a program template (create or update).
 * @param {object} fields — { id?, name, description, weeks, block_type,
 *                            programming_style, created_by, org_id, tags }
 */
export async function saveProgramTemplate(fields) {
  if (!isSupabaseConfigured()) return null
  const sanitized = {
    name:               sanitizeText(fields.name, 200),
    description:        sanitizeText(fields.description, 2000) ?? null,
    weeks:              sanitizeNumber(fields.weeks, 1, 52) ?? 12,
    block_type:         sanitizeText(fields.block_type, 50) ?? 'accumulation',
    programming_style:  sanitizeText(fields.programming_style, 50) ?? 'hybrid',
    created_by:         fields.created_by ?? null,
    org_id:             fields.org_id ?? null,
    is_public:          Boolean(fields.is_public),
    tags:               Array.isArray(fields.tags)
                          ? fields.tags.map(s => sanitizeText(s, 100)).filter(Boolean)
                          : null,
  }
  if (!sanitized.name) {
    console.warn('[db] saveProgramTemplate: name is required')
    return null
  }
  if (fields.id) {
    return sbUpdateProgramTemplate(fields.id, sanitized)
  }
  return sbCreateProgramTemplate(sanitized)
}

/** Delete a program template (cascades to child tables). */
export async function deleteProgramTemplate(id) {
  if (!isSupabaseConfigured() || !id) return false
  return sbDeleteProgramTemplate(id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Programming — workout templates (Workout Builder)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a Workout Builder session: upsert the workout_template row then
 * replace all its exercises. Returns { workoutTemplate, success }.
 *
 * @param {object} meta — { id?, template_id, week_id?, day_of_week, name, notes, estimated_duration }
 * @param {Array}  blocks — [{ type, exercises: [{ exercise_id, sets, reps, intensity_type,
 *                             intensity_value, rest_seconds, tempo, coaching_cues, notes }] }]
 */
export async function saveWorkoutBuilder(meta, blocks) {
  if (!isSupabaseConfigured()) return { workoutTemplate: null, success: false }

  const sanitizedMeta = {
    id:                 meta.id ?? undefined,
    template_id:        meta.template_id ?? null,
    week_id:            meta.week_id ?? null,
    day_of_week:        sanitizeNumber(meta.day_of_week, 0, 6) ?? 0,
    name:               sanitizeText(meta.name, 200) ?? 'Untitled Session',
    notes:              sanitizeText(meta.notes, 2000) ?? null,
    estimated_duration: sanitizeNumber(meta.estimated_duration, 1, 480) ?? null,
  }

  const workoutTemplate = await sbUpsertWorkoutTemplate(sanitizedMeta)
  if (!workoutTemplate) return { workoutTemplate: null, success: false }

  // Flatten blocks into ordered exercise rows
  const exerciseRows = []
  let order = 0
  for (const block of blocks) {
    for (const ex of block.exercises) {
      exerciseRows.push({
        exercise_id:     ex.exercise_id,
        block_type:      sanitizeText(block.type, 50),
        order_index:     order++,
        sets:            sanitizeNumber(ex.sets, 1, 100) ?? null,
        reps:            sanitizeText(ex.reps, 50) ?? null,
        intensity_type:  sanitizeText(ex.intensity_type, 50) ?? null,
        intensity_value: sanitizeText(ex.intensity_value, 100) ?? null,
        rest_seconds:    sanitizeNumber(ex.rest_seconds, 0, 3600) ?? null,
        tempo:           sanitizeText(ex.tempo, 50) ?? null,
        coaching_cues:   sanitizeText(ex.coaching_cues, 1000) ?? null,
        notes:           sanitizeText(ex.notes, 1000) ?? null,
      })
    }
  }

  const success = await sbSaveWorkoutTemplateExercises(workoutTemplate.id, exerciseRows)
  return { workoutTemplate, success }
}

// ─── Calendar events (update / delete) ───────────────────────────────────────

/**
 * Update a calendar event (sanitized). Used for drag-and-drop date changes and edits.
 */
export async function updateEvent(eventId, fields) {
  if (!isSupabaseConfigured() || !eventId) return null
  const validTypes = ['session','meeting','meet','deadline','other']
  const row = {}
  if (fields.title        !== undefined) row.title        = sanitizeText(fields.title, 200)
  if (fields.description  !== undefined) row.description  = sanitizeText(fields.description, 1000)
  if (fields.event_type   !== undefined) row.event_type   = validTypes.includes(fields.event_type) ? fields.event_type : 'other'
  if (fields.start_time   !== undefined) row.start_time   = fields.start_time ? new Date(fields.start_time).toISOString() : null
  if (fields.end_time     !== undefined) row.end_time     = fields.end_time   ? new Date(fields.end_time).toISOString()   : null
  if (fields.location     !== undefined) row.location     = sanitizeText(fields.location, 300)
  if (fields.meeting_url  !== undefined) row.meeting_url  = sanitizeText(fields.meeting_url, 500)
  if (fields.attendee_ids !== undefined) row.attendee_ids = Array.isArray(fields.attendee_ids) ? fields.attendee_ids.filter(id => typeof id === 'string' && id.length > 0) : []
  if (!Object.keys(row).length) return null
  const { data, error } = await supabase.from('events').update(row).eq('id', eventId).select().single()
  if (error) { console.error('[db] updateEvent:', error.message); return null }
  return data
}

/**
 * Delete a calendar event by id.
 */
export async function deleteCalendarEvent(eventId) {
  if (!isSupabaseConfigured() || !eventId) return false
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) { console.error('[db] deleteCalendarEvent:', error.message); return false }
  return true
}

// ─── Meal prep recipes (delete) ───────────────────────────────────────────────

/**
 * Delete a meal prep recipe by id.
 */
export async function deleteMealPrepRecipe(recipeId) {
  if (!isSupabaseConfigured() || !recipeId) return false
  const { error } = await supabase.from('meal_prep_recipes').delete().eq('id', recipeId)
  if (error) { console.error('[db] deleteMealPrepRecipe:', error.message); return false }
  return true
}

// ─── Shopping list items (delete) ─────────────────────────────────────────────

/**
 * Delete a single shopping list item by id.
 */
export async function deleteShoppingListItem(itemId) {
  if (!isSupabaseConfigured() || !itemId) return false
  const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId)
  if (error) { console.error('[db] deleteShoppingListItem:', error.message); return false }
  return true
}

// ─── Body weight log ──────────────────────────────────────────────────────────

/**
 * Persist a body-weight entry for an athlete via the nutrition_logs upsert.
 * Reuses the same daily log row (upsert on athlete_id + log_date).
 */
export async function saveBodyWeight(athleteId, weightKg, logDate) {
  if (!isSupabaseConfigured() || !athleteId) return null
  const row = {
    athlete_id:   athleteId,
    log_date:     sanitizeDate(logDate) ?? new Date().toISOString().slice(0, 10),
    body_weight:  sanitizeNumber(weightKg, 20, 500),
  }
  const { data, error } = await supabase
    .from('nutrition_logs')
    .upsert(row, { onConflict: 'athlete_id,log_date' })
    .select().single()
  if (error) { console.error('[db] saveBodyWeight:', error.message); return null }
  return data
}

// ─── Meal prep session (full persist) ────────────────────────────────────────

/**
 * Create a full meal prep session + items for an athlete (sanitized).
 */
export async function savePrepSessionFull(athleteId, orgId, createdBy, session, items) {
  if (!isSupabaseConfigured() || !athleteId) return null
  const sessionRow = {
    athlete_id:              athleteId,
    created_by:              createdBy ?? athleteId,
    org_id:                  orgId ?? null,
    label:                   sanitizeText(session.label, 200),
    prep_date:               sanitizeDate(session.date) ?? new Date().toISOString().slice(0, 10),
    cadence:                 ['weekly','biweekly','monthly','daily'].includes(session.cadence) ? session.cadence : 'weekly',
    period_start:            sanitizeDate(session.week_start),
    period_end:              sanitizeDate(session.week_end),
    total_calories_prepped:  sanitizeNumber(session.total_calories_prepped, 0, 9999999) ?? 0,
    total_protein_prepped:   sanitizeNumber(session.total_protein_prepped, 0, 999999) ?? 0,
    notes:                   sanitizeText(session.notes, 500),
  }
  if (!sessionRow.label) { console.warn('[db] savePrepSessionFull: label required'); return null }
  const { data: newSession, error: sErr } = await supabase
    .from('meal_prep_sessions')
    .insert(sessionRow)
    .select()
    .single()
  if (sErr) { console.error('[db] savePrepSessionFull session:', sErr.message); return null }

  if (items && items.length > 0) {
    const itemRows = items.map(item => ({
      session_id:          newSession.id,
      recipe_id:           item.recipe_id ?? null,
      recipe_name:         sanitizeText(item.recipe_name, 200) ?? '',
      servings_made:       sanitizeNumber(item.servings_made, 0, 9999) ?? 1,
      servings_consumed:   sanitizeNumber(item.servings_consumed, 0, 9999) ?? 0,
      storage:             ['fridge','freezer','counter'].includes(item.storage) ? item.storage : 'fridge',
      macros_per_serving: {
        calories: sanitizeNumber(item.macros_per_serving?.calories, 0, 10000) ?? 0,
        protein:  sanitizeNumber(item.macros_per_serving?.protein,  0, 500)  ?? 0,
        carbs:    sanitizeNumber(item.macros_per_serving?.carbs,    0, 1000) ?? 0,
        fat:      sanitizeNumber(item.macros_per_serving?.fat,      0, 500)  ?? 0,
      },
      notes: sanitizeText(item.notes, 300),
    }))
    const { error: iErr } = await supabase.from('meal_prep_session_items').insert(itemRows)
    if (iErr) console.error('[db] savePrepSessionFull items:', iErr.message)
  }
  return newSession
}

// ── Messaging helpers ─────────────────────────────────────────────────────────

const VALID_CHANNEL_TYPES = ['public', 'private', 'announcement', 'dm', 'group']
const VALID_MESSAGE_TYPES = ['text', 'image', 'video', 'gif', 'file']

/**
 * Sanitize + write a channel record.
 */
export async function saveChannelRecord({ orgId, name, description, channelType, createdBy, memberIds = [] }) {
  if (!isSupabaseConfigured()) return null
  const cleanName = sanitizeText(name, 80)?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (!cleanName) { console.warn('[db] saveChannelRecord: name required'); return null }
  const cleanDesc = sanitizeText(description, 500) ?? ''
  const cleanType = VALID_CHANNEL_TYPES.includes(channelType) ? channelType : 'public'
  const cleanMembers = sanitizeStringArray(memberIds, 100)
  return createChannel({ orgId, name: cleanName, description: cleanDesc, channelType: cleanType, createdBy, memberIds: cleanMembers })
}

/**
 * Sanitize + write a message to a channel.
 */
export async function saveMessageRecord({ channelId, senderId, content, messageType = 'text', mediaUrl = null, gifUrl = null, formatting = null }) {
  if (!isSupabaseConfigured()) return null
  const cleanContent = sanitizeText(content, 4000)
  if (!cleanContent) { console.warn('[db] saveMessageRecord: content required'); return null }
  const cleanType    = VALID_MESSAGE_TYPES.includes(messageType) ? messageType : 'text'
  const cleanMedia   = mediaUrl   ? sanitizeText(mediaUrl,   1000) : null
  const cleanGif     = gifUrl     ? sanitizeText(gifUrl,     1000) : null
  const cleanFmt     = formatting ? {
    bold:      sanitizeBool(formatting.bold),
    italic:    sanitizeBool(formatting.italic),
    underline: sanitizeBool(formatting.underline),
  } : null
  return sendMessage({ channelId, senderId, content: cleanContent, messageType: cleanType, mediaUrl: cleanMedia, gifUrl: cleanGif, formatting: cleanFmt })
}

/**
 * Sanitize + update message content.
 */
export async function updateMessageRecord(messageId, content) {
  if (!isSupabaseConfigured()) return false
  const cleanContent = sanitizeText(content, 4000)
  if (!cleanContent) { console.warn('[db] updateMessageRecord: content required'); return false }
  return editMessage(messageId, cleanContent)
}

/**
 * Sanitize + update channel fields (name/description/type).
 */
export async function updateChannelRecord(channelId, updates) {
  if (!isSupabaseConfigured()) return false
  const clean = {}
  if (updates.name !== undefined)        clean.name        = sanitizeText(updates.name, 80)?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  if (updates.description !== undefined) clean.description = sanitizeText(updates.description, 500) ?? ''
  if (updates.channel_type !== undefined && VALID_CHANNEL_TYPES.includes(updates.channel_type)) clean.channel_type = updates.channel_type
  if (updates.type !== undefined && VALID_CHANNEL_TYPES.includes(updates.type)) clean.channel_type = updates.type
  return updateChannel(channelId, clean)
}

// ─── Sanitization constants ───────────────────────────────────────────────────
const VALID_LEAD_STATUSES = ['new', 'contacted', 'onboarded', 'declined']
const VALID_FIELD_TYPES   = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'section_heading']
const VALID_SECTION_TYPES = ['about', 'coaches', 'highlights', 'testimonials', 'faq', 'intake', 'custom']

// ─── Org Website / Public Page helpers ───────────────────────────────────────

/** Sanitize a section object before writing to Supabase. */
function sanitizeSection(sec) {
  return {
    id: sanitizeText(sec.id, 60) || `sec-${Date.now()}`,
    type: VALID_SECTION_TYPES.includes(sec.type) ? sec.type : 'custom',
    title: sanitizeText(sec.title, 120) || '',
    body: sanitizeText(sec.body, 5000) || '',
    visible: sanitizeBool(sec.visible ?? true),
    order: sanitizeNumber(sec.order ?? 0, 0, 999),
    items: Array.isArray(sec.items) ? sec.items.map(sanitizeSectionItem) : [],
  }
}

/** Sanitize a single section item (highlight string, testimonial, faq pair). */
function sanitizeSectionItem(item) {
  if (typeof item === 'string') return sanitizeText(item, 500) || ''
  if (typeof item === 'object' && item !== null) {
    // testimonial
    if ('author' in item || 'text' in item) {
      return {
        author: sanitizeText(item.author, 120) || '',
        role:   sanitizeText(item.role, 120) || '',
        text:   sanitizeText(item.text, 1000) || '',
      }
    }
    // faq
    if ('q' in item || 'a' in item) {
      return {
        q: sanitizeText(item.q, 500) || '',
        a: sanitizeText(item.a, 2000) || '',
      }
    }
  }
  return item
}

/** Sanitize an intake field definition. */
function sanitizeIntakeField(f) {
  return {
    id:          sanitizeText(f.id, 60) || `f-${Date.now()}`,
    label:       sanitizeText(f.label, 200) || '',
    type:        VALID_FIELD_TYPES.includes(f.type) ? f.type : 'text',
    required:    sanitizeBool(f.required ?? false),
    placeholder: sanitizeText(f.placeholder, 200) || '',
    options:     Array.isArray(f.options) ? f.options.map((o) => sanitizeText(o, 200)).filter(Boolean) : [],
    half:        sanitizeBool(f.half ?? false),
    order:       sanitizeNumber(f.order ?? 0, 0, 999),
  }
}

/**
 * Sanitize + upsert the org_public_pages row.
 * Pass the full public_page object (hero settings, sections, intake_fields).
 */
export async function saveOrgPublicPage(orgId, page) {
  if (!isSupabaseConfigured() || !orgId) return null

  const payload = {}
  if (page.published        !== undefined) payload.published        = sanitizeBool(page.published)
  if (page.hero_headline    !== undefined) payload.hero_headline    = sanitizeText(page.hero_headline, 200)
  if (page.hero_subheadline !== undefined) payload.hero_subheadline = sanitizeText(page.hero_subheadline, 500)
  if (page.hero_cta         !== undefined) payload.hero_cta         = sanitizeText(page.hero_cta, 100)
  if (page.accent_color     !== undefined) payload.accent_color     = /^#[0-9a-fA-F]{3,8}$/.test(page.accent_color) ? page.accent_color : '#a855f7'
  if (page.logo_url         !== undefined) payload.logo_url         = sanitizeText(page.logo_url, 500)
  if (page.custom_url       !== undefined) payload.custom_url       = sanitizeText(page.custom_url, 300)
  if (page.sections         !== undefined) payload.sections         = (page.sections || []).map(sanitizeSection)
  if (page.intake_fields    !== undefined) payload.intake_fields    = (page.intake_fields || []).map(sanitizeIntakeField)

  return sbUpsertOrgPublicPage(orgId, payload)
}

/**
 * Fetch the org public page row from Supabase.
 */
export async function loadOrgPublicPage(orgId) {
  if (!isSupabaseConfigured() || !orgId) return null
  return sbFetchOrgPublicPage(orgId)
}

/**
 * Fetch all leads for an org.
 */
export async function loadOrgLeads(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  return sbFetchOrgLeads(orgId)
}

/**
 * Sanitize + insert an intake form submission (lead).
 * Called from the public OrgPublicPage — no auth required.
 */
export async function submitIntakeLead(orgId, lead) {
  if (!isSupabaseConfigured() || !orgId) return null

  const clean = {
    org_id:              orgId,
    full_name:           sanitizeText(lead.full_name, 120) || 'Unknown',
    email:               sanitizeText(lead.email, 200) || '',
    phone:               sanitizeText(lead.phone, 40) || null,
    instagram:           sanitizeText(lead.instagram, 80) || null,
    service:             sanitizeText(lead.service, 100) || null,
    coach_pref:          sanitizeText(lead.coach_pref, 100) || null,
    age:                 lead.age != null ? sanitizeNumber(lead.age, 10, 100) : null,
    occupation:          sanitizeText(lead.occupation, 200) || null,
    height:              sanitizeText(lead.height, 40) || null,
    bodyweight:          sanitizeText(lead.bodyweight, 40) || null,
    weight_class:        sanitizeText(lead.weight_class, 40) || null,
    obligations:         sanitizeText(lead.obligations, 500) || null,
    days_per_week:       lead.days_per_week != null ? sanitizeNumber(lead.days_per_week, 1, 7) : null,
    training_days:       sanitizeText(lead.training_days, 200) || null,
    training_time:       sanitizeText(lead.training_time, 80) || null,
    sleep_schedule:      sanitizeText(lead.sleep_schedule, 80) || null,
    sleep_hours:         lead.sleep_hours != null ? sanitizeNumber(lead.sleep_hours, 0, 24) : null,
    squat_max:           sanitizeText(lead.squat_max, 40) || null,
    bench_max:           sanitizeText(lead.bench_max, 40) || null,
    deadlift_max:        sanitizeText(lead.deadlift_max, 40) || null,
    squat_freq:          lead.squat_freq != null ? sanitizeNumber(lead.squat_freq, 0, 14) : null,
    bench_freq:          lead.bench_freq != null ? sanitizeNumber(lead.bench_freq, 0, 14) : null,
    deadlift_freq:       lead.deadlift_freq != null ? sanitizeNumber(lead.deadlift_freq, 0, 14) : null,
    squat_style:         sanitizeText(lead.squat_style, 100) || null,
    bench_style:         sanitizeText(lead.bench_style, 100) || null,
    deadlift_style:      sanitizeText(lead.deadlift_style, 100) || null,
    current_program:     sanitizeText(lead.current_program, 200) || null,
    weakpoints:          sanitizeText(lead.weakpoints, 500) || null,
    experience:          sanitizeText(lead.experience, 100) || null,
    federation:          sanitizeText(lead.federation, 80) || null,
    membership_num:      sanitizeText(lead.membership_num, 80) || null,
    injuries:            sanitizeText(lead.injuries, 500) || null,
    nutrition_score:     lead.nutrition_score != null ? sanitizeNumber(lead.nutrition_score, 1, 10) : null,
    hydration_score:     lead.hydration_score != null ? sanitizeNumber(lead.hydration_score, 1, 10) : null,
    stress_score:        lead.stress_score != null ? sanitizeNumber(lead.stress_score, 1, 10) : null,
    recovery_score:      lead.recovery_score != null ? sanitizeNumber(lead.recovery_score, 1, 10) : null,
    external_stressors:  sanitizeText(lead.external_stressors, 500) || null,
    learner_type:        sanitizeText(lead.learner_type, 100) || null,
    expectations:        sanitizeText(lead.expectations, 1000) || null,
    concerns:            sanitizeText(lead.concerns, 1000) || null,
    goals:               sanitizeText(lead.goals, 1000) || null,
    source:              sanitizeText(lead.source, 100) || 'Public page',
    extra_answers:       (lead.extra_answers && typeof lead.extra_answers === 'object') ? lead.extra_answers : {},
    status:              'new',
  }

  return sbInsertLead(orgId, clean)
}

/**
 * Sanitize + update a lead's CRM fields.
 */
export async function saveLead(leadId, updates) {
  if (!isSupabaseConfigured() || !leadId) return null
  const clean = {}
  if (updates.status !== undefined && VALID_LEAD_STATUSES.includes(updates.status)) clean.status = updates.status
  if (updates.notes !== undefined) clean.notes = sanitizeText(updates.notes, 5000) ?? ''
  if (updates.assigned_to !== undefined) clean.assigned_to = updates.assigned_to || null
  if (!Object.keys(clean).length) return null
  return sbUpdateLeadRecord(leadId, clean)
}

/**
 * Delete a lead.
 */
export async function removeLead(leadId) {
  if (!isSupabaseConfigured() || !leadId) return false
  return sbDeleteLeadRecord(leadId)
}

// ─── Resources ────────────────────────────────────────────────────────────────

const VALID_RESOURCE_CATEGORIES = ['technique', 'meet_day', 'recovery', 'nutrition', 'rules', 'general']

/**
 * Fetch all resources for an org.
 */
export async function loadOrgResources(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  return sbFetchOrgResources(orgId)
}

/**
 * Sanitize + insert a new resource.
 */
export async function saveNewResource(orgId, createdBy, resource) {
  if (!isSupabaseConfigured() || !orgId) return null
  const category = VALID_RESOURCE_CATEGORIES.includes(resource.category) ? resource.category : 'general'
  const tags = Array.isArray(resource.tags)
    ? resource.tags.map((t) => sanitizeText(t, 50)).filter(Boolean).slice(0, 10)
    : []
  const clean = {
    created_by:   createdBy || null,
    title:        sanitizeText(resource.title, 200) || 'Untitled',
    content:      sanitizeText(resource.content, 50000) || '',
    category,
    file_url:     sanitizeText(resource.file_url, 500) || null,
    video_url:    sanitizeText(resource.video_url, 500) || null,
    is_published: resource.is_published !== false,
    tags,
  }
  return sbInsertResource(orgId, clean)
}

/**
 * Sanitize + update an existing resource.
 */
export async function updateResource(resourceId, updates) {
  if (!isSupabaseConfigured() || !resourceId) return null
  const clean = {}
  if (updates.title !== undefined)        clean.title        = sanitizeText(updates.title, 200) || 'Untitled'
  if (updates.content !== undefined)      clean.content      = sanitizeText(updates.content, 50000) ?? ''
  if (updates.category !== undefined && VALID_RESOURCE_CATEGORIES.includes(updates.category)) {
    clean.category = updates.category
  }
  if (updates.file_url !== undefined)     clean.file_url     = sanitizeText(updates.file_url, 500) || null
  if (updates.video_url !== undefined)    clean.video_url    = sanitizeText(updates.video_url, 500) || null
  if (updates.is_published !== undefined) clean.is_published = Boolean(updates.is_published)
  if (updates.tags !== undefined && Array.isArray(updates.tags)) {
    clean.tags = updates.tags.map((t) => sanitizeText(t, 50)).filter(Boolean).slice(0, 10)
  }
  if (!Object.keys(clean).length) return null
  return sbUpdateResourceRecord(resourceId, clean)
}

/**
 * Delete a resource.
 */
export async function removeResource(resourceId) {
  if (!isSupabaseConfigured() || !resourceId) return false
  return sbDeleteResourceRecord(resourceId)
}