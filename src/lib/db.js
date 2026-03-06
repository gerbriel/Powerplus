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

import { supabase, isSupabaseConfigured } from './supabase'

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

  const row = {
    created_by:            createdBy,
    org_id:                orgId ?? null,
    name:                  sanitizeText(meet.name, 200),
    federation:            validFeds.includes(meet.federation) ? meet.federation : 'Other',
    location:              sanitizeText(meet.location, 200),
    meet_date:             sanitizeDate(meet.meet_date),
    registration_deadline: sanitizeDate(meet.registration_deadline),
    status:                validStatuses.includes(meet.status) ? meet.status : 'upcoming',
    website_url:           sanitizeText(meet.website_url, 500),
    notes:                 sanitizeText(meet.notes, 1000),
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

  const validPhases = ['accumulation','intensification','peak','deload','transition']
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

// ─── Calendar events ──────────────────────────────────────────────────────────

/**
 * Save a calendar event.
 */
export async function saveEvent(createdBy, orgId, event) {
  if (!isSupabaseConfigured() || !createdBy) return null

  const validTypes = ['session','meeting','meet','deadline','other']
  const row = {
    created_by:       createdBy,
    org_id:           orgId ?? null,
    title:            sanitizeText(event.title, 200),
    description:      sanitizeText(event.description, 1000),
    event_type:       validTypes.includes(event.event_type) ? event.event_type : 'other',
    start_time:       event.start_time ? new Date(event.start_time).toISOString() : null,
    end_time:         event.end_time   ? new Date(event.end_time).toISOString()   : null,
    location:         sanitizeText(event.location, 300),
    meeting_url:      sanitizeText(event.meeting_url, 500),
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
