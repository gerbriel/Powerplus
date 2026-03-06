import { create } from 'zustand'
import { MOCK_USERS, MOCK_GOALS, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_ORGS, MOCK_ORG_MEMBERS, MOCK_STAFF_ASSIGNMENTS, MOCK_ATHLETE_RECIPES, MOCK_ATHLETE_PREP_LOG, MOCK_ATHLETE_SHOPPING_LISTS, MOCK_ATHLETE_MEAL_PLANS, MOCK_CHANNELS, MOCK_MESSAGES, MOCK_DIRECT_MESSAGES, MOCK_EXERCISES } from './mockData'
import { upsertProfile, isSupabaseConfigured, onAuthStateChange, fetchProfile, fetchOrgMemberships, signOut as supabaseSignOut, getSession, fetchChannels as sbFetchChannels, createChannel as sbCreateChannel, updateChannel as sbUpdateChannel, archiveChannel as sbArchiveChannel, fetchMessages as sbFetchMessages, sendMessage as sbSendMessage, editMessage as sbEditMessage, deleteMessage as sbDeleteMessage, toggleReaction as sbToggleReaction, togglePinMessage as sbTogglePinMessage, findOrCreateDM as sbFindOrCreateDM, findOrCreateGroup as sbFindOrCreateGroup, markChannelRead as sbMarkChannelRead, subscribeToChannel as sbSubscribeToChannel, uploadMessageFile as sbUploadMessageFile, fetchOrgAthletes, fetchOrgReviewQueue, fetchExercises, fetchProgramTemplates, fetchOrgTrainingBlocks, fetchPrepLog, fetchShoppingLists, fetchOrgRecipes, fetchNutritionLogs, fetchOrgEvents, fetchUserEvents } from './supabase'
import { saveMessageRecord, updateMessageRecord, saveChannelRecord, updateChannelRecord } from './db'

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
    useGoalsStore.setState({ goals: MOCK_GOALS })
    useTrainingStore.setState({ blocks: MOCK_TRAINING_BLOCKS, meets: MOCK_MEETS })
    useNutritionStore.setState({
      athleteRecipes: JSON.parse(JSON.stringify(MOCK_ATHLETE_RECIPES)),
      athletePrepLog: JSON.parse(JSON.stringify(MOCK_ATHLETE_PREP_LOG)),
      athleteShoppingLists: JSON.parse(JSON.stringify(MOCK_ATHLETE_SHOPPING_LISTS)),
      boardPlans: JSON.parse(JSON.stringify(MOCK_ATHLETE_MEAL_PLANS)),
    })
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
    useOrgStore.setState({ orgs: [], staffAssignments: [] })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {}, orgRecipes: [], orgRecipesLoaded: false, nutritionLogs: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
  },

  // ── Real auth ────────────────────────────────────────────────────────────

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
    useOrgStore.setState({ orgs: [], staffAssignments: [] })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {}, orgRecipes: [], orgRecipesLoaded: false, nutritionLogs: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
    const [profile, memberships] = await Promise.all([
      fetchProfile(session.user.id),
      fetchOrgMemberships(session.user.id),
    ])
    const activeOrgId = memberships[0]?.org_id ?? null
    // Derive role: prefer DB profile, then user_metadata (set at signup), then infer from membership
    const membershipRole = memberships[0]?.org_role  // e.g. 'owner', 'head_coach', 'athlete'
    const metaRole = session.user.user_metadata?.role
    set({
      user: session.user,
      profile: profile ?? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name ?? '',
        display_name: session.user.user_metadata?.display_name ?? session.user.email,
        platform_role: 'user',
        role: metaRole || membershipRole || 'athlete',
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
    useOrgStore.setState({ orgs: [], staffAssignments: [] })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {} })
    useRosterStore.setState({ athletes: [], reviewQueue: [], loading: false, error: null })
    useProgrammingStore.setState({ templates: [], exercises: [], loading: false })
  },

  setProfile: (profile) => set({ profile }),

  // Switch the active org (e.g. user belongs to multiple orgs)
  setActiveOrg: (orgId) => set({ activeOrgId: orgId }),

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

  // Get a single org by id
  getOrg: (orgId) => get().orgs.find((o) => o.id === orgId),

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

  // Send an invitation
  inviteMember: (orgId, { email, org_role, message = '' }) =>
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        if (o.invitations.some((i) => i.email === email && i.status === 'pending')) return o
        const newInv = {
          id: `inv-${Date.now()}`,
          email,
          org_role,
          message,
          status: 'pending',
          sent_at: new Date().toISOString().slice(0, 10),
        }
        return { ...o, invitations: [...o.invitations, newInv] }
      }),
    })),

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

  // Cancel / revoke an invitation
  cancelInvite: (orgId, invId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : { ...o, invitations: o.invitations.filter((i) => i.id !== invId) }
      ),
    })),

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

  // Update a member's org_role
  updateMemberRole: (orgId, userId, newRole) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : {
              ...o,
              members: o.members.map((m) =>
                m.user_id === userId ? { ...m, org_role: newRole } : m
              ),
            }
      ),
    })),

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

  // Remove a member from an org
  removeMember: (orgId, userId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId
          ? o
          : { ...o, members: o.members.filter((m) => m.user_id !== userId) }
      ),
    })),

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
  updatePublicPage: (orgId, updates) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, public_page: { ...o.public_page, ...updates } }
      ),
    })),

  // Add a new content section
  addPageSection: (orgId, section) =>
    set((s) => ({
      orgs: s.orgs.map((o) => {
        if (o.id !== orgId) return o
        const sections = o.public_page?.sections || []
        return { ...o, public_page: { ...o.public_page, sections: [...sections, { id: `sec-${Date.now()}`, order: sections.length + 1, visible: true, items: [], ...section }] } }
      }),
    })),

  // Update an existing section
  updatePageSection: (orgId, sectionId, updates) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : {
          ...o,
          public_page: {
            ...o.public_page,
            sections: o.public_page.sections.map((sec) =>
              sec.id === sectionId ? { ...sec, ...updates } : sec
            ),
          },
        }
      ),
    })),

  // Delete a section
  deletePageSection: (orgId, sectionId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : {
          ...o,
          public_page: {
            ...o.public_page,
            sections: o.public_page.sections.filter((sec) => sec.id !== sectionId),
          },
        }
      ),
    })),

  // Reorder sections (accepts full new sections array)
  reorderSections: (orgId, sections) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, public_page: { ...o.public_page, sections } }
      ),
    })),

  // Update intake fields
  updateIntakeFields: (orgId, fields) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, public_page: { ...o.public_page, intake_fields: fields } }
      ),
    })),

  // ── Leads ───────────────────────────────────────────────────────────────
  // Add a new lead (from public intake form submission)
  addLead: (orgId, lead) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : {
          ...o,
          leads: [
            { id: `lead-${Date.now()}`, submitted_at: new Date().toISOString().slice(0, 10), status: 'new', notes: '', assigned_to: null, ...lead },
            ...(o.leads || []),
          ],
        }
      ),
    })),

  // Update a lead (status, notes, assigned_to)
  updateLead: (orgId, leadId, updates) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, leads: (o.leads || []).map((l) => l.id === leadId ? { ...l, ...updates } : l) }
      ),
    })),

  // Delete a lead
  deleteLead: (orgId, leadId) =>
    set((s) => ({
      orgs: s.orgs.map((o) =>
        o.id !== orgId ? o : { ...o, leads: (o.leads || []).filter((l) => l.id !== leadId) }
      ),
    })),
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
  events:  [],   // [{ id, org_id, created_by, title, description, event_type, start_time, end_time, location, meeting_url }]
  loading: false,
  loaded:  false,

  loadEvents: async (orgId, userId) => {
    if (!isSupabaseConfigured()) return
    set({ loading: true })
    const [orgEvts, userEvts] = await Promise.all([
      fetchOrgEvents(orgId),
      fetchUserEvents(userId),
    ])
    // Merge and deduplicate by id
    const combined = [...(orgEvts ?? []), ...(userEvts ?? [])]
    const seen = new Set()
    const unique = combined.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    // Sort ascending by start_time
    unique.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    set({ events: unique, loading: false, loaded: true })
  },

  addEvent: (event) => set((s) => ({ events: [...s.events, event].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)) })),

  updateEvent: (id, updates) =>
    set((s) => ({
      events: s.events.map((e) => e.id === id ? { ...e, ...updates } : e)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
    })),

  removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  reset: () => set({ events: [], loading: false, loaded: false }),
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

  // ── Init (called once on app load or org change) ───────────────────────
  initMessaging: async (isDemo, orgId, currentUserId) => {
    const existing = get()
    if (existing.channels.length > 0) return

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
      set({ channels, messagesByThread: mockMsgsByChannel, directMessages: dms })
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
    const { _fetchedThreads, messagesByThread, _realtimeSubs } = get()
    if (_fetchedThreads.has(threadId)) return

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
      name: row.sender?.display_name || row.sender?.full_name || 'Unknown',
      role: row.sender?.role || 'athlete',
    },
    content:    row.content,
    type:       row.message_type || 'text',
    mediaUrl:   row.media_url  || null,
    gifUrl:     row.gif_url    || null,
    formatting: row.formatting || null,
    timestamp:  row.created_at,
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

