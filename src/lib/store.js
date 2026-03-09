import { create } from 'zustand'
import { MOCK_USERS, MOCK_GOALS, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_ORGS, MOCK_PLATFORM_USERS, MOCK_ORG_MEMBERS, MOCK_STAFF_ASSIGNMENTS, MOCK_ATHLETE_RECIPES, MOCK_ATHLETE_PREP_LOG, MOCK_ATHLETE_SHOPPING_LISTS, MOCK_ATHLETE_MEAL_PLANS, MOCK_CHANNELS, MOCK_MESSAGES, MOCK_DIRECT_MESSAGES, MOCK_EXERCISES } from './mockData'
import { upsertProfile, isSupabaseConfigured, onAuthStateChange, fetchProfile, fetchOrgMemberships, signOut as supabaseSignOut, getSession, fetchChannels as sbFetchChannels, createChannel as sbCreateChannel, updateChannel as sbUpdateChannel, archiveChannel as sbArchiveChannel, fetchMessages as sbFetchMessages, sendMessage as sbSendMessage, editMessage as sbEditMessage, deleteMessage as sbDeleteMessage, toggleReaction as sbToggleReaction, togglePinMessage as sbTogglePinMessage, findOrCreateDM as sbFindOrCreateDM, findOrCreateGroup as sbFindOrCreateGroup, markChannelRead as sbMarkChannelRead, subscribeToChannel as sbSubscribeToChannel, uploadMessageFile as sbUploadMessageFile, subscribeToOrgEvents as sbSubscribeToOrgEvents, fetchOrgAthletes, fetchOrgReviewQueue, fetchExercises, fetchProgramTemplates, fetchOrgTrainingBlocks, fetchPrepLog, fetchShoppingLists, fetchOrgRecipes, fetchNutritionLogs, fetchOrgEvents, fetchUserEvents, fetchAthleteSessions, fetchAthleteWorkoutSets, fetchAthleteCheckIns, fetchAthleteInjuries, fetchOrgWorkoutSessions, fetchOrgWorkoutSets, fetchOrgCheckIns, fetchOrgInjuries, fetchOrgStaffMembers, fetchOrgNutritionLogs, fetchUserMeets, fetchUserTrainingBlocks, fetchUserGoals, fetchAthleteMeetHistory, fetchAllOrgsForSuperAdmin, fetchAllPlatformUsers, insertOrgInvitation, deleteOrgInvitation, updateOrgMemberRole, removeOrgMember, upsertOrgMember, upsertStaffAssignment, fetchOrgMembers, fetchOrgInvitations } from './supabase'
import { saveMessageRecord, updateMessageRecord, saveChannelRecord, updateChannelRecord, saveOrgPublicPage, loadOrgPublicPage, loadOrgLeads, submitIntakeLead, saveLead, removeLead, loadOrgResources, saveNewResource, updateResource, removeResource } from './db'
import { subscribeToOrgLeads, subscribeToOrgResources } from './supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  isDemo: false,           // true only when logged in via loginAsDemo
  // All org memberships for the current user: [{ id, org_id, org_role, is_self_athlete, nutrition_permissions }]
  orgMemberships: [],
  // Currently active org context (user can switch orgs)
  activeOrgId: null,
  isLoading: false,
  authReady: false,        // true once the initial session check has completed

  // Demo login — sets role without hitting Supabase Auth.
  // If Supabase is configured, upserts the mock profile row so the UUID
  // exists in the profiles table for subsequent DB writes.
  loginAsDemo: async (role) => {
    const baseProfile = MOCK_USERS[role] || MOCK_USERS.athlete
    // assistant_coach has role:'coach' baked into its MOCK_USERS entry;
    // for all others, use the role key directly.
    const resolvedRole = role === 'assistant_coach' ? 'coach' : (role === 'super_admin' ? 'super_admin' : role)
    const profile = { ...baseProfile, role: resolvedRole }
    const memberships = MOCK_ORG_MEMBERS.filter((m) => m.user_id === profile.id)
    const activeOrgId = memberships[0]?.org_id ?? null
    set({
      user: { id: profile.id, email: profile.email },
      profile,
      orgMemberships: memberships,
      activeOrgId,
      isDemo: true,
      viewAsAthlete: false,
    })
    // Seed all other stores with mock data for the demo session
    useOrgStore.setState({ orgs: MOCK_ORGS, staffAssignments: MOCK_STAFF_ASSIGNMENTS })
    // Super-admin demo: also seed platform-wide user list and mark orgs loaded
    if (resolvedRole === 'super_admin') {
      useOrgStore.setState({ platformUsers: MOCK_PLATFORM_USERS, _allOrgsLoaded: true })
    }
    useGoalsStore.setState({ goals: MOCK_GOALS })
    useTrainingStore.setState({ blocks: MOCK_TRAINING_BLOCKS, meets: MOCK_MEETS })
    useMeetsStore.setState({ meets: MOCK_MEETS, blocks: MOCK_TRAINING_BLOCKS, goals: MOCK_GOALS, history: [], loading: false, loadedFor: profile.id })
    useNutritionStore.setState({
      athleteRecipes: JSON.parse(JSON.stringify(MOCK_ATHLETE_RECIPES)),
      athletePrepLog: JSON.parse(JSON.stringify(MOCK_ATHLETE_PREP_LOG)),
      athleteShoppingLists: JSON.parse(JSON.stringify(MOCK_ATHLETE_SHOPPING_LISTS)),
      boardPlans: JSON.parse(JSON.stringify(MOCK_ATHLETE_MEAL_PLANS)),
    })
    // Reset messaging store so any prior real-user channels don't block demo seeding
    useMessagingStore.setState({ channels: [], messagesByThread: {}, directMessages: [], _fetchedThreads: new Set(), _realtimeSubs: {}, _isDemo: false, _demoSeeded: false })
    // Fire-and-forget: persist the mock profile to Supabase if configured
    if (isSupabaseConfigured()) {
      upsertProfile(profile).then((result) => {
        if (result) console.log('[supabase] Profile synced:', profile.display_name)
      })
    }
  },

  logout: () => {
    // Clear auth state AND all stores so demo/real data can't leak between sessions
    set({ user: null, profile: null, orgMemberships: [], activeOrgId: null, isDemo: false, viewAsAthlete: false })
    useOrgStore.setState({ orgs: [], staffAssignments: [], platformUsers: [], _allOrgsLoaded: false, websiteLoadedFor: new Set(), resourcesLoadedFor: new Set() })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {}, orgRecipes: [], orgRecipesLoaded: false, nutritionLogs: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
    useMessagingStore.setState({ channels: [], messagesByThread: {}, directMessages: [], _fetchedThreads: new Set(), _realtimeSubs: {}, _isDemo: false, _demoSeeded: false })
    useCalendarStore.getState().reset()
    useAnalyticsStore.getState().reset()
    useMeetsStore.getState().reset()
  },

  /**
   * Called with a live Supabase session (from onAuthStateChange or callback page).
   * Fetches the profile + org memberships from the DB and hydrates the store.
   * Always clears any lingering demo data from other stores first.
   */
  handleAuthSession: async (session) => {
    if (!session?.user) {
      set({ user: null, profile: null, orgMemberships: [], activeOrgId: null })
      return
    }
    set({ isLoading: true })
    // Clear any demo data that may have been loaded in a prior demo session
    useOrgStore.setState({ orgs: [], staffAssignments: [], platformUsers: [], _allOrgsLoaded: false, websiteLoadedFor: new Set(), resourcesLoadedFor: new Set() })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {}, orgRecipes: [], orgRecipesLoaded: false, nutritionLogs: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
    useMessagingStore.setState({ channels: [], messagesByThread: {}, directMessages: [], _fetchedThreads: new Set(), _realtimeSubs: {}, _isDemo: false, _demoSeeded: false })
    useCalendarStore.getState().reset()
    useAnalyticsStore.getState().reset()
    useMeetsStore.getState().reset()
    const [profile, memberships] = await Promise.all([
      fetchProfile(session.user.id),
      fetchOrgMemberships(session.user.id),
    ])
    const activeOrgId = memberships[0]?.org_id ?? null
    // Derive role: platform_role takes highest priority (super_admin),
    // then DB profile.role, then user_metadata, then org membership role
    const membershipRole = memberships[0]?.org_role
    const metaRole = session.user.user_metadata?.role
    const dbPlatformRole = profile?.platform_role
    const dbRole = profile?.role
    // Resolved role used throughout the app for nav/permission checks
    const resolvedRole = dbPlatformRole === 'super_admin' ? 'super_admin'
      : dbRole || metaRole || membershipRole || 'athlete'

    // If a non-super_admin user belongs to an org, build a minimal org object
    // in the store and then fetch its real members + invitations from Supabase.
    if (activeOrgId && dbPlatformRole !== 'super_admin') {
      // Seed a minimal org record so the AdminPage TeamTab can render immediately
      useOrgStore.setState((s) => {
        const already = s.orgs.find((o) => o.id === activeOrgId)
        if (already) return s
        return {
          orgs: [
            ...s.orgs,
            {
              id: activeOrgId,
              name: memberships[0]?.organizations?.name || '',
              slug: memberships[0]?.organizations?.slug || '',
              members: [],
              invitations: [],
              activity_log: [],
              plan: 'starter',
              status: 'active',
              is_demo: false,
            },
          ],
        }
      })
      // Async: hydrate members + invitations (don't block auth)
      useOrgStore.getState().loadOrgMembers(activeOrgId)
    }

    set({
      user: session.user,
      profile: profile
        ? { ...profile, role: resolvedRole }
        : {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name ?? '',
            display_name: session.user.user_metadata?.display_name ?? session.user.email,
            platform_role: 'user',
            role: resolvedRole,
          },
      orgMemberships: memberships,
      activeOrgId,
      isDemo: false,
      isLoading: false,
      viewAsAthlete: false,
    })
  },

  /**
   * Subscribe to Supabase auth state. Call once on app mount.
   * Returns the unsubscribe function.
   */
  initAuth: () => {
    if (!isSupabaseConfigured()) {
      set({ authReady: true })
      return () => {}
    }
    // Check existing session immediately via getSession (reads from localStorage — no network).
    // We handle the initial session here, then let onAuthStateChange handle future events only.
    let initialCheckDone = false
    const { handleAuthSession } = get()
    getSession().then((session) => {
      initialCheckDone = true
      if (session) {
        handleAuthSession(session).then(() => set({ authReady: true }))
      } else {
        set({ authReady: true })
      }
    })
    // Listen for future auth changes. Skip SIGNED_IN during the initial tick
    // because getSession() already handles the on-load session — firing both
    // would double-clear stores and cause a race condition.
    const subscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Only act on SIGNED_IN after the initial check is done (i.e. this is
        // a real new login, not the token being read from localStorage on load).
        if (initialCheckDone) get().handleAuthSession(session)
        return
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        get().handleAuthSession(session)
      }
      if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, orgMemberships: [], activeOrgId: null, isDemo: false, authReady: true })
      }
    })
    return () => subscription.unsubscribe()
  },

  /**
   * Sign out the real Supabase user (or just clear store for demo users).
   */
  handleSignOut: async () => {
    if (isSupabaseConfigured()) await supabaseSignOut()
    set({ user: null, profile: null, orgMemberships: [], activeOrgId: null, isDemo: false, viewAsAthlete: false })
    // Clear all stores back to empty (remove any demo or real user data)
    useOrgStore.setState({ orgs: [], staffAssignments: [], platformUsers: [], _allOrgsLoaded: false, websiteLoadedFor: new Set(), resourcesLoadedFor: new Set() })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
    useMessagingStore.setState({ channels: [], messagesByThread: {}, directMessages: [], _fetchedThreads: new Set(), _realtimeSubs: {}, _isDemo: false, _demoSeeded: false })
    useCalendarStore.getState().reset()
    useAnalyticsStore.getState().reset()
    useMeetsStore.getState().reset()
  },

  setProfile: (profile) => set({ profile }),

  // Switch the active org (e.g. user belongs to multiple orgs) — reset per-org stores
  setActiveOrg: (orgId) => {
    const prev = get().activeOrgId
    if (prev !== orgId) {
      useCalendarStore.getState().reset()
      useAnalyticsStore.getState().reset()
      useMeetsStore.getState().reset()
    }
    set({ activeOrgId: orgId })
  },

  // Returns the org_role for the current user in the active org
  getActiveOrgRole: () => {
    const { orgMemberships, activeOrgId } = get()
    return orgMemberships.find((m) => m.org_id === activeOrgId)?.org_role ?? null
  },

  // Returns the org_role for the current user in a specific org
  getOrgRole: (orgId) => {
    const { orgMemberships } = get()
    return orgMemberships.find((m) => m.org_id === orgId)?.org_role ?? null
  },

  // Returns true if the current user has a specific nutrition_permission in the active org.
  // Ownership / head_coach / nutritionist roles always pass.
  hasNutritionPermission: (permission) => {
    const { orgMemberships, activeOrgId } = get()
    const membership = orgMemberships.find((m) => m.org_id === activeOrgId)
    if (!membership) return false
    const elevated = ['owner', 'head_coach', 'nutritionist']
    if (elevated.includes(membership.org_role)) return true
    return (membership.nutrition_permissions || []).includes(permission)
  },

  // Returns true if the current user is acting as a self-athlete in the active org
  isSelfAthlete: () => {
    const { orgMemberships, activeOrgId } = get()
    return orgMemberships.find((m) => m.org_id === activeOrgId)?.is_self_athlete ?? false
  },

  // ── "View as Athlete" persona toggle ────────────────────────────────────
  // When true, staff see the athlete-facing UI for their own personal data.
  // Staff who have is_self_athlete = true on their membership can flip this.
  viewAsAthlete: false,
  setViewAsAthlete: (val) => set({ viewAsAthlete: val }),
  toggleViewAsAthlete: () => set((s) => ({ viewAsAthlete: !s.viewAsAthlete })),

  // ── Role & permission management (head coach / admin) ───────────────────
  // Updates a member's org_role across the orgMemberships list (demo-only)
  setMemberOrgRole: (orgId, userId, newRole) =>
    set((s) => ({
      orgMemberships: s.orgMemberships.map((m) =>
        m.org_id === orgId && m.user_id === userId ? { ...m, org_role: newRole } : m
      ),
    })),
}))

export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  activeTab: 'today',
  activePage: 'dashboard',
  mobileNavOpen: false,
  notificationsOpen: false,
  nutritionDeepLink: null, // { tab: string, athleteId?: string } — consumed once on NutritionPage mount

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setActivePage: (page) => set({ activePage: page }),
  setMobileNavOpen: (v) => set({ mobileNavOpen: v }),
  setNotificationsOpen: (v) => set({ notificationsOpen: v }),
  setNutritionDeepLink: (link) => set({ nutritionDeepLink: link }),
  clearNutritionDeepLink: () => set({ nutritionDeepLink: null }),
}))

export const useWorkoutStore = create((set) => ({
  activeSession: null,
  loggedSets: {},

  startSession: (session) => set({ activeSession: session, loggedSets: {} }),

  logSet: (exerciseId, setIndex, data) =>
    set((s) => ({
      loggedSets: {
        ...s.loggedSets,
        [`${exerciseId}-${setIndex}`]: data,
      },
    })),

  completeSession: () => set({ activeSession: null, loggedSets: {} }),
}))

// ─── Helpers ────────────────────────────────────────────────────────────────
const ls = {
  get: (k, fallback) => { try { return localStorage.getItem(k) || fallback } catch { return fallback } },
  set: (k, v) => { try { localStorage.setItem(k, v) } catch {} },
  getJSON: (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) || fallback } catch { return fallback } },
  setJSON: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}

// ─── Settings (weight unit, color mode, gym prefs) ───────────────────────────
export const useSettingsStore = create((set) => ({
  // Weight unit
  weightUnit: ls.get('pp_weight_unit', 'kg'),
  toggleWeightUnit: () =>
    set((s) => {
      const next = s.weightUnit === 'kg' ? 'lbs' : 'kg'
      ls.set('pp_weight_unit', next)
      return { weightUnit: next }
    }),
  setWeightUnit: (u) => { ls.set('pp_weight_unit', u); set({ weightUnit: u }) },

  // Color mode: 'dark' | 'light'
  colorMode: ls.get('pp_color_mode', 'dark'),
  setColorMode: (mode) => { ls.set('pp_color_mode', mode); set({ colorMode: mode }) },
  toggleColorMode: () =>
    set((s) => {
      const next = s.colorMode === 'dark' ? 'light' : 'dark'
      ls.set('pp_color_mode', next)
      return { colorMode: next }
    }),

  // Gym & workout preferences — used to auto-fill workout sessions
  gymLocations: ls.getJSON('pp_gym_locations', [
    { id: 'loc-1', name: 'Main Gym', address: '123 Iron Ave', isDefault: true },
  ]),
  preferredLocation: ls.get('pp_preferred_location', 'loc-1'),
  preferredWorkoutTime: ls.get('pp_preferred_workout_time', '06:00'),
  preferredDuration: ls.get('pp_preferred_duration', '90'),

  setPreferredLocation: (id) => { ls.set('pp_preferred_location', id); set({ preferredLocation: id }) },
  setPreferredWorkoutTime: (t) => { ls.set('pp_preferred_workout_time', t); set({ preferredWorkoutTime: t }) },
  setPreferredDuration: (d) => { ls.set('pp_preferred_duration', d); set({ preferredDuration: d }) },

  addGymLocation: (loc) =>
    set((s) => {
      const next = [...s.gymLocations, { ...loc, id: `loc-${Date.now()}`, isDefault: false }]
      ls.setJSON('pp_gym_locations', next)
      return { gymLocations: next }
    }),
  removeGymLocation: (id) =>
    set((s) => {
      const next = s.gymLocations.filter((l) => l.id !== id)
      ls.setJSON('pp_gym_locations', next)
      return { gymLocations: next }
    }),
  setDefaultLocation: (id) =>
    set((s) => {
      const next = s.gymLocations.map((l) => ({ ...l, isDefault: l.id === id }))
      ls.setJSON('pp_gym_locations', next)
      ls.set('pp_preferred_location', id)
      return { gymLocations: next, preferredLocation: id }
    }),
}))

// ─── Goals Store ─────────────────────────────────────────────────────────────
export const useGoalsStore = create((set, get) => ({
  goals: [],

  // Update numeric progress for a goal
  updateGoalProgress: (goalId, newValue) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? { ...g, current_value: newValue, completed: newValue >= g.target_value }
          : g
      ),
    })),

  // Mark a goal done/undone
  markGoalComplete: (goalId, done = true) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === goalId ? { ...g, completed: done } : g)),
    })),

  // Add a new goal
  addGoal: (goal) =>
    set((s) => ({
      goals: [...s.goals, { ...goal, id: `g-${Date.now()}`, completed: false }],
    })),

  // Remove a goal
  removeGoal: (goalId) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== goalId) })),

  // Push the highest logged weight (in kg) into linked strength goals
  // Called from WorkoutPage whenever a PR set is saved
  pushPRToGoals: (liftName, weightKg) =>
    set((s) => {
      const liftKeywords = liftName.toLowerCase()
      return {
        goals: s.goals.map((g) => {
          if (g.goal_type !== 'strength' && g.goal_type !== 'meet') return g
          const title = g.title.toLowerCase()
          const isMatch =
            (liftKeywords.includes('squat') && title.includes('squat')) ||
            (liftKeywords.includes('bench') && title.includes('bench')) ||
            (liftKeywords.includes('deadlift') && title.includes('deadlift')) ||
            (liftKeywords.includes('total') && title.includes('total'))
          if (!isMatch) return g
          const current = g.current_value || 0
          const updated = Math.max(current, Math.round(weightKg * 10) / 10)
          const newEntry = { date: new Date().toISOString().slice(0, 10), value: updated, source: 'Workout session' }
          return {
            ...g,
            current_value: updated,
            completed: updated >= g.target_value,
            progress_history: [...(g.progress_history || []), newEntry],
          }
        }),
      }
    }),
}))

// ─── Meets Store (athlete competition calendar + training blocks + history) ───
export const useMeetsStore = create((set, get) => ({
  meets:   [],
  blocks:  [],
  goals:   [],
  history: [],
  loading: false,
  loadedFor: null,   // userId this data was last fetched for

  /**
   * Load all meets, personal training blocks, goals, and meet history
   * for the current athlete. Skips if already loaded for this user.
   */
  load: async (userId, orgId, force = false) => {
    if (!userId) return
    if (!force && get().loadedFor === userId && get().meets.length > 0) return
    set({ loading: true })
    const [meets, blocks, goals, history] = await Promise.all([
      fetchUserMeets(userId, orgId),
      fetchUserTrainingBlocks(userId, orgId),
      fetchUserGoals(userId),
      fetchAthleteMeetHistory(userId),
    ])
    set({ meets, blocks, goals, history, loading: false, loadedFor: userId })
  },

  // ── Meets CRUD ────────────────────────────────────────────────────────────
  addMeet: (meet) => set((s) => ({ meets: [meet, ...s.meets] })),
  updateMeet: (id, updates) =>
    set((s) => ({ meets: s.meets.map((m) => m.id === id ? { ...m, ...updates } : m) })),
  removeMeet: (id) =>
    set((s) => ({ meets: s.meets.filter((m) => m.id !== id) })),

  // ── Training Blocks CRUD ──────────────────────────────────────────────────
  addBlock: (block) => set((s) => ({ blocks: [block, ...s.blocks] })),
  updateBlock: (id, updates) =>
    set((s) => ({ blocks: s.blocks.map((b) => b.id === id ? { ...b, ...updates } : b) })),
  removeBlock: (id) =>
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),

  // ── Goals (read from DB; push updated goals locally) ─────────────────────
  updateGoal: (id, updates) =>
    set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, ...updates } : g) })),

  // ── Meet history ──────────────────────────────────────────────────────────
  addHistoryEntry: (entry) => set((s) => ({ history: [entry, ...s.history] })),
  updateHistoryEntry: (id, updates) =>
    set((s) => ({ history: s.history.map((h) => h.id === id ? { ...h, ...updates } : h) })),

  // ── Reset (logout / org switch) ───────────────────────────────────────────
  reset: () => set({ meets: [], blocks: [], goals: [], history: [], loading: false, loadedFor: null }),
}))

// ─── Training / Block Store ───────────────────────────────────────────────────
export const useTrainingStore = create((set) => ({
  blocks: [],
  meets: [],
  loading: false,
  error: null,

  // ── Live load (staff Training Management page) ───────────────────────────
  loadOrgTrainingBlocks: async (orgId) => {
    set({ loading: true, error: null })
    const blocks = await fetchOrgTrainingBlocks(orgId)
    set({ blocks, loading: false })
  },

  // ── CRUD actions ─────────────────────────────────────────────────────────
  addBlock: (b) => set((s) => ({ blocks: [b, ...s.blocks] })),

  updateBlock: (id, updates) =>
    set((s) => ({
      blocks: s.blocks.map((b) => b.id === id ? { ...b, ...updates } : b),
    })),

  removeBlock: (id) =>
    set((s) => ({ blocks: s.blocks.filter((b) => b.id !== id) })),

  linkBlockToGoal: (blockId, goalId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId && !b.linked_goal_ids?.includes(goalId)
          ? { ...b, linked_goal_ids: [...(b.linked_goal_ids ?? []), goalId] }
          : b
      ),
    })),

  unlinkBlockFromGoal: (blockId, goalId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId
          ? { ...b, linked_goal_ids: (b.linked_goal_ids ?? []).filter((id) => id !== goalId) }
          : b
      ),
    })),

  linkBlockToMeet: (blockId, meetId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId ? { ...b, linked_meet_id: meetId } : b
      ),
    })),
}))

// ─── Organization Store ───────────────────────────────────────────────────────
export const useOrgStore = create((set, get) => ({
  orgs: [],
  staffAssignments: [],
  platformUsers: [],          // super_admin only: all platform user profiles
  _allOrgsLoaded: false,      // guard to prevent double-fetching
  // Track which orgs have had their website data loaded from Supabase
  websiteLoadedFor: new Set(),

  // Super-admin: load ALL organizations + members + invitations from Supabase
  loadAllOrgs: async () => {
    if (get()._allOrgsLoaded) return
    set({ _allOrgsLoaded: true })
    const orgs = await fetchAllOrgsForSuperAdmin()
    set({ orgs })
  },

  // Super-admin: load all platform user profiles
  loadPlatformUsers: async () => {
    const users = await fetchAllPlatformUsers()
    set({ platformUsers: users })
  },

  // Super-admin: move a user from one org to another (or add to a new org)
  // Optimistically updates local state; persists to Supabase in background.
  moveUserToOrg: async (userId, userName, userEmail, fromOrgId, toOrgId, role) => {
    const member = { user_id: userId, full_name: userName, email: userEmail, org_role: role, role, status: 'active', joined_at: new Date().toISOString().slice(0, 10) }
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id === fromOrgId) {
          return { ...o, members: (o.members || []).filter((m) => m.user_id !== userId) }
        }
        if (o.id === toOrgId) {
          const existing = (o.members || []).find((m) => m.user_id === userId)
          if (existing) return { ...o, members: (o.members || []).map((m) => m.user_id === userId ? { ...m, org_role: role, role } : m) }
          return { ...o, members: [...(o.members || []), member] }
        }
        return o
      }),
    }))
    if (fromOrgId) await removeOrgMember(fromOrgId, userId)
    await upsertOrgMember(toOrgId, userId, role)
  },

  // Super-admin: change a member's role within their current org
  changeOrgMemberRole: async (orgId, userId, newRole) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        return { ...o, members: (o.members || []).map((m) => m.user_id === userId ? { ...m, org_role: newRole, role: newRole } : m) }
      }),
    }))
    await updateOrgMemberRole(orgId, userId, newRole)
  },

  // Super-admin: remove a user from an org entirely
  removeUserFromOrg: async (orgId, userId) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        return { ...o, members: (o.members || []).filter((m) => m.user_id !== userId) }
      }),
    }))
    await removeOrgMember(orgId, userId)
  },

  // Super-admin: assign a user to one or more staff members within an org.
  // staffIds = array of profile IDs (head_coach, coach, nutritionist)
  // userId   = the athlete/coach being assigned
  assignToStaff: async (orgId, userId, staffIds) => {
    await Promise.all(staffIds.map((staffId) => upsertStaffAssignment(orgId, staffId, userId)))
  },

  // Get a single org by id
  getOrg: (orgId) => get().orgs.find((o) => o.id === orgId),

  // Load org website (public_page + leads) from Supabase and hydrate the org object.
  loadOrgWebsite: async (orgId) => {
    if (!orgId) return
    // Skip if already loaded (cache)
    if (get().websiteLoadedFor.has(orgId)) return
    const [pageRow, leads] = await Promise.all([
      loadOrgPublicPage(orgId),
      loadOrgLeads(orgId),
    ])
    set((s) => ({
      websiteLoadedFor: new Set([...s.websiteLoadedFor, orgId]),
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        // Map DB row → public_page shape
        const public_page = pageRow ? {
          published:         pageRow.published,
          hero_headline:     pageRow.hero_headline || '',
          hero_subheadline:  pageRow.hero_subheadline || '',
          hero_cta:          pageRow.hero_cta || 'Apply to Join',
          accent_color:      pageRow.accent_color || '#a855f7',
          logo_url:          pageRow.logo_url || null,
          custom_url:        pageRow.custom_url || '',
          sections:          pageRow.sections || [],
          intake_fields:     pageRow.intake_fields || [],
        } : (o.public_page || {})
        return { ...o, public_page, leads: leads || o.leads || [] }
      }),
    }))
  },

  // Create a new organization
  createOrg: (data) =>
    set((s) => ({
      orgs: [
        ...s.orgs,
        {
          id: `org-${Date.now()}`,
          slug: data.name.toLowerCase().replace(/\s+/g, '-'),
          plan: data.plan || 'starter',
          status: 'active',
          created_at: new Date().toISOString().slice(0, 10),
          head_coach_id: null,
          federation: data.federation || '',
          timezone: data.timezone || 'America/New_York',
          weight_unit: data.weight_unit || 'lbs',
          athlete_limit: data.plan === 'enterprise' ? 100 : data.plan === 'team_pro' ? 30 : 10,
          staff_limit: data.plan === 'enterprise' ? 20 : data.plan === 'team_pro' ? 5 : 2,
          storage_gb_limit: data.plan === 'enterprise' ? 50 : data.plan === 'team_pro' ? 10 : 2,
          storage_gb_used: 0,
          logo_url: null,
          address: data.address || '',
          has_dedicated_nutritionist: false,
          athletes_can_self_manage_nutrition: true,
          members: [],
          invitations: [],
          activity_log: [],
          ...data,
        },
      ],
    })),

  // Update org fields (name, plan, federation, nutritionist flags, etc.)
  updateOrg: (orgId, updates) =>
    set((s) => ({
      orgs: s.orgs.map((o) => (o.id === orgId ? { ...o, ...updates } : o)),
    })),

  // Delete an org
  deleteOrg: (orgId) =>
    set((s) => ({ orgs: s.orgs.filter((o) => o.id !== orgId) })),

  // Toggle org status active/suspended
  toggleOrgStatus: (orgId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id === orgId
          ? { ...o, status: o.status === 'active' ? 'suspended' : 'active' }
          : o
      ),
    })),

  // Load members and invitations for a specific org from Supabase (head_coach view)
  loadOrgMembers: async (orgId) => {
    if (!orgId || !isSupabaseConfigured()) return
    const [members, invitations] = await Promise.all([
      fetchOrgMembers(orgId),
      fetchOrgInvitations(orgId),
    ])
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id === orgId ? { ...o, members, invitations } : o
      ),
    }))
  },

  // Send an invitation — writes to Supabase then updates local state
  inviteMember: async (orgId, { email, org_role, role, message = '' }) =>
    set(async (s) => {
      const effectiveRole = org_role || role || 'athlete'
      // Optimistic local update first
      const tempInv = {
        id: `inv-${Date.now()}`,
        email,
        org_role: effectiveRole,
        role: effectiveRole,
        message,
        status: 'pending',
        sent_at: new Date().toISOString().slice(0, 10),
      }
      // Supabase insert (fire-and-forget; replace temp id with real one if success)
      const currentUser = useAuthStore.getState().user
      insertOrgInvitation(orgId, { email, org_role: effectiveRole, message, invitedBy: currentUser?.id })
        .then((row) => {
          if (!row) return
          set((s2) => ({
            orgs: s2.orgs.map((o) => {
              if (o.id !== orgId) return o
              return {
                ...o,
                invitations: o.invitations.map((i) => (i.id === tempInv.id ? { ...i, id: row.id } : i)),
              }
            }),
          }))
        })
      return {
        orgs: s.orgs.map((o) => {
          if (o.id !== orgId) return o
          if (o.invitations.some((i) => i.email === email && i.status === 'pending')) return o
          return { ...o, invitations: [...o.invitations, tempInv] }
        }),
      }
    }),

  // Resend invitation (updates sent_at)
  resendInvite: (orgId, invId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : {
              ...o,
              invitations: o.invitations.map((i) =>
                i.id === invId ? { ...i, sent_at: new Date().toISOString().slice(0, 10) } : i
              ),
            }
      ),
    })),

  // Cancel / revoke an invitation — deletes from Supabase
  cancelInvite: (orgId, invId) => {
    // Fire Supabase delete (invId may be a real uuid)
    if (!invId.startsWith('inv-')) deleteOrgInvitation(invId)
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : { ...o, invitations: o.invitations.filter((i) => i.id !== invId) }
      ),
    }))
  },

  // Accept an invitation — moves from invitations → members
  acceptInvite: (orgId, invId, userData) =>
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        const inv = o.invitations.find((i) => i.id === invId)
        if (!inv) return o
        const newMember = {
          user_id: userData.user_id || `u-${Date.now()}`,
          full_name: userData.full_name || inv.email.split('@')[0],
          email: inv.email,
          org_role: inv.org_role,
          is_self_athlete: false,
          status: 'active',
          joined_at: new Date().toISOString().slice(0, 10),
          athlete_count: null,
        }
        return {
          ...o,
          invitations: o.invitations.filter((i) => i.id !== invId),
          members: [...o.members, newMember],
          activity_log: [
            {
              id: `act-${Date.now()}`,
              text: `${newMember.full_name} joined as ${inv.org_role}`,
              time: 'just now',
              type: 'join',
              user_id: newMember.user_id,
            },
            ...o.activity_log,
          ],
        }
      }),
    })),

  // Update a member's org_role — writes to Supabase
  updateMemberRole: (orgId, userId, newRole) => {
    updateOrgMemberRole(orgId, userId, newRole)
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : {
              ...o,
              members: o.members.map((m) =>
                m.user_id === userId ? { ...m, org_role: newRole, role: newRole } : m
              ),
            }
      ),
    }))
  },

  // Toggle is_self_athlete for a member (head_coach tracking own workouts)
  toggleSelfAthlete: (orgId, userId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : {
              ...o,
              members: o.members.map((m) =>
                m.user_id === userId ? { ...m, is_self_athlete: !m.is_self_athlete } : m
              ),
            }
      ),
    })),

  // Remove a member from an org — deletes from Supabase
  removeMember: (orgId, userId) => {
    removeOrgMember(orgId, userId)
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : { ...o, members: o.members.filter((m) => m.user_id !== userId) }
      ),
    }))
  },

  // ── Staff–Athlete Assignments ────────────────────────────────────────────
  // Get all assignments in an org for a given staff member
  getStaffAssignments: (orgId, staffId) =>
    get().staffAssignments.filter((a) => a.org_id === orgId && a.staff_id === staffId),

  // Get all assignments in an org for a given athlete
  getAthleteAssignments: (orgId, athleteId) =>
    get().staffAssignments.filter((a) => a.org_id === orgId && a.athlete_id === athleteId),

  // Upsert a staff→athlete assignment
  upsertAssignment: (assignment) =>
    set((s) => {
      const exists = s.staffAssignments.find(
        (a) => a.org_id === assignment.org_id && a.staff_id === assignment.staff_id && a.athlete_id === assignment.athlete_id
      )
      if (exists) {
        return { staffAssignments: s.staffAssignments.map((a) => a === exists ? { ...a, ...assignment } : a) }
      }
      return { staffAssignments: [...s.staffAssignments, { id: `saa-${Date.now()}`, ...assignment }] }
    }),

  // Remove a staff→athlete assignment
  removeAssignment: (orgId, staffId, athleteId) =>
    set((s) => ({
      staffAssignments: s.staffAssignments.filter(
        (a) => !(a.org_id === orgId && a.staff_id === staffId && a.athlete_id === athleteId)
      ),
    })),

  // Add an activity log entry
  logActivity: (orgId, entry) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : {
              ...o,
              activity_log: [
                { id: `act-${Date.now()}`, time: 'just now', ...entry },
                ...o.activity_log,
              ],
            }
      ),
    })),

  // ── Public Page ─────────────────────────────────────────────────────────
  // Update top-level page settings (published, hero_*, accent_color)
  updatePublicPage: (orgId, updates) => {
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, public_page: { ...o.public_page, ...updates } }
      ),
    }))
    // Persist to Supabase — pass the full merged page so sections/intake_fields are preserved
    const org = get().orgs.find((o) => o.id === orgId)
    if (org) saveOrgPublicPage(orgId, { ...org.public_page, ...updates }).catch(() => {})
  },

  // Add a new content section
  addPageSection: (orgId, section) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        const sections = o.public_page?.sections || []
        const newSections = [...sections, { id: `sec-${Date.now()}`, order: sections.length + 1, visible: true, items: [], ...section }]
        // Persist
        saveOrgPublicPage(orgId, { ...o.public_page, sections: newSections }).catch(() => {})
        return { ...o, public_page: { ...o.public_page, sections: newSections } }
      }),
    }))
  },

  // Update an existing section
  updatePageSection: (orgId, sectionId, updates) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        const sections = (o.public_page?.sections || []).map((sec) =>
          sec.id === sectionId ? { ...sec, ...updates } : sec
        )
        saveOrgPublicPage(orgId, { ...o.public_page, sections }).catch(() => {})
        return { ...o, public_page: { ...o.public_page, sections } }
      }),
    }))
  },

  // Delete a section
  deletePageSection: (orgId, sectionId) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        const sections = (o.public_page?.sections || []).filter((sec) => sec.id !== sectionId)
        saveOrgPublicPage(orgId, { ...o.public_page, sections }).catch(() => {})
        return { ...o, public_page: { ...o.public_page, sections } }
      }),
    }))
  },

  // Reorder sections (accepts full new sections array)
  reorderSections: (orgId, sections) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        saveOrgPublicPage(orgId, { ...o.public_page, sections }).catch(() => {})
        return { ...o, public_page: { ...o.public_page, sections } }
      }),
    }))
  },

  // Update intake fields
  updateIntakeFields: (orgId, fields) => {
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        saveOrgPublicPage(orgId, { ...o.public_page, intake_fields: fields }).catch(() => {})
        return { ...o, public_page: { ...o.public_page, intake_fields: fields } }
      }),
    }))
  },

  // ── Leads ───────────────────────────────────────────────────────────────
  // Add a new lead (from public intake form submission)
  addLead: async (orgId, lead) => {
    // Optimistic local add
    const tempId = `lead-${Date.now()}`
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : {
          ...o,
          leads: [
            { id: tempId, submitted_at: new Date().toISOString(), status: 'new', notes: '', assigned_to: null, ...lead },
            ...(o.leads || []),
          ],
        }
      ),
    }))
    // Persist to Supabase
    const saved = await submitIntakeLead(orgId, lead).catch(() => null)
    if (saved) {
      // Replace temp with real record
      set((s) => ({
        orgs: s.orgs.map((o) =>
          o.id !== orgId ? o : {
            ...o,
            leads: (o.leads || []).map((l) => l.id === tempId ? saved : l),
          }
        ),
      }))
    }
  },

  // Update a lead (status, notes, assigned_to)
  updateLead: (orgId, leadId, updates) => {
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, leads: (o.leads || []).map((l) => l.id === leadId ? { ...l, ...updates } : l) }
      ),
    }))
    saveLead(leadId, updates).catch(() => {})
  },

  // Delete a lead
  deleteLead: (orgId, leadId) => {
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, leads: (o.leads || []).filter((l) => l.id !== leadId) }
      ),
    }))
    removeLead(leadId).catch(() => {})
  },

  // Subscribe to realtime new leads for an org (returns unsubscribe fn)
  subscribeLeads: (orgId) => {
    const channel = subscribeToOrgLeads(orgId, (newLead) => {
      set((s) => ({
        orgs: s.orgs.map((o) =>
          o.id !== orgId ? o : {
            ...o,
            leads: [(newLead), ...(o.leads || []).filter((l) => l.id !== newLead.id)],
          }
        ),
      }))
    })
    return () => channel?.unsubscribe?.()
  },

  // ── Resources ────────────────────────────────────────────────────────────
  // Track which orgs have had resources loaded
  resourcesLoadedFor: new Set(),

  loadOrgResources: async (orgId) => {
    if (!orgId) return
    if (get().resourcesLoadedFor.has(orgId)) return
    const resources = await loadOrgResources(orgId)
    set((s) => ({
      resourcesLoadedFor: new Set([...s.resourcesLoadedFor, orgId]),
      orgs: s.orgs.map((o) => o.id !== orgId ? o : { ...o, resources: resources || [] }),
    }))
  },

  addResource: async (orgId, createdBy, resource) => {
    // Optimistic local add
    const tempId = `res-${Date.now()}`
    const optimistic = {
      id: tempId,
      org_id: orgId,
      created_by: createdBy,
      is_published: resource.is_published !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: resource.tags || [],
      ...resource,
    }
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, resources: [optimistic, ...(o.resources || [])] }
      ),
    }))
    const saved = await saveNewResource(orgId, createdBy, resource).catch(() => null)
    if (saved) {
      set((s) => ({
        orgs: s.orgs.map((o) =>
          o.id !== orgId ? o : {
            ...o,
            resources: (o.resources || []).map((r) => r.id === tempId ? saved : r),
          }
        ),
      }))
    }
    return saved
  },

  updateResource: (orgId, resourceId, updates) => {
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : {
          ...o,
          resources: (o.resources || []).map((r) =>
            r.id === resourceId ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
          ),
        }
      ),
    }))
    updateResource(resourceId, updates).catch(() => {})
  },

  deleteResource: (orgId, resourceId) => {
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, resources: (o.resources || []).filter((r) => r.id !== resourceId) }
      ),
    }))
    removeResource(resourceId).catch(() => {})
  },

  subscribeResources: (orgId) => {
    return subscribeToOrgResources(orgId, (payload) => {
      const { eventType, new: rec, old } = payload
      set((s) => ({
        orgs: s.orgs.map((o) => {
          if (o.id !== orgId) return o
          const list = o.resources || []
          if (eventType === 'INSERT') return { ...o, resources: [rec, ...list.filter((r) => r.id !== rec.id)] }
          if (eventType === 'UPDATE') return { ...o, resources: list.map((r) => r.id === rec.id ? rec : r) }
          if (eventType === 'DELETE') return { ...o, resources: list.filter((r) => r.id !== old.id) }
          return o
        }),
      }))
    })
  },
}))

// ─── Shared role resolution helper ───────────────────────────────────────────
// Resolves the app role key from profile + membership.
// Priority: profile.role (set during onboarding) > membership.org_role (from DB join)
// Returns: 'super_admin' | 'admin' | 'coach' | 'nutritionist' | 'athlete'
export function resolveRole(profile, membership) {
  // Check profile.role first — this is always set during onboarding
  const pr = profile?.role
  if (pr === 'super_admin') return 'super_admin'
  if (pr === 'head_coach' || pr === 'owner' || pr === 'admin') return 'admin'
  if (pr === 'coach') return 'coach'
  if (pr === 'nutritionist') return 'nutritionist'
  // Fall back to org membership role (covers refresh before profile.role is set)
  const mr = membership?.org_role
  if (!mr) return pr === 'athlete' ? 'athlete' : (pr ? 'athlete' : 'athlete')
  if (mr === 'owner' || mr === 'head_coach' || mr === 'admin') return 'admin'
  if (mr === 'super_admin') return 'super_admin'
  if (mr === 'coach') return 'coach'
  if (mr === 'nutritionist') return 'nutritionist'
  return 'athlete'
}

// Returns true if the resolved role is a staff role
export function isStaffRole(profile, membership) {
  const r = resolveRole(profile, membership)
  return r === 'admin' || r === 'coach' || r === 'nutritionist' || r === 'super_admin'
}

// ─── Nutrition Store — shared across NutritionPage + RosterPage profiles ──────
export const useNutritionStore = create((set) => ({
  athleteRecipes: {},
  setAthleteRecipes: (updater) =>
    set((s) => ({
      athleteRecipes: typeof updater === 'function' ? updater(s.athleteRecipes) : updater,
    })),

  athletePrepLog: {},
  setAthletePrepLog: (updater) =>
    set((s) => ({
      athletePrepLog: typeof updater === 'function' ? updater(s.athletePrepLog) : updater,
    })),

  athleteShoppingLists: {},
  setAthleteShoppingLists: (updater) =>
    set((s) => ({
      athleteShoppingLists: typeof updater === 'function' ? updater(s.athleteShoppingLists) : updater,
    })),

  boardPlans: {},
  setBoardPlans: (updater) =>
    set((s) => ({
      boardPlans: typeof updater === 'function' ? updater(s.boardPlans) : updater,
    })),

  // Org-level recipes (staff/nutritionist side)
  orgRecipes: [],
  orgRecipesLoaded: false,
  setOrgRecipes: (recipes) => set({ orgRecipes: recipes, orgRecipesLoaded: true }),

  // Athlete nutrition logs (for dashboard compliance chart)
  nutritionLogs: {},   // { [athleteId]: [ ...log rows ] }
  setNutritionLogs: (athleteId, logs) =>
    set((s) => ({ nutritionLogs: { ...s.nutritionLogs, [athleteId]: logs } })),

  // ── Async load actions ────────────────────────────────────────────────────

  /** Load prep log + shopping lists for a single athlete from Supabase. */
  loadAthleteNutrition: async (athleteId) => {
    if (!isSupabaseConfigured() || !athleteId) return
    const [sessions, lists] = await Promise.all([
      fetchPrepLog(athleteId),
      fetchShoppingLists(athleteId),
    ])
    set((s) => {
      const next = { ...s }
      if (sessions) {
        // Normalize DB shape → in-memory shape (date → date, period_start/end → week_start/end)
        const mapped = sessions.map(sess => ({
          id:                     sess.id,
          label:                  sess.label,
          date:                   sess.prep_date,
          cadence:                sess.cadence ?? 'weekly',
          week_start:             sess.period_start,
          week_end:               sess.period_end,
          notes:                  sess.notes ?? '',
          linked_goal_ids:        sess.linked_goal_ids ?? [],
          linked_block_id:        sess.linked_training_block_id ?? null,
          linked_meet_id:         sess.linked_meet_id ?? null,
          total_calories_prepped: sess.total_calories_prepped ?? 0,
          total_protein_prepped:  sess.total_protein_prepped ?? 0,
          items:                  (sess.meal_prep_session_items ?? []).map(item => ({
            id:                 item.id,
            recipe_id:          item.recipe_id ?? null,
            recipe_name:        item.recipe_name,
            servings_made:      item.servings_made,
            servings_consumed:  item.servings_consumed,
            storage:            item.storage ?? 'fridge',
            notes:              item.notes ?? '',
            macros_per_serving: item.macros_per_serving ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
          })),
        }))
        next.athletePrepLog = { ...s.athletePrepLog, [athleteId]: mapped }
      }
      if (lists) {
        // Normalize DB shape → in-memory shape
        const mapped = lists.map(list => ({
          id:         list.id,
          label:      list.label,
          cadence:    list.cadence ?? 'weekly',
          week_start: list.week_start,
          week_end:   list.week_end,
          budget:     list.budget ?? 0,
          status:     list.status ?? 'active',
          notes:      list.notes ?? '',
          categories: (list.shopping_list_categories ?? []).map(cat => ({
            id:    cat.id,
            name:  cat.name,
            icon:  cat.icon ?? '',
            items: (cat.shopping_list_items ?? []).map(item => ({
              id:          item.id,
              name:        item.name,
              amount:      item.amount ?? '',
              price:       item.price ?? 0,
              checked:     item.checked ?? false,
              notes:       item.notes ?? '',
              recipe_ids:  item.recipe_ids ?? [],
              category_id: item.category_id,
            })),
          })),
        }))
        next.athleteShoppingLists = { ...s.athleteShoppingLists, [athleteId]: mapped }
      }
      return next
    })
  },

  /** Load org-level recipes from Supabase (nutritionist/staff side). */
  loadOrgRecipes: async (orgId, userId) => {
    if (!isSupabaseConfigured()) return
    const data = await fetchOrgRecipes(orgId, userId)
    if (!data) return
    // Map DB shape → RecipesTab shape
    const mapped = data.map(r => ({
      id:         r.id,
      name:       r.name,
      meal_type:  r.meal_type ?? 'snack',
      prep_time:  r.prep_time ?? 0,
      cook_time:  r.cook_time ?? 0,
      servings:   r.servings ?? 1,
      macros:     r.macros_per_serving ?? { calories: 0, protein: 0, carbs: 0, fat: 0 },
      ingredients:r.ingredients ?? [],
      instructions:r.instructions ?? '',
      tags:       r.tags ?? [],
      created_by: r.created_by,
      org_id:     r.org_id,
    }))
    set({ orgRecipes: mapped, orgRecipesLoaded: true })
  },

  /** Load recent nutrition logs for an athlete (compliance data). */
  loadNutritionLogs: async (athleteId, days = 30) => {
    if (!isSupabaseConfigured() || !athleteId) return
    const logs = await fetchNutritionLogs(athleteId, days)
    if (logs) set((s) => ({ nutritionLogs: { ...s.nutritionLogs, [athleteId]: logs } }))
  },
}))

// ─── Calendar Store ───────────────────────────────────────────────────────────
// Holds live calendar events for the active org + current user.
// Demo mode relies on SAMPLE_EVENTS in CalendarPage — this store is for real users.
export const useCalendarStore = create((set, get) => ({
  events:       [],   // [{ id, org_id, created_by, title, description, event_type, start_time, end_time, location, meeting_url, attendee_ids }]
  loading:      false,
  loaded:       false,
  loadedOrgId:  null, // tracks which org's events are currently loaded
  _realtimeSub: null, // unsubscribe fn for the active realtime subscription

  loadEvents: async (orgId, userId) => {
    if (!isSupabaseConfigured()) return
    const { loadedOrgId, _realtimeSub } = get()

    // Already loaded for this org — skip
    if (loadedOrgId === orgId && get().loaded) return

    // Tear down any previous realtime sub (org switch)
    if (_realtimeSub) { _realtimeSub(); }

    set({ loading: true })

    const [orgEvts, userEvts] = await Promise.all([
      orgId ? fetchOrgEvents(orgId) : [],
      fetchUserEvents(userId),
    ])

    // Merge and deduplicate by id (user events may overlap with org events)
    const combined = [...(orgEvts ?? []), ...(userEvts ?? [])]
    const seen = new Set()
    const unique = combined.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    unique.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    set({ events: unique, loading: false, loaded: true, loadedOrgId: orgId })

    // Wire realtime subscription for this org
    if (orgId) {
      const unsub = sbSubscribeToOrgEvents(orgId, {
        onInsert: (row) => {
          set((s) => {
            // Skip if already in store (optimistic add)
            if (s.events.find(e => e.id === row.id)) return {}
            const next = [...s.events, row].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
            return { events: next }
          })
        },
        onUpdate: (row) => {
          set((s) => ({
            events: s.events
              .map(e => e.id === row.id ? { ...e, ...row } : e)
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
          }))
        },
        onDelete: (row) => {
          set((s) => ({ events: s.events.filter(e => e.id !== row.id) }))
        },
      })
      set({ _realtimeSub: unsub })
    }
  },

  addEvent: (event) => set((s) => ({
    events: [...s.events, event].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
  })),

  updateEvent: (id, updates) =>
    set((s) => ({
      events: s.events
        .map((e) => e.id === id ? { ...e, ...updates } : e)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
    })),

  removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  reset: () => {
    const { _realtimeSub } = get()
    if (_realtimeSub) _realtimeSub()
    set({ events: [], loading: false, loaded: false, loadedOrgId: null, _realtimeSub: null })
  },
}))

// ─── Messaging Store ──────────────────────────────────────────────────────────
// Manages channels, DMs, and per-channel/DM message threads entirely client-side.
// isDemo bootstraps with mock data; real users start empty.
export const useMessagingStore = create((set, get) => ({
  // channels: [{ id, name, description, type: 'public'|'private'|'announcement'|'dm'|'group', members: [userId], created_by, created_at, org_id }]
  channels: [],
  // messages keyed by channel id: { [channelId]: [msg, ...] }
  messagesByThread: {},
  // directMessages: [{ id, participants: [userId, userId], last_message, last_at, unread: {[userId]: n} }]
  directMessages: [],
  // track which threads have been fetched from DB to avoid refetching
  _fetchedThreads: new Set(),
  // active realtime subscription unsubscribe functions keyed by threadId
  _realtimeSubs: {},
  // whether the store is currently in demo mode (set during initMessaging)
  _isDemo: false,
  // whether demo data has been seeded (prevents re-seeding on re-render)
  _demoSeeded: false,

  // ── Init (called once on app load or org change) ───────────────────────
  initMessaging: async (isDemo, orgId, currentUserId) => {
    const existing = get()
    // Guard: skip if already initialised for the same context.
    // For real users: only skip if channels belong to the current org (not stale demo data).
    // For demo: use a dedicated _demoSeeded flag.
    if (!isDemo && existing._isDemo) {
      // Was seeded with demo data — force a clean re-init for the real user
      set({ channels: [], messagesByThread: {}, directMessages: [], _fetchedThreads: new Set(), _isDemo: false, _demoSeeded: false })
    } else if (!isDemo && existing.channels.length > 0 && existing.channels[0]?.org_id === orgId) {
      return
    }
    if (isDemo && existing._demoSeeded) return

    if (isDemo) {
      const channels = MOCK_CHANNELS.map((ch) => ({
        ...ch,
        description: ch.name === 'general' ? 'Team-wide discussion' : ch.name === 'announcements' ? 'Important announcements from coaches' : ch.name === 'wins-board' ? 'Share your wins and PRs here 🏆' : ch.name === 'meet-prep-spring-2026' ? 'Spring 2026 meet preparation' : 'Staff only channel',
        members: ['all'],
        created_by: 'u-coach-001',
        created_at: '2026-01-01T00:00:00Z',
        org_id: orgId,
      }))
      const mockMsgsByChannel = { 'ch-1': MOCK_MESSAGES }
      const dms = MOCK_DIRECT_MESSAGES.map((dm) => ({
        id: dm.id,
        type: 'dm',
        participants: [currentUserId, dm.with_id || `u-${dm.with.replace(/\s/g,'-').toLowerCase()}`],
        display_name: dm.with,
        display_role: dm.role,
        last_message: dm.last_message,
        last_at: '2026-02-28T12:00:00Z',
        unread: { [currentUserId]: dm.unread },
      }))
      set({ channels, messagesByThread: mockMsgsByChannel, directMessages: dms, _demoSeeded: true, _isDemo: true })
      return
    }

    // Real user — load channels from Supabase
    if (!isSupabaseConfigured() || !orgId) {
      // No DB: seed a local #general only
      const general = {
        id: `ch-${orgId}-general`,
        name: 'general',
        description: 'Team-wide discussion',
        type: 'public',
        members: ['all'],
        created_by: currentUserId,
        created_at: new Date().toISOString(),
        org_id: orgId,
      }
      set({ channels: [general], messagesByThread: {}, directMessages: [] })
      return
    }

    const rawChannels = await sbFetchChannels(orgId)
    if (rawChannels.length === 0) {
      // First time: create #general in DB
      const ch = await sbCreateChannel({
        orgId,
        name: 'general',
        description: 'Team-wide discussion',
        channelType: 'public',
        createdBy: currentUserId,
        memberIds: [currentUserId],
      })
      if (ch) {
        const mapped = _mapChannel(ch)
        set({ channels: [mapped], messagesByThread: {}, directMessages: [] })
      }
      return
    }

    // Split into regular channels vs DM/group threads
    const publicChannels = rawChannels.filter(c => !['dm','group'].includes(c.channel_type))
    const dmChannels     = rawChannels.filter(c => ['dm','group'].includes(c.channel_type))

    set({
      channels:       publicChannels.map(_mapChannel),
      directMessages: dmChannels.map(c => _mapDMChannel(c, currentUserId)),
      messagesByThread: {},
    })
  },

  // ── Channel CUD ────────────────────────────────────────────────────────
  createChannel: async ({ name, description, type, members, createdBy, orgId, allOrgMemberIds = [] }) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const memberIds = type === 'public' ? allOrgMemberIds : (members || [])

    if (isSupabaseConfigured()) {
      const ch = await saveChannelRecord({ orgId, name: slug, description: description || '', channelType: type || 'public', createdBy, memberIds })
      if (!ch) return null
      const mapped = _mapChannel(ch)
      set((s) => ({ channels: [...s.channels, mapped] }))
      return ch.id
    }
    // Offline fallback
    const id = `ch-${Date.now()}`
    const channel = { id, name: slug, description: description || '', type: type || 'public', members: type === 'public' ? ['all'] : memberIds, created_by: createdBy, created_at: new Date().toISOString(), org_id: orgId }
    set((s) => ({ channels: [...s.channels, channel] }))
    return id
  },

  updateChannel: async (channelId, updates) => {
    set((s) => ({ channels: s.channels.map((ch) => ch.id === channelId ? { ...ch, ...updates } : ch) }))
    if (isSupabaseConfigured()) await updateChannelRecord(channelId, updates)
  },

  deleteChannel: async (channelId) => {
    set((s) => {
      const { [channelId]: _, ...rest } = s.messagesByThread
      return { channels: s.channels.filter((ch) => ch.id !== channelId), messagesByThread: rest }
    })
    if (isSupabaseConfigured()) await sbArchiveChannel(channelId)
  },

  // ── Messages ──────────────────────────────────────────────────────────
  // Load messages for a thread on first open; wire realtime subscription
  loadMessages: async (threadId) => {
    const { _fetchedThreads, _isDemo, _realtimeSubs } = get()
    if (_fetchedThreads.has(threadId)) return
    // In demo mode, messages are pre-seeded — never hit Supabase
    if (_isDemo) {
      set((s) => ({ _fetchedThreads: new Set([...s._fetchedThreads, threadId]) }))
      return
    }

    if (isSupabaseConfigured()) {
      const rows = await sbFetchMessages(threadId)
      const msgs = rows.map(_mapMessage)
      set((s) => ({
        messagesByThread: { ...s.messagesByThread, [threadId]: msgs },
        _fetchedThreads: new Set([...s._fetchedThreads, threadId]),
      }))

      // Unsubscribe from any previous subscription for this thread
      if (_realtimeSubs[threadId]) _realtimeSubs[threadId]()

      const unsub = sbSubscribeToChannel(threadId, {
        onInsert: (row) => {
          // Ignore if we already have it (optimistic temp was replaced)
          set((s) => {
            const existing = (s.messagesByThread[threadId] || []).find(m => m.id === row.id)
            if (existing) return {}
            // Fetch full message with sender profile by re-fetching only this row
            sbFetchMessages(threadId, 1).then(latest => {
              const latestRow = latest.find(r => r.id === row.id)
              if (!latestRow) return
              set((s2) => ({
                messagesByThread: {
                  ...s2.messagesByThread,
                  [threadId]: [...(s2.messagesByThread[threadId] || []).filter(m => m.id !== row.id), _mapMessage(latestRow)],
                },
              }))
            })
            return {}
          })
        },
        onUpdate: (row) => {
          set((s) => ({
            messagesByThread: {
              ...s.messagesByThread,
              [threadId]: (s.messagesByThread[threadId] || []).map(m =>
                m.id === row.id
                  ? { ...m, content: row.content, edited: !!row.edited_at, is_pinned: row.is_pinned }
                  : m
              ),
            },
          }))
        },
        onDelete: (row) => {
          set((s) => ({
            messagesByThread: {
              ...s.messagesByThread,
              [threadId]: (s.messagesByThread[threadId] || []).filter(m => m.id !== row.id),
            },
          }))
        },
      })
      set((s) => ({ _realtimeSubs: { ...s._realtimeSubs, [threadId]: unsub } }))
    }
  },

  sendMessage: async (threadId, { senderId, senderName, senderRole, content, type = 'text', mediaUrl = null, gifUrl = null, formatting = null }) => {
    // Optimistic local insert
    const tempId = `msg-tmp-${Date.now()}`
    const optimistic = {
      id: tempId, thread_id: threadId,
      sender: { id: senderId, name: senderName, role: senderRole },
      content, type, mediaUrl, gifUrl, formatting,
      timestamp: new Date().toISOString(), reactions: [], edited: false, is_pinned: false,
    }
    set((s) => ({
      messagesByThread: { ...s.messagesByThread, [threadId]: [...(s.messagesByThread[threadId] || []), optimistic] },
    }))

    if (isSupabaseConfigured()) {
      const saved = await saveMessageRecord({ channelId: threadId, senderId, content, messageType: type, mediaUrl, gifUrl, formatting })
      if (saved) {
        // Replace temp with real row
        const real = _mapMessage(saved)
        set((s) => ({
          messagesByThread: {
            ...s.messagesByThread,
            [threadId]: (s.messagesByThread[threadId] || []).map(m => m.id === tempId ? real : m),
          },
        }))
      }
    }

    // Update last_message on DM thread
    set((s) => ({
      directMessages: s.directMessages.map(dm =>
        dm.id === threadId ? { ...dm, last_message: content, last_at: new Date().toISOString() } : dm
      ),
    }))
  },

  editMessage: async (threadId, msgId, newContent) => {
    set((s) => ({
      messagesByThread: {
        ...s.messagesByThread,
        [threadId]: (s.messagesByThread[threadId] || []).map((m) =>
          m.id === msgId ? { ...m, content: newContent, edited: true } : m
        ),
      },
    }))
    if (isSupabaseConfigured()) await updateMessageRecord(msgId, newContent)
  },

  deleteMessage: async (threadId, msgId) => {
    set((s) => ({
      messagesByThread: {
        ...s.messagesByThread,
        [threadId]: (s.messagesByThread[threadId] || []).filter((m) => m.id !== msgId),
      },
    }))
    if (isSupabaseConfigured()) await sbDeleteMessage(msgId)
  },

  reactToMessage: async (threadId, msgId, emoji, userId) => {
    // Optimistic update
    set((s) => ({
      messagesByThread: {
        ...s.messagesByThread,
        [threadId]: (s.messagesByThread[threadId] || []).map((m) => {
          if (m.id !== msgId) return m
          const existing = m.reactions.find((r) => r.emoji === emoji)
          if (existing) {
            const userReacted = existing.reactors?.includes(userId)
            if (userReacted) {
              const newCount = existing.count - 1
              if (newCount <= 0) return { ...m, reactions: m.reactions.filter((r) => r.emoji !== emoji) }
              return { ...m, reactions: m.reactions.map((r) => r.emoji === emoji ? { ...r, count: newCount, reactors: r.reactors.filter((id) => id !== userId) } : r) }
            }
            return { ...m, reactions: m.reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, reactors: [...(r.reactors || []), userId] } : r) }
          }
          return { ...m, reactions: [...m.reactions, { emoji, count: 1, reactors: [userId] }] }
        }),
      },
    }))
    if (isSupabaseConfigured()) await sbToggleReaction(msgId, userId, emoji)
  },

  // ── Pin messages ──────────────────────────────────────────────────────────
  pinMessage: async (threadId, msgId) => {
    const { messagesByThread } = get()
    const msg = (messagesByThread[threadId] || []).find(m => m.id === msgId)
    if (!msg) return
    const wasPinned = !!msg.is_pinned
    // Optimistic update
    set((s) => ({
      messagesByThread: {
        ...s.messagesByThread,
        [threadId]: (s.messagesByThread[threadId] || []).map(m =>
          m.id === msgId ? { ...m, is_pinned: !wasPinned } : m
        ),
      },
    }))
    if (isSupabaseConfigured()) {
      const result = await sbTogglePinMessage(msgId, wasPinned)
      // If the DB call clearly returned false (error), revert
      if (result === false) {
        set((s) => ({
          messagesByThread: {
            ...s.messagesByThread,
            [threadId]: (s.messagesByThread[threadId] || []).map(m =>
              m.id === msgId ? { ...m, is_pinned: wasPinned } : m
            ),
          },
        }))
      }
    }
  },

  // ── File upload ───────────────────────────────────────────────────────────
  uploadFile: async (file, orgId, userId) => {
    if (isSupabaseConfigured()) {
      const url = await sbUploadMessageFile(file, orgId, userId)
      if (url) return url
    }
    // Offline fallback: ephemeral blob URL
    return URL.createObjectURL(file)
  },

  // ── Direct Messages ────────────────────────────────────────────────────
  openDM: async (currentUserId, targetUserId, targetName, targetRole, orgId) => {
    const existing = get().directMessages.find((dm) =>
      dm.type !== 'group' &&
      dm.participants.includes(currentUserId) && dm.participants.includes(targetUserId)
    )
    if (existing) return existing.id

    if (isSupabaseConfigured() && orgId) {
      const ch = await sbFindOrCreateDM(orgId, currentUserId, targetUserId)
      if (ch) {
        const mapped = _mapDMChannel(ch, currentUserId, targetName, targetRole)
        set((s) => ({ directMessages: [...s.directMessages, mapped] }))
        return ch.id
      }
    }

    // Offline fallback
    const id = `dm-${Date.now()}`
    set((s) => ({
      directMessages: [...s.directMessages, {
        id, type: 'dm',
        participants: [currentUserId, targetUserId],
        display_name: targetName, display_role: targetRole,
        last_message: '', last_at: new Date().toISOString(), unread: {},
      }],
    }))
    return id
  },

  openGroupMessage: async (currentUserId, participantIds, groupName, orgId) => {
    const allIds = [...new Set([currentUserId, ...participantIds])]

    if (isSupabaseConfigured() && orgId) {
      const ch = await sbFindOrCreateGroup(orgId, currentUserId, participantIds, groupName)
      if (ch) {
        const mapped = _mapDMChannel(ch, currentUserId, groupName, null)
        set((s) => ({ directMessages: [...s.directMessages, mapped] }))
        return ch.id
      }
    }

    const id = `gm-${Date.now()}`
    set((s) => ({
      directMessages: [...s.directMessages, {
        id, type: 'group', participants: allIds,
        display_name: groupName, display_role: null,
        last_message: '', last_at: new Date().toISOString(), unread: {},
      }],
    }))
    return id
  },

  markRead: (threadId, userId) => {
    set((s) => ({
      directMessages: s.directMessages.map((dm) =>
        dm.id === threadId ? { ...dm, unread: { ...dm.unread, [userId]: 0 } } : dm
      ),
      channels: s.channels.map((ch) =>
        ch.id === threadId ? { ...ch, unread: 0 } : ch
      ),
    }))
    if (isSupabaseConfigured()) sbMarkChannelRead(threadId, userId)
  },
}))

// ── Private mapping helpers ────────────────────────────────────────────────
function _mapChannel(ch) {
  return {
    id:          ch.id,
    name:        ch.name,
    description: ch.description || '',
    type:        ch.channel_type || ch.type || 'public',
    members:     (ch.channel_members || []).map(m => m.user_id),
    created_by:  ch.created_by,
    created_at:  ch.created_at,
    org_id:      ch.org_id,
  }
}

function _mapDMChannel(ch, currentUserId, displayNameFallback = null, displayRoleFallback = null) {
  const otherMembers = (ch.channel_members || []).filter(m => m.user_id !== currentUserId)
  return {
    id:           ch.id,
    type:         ch.channel_type === 'group' ? 'group' : 'dm',
    participants: (ch.channel_members || []).map(m => m.user_id),
    display_name: displayNameFallback || ch.description || ch.name,
    display_role: displayRoleFallback || null,
    last_message: '',
    last_at:      ch.created_at,
    unread:       {},
  }
}

function _mapMessage(row) {
  return {
    id:         row.id,
    thread_id:  row.channel_id,
    sender: {
      id:   row.sender?.id   || row.sender_id,
      name: row.sender?.display_name || row.sender?.full_name || row.sender?.name || 'Unknown',
      role: row.sender?.role || 'athlete',
    },
    content:    row.content,
    type:       row.message_type || row.type || 'text',
    mediaUrl:   row.media_url  || row.mediaUrl  || null,
    gifUrl:     row.gif_url    || row.gifUrl    || null,
    formatting: row.formatting || null,
    timestamp:  row.created_at || row.timestamp,
    edited:     !!row.edited_at,
    is_pinned:  !!row.is_pinned,
    reactions:  _mapReactions(row.reactions || []),
  }
}

function _mapReactions(rows) {
  // Group by emoji: [{ emoji, count, reactors: [userId] }]
  const map = {}
  for (const r of rows) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, reactors: [] }
    map[r.emoji].count++
    map[r.emoji].reactors.push(r.user_id)
  }
  return Object.values(map)
}

// ── Roster Store ─────────────────────────────────────────────────────────────
// Holds live athlete roster + review queue for the active org.
// Demo mode reads directly from MOCK_ATHLETES in RosterPage — this store is
// only populated for real (non-demo) org sessions.
export const useRosterStore = create((set) => ({
  athletes:    [],
  reviewQueue: [],
  loading:     false,
  error:       null,

  loadRoster: async (orgId) => {
    set({ loading: true, error: null })
    const [athletes, reviewQueue] = await Promise.all([
      fetchOrgAthletes(orgId),
      fetchOrgReviewQueue(orgId),
    ])
    set({ athletes, reviewQueue, loading: false })
  },

  setAthletes:    (athletes) => set({ athletes }),
  setReviewQueue: (queue)    => set({ reviewQueue: queue }),

  updateAthlete: (athleteId, updates) =>
    set((s) => ({
      athletes: s.athletes.map((a) => a.id === athleteId ? { ...a, ...updates } : a),
    })),
}))

// ── Programming Store ─────────────────────────────────────────────────────────
// Holds program templates and the exercise library for the active org.
// Demo mode seeds from MOCK_EXERCISES / SAMPLE_TEMPLATES in ProgrammingPage.
// Real users load from Supabase on mount.

const DEMO_TEMPLATES = [
  { id: 't1', name: '12-Week Meet Prep – Squat Focus', weeks: 12, style: 'hybrid', programming_style: 'hybrid', block_type: 'accumulation', athletes: 3 },
  { id: 't2', name: '8-Week Bench Specialization',     weeks: 8,  style: 'rpe',    programming_style: 'rpe',    block_type: 'intensification', athletes: 1 },
  { id: 't3', name: 'Off-Season Volume Block',         weeks: 10, style: 'percentage', programming_style: 'percentage', block_type: 'accumulation', athletes: 4 },
  { id: 't4', name: '4-Week Peaking Program',          weeks: 4,  style: 'hybrid', programming_style: 'hybrid', block_type: 'peak', athletes: 6 },
]

export const useProgrammingStore = create((set, get) => ({
  templates:  [],
  exercises:  [],
  loading:    false,
  error:      null,

  // Load all data for the given org (called on mount for real users)
  loadProgramming: async (orgId) => {
    set({ loading: true, error: null })
    const [templates, exercises] = await Promise.all([
      fetchProgramTemplates(orgId),
      fetchExercises(orgId),
    ])
    set({ templates, exercises, loading: false })
  },

  // ── Templates ──────────────────────────────────────────────────────────────
  addTemplate: (t) => set((s) => ({ templates: [t, ...s.templates] })),

  updateTemplate: (id, updates) =>
    set((s) => ({
      templates: s.templates.map((t) => t.id === id ? { ...t, ...updates } : t),
    })),

  removeTemplate: (id) =>
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),

  // ── Exercises ──────────────────────────────────────────────────────────────
  addExercise: (ex) => set((s) => ({ exercises: [...s.exercises, ex] })),

  updateExercise: (id, updates) =>
    set((s) => ({
      exercises: s.exercises.map((e) => e.id === id ? { ...e, ...updates } : e),
    })),

  removeExercise: (id) =>
    set((s) => ({ exercises: s.exercises.filter((e) => e.id !== id) })),

  getDemoTemplates: () => DEMO_TEMPLATES,
  getDemoExercises: () => MOCK_EXERCISES,
}))

// ─── Analytics Store ──────────────────────────────────────────────────────────
// Read-only aggregation over workout_sessions, workout_sets, check_ins,
// nutrition_logs, injuries — no writes, just computed views.

/** Epley formula: weight * (1 + reps/30) */
function calcE1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  return Math.round(weight * (1 + reps / 30))
}

/** ISO week label like "W23" for grouping */
function isoWeek(dateStr) {
  const d = new Date(dateStr)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const startOfWeek = new Date(jan4)
  startOfWeek.setDate(jan4.getDate() - jan4.getDay() + 1)
  const weekNum = Math.ceil(((d - startOfWeek) / 86400000 + 1) / 7)
  return `W${weekNum}`
}

/** Returns "Mon Jan 13" style short label from a date string */
function shortDateLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Groups dates into N-week buckets, returns label for the bucket */
function weekBucket(dateStr, buckets = 8) {
  const d = new Date(dateStr)
  const now = new Date()
  const daysAgo = Math.floor((now - d) / 86400000)
  const bucket = buckets - 1 - Math.floor(daysAgo / 7)
  return bucket < 0 ? null : `W-${buckets - 1 - bucket}`
}

export const useAnalyticsStore = create((set, get) => ({
  // ── Personal analytics (athlete-scoped) ─────────────────────────────────
  personal: null,          // computed object — see loadPersonalAnalytics
  personalLoading: false,
  personalFor: null,       // userId this data belongs to

  // ── Team analytics (org-scoped) ──────────────────────────────────────────
  team: null,              // computed object — see loadTeamAnalytics
  teamLoading: false,
  teamFor: null,           // orgId this data belongs to

  // ── Load personal analytics for the current athlete ──────────────────────
  loadPersonalAnalytics: async (userId, orgId) => {
    if (!isSupabaseConfigured() || !userId) return
    // Don't re-load if already loaded for this user
    if (get().personalFor === userId && get().personal) return
    set({ personalLoading: true })

    const [sessions, sets, checkIns, injuries, nutLogs] = await Promise.all([
      fetchAthleteSessions(userId, 180),
      fetchAthleteWorkoutSets(userId, 180),
      fetchAthleteCheckIns(userId, 180),
      fetchAthleteInjuries(userId),
      fetchNutritionLogs(userId, 90),
    ])

    // ── Adherence: completed / total scheduled per week (8 buckets) ─────
    const bucketMap = {}
    for (const s of sessions) {
      const b = weekBucket(s.scheduled_date, 8)
      if (!b) continue
      if (!bucketMap[b]) bucketMap[b] = { week: b, scheduled: 0, completed: 0, rpe: [], nutrition: 0, nutCount: 0 }
      bucketMap[b].scheduled++
      if (s.status === 'completed') bucketMap[b].completed++
      if (s.overall_rpe) bucketMap[b].rpe.push(s.overall_rpe)
    }
    for (const nl of nutLogs) {
      const b = weekBucket(nl.log_date, 8)
      if (!b) continue
      if (!bucketMap[b]) bucketMap[b] = { week: b, scheduled: 0, completed: 0, rpe: [], nutrition: 0, nutCount: 0 }
      if (nl.compliance_score != null) { bucketMap[b].nutrition += nl.compliance_score; bucketMap[b].nutCount++ }
    }
    const adherenceTrend = Object.values(bucketMap).sort((a, b) => a.week.localeCompare(b.week)).map(b => ({
      week: b.week,
      adherence: b.scheduled > 0 ? Math.round((b.completed / b.scheduled) * 100) : null,
      nutrition: b.nutCount > 0 ? Math.round(b.nutrition / b.nutCount) : null,
      rpe: b.rpe.length > 0 ? parseFloat((b.rpe.reduce((s, v) => s + v, 0) / b.rpe.length).toFixed(1)) : null,
    }))

    // ── e1RM trend: group best e1RM per comp lift by month ───────────────
    const liftKeys = { squat: [], bench: [], deadlift: [] }
    const SQUAT_WORDS = ['squat']
    const BENCH_WORDS = ['bench', 'press']
    const DEAD_WORDS  = ['deadlift', 'dead lift']
    for (const s of sets) {
      if (!s.performed_weight || !s.performed_reps || !s.scheduled_date) continue
      const nm = (s.exercise_name || '').toLowerCase()
      const e1rm = calcE1RM(s.performed_weight, s.performed_reps)
      const monthKey = s.scheduled_date.slice(0, 7) // "2025-03"
      const label = new Date(s.scheduled_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      if (SQUAT_WORDS.some(w => nm.includes(w))) liftKeys.squat.push({ month: monthKey, label, e1rm })
      else if (BENCH_WORDS.some(w => nm.includes(w))) liftKeys.bench.push({ month: monthKey, label, e1rm })
      else if (DEAD_WORDS.some(w => nm.includes(w))) liftKeys.deadlift.push({ month: monthKey, label, e1rm })
    }
    // Best per month per lift
    const bestPerMonth = (arr) => {
      const map = {}
      for (const r of arr) {
        if (!map[r.month] || r.e1rm > map[r.month].e1rm) map[r.month] = r
      }
      return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
    }
    const sqB = bestPerMonth(liftKeys.squat)
    const bnB = bestPerMonth(liftKeys.bench)
    const dlB = bestPerMonth(liftKeys.deadlift)
    // Merge into unified date axis
    const allMonths = [...new Set([...sqB, ...bnB, ...dlB].map(r => r.month))].sort()
    const strengthTrend = allMonths.map(m => ({
      date: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      squat:    sqB.find(r => r.month === m)?.e1rm ?? null,
      bench:    bnB.find(r => r.month === m)?.e1rm ?? null,
      deadlift: dlB.find(r => r.month === m)?.e1rm ?? null,
    }))

    // ── PR log: best top set per comp lift (is_pr or highest e1RM) ───────
    const prMap = {}
    for (const s of sets) {
      if (!s.performed_weight || !s.performed_reps) continue
      const nm = (s.exercise_name || '').toLowerCase()
      let lift = null
      if (SQUAT_WORDS.some(w => nm.includes(w))) lift = 'Squat'
      else if (BENCH_WORDS.some(w => nm.includes(w))) lift = 'Bench'
      else if (DEAD_WORDS.some(w => nm.includes(w))) lift = 'Deadlift'
      if (!lift) continue
      const e1rm = calcE1RM(s.performed_weight, s.performed_reps)
      if (!prMap[lift] || e1rm > prMap[lift].e1rm) {
        prMap[lift] = { lift, weight: s.performed_weight, reps: s.performed_reps, e1rm, date: s.scheduled_date }
      }
    }
    const prRows = ['Squat', 'Bench', 'Deadlift'].filter(l => prMap[l]).map(l => ({
      lift: l, weight: prMap[l].weight, reps: prMap[l].reps,
      e1rm: prMap[l].e1rm, date: shortDateLabel(prMap[l].date),
    }))

    // ── Bodyweight trend (last 12 weeks) ─────────────────────────────────
    const bwTrend = checkIns.filter(c => c.bodyweight > 0)
      .slice(0, 24)
      .reverse()
      .map(c => ({ date: shortDateLabel(c.check_date), bw: parseFloat(c.bodyweight.toFixed(1)) }))

    // ── Sleep trend weekly avg ────────────────────────────────────────────
    const sleepBuckets = {}
    for (const c of checkIns) {
      if (!c.sleep_hours) continue
      const b = weekBucket(c.check_date, 8)
      if (!b) continue
      if (!sleepBuckets[b]) sleepBuckets[b] = { week: b, sleep: [], stress: [], soreness: [], motivation: [] }
      sleepBuckets[b].sleep.push(c.sleep_hours)
      if (c.stress_level) sleepBuckets[b].stress.push(c.stress_level)
      if (c.soreness_level) sleepBuckets[b].soreness.push(c.soreness_level)
      if (c.motivation_level) sleepBuckets[b].motivation.push(c.motivation_level)
    }
    const wellnessTrend = Object.values(sleepBuckets).sort((a, b) => a.week.localeCompare(b.week)).map(b => {
      const avg = arr => arr.length ? parseFloat((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1)) : null
      return { week: b.week, sleep: avg(b.sleep), stress: avg(b.stress), soreness: avg(b.soreness), motivation: avg(b.motivation) }
    })

    // ── Volume trend: total kg moved per week ────────────────────────────
    const volBuckets = {}
    for (const s of sets) {
      if (!s.performed_weight || !s.performed_reps || !s.scheduled_date) continue
      const b = weekBucket(s.scheduled_date, 8)
      if (!b) continue
      if (!volBuckets[b]) volBuckets[b] = { week: b, volume: 0 }
      volBuckets[b].volume += s.performed_weight * s.performed_reps
    }
    const volumeTrend = Object.values(volBuckets).sort((a, b) => a.week.localeCompare(b.week)).map(b => ({
      week: b.week, volume: Math.round(b.volume),
    }))

    // ── Radar: normalize 0-100 each axis ─────────────────────────────────
    const recentSessions = sessions.slice(0, 28)
    const completedRecent = recentSessions.filter(s => s.status === 'completed').length
    const adherenceScore = recentSessions.length ? Math.round((completedRecent / recentSessions.length) * 100) : 0
    const latestCheckIns = checkIns.slice(0, 14)
    const avgSleep = latestCheckIns.filter(c => c.sleep_hours).length
      ? latestCheckIns.filter(c => c.sleep_hours).reduce((s, c) => s + c.sleep_hours, 0) / latestCheckIns.filter(c => c.sleep_hours).length
      : 0
    const sleepScore = Math.min(100, Math.round((avgSleep / 9) * 100))
    const latestNut = nutLogs.slice(0, 14)
    const nutScore = latestNut.filter(n => n.compliance_score).length
      ? Math.round(latestNut.filter(n => n.compliance_score).reduce((s, n) => s + n.compliance_score, 0) / latestNut.filter(n => n.compliance_score).length)
      : 0
    const toScore = (e1rm, baseline) => e1rm > 0 ? Math.min(100, Math.round((e1rm / baseline) * 100)) : 0
    const radarData = [
      { subject: 'Squat',      A: toScore(prMap['Squat']?.e1rm ?? 0, 200) },
      { subject: 'Bench',      A: toScore(prMap['Bench']?.e1rm ?? 0, 140) },
      { subject: 'Deadlift',   A: toScore(prMap['Deadlift']?.e1rm ?? 0, 250) },
      { subject: 'Nutrition',  A: nutScore },
      { subject: 'Sleep',      A: sleepScore },
      { subject: 'Adherence',  A: adherenceScore },
    ]

    // ── Summary stats ─────────────────────────────────────────────────────
    const totalCompleted = sessions.filter(s => s.status === 'completed').length
    const recentRPE = sessions.filter(s => s.overall_rpe).slice(0, 14)
    const avgRPE = recentRPE.length ? parseFloat((recentRPE.reduce((s, w) => s + w.overall_rpe, 0) / recentRPE.length).toFixed(1)) : null
    const avgSleepDisplay = avgSleep > 0 ? avgSleep.toFixed(1) + 'h' : null
    const activeInjuries = injuries.filter(i => i.status === 'active').length

    set({
      personal: {
        strengthTrend,
        adherenceTrend,
        volumeTrend,
        bwTrend,
        wellnessTrend,
        radarData,
        prRows,
        totalCompleted,
        adherenceScore,
        avgSleep: avgSleepDisplay,
        avgRPE,
        nutScore,
        activeInjuries,
        injuryHistory: injuries,
      },
      personalLoading: false,
      personalFor: userId,
    })
  },

  // ── Load team analytics for a coach/admin ────────────────────────────────
  loadTeamAnalytics: async (orgId) => {
    if (!isSupabaseConfigured() || !orgId) return
    if (get().teamFor === orgId && get().team) return
    set({ teamLoading: true })

    const [athletes, sessions, sets, checkIns, injuries, nutLogs, staff] = await Promise.all([
      fetchOrgAthletes(orgId),
      fetchOrgWorkoutSessions(orgId, 90),
      fetchOrgWorkoutSets(orgId, 90),
      fetchOrgCheckIns(orgId, 30),
      fetchOrgInjuries(orgId),
      fetchOrgNutritionLogs(orgId, 30),
      fetchOrgStaffMembers(orgId),
    ])

    // ── Per-athlete adherence (last 4 weeks) ─────────────────────────────
    const per4wk = {}
    for (const s of sessions) {
      if (!per4wk[s.athlete_id]) per4wk[s.athlete_id] = { scheduled: 0, completed: 0 }
      per4wk[s.athlete_id].scheduled++
      if (s.status === 'completed') per4wk[s.athlete_id].completed++
    }
    const teamAdherence = athletes.map(a => ({
      athlete: (a.display_name || a.full_name || '').split(' ')[0],
      full_name: a.display_name || a.full_name || '',
      adherence: per4wk[a.id]?.scheduled > 0
        ? Math.round((per4wk[a.id].completed / per4wk[a.id].scheduled) * 100)
        : (a.adherence || 0),
    })).sort((a, b) => a.adherence - b.adherence)

    // ── Team volume trend (weekly, last 8 weeks) ──────────────────────────
    const teamVolBuckets = {}
    for (const s of sets) {
      if (!s.performed_weight || !s.performed_reps || !s.scheduled_date) continue
      const b = weekBucket(s.scheduled_date, 8)
      if (!b) continue
      if (!teamVolBuckets[b]) teamVolBuckets[b] = { week: b, volume: 0, prs: 0 }
      teamVolBuckets[b].volume += s.performed_weight * s.performed_reps
      if (s.is_pr) teamVolBuckets[b].prs++
    }
    const teamVolumeTrend = Object.values(teamVolBuckets).sort((a, b) => a.week.localeCompare(b.week)).map(b => ({
      week: b.week, volume: Math.round(b.volume / 1000), prs: b.prs, // volume in tonnes
    }))

    // ── Team wellness (avg per day over last 30 days) ─────────────────────
    const wellMap = {}
    for (const c of checkIns) {
      const d = c.check_date
      if (!wellMap[d]) wellMap[d] = { date: shortDateLabel(d), sleep: [], stress: [], soreness: [] }
      if (c.sleep_hours) wellMap[d].sleep.push(c.sleep_hours)
      if (c.stress_level) wellMap[d].stress.push(c.stress_level)
      if (c.soreness_level) wellMap[d].soreness.push(c.soreness_level)
    }
    const teamWellnessTrend = Object.entries(wellMap).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([, v]) => {
      const avg = arr => arr.length ? parseFloat((arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(1)) : null
      return { date: v.date, sleep: avg(v.sleep), stress: avg(v.stress), soreness: avg(v.soreness) }
    })

    // ── Injury breakdown by body part ─────────────────────────────────────
    const injuryMap = {}
    for (const i of injuries) {
      const part = i.body_part || 'Unknown'
      if (!injuryMap[part]) injuryMap[part] = { part, active: 0, resolved: 0 }
      if (i.status === 'active') injuryMap[part].active++
      else injuryMap[part].resolved++
    }
    const injuryByPart = Object.values(injuryMap).sort((a, b) => b.active - a.active)

    // ── Flagged athletes ─────────────────────────────────────────────────
    const flagged = athletes.filter(a => (a.flags?.length > 0) || (per4wk[a.id]?.scheduled > 0 && (per4wk[a.id].completed / per4wk[a.id].scheduled) < 0.6))
      .map(a => ({
        ...a,
        computed_adherence: per4wk[a.id]?.scheduled > 0
          ? Math.round((per4wk[a.id].completed / per4wk[a.id].scheduled) * 100)
          : (a.adherence || 0),
      }))

    // ── Nutrition compliance per athlete ─────────────────────────────────
    const nutByAthlete = {}
    for (const nl of nutLogs) {
      if (!nutByAthlete[nl.athlete_id]) nutByAthlete[nl.athlete_id] = { scores: [], cals: [] }
      if (nl.compliance_score != null) nutByAthlete[nl.athlete_id].scores.push(nl.compliance_score)
      if (nl.calories_actual) nutByAthlete[nl.athlete_id].cals.push(nl.calories_actual)
    }
    const avgTeamNut = Object.values(nutByAthlete).flatMap(n => n.scores)
    const teamNutScore = avgTeamNut.length ? Math.round(avgTeamNut.reduce((s, v) => s + v, 0) / avgTeamNut.length) : null

    // ── Staff analytics: per-coach athlete assignments + adherence ────────
    const staffRows = staff.map(s => {
      // Rough: count athletes whose adherence we can see (all org athletes for now)
      return {
        user_id:     s.user_id,
        name:        s.display_name || s.full_name,
        org_role:    s.org_role,
        avatar_url:  s.avatar_url,
        athletes:    athletes.length, // real per-coach would need staff_assignments join
        adherence:   teamAdherence.length ? Math.round(teamAdherence.reduce((s, a) => s + a.adherence, 0) / teamAdherence.length) : 0,
        activeInjuries: injuries.filter(i => i.status === 'active').length,
        joined_at:   s.joined_at,
      }
    })

    // ── Summary stats ─────────────────────────────────────────────────────
    const avgTeamAdherence = teamAdherence.length
      ? Math.round(teamAdherence.reduce((s, a) => s + a.adherence, 0) / teamAdherence.length)
      : null
    const activeInjuries = injuries.filter(i => i.status === 'active').length

    set({
      team: {
        athletes,
        teamAdherence,
        teamVolumeTrend,
        teamWellnessTrend,
        injuryByPart,
        flagged,
        staffRows,
        avgTeamAdherence,
        activeInjuries,
        teamNutScore,
        totalSessions: sessions.length,
        totalPRs: sets.filter(s => s.is_pr).length,
      },
      teamLoading: false,
      teamFor: orgId,
    })
  },

  // Force reload (use when org changes or user wants fresh data)
  invalidatePersonal: () => set({ personal: null, personalFor: null }),
  invalidateTeam: () => set({ team: null, teamFor: null }),

  reset: () => set({
    personal: null, personalLoading: false, personalFor: null,
    team: null, teamLoading: false, teamFor: null,
  }),
}))

// Helper re-exported so AnalyticsPage can import without re-defining
export { calcE1RM }
