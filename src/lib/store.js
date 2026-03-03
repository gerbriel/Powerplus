import { create } from 'zustand'
import { MOCK_USERS, MOCK_GOALS, MOCK_TRAINING_BLOCKS, MOCK_MEETS, MOCK_ORGS, MOCK_ORG_MEMBERS, MOCK_STAFF_ASSIGNMENTS, MOCK_ATHLETE_RECIPES, MOCK_ATHLETE_PREP_LOG, MOCK_ATHLETE_SHOPPING_LISTS, MOCK_ATHLETE_MEAL_PLANS } from './mockData'
import { upsertProfile, isSupabaseConfigured, onAuthStateChange, fetchProfile, fetchOrgMemberships, signOut as supabaseSignOut, getSession } from './supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  // All org memberships for the current user: [{ id, org_id, org_role, is_self_athlete, nutrition_permissions }]
  orgMemberships: [],
  // Currently active org context (user can switch orgs)
  activeOrgId: null,
  isLoading: false,

  // Demo login — sets role without hitting Supabase Auth.
  // If Supabase is configured, upserts the mock profile row so the UUID
  // exists in the profiles table for subsequent DB writes.
  loginAsDemo: async (role) => {
    const baseProfile = MOCK_USERS[role] || MOCK_USERS.athlete
    const profile = { ...baseProfile, role: role === 'super_admin' ? 'super_admin' : role }
    const memberships = MOCK_ORG_MEMBERS.filter((m) => m.user_id === profile.id)
    const activeOrgId = memberships[0]?.org_id ?? null
    set({
      user: { id: profile.id, email: profile.email },
      profile,
      orgMemberships: memberships,
      activeOrgId,
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

  logout: () => set({ user: null, profile: null, orgMemberships: [], activeOrgId: null }),

  // ── Real auth ────────────────────────────────────────────────────────────

  /**
   * Called with a live Supabase session (from onAuthStateChange or callback page).
   * Fetches the profile + org memberships from the DB and hydrates the store.
   */
  handleAuthSession: async (session) => {
    if (!session?.user) {
      set({ user: null, profile: null, orgMemberships: [], activeOrgId: null })
      return
    }
    set({ isLoading: true })
    const [profile, memberships] = await Promise.all([
      fetchProfile(session.user.id),
      fetchOrgMemberships(session.user.id),
    ])
    const activeOrgId = memberships[0]?.org_id ?? null
    set({
      user: session.user,
      profile: profile ?? {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name ?? '',
        display_name: session.user.user_metadata?.display_name ?? session.user.email,
        platform_role: 'user',
      },
      orgMemberships: memberships,
      activeOrgId,
      isLoading: false,
      viewAsAthlete: false,
    })
  },

  /**
   * Subscribe to Supabase auth state. Call once on app mount.
   * Returns the unsubscribe function.
   */
  initAuth: () => {
    if (!isSupabaseConfigured()) return () => {}
    // Check existing session immediately
    const { handleAuthSession } = get()
    getSession().then((session) => {
      if (session) handleAuthSession(session)
    })
    // Listen for future changes (login, logout, token refresh)
    const subscription = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        get().handleAuthSession(session)
      }
      if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null, orgMemberships: [], activeOrgId: null })
      }
    })
    return () => subscription.unsubscribe()
  },

  /**
   * Sign out the real Supabase user (or just clear store for demo users).
   */
  handleSignOut: async () => {
    if (isSupabaseConfigured()) await supabaseSignOut()
    set({ user: null, profile: null, orgMemberships: [], activeOrgId: null, viewAsAthlete: false })
    // Clear all stores back to empty (remove any demo or real user data)
    useOrgStore.setState({ orgs: [], staffAssignments: [] })
    useGoalsStore.setState({ goals: [] })
    useTrainingStore.setState({ blocks: [], meets: [] })
    useNutritionStore.setState({ athleteRecipes: {}, athletePrepLog: {}, athleteShoppingLists: {}, boardPlans: {} })
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

  linkBlockToGoal: (blockId, goalId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId && !b.linked_goal_ids.includes(goalId)
          ? { ...b, linked_goal_ids: [...b.linked_goal_ids, goalId] }
          : b
      ),
    })),

  unlinkBlockFromGoal: (blockId, goalId) =>
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.id === blockId
          ? { ...b, linked_goal_ids: b.linked_goal_ids.filter((id) => id !== goalId) }
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
// Resolves the app role key from profile + membership, so pages work even if
// profile.role wasn't set (e.g. from an older login session before the fix).
// Returns: 'super_admin' | 'admin' | 'coach' | 'nutritionist' | 'athlete'
export function resolveRole(profile, membership) {
  const r = profile?.role || membership?.org_role
  if (!r) return 'athlete'
  if (r === 'head_coach' || r === 'admin') return 'admin'
  if (r === 'super_admin') return 'super_admin'
  if (r === 'coach') return 'coach'
  if (r === 'nutritionist') return 'nutritionist'
  return 'athlete'
}

// Returns true if the resolved role is a staff role
export function isStaffRole(profile, membership) {
  const r = resolveRole(profile, membership)
  return r === 'admin' || r === 'coach' || r === 'nutritionist'
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
}))