# PowerPlus — Powerlifting Team OS

A full-stack SaaS platform for powerlifting organizations. PowerPlus serves two distinct user tiers: **coaching organizations** (multi-role staff + athletes) and a **platform super_admin** who manages all organizations as a SaaS business. Built with React + Vite + Supabase.

---

## Table of Contents

1. [Product Vision](#product-vision)
2. [Tech Stack](#tech-stack)
3. [Architecture Overview](#architecture-overview)
4. [Data Model](#data-model)
5. [Authentication & Session Flow](#authentication--session-flow)
6. [Roles & Permissions](#roles--permissions)
7. [State Management](#state-management)
8. [Demo Mode vs. Live Mode](#demo-mode-vs-live-mode)
9. [Pages & Features](#pages--features)
10. [Component Library](#component-library)
11. [Data Layer: supabase.js + db.js](#data-layer-supabasejs--dbjs)
12. [Navigation & Routing](#navigation--routing)
13. [Pricing & Plans](#pricing--plans)
14. [Environment Setup](#environment-setup)
15. [Running the App](#running-the-app)
16. [MVP Goals & Roadmap](#mvp-goals--roadmap)

---

## Product Vision

PowerPlus is a **team operating system** for competitive powerlifting organizations — the intersection of a coaching platform, a nutrition OS, and a meet management tool, all in one.

**Who it serves:**
- **Head Coaches / Admins** — run an entire organization: manage athletes, write programs, oversee nutrition, handle meet planning, publish a public recruitment page, and manage incoming leads.
- **Coaches** — deliver programs, track athlete progress, message athletes, review check-ins.
- **Nutritionists** — manage meal plans, prep logs, shopping lists, and dietary tracking per athlete.
- **Athletes** — log workouts, track nutrition, submit daily check-ins, monitor goals, prepare for meets.
- **Super Admin (platform operator)** — views and manages all organizations across the SaaS, tracks MRR/ARR, user counts, org status, and billing — entirely separate from any individual org.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State | Zustand v5 |
| Backend / DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Toast | react-hot-toast |
| Icons | Lucide React |
| Data fetching | TanStack Query (installed, available for expansion) |

---

## Architecture Overview

```
/
├── public/                    Static assets, 404 page
├── src/
│   ├── App.jsx                Root — BrowserRouter, route tree, auth guard
│   ├── main.jsx               Vite entry
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx    Desktop sidebar nav (role-aware)
│   │   │   ├── Topbar.jsx     Top bar (org switcher, notifications, profile)
│   │   │   └── MobileNav.jsx  Bottom tab bar for mobile
│   │   └── ui/                Shared design-system components
│   ├── pages/                 One file per page/feature area
│   └── lib/
│       ├── store.js           Zustand stores (all global state)
│       ├── supabase.js        Low-level Supabase query helpers
│       ├── db.js              Sanitized write helpers (all user input goes through here)
│       ├── mockData.js        Full demo dataset (no Supabase required)
│       └── utils.js           Pure functions: e1RM, DOTS, Wilks, unit conversion, etc.
└── supabase/
    └── schema.sql             Full Postgres schema (idempotent, safe to re-run)
```

**Single-page application pattern:** There are no real page navigations after login. `App.jsx` maps an `activePage` string (set in `useUIStore`) to a page component via `PAGE_MAP`. The Sidebar, Topbar, and MobileNav all call `setActivePage()`. React Router is only used for the public-facing routes (`/`, `/login`, `/signup`, `/demo`, `/auth/callback`, `/onboarding`, `/org/:slug`).

---

## Data Model

All tables live in Supabase Postgres. The schema is in `supabase/schema.sql` and is safe to re-run (idempotent via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`).

### Core entities

#### `profiles`
One row per user (mirrors `auth.users`). Key fields:

| Field | Purpose |
|---|---|
| `id` | UUID — FK to `auth.users.id` |
| `platform_role` | `super_admin` \| `user` — determines if this person is a platform operator |
| `role` | `head_coach` \| `coach` \| `nutritionist` \| `athlete` — their role within an org |
| `is_demo` | `boolean` — marks internal/test accounts; excluded from platform metrics |
| `pr_squat/bench/deadlift` | Numeric PRs; `pr_total` is a generated column (sum of the three) |
| `onboarding_complete` | `boolean` — gates the onboarding flow for new real users |
| `self_coach` | `boolean` — staff who also log their own workouts/nutrition as athletes |

#### `organizations`
One row per coaching organization (gym / team).

| Field | Purpose |
|---|---|
| `plan` | `starter` \| `team_pro` \| `enterprise` — determines limits & MRR |
| `status` | `active` \| `suspended` \| `pending` |
| `is_demo` | `boolean` — marks internal demo orgs; excluded from all SaaS billing/user metrics |
| `athlete_limit` / `staff_limit` / `storage_gb_limit` | Plan-gated resource caps |
| `stripe_customer_id` / `stripe_subscription_id` | Billing integration hooks (future) |
| `has_dedicated_nutritionist` | Affects which nutrition features are available org-wide |
| `athletes_can_self_manage_nutrition` | Controls whether athletes can edit their own nutrition |

#### `org_members`
Junction table — a user's membership in an organization.

| Field | Purpose |
|---|---|
| `org_role` | `owner` \| `head_coach` \| `coach` \| `nutritionist` \| `athlete` \| `analyst` |
| `is_self_athlete` | Staff who also log personal athlete data |
| `nutrition_permissions` | Array of fine-grained nutrition permissions granted to a coach |
| `status` | `active` \| `suspended` |

#### Other key tables

| Table | Purpose |
|---|---|
| `org_invitations` | Email invites with token, expiry, role |
| `org_join_requests` | Self-service join requests from users searching for orgs |
| `training_blocks` | Multi-week periodized programs assigned to athletes |
| `workout_sessions` + `workout_sets` | Individual session logs and set-by-set data |
| `daily_checkins` | Athlete wellness data (sleep, soreness, stress, body weight, pain) |
| `injury_reports` | Pain flags with body location, severity, and resolution tracking |
| `nutrition_logs` | Per-meal compliance logs with macros |
| `meal_prep_sessions` + `meal_prep_session_items` | Batch cooking logs |
| `shopping_lists` + categories + items | Weekly grocery planning |
| `meal_prep_recipes` | Org-shared and personal recipes |
| `goals` | Typed goals (strength / nutrition / meet / process) with progress history |
| `meets` | Competition records with attempts, results, and dots/wilks |
| `events` | Calendar events (session, meeting, meet, deadline) |
| `channels` + `channel_members` | Org messaging channels |
| `messages` | Channel messages with reactions, pins, file attachments |
| `direct_messages` | 1:1 DM threads |
| `program_templates` | Reusable workout program scaffolds |
| `exercises` | Org-level or global exercise library |
| `org_public_pages` | Public recruitment landing page content per org |
| `org_leads` | Intake form submissions / CRM leads |
| `org_resources` | Shared files, videos, links for athletes |
| `staff_athlete_assignments` | Who coaches whom, with per-athlete nutrition permission grants |
| `org_role_permissions` | Per-org custom permission overrides for each role |
| `member_custom_permissions` | Per-member custom permission overrides |

### How tables connect

```
auth.users (Supabase Auth)
    │
    └── profiles (1:1)
            │
            ├── org_members (many) ──── organizations (1)
            │       │                       │
            │       │               org_invitations
            │       │               org_join_requests
            │       │               org_public_pages
            │       │               org_leads
            │       │               org_resources
            │       │               events
            │       │               channels ── channel_members ── messages
            │       │               program_templates
            │       │               exercises
            │       │               training_blocks ── block_days ── block_exercises
            │       │
            │       └── staff_athlete_assignments (staff_id → athlete_id, within an org)
            │
            ├── workout_sessions ── workout_sets
            ├── daily_checkins
            ├── injury_reports
            ├── nutrition_logs
            ├── meal_prep_sessions ── meal_prep_session_items
            ├── shopping_lists ── categories ── items
            ├── meal_prep_recipes
            ├── goals
            └── meets
```

---

## Authentication & Session Flow

### Real users (Supabase Auth)

1. **Signup** (`/signup`) — `signUpWithEmail()` → Supabase sends a confirmation email with redirect to `/auth/callback`.
2. **Auth callback** (`/auth/callback`) — `AuthCallbackPage` exchanges the URL token, gets a session, calls `handleAuthSession()`.
3. **`handleAuthSession()`** — fetches `profiles` + `org_memberships` from Supabase in parallel. Role resolution priority: `platform_role = super_admin` → `profile.role` → `user_metadata.role` → `org_membership.org_role` → `'athlete'`.
4. **Onboarding gate** — real non-super-admin users with no org and `onboarding_complete = false` are redirected to `/onboarding`.
5. **`initAuth()`** — called once on app mount. Reads existing session from `localStorage` via `getSession()` (no network round-trip). Subscribes to `onAuthStateChange` for future events (avoids double-firing on load).
6. **Sign out** — clears all Zustand stores, calls `supabase.auth.signOut()`.

### Demo users

- `loginAsDemo(role)` — sets a mock profile from `MOCK_USERS`, seeds all stores from `mockData.js`, never touches Supabase Auth.
- Available demo roles: `super_admin`, `admin`, `coach`, `nutritionist`, `athlete`, `athlete2`, `assistant_coach`.
- `isDemo: true` is set on `useAuthStore` — all write helpers in `db.js` check `isSupabaseConfigured()` and silently no-op in demo mode.

### Session persistence

- Supabase stores the JWT in `localStorage` automatically.
- `getSession()` reads it synchronously on load — no spinner delay for returning users.
- `useSettingsStore` persists weight unit and color mode to `localStorage` independently.

---

## Roles & Permissions

### Platform roles (across all orgs)

| `platform_role` | Access |
|---|---|
| `super_admin` | Sees all orgs, all users, all SaaS metrics. Has no org membership. Cannot access org-level features. |
| `user` | Normal user — access scoped entirely to their org membership(s). |

### Org roles (within a single org)

| `org_role` | Capabilities |
|---|---|
| `owner` / `head_coach` | Full org access — team, programming, nutrition, analytics, settings, billing, website, leads |
| `coach` | Roster, programming, training management, nutrition (limited), messaging, analytics, meets, website, leads |
| `nutritionist` | Roster (read), nutrition plans, injury log, messaging, analytics |
| `athlete` | Own workouts, own nutrition, own goals/meets, messaging, calendar, resources, calculators |

### Permission fine-tuning

- **Role-level overrides** — `org_role_permissions` table stores a JSON object of permission booleans per role per org. Admins can customize defaults for an entire role class.
- **Member-level overrides** — `member_custom_permissions` stores individual overrides per user, taking highest precedence.
- **Nutrition permissions array** — `org_members.nutrition_permissions` is a Postgres array of `nutrition_permission` enum values that can be individually granted to coaches (e.g., `view_plan`, `edit_plan`, `create_meal_prep`, `assign_meal_prep`).

### "View as Athlete" toggle

Staff with `is_self_athlete = true` on their membership can toggle into an athlete persona — they see the full athlete UI for their own personal data (workouts, nutrition, goals, meets) without leaving their staff context.

---

## State Management

All state lives in Zustand stores in `src/lib/store.js`. No Context API. No Redux.

### Stores

| Store | What it holds |
|---|---|
| `useAuthStore` | `user`, `profile`, `orgMemberships`, `activeOrgId`, `isDemo`, `viewAsAthlete`, `authReady` |
| `useUIStore` | `activePage`, `sidebarCollapsed`, `mobileNavOpen`, `nutritionDeepLink` |
| `useSettingsStore` | `weightUnit`, `colorMode`, gym locations — all persisted to `localStorage` |
| `useOrgStore` | `orgs[]`, `platformUsers[]`, `staffAssignments[]`, invitation/member CRUD, website/leads/resources loading |
| `useGoalsStore` | `goals[]`, CRUD + `pushPRToGoals()` (called by WorkoutPage when a PR set is logged) |
| `useMeetsStore` | Per-athlete meets, training blocks, goals, history — loaded on demand per user |
| `useTrainingStore` | Org-level training blocks for the staff Training Management page |
| `useRosterStore` | `athletes[]`, `reviewQueue[]` — loaded once per org |
| `useNutritionStore` | Recipes, prep log, shopping lists, meal plans, nutrition logs |
| `useMessagingStore` | Channels, messages by thread, DMs, realtime subscriptions |
| `useCalendarStore` | Events — loaded per org, with realtime subscription |
| `useAnalyticsStore` | Per-org analytics data (workout sessions, check-ins, sets) |
| `useProgrammingStore` | Templates, exercises |
| `useWorkoutStore` | Active session state (in-progress workout only — ephemeral, not persisted) |
| `useOrgMeetsStore` | Org-level meet management (staff view) |

### Data loading pattern

Most stores use a **lazy load** pattern:
- Component mounts → calls `store.loadX(orgId)` in a `useEffect`.
- Store checks a guard (`_allOrgsLoaded`, `loadedFor`, etc.) to prevent double-fetching.
- Demo mode: data is pre-seeded from `mockData.js` on `loginAsDemo()` — no load calls needed.

### Store reset on logout / org switch

`logout()` and `handleSignOut()` reset every store to empty. `setActiveOrg()` resets `CalendarStore`, `AnalyticsStore`, and `MeetsStore` (org-scoped data) but preserves auth state.

---

## Demo Mode vs. Live Mode

### When is demo mode active?

`isDemo: true` on `useAuthStore` — set by `loginAsDemo()`, cleared on any real sign-in or sign-out.

### What demo mode does

- All stores are pre-seeded with rich mock data from `mockData.js` on `loginAsDemo()`.
- All write helpers silently no-op — nothing is written to Supabase.
- `isSupabaseConfigured()` gates every Supabase call; if `VITE_SUPABASE_URL` is not set, the entire backend is bypassed app-wide.

### Demo org isolation

The demo org (**Iron North Athletics**, `is_demo: true`) is included in the mock dataset to give coaches a realistic preview. It must never pollute platform-level SaaS metrics.

Every platform-level metric across all three views (`TodayPage` PlatformDashboard, `AdminPage` PlatformAnalyticsTab, `AnalyticsPage` PlatformAnalyticsView) filters with:

```js
const productionOrgs = orgs.filter(o => !o.is_demo)
```

`MOCK_PLATFORM_USERS` has explicit `is_demo` flags. Platform user counts filter with:

```js
const productionUsers = platformUsers.filter(u => u.is_demo === false)
```

### Real Supabase — run this once after schema setup

```sql
-- Mark the demo org so it's excluded from all production metrics
UPDATE organizations SET is_demo = true
WHERE slug = 'iron-north' OR name ILIKE '%iron north%';

-- Mark internal test accounts
UPDATE profiles SET is_demo = true
WHERE email ILIKE '%@powerplus.app'
   OR email IN ('sam.price@email.com', 'devon@email.com', 'mike@powerplus.com');

-- Verify
SELECT id, name, is_demo FROM organizations ORDER BY created_at;
SELECT id, email, is_demo FROM profiles WHERE is_demo = true;
```

---

## Pages & Features

### Public / Auth routes (no login required)

| Route | File | Purpose |
|---|---|---|
| `/` | `LandingPage.jsx` | Marketing landing — features, pricing, hero CTA |
| `/login` | `AuthPages.jsx` | Email/password sign-in |
| `/signup` | `AuthPages.jsx` | New account creation |
| `/demo` | `DemoPage.jsx` | Role picker — enters demo mode as any role |
| `/auth/callback` | `AuthCallbackPage.jsx` | Supabase OAuth / email confirmation handler |
| `/onboarding` | `OnboardingPage.jsx` | New user flow: pick role → create org or join one |
| `/org/:slug` | `OrgPublicPage.jsx` | Public recruitment page for any org |

### App shell (requires auth — `/app`)

All pages below live inside `AppShell` and are swapped by `activePage` in `useUIStore`.

---

#### Today (`today`) — `TodayPage.jsx`

**Purpose:** Role-specific landing page shown after login.

| View | Who sees it | What it shows |
|---|---|---|
| **PlatformDashboard** | `super_admin` | MRR, active org count, production user count, recent signups, system service status, quick links |
| **StaffDashboard** | Admins, coaches, nutritionists | Today's scheduled session, athlete flags, unread messages, upcoming meets, quick check-in entry |
| **AthleteTodayPage** | Athletes | Today's workout preview, macro ring, daily readiness, check-in widget, recent messages |

**Data connections:**
- `useOrgStore` → `productionOrgs` (super_admin metrics, demo-isolated)
- `useRosterStore` → athlete flags and review queue
- `useMessagingStore` → unread channel count
- `useMeetsStore` → upcoming competition date

---

#### Workout / Training Management (`workout`) — `WorkoutPage.jsx`

**Purpose:** Dual-view — athletes log sessions; staff manage and review training programs.

**Athlete view:**
- Scrollable workout plan by training block and day
- In-session mode: log each set with weight, reps, RPE, form notes
- e1RM auto-calculated per set; `pushPRToGoals()` fires when a PR is detected
- Cardio logging (distance, pace, heart rate)
- Pain flag button mid-session — writes to `injury_reports`
- Workout history with search/filter and session-detail drill-down

**Staff view (Training Management):**
- Org-wide training block overview — all active blocks across all athletes
- Per-block detail: assigned athletes, week/day structure, upcoming sessions
- Block CRUD (persists to `training_blocks`)
- Weekly submission review queue per athlete

**Data connections:**
- `useTrainingStore` (org blocks), `useMeetsStore` (athlete blocks/meets)
- `useGoalsStore.pushPRToGoals()` — PR detection
- `db.saveWorkoutSession()` + `db.saveWorkoutSet()` → `workout_sessions` + `workout_sets`
- `db.reportInjury()` → `injury_reports`
- `db.saveOrgTrainingBlock()` → `training_blocks`

---

#### Nutrition (`nutrition`) — `NutritionPage.jsx`

**Purpose:** Full nutrition operating system. One of the deepest pages in the app (~8600 lines).

**Athlete tabs:**
- **Dashboard** — today's macro ring, meal log entries, compliance score, hydration, weekly trend
- **Meal Planner** — drag-and-drop weekly board; plan breakfast/lunch/dinner/snacks per day
- **Meal Prep** — batch cook log: select recipes, log servings made/consumed
- **Pantry** — recipe library (personal + org-shared); full macro breakdown per recipe
- **Shopping** — weekly shopping list with categories; item-level check-off; budget tracker

**Staff tabs:**
- **Athlete Roster** — select any athlete; view macros plan vs. actual, compliance, meal history, dietary restrictions/allergies, weight trend
- **Meal Prep / Meal Planner / Pantry / Shopping** — same as athlete tabs, org-scoped

**Admin extra:** Team Overview — aggregate compliance and macro stats across all athletes.

**Data connections:**
- `useNutritionStore` (all nutrition state), `useRosterStore` (athlete selection)
- `db.saveNutritionLog()` → `nutrition_logs`
- `db.saveMealPrepRecipe()` → `meal_prep_recipes`
- `db.savePrepSessionFull()` → `meal_prep_sessions` + `meal_prep_session_items`
- `db.saveShoppingList()`, `db.toggleShoppingItem()` → `shopping_lists`
- `db.saveNutritionPlan()` → athlete plan target macros

---

#### Roster (`roster`) — `RosterPage.jsx`

**Purpose:** Staff-only. View and manage all athletes in the org.

- List + grid view; search by name, filter by weight class or flag
- Athlete card: adherence score, e1RM estimates, active flags, last session
- Athlete deep-dive modal: Training, Nutrition, Goals, Check-ins, Injuries, Messages tabs
- Weekly review queue: submit weekly notes per athlete
- Coach notes per athlete profile

**Data connections:**
- `useRosterStore.loadRoster(orgId)` → `fetchOrgAthletes()`
- `db.saveTrainingBlock()`, `db.saveGoal()`, `db.saveCoachNote()`, `db.saveNutritionPlan()`
- `db.sendDirectMessage()` → opens a DM thread to an athlete

---

#### Programming (`programming`) — `ProgrammingPage.jsx`

**Purpose:** Staff-only template library and workout builder.

- **Templates** — reusable multi-week program scaffolds with block type, weeks, style tags; can be copied and assigned
- **Workout Builder** — day-by-day constructor with sections (warm-up, main, accessory, conditioning, mobility)
- **Exercise Library** — org-scoped + global exercises; filter by category; CRUD

**Data connections:**
- `useProgrammingStore.loadProgramming(orgId)`
- `db.saveProgramTemplate()`, `db.deleteTemplate()` → `program_templates`
- `db.saveExercise()`, `db.deleteExercise()` → `exercises`

---

#### Analytics (`analytics`) — `AnalyticsPage.jsx`

**Purpose:** Role-split analytics dashboard.

| View | Who sees it |
|---|---|
| **PlatformAnalyticsView** | `super_admin` — MRR, ARR, active orgs, production users, signup trend, MRR trend, plan breakdown, org table |
| **Team Analytics** | Admin/coach — org-level strength trends, compliance heatmap, athlete comparison |
| **Athlete Detail** | Coach — individual athlete performance curve, volume, bodyweight, PR history |
| **Staff Analytics** | Admin — staff workload, athlete-to-coach ratios |
| **Personal Analytics** | Athlete — own strength curve, e1RM over time, compliance, bodyweight trend |

**Demo isolation (super_admin view):**
- `productionOrgs = orgs.filter(o => !o.is_demo)` excludes Iron North from all calculations
- `productionUsers = platformUsers.filter(u => u.is_demo === false)` excludes internal accounts
- `useEffect` calls `loadAllOrgs()` + `loadPlatformUsers()` on mount — data loads even when navigating directly to this page

---

#### Meets (`meets`) — `MeetsPage.jsx`

**Purpose:** Competition planning and results tracking.

**Athlete view:**
- Upcoming meets calendar with federation, location, equipment
- Training block linked to each meet (phases: accumulation → intensification → peaking → deload)
- Attempt selection: opening attempts by lift
- Meet entry: record squat/bench/deadlift attempts and results
- Meet history: all past competitions with dots/wilks scores and totals
- Goals linked to meets

**Staff view (via `OrgMeetsTab`):**
- All org meets with athlete assignment
- Add/remove athletes; view registration status

**Data connections:**
- `useMeetsStore.load(userId, orgId)` — fetches meets, blocks, goals, history in parallel
- `db.saveMeet()`, `db.saveMeetEntry()`, `db.saveMeetAttempts()`, `db.deleteTrainingBlock()`
- `fetchOrgMeets()`, `assignAthleteToMeet()`, `removeAthleteFromMeet()` (staff)

---

#### Messaging (`messaging`) — `MessagingPage.jsx`

**Purpose:** Full team communication hub.

- Org channels (public/private/announcement) — create, edit, archive
- Direct messages between any two org members
- Message types: text, image, video, GIF (GIPHY API via `VITE_GIPHY_KEY`)
- Inline markdown: `**bold**`, `_italic_`, `__underline__` + toolbar buttons
- Emoji reactions (quick reactions + full picker by category)
- Pin messages, edit own messages, delete own messages
- Realtime updates via Supabase Realtime (`subscribeToChannel()`)

**Data connections:**
- `useMessagingStore` — all channel/message/DM state
- `supabase.fetchChannels()`, `supabase.sendMessage()`, `supabase.subscribeToChannel()`

---

#### Check-In (`checkin`) — `CheckInPage.jsx`

**Purpose:** Athlete daily wellness submission — 5-step guided form.

**Steps:** Readiness → Sleep → Nutrition → Body (weight + soreness) → Subjective (motivation, stress, pain) → Done

On submit: writes to `daily_checkins`. If pain severity > 0 and a location is provided, also writes to `injury_reports`.

**Data connections:**
- `db.saveCheckIn()` → `daily_checkins`
- `db.reportInjury()` → `injury_reports` (conditional on pain flag)

---

#### Goals (`goals`) — `GoalsPage.jsx`

**Purpose:** Athlete goal tracking across four goal types.

| Type | Example |
|---|---|
| `strength` | Hit a 250kg squat by June |
| `nutrition` | Reach 90% macro compliance for 8 weeks |
| `meet` | Go 9/9 at USAPL Nationals |
| `process` | Log check-ins 5 days/week |

- Create/edit/delete goals with target value, current value, target date
- Progress history timeline — each update is logged with date + source
- Links to training blocks and meets
- `pushPRToGoals()` is called automatically from `WorkoutPage` when a PR set is logged — the goals store finds matching strength goals and advances their `current_value`

**Data connections:**
- `useGoalsStore` — all goal state
- `db.saveGoal()`, `db.completeGoal()`, `db.deleteGoal()` → `goals`

---

#### Injury Tracking (`injury`) — `InjuryPage.jsx`

**Purpose:** Log and monitor active and resolved injuries.

- **Athlete view:** own injury history; add new report; update pain level and status
- **Staff view:** select any athlete from roster; view full injury history; pain trend over time

Pain severity scale (0–10) with color-coded labels. Status: `active` / `monitoring` / `resolved`.

**Data connections:**
- `db.reportInjury()`, `db.updateInjury()` → `injury_reports`
- `supabase.fetchAthleteInjuries()` (staff view)

---

#### Calendar (`calendar`) — `CalendarPage.jsx`

**Purpose:** Shared org calendar.

- Monthly grid view with event dots per day
- Event types: `session`, `meeting`, `meet`, `deadline`, `other`
- Create/edit/delete events; all org members see the same calendar
- Realtime subscription: changes appear instantly for all members

**Data connections:**
- `useCalendarStore.load(orgId, userId)` → `fetchOrgEvents()` + `fetchUserEvents()`
- `db.saveEvent()`, `db.updateEvent()`, `db.deleteCalendarEvent()` → `events`
- `supabase.subscribeToOrgEvents()` → Postgres CDC

---

#### Website (`website`) — `WebsitePage.jsx` → `PublicPageTab`

**Purpose:** Staff build and publish a public recruitment landing page for their org.

- Section-based page builder: About, Coaches, Highlights, Testimonials, FAQ, Intake form
- Accent color picker, hero headline/CTA customization
- Custom URL / domain field; toggle published / draft
- Preview at `/org/:slug` (no auth required)
- Intake form field configuration

**Data connections:**
- `useOrgStore.loadOrgWebsite(orgId)` → `supabase.fetchOrgPublicPage()`
- `db.saveOrgPublicPage()` → `org_public_pages`

---

#### Leads / CRM (`leads`) — `LeadsPage.jsx`

**Purpose:** Manage intake form submissions and recruiting pipeline.

- Pipeline stages: `new` → `contacted` → `onboarded` / `declined`
- KPI cards: Total leads, Active pipeline, Conversion rate, New this week
- Lead detail: full form response, notes, assigned staff member
- Convert a lead to a full org member invite (role assignment)
- Realtime subscription: new submissions appear live

**Data connections:**
- `db.saveLead()`, `db.removeLead()` → `org_leads`
- `supabase.subscribeToOrgLeads()` → Postgres CDC
- `supabase.submitIntakeLead()` → called from `OrgPublicPage` (public intake)
- `useOrgStore.inviteMember()` — lead → member conversion

---

#### Resources (`resources`) — `ResourcesPage.jsx`

**Purpose:** Org-shared knowledge library.

- Categories: Technique, Meet Day, Recovery, Nutrition, Rules, General
- Types: article (link), video (embedded/linked), file
- Coaches can add/edit/delete; athletes read-only
- Realtime subscription

**Data connections:**
- `useOrgStore.loadOrgResources(orgId)` → `supabase.fetchOrgResources()`
- `db.saveNewResource()`, `db.updateResource()`, `db.removeResource()` → `org_resources`
- `supabase.subscribeToOrgResources()` → live sync

---

#### Calculators (`calculators`) — `CalculatorsPage.jsx`

**Purpose:** Standalone powerlifting math tools — no data writing.

| Tab | What it does |
|---|---|
| **e1RM** | Estimate 1-rep max from weight + reps; Epley, Brzycki, or Lombardi formula; strength curve from history |
| **Score Calculator** | DOTS, Wilks2020, or Glossbrenner score from total + bodyweight |
| **Attempt Selection** | Suggest opening attempts from training maxes + percentage targets |
| **Volume & Tonnage** | Session/week tonnage and intensity distribution |
| **Weight Management** | BMR/TDEE, macro targets, bulk/cut phase weight projection charts |

All calculations are pure functions in `utils.js` — no Supabase calls.

---

#### Admin / Settings (`settings`) — `AdminPage.jsx`

**Purpose:** The largest page (~5700 lines). Org management for head coaches AND platform management for super_admin.

**Head coach / Admin tabs:**

| Tab | Purpose |
|---|---|
| **Team** | Add/remove members, manage invitations, review join requests, roles, activity log |
| **Permissions** | Role-level permission matrix + per-member custom overrides |
| **Meets** | Org meet calendar — add meets, assign athletes |
| **Billing** | Plan info, org limits, storage usage, MRR |
| **Public Page** | Inline website builder (same component as WebsitePage) |

**Super admin tabs (only when `platform_role = super_admin`):**

| Tab | Purpose |
|---|---|
| **Organizations** | Full org table — search, filter by plan/status, org detail drill-down |
| **Org Detail** | Deep-dive: members, plan, usage, activity, billing, quick actions |
| **Users** | Platform-wide user directory with org assignment and role management |
| **Platform Analytics** | MRR/ARR, production users (athletes + staff breakdown), plan distribution chart, signup trend, org table |
| **Billing** | Per-org billing cards — plan, MRR contribution, status |

**Data connections:**
- `useOrgStore` — all org CRUD, invitation/member management, `loadAllOrgs()`, `loadPlatformUsers()`
- `supabase.fetchOrgJoinRequests()`, `approveJoinRequest()`, `denyJoinRequest()`
- `db.saveMeet()`, `db.deleteMeet()`

---

#### Profile & Settings (`profile`) — `ProfilePage.jsx`

**Purpose:** Personal account settings.

- **Profile** — name, bio, weight class, federation, equipment type, avatar
- **Account** — email, password change
- **Notifications** — notification preferences (UI complete)
- **Preferences** — weight unit (kg/lbs), color mode (dark/light), gym locations, preferred workout time

**Data connections:**
- `useAuthStore.updateProfile()` → `db.saveProfile()` → `profiles`
- `useSettingsStore` → `localStorage`

---

#### Onboarding (`/onboarding`) — `OnboardingPage.jsx`

**Purpose:** First-time flow for new authenticated users with no org.

| Role choice | Flow |
|---|---|
| Head Coach / Owner | Create new org → `createOrgWithOwner()` RPC → `onboarding_complete = true` |
| Coach / Nutritionist | Search orgs → submit join request → pending state |
| Athlete (solo) | Enter app as solo self-managed athlete |
| Athlete (join) | Search orgs → submit join request |

**Data connections:**
- `supabase.createOrgWithOwner()` → `create_org_with_owner` Postgres function
- `supabase.searchOrgs()` → `search_orgs` RPC
- `supabase.createJoinRequest()` → `org_join_requests`
- `supabase.markOnboardingComplete()` → `profiles.onboarding_complete = true`

---

## Component Library

All shared UI components are in `src/components/ui/`. Built on Tailwind, no external component library.

| Component | Purpose |
|---|---|
| `Card` + `CardHeader` + `CardTitle` + `CardSubtitle` + `CardBody` | Standard content container |
| `Button` | Variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg` |
| `Badge` | Color-coded label pill — `green`, `blue`, `purple`, `yellow`, `red`, `orange`, `default` |
| `Avatar` | Initials-based; falls back to `avatar_url` if set; multiple size variants |
| `Input` | Styled text input with label and error state |
| `Modal` | Portalled overlay with backdrop, close button, configurable size |
| `ProgressBar` | Horizontal progress with color variants and percentage label |
| `Slider` | Range input styled for wellness scoring (1–10) |
| `StatCard` | KPI card with label, value, sub-label, icon, color accent, optional trend indicator |
| `Tabs` | Horizontal tab bar with active indicator; accepts `{ id, label, icon }` array |

---

## Data Layer: supabase.js + db.js

### `supabase.js`

Low-level query helpers. Every function:
- Guards with `if (!isSupabaseConfigured()) return null/[]` — silently no-ops in demo mode or when env vars are missing
- Logs errors to `console.error` but never throws
- Returns typed data or a safe empty value (`null`, `[]`, `false`)

Covers: auth, profiles, orgs, org members, invitations, join requests, workout sessions/sets, check-ins, injuries, nutrition logs, meal prep, shopping lists, recipes, calendar events + realtime, messaging channels/messages/DMs + realtime, training blocks, programming, meets, resources, leads, public pages, super_admin platform queries.

### `db.js`

Sanitized write helpers for all user-facing inputs. Every function:

1. Calls `isSupabaseConfigured()` — no-ops if not configured
2. Runs all string inputs through `sanitizeText()` (strips control chars, collapses whitespace, truncates to per-field limits)
3. Runs numeric inputs through `sanitizeNumber()` (coerce + clamp to valid range)
4. Validates dates with `sanitizeDate()` (enforces ISO `YYYY-MM-DD` format)
5. Logs errors without throwing — the UI never crashes on a DB error

All user input is sanitized at a single centralized layer before reaching Supabase.

---

## Navigation & Routing

### URL routes (React Router)

| Path | Component | Auth required |
|---|---|---|
| `/` | `LandingPage` | No |
| `/login` | `LoginPage` | No |
| `/signup` | `SignupPage` | No |
| `/demo` | `DemoPage` | No |
| `/auth/callback` | `AuthCallbackPage` | No |
| `/onboarding` | `OnboardingPage` | Yes (no org) |
| `/org/:slug` | `OrgPublicPage` | No |
| `/app` | `ProtectedApp` → `AppShell` | Yes |
| `*` | Redirect to `/` | — |

### In-app navigation (no URL change)

Inside `/app`, all navigation is `setActivePage(pageKey)`. `PAGE_MAP` in `App.jsx` maps string keys to page components. Sidebar, Topbar, and MobileNav all call `setActivePage()`.

### Role-based navigation

The Sidebar renders a different nav array per effective role:

| Resolved role | Nav set |
|---|---|
| `super_admin` | Platform Dashboard, Organizations, Platform Analytics |
| `admin` (head_coach) | Full staff nav (14 items) |
| `coach` | Staff nav without Settings |
| `nutritionist` | Nutrition-focused nav |
| `athlete` | Athlete nav (10 items) |

Role resolution priority: `profile.platform_role` → `profile.role` → `orgMemberships[activeOrgId].org_role` → `'athlete'`.

---

## Pricing & Plans

| Plan | Monthly | Athletes | Staff | Storage |
|---|---|---|---|---|
| **Starter** | Free | 10 | 2 | 2 GB |
| **Team Pro** | $149/mo | 30 | 5 | 10 GB |
| **Enterprise** | $499/mo | 100 | 20 | 50 GB |

Plans are stored as the `plan` field on `organizations`. Stripe fields (`stripe_customer_id`, `stripe_subscription_id`, `billing_email`, `trial_ends_at`) are in the schema and ready for integration — billing enforcement is a future milestone.

---

## Environment Setup

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional — enables GIF search in Messaging
VITE_GIPHY_KEY=your-giphy-api-key
```

**Without these values**, the app runs entirely in demo mode — no Supabase calls are made, all data comes from `mockData.js`.

### Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor — fully idempotent.
3. Run the demo isolation statements (see [Demo Mode vs. Live Mode](#demo-mode-vs-live-mode)).
4. In Supabase Auth settings, set the **Site URL** and add `/auth/callback` as an allowed redirect URL.

---

## Running the App

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The app is deployed with `basename="/Powerplus"` in `vite.config.js` — update this to match your deployment domain root.

---

## MVP Goals & Roadmap

### ✅ Completed

**Platform infrastructure**
- [x] Multi-org SaaS architecture with `super_admin` platform operator tier
- [x] Supabase Auth (email/password, OAuth callback, session persistence)
- [x] Full onboarding flow (create org, join org, solo athlete)
- [x] Role-based navigation and permission system (role-level + per-member overrides)
- [x] Demo mode with full mock dataset — zero Supabase dependency
- [x] Demo org + demo users excluded from all platform metrics (MRR, user counts, org counts)
- [x] Dark/light color mode, kg/lbs unit toggle, gym location preferences

**Athlete features**
- [x] Workout logging (sets, reps, weight, RPE) with in-session mode
- [x] e1RM auto-calculation per set; PR detection → automatic goal progression
- [x] Daily wellness check-in (readiness, sleep, nutrition, soreness, body weight, pain)
- [x] Injury reporting and status tracking (athlete + staff view)
- [x] Goals system (strength, nutrition, meet, process) with progress history
- [x] Nutrition dashboard (macro ring, meal log, compliance, hydration)
- [x] Meal planning board (weekly drag-and-drop)
- [x] Meal prep batch-cook log with recipe library
- [x] Shopping list builder with categories and budget
- [x] Meet calendar with attempt selection, result entry, dots/wilks scoring
- [x] Personal analytics (strength curves, compliance, bodyweight trend)
- [x] Calendar with org events

**Staff / Org features**
- [x] Athlete roster with flags, search, filter, grid/list view
- [x] Per-athlete deep-dive: training, nutrition, goals, check-ins, injuries, messages
- [x] Training block creation and assignment
- [x] Program template library + workout builder + exercise library
- [x] Org-wide nutrition overview
- [x] Team messaging: channels, DMs, reactions, pins, GIFs, markdown formatting
- [x] Meet management: org calendar + athlete assignment
- [x] Public org recruitment page builder (section editor, intake form)
- [x] Lead / CRM pipeline with status management and staff assignment
- [x] Org resources library with realtime sync
- [x] Member invitation flow + join request approval queue
- [x] Realtime updates: messaging, calendar, leads, resources

**Super admin**
- [x] Platform dashboard (production MRR, ARR, active orgs, user counts)
- [x] Org table with drill-down detail
- [x] Platform-wide user directory with org management
- [x] Platform analytics (MRR/ARR trend charts, plan breakdown, org signup trend)
- [x] Billing overview per org
- [x] Demo org + user isolation from all production KPIs

**Calculators**
- [x] e1RM (Epley, Brzycki, Lombardi) with strength curve chart
- [x] DOTS, Wilks2020, Glossbrenner score calculators
- [x] Attempt selection tool
- [x] Volume & tonnage calculator
- [x] Weight management (BMR/TDEE, macro targets, weight projection charts)

### 🔲 Planned

**Billing & payments**
- [ ] Stripe integration — checkout, webhooks, subscription management
- [ ] Hard limit enforcement at plan caps (athlete/staff count)
- [ ] Trial period logic (`trial_ends_at` column is ready)

**Notifications**
- [ ] In-app notification center (check-in flags, pain reports, missed sessions surfaced to coach)
- [ ] Email notifications (new lead, invitation accepted, weekly check-in reminder)

**Programming**
- [ ] RPE-to-percentage auto-conversion in workout builder
- [ ] Auto-progress training maxes week-over-week
- [ ] Assign a template directly to one athlete or the whole org
- [ ] Video form submission — athletes upload clips for coach review

**Analytics & exports**
- [ ] Deeper org-level strength trends across entire roster
- [ ] Meet performance progression (dots/wilks career chart)
- [ ] CSV/PDF export for athletes and coach reports

**Platform**
- [ ] Multiple org support (user in more than one org simultaneously)
- [ ] Super admin impersonation (view any org as that org's admin)
- [ ] Org suspension enforcement (block logins for suspended orgs)
- [ ] Audit log (all admin actions timestamped and attributed)

**Mobile**
- [ ] Native mobile app (React Native / Expo) on same Supabase backend
- [ ] Offline mode with sync on reconnect
