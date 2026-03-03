import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Returns true if Supabase is configured with real credentials.
// When false, all db helpers silently no-op and return null.
export const isSupabaseConfigured = () =>
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder-key'

// ── Profile helpers ──────────────────────────────────────────────────────────

/**
 * Upsert a mock profile row into the `profiles` table.
 * Used by loginAsDemo() so mock users are persisted in Supabase.
 * The profiles.id FK to auth.users must be dropped first (see supabase/mock_seed.sql).
 */
export async function upsertProfile(profile) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id:            profile.id,
        email:         profile.email,
        full_name:     profile.full_name,
        display_name:  profile.display_name,
        platform_role: profile.platform_role || 'user',
        self_coach:    profile.self_coach || false,
        weight_class:  profile.weight_class || null,
        federation:    profile.federation || null,
        equipment_type: profile.equipment_type || null,
        bio:           profile.bio || null,
      },
      { onConflict: 'id' }
    )
    .select()
    .single()
  if (error) console.error('[supabase] upsertProfile:', error.message)
  return data
}

// ── Meal Prep helpers ────────────────────────────────────────────────────────

/**
 * Fetch all meal prep sessions (+ their items) for a given athlete.
 * Returns data in the same shape as MOCK_ATHLETE_PREP_LOG[athleteId].
 */
export async function fetchPrepLog(athleteId) {
  if (!isSupabaseConfigured()) return null
  const { data: sessions, error } = await supabase
    .from('meal_prep_sessions')
    .select(`
      id, label, prep_date, cadence, period_start, period_end,
      total_calories_prepped, total_protein_prepped, notes,
      meal_prep_session_items (
        id, recipe_id, recipe_name, servings_made, servings_consumed, storage, macros_per_serving, notes
      )
    `)
    .eq('athlete_id', athleteId)
    .order('prep_date', { ascending: false })
  if (error) { console.error('[supabase] fetchPrepLog:', error.message); return null }
  return sessions
}

/**
 * Save a new meal prep session + items for an athlete.
 * @param {string} athleteId
 * @param {object} session  — { label, prep_date, notes, ... }
 * @param {Array}  items    — [{ recipe_id, recipe_name, servings_made, servings_consumed, storage, macros_per_serving }]
 */
export async function savePrepSession(athleteId, session, items = []) {
  if (!isSupabaseConfigured()) return null
  const { data: newSession, error: sErr } = await supabase
    .from('meal_prep_sessions')
    .insert({ ...session, athlete_id: athleteId, created_by: athleteId })
    .select()
    .single()
  if (sErr) { console.error('[supabase] savePrepSession:', sErr.message); return null }

  if (items.length > 0) {
    const rows = items.map((item) => ({ ...item, session_id: newSession.id }))
    const { error: iErr } = await supabase.from('meal_prep_session_items').insert(rows)
    if (iErr) console.error('[supabase] savePrepSession items:', iErr.message)
  }
  return newSession
}

/**
 * Update servings_consumed on a single prep session item.
 */
export async function updateServingsConsumed(itemId, servingsConsumed) {
  if (!isSupabaseConfigured()) return null
  const { error } = await supabase
    .from('meal_prep_session_items')
    .update({ servings_consumed: servingsConsumed })
    .eq('id', itemId)
  if (error) console.error('[supabase] updateServingsConsumed:', error.message)
  return !error
}

// ── Shopping List helpers ────────────────────────────────────────────────────

/**
 * Fetch all shopping lists (+ categories + items) for an athlete.
 */
export async function fetchShoppingLists(athleteId) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('shopping_lists')
    .select(`
      id, label, cadence, week_start, week_end, budget, status, notes,
      shopping_list_categories (
        id, name, icon, order_index,
        shopping_list_items (
          id, name, amount, price, checked, notes, recipe_ids, category_id
        )
      )
    `)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchShoppingLists:', error.message); return null }
  return data
}

/**
 * Create a new shopping list for an athlete.
 */
export async function createShoppingList(athleteId, listData) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({ ...listData, athlete_id: athleteId, created_by: athleteId })
    .select()
    .single()
  if (error) { console.error('[supabase] createShoppingList:', error.message); return null }
  return data
}

/**
 * Upsert a shopping list category.
 */
export async function upsertShoppingCategory(listId, category) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('shopping_list_categories')
    .upsert({ ...category, list_id: listId }, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('[supabase] upsertShoppingCategory:', error.message); return null }
  return data
}

/**
 * Upsert a single shopping list item.
 */
export async function upsertShoppingItem(item) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('shopping_list_items')
    .upsert(item, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('[supabase] upsertShoppingItem:', error.message); return null }
  return data
}

/**
 * Toggle the checked state of a shopping list item.
 */
export async function toggleShoppingItem(itemId, checked) {
  if (!isSupabaseConfigured()) return null
  const { error } = await supabase
    .from('shopping_list_items')
    .update({ checked })
    .eq('id', itemId)
  if (error) console.error('[supabase] toggleShoppingItem:', error.message)
  return !error
}

/**
 * Delete a shopping list (cascades to categories + items via DB).
 */
export async function deleteShoppingList(listId) {
  if (!isSupabaseConfigured()) return null
  const { error } = await supabase.from('shopping_lists').delete().eq('id', listId)
  if (error) console.error('[supabase] deleteShoppingList:', error.message)
  return !error
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Sign up a new user with email + password.
 * Sends a confirmation email with a redirect link back to /auth/callback.
 */
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, display_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) console.error('[supabase] signUp:', error.message)
  return { data, error }
}

/**
 * Sign in with email + password.
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) console.error('[supabase] signIn:', error.message)
  return { data, error }
}

/**
 * Sign the current user out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) console.error('[supabase] signOut:', error.message)
  return !error
}

/**
 * Get the current session (if any).
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) console.error('[supabase] getSession:', error.message)
  return session
}

/**
 * Subscribe to auth state changes.
 * Returns the Supabase subscription object — call .unsubscribe() to clean up.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
  return data.subscription
}

/**
 * Fetch a profile row by auth user ID.
 */
export async function fetchProfile(userId) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') console.error('[supabase] fetchProfile:', error.message)
  return data ?? null
}

/**
 * Fetch org memberships for a user (joins the org name).
 */
export async function fetchOrgMemberships(userId) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('org_members')
    .select('*, orgs(id, name, slug, logo_url)')
    .eq('user_id', userId)
  if (error) { console.error('[supabase] fetchOrgMemberships:', error.message); return [] }
  return data ?? []
}

/**
 * Creates a new organization and adds the caller as owner in one transaction.
 * Wraps the `create_org_with_owner` Postgres function defined in schema.sql.
 * Returns the new org_id (uuid) on success, or null on error.
 */
export async function createOrgWithOwner({ userId, name, slug, federation, timezone, weightUnit }) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase.rpc('create_org_with_owner', {
    p_user_id:    userId,
    p_name:       name,
    p_slug:       slug,
    p_federation: federation || null,
    p_timezone:   timezone   || 'UTC',
    p_weight_unit: weightUnit || 'kg',
  })
  if (error) { console.error('[supabase] createOrgWithOwner:', error.message); return null }
  return data // the new org uuid
}

/**
 * Marks a profile's onboarding as complete.
 */
export async function markOnboardingComplete(userId) {
  if (!isSupabaseConfigured()) return
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_complete: true })
    .eq('id', userId)
  if (error) console.error('[supabase] markOnboardingComplete:', error.message)
}
