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

/**
 * Delete a single shopping list item by id.
 */
export async function deleteShoppingItem(itemId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('shopping_list_items').delete().eq('id', itemId)
  if (error) console.error('[supabase] deleteShoppingItem:', error.message)
  return !error
}

// ── Meal Prep Recipes ────────────────────────────────────────────────────────

/**
 * Fetch all meal prep recipes visible to an org (org templates + personal recipes).
 * Returns data shaped for use in RecipesTab.
 */
export async function fetchOrgRecipes(orgId, userId) {
  if (!isSupabaseConfigured()) return []
  let q = supabase
    .from('meal_prep_recipes')
    .select('id, created_by, org_id, is_org_template, name, meal_type, prep_time, cook_time, servings, macros_per_serving, ingredients, instructions, tags, created_at')
    .order('created_at', { ascending: false })
  if (orgId && userId) {
    q = q.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
  } else if (orgId) {
    q = q.eq('org_id', orgId)
  } else if (userId) {
    q = q.eq('created_by', userId)
  }
  const { data, error } = await q
  if (error) { console.error('[supabase] fetchOrgRecipes:', error.message); return [] }
  return data ?? []
}

/**
 * Delete a meal prep recipe by id.
 */
export async function deleteRecipe(recipeId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('meal_prep_recipes').delete().eq('id', recipeId)
  if (error) console.error('[supabase] deleteRecipe:', error.message)
  return !error
}

// ── Nutrition logs ────────────────────────────────────────────────────────────

/**
 * Fetch recent nutrition logs for an athlete (last N days).
 * Returns logs ordered newest-first.
 */
export async function fetchNutritionLogs(athleteId, days = 30) {
  if (!isSupabaseConfigured() || !athleteId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id, log_date, meal_type, meal_name, calories_actual, protein_actual, carbs_actual, fat_actual, compliance_score, energy_level, hunger_level, notes')
    .eq('athlete_id', athleteId)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: false })
  if (error) { console.error('[supabase] fetchNutritionLogs:', error.message); return [] }
  return data ?? []
}

// ── Calendar events ───────────────────────────────────────────────────────────

/**
 * Fetch all events for an org visible to the current user.
 */
export async function fetchOrgEvents(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase
    .from('events')
    .select('id, org_id, created_by, title, description, event_type, start_time, end_time, location, meeting_url, attendee_ids, created_at')
    .eq('org_id', orgId)
    .order('start_time', { ascending: true })
  if (error) { console.error('[supabase] fetchOrgEvents:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch all events created by a user (personal + org events they own).
 * De-duplication against org events is handled in the store.
 */
export async function fetchUserEvents(userId) {
  if (!isSupabaseConfigured() || !userId) return []
  const { data, error } = await supabase
    .from('events')
    .select('id, org_id, created_by, title, description, event_type, start_time, end_time, location, meeting_url, attendee_ids, created_at')
    .eq('created_by', userId)
    .order('start_time', { ascending: true })
  if (error) { console.error('[supabase] fetchUserEvents:', error.message); return [] }
  return data ?? []
}

/**
 * Update an event by id (used for drag-and-drop date changes, edits).
 */
export async function updateEventById(id, fields) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase
    .from('events')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[supabase] updateEventById:', error.message); return null }
  return data
}

/**
 * Delete an event by id.
 */
export async function deleteEvent(id) {
  if (!isSupabaseConfigured() || !id) return false
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) console.error('[supabase] deleteEvent:', error.message)
  return !error
}

/**
 * Subscribe to live INSERT / UPDATE / DELETE on the events table for an org.
 * callbacks: { onInsert, onUpdate, onDelete }
 * Returns an unsubscribe function.
 */
export function subscribeToOrgEvents(orgId, { onInsert, onUpdate, onDelete } = {}) {
  if (!isSupabaseConfigured() || !orgId) return () => {}
  const sub = supabase
    .channel(`events:${orgId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'events',
      filter: `org_id=eq.${orgId}`,
    }, (payload) => onInsert?.(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'events',
      filter: `org_id=eq.${orgId}`,
    }, (payload) => onUpdate?.(payload.new))
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'events',
      filter: `org_id=eq.${orgId}`,
    }, (payload) => onDelete?.(payload.old))
    .subscribe()
  return () => supabase.removeChannel(sub)
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
      emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`,
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
    .select('*, organizations(id, name, slug, logo_url)')
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
 * Marks a profile's onboarding as complete, and optionally sets the role.
 * role: 'athlete' | 'head_coach' | 'coach' | 'nutritionist'
 */
export async function markOnboardingComplete(userId, role) {
  if (!isSupabaseConfigured()) return
  const update = { onboarding_complete: true }
  if (role) update.role = role
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', userId)
  if (error) console.error('[supabase] markOnboardingComplete:', error.message)
}

/**
 * Search organizations by name or slug substring.
 * Returns [{ id, name, slug, logo_url, federation, member_count }]
 */
export async function searchOrgs(query, limit = 10) {
  if (!isSupabaseConfigured()) return []
  if (!query || query.trim().length < 2) return []
  const { data, error } = await supabase.rpc('search_orgs', {
    p_query: query.trim(),
    p_limit: limit,
  })
  if (error) { console.error('[supabase] searchOrgs:', error.message); return [] }
  return data ?? []
}

/**
 * Submit a join request to an org.
 * requestedRole: 'athlete' | 'coach' | 'nutritionist' | 'head_coach'
 * Returns { data, error }
 */
export async function createJoinRequest({ userId, orgId, requestedRole, message }) {
  if (!isSupabaseConfigured()) return { data: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase
    .from('org_join_requests')
    .insert({
      user_id: userId,
      org_id: orgId,
      requested_role: requestedRole,
      message: message || null,
    })
    .select()
    .single()
  if (error) console.error('[supabase] createJoinRequest:', error.message)
  return { data, error }
}

/**
 * Fetch all join requests submitted by a user.
 * Includes org name for display.
 */
export async function fetchMyJoinRequests(userId) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('org_join_requests')
    .select('*, organizations(id, name, slug, logo_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchMyJoinRequests:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch pending join requests for an org (for staff review).
 * Includes requester profile info.
 */
export async function fetchOrgJoinRequests(orgId) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('org_join_requests')
    .select('*, profiles(id, full_name, email, avatar_url, role)')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) { console.error('[supabase] fetchOrgJoinRequests:', error.message); return [] }
  return data ?? []
}

/**
 * Approve a join request (calls the approve_join_request DB function).
 */
export async function approveJoinRequest(requestId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.rpc('approve_join_request', { p_request_id: requestId })
  if (error) { console.error('[supabase] approveJoinRequest:', error.message); return false }
  return true
}

/**
 * Deny a join request.
 */
export async function denyJoinRequest(requestId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.rpc('deny_join_request', { p_request_id: requestId })
  if (error) { console.error('[supabase] denyJoinRequest:', error.message); return false }
  return true
}

// ── Messaging helpers ────────────────────────────────────────────────────────

/**
 * Fetch all channels for an org that the current user is a member of.
 * Returns channels with their member list.
 */
export async function fetchChannels(orgId) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('channels')
    .select(`
      id, name, description, channel_type, created_by, created_at, org_id, is_archived,
      channel_members ( user_id, role, last_read_at )
    `)
    .eq('org_id', orgId)
    .eq('is_archived', false)
    .order('created_at', { ascending: true })
  if (error) { console.error('[supabase] fetchChannels:', error.message); return [] }
  return data ?? []
}

/**
 * Create a new channel and add the creator (and optionally other members) to channel_members.
 * For public channels, also bulk-inserts all org members.
 */
export async function createChannel({ orgId, name, description, channelType, createdBy, memberIds = [] }) {
  if (!isSupabaseConfigured()) return null
  const { data: channel, error } = await supabase
    .from('channels')
    .insert({ org_id: orgId, name, description, channel_type: channelType, created_by: createdBy })
    .select()
    .single()
  if (error) { console.error('[supabase] createChannel:', error.message); return null }

  // Add members — always include creator; for public channels add all provided org member IDs
  const allMemberIds = [...new Set([createdBy, ...memberIds])]
  const memberRows = allMemberIds.map(uid => ({ channel_id: channel.id, user_id: uid, role: uid === createdBy ? 'admin' : 'member' }))
  const { error: mErr } = await supabase.from('channel_members').insert(memberRows)
  if (mErr) console.error('[supabase] createChannel members:', mErr.message)

  return channel
}

/**
 * Update a channel's name/description.
 */
export async function updateChannel(channelId, updates) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('channels').update(updates).eq('id', channelId)
  if (error) { console.error('[supabase] updateChannel:', error.message); return false }
  return true
}

/**
 * Soft-delete (archive) a channel.
 */
export async function archiveChannel(channelId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('channels').update({ is_archived: true }).eq('id', channelId)
  if (error) { console.error('[supabase] archiveChannel:', error.message); return false }
  return true
}

/**
 * Fetch messages for a channel, ordered oldest-first.
 * Joins sender profile for display name + role.
 */
export async function fetchMessages(channelId, limit = 100) {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, channel_id, content, message_type, file_url, media_url, gif_url, formatting,
      is_pinned, edited_at, created_at,
      sender:profiles!sender_id ( id, full_name, display_name, role, avatar_url ),
      reactions:message_reactions ( id, emoji, user_id )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) { console.error('[supabase] fetchMessages:', error.message); return [] }
  return data ?? []
}

/**
 * Insert a new message into a channel.
 */
export async function sendMessage({ channelId, senderId, content, messageType = 'text', mediaUrl = null, gifUrl = null, formatting = null }) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id:   channelId,
      sender_id:    senderId,
      content,
      message_type: messageType,
      media_url:    mediaUrl,
      gif_url:      gifUrl,
      formatting,
    })
    .select(`
      id, channel_id, content, message_type, file_url, media_url, gif_url, formatting,
      is_pinned, edited_at, created_at,
      sender:profiles!sender_id ( id, full_name, display_name, role, avatar_url )
    `)
    .single()
  if (error) { console.error('[supabase] sendMessage:', error.message); return null }
  return data
}

/**
 * Edit a message's content.
 */
export async function editMessage(messageId, content) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId)
  if (error) { console.error('[supabase] editMessage:', error.message); return false }
  return true
}

/**
 * Delete a message.
 */
export async function deleteMessage(messageId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  if (error) { console.error('[supabase] deleteMessage:', error.message); return false }
  return true
}

/**
 * Toggle a reaction on a message (upsert/delete from message_reactions).
 */
export async function toggleReaction(messageId, userId, emoji) {
  if (!isSupabaseConfigured()) return false
  // Try to delete first; if nothing deleted, insert
  const { data: deleted } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .select()
  if (deleted?.length > 0) return true // removed
  const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: userId, emoji })
  if (error) console.error('[supabase] toggleReaction:', error.message)
  return !error
}

/**
 * Find or create a DM channel between two users in an org.
 * Returns the channel row.
 */
export async function findOrCreateDM(orgId, userIdA, userIdB) {
  if (!isSupabaseConfigured()) return null
  // Look for an existing DM channel where both users are members
  const { data: existing } = await supabase
    .rpc('find_dm_channel', { p_org_id: orgId, p_user_a: userIdA, p_user_b: userIdB })
  if (existing) return existing

  // Create a new DM channel
  return createChannel({
    orgId,
    name:        `dm-${userIdA}-${userIdB}`,
    description: '',
    channelType: 'dm',
    createdBy:   userIdA,
    memberIds:   [userIdB],
  })
}

/**
 * Find or create a group channel for a set of participants.
 * groupName is the display name for the group.
 */
export async function findOrCreateGroup(orgId, createdBy, participantIds, groupName) {
  if (!isSupabaseConfigured()) return null
  return createChannel({
    orgId,
    name:        groupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40),
    description: groupName,
    channelType: 'group',
    createdBy,
    memberIds:   participantIds,
  })
}

/**
 * Update the last_read_at timestamp for a user in a channel.
 */
export async function markChannelRead(channelId, userId) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('channel_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', userId)
  if (error) console.error('[supabase] markChannelRead:', error.message)
  return !error
}

/**
 * Toggle the is_pinned flag on a message.
 */
export async function togglePinMessage(messageId, currentlyPinned) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase
    .from('messages')
    .update({ is_pinned: !currentlyPinned })
    .eq('id', messageId)
  if (error) { console.error('[supabase] togglePinMessage:', error.message); return false }
  return !currentlyPinned
}

/**
 * Upload a file to Supabase Storage (message-attachments bucket).
 * Returns the public URL or null on failure.
 */
export async function uploadMessageFile(file, orgId, userId) {
  if (!isSupabaseConfigured()) return null
  const ext  = file.name.split('.').pop().toLowerCase()
  const path = `${orgId}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('message-attachments').upload(path, file, { upsert: false })
  if (error) { console.error('[supabase] uploadMessageFile:', error.message); return null }
  const { data } = supabase.storage.from('message-attachments').getPublicUrl(path)
  return data?.publicUrl ?? null
}

/**
 * Subscribe to new, updated, and deleted messages on a channel via Supabase Realtime.
 * callbacks: { onInsert, onUpdate, onDelete }
 * Returns an unsubscribe function.
 */
export function subscribeToChannel(channelId, { onInsert, onUpdate, onDelete } = {}) {
  if (!isSupabaseConfigured()) return () => {}
  const sub = supabase
    .channel(`messages:${channelId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => onInsert?.(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => onUpdate?.(payload.new))
    .on('postgres_changes', {
      event: 'DELETE',
      schema: 'public',
      table: 'messages',
      filter: `channel_id=eq.${channelId}`,
    }, (payload) => onDelete?.(payload.old))
    .subscribe()
  return () => supabase.removeChannel(sub)
}

// ── Roster helpers ────────────────────────────────────────────────────────────

/**
 * Fetch the full athlete roster for an org via the get_org_athlete_roster
 * Postgres function. Returns an array of athlete objects shaped to match
 * MOCK_ATHLETES so the UI needs zero conditional branching.
 */
export async function fetchOrgAthletes(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase.rpc('get_org_athlete_roster', { p_org_id: orgId })
  if (error) { console.error('[supabase] fetchOrgAthletes:', error.message); return [] }
  // Normalize nulls to sensible defaults so the UI never crashes on missing data
  return (data ?? []).map(row => ({
    id:                        row.id,
    full_name:                 row.full_name ?? '',
    display_name:              row.display_name ?? row.full_name ?? '',
    avatar_url:                row.avatar_url ?? null,
    weight_class:              row.weight_class ?? '—',
    federation:                row.federation ?? '—',
    member_id:                 row.member_id ?? '',
    equipment_type:            row.equipment_type ?? 'raw',
    bio:                       row.bio ?? '',
    bodyweight_kg:             row.bodyweight_kg ?? 0,
    sleep_avg:                 row.sleep_avg ?? 0,
    soreness_avg:              row.soreness_avg ?? 0,
    stress_avg:                row.stress_avg ?? 0,
    energy_avg:                row.energy_avg ?? 0,
    sessions_this_week:        row.sessions_this_week ?? 0,
    sessions_planned_this_week: row.sessions_planned_this_week ?? 0,
    rpe_avg_this_week:         row.rpe_avg_this_week ?? 0,
    last_session:              row.last_session_date ?? null,
    adherence:                 row.adherence ?? 0,
    nutrition_compliance:      row.nutrition_compliance ?? 0,
    e1rm_squat:                row.e1rm_squat ?? 0,
    e1rm_bench:                row.e1rm_bench ?? 0,
    e1rm_deadlift:             row.e1rm_deadlift ?? 0,
    injury_notes:              row.injury_notes ?? '',
    injury_log_id:             row.injury_log_id ?? null,
    current_block_id:          row.current_block_id ?? null,
    next_meet_id:              row.next_meet_id ?? null,
    goal_ids:                  row.goal_ids ?? [],
    flags:                     row.flags ?? [],
    check_in_trend:            row.check_in_trend ?? [],
    recent_sessions:           row.recent_sessions ?? [],
    nutrition_macros:          row.nutrition_macros ?? { plan: {}, actual: {} },
    coach_notes:               row.coach_notes ?? '',
    // Fields present in MOCK_ATHLETES that come from nutrition store in the UI
    dietary_profile:           { restrictions: [], allergens: [], intolerances: [], preferences: [], weekly_food_budget: 0, notes: '' },
    nutrition_targets:         {
      calories: row.nutrition_macros?.plan?.calories ?? 0,
      protein:  row.nutrition_macros?.plan?.protein ?? 0,
    },
  }))
}

/**
 * Fetch today's review queue for an org via the get_org_review_queue
 * Postgres function. Returns an array of review-queue items.
 */
export async function fetchOrgReviewQueue(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase.rpc('get_org_review_queue', { p_org_id: orgId })
  if (error) { console.error('[supabase] fetchOrgReviewQueue:', error.message); return [] }
  return (data ?? []).map(row => ({
    athlete_id:   row.athlete_id,
    athlete:      row.athlete_name ?? '',
    session:      row.session_name ?? '',
    session_date: row.session_date ?? null,
    status:       row.status ?? 'planned',
    overall_rpe:  row.overall_rpe ?? null,
    has_video:    row.has_video ?? false,
    flag:         (row.flags ?? [])[0] ?? null,
    flags:        row.flags ?? [],
  }))
}

// ── Training Blocks (org-scoped, staff view) ──────────────────────────────────

/**
 * Fetch all training blocks for an org. Returns blocks ordered by start_date desc.
 * Used by StaffTrainingPage (Training Management).
 */
export async function fetchOrgTrainingBlocks(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase
    .from('training_blocks')
    .select(`
      id, org_id, athlete_id, created_by, name, block_type,
      phase, weeks, status, focus, avg_rpe_target,
      sessions_planned, sessions_completed, color,
      start_date, end_date, notes, active, created_at
    `)
    .eq('org_id', orgId)
    .order('start_date', { ascending: false })
  if (error) { console.error('[supabase] fetchOrgTrainingBlocks:', error.message); return [] }
  return data ?? []
}

/** Insert an org-level training block. Returns created row or null. */
export async function createOrgTrainingBlock(fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('training_blocks')
    .insert(fields)
    .select()
    .single()
  if (error) { console.error('[supabase] createOrgTrainingBlock:', error.message); return null }
  return data
}

/** Update a training block by id. Returns updated row or null. */
export async function updateOrgTrainingBlock(id, fields) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase
    .from('training_blocks')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[supabase] updateOrgTrainingBlock:', error.message); return null }
  return data
}

/** Delete a training block by id. Returns true on success. */
export async function deleteOrgTrainingBlock(id) {
  if (!isSupabaseConfigured() || !id) return false
  const { error } = await supabase.from('training_blocks').delete().eq('id', id)
  if (error) { console.error('[supabase] deleteOrgTrainingBlock:', error.message); return false }
  return true
}

// ── Programming: exercises ────────────────────────────────────────────────────

/** Fetch all exercises visible to this user (global + org-private). */
export async function fetchExercises(orgId) {
  if (!isSupabaseConfigured()) return []
  let q = supabase
    .from('exercises')
    .select('id, name, category, muscle_groups, equipment, description, video_url, technique_tags, is_competition_lift, created_by, org_id, is_global')
    .order('name', { ascending: true })

  // Include global exercises OR exercises belonging to this org
  if (orgId) {
    q = q.or(`is_global.eq.true,org_id.eq.${orgId},org_id.is.null`)
  } else {
    q = q.or('is_global.eq.true,org_id.is.null')
  }

  const { data, error } = await q
  if (error) { console.error('[supabase] fetchExercises:', error.message); return [] }
  return data ?? []
}

/** Insert a new exercise. Returns the created row or null. */
export async function createExercise(fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('exercises')
    .insert(fields)
    .select()
    .single()
  if (error) { console.error('[supabase] createExercise:', error.message); return null }
  return data
}

/** Update an exercise by id. Returns the updated row or null. */
export async function updateExercise(id, fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('exercises')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[supabase] updateExercise:', error.message); return null }
  return data
}

/** Delete an exercise by id. */
export async function deleteExercise(id) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('exercises').delete().eq('id', id)
  if (error) { console.error('[supabase] deleteExercise:', error.message); return false }
  return true
}

// ── Programming: program_templates ───────────────────────────────────────────

/** Fetch all program templates for an org (with athlete assignment count). */
export async function fetchProgramTemplates(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase
    .from('program_templates')
    .select(`
      id, name, description, weeks, block_type, programming_style,
      created_by, org_id, is_public, tags, created_at, updated_at,
      program_instances(id)
    `)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchProgramTemplates:', error.message); return [] }
  return (data ?? []).map(t => ({
    ...t,
    athletes: t.program_instances?.length ?? 0,
    style: t.programming_style ?? 'hybrid',
    block_type: t.block_type ?? 'accumulation',
    program_instances: undefined,
  }))
}

/** Create a program template. Returns created row or null. */
export async function createProgramTemplate(fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('program_templates')
    .insert(fields)
    .select()
    .single()
  if (error) { console.error('[supabase] createProgramTemplate:', error.message); return null }
  return { ...data, athletes: 0, style: data.programming_style ?? 'hybrid' }
}

/** Update a program template. Returns updated row or null. */
export async function updateProgramTemplate(id, fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('program_templates')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[supabase] updateProgramTemplate:', error.message); return null }
  return data
}

/** Delete a program template (cascades to weeks, workout_templates, exercises). */
export async function deleteProgramTemplate(id) {
  if (!isSupabaseConfigured()) return false
  const { error } = await supabase.from('program_templates').delete().eq('id', id)
  if (error) { console.error('[supabase] deleteProgramTemplate:', error.message); return false }
  return true
}

// ── Programming: workout_templates ───────────────────────────────────────────

/**
 * Fetch a single workout template with all its exercises (joined to exercise name/category).
 * Used by the Workout Builder when editing an existing template.
 */
export async function fetchWorkoutTemplate(workoutTemplateId) {
  if (!isSupabaseConfigured() || !workoutTemplateId) return null
  const { data, error } = await supabase
    .from('workout_templates')
    .select(`
      id, template_id, week_id, day_of_week, name, notes, estimated_duration,
      workout_template_exercises (
        id, exercise_id, block_type, order_index, sets, reps,
        intensity_type, intensity_value, rest_seconds, tempo, coaching_cues, notes,
        exercises ( id, name, category, is_competition_lift )
      )
    `)
    .eq('id', workoutTemplateId)
    .single()
  if (error) { console.error('[supabase] fetchWorkoutTemplate:', error.message); return null }
  return data
}

/** Upsert a workout template row. Returns row or null. */
export async function upsertWorkoutTemplate(fields) {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await supabase
    .from('workout_templates')
    .upsert(fields, { onConflict: 'id' })
    .select()
    .single()
  if (error) { console.error('[supabase] upsertWorkoutTemplate:', error.message); return null }
  return data
}

/**
 * Save all exercises for a workout template.
 * Deletes existing rows then re-inserts the full ordered list.
 */
export async function saveWorkoutTemplateExercises(workoutTemplateId, exercises) {
  if (!isSupabaseConfigured() || !workoutTemplateId) return false
  // Delete existing
  const { error: delErr } = await supabase
    .from('workout_template_exercises')
    .delete()
    .eq('workout_template_id', workoutTemplateId)
  if (delErr) { console.error('[supabase] saveWorkoutTemplateExercises delete:', delErr.message); return false }

  if (!exercises.length) return true

  const rows = exercises.map((ex, i) => ({
    workout_template_id: workoutTemplateId,
    exercise_id:     ex.exercise_id,
    block_type:      ex.block_type,
    order_index:     ex.order_index ?? i,
    sets:            ex.sets,
    reps:            ex.reps,
    intensity_type:  ex.intensity_type ?? null,
    intensity_value: ex.intensity_value ?? null,
    rest_seconds:    ex.rest_seconds ?? null,
    tempo:           ex.tempo ?? null,
    coaching_cues:   ex.coaching_cues ?? null,
    notes:           ex.notes ?? null,
  }))

  const { error } = await supabase.from('workout_template_exercises').insert(rows)
  if (error) { console.error('[supabase] saveWorkoutTemplateExercises insert:', error.message); return false }
  return true
}

// ── Analytics helpers ─────────────────────────────────────────────────────────
// All analytics reads are aggregations over existing tables.
// No writes happen here — data is entered via TrainingPage/NutritionPage/CheckIn.

/**
 * Fetch workout sessions for a single athlete, newest-first.
 * Returns: [{ id, name, scheduled_date, status, overall_rpe, completed_at }]
 */
export async function fetchAthleteSessions(athleteId, days = 90) {
  if (!isSupabaseConfigured() || !athleteId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, name, scheduled_date, status, overall_rpe, completed_at, org_id')
    .eq('athlete_id', athleteId)
    .gte('scheduled_date', since.toISOString().slice(0, 10))
    .order('scheduled_date', { ascending: false })
  if (error) { console.error('[supabase] fetchAthleteSessions:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch workout sets with exercise info for e1RM + volume calculations.
 * Returns: [{ session_id, exercise_id, exercise_name, is_competition_lift,
 *             performed_reps, performed_weight, performed_rpe, is_pr, is_top_set,
 *             scheduled_date (from session join) }]
 */
export async function fetchAthleteWorkoutSets(athleteId, days = 180) {
  if (!isSupabaseConfigured() || !athleteId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('workout_sets')
    .select(`
      id, session_id, exercise_id, performed_reps, performed_weight,
      performed_rpe, is_pr, is_top_set, set_number,
      exercises ( id, name, category, is_competition_lift ),
      workout_sessions!inner ( athlete_id, scheduled_date, status )
    `)
    .eq('workout_sessions.athlete_id', athleteId)
    .eq('workout_sessions.status', 'completed')
    .gte('workout_sessions.scheduled_date', since.toISOString().slice(0, 10))
    .order('workout_sessions.scheduled_date', { ascending: false })
  if (error) { console.error('[supabase] fetchAthleteWorkoutSets:', error.message); return [] }
  return (data ?? []).map(row => ({
    id:                row.id,
    session_id:        row.session_id,
    exercise_id:       row.exercise_id,
    exercise_name:     row.exercises?.name ?? 'Unknown',
    is_competition_lift: row.exercises?.is_competition_lift ?? false,
    category:          row.exercises?.category ?? '',
    performed_reps:    row.performed_reps ?? 0,
    performed_weight:  row.performed_weight ?? 0,
    performed_rpe:     row.performed_rpe ?? null,
    is_pr:             row.is_pr ?? false,
    is_top_set:        row.is_top_set ?? false,
    scheduled_date:    row.workout_sessions?.scheduled_date ?? null,
  }))
}

/**
 * Fetch check-ins for a single athlete, newest-first.
 * Returns: [{ check_date, sleep_hours, sleep_quality, stress_level, soreness_level, motivation_level, bodyweight }]
 */
export async function fetchAthleteCheckIns(athleteId, days = 90) {
  if (!isSupabaseConfigured() || !athleteId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, check_date, sleep_hours, sleep_quality, stress_level, soreness_level, motivation_level, bodyweight, notes')
    .eq('athlete_id', athleteId)
    .gte('check_date', since.toISOString().slice(0, 10))
    .order('check_date', { ascending: false })
  if (error) { console.error('[supabase] fetchAthleteCheckIns:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch active and historical injuries for an athlete.
 * Returns: [{ id, body_part, severity, status, reported_at }]
 */
export async function fetchAthleteInjuries(athleteId) {
  if (!isSupabaseConfigured() || !athleteId) return []
  const { data, error } = await supabase
    .from('injuries')
    .select('id, body_part, severity, status, reported_at, notes')
    .eq('athlete_id', athleteId)
    .order('reported_at', { ascending: false })
  if (error) { console.error('[supabase] fetchAthleteInjuries:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch all workout sessions for an entire org in the last N days.
 * Used for team adherence + volume analytics.
 */
export async function fetchOrgWorkoutSessions(orgId, days = 90) {
  if (!isSupabaseConfigured() || !orgId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, athlete_id, name, scheduled_date, status, overall_rpe, completed_at')
    .eq('org_id', orgId)
    .gte('scheduled_date', since.toISOString().slice(0, 10))
    .order('scheduled_date', { ascending: false })
  if (error) { console.error('[supabase] fetchOrgWorkoutSessions:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch all workout sets for an entire org (for team volume trend).
 */
export async function fetchOrgWorkoutSets(orgId, days = 90) {
  if (!isSupabaseConfigured() || !orgId) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('workout_sets')
    .select(`
      id, session_id, performed_reps, performed_weight, is_pr,
      workout_sessions!inner ( athlete_id, org_id, scheduled_date, status )
    `)
    .eq('workout_sessions.org_id', orgId)
    .eq('workout_sessions.status', 'completed')
    .gte('workout_sessions.scheduled_date', since.toISOString().slice(0, 10))
  if (error) { console.error('[supabase] fetchOrgWorkoutSets:', error.message); return [] }
  return (data ?? []).map(row => ({
    id:               row.id,
    session_id:       row.session_id,
    athlete_id:       row.workout_sessions?.athlete_id ?? null,
    performed_reps:   row.performed_reps ?? 0,
    performed_weight: row.performed_weight ?? 0,
    is_pr:            row.is_pr ?? false,
    scheduled_date:   row.workout_sessions?.scheduled_date ?? null,
  }))
}

/**
 * Fetch all check-ins for an entire org.
 * Used for team health + sleep/stress/soreness averages.
 */
export async function fetchOrgCheckIns(orgId, days = 30) {
  if (!isSupabaseConfigured() || !orgId) return []
  // We join through org_members to scope by org
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data: members, error: mErr } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('org_role', 'athlete')
  if (mErr) { console.error('[supabase] fetchOrgCheckIns members:', mErr.message); return [] }
  const ids = (members ?? []).map(m => m.user_id)
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, athlete_id, check_date, sleep_hours, stress_level, soreness_level, motivation_level, bodyweight')
    .in('athlete_id', ids)
    .gte('check_date', since.toISOString().slice(0, 10))
    .order('check_date', { ascending: false })
  if (error) { console.error('[supabase] fetchOrgCheckIns:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch all active injuries for an org.
 */
export async function fetchOrgInjuries(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data: members, error: mErr } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
  if (mErr) { console.error('[supabase] fetchOrgInjuries members:', mErr.message); return [] }
  const ids = (members ?? []).map(m => m.user_id)
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('injuries')
    .select('id, athlete_id, body_part, severity, status, reported_at')
    .in('athlete_id', ids)
    .order('reported_at', { ascending: false })
  if (error) { console.error('[supabase] fetchOrgInjuries:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch staff members of an org (coaches + admins).
 * Returns: [{ user_id, org_role, joined_at, full_name, display_name, avatar_url }]
 */
export async function fetchOrgStaffMembers(orgId) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data, error } = await supabase
    .from('org_members')
    .select('user_id, org_role, joined_at, profiles ( full_name, display_name, avatar_url )')
    .eq('org_id', orgId)
    .in('org_role', ['owner', 'head_coach', 'coach', 'admin', 'nutritionist'])
  if (error) { console.error('[supabase] fetchOrgStaffMembers:', error.message); return [] }
  return (data ?? []).map(row => ({
    user_id:      row.user_id,
    org_role:     row.org_role,
    joined_at:    row.joined_at,
    full_name:    row.profiles?.full_name ?? '',
    display_name: row.profiles?.display_name ?? row.profiles?.full_name ?? '',
    avatar_url:   row.profiles?.avatar_url ?? null,
  }))
}

// ── Meets & Training Blocks (personal / athlete view) ────────────────────────

/**
 * Fetch all meets created by this athlete (or shared with their org).
 */
export async function fetchUserMeets(userId, orgId) {
  if (!isSupabaseConfigured() || !userId) return []
  let q = supabase
    .from('meets')
    .select(`
      id, org_id, created_by, name, federation, location,
      meet_date, registration_deadline, weigh_in_date, status,
      website_url, notes, equipment, athletes_registered, athletes_confirmed,
      attempts, linked_goal_ids, linked_block_ids, created_at
    `)
    .order('meet_date', { ascending: true })

  if (orgId) {
    q = q.or(`created_by.eq.${userId},org_id.eq.${orgId}`)
  } else {
    q = q.eq('created_by', userId)
  }
  const { data, error } = await q
  if (error) { console.error('[supabase] fetchUserMeets:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch all training blocks for an athlete (personal + org-shared).
 */
export async function fetchUserTrainingBlocks(userId, orgId) {
  if (!isSupabaseConfigured() || !userId) return []
  let q = supabase
    .from('training_blocks')
    .select(`
      id, org_id, athlete_id, created_by, name, block_type,
      phase, weeks, status, focus, avg_rpe_target, color,
      sessions_planned, sessions_completed,
      start_date, end_date, notes, active,
      linked_meet_id, linked_goal_ids, created_at
    `)
    .order('start_date', { ascending: false })

  if (orgId) {
    q = q.or(`athlete_id.eq.${userId},org_id.eq.${orgId}`)
  } else {
    q = q.eq('athlete_id', userId)
  }
  const { data, error } = await q
  if (error) { console.error('[supabase] fetchUserTrainingBlocks:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch goals for an athlete.
 */
export async function fetchUserGoals(userId) {
  if (!isSupabaseConfigured() || !userId) return []
  const { data, error } = await supabase
    .from('goals')
    .select('id, athlete_id, title, goal_type, target_value, current_value, target_unit, target_date, completed, notes, linked_meet_id, progress_history, created_at')
    .eq('athlete_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[supabase] fetchUserGoals:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch completed meet entries (results) for an athlete — meet history tab.
 */
export async function fetchAthleteMeetHistory(userId) {
  if (!isSupabaseConfigured() || !userId) return []
  const { data, error } = await supabase
    .from('athlete_meet_entries')
    .select(`
      id, athlete_id, weight_class, equipment_type,
      squat_opener, bench_opener, deadlift_opener,
      squat_result, bench_result, deadlift_result,
      total_result, dots_score, wilks_score, placement, notes, updated_at,
      meet:meet_id ( id, name, meet_date, federation, location, status )
    `)
    .eq('athlete_id', userId)
    .order('updated_at', { ascending: false })
  if (error) { console.error('[supabase] fetchAthleteMeetHistory:', error.message); return [] }
  return data ?? []
}

/**
 * Fetch nutrition logs for the entire org (for team nutrition compliance).
 */
export async function fetchOrgNutritionLogs(orgId, days = 30) {
  if (!isSupabaseConfigured() || !orgId) return []
  const { data: members, error: mErr } = await supabase
    .from('org_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('org_role', 'athlete')
  if (mErr) { console.error('[supabase] fetchOrgNutritionLogs members:', mErr.message); return [] }
  const ids = (members ?? []).map(m => m.user_id)
  if (!ids.length) return []
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('id, athlete_id, log_date, calories_actual, protein_actual, compliance_score')
    .in('athlete_id', ids)
    .gte('log_date', since.toISOString().slice(0, 10))
    .order('log_date', { ascending: false })
  if (error) { console.error('[supabase] fetchOrgNutritionLogs:', error.message); return [] }
  return data ?? []
}
