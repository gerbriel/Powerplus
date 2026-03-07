import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Plus, Flame, Droplets, CheckCircle2, Circle, MessageSquare,
  ChevronDown, ChevronUp, ShoppingCart, UtensilsCrossed, Clock,
  Edit2, Save, X, Trash2, RotateCcw, Printer, DollarSign, AlertTriangle,
  Sparkles, Package, Info, Copy, ArrowRight, CalendarDays,
  Target, Link2, Layers, BarChart2, ArrowLeft,
  Archive, Check, ListTodo, Zap, Activity, Shield, TrendingUp,
  AlertCircle, Heart, ChevronRight, ChevronLeft, Flag, Stethoscope,
  Moon, Brain, Battery, Scale, Users, TrendingDown, Eye,
  UserCheck, ClipboardList, BookOpen, History, Sunrise, Sunset,
  Pill, Apple, Coffee, Settings,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { StatCard } from '../components/ui/StatCard'
import { Avatar } from '../components/ui/Avatar'
import { Modal } from '../components/ui/Modal'
import { Tabs } from '../components/ui/Tabs'
import {
  MOCK_NUTRITION_TODAY, MOCK_ATHLETES, MOCK_MEAL_PLAN_RECIPES, MOCK_SHOPPING_LIST,
  MOCK_SHOPPING_LISTS, MOCK_MEAL_PREP_LOG, MOCK_GOALS, MOCK_TRAINING_BLOCKS, MOCK_MEETS,
  MOCK_INJURY_LOGS, MOCK_STAFF_ASSIGNMENTS, MOCK_ORG_MEMBERS, MOCK_ATHLETE_MEAL_PLANS,
  MOCK_MEAL_HISTORY, MOCK_ATHLETE_RECIPES, MOCK_ATHLETE_PREP_LOG, MOCK_ATHLETE_SHOPPING_LISTS,
} from '../lib/mockData'
import { useAuthStore, useUIStore, useNutritionStore, useGoalsStore, useTrainingStore, useRosterStore, resolveRole, isStaffRole } from '../lib/store'
import { cn, macroPercent } from '../lib/utils'
import { saveNutritionLog, saveMealPrepRecipe, saveShoppingList, toggleShoppingItem, deleteMealPrepRecipe, deleteShoppingListItem, savePrepSessionFull, saveBodyWeight, saveNutritionPlan, reportInjury, updateInjury } from '../lib/db'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'planner',   label: 'Meal Planner' },
  { id: 'preplog',   label: 'Meal Prep' },
  { id: 'pantry',    label: 'Pantry' },
  { id: 'shopping',  label: 'Shopping' },
]
const STAFF_TABS = [
  { id: 'roster',    label: 'Athlete Roster' },
  { id: 'meal_prep', label: 'Meal Prep' },
  { id: 'planner',   label: 'Meal Planner' },
  { id: 'pantry',    label: 'Pantry' },
  { id: 'shopping',  label: 'Shopping' },
]
const ADMIN_EXTRA_TABS = [
  { id: 'team', label: 'Team Overview' },
]

const MEAL_TYPE_META = {
  breakfast:      { label: 'Breakfast',    color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
  lunch:          { label: 'Lunch',        color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
  dinner:         { label: 'Dinner',       color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
  snack:          { label: 'Snack',        color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
  'pre-workout':  { label: 'Pre-Workout',  color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
  'post-workout': { label: 'Post-Workout', color: 'text-zinc-300 bg-zinc-700/40 border-zinc-600/40' },
}

const SHOPPING_CATEGORIES = ['Proteins', 'Carbohydrates', 'Vegetables', 'Dairy & Eggs', 'Pantry']

const DAY_SHORT_MAP = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }

let _nextItemId = 200
const genItemId = () => `custom_${_nextItemId++}`

let _nextRecipeId = 100
const genRecipeId = () => `cr${_nextRecipeId++}`
let _nextAthleteRecipeId = 1000
const genAthleteRecipeId = (athleteId) => `ar-${athleteId}-${_nextAthleteRecipeId++}`
let _nextAslId = 500
const genAslId = () => `asl-new-${_nextAslId++}`
let _nextAsliId = 900
const genAsliId = () => `asli-new-${_nextAsliId++}`

// ─── Allergen / dietary constants ────────────────────────────────────────────
const ALLERGEN_COLORS = {
  gluten:      'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  dairy:       'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  eggs:        'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  fish:        'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  shellfish:   'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  peanuts:     'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  'tree-nuts': 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  soy:         'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  default:     'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
}
const RESTRICTION_COLORS = {
  'gluten-free':  'bg-zinc-800/40 text-zinc-400 border-zinc-700/40',
  'dairy-free':   'bg-zinc-800/40 text-zinc-400 border-zinc-700/40',
  vegetarian:     'bg-zinc-800/40 text-zinc-400 border-zinc-700/40',
  vegan:          'bg-zinc-800/40 text-zinc-400 border-zinc-700/40',
  halal:          'bg-zinc-800/40 text-zinc-400 border-zinc-700/40',
  none:           'bg-zinc-800/40 text-zinc-400 border-zinc-700/30',
  default:        'bg-zinc-800/40 text-zinc-400 border-zinc-700/30',
}
const allergenColor = (a) => ALLERGEN_COLORS[a] ?? ALLERGEN_COLORS.default
const restrictionColor = (r) => RESTRICTION_COLORS[r] ?? RESTRICTION_COLORS.default

// Check if a recipe conflicts with athlete's dietary profile
function recipeConflicts(recipe, athlete) {
  if (!athlete?.dietary_profile) return []
  const { allergens = [], restrictions = [] } = athlete.dietary_profile
  const rAllergens = recipe?.allergens ?? recipe?.contains ?? []
  const conflicts = []
  for (const a of rAllergens) {
    if (allergens.includes(a)) conflicts.push({ type: 'allergen', value: a })
  }
  if (restrictions.includes('vegetarian') && !recipe?.dietary_flags?.includes('vegetarian') && !recipe?.dietary_flags?.includes('vegan')) {
    const nonVegIngredients = (recipe?.ingredients ?? []).filter(i =>
      /chicken|turkey|beef|pork|salmon|tuna|fish|meat|shrimp|prawn/i.test(i.name)
    )
    if (nonVegIngredients.length) conflicts.push({ type: 'restriction', value: 'vegetarian', detail: nonVegIngredients[0].name })
  }
  if (restrictions.includes('gluten-free') && rAllergens.includes('gluten')) {
    conflicts.push({ type: 'restriction', value: 'gluten-free' })
  }
  if (restrictions.includes('dairy-free') && rAllergens.includes('dairy')) {
    conflicts.push({ type: 'restriction', value: 'dairy-free' })
  }
  if (restrictions.includes('halal')) {
    const nonHalalIngredients = (recipe?.ingredients ?? []).filter(i => /pork|bacon|ham|lard/i.test(i.name))
    if (nonHalalIngredients.length) conflicts.push({ type: 'restriction', value: 'halal', detail: nonHalalIngredients[0].name })
  }
  return conflicts
}

// ─── Log Meal Modal ──────────────────────────────────────────────────────────
function LogMealModal({ open, onClose }) {
  const { athletePrepLog, setAthletePrepLog, boardPlans, orgRecipes } = useNutritionStore()
  const { isDemo, profile } = useAuthStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)
  const TODAY_DAY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]

  const [method, setMethod]   = useState('macros') // 'macros' | 'pantry' | 'plan' | 'quick'
  const [mealType, setMealType] = useState('lunch')
  const [energy, setEnergy]   = useState(7)
  const [notes, setNotes]     = useState('')

  // ── Macros method state ──
  const [mealTitle, setMealTitle] = useState('')
  const [macros, setMacros]       = useState({ calories: '', protein: '', carbs: '', fat: '' })
  const [saveToPantry, setSaveToPantry] = useState(false)
  const [servingsMade, setServingsMade] = useState(1)
  const setMacro = (k, v) => setMacros(prev => ({ ...prev, [k]: v }))

  // ── Pantry method state ──
  const liveSessions = athletePrepLog?.[MY_ATHLETE_ID] ?? (isDemo ? MOCK_MEAL_PREP_LOG : [])
  const pantryItems  = liveSessions.flatMap(s =>
    (s.items || [])
      .map(item => ({
        ...item,
        sessionId:    s.id,
        sessionLabel: s.label,
        available:    Math.max(0, (item.servings_made || 0) - (item.servings_consumed || 0)),
      }))
      .filter(item => item.available > 0)
  )
  const [servingsToLog, setServingsToLog] = useState({}) // itemId → qty
  const setServing = (itemId, delta, max) =>
    setServingsToLog(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(max, (prev[itemId] ?? 0) + delta)) }))

  const totalFromPantry = Object.entries(servingsToLog).reduce((acc, [itemId, count]) => {
    if (!count) return acc
    const item = pantryItems.find(i => i.id === itemId)
    if (item) {
      acc.calories += (item.macros_per_serving?.calories ?? 0) * count
      acc.protein  += (item.macros_per_serving?.protein  ?? 0) * count
      acc.carbs    += (item.macros_per_serving?.carbs    ?? 0) * count
      acc.fat      += (item.macros_per_serving?.fat      ?? 0) * count
    }
    return acc
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 })

  // ── Plan method state (today's nutritionist plan) ──
  const liveDayPlan  = boardPlans?.[MY_ATHLETE_ID]?.[TODAY_DAY]
    ?? (isDemo ? MOCK_ATHLETE_MEAL_PLANS?.[MY_ATHLETE_ID]?.[TODAY_DAY] : null) ?? null

  // Set of recipe_ids that are on today's plan — used to badge pantry items
  const planRecipeIds = useMemo(() => {
    if (!liveDayPlan) return new Set()
    return new Set(
      Object.values(liveDayPlan)
        .flat()
        .filter(Boolean)
        .map(i => i.recipe_id)
        .filter(Boolean)
    )
  }, [liveDayPlan])
  const [planChecked, setPlanChecked] = useState({}) // itemId → bool
  const togglePlanItem = (id) => setPlanChecked(prev => ({ ...prev, [id]: !prev[id] }))
  const SLOT_ORDER = ['breakfast','pre-workout','lunch','snack','dinner','post-workout','supplements']
  const SLOT_LABELS = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', 'pre-workout':'Pre-Workout', 'post-workout':'Post-Workout', supplements:'Supplements' }
  const planAllItems = liveDayPlan
    ? SLOT_ORDER.flatMap(s => (liveDayPlan[s] || []).filter(Boolean).map(i => ({ ...i, slot: s })))
    : []
  const totalFromPlan = planAllItems
    .filter(i => planChecked[i.id])
    .reduce((acc, i) => ({
      calories: acc.calories + (i.calories || 0),
      protein:  acc.protein  + (i.protein  || 0),
      carbs:    acc.carbs    + (i.carbs    || 0),
      fat:      acc.fat      + (i.fat      || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  // ── Reset on close ──
  const handleClose = () => {
    setMacros({ calories: '', protein: '', carbs: '', fat: '' })
    setMealTitle('')
    setSaveToPantry(false)
    setServingsMade(1)
    setServingsToLog({})
    setPlanChecked({})
    setNotes('')
    setEnergy(7)
    onClose()
  }

  // ── Save ──
  const handleSave = async () => {
    if (method === 'macros' && saveToPantry && mealTitle.trim()) {
      // Create a new prep log session with this meal as an item
      const newItem = {
        id:          `mpi-quick-${Date.now()}`,
        recipe_id:   null,
        recipe_name: mealTitle.trim(),
        servings_made:     servingsMade,
        servings_consumed: 1, // logging 1 serving now
        storage:     'fridge',
        notes:       notes || '',
        macros_per_serving: {
          calories: Number(macros.calories) || 0,
          protein:  Number(macros.protein)  || 0,
          carbs:    Number(macros.carbs)    || 0,
          fat:      Number(macros.fat)      || 0,
        },
      }
      const existingSession = (athletePrepLog?.[MY_ATHLETE_ID] ?? []).find(s => s.id === 'mpl-quick')
      if (existingSession) {
        setAthletePrepLog(prev => ({
          ...prev,
          [MY_ATHLETE_ID]: (prev[MY_ATHLETE_ID] ?? []).map(s =>
            s.id === 'mpl-quick' ? { ...s, items: [...s.items, newItem] } : s
          ),
        }))
      } else {
        const _todayStr = new Date().toISOString().slice(0, 10)
        const newSession = {
          id:    'mpl-quick',
          label: 'Quick Logged Meals',
          date:  _todayStr,
          cadence: 'daily',
          week_start: _todayStr,
          week_end:   _todayStr,
          linked_goal_ids: [],
          linked_block_id: null,
          linked_meet_id:  null,
          notes: 'Auto-created from Log Meal',
          total_calories_prepped: 0,
          total_protein_prepped:  0,
          items: [newItem],
        }
        setAthletePrepLog(prev => ({
          ...prev,
          [MY_ATHLETE_ID]: [newSession, ...(prev[MY_ATHLETE_ID] ?? (isDemo ? MOCK_MEAL_PREP_LOG : []))],
        }))
      }
    }

    if (method === 'pantry' && Object.values(servingsToLog).some(v => v > 0)) {
      // Decrement servings_consumed for each logged item
      setAthletePrepLog(prev => {
        const sessions = prev[MY_ATHLETE_ID] ?? (isDemo ? MOCK_MEAL_PREP_LOG : [])
        return {
          ...prev,
          [MY_ATHLETE_ID]: sessions.map(s => ({
            ...s,
            items: s.items.map(item => {
              const qty = servingsToLog[item.id] ?? 0
              if (!qty) return item
              return { ...item, servings_consumed: (item.servings_consumed || 0) + qty }
            }),
          })),
        }
      })
    }

    // Persist to Supabase
    if (!isDemo && MY_ATHLETE_ID) {
      const totalMacros =
        method === 'macros' ? { calories: Number(macros.calories) || 0, protein: Number(macros.protein) || 0, carbs: Number(macros.carbs) || 0, fat: Number(macros.fat) || 0 }
        : method === 'pantry' ? totalFromPantry
        : method === 'plan'   ? totalFromPlan
        : {}
      await saveNutritionLog(MY_ATHLETE_ID, {
        log_date:         new Date().toISOString().slice(0, 10),
        meal_type:        mealType,
        meal_name:        mealTitle || method,
        calories_actual:  totalMacros.calories,
        protein_actual:   totalMacros.protein,
        carbs_actual:     totalMacros.carbs,
        fat_actual:       totalMacros.fat,
        energy_level:     energy,
        notes,
      })
    }

    handleClose()
  }

  const canSave = (() => {
    if (method === 'macros') return mealTitle.trim() !== '' || Object.values(macros).some(v => v !== '')
    if (method === 'pantry') return Object.values(servingsToLog).some(v => v > 0)
    if (method === 'plan')   return Object.values(planChecked).some(Boolean)
    return true
  })()

  const METHODS = [
    { key: 'macros', label: 'Enter Macros' },
    { key: 'pantry', label: 'From Pantry'  },
    { key: 'plan',   label: "Today's Plan" },
    { key: 'quick',  label: 'Quick Add'    },
  ]

  return (
    <Modal open={open} onClose={handleClose} title="Log Meal" size="md">
      <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">

        {/* Method selector */}
        <div className="grid grid-cols-4 gap-1.5">
          {METHODS.map(m => (
            <button key={m.key} onClick={() => setMethod(m.key)}
              className={cn('text-xs py-2 px-1 rounded-xl border font-semibold transition-colors text-center',
                method === m.key
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
              )}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Shared: meal slot + energy */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meal Slot</label>
            <select value={mealType} onChange={e => setMealType(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              {Object.entries(MEAL_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Energy: {energy}/10</label>
            <input type="range" min="1" max="10" value={energy} onChange={e => setEnergy(Number(e.target.value))} className="w-full accent-orange-500 mt-2" />
          </div>
        </div>

        {/* ── MACROS METHOD ── */}
        {method === 'macros' && (
          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Meal Name <span className="text-zinc-600 font-normal">(required to save to pantry)</span>
              </label>
              <input value={mealTitle} onChange={e => setMealTitle(e.target.value)}
                placeholder="e.g. Chicken & Rice Bowl"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            {/* Macro inputs */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'calories', label: 'Calories', unit: 'kcal', color: 'text-orange-300' },
                { k: 'protein',  label: 'Protein',  unit: 'g',    color: 'text-blue-300' },
                { k: 'carbs',    label: 'Carbs',    unit: 'g',    color: 'text-purple-300' },
                { k: 'fat',      label: 'Fat',      unit: 'g',    color: 'text-yellow-300' },
              ].map(f => (
                <div key={f.k}>
                  <label className={cn('block text-xs font-medium mb-1.5', f.color)}>
                    {f.label} <span className="text-zinc-600 font-normal">({f.unit})</span>
                  </label>
                  <input type="number" min="0" value={macros[f.k]} onChange={e => setMacro(f.k, e.target.value)} placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
                </div>
              ))}
            </div>
            {/* Save to pantry toggle */}
            <div className={cn(
              'rounded-xl border p-3 space-y-2 transition-colors',
              saveToPantry ? 'border-teal-500/40 bg-teal-500/5' : 'border-zinc-700/50 bg-zinc-800/30'
            )}>
              <button onClick={() => setSaveToPantry(p => !p)}
                className="flex items-center gap-2 w-full text-left">
                {saveToPantry
                  ? <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  : <Circle       className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                }
                <span className={cn('text-sm font-medium', saveToPantry ? 'text-teal-300' : 'text-zinc-400')}>
                  Save as prep item in Pantry
                </span>
              </button>
              {saveToPantry && (
                <div className="pl-6 space-y-2">
                  <p className="text-xs text-zinc-500">
                    This meal will be added to your pantry as a prepped item. Other servings stay available to log later.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-zinc-400 flex-shrink-0">Total servings made:</label>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setServingsMade(p => Math.max(1, p - 1))}
                        className="w-6 h-6 text-xs flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors">−</button>
                      <span className="text-sm font-bold text-zinc-100 w-5 text-center">{servingsMade}</span>
                      <button onClick={() => setServingsMade(p => Math.min(20, p + 1))}
                        className="w-6 h-6 text-xs flex items-center justify-center bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/30 rounded-lg text-teal-300 transition-colors">+</button>
                    </div>
                    <span className="text-xs text-zinc-600">({servingsMade - 1} left after logging 1)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PANTRY METHOD ── */}
        {method === 'pantry' && (
          <div className="space-y-3">
            {pantryItems.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <Package className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">No prepped items available</p>
                <p className="text-xs text-zinc-600">Log a meal with "Save to Pantry" or use the Meal Prep tab</p>
              </div>
            ) : (
              <>
                {/* Group by session */}
                {liveSessions.map(session => {
                  const sessionItems = pantryItems.filter(i => i.sessionId === session.id)
                  if (!sessionItems.length) return null
                  return (
                    <div key={session.id}>
                      <p className="text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />{session.label}
                      </p>
                      <div className="space-y-1.5">
                        {sessionItems.map(item => {
                          const qty        = servingsToLog[item.id] ?? 0
                          const isOnPlan   = item.recipe_id && planRecipeIds.has(item.recipe_id)
                          return (
                            <div key={item.id} className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                              qty > 0       ? 'bg-teal-500/5 border-teal-500/30'
                              : isOnPlan    ? 'bg-green-500/5 border-green-500/20'
                              : 'bg-zinc-800/40 border-zinc-700/40'
                            )}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium text-zinc-200 truncate">{item.recipe_name}</p>
                                  {isOnPlan && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 flex-shrink-0">
                                      On plan
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {item.available} serving{item.available !== 1 ? 's' : ''} left ·{' '}
                                  <span className="text-orange-300">{item.macros_per_serving?.calories ?? 0} kcal</span>{' '}·{' '}
                                  <span className="text-blue-400">{item.macros_per_serving?.protein ?? 0}g P</span>{' '}each
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button onClick={() => setServing(item.id, -1, item.available)}
                                  disabled={qty === 0}
                                  className="w-7 h-7 text-sm flex items-center justify-center bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 rounded-lg text-zinc-200 transition-colors">−</button>
                                <span className="text-sm font-bold text-zinc-100 w-5 text-center">{qty}</span>
                                <button onClick={() => setServing(item.id, 1, item.available)}
                                  disabled={qty >= item.available}
                                  className="w-7 h-7 text-sm flex items-center justify-center bg-teal-600/30 hover:bg-teal-600/50 disabled:opacity-30 border border-teal-500/30 rounded-lg text-teal-300 transition-colors">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {/* Running totals */}
                {Object.values(servingsToLog).some(v => v > 0) && (
                  <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-zinc-400 mb-2">Logging totals</p>
                    <div className="flex gap-4 flex-wrap">
                      <span className="text-sm font-bold text-orange-300">{totalFromPantry.calories} kcal</span>
                      <span className="text-sm font-bold text-blue-300">{totalFromPantry.protein}g P</span>
                      <span className="text-sm font-bold text-purple-300">{totalFromPantry.carbs}g C</span>
                      <span className="text-sm font-bold text-yellow-300">{totalFromPantry.fat}g F</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── TODAY'S PLAN METHOD ── */}
        {method === 'plan' && (
          <div className="space-y-3">
            {planAllItems.length === 0 ? (
              <div className="text-center py-6 space-y-1">
                <CalendarDays className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">No plan items for today</p>
                <p className="text-xs text-zinc-600">Your nutritionist hasn't set up today yet</p>
              </div>
            ) : (
              <>
                {SLOT_ORDER.filter(slot => planAllItems.some(i => i.slot === slot)).map(slot => (
                  <div key={slot}>
                    <p className="text-xs font-semibold text-zinc-500 mb-1.5">{SLOT_LABELS[slot]}</p>
                    <div className="space-y-1.5">
                      {planAllItems.filter(i => i.slot === slot).map(item => {
                        const checked = planChecked[item.id] ?? false
                        return (
                          <button key={item.id} onClick={() => togglePlanItem(item.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                              checked
                                ? 'bg-green-500/5 border-green-500/30'
                                : 'bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600/50'
                            )}>
                            {checked
                              ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              : <Circle       className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                            }
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium truncate', checked ? 'line-through text-zinc-500' : 'text-zinc-200')}>
                                {item.name || item.recipe_name}
                              </p>
                              {item.notes && <p className="text-xs text-zinc-600 truncate italic">{item.notes}</p>}
                            </div>
                            <div className="flex gap-2 text-xs flex-shrink-0">
                              {(item.calories || 0) > 0 && <span className="text-orange-300">{item.calories} kcal</span>}
                              {(item.protein  || 0) > 0 && <span className="text-blue-400">{item.protein}g P</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {Object.values(planChecked).some(Boolean) && (
                  <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-zinc-400 mb-2">Selected totals</p>
                    <div className="flex gap-4 flex-wrap">
                      <span className="text-sm font-bold text-orange-300">{totalFromPlan.calories} kcal</span>
                      <span className="text-sm font-bold text-blue-300">{totalFromPlan.protein}g P</span>
                      <span className="text-sm font-bold text-purple-300">{totalFromPlan.carbs}g C</span>
                      <span className="text-sm font-bold text-yellow-300">{totalFromPlan.fat}g F</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── QUICK ADD METHOD ── */}
        {method === 'quick' && (
          <div className="grid grid-cols-2 gap-2">
            {(isDemo ? MOCK_MEAL_PLAN_RECIPES : orgRecipes).slice(0, 12).map(r => (
              <button key={r.id}
                onClick={() => {
                  const macroSrc = r.macros ?? r.macros_per_serving ?? {}
                  setMealTitle(r.name)
                  setMacros({ calories: String(macroSrc.calories ?? 0), protein: String(macroSrc.protein ?? 0), carbs: String(macroSrc.carbs ?? 0), fat: String(macroSrc.fat ?? 0) })
                  setMethod('macros')
                }}
                className="text-left p-3 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl border border-zinc-700/50 hover:border-purple-500/30 transition-colors">
                <p className="text-sm font-medium text-zinc-200 leading-snug">{r.name}</p>
                <p className="text-xs text-zinc-500 mt-1">{(r.macros ?? r.macros_per_serving)?.calories ?? 0} kcal · {(r.macros ?? r.macros_per_serving)?.protein ?? 0}g P</p>
                <p className="text-xs text-zinc-600 mt-0.5 capitalize">{r.meal_type}</p>
              </button>
            ))}
            {!isDemo && orgRecipes.length === 0 && (
              <div className="col-span-2 text-center py-6 space-y-1">
                <Sparkles className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-sm text-zinc-500">No org recipes yet</p>
                <p className="text-xs text-zinc-600">Your nutritionist can add recipes in the Meal Prep tab</p>
              </div>
            )}
          </div>
        )}

        {/* Shared: notes */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
        </div>

        <Button className="w-full" disabled={!canSave} onClick={handleSave}>
          <CheckCircle2 className="w-4 h-4" />
          {method === 'macros' && saveToPantry ? 'Log & Save to Pantry' : 'Save Log'}
        </Button>
      </div>
    </Modal>
  )
}

export function NutritionPage() {
  const { profile, viewAsAthlete, orgMemberships, activeOrgId, isDemo } = useAuthStore()
  const { nutritionDeepLink, clearNutritionDeepLink } = useUIStore()
  const membership = orgMemberships?.find((m) => m.org_id === activeOrgId)
  // Use resolveRole so org_role fallback works if profile.role is missing
  const baseIsStaff = isStaffRole(profile, membership)
  // Staff who toggled "View as Athlete" see the athlete nav
  const isStaff = baseIsStaff && !viewAsAthlete
  const isAdmin = isStaff && resolveRole(profile, membership) === 'admin'
  const staffTabs = isAdmin ? [...STAFF_TABS, ...ADMIN_EXTRA_TABS] : STAFF_TABS
  const [tab, setTab] = useState(isStaff ? 'roster' : 'dashboard')
  const [logOpen, setLogOpen] = useState(false)
  const [suppChecked, setSuppChecked] = useState({})

  // Shared nutrition state — lives in Zustand so RosterPage profile NutritionTab can read it too
  const {
    athleteRecipes, setAthleteRecipes,
    athletePrepLog, setAthletePrepLog,
    athleteShoppingLists, setAthleteShoppingLists,
    boardPlans, setBoardPlans,
    loadAthleteNutrition, loadOrgRecipes, loadNutritionLogs,
    orgRecipes, orgRecipesLoaded,
  } = useNutritionStore()

  // Athlete's own ID (for real users, profile.id; fallback for demo)
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)

  // On mount for real users: load athlete nutrition data (prep log + shopping lists)
  useEffect(() => {
    if (isDemo) return
    if (!isStaff && MY_ATHLETE_ID) {
      loadAthleteNutrition(MY_ATHLETE_ID)
      loadNutritionLogs(MY_ATHLETE_ID, 30)
    }
    if (isStaff && activeOrgId) {
      loadOrgRecipes(activeOrgId, profile?.id)
    }
  }, [isDemo, isStaff, MY_ATHLETE_ID, activeOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deep-link: navigate to a specific tab (+ optionally pre-select athlete) on mount
  const plannerAthleteRef = useRef(null)
  useEffect(() => {
    if (nutritionDeepLink) {
      setTab(nutritionDeepLink.tab)
      if (nutritionDeepLink.athleteId) {
        plannerAthleteRef.current = nutritionDeepLink.athleteId
      }
      clearNutritionDeepLink()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const nutrition = isDemo ? MOCK_NUTRITION_TODAY : {
    plan:        { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
    actual:      { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
    compliance:  0,
    supplements: [],
    meals:       [],
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Nutrition</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {isStaff ? 'Manage athlete nutrition plans and compliance' : 'Targets, meal prep & shopping'}
          </p>
        </div>
        {!isStaff && (
          <Button size="sm" onClick={() => setLogOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Log Meal
          </Button>
        )}
      </div>

      <Tabs tabs={isStaff ? staffTabs : TABS} activeTab={tab} onChange={setTab} />

      {/* ── Athlete tabs ── */}
      {tab === 'dashboard' && !isStaff && <AthleteDashboardTab nutrition={nutrition} suppChecked={suppChecked} setSuppChecked={setSuppChecked} />}
      {tab === 'planner'   && !isStaff && <AthleteWeeklyPlannerTab nutrition={nutrition} />}
      {tab === 'preplog'   && !isStaff && <MealPrepLogTab />}
      {tab === 'pantry'    && !isStaff && <PantryTab isAdmin={false} athletePrepLog={athletePrepLog} setAthletePrepLog={setAthletePrepLog} athleteRecipes={athleteRecipes} />}
      {tab === 'shopping'  && !isStaff && <ShoppingListTab isStaff={false} athleteRecipes={athleteRecipes} athleteShoppingLists={athleteShoppingLists} setAthleteShoppingLists={setAthleteShoppingLists} athletePrepLog={athletePrepLog} boardPlans={boardPlans} />}

      {/* ── Staff tabs ── */}
      {tab === 'roster'    && isStaff && <StaffRoster isAdmin={isAdmin} />}
      {tab === 'meal_prep' && isStaff && <RecipesTab isStaff={isStaff} athleteRecipes={athleteRecipes} setAthleteRecipes={setAthleteRecipes} />}
      {tab === 'planner'   && isStaff && <MealPlannerBoard isAdmin={isAdmin} athleteRecipes={athleteRecipes} setAthleteRecipes={setAthleteRecipes} athletePrepLog={athletePrepLog} setAthletePrepLog={setAthletePrepLog} athleteShoppingLists={athleteShoppingLists} setAthleteShoppingLists={setAthleteShoppingLists} onBoardPlansChange={setBoardPlans} initialAthleteId={plannerAthleteRef.current} />}
      {tab === 'pantry'    && isStaff && <PantryTab isAdmin={isAdmin} athletePrepLog={athletePrepLog} setAthletePrepLog={setAthletePrepLog} athleteRecipes={athleteRecipes} />}
      {tab === 'shopping'  && isStaff && <ShoppingListTab isStaff={isStaff} athleteRecipes={athleteRecipes} athleteShoppingLists={athleteShoppingLists} setAthleteShoppingLists={setAthleteShoppingLists} athletePrepLog={athletePrepLog} boardPlans={boardPlans} />}
      {tab === 'team'      && isStaff && <StaffTeamOverview />}

      {/* Log Meal Modal */}
      <LogMealModal open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  )
}

// ─── Athlete Dashboard Tab ────────────────────────────────────────────────────
function AthleteDashboardTab({ nutrition, suppChecked, setSuppChecked }) {
  const { boardPlans, athletePrepLog, nutritionLogs } = useNutritionStore()
  const { isDemo, profile } = useAuthStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)
  const TODAY_DAY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
  // Compute current week's Monday → Sunday for subtitle labels
  const _wNow = new Date(); _wNow.setHours(0,0,0,0)
  const _wDow = _wNow.getDay()
  const _wMon = new Date(_wNow); _wMon.setDate(_wNow.getDate() - (_wDow === 0 ? 6 : _wDow - 1))
  const _wSun = new Date(_wMon); _wSun.setDate(_wMon.getDate() + 6)
  const _fmtW = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const currentWeekLabel = `${_fmtW(_wMon)} – ${_fmtW(_wSun)}, ${_wSun.getFullYear()}`
  const mockMealHistory = isDemo ? MOCK_MEAL_HISTORY : []

  // ── Live nutrition logs for real users ──
  const myLogs = isDemo ? [] : (nutritionLogs?.[MY_ATHLETE_ID] ?? [])
  // Today's actual macros from nutrition_logs
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayLogs = myLogs.filter(l => l.log_date === todayStr)
  const liveActual = {
    calories: todayLogs.reduce((s, l) => s + (l.calories_actual ?? 0), 0),
    protein:  todayLogs.reduce((s, l) => s + (l.protein_actual  ?? 0), 0),
    carbs:    todayLogs.reduce((s, l) => s + (l.carbs_actual    ?? 0), 0),
    fat:      todayLogs.reduce((s, l) => s + (l.fat_actual      ?? 0), 0),
  }

  // Body weight log — for real users, derive from nutrition_logs body_weight field
  const liveWeightLog = isDemo ? [
    { date: '2025-12-08', weight: 93.2 }, { date: '2025-12-15', weight: 93.0 },
    { date: '2025-12-22', weight: 92.8 }, { date: '2026-01-05', weight: 92.5 },
    { date: '2026-01-12', weight: 92.1 }, { date: '2026-01-19', weight: 91.8 },
    { date: '2026-01-26', weight: 91.5 }, { date: '2026-02-02', weight: 91.2 },
    { date: '2026-02-09', weight: 91.0 }, { date: '2026-02-16', weight: 90.8 },
    { date: '2026-02-23', weight: 90.5 }, { date: '2026-03-01', weight: 90.2 },
  ] : myLogs.filter(l => l.body_weight != null).map(l => ({ date: l.log_date, weight: l.body_weight })).reverse()

  const [bodyWeightLog, setBodyWeightLog] = useState(liveWeightLog)
  const [newWeight, setNewWeight] = useState('')
  const [logWeightOpen, setLogWeightOpen] = useState(false)
  const latestWeight = bodyWeightLog[bodyWeightLog.length - 1]?.weight ?? 0
  const firstWeight  = bodyWeightLog[0]?.weight ?? 0
  const weightChange = (latestWeight - firstWeight).toFixed(1)

  // ── Weekly compliance from live logs or mock history ──
  const weekStartStr = _wMon.toISOString().slice(0, 10)
  const weekLogs = isDemo
    ? mockMealHistory.filter(h => h.athlete_id === MY_ATHLETE_ID && h.date >= '2026-02-23')
    : myLogs.filter(l => l.log_date >= weekStartStr)
  const avgCompliance = weekLogs.length
    ? Math.round(weekLogs.reduce((s, h) => s + (h.compliance_score ?? h.compliance_pct ?? 0), 0) / weekLogs.length)
    : isDemo ? 84 : 0

  // Supplement streak — real users start at 0 (no supp table yet)
  const suppStreak = isDemo ? 8 : 0

  // Today's macros vs targets
  const todayHistory = isDemo ? mockMealHistory.find(h => h.athlete_id === MY_ATHLETE_ID && h.date === '2026-03-01') : null
  const todayActual  = isDemo ? (todayHistory?.totals ?? nutrition.actual) : liveActual
  const todayTargets = isDemo ? (todayHistory?.targets ?? nutrition.plan) : nutrition.plan

  // Live today's plan from board
  const liveDayPlan = boardPlans?.[MY_ATHLETE_ID]?.[TODAY_DAY]
  const todayPlanItems = liveDayPlan
    ? Object.values(liveDayPlan).flat().filter(Boolean)
    : []
  const plannedCals = todayPlanItems.reduce((s, i) => s + (i?.calories || 0), 0)
  const plannedProt = todayPlanItems.reduce((s, i) => s + (i?.protein  || 0), 0)

  // Prep availability
  const myPrepSessions = athletePrepLog?.[MY_ATHLETE_ID] ?? (isDemo ? MOCK_MEAL_PREP_LOG : [])
  const totalServingsLeft = myPrepSessions.flatMap(s => s.items || [])
    .reduce((sum, i) => sum + Math.max(0, (i.servings_made || 0) - (i.servings_consumed || 0)), 0)

  // Macro trend data (last 7 days from history or live logs)
  const macroTrend = isDemo
    ? mockMealHistory.filter(h => h.athlete_id === MY_ATHLETE_ID).slice(-7).map(h => ({
        date: new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' }),
        calories: h.totals.calories,
        target:   h.targets.calories,
        protein:  h.totals.protein,
        compliance: h.compliance_pct,
      }))
    : myLogs.slice(0, 7).map(l => ({
        date:       new Date(l.log_date).toLocaleDateString('en-US', { weekday: 'short' }),
        calories:   l.calories_actual ?? 0,
        target:     nutrition.plan.calories,
        protein:    l.protein_actual  ?? 0,
        compliance: l.compliance_score ?? null,
      }))

  const maxCal = Math.max(...macroTrend.map(d => d.target), 1)

  return (
    <div className="space-y-5">

      {/* ── KPI stat row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Today Calories" value={`${todayActual.calories}`} sub={`/ ${plannedCals || todayTargets.calories} kcal`} icon={Flame} color="orange" />
        <StatCard label="Today Protein"  value={`${todayActual.protein}g`}  sub={`/ ${plannedProt || todayTargets.protein}g target`} icon={Flame} color="blue" />
        <StatCard label="Week Compliance" value={`${avgCompliance}%`} sub="avg this week" icon={CheckCircle2} color={avgCompliance >= 85 ? 'green' : 'yellow'} />
        <StatCard label="Body Weight" value={`${latestWeight}kg`} sub={`${weightChange >= 0 ? '+' : ''}${weightChange}kg (12w)`} icon={TrendingUp} color={Number(weightChange) <= 0 ? 'green' : 'purple'} />
      </div>

      {/* ── Today's macro progress ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-400" />Today's Macros</CardTitle>
              <CardSubtitle>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {liveDayPlan ? 'Nutritionist Plan' : 'Your targets'}</CardSubtitle>
            </div>
            {isDemo && <span className="text-xs px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg font-medium">Training Day</span>}
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {[
            { label: 'Calories', actual: todayActual.calories, target: plannedCals || todayTargets.calories, unit: 'kcal', color: 'orange' },
            { label: 'Protein',  actual: todayActual.protein,  target: plannedProt || todayTargets.protein,  unit: 'g',    color: 'blue' },
            { label: 'Carbs',    actual: todayActual.carbs,    target: todayTargets.carbs,   unit: 'g',    color: 'purple' },
            { label: 'Fat',      actual: todayActual.fat,      target: todayTargets.fat,     unit: 'g',    color: 'yellow' },
          ].map(m => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 font-medium">{m.label}</span>
                <span className="text-zinc-300 font-semibold">{m.actual}{m.unit} <span className="text-zinc-500 font-normal">/ {m.target}{m.unit}</span></span>
              </div>
              <ProgressBar value={macroPercent(m.actual, m.target)} max={100} color={m.color} />
            </div>
          ))}
          {/* Hydration */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 font-medium flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400" />Hydration</span>
              <span className="text-zinc-300 font-semibold">{nutrition.actual.water}ml <span className="text-zinc-500 font-normal">/ {nutrition.plan.water}ml</span></span>
            </div>
            <ProgressBar value={nutrition.actual.water} max={nutrition.plan.water} color="blue" />
          </div>
          <div className="flex gap-2 pt-1">
            {[250, 500, 750].map(ml => (
              <button key={ml} className="flex-1 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-1.5 rounded-lg transition-colors">+{ml}ml</button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ── Weekly compliance chart ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Calorie Trend</CardTitle>
          <CardSubtitle>Actual vs target — last {macroTrend.length} days</CardSubtitle>
        </CardHeader>
        <CardBody>
          {macroTrend.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">No history yet this week.</p>
          ) : (
            <div className="space-y-2">
              {macroTrend.map((d, i) => {
                const pct = Math.min(100, Math.round((d.calories / maxCal) * 100))
                const tPct = Math.min(100, Math.round((d.target / maxCal) * 100))
                const comp = d.compliance
                const compColor = comp == null ? 'text-zinc-600' : comp >= 90 ? 'text-green-400' : comp >= 70 ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-8 flex-shrink-0">{d.date}</span>
                    <div className="flex-1 relative h-5 bg-zinc-800/60 rounded-full overflow-hidden">
                      {/* Target line */}
                      <div className="absolute top-0 bottom-0 w-0.5 bg-zinc-600/60 z-10" style={{ left: `${tPct}%` }} />
                      {/* Actual bar */}
                      <div className="absolute top-0 left-0 bottom-0 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct >= tPct * 0.85 ? 'rgb(34 197 94 / 0.5)' : 'rgb(234 179 8 / 0.5)' }} />
                    </div>
                    <span className="text-xs text-zinc-400 w-14 text-right flex-shrink-0">{d.calories} kcal</span>
                    <span className={cn('text-xs font-bold w-10 text-right flex-shrink-0', compColor)}>
                      {comp != null ? `${comp}%` : '—'}
                    </span>
                  </div>
                )
              })}
              <div className="flex gap-4 pt-1 text-xs text-zinc-600">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-zinc-600/60 inline-block" />Target</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-500/50 inline-block" />On track</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-yellow-500/50 inline-block" />Below target</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Body Weight ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" />Body Weight</CardTitle>
                <CardSubtitle>12-week trend · kg</CardSubtitle>
              </div>
              <Button size="xs" variant="outline" onClick={() => setLogWeightOpen(p => !p)}>
                <Plus className="w-3 h-3" /> Log
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {logWeightOpen && (
              <div className="flex gap-2">
                <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)}
                  placeholder="e.g. 90.1"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <Button size="sm" onClick={() => {
                  if (!newWeight) return
                  const w = Number(newWeight)
                  const today = new Date().toISOString().slice(0, 10)
                  setBodyWeightLog(prev => [...prev, { date: today, weight: w }])
                  if (!isDemo && MY_ATHLETE_ID) saveBodyWeight(MY_ATHLETE_ID, w, today)
                  setNewWeight(''); setLogWeightOpen(false)
                }}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setLogWeightOpen(false)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            )}
            {/* Mini sparkline */}
            <div className="flex items-end gap-1 h-20">
              {bodyWeightLog.slice(-12).map((entry, i, arr) => {
                const minW = Math.min(...arr.map(e => e.weight))
                const maxW = Math.max(...arr.map(e => e.weight))
                const range = maxW - minW || 1
                const heightPct = ((entry.weight - minW) / range) * 60 + 20
                const isLast = i === arr.length - 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    <div className={cn('w-full rounded-sm transition-all', isLast ? 'bg-purple-500' : 'bg-zinc-700/60')}
                      style={{ height: `${heightPct}%` }} />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{bodyWeightLog[0]?.date?.slice(5)}</span>
              <span className="font-semibold text-zinc-300">{latestWeight}kg</span>
              <span className={Number(weightChange) <= 0 ? 'text-green-400' : 'text-red-400'}>{weightChange >= 0 ? '+' : ''}{weightChange}kg</span>
            </div>
            <div className="pt-1 border-t border-zinc-800 space-y-1">
              {bodyWeightLog.slice(-4).reverse().map((e, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-zinc-300 font-semibold">{e.weight}kg</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* ── Supplements ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-400" />Supplements</CardTitle>
            <CardSubtitle>{suppStreak}-day streak · keep it up</CardSubtitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {nutrition.supplements.map((s, i) => (
              <button key={i}
                onClick={() => setSuppChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                className="w-full flex items-center gap-3 text-sm text-left hover:bg-zinc-700/30 px-3 py-2.5 rounded-lg transition-colors">
                {suppChecked[i] || s.taken
                  ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                  : <Circle       className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                }
                <span className={cn('flex-1 font-medium', suppChecked[i] || s.taken ? 'text-zinc-400 line-through' : 'text-zinc-200')}>
                  {s.name}
                </span>
                {(suppChecked[i] || s.taken) && (
                  <span className="text-xs text-green-500 flex-shrink-0">Done</span>
                )}
              </button>
            ))}
            {/* Streak visual */}
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1.5">Last 7 days</p>
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className={cn('flex-1 h-2 rounded-full', i < suppStreak % 7 ? 'bg-teal-500' : 'bg-zinc-700/60')} />
                ))}
              </div>
            </div>
            {/* Prep availability summary */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-500 flex items-center gap-1"><Package className="w-3 h-3" />Prepped servings ready</span>
              <span className="font-bold text-zinc-300">{totalServingsLeft}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ── Macro targets card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Flame className="w-4 h-4 text-zinc-400" />My Macro Targets</CardTitle>
          <CardSubtitle>Training Day vs Rest Day</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Training Day', plan: nutrition.plan, accent: 'border-purple-500/30 bg-purple-500/5' },
              { label: 'Rest Day',     plan: isDemo ? { calories: 2800, protein: 200, carbs: 300, fat: 85, water: 3500 } : { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 }, accent: 'border-zinc-700/40 bg-zinc-800/20' },
            ].map(({ label, plan, accent }) => (
              <div key={label} className={cn('rounded-xl border p-3 space-y-2', accent)}>
                <p className="text-xs font-semibold text-zinc-400">{label}</p>
                {[
                  { k: 'calories', l: 'Calories', u: 'kcal', c: 'text-orange-300' },
                  { k: 'protein',  l: 'Protein',  u: 'g',    c: 'text-blue-300' },
                  { k: 'carbs',    l: 'Carbs',    u: 'g',    c: 'text-purple-300' },
                  { k: 'fat',      l: 'Fat',      u: 'g',    c: 'text-yellow-300' },
                ].map(f => (
                  <div key={f.k} className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">{f.l}</span>
                    <span className={cn('text-sm font-bold', f.c)}>{plan[f.k]}{f.u}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

    </div>
  )
}

// ─── Athlete Weekly Planner Tab ───────────────────────────────────────────────
function AthleteWeeklyPlannerTab({ nutrition }) {
  const { boardPlans, athletePrepLog } = useNutritionStore()
  const { isDemo, profile } = useAuthStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)

  const BOARD_DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  const SLOT_LABELS    = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', 'pre-workout':'Pre-Workout', 'post-workout':'Post-Workout', supplements:'Supplements' }
  const SLOT_ORDER     = ['breakfast','pre-workout','lunch','snack','dinner','post-workout','supplements']
  const DAY_LABELS     = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' }
  // Dynamically compute the start of the current week (Monday)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ...
  const daysToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
  const WEEK_START = new Date(today)
  WEEK_START.setDate(today.getDate() + daysToMonday)
  WEEK_START.setHours(0, 0, 0, 0)
  const WEEK_END = new Date(WEEK_START)
  WEEK_END.setDate(WEEK_START.getDate() + 6)
  const weekLabel = `${WEEK_START.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${WEEK_END.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const TODAY_DAY_KEY = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][today.getDay()]

  // Use live board plan if available, else fall back to mock
  const { blocks: storeBlocks } = useTrainingStore()
  // Compute current block badge dynamically
  const activeBlock = storeBlocks.find(b => b.status === 'active') ?? (isDemo ? MOCK_TRAINING_BLOCKS?.find(b => b.status === 'active') : null)
  const blockBadge = activeBlock ? `${activeBlock.name}` : null
  const liveWeekPlan   = boardPlans?.[MY_ATHLETE_ID] ?? (isDemo ? MOCK_ATHLETE_MEAL_PLANS?.[MY_ATHLETE_ID] : undefined) ?? {}
  const [expandedDay, setExpandedDay] = useState(TODAY_DAY_KEY)
  // Track which items the athlete has marked eaten
  const [eatenOverride, setEatenOverride] = useState({}) // key: `${day}-${itemId}` → bool

  const toggleEaten = (day, itemId) => {
    const key = `${day}-${itemId}`
    setEatenOverride(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Build day summaries for the strip
  const daySummaries = BOARD_DAY_KEYS.map((dayKey, i) => {
    const d = new Date(WEEK_START); d.setDate(WEEK_START.getDate() + i)
    const dayPlan  = liveWeekPlan?.[dayKey] ?? {}
    const allItems = Object.values(dayPlan).flat().filter(Boolean)
    const totalItems  = allItems.length
    const eatenCount  = allItems.filter(item => {
      const key = `${dayKey}-${item.id}`
      return eatenOverride[key] ?? item.eaten ?? false
    }).length
    const compliance  = totalItems > 0 ? Math.round((eatenCount / totalItems) * 100) : null
    const totalCals   = allItems.reduce((s, i) => s + (i?.calories || 0), 0)
    const totalProt   = allItems.reduce((s, i) => s + (i?.protein  || 0), 0)
    const hasItems    = totalItems > 0
    const isPast      = d < today // before today
    const isToday     = dayKey === TODAY_DAY_KEY
    return { dayKey, label: DAY_LABELS[dayKey], date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), hasItems, totalItems, eatenCount, compliance, totalCals, totalProt, isPast, isToday }
  })

  const expandedDayPlan = liveWeekPlan?.[expandedDay] ?? {}
  const slotsWithItems = SLOT_ORDER.filter(s => Array.isArray(expandedDayPlan[s]) && expandedDayPlan[s].length > 0)
  const expandedAllItems = slotsWithItems.flatMap(s => expandedDayPlan[s]).filter(Boolean)
  const expandedTotalCal  = expandedAllItems.reduce((s, i) => s + (i?.calories || 0), 0)
  const expandedTotalProt = expandedAllItems.reduce((s, i) => s + (i?.protein  || 0), 0)
  const expandedTotalCarb = expandedAllItems.reduce((s, i) => s + (i?.carbs    || 0), 0)
  const expandedTotalFat  = expandedAllItems.reduce((s, i) => s + (i?.fat      || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-400" />My Meal Plan</CardTitle>
              <CardSubtitle>Week of {weekLabel} · Set by your nutritionist</CardSubtitle>
            </div>
            {blockBadge && (
              <span className="text-xs px-2 py-1 rounded-lg border bg-purple-500/10 border-purple-500/20 text-purple-300 font-medium">
                {blockBadge}
              </span>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {/* Day strip */}
          <div className="grid grid-cols-7 gap-1.5">
            {daySummaries.map(day => {
              const compColor = day.compliance == null ? '' : day.compliance >= 80 ? 'text-green-400' : day.compliance >= 50 ? 'text-yellow-400' : 'text-red-400'
              return (
                <button key={day.dayKey}
                  onClick={() => setExpandedDay(prev => prev === day.dayKey ? null : day.dayKey)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors text-center',
                    expandedDay === day.dayKey
                      ? 'bg-purple-500/20 border-purple-500/40'
                      : day.isToday
                      ? 'bg-zinc-700/60 border-zinc-500/60'
                      : day.isPast
                      ? 'bg-zinc-800/30 border-zinc-700/30 opacity-60'
                      : 'bg-zinc-800/20 border-zinc-700/30 hover:border-zinc-600/50'
                  )}>
                  <span className={cn('text-xs font-bold', expandedDay === day.dayKey ? 'text-purple-200' : day.isToday ? 'text-zinc-200' : 'text-zinc-400')}>{day.label}</span>
                  <span className="text-xs text-zinc-600">{day.date}</span>
                  {day.hasItems ? (
                    <>
                      <span className={cn('text-xs font-bold', compColor)}>
                        {day.compliance != null ? `${day.compliance}%` : `${day.totalItems}x`}
                      </span>
                      <span className="text-xs text-zinc-600">{day.totalCals > 0 ? `${day.totalCals}k` : ''}</span>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-700">—</span>
                  )}
                  {day.isToday && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Expanded day detail */}
      {expandedDay && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-zinc-400" />
                  {DAY_LABELS[expandedDay]} — {daySummaries.find(d => d.dayKey === expandedDay)?.date}
                  {expandedDay === TODAY_DAY_KEY && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">Today</span>
                  )}
                </CardTitle>
                {expandedTotalCal > 0 && (
                  <CardSubtitle>
                    {expandedTotalCal} kcal · {expandedTotalProt}g protein · {expandedTotalCarb}g carbs · {expandedTotalFat}g fat
                  </CardSubtitle>
                )}
              </div>
              {/* Compliance ring for this day */}
              {(() => {
                const ds = daySummaries.find(d => d.dayKey === expandedDay)
                if (!ds?.compliance != null || !ds?.totalItems) return null
                const pct = ds.compliance ?? 0
                const col = pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div className="flex flex-col items-center">
                    <span className={cn('text-2xl font-black', col)}>{pct}%</span>
                    <span className="text-xs text-zinc-500">{ds.eatenCount}/{ds.totalItems} eaten</span>
                  </div>
                )
              })()}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {slotsWithItems.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">No meals planned for this day yet.<br/><span className="text-zinc-700">Your nutritionist will add items here.</span></p>
            ) : (
              slotsWithItems.map(slot => (
                <div key={slot}>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    {SLOT_LABELS[slot] ?? slot}
                  </p>
                  <div className="space-y-2">
                    {expandedDayPlan[slot].filter(Boolean).map((item, idx) => {
                      const overrideKey = `${expandedDay}-${item.id}`
                      const eaten = eatenOverride[overrideKey] ?? item.eaten ?? false
                      const name  = item.name || item.recipe_name || 'Unknown'
                      return (
                        <div key={item.id ?? idx}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                            eaten
                              ? 'bg-green-500/5 border-green-500/20 opacity-70'
                              : 'bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600/50'
                          )}>
                          <button onClick={() => item.id && toggleEaten(expandedDay, item.id)}
                            className="flex-shrink-0 transition-colors">
                            {eaten
                              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                              : <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                            }
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', eaten ? 'line-through text-zinc-500' : 'text-zinc-200')}>{name}</p>
                            {item.notes && <p className="text-xs text-zinc-600 truncate italic">{item.notes}</p>}
                            {item.source === 'prep' && <p className="text-xs text-teal-600">From prep log</p>}
                          </div>
                          <div className="flex gap-2 text-xs flex-shrink-0">
                            {(item.calories || 0) > 0 && <span className="text-orange-300">{item.calories} kcal</span>}
                            {(item.protein  || 0) > 0 && <span className="text-blue-400">{item.protein}g P</span>}
                            {(item.servings || 0) > 1 && <span className="text-zinc-600">×{item.servings}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ─── Combined My Plan ─────────────────────────────────────────────────────────
function CombinedMyPlan({ nutrition }) {
  // Pull live data from the shared nutrition store (same data the nutritionist manages)
  const { boardPlans, athleteRecipes, athletePrepLog } = useNutritionStore()
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { goals } = useGoalsStore()
  const { blocks, meets } = useTrainingStore()
  // Real athlete id for real users
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)

  // Live plan from the nutritionist's board (today = Sunday Mar 1 = 'sunday')
  const TODAY_DAY = 'sunday'
  const liveDayPlan = boardPlans?.[MY_ATHLETE_ID]?.[TODAY_DAY] || null
  const myLiveRecipes = athleteRecipes?.[MY_ATHLETE_ID] ?? []
  const myPrepSessions = athletePrepLog?.[MY_ATHLETE_ID] ?? []

  // ── Nutrition plan state (from old AthleteViewPlan) ──
  const [editing, setEditing] = useState(false)
  const [trainingDay, setTrainingDay] = useState({
    calories: nutrition.plan.calories, protein: nutrition.plan.protein,
    carbs: nutrition.plan.carbs, fat: nutrition.plan.fat, fiber: 35, water: nutrition.plan.water / 1000,
  })
  const [restDay, setRestDay] = useState({ calories: 2800, protein: 200, carbs: 300, fat: 85, fiber: 35, water: 3.5 })
  const [coachNotes, setCoachNotes] = useState(
    'High protein to support muscle retention during the intensification block. Keep carbs elevated on training days to fuel heavy work. Reduce fat slightly to stay within calorie targets. Check in weekly with bodyweight and energy levels.'
  )

  // ── Meal / supplement checklist — synced from live board plan when available ──
  const [mealChecks, setMealChecks] = useState(() => {
    // First try: use the live board plan from the nutritionist
    if (liveDayPlan) {
      return Object.entries(liveDayPlan).flatMap(([slot, items]) =>
        (items || []).filter(i => i && (i.name || i.recipe_name)).map(item => ({
          id: `live-${item.id || slot + Date.now()}`,
          name: item.name || item.recipe_name,
          type: slot === 'supplements' ? 'supplement' : 'meal',
          meal_slot: slot,
          calories: item.calories || 0,
          protein: item.protein || 0,
          source: 'nutritionist',
          notes: item.notes || '',
          checked: item.eaten || false,
        }))
      )
    }
    // Fallback: static mock plan
    const todayKey = 'saturday'
    const mockMealPlans = isDemo ? MOCK_ATHLETE_MEAL_PLANS : {}
    const todayPlan = mockMealPlans[MY_ATHLETE_ID]?.[todayKey]
    const planItems = todayPlan
      ? Object.entries(todayPlan).flatMap(([slot, items]) =>
          items.map(item => ({
            id: `plan-${item.id}`,
            name: item.name,
            type: slot === 'supplements' ? 'supplement' : 'meal',
            meal_slot: slot,
            calories: item.calories * (item.servings || 1),
            protein: item.protein * (item.servings || 1),
            source: 'nutritionist',
            notes: item.notes,
            checked: false,
          }))
        )
      : []
    const mockPrepLog = isDemo ? MOCK_MEAL_PREP_LOG : []
    const currentSession = mockPrepLog.find(s => s.id === 'mpl-001')
    const prepIds = new Set(planItems.map(i => i.name))
    const prepItems = (currentSession?.items ?? [])
      .filter(item => !prepIds.has(item.recipe_name))
      .map(item => ({
        id: `assigned-${item.id}`,
        prepItemId: item.id,
        sessionName: currentSession.label,
        name: item.recipe_name,
        type: 'meal',
        meal_slot: 'lunch',
        calories: item.macros_per_serving?.calories ?? 0,
        protein: item.macros_per_serving?.protein ?? 0,
        servingsLeft: (item.servings_made ?? 0) - (item.servings_consumed ?? 0),
        source: 'prep_log',
        checked: false,
      }))
    return planItems.length > 0 ? planItems : [...prepItems, ...[
      { id: 'supp-1', name: 'Creatine Monohydrate (5g)', type: 'supplement', meal_slot: 'supplements', calories: 0, protein: 0, source: 'custom', checked: false },
      { id: 'supp-2', name: 'Whey Protein (1 scoop)', type: 'supplement', meal_slot: 'supplements', calories: 130, protein: 25, source: 'custom', checked: false },
      { id: 'supp-3', name: 'Omega-3 Fish Oil (2 caps)', type: 'supplement', meal_slot: 'supplements', calories: 20, protein: 0, source: 'custom', checked: false },
    ]]
  })
  const [customItems, setCustomItems] = useState([])
  const [addCustomOpen, setAddCustomOpen] = useState(false)
  const [addCustomForm, setAddCustomForm] = useState({ name: '', type: 'meal', calories: '', protein: '' })
  const [checklistFilter, setChecklistFilter] = useState('all') // 'all' | 'meals' | 'supplements' | 'custom'
  const [showChecked, setShowChecked] = useState(false)

  // ── Weekly day strip — derives compliance from live board plan + meal history ──
  const weekDays = useMemo(() => {
    const FALLBACK_TYPES = ['training','rest','training','training','rest','training','rest']
    const FALLBACK_COMPLIANCE = [92, null, 88, 75, null, 100, null]
    const days = []
    // Compute current week's Monday
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
    const start = new Date(now)
    start.setDate(now.getDate() - ((dayOfWeek === 0 ? 7 : dayOfWeek) - 1)) // rewind to Monday
    const BOARD_DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    const liveWeekPlan = boardPlans?.[MY_ATHLETE_ID] ?? null
    // Determine which days have prep session coverage from the athlete's prep log
    const prepDates = new Set(
      myPrepSessions.flatMap(s =>
        s.prep_date ? [s.prep_date] : []
      )
    )
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayKey  = BOARD_DAY_KEYS[i]
      // Live compliance: count checked items / total items for that day
      let compliance = FALLBACK_COMPLIANCE[i]
      if (liveWeekPlan?.[dayKey]) {
        const dayItems = Object.values(liveWeekPlan[dayKey]).flat().filter(Boolean)
        if (dayItems.length > 0) {
          const eaten = dayItems.filter(item => item.eaten).length
          compliance = Math.round((eaten / dayItems.length) * 100)
        }
      }
      // Determine day type from plan if available, else fallback
      const dayType = liveWeekPlan?.[dayKey]?._type ?? FALLBACK_TYPES[i]
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        type: dayType,
        compliance,
        prepSession: prepDates.has(dateStr) ? 'Prep Session' : null,
        isToday: dayKey === TODAY_DAY,
      })
    }
    return days
  }, [boardPlans, myPrepSessions])
  const [checkedDays, setCheckedDays] = useState({ 0: true, 1: true, 2: true })
  const toggleDay = (i) => setCheckedDays(prev => ({ ...prev, [i]: !prev[i] }))

  const fields = [
    { key: 'calories', label: 'Calories', unit: 'kcal' },
    { key: 'protein',  label: 'Protein',  unit: 'g' },
    { key: 'carbs',    label: 'Carbs',    unit: 'g' },
    { key: 'fat',      label: 'Fat',      unit: 'g' },
    { key: 'fiber',    label: 'Fiber',    unit: 'g' },
    { key: 'water',    label: 'Water',    unit: 'L' },
  ]

  // ── Context data ──
  const activeBlock = blocks.find(b => b.status === 'active') ?? (isDemo ? MOCK_TRAINING_BLOCKS.find(b => b.status === 'active') : null)
  const upcomingMeet = meets.find(m => m.id === 'meet-1') ?? (isDemo ? MOCK_MEETS.find(m => m.id === 'meet-1') : null)
  // Use real goals for real users (first 3 goals), fall back to mock for demo
  const linkedGoals = isDemo
    ? (goals.length ? goals.filter(g => ['g1','g3','g4'].includes(g.id)) : MOCK_GOALS.filter(g => ['g1','g3','g4'].includes(g.id)))
    : goals.slice(0, 3)
  const daysToMeet = upcomingMeet
    ? Math.ceil((new Date(upcomingMeet.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  // ── Checklist helpers ──
  const allCheckItems = [...mealChecks, ...customItems]
  const filterItems = (items) => {
    if (checklistFilter === 'meals') return items.filter(i => i.type === 'meal')
    if (checklistFilter === 'supplements') return items.filter(i => i.type === 'supplement')
    if (checklistFilter === 'custom') return items.filter(i => i.type === 'custom')
    return items
  }
  const unchecked = filterItems(allCheckItems).filter(i => !i.checked)
  const checked   = filterItems(allCheckItems).filter(i => i.checked)

  const toggleCheck = (id) => {
    setMealChecks(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
    setCustomItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }
  const removeCustom = (id) => setCustomItems(prev => prev.filter(i => i.id !== id))
  const addCustomItem = () => {
    if (!addCustomForm.name.trim()) return
    setCustomItems(prev => [...prev, {
      id: `custom-${Date.now()}`,
      name: addCustomForm.name.trim(),
      type: addCustomForm.type,
      calories: Number(addCustomForm.calories) || 0,
      protein: Number(addCustomForm.protein) || 0,
      checked: false,
    }])
    setAddCustomForm({ name: '', type: 'meal', calories: '', protein: '' })
    setAddCustomOpen(false)
  }

  const typeLabel = { meal: 'Meal', supplement: 'Supplement', custom: 'Custom' }
  const typeBadge = { meal: 'bg-purple-500/15 text-purple-300', supplement: 'bg-teal-500/15 text-teal-300', custom: 'bg-zinc-700/60 text-zinc-400' }

  return (
    <div className="space-y-4">

      {/* ── Context Banner ── */}
      {activeBlock && (
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardBody className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-purple-400 font-semibold uppercase tracking-wider">{activeBlock.type || 'Active Block'}</p>
                  <p className="text-sm font-bold text-zinc-100">{activeBlock.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {new Date(activeBlock.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                    {new Date(activeBlock.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              {daysToMeet && (
                <div className="flex items-center gap-2 bg-zinc-800/60 px-3 py-2 rounded-xl border border-zinc-700/50">
                  <CalendarDays className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-lg font-black text-zinc-100 leading-none">{daysToMeet}</p>
                    <p className="text-xs text-zinc-500">days to {upcomingMeet.name.split(' ').slice(0,2).join(' ')}</p>
                  </div>
                </div>
              )}
            </div>
            {linkedGoals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {linkedGoals.map(g => (
                  <div key={g.id} className="flex items-center gap-1.5 text-xs bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-2.5 py-1">
                    <Target className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="text-zinc-300 font-medium">{g.label || g.name}</span>
                    {g.current != null && g.target != null && (
                      <span className="text-zinc-500 ml-1">{g.current} / {g.target}{g.unit || ''}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Nutrition Plan ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nutrition Plan</CardTitle>
              <CardSubtitle>{isDemo ? 'Assigned by Dr. Priya · Updated Feb 2026' : 'Your macro targets for training and rest days'}</CardSubtitle>
            </div>
            {editing ? (
              <div className="flex gap-2">
                <Button size="xs" variant="ghost" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /> Cancel</Button>
                <Button size="xs" onClick={async () => {
                  setEditing(false)
                  if (!isDemo && MY_ATHLETE_ID && activeOrgId) {
                    await saveNutritionPlan(MY_ATHLETE_ID, MY_ATHLETE_ID, activeOrgId, {
                      name: 'My Nutrition Plan',
                      calories_training: Number(trainingDay.calories) || 0,
                      calories_rest: Number(restDay.calories) || 0,
                      protein_g: Number(trainingDay.protein) || 0,
                      carbs_g: Number(trainingDay.carbs) || 0,
                      fat_g: Number(trainingDay.fat) || 0,
                      fiber_g: Number(trainingDay.fiber) || 0,
                      water_ml: Number(trainingDay.water) * 1000 || 0,
                      coach_notes: coachNotes,
                    })
                  }
                }}><Save className="w-3.5 h-3.5" /> Save</Button>
              </div>
            ) : (
              <Button size="xs" variant="outline" onClick={() => setEditing(true)}><Edit2 className="w-3.5 h-3.5" /> Edit</Button>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'Training Day', state: trainingDay, setState: setTrainingDay },
              { title: 'Rest Day',     state: restDay,     setState: setRestDay },
            ].map(({ title, state, setState }) => (
              <div key={title}>
                <p className="text-xs font-semibold text-zinc-400 mb-3">{title} Targets</p>
                <div className="space-y-2">
                  {fields.map((f) => (
                    <div key={f.key} className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                      <span className="text-sm text-zinc-400">{f.label}</span>
                      {editing ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={state[f.key]}
                            onChange={e => setState(prev => ({ ...prev, [f.key]: e.target.value }))}
                            className="w-20 text-right bg-zinc-700 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                          <span className="text-xs text-zinc-500 w-8">{f.unit}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-zinc-200">{state[f.key]}{f.unit}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {editing ? (
            <textarea value={coachNotes} onChange={e => setCoachNotes(e.target.value)} rows={3}
              className="mt-4 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none leading-relaxed" />
          ) : (
            <div className="mt-4 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/40">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Coach Notes
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{coachNotes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Weekly Checklist ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-400" />Week Overview
          </CardTitle>
          <CardSubtitle>{currentWeekLabel} · Track your daily targets</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((day, i) => {
              const isChecked = checkedDays[i]
              const past = i < 3
              const compColor = day.compliance == null ? '' : day.compliance >= 90 ? 'text-green-400' : day.compliance >= 70 ? 'text-yellow-400' : 'text-red-400'
              return (
                <div key={i} className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors text-center',
                  isChecked ? 'bg-green-500/10 border-green-500/30' : day.isToday ? 'bg-purple-500/10 border-purple-500/30' : past ? 'bg-zinc-800/40 border-zinc-700/40' : 'bg-zinc-800/20 border-zinc-700/30'
                )}>
                  <span className="text-xs font-bold text-zinc-300">{day.label}</span>
                  <span className="text-xs text-zinc-500">{day.date}</span>
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    day.type === 'training' ? 'bg-purple-500/20 text-purple-300' : 'bg-zinc-700/50 text-zinc-500'
                  )}>{day.type === 'training' ? 'Train' : 'Rest'}</span>
                  {day.compliance != null ? (
                    <span className={cn('text-xs font-bold', compColor)}>{day.compliance}%</span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                  {past ? (
                    <button onClick={() => toggleDay(i)}
                      className={cn('mt-0.5 transition-colors', isChecked ? 'text-green-400' : 'text-zinc-600 hover:text-zinc-400')}>
                      {isChecked ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                  ) : (
                    <Circle className="w-4 h-4 mt-0.5 text-zinc-700" />
                  )}
                  {day.prepSession && (
                    <Package className="w-3 h-3 text-zinc-600" />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-green-400" />Targets met</span>
            <span className="flex items-center gap-1.5"><Package className="w-3 h-3 text-zinc-500" />Prep session available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-purple-500/40 inline-block" />Training day</span>
          </div>
        </CardBody>
      </Card>

      {/* ── This Week's Nutritionist Plan ── */}
      {(() => {
        const BOARD_DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        const SLOT_LABELS    = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', 'pre-workout':'Pre-Workout', 'post-workout':'Post-Workout', supplements:'Supplements' }
        const SLOT_ORDER     = ['breakfast','pre-workout','lunch','snack','dinner','post-workout','supplements']
        const liveWeekPlan   = boardPlans?.[MY_ATHLETE_ID] ?? null
        const hasPlan        = liveWeekPlan && Object.values(liveWeekPlan).some(day =>
          Object.values(day || {}).some(slot => Array.isArray(slot) && slot.length > 0)
        )
        const [expandedDay, setExpandedDay] = useState(TODAY_DAY)

        if (!hasPlan) return null

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" />This Week's Plan
              </CardTitle>
              <CardSubtitle>Set by your nutritionist · {currentWeekLabel}</CardSubtitle>
            </CardHeader>
            <CardBody className="space-y-2">
              {/* Day selector strip */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {BOARD_DAY_KEYS.map((dayKey, i) => {
                  const dayPlan = liveWeekPlan?.[dayKey] ?? {}
                  const totalItems = Object.values(dayPlan).flat().filter(Boolean).length
                  const eatenItems = Object.values(dayPlan).flat().filter(x => x?.eaten).length
                  const pct = totalItems > 0 ? Math.round((eatenItems / totalItems) * 100) : null
                  const isToday = dayKey === TODAY_DAY
                  const dayLabel = weekDays[i]?.label ?? dayKey.slice(0,3)
                  return (
                    <button key={dayKey}
                      onClick={() => setExpandedDay(prev => prev === dayKey ? null : dayKey)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors flex-shrink-0',
                        expandedDay === dayKey
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                          : isToday
                          ? 'bg-zinc-700/60 border-zinc-600/60 text-zinc-200'
                          : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
                      )}>
                      <span>{dayLabel}</span>
                      {totalItems > 0 ? (
                        <span className={cn('font-bold', pct != null
                          ? pct >= 80 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-zinc-400'
                          : 'text-zinc-500'
                        )}>
                          {pct != null ? `${pct}%` : `${totalItems}x`}
                        </span>
                      ) : (
                        <span className="text-zinc-700">—</span>
                      )}
                      {isToday && <span className="w-1 h-1 rounded-full bg-purple-400 mt-0.5" />}
                    </button>
                  )
                })}
              </div>

              {/* Expanded day detail */}
              {expandedDay && (() => {
                const dayPlan = liveWeekPlan?.[expandedDay] ?? {}
                const slotsWithItems = SLOT_ORDER.filter(s => Array.isArray(dayPlan[s]) && dayPlan[s].length > 0)
                if (slotsWithItems.length === 0) {
                  return <p className="text-xs text-zinc-600 text-center py-4">No items planned for this day yet.</p>
                }
                return (
                  <div className="space-y-3 mt-1">
                    {slotsWithItems.map(slot => (
                      <div key={slot}>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                          {SLOT_LABELS[slot] ?? slot}
                        </p>
                        <div className="space-y-1.5">
                          {dayPlan[slot].filter(Boolean).map((item, idx) => {
                            const calories = item.calories || item.cal || 0
                            const protein  = item.protein || item.prot || 0
                            const name     = item.name || item.recipe_name || 'Unknown item'
                            const eaten    = item.eaten ?? false
                            return (
                              <div key={item.id ?? idx}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-xl border',
                                  eaten
                                    ? 'bg-green-500/5 border-green-500/20 opacity-60'
                                    : 'bg-zinc-800/40 border-zinc-700/40'
                                )}>
                                {eaten
                                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                                  : <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                                }
                                <span className={cn('flex-1 text-sm truncate', eaten ? 'line-through text-zinc-500' : 'text-zinc-200')}>
                                  {name}
                                </span>
                                <div className="flex gap-2 text-xs flex-shrink-0">
                                  {calories > 0 && <span className="text-zinc-500">{calories} kcal</span>}
                                  {protein  > 0 && <span className="text-blue-400">{protein}g P</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {/* Day macro summary */}
                    {(() => {
                      const allItems = slotsWithItems.flatMap(s => dayPlan[s]).filter(Boolean)
                      const totalCal  = allItems.reduce((s, i) => s + (i.calories || 0), 0)
                      const totalProt = allItems.reduce((s, i) => s + (i.protein  || 0), 0)
                      const totalCarb = allItems.reduce((s, i) => s + (i.carbs    || 0), 0)
                      const totalFat  = allItems.reduce((s, i) => s + (i.fat      || 0), 0)
                      if (!totalCal && !totalProt) return null
                      return (
                        <div className="pt-2 border-t border-zinc-800 flex gap-4 text-xs text-zinc-500">
                          <span className="text-zinc-400 font-semibold">Daily totals:</span>
                          {totalCal  > 0 && <span className="text-orange-300">{totalCal} kcal</span>}
                          {totalProt > 0 && <span className="text-blue-400">{totalProt}g protein</span>}
                          {totalCarb > 0 && <span className="text-yellow-400">{totalCarb}g carbs</span>}
                          {totalFat  > 0 && <span className="text-pink-400">{totalFat}g fat</span>}
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}
            </CardBody>
          </Card>
        )
      })()}

      {/* ── Meal & Supplement Checklist ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-teal-400" />Today's Checklist
              </CardTitle>
              <CardSubtitle>{unchecked.length} item{unchecked.length !== 1 ? 's' : ''} remaining · {liveDayPlan ? 'Nutritionist Plan' : 'Week 8 Prep'}</CardSubtitle>
            </div>
            <Button size="xs" variant="outline" onClick={() => setAddCustomOpen(p => !p)}>
              <Plus className="w-3 h-3" /> Add Item
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {['all','meals','supplements','custom'].map(f => (
              <button key={f} onClick={() => setChecklistFilter(f)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize',
                  checklistFilter === f
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 hover:text-zinc-300'
                )}>
                {f === 'all' ? 'All' : f === 'meals' ? 'Meals' : f === 'supplements' ? 'Supplements' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Add custom item form */}
          {addCustomOpen && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-zinc-400">Add a meal, supplement, or item</p>
              <div className="flex gap-2">
                <input value={addCustomForm.name} onChange={e => setAddCustomForm(p => ({ ...p, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                  placeholder="Item name…"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                <select value={addCustomForm.type} onChange={e => setAddCustomForm(p => ({ ...p, type: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="meal">Meal</option>
                  <option value="supplement">� Supplement</option>
                  <option value="custom">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input type="number" value={addCustomForm.calories} onChange={e => setAddCustomForm(p => ({ ...p, calories: e.target.value }))}
                  placeholder="Calories"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                <input type="number" value={addCustomForm.protein} onChange={e => setAddCustomForm(p => ({ ...p, protein: e.target.value }))}
                  placeholder="Protein (g)"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-teal-500" />
                <Button size="sm" onClick={addCustomItem}><Check className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setAddCustomOpen(false)}><X className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          )}

          {/* Unchecked items — grouped by meal slot if nutritionist-assigned */}
          <div className="space-y-3">
            {(() => {
              // Group unchecked items by meal_slot
              const slots = ['breakfast','pre-workout','lunch','snack','dinner','post-workout','supplements']
              const SLOT_ICONS_MAP = {}
              const SLOT_LABEL_MAP = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', 'pre-workout':'Pre-Workout', 'post-workout':'Post-Workout', supplements:'Supplements' }
              const grouped = {}
              unchecked.forEach(item => {
                const slot = item.meal_slot || 'other'
                if (!grouped[slot]) grouped[slot] = []
                grouped[slot].push(item)
              })
              const groupOrder = slots.filter(s => grouped[s]?.length > 0)
              if (grouped['other']?.length > 0) groupOrder.push('other')

              if (groupOrder.length === 0) {
                return <p className="text-center text-xs text-zinc-600 py-3">All items checked off</p>
              }

              return groupOrder.map(slot => (
                <div key={slot}>
                  <p className="text-xs font-semibold text-zinc-500 mb-1.5 flex items-center gap-1.5">
                    {SLOT_LABEL_MAP[slot] ?? 'Other'}
                    {grouped[slot].some(i => i.source === 'nutritionist') && (
                      <span className="text-xs px-1.5 py-0.5 rounded border font-medium text-purple-400 bg-purple-500/10 border-purple-500/20">Nutritionist Plan</span>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {grouped[slot].map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2.5 bg-zinc-800/40 rounded-xl border border-zinc-700/40 group">
                        <button onClick={() => toggleCheck(item.id)}
                          className="text-zinc-600 hover:text-green-400 transition-colors flex-shrink-0">
                          <Circle className="w-4 h-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 truncate">{item.name}</p>
                          {item.notes && <p className="text-xs text-zinc-600 truncate italic">{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeBadge[item.type])}>
                            {item.type === 'meal' ? 'M' : item.type === 'supplement' ? 'S' : 'C'}
                          </span>
                          {item.calories > 0 && (
                            <span className="text-xs text-zinc-500">{item.calories} kcal</span>
                          )}
                          {item.protein > 0 && (
                            <span className="text-xs text-blue-400">{item.protein}g P</span>
                          )}
                          {item.type === 'custom' && (
                            <button onClick={() => removeCustom(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>

          {/* Checked items collapsible */}
          {checked.length > 0 && (
            <div>
              <button onClick={() => setShowChecked(p => !p)}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-400 transition-colors">
                {showChecked ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {checked.length} eaten / taken
              </button>
              {showChecked && (
                <div className="mt-2 space-y-1.5">
                  {checked.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl opacity-50">
                      <button onClick={() => toggleCheck(item.id)} className="text-green-500 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <span className="flex-1 text-sm text-zinc-400 line-through truncate">{item.name}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeBadge[item.type])}>
                        {item.type === 'meal' ? 'M' : item.type === 'supplement' ? 'S' : 'C'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary bar */}
          {allCheckItems.some(i => i.checked) && (
            <div className="pt-2 border-t border-zinc-800 flex gap-4 text-xs text-zinc-500">
              <span className="text-zinc-400 font-medium">Eaten today:</span>
              <span className="text-orange-300">
                {allCheckItems.filter(i => i.checked).reduce((s, i) => s + (i.calories || 0), 0)} kcal
              </span>
              <span className="text-blue-400">
                {allCheckItems.filter(i => i.checked).reduce((s, i) => s + (i.protein || 0), 0)}g protein
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Injury Tracker ── */}
      <InjuryTracker />
    </div>
  )
}

// ─── Injury Tracker ──────────────────────────────────────────────────────────
function InjuryTracker() {
  const { isDemo, profile } = useAuthStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : (profile?.id ?? null)
  const [injuries, setInjuries] = useState(isDemo ? MOCK_INJURY_LOGS : [])
  const [logModal, setLogModal] = useState(null)      // injury id to log update for
  const [addModal, setAddModal] = useState(false)
  const [resolveConfirm, setResolveConfirm] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedHistory, setExpandedHistory] = useState(null)

  // log update form
  const [logForm, setLogForm] = useState({ date: '', pain_level: 5, note: '' })
  // add injury form
  const [addForm, setAddForm] = useState({ body_area: '', pain_level: 5, description: '', movement_affected: '', injury_date: new Date().toISOString().slice(0,10) })

  // Load injuries from Supabase for real users on mount
  useEffect(() => {
    if (isDemo || !MY_ATHLETE_ID) return
    import('../lib/supabase').then(({ fetchAthleteInjuries }) => {
      fetchAthleteInjuries(MY_ATHLETE_ID).then(data => {
        if (data?.length) setInjuries(data.map(inj => ({
          ...inj,
          movement_affected: inj.movement_affected ?? [],
          log_history: inj.log_history ?? [],
        })))
      })
    })
  }, [isDemo, MY_ATHLETE_ID]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = injuries.filter(i => !i.resolved)
  const resolved = injuries.filter(i => i.resolved)

  const painColor = (level) => {
    if (level <= 2) return 'text-green-400 bg-green-500/15 border-green-500/30'
    if (level <= 4) return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
    if (level <= 6) return 'text-orange-400 bg-orange-500/15 border-orange-500/30'
    return 'text-red-400 bg-red-500/15 border-red-500/30'
  }
  const painLabel = (level) => {
    if (level <= 2) return 'Mild'
    if (level <= 4) return 'Moderate'
    if (level <= 6) return 'Significant'
    return 'Severe'
  }

  const submitLog = async () => {
    if (!logForm.date || !logForm.note.trim()) return
    setInjuries(prev => prev.map(inj => {
      if (inj.id !== logModal) return inj
      return {
        ...inj,
        pain_level: logForm.pain_level,
        log_history: [...(inj.log_history ?? []), { date: logForm.date, pain_level: logForm.pain_level, note: logForm.note, reporter: 'athlete' }],
      }
    }))
    if (!isDemo && logModal && !String(logModal).startsWith('inj-')) {
      await updateInjury(logModal, { pain_level: logForm.pain_level, coach_notes: logForm.note })
    }
    setLogModal(null)
    setLogForm({ date: '', pain_level: 5, note: '' })
  }

  const submitAdd = async () => {
    if (!addForm.body_area.trim() || !addForm.description.trim()) return
    const newInj = {
      id: `inj-${Date.now()}`,
      athlete_id: MY_ATHLETE_ID,
      body_area: addForm.body_area,
      pain_level: addForm.pain_level,
      injury_date: addForm.injury_date,
      description: addForm.description,
      movement_affected: addForm.movement_affected.split(',').map(s => s.trim()).filter(Boolean),
      resolved: false, resolved_date: null,
      reported_to_coach: false, coach_notes: '',
      log_history: [{ date: addForm.injury_date, pain_level: addForm.pain_level, note: 'Initial report.', reporter: 'athlete' }],
    }
    setInjuries(prev => [...prev, newInj])
    if (!isDemo && MY_ATHLETE_ID) {
      const saved = await reportInjury(MY_ATHLETE_ID, {
        body_area: addForm.body_area,
        pain_level: addForm.pain_level,
        injury_date: addForm.injury_date,
        description: addForm.description,
        movement_affected: addForm.movement_affected,
        reported_to_coach: false,
      })
      // Replace temp id with real DB id
      if (saved?.id) {
        setInjuries(prev => prev.map(inj => inj.id === newInj.id ? { ...inj, id: saved.id } : inj))
      }
    }
    setAddModal(false)
    setAddForm({ body_area: '', pain_level: 5, description: '', movement_affected: '', injury_date: new Date().toISOString().slice(0,10) })
  }

  const markResolved = async (id) => {
    const resolvedDate = new Date().toISOString().slice(0,10)
    setInjuries(prev => prev.map(inj => inj.id !== id ? inj : {
      ...inj, resolved: true, resolved_date: resolvedDate,
      log_history: [...(inj.log_history ?? []), { date: resolvedDate, pain_level: 0, note: 'Marked as resolved.', reporter: 'athlete' }],
    }))
    if (!isDemo && !String(id).startsWith('inj-')) {
      await updateInjury(id, { resolved: true, resolved_date: resolvedDate })
    }
    setResolveConfirm(null)
  }

  const toggleCoach = async (id) => {
    const inj = injuries.find(i => i.id === id)
    if (!inj) return
    const newVal = !inj.reported_to_coach
    setInjuries(prev => prev.map(i => i.id !== id ? i : { ...i, reported_to_coach: newVal }))
    if (!isDemo && !String(id).startsWith('inj-')) {
      await updateInjury(id, { reported_to_coach: newVal })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-red-400" />Injury Tracker
          </CardTitle>
          <Button size="sm" onClick={() => setAddModal(true)}>
            <Plus className="w-3.5 h-3.5" /> Log Injury
          </Button>
        </div>
        <CardSubtitle>{active.length} active · {resolved.length} resolved</CardSubtitle>
      </CardHeader>
      <CardBody className="space-y-3">

        {/* Active injuries */}
        {active.length === 0 ? (
          <div className="text-center py-6">
            <Heart className="w-7 h-7 mx-auto mb-2 text-green-500/40" />
            <p className="text-sm text-zinc-500">No active injuries — keep it up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(inj => {
              const latest = inj.log_history[inj.log_history.length - 1]
              const trend = inj.log_history.length >= 2
                ? inj.log_history[inj.log_history.length - 1].pain_level - inj.log_history[inj.log_history.length - 2].pain_level
                : 0
              return (
                <div key={inj.id} className="p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/50 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-zinc-100">{inj.body_area}</p>
                        <p className="text-xs text-zinc-500">Since {inj.injury_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', painColor(inj.pain_level))}>
                        {inj.pain_level}/10 · {painLabel(inj.pain_level)}
                      </span>
                      {trend < 0 && <TrendingUp className="w-3.5 h-3.5 text-green-400 rotate-180" title="Improving" />}
                      {trend > 0 && <TrendingUp className="w-3.5 h-3.5 text-red-400" title="Worsening" />}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300">{inj.description}</p>
                  {inj.movement_affected?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {inj.movement_affected.map((m, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-full">{m}</span>
                      ))}
                    </div>
                  )}
                  {inj.coach_notes && (
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <p className="text-xs font-semibold text-purple-400 mb-0.5 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Coach Note
                      </p>
                      <p className="text-xs text-zinc-300">{inj.coach_notes}</p>
                    </div>
                  )}
                  {/* Log history mini-timeline */}
                  <div className="space-y-1">
                    {inj.log_history.slice(-3).map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="text-zinc-600">{entry.date}</span>
                        <span className={cn('font-bold', entry.pain_level <= 3 ? 'text-green-400' : entry.pain_level <= 6 ? 'text-yellow-400' : 'text-red-400')}>
                          {entry.pain_level}/10
                        </span>
                        <span className="text-zinc-400 flex-1 truncate">{entry.note}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="xs" variant="outline" className="flex-1"
                      onClick={() => { setLogModal(inj.id); setLogForm({ date: new Date().toISOString().slice(0,10), pain_level: inj.pain_level, note: '' }) }}>
                      <Activity className="w-3 h-3" /> Log Update
                    </Button>
                    <Button size="xs" variant="outline"
                      onClick={() => toggleCoach(inj.id)}
                      className={inj.reported_to_coach ? 'text-purple-400 border-purple-500/40' : ''}>
                      <Shield className="w-3 h-3" /> {inj.reported_to_coach ? 'Reported' : 'Report to Coach'}
                    </Button>
                    <Button size="xs" variant="ghost"
                      onClick={() => setResolveConfirm(inj.id)}
                      className="text-green-400 hover:bg-green-500/10">
                      <Check className="w-3 h-3" /> Resolved
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Resolved history toggle */}
        {resolved.length > 0 && (
          <div>
            <button onClick={() => setShowHistory(p => !p)}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors w-full py-2 border-t border-zinc-800">
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <Archive className="w-3.5 h-3.5" />
              Injury History ({resolved.length} resolved)
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2">
                {resolved.map(inj => (
                  <div key={inj.id} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-semibold text-zinc-300 text-sm">{inj.body_area}</span>
                        <span className="text-xs text-zinc-500">{inj.injury_date} → {inj.resolved_date}</span>
                      </div>
                      <button onClick={() => setExpandedHistory(expandedHistory === inj.id ? null : inj.id)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        {expandedHistory === inj.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {inj.log_history.length} entries
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{inj.description}</p>
                    {expandedHistory === inj.id && (
                      <div className="space-y-1.5 mt-2 pt-2 border-t border-zinc-800">
                        {inj.log_history.map((entry, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-zinc-600 flex-shrink-0 w-20">{entry.date}</span>
                            <span className={cn('font-bold flex-shrink-0', entry.pain_level === 0 ? 'text-green-400' : entry.pain_level <= 3 ? 'text-green-400' : entry.pain_level <= 6 ? 'text-yellow-400' : 'text-red-400')}>
                              {entry.pain_level === 0 ? '✓' : `${entry.pain_level}/10`}
                            </span>
                            <span className="text-zinc-400">{entry.note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardBody>

      {/* Log Update Modal */}
      <Modal open={!!logModal} onClose={() => setLogModal(null)} title="Log Pain Update" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
            <input type="date" value={logForm.date} onChange={e => setLogForm(p => ({ ...p, date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pain Level: <span className="font-bold text-zinc-200">{logForm.pain_level}/10</span></label>
            <input type="range" min="0" max="10" value={logForm.pain_level}
              onChange={e => setLogForm(p => ({ ...p, pain_level: Number(e.target.value) }))}
              className="w-full accent-purple-500" />
            <div className="flex justify-between text-xs text-zinc-600 mt-1"><span>No pain</span><span>Severe</span></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea value={logForm.note} onChange={e => setLogForm(p => ({ ...p, note: e.target.value }))}
              rows={3} placeholder="How does it feel today?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setLogModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={submitLog}><Save className="w-3.5 h-3.5" /> Save Update</Button>
          </div>
        </div>
      </Modal>

      {/* Add Injury Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Log New Injury" size="sm">
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Body Area *</label>
            <input value={addForm.body_area} onChange={e => setAddForm(p => ({ ...p, body_area: e.target.value }))}
              placeholder="e.g. Right knee, Lower back"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date of Injury</label>
            <input type="date" value={addForm.injury_date} onChange={e => setAddForm(p => ({ ...p, injury_date: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pain Level: <span className="font-bold text-zinc-200">{addForm.pain_level}/10</span></label>
            <input type="range" min="0" max="10" value={addForm.pain_level}
              onChange={e => setAddForm(p => ({ ...p, pain_level: Number(e.target.value) }))}
              className="w-full accent-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description *</label>
            <textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
              rows={2} placeholder="Describe the injury or pain…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Movements Affected <span className="text-zinc-600 font-normal">(comma-separated)</span></label>
            <input value={addForm.movement_affected} onChange={e => setAddForm(p => ({ ...p, movement_affected: e.target.value }))}
              placeholder="e.g. Squat, Deadlift"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={submitAdd}><Plus className="w-3.5 h-3.5" /> Add Injury</Button>
          </div>
        </div>
      </Modal>

      {/* Resolve Confirm */}
      <Modal open={!!resolveConfirm} onClose={() => setResolveConfirm(null)} title="Mark as Resolved?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">This will move the injury to your resolved history. You can still view it in the history section.</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setResolveConfirm(null)}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-500" onClick={() => markResolved(resolveConfirm)}>
              <Check className="w-3.5 h-3.5" /> Mark Resolved
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}

// ─── Recipe Form Modal ────────────────────────────────────────────────────────
function RecipeFormModal({ open, onClose, initial, onSave }) {
  const blank = {
    name: '', meal_type: 'lunch', prep_time: 10, cook_time: 0, servings: 1,
    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ingredients: [{ name: '', amount: '' }],
    instructions: '',
    tags: '',
  }
  const [form, setForm] = useState(() => initial ? { ...initial, tags: Array.isArray(initial.tags) ? initial.tags.join(', ') : (initial.tags ?? '') } : blank)

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }))
  const setMacro = (key, val) => setForm(prev => ({ ...prev, macros: { ...prev.macros, [key]: Number(val) } }))
  const setIngredient = (idx, key, val) =>
    setForm(prev => {
      const ings = [...prev.ingredients]
      ings[idx] = { ...ings[idx], [key]: val }
      return { ...prev, ingredients: ings }
    })
  const addIngredient = () => setForm(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: '', amount: '' }] }))
  const removeIngredient = (idx) => setForm(prev => ({ ...prev, ingredients: prev.ingredients.filter((_, i) => i !== idx) }))

  const handleSave = () => {
    if (!form.name.trim()) return
    const tags = typeof form.tags === 'string'
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : (form.tags ?? [])
    onSave({ ...form, tags, prep_time: Number(form.prep_time), cook_time: Number(form.cook_time), servings: Number(form.servings) })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Recipe' : 'Add Recipe'} size="lg">
      <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipe Name *</label>
            <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Overnight Oats"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Meal Type</label>
            <select value={form.meal_type} onChange={e => setField('meal_type', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {Object.entries(MEAL_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Prep Time (min)', key: 'prep_time' }, { label: 'Cook Time (min)', key: 'cook_time' }, { label: 'Servings', key: 'servings' }].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
              <input type="number" min="0" value={form[f.key]} onChange={e => setField(f.key, e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Macros (per serving)</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'calories', label: 'Calories', unit: 'kcal', color: 'text-orange-300' },
              { key: 'protein',  label: 'Protein',  unit: 'g',    color: 'text-blue-300' },
              { key: 'carbs',    label: 'Carbs',    unit: 'g',    color: 'text-purple-300' },
              { key: 'fat',      label: 'Fat',      unit: 'g',    color: 'text-yellow-300' },
            ].map(m => (
              <div key={m.key} className="bg-zinc-700/30 rounded-xl p-2">
                <label className={cn('block text-xs font-medium mb-1', m.color)}>{m.label}</label>
                <input type="number" min="0" value={form.macros[m.key]} onChange={e => setMacro(m.key, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <span className="text-xs text-zinc-600">{m.unit}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-zinc-400">Ingredients</p>
            <button onClick={addIngredient} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"><Plus className="w-3 h-3" /> Add</button>
          </div>
          <div className="space-y-1.5">
            {form.ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={ing.name} onChange={e => setIngredient(idx, 'name', e.target.value)} placeholder="Ingredient name"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <input value={ing.amount} onChange={e => setIngredient(idx, 'amount', e.target.value)} placeholder="Amount"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                {form.ingredients.length > 1 && (
                  <button onClick={() => removeIngredient(idx)} className="text-zinc-600 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Instructions</label>
          <textarea value={form.instructions} onChange={e => setField('instructions', e.target.value)} rows={3} placeholder="Step-by-step instructions…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Tags <span className="text-zinc-600 font-normal">(comma-separated)</span></label>
          <input value={typeof form.tags === 'string' ? form.tags : (form.tags ?? []).join(', ')} onChange={e => setField('tags', e.target.value)} placeholder="high-protein, meal-prep, quick"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}><Save className="w-4 h-4" /> {initial ? 'Save Changes' : 'Add Recipe'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Recipes Tab ──────────────────────────────────────────────────────────────
function RecipesTab({ isStaff, athleteRecipes, setAthleteRecipes }) {
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { athletes: rosterAthletes } = useRosterStore()
  const { orgRecipes, orgRecipesLoaded, setOrgRecipes, loadOrgRecipes } = useNutritionStore()

  // For demo: use mock data. For real users: use store (loaded by NutritionPage on mount)
  const mockAthletes = isDemo ? MOCK_ATHLETES : rosterAthletes
  const [recipes, setRecipes] = useState(isDemo ? MOCK_MEAL_PLAN_RECIPES : [])
  // Sync with store for real users after first load
  useEffect(() => {
    if (!isDemo && orgRecipesLoaded) {
      setRecipes(orgRecipes)
    } else if (!isDemo && !orgRecipesLoaded && activeOrgId) {
      loadOrgRecipes(activeOrgId, profile?.id)
    }
  }, [isDemo, orgRecipesLoaded, orgRecipes]) // eslint-disable-line react-hooks/exhaustive-deps

  const [expanded, setExpanded]           = useState(null)
  const [filter, setFilter]               = useState('all')
  const [addOpen, setAddOpen]             = useState(false)
  const [editTarget, setEditTarget]       = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Assign-to-athlete drag state (staff only)
  const [assignDragging, setAssignDragging] = useState(null)
  const [assignDragOver, setAssignDragOver] = useState(null)
  const [assignedFlash, setAssignedFlash]   = useState(null)
  const [editAthleteRecipe, setEditAthleteRecipe] = useState(null)
  const [tweakSaved, setTweakSaved]         = useState(false)
  const [conflictWarning, setConflictWarning] = useState(null)
  const [collapsedFolders, setCollapsedFolders] = useState({}) // meal_type → bool

  const mealTypes = ['all', ...new Set(recipes.map(r => r.meal_type))]
  const filtered  = filter === 'all' ? recipes : recipes.filter(r => r.meal_type === filter)

  const handleAdd = async (recipe) => {
    const newId = genRecipeId()
    const newRecipe = { ...recipe, id: newId, day_types: ['training', 'rest'] }
    setRecipes(prev => [...prev, newRecipe])
    if (!isDemo && profile?.id) {
      const saved = await saveMealPrepRecipe(profile.id, activeOrgId, recipe)
      if (saved) {
        setRecipes(prev => prev.map(r => r.id === newId ? { ...r, id: saved.id } : r))
        setOrgRecipes([...recipes.map(r => r.id === newId ? { ...r, id: saved.id } : r), newRecipe].filter((v,i,a)=>a.findIndex(x=>x.id===v.id)===i))
      }
    }
  }
  const handleEdit = async (recipe) => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))
    if (!isDemo && profile?.id) await saveMealPrepRecipe(profile.id, activeOrgId, recipe)
  }
  const handleDelete = async (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id))
    setDeleteConfirm(null)
    if (!isDemo) await deleteMealPrepRecipe(id)
  }

  function doAssign(recipe, athleteId) {
    const already = (athleteRecipes[athleteId] || []).some(r => r.source_recipe_id === recipe.id)
    if (already) return
    const copy = {
      ...JSON.parse(JSON.stringify(recipe)),
      id: genAthleteRecipeId(athleteId),
      athlete_id: athleteId,
      source_recipe_id: recipe.id,
      is_custom_for_athlete: false,
    }
    setAthleteRecipes(prev => ({ ...prev, [athleteId]: [...(prev[athleteId] || []), copy] }))
    setAssignedFlash({ recipeId: recipe.id, athleteId })
    setTimeout(() => setAssignedFlash(null), 1800)
  }

  function handleAssignDrop(athleteId) {
    if (!assignDragging) return
    setAssignDragging(null); setAssignDragOver(null)
    const athlete = mockAthletes.find(a => a.id === athleteId)
    const conflicts = recipeConflicts(assignDragging, athlete)
    if (conflicts.length) {
      setConflictWarning({ recipe: assignDragging, athlete, conflicts })
      return
    }
    doAssign(assignDragging, athleteId)
  }

  function removeAthleteAssignment(athleteId, recipeId) {
    setAthleteRecipes(prev => ({ ...prev, [athleteId]: (prev[athleteId] || []).filter(r => r.id !== recipeId) }))
  }

  function saveAthleteRecipeTweak(athleteId, updatedRecipe) {
    setAthleteRecipes(prev => ({
      ...prev,
      [athleteId]: (prev[athleteId] || []).map(r => r.id === updatedRecipe.id ? { ...updatedRecipe, is_custom_for_athlete: true } : r),
    }))
    setTweakSaved(true)
    setTimeout(() => setTweakSaved(false), 1800)
    setEditAthleteRecipe(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">{recipes.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Template recipes</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">
            {recipes.length > 0 ? Math.round(recipes.reduce((a, r) => a + r.prep_time + (r.cook_time || 0), 0) / recipes.length) : 0}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Avg min prep</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">
            {recipes.length > 0 ? Math.round(recipes.reduce((a, r) => a + r.macros.protein, 0) / recipes.length) : 0}g
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">Avg protein</p>
        </CardBody></Card>
      </div>

      {/* ── Staff: Assign recipes to athletes ── */}
      {isStaff && athleteRecipes && (
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <p className="text-sm font-bold text-zinc-100">Assign Recipes to Athletes</p>
              <span className="text-xs text-zinc-500 ml-1">Drag a recipe → drop on athlete to create their personal copy</span>
            </div>

            {/* Draggable template recipe chips */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-800/50 rounded-xl border border-zinc-700/40 min-h-[44px]">
              {recipes.map(r => {
                const meta = MEAL_TYPE_META[r.meal_type]
                return (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() => setAssignDragging(r)}
                    onDragEnd={() => { setAssignDragging(null); setAssignDragOver(null) }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-grab active:cursor-grabbing select-none transition-all text-xs',
                      meta?.color ?? 'text-zinc-400 bg-zinc-700 border-zinc-600',
                      assignDragging?.id === r.id && 'opacity-50 scale-95'
                    )}
                  >
                    
                    <span className="font-medium">{r.name}</span>
                  </div>
                )
              })}
              {recipes.length === 0 && <p className="text-xs text-zinc-600 py-1">Add recipes above first.</p>}
            </div>

            {/* Athlete drop targets */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mockAthletes.map(athlete => {
                const isOver    = assignDragOver === athlete.id
                const assigned  = (athleteRecipes[athlete.id] || [])
                const justFlash = assignedFlash?.athleteId === athlete.id
                const dragConflicts = assignDragging ? recipeConflicts(assignDragging, athlete) : []
                const hasConflict   = dragConflicts.length > 0
                const alreadyHas    = assignDragging ? assigned.some(r => r.source_recipe_id === assignDragging.id) : false
                const dp = athlete.dietary_profile
                return (
                  <div
                    key={athlete.id}
                    onDragOver={e => { e.preventDefault(); setAssignDragOver(athlete.id) }}
                    onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAssignDragOver(null) }}
                    onDrop={() => handleAssignDrop(athlete.id)}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all',
                      hasConflict && isOver ? 'bg-red-900/20 border-red-500/50 ring-1 ring-red-500/30' :
                      alreadyHas  && isOver ? 'bg-zinc-800/60 border-zinc-600/60' :
                      isOver ? 'bg-purple-900/30 border-purple-500/60 ring-1 ring-purple-500/40' :
                      'bg-zinc-800/40 border-zinc-700/40',
                      justFlash && 'bg-green-900/30 border-green-500/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar name={athlete.full_name} role="athlete" size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{athlete.full_name}</p>
                        <p className="text-[10px] text-zinc-500">{athlete.weight_class}</p>
                      </div>
                      {justFlash && <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                      {hasConflict && isOver && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      {alreadyHas && isOver && <span className="text-[9px] text-zinc-500">already assigned</span>}
                      {!hasConflict && !alreadyHas && isOver && assignDragging && (
                        <span className="text-[9px] text-purple-300">+ assign</span>
                      )}
                    </div>

                    {/* Dietary restrictions mini-badges */}
                    {dp && (dp.restrictions?.filter(r => r !== 'none').length > 0 || dp.allergens?.filter(a => a !== 'none').length > 0) && (
                      <div className="flex flex-wrap gap-0.5 mb-2">
                        {dp.restrictions?.filter(r => r !== 'none').map(r => (
                          <span key={r} className={cn('text-[8px] px-1 py-0 rounded border', restrictionColor(r))}>
                            {r}
                          </span>
                        ))}
                        {dp.allergens?.filter(a => a !== 'none').map(a => (
                          <span key={a} className={cn('text-[8px] px-1 py-0 rounded border', allergenColor(a))}>
                            ⚠ {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Conflict warning while dragging */}
                    {hasConflict && isOver && (
                      <div className="mb-1.5 text-[9px] text-red-300 bg-red-900/20 border border-red-800/30 rounded-lg px-1.5 py-1">
                        {dragConflicts.map((c, i) => (
                          <span key={i}>{c.type === 'allergen' ? `⚠ ${c.value} allergen` : `✗ not ${c.value}`}{i < dragConflicts.length - 1 ? ' · ' : ''}</span>
                        ))}
                      </div>
                    )}

                    {/* Assigned recipes for this athlete */}
                    <div className="space-y-1">
                      {assigned.length === 0 && (
                        <p className="text-[10px] text-zinc-600 text-center py-1 border border-dashed border-zinc-700/50 rounded-lg">
                          Drop recipes here
                        </p>
                      )}
                      {assigned.map(r => (
                        <div key={r.id} className="flex items-center gap-1 group/ar">
                          <div className={cn(
                            'flex-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] min-w-0',
                            r.is_custom_for_athlete ? 'bg-orange-900/20 border border-orange-800/30 text-orange-300' : 'bg-zinc-700/40 text-zinc-300'
                          )}>
                            <span className="flex-1 truncate">{r.name}</span>
                            {r.is_custom_for_athlete && <span className="text-[8px] text-orange-500 flex-shrink-0">tweaked</span>}
                          </div>
                          <button
                            onClick={() => setEditAthleteRecipe({ athleteId: athlete.id, recipe: { ...r, tags: Array.isArray(r.tags) ? r.tags.join(', ') : (r.tags ?? '') } })}
                            className="opacity-0 group-hover/ar:opacity-100 p-0.5 text-zinc-600 hover:text-purple-400 transition-all flex-shrink-0"
                            title="Tweak for this athlete"
                          ><Edit2 className="w-3 h-3" /></button>
                          <button
                            onClick={() => removeAthleteAssignment(athlete.id, r.id)}
                            className="opacity-0 group-hover/ar:opacity-100 p-0.5 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0"
                            title="Remove assignment"
                          ><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-zinc-600">
              Assigned recipes appear in each athlete's Meal Planner. Tweaking a recipe for one athlete won't affect others.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap flex-1">
          {mealTypes.map(t => {
            const meta = MEAL_TYPE_META[t]
            return (
              <button key={t} onClick={() => setFilter(t)}
                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors capitalize',
                  filter === t ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                )}>
                {meta?.label ?? t}
              </button>
            )
          })}
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Recipe</Button>
      </div>

      {/* ── Compact folder-style grouped recipe list ── */}
      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-500">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No recipes yet. Add one above.</p>
          </div>
        )}
        {(() => {
          const groups = {}
          filtered.forEach(r => {
            if (!groups[r.meal_type]) groups[r.meal_type] = []
            groups[r.meal_type].push(r)
          })
          return Object.entries(groups).map(([mealType, groupRecipes]) => {
            const meta = MEAL_TYPE_META[mealType] || { label: mealType }
            const folderOpen = !collapsedFolders[mealType]
            const anyConflicts = isStaff && groupRecipes.some(r =>
              mockAthletes.some(a => recipeConflicts(r, a).length > 0)
            )
            return (
              <div key={mealType} className="rounded-xl border border-zinc-700/40 overflow-hidden">
                {/* Folder header */}
                <button
                  onClick={() => setCollapsedFolders(prev => ({ ...prev, [mealType]: !prev[mealType] }))}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-zinc-800/60 hover:bg-zinc-800/90 transition-colors"
                >
                  <span className="text-xs font-semibold text-zinc-300 capitalize">{meta.label ?? mealType}</span>
                  <span className="text-[10px] text-zinc-600">{groupRecipes.length}</span>
                  {anyConflicts && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> conflicts
                    </span>
                  )}
                  <div className="ml-auto text-zinc-600">
                    {folderOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* Recipe rows */}
                {folderOpen && (
                  <div className="divide-y divide-zinc-800/50 bg-zinc-900/40">
                    {groupRecipes.map((recipe) => {
                      const isOpen = expanded === recipe.id
                      const totalTime = recipe.prep_time + (recipe.cook_time || 0)
                      const assignedAthletes = isStaff ? mockAthletes.filter(a =>
                        (athleteRecipes?.[a.id] || []).some(r => r.source_recipe_id === recipe.id)
                      ) : []
                      const athleteConflicts = isStaff ? mockAthletes.reduce((acc, a) => {
                        const c = recipeConflicts(recipe, a)
                        if (c.length) acc[a.id] = c
                        return acc
                      }, {}) : {}
                      const hasConflicts = Object.keys(athleteConflicts).length > 0
                      return (
                        <div key={recipe.id}
                          draggable={isStaff}
                          onDragStart={() => isStaff && setAssignDragging(recipe)}
                          onDragEnd={() => { setAssignDragging(null); setAssignDragOver(null) }}
                          className={cn(assignDragging?.id === recipe.id && 'opacity-40')}
                        >
                          {/* Row */}
                          <div className="flex items-center gap-2 px-3 py-2 group/row hover:bg-zinc-800/30 transition-colors cursor-pointer"
                            onClick={() => setExpanded(isOpen ? null : recipe.id)}>
                            <span className="flex-shrink-0 text-zinc-700">
                              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              {/* Name line */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm text-zinc-200">{recipe.name}</span>
                                {recipe.dietary_flags?.map(f => (
                                  <span key={f} className="text-[9px] px-1.5 py-px rounded border border-zinc-700 text-zinc-500 bg-zinc-800/60">{f}</span>
                                ))}
                                {recipe.allergens?.filter(a => a !== 'none').map(a => (
                                  <span key={a} className="text-[9px] px-1.5 py-px rounded border border-zinc-700 text-zinc-500 bg-zinc-800/60">{a}</span>
                                ))}
                                {hasConflicts && (
                                  <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    {Object.keys(athleteConflicts).map(id => mockAthletes.find(a => a.id === id)?.full_name?.split(' ')[0]).join(', ')}
                                  </span>
                                )}
                              </div>
                              {/* Meta line — all muted same color */}
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-600 flex-wrap">
                                <span>{recipe.macros.calories} kcal</span>
                                <span>{recipe.macros.protein}g P</span>
                                <span>{recipe.macros.carbs}g C</span>
                                <span>{recipe.macros.fat}g F</span>
                                <span>{totalTime}m</span>
                                {recipe.serving_size && <span>{recipe.serving_size}</span>}
                                {isStaff && assignedAthletes.length > 0 && (
                                  <span>→ {assignedAthletes.map((a, i) => {
                                    const ar = (athleteRecipes?.[a.id] || []).find(r => r.source_recipe_id === recipe.id)
                                    return (
                                      <span key={a.id}>
                                        {a.full_name.split(' ')[0]}{ar?.is_custom_for_athlete ? '*' : ''}{i < assignedAthletes.length - 1 ? ', ' : ''}
                                      </span>
                                    )
                                  })}</span>
                                )}
                              </div>
                            </div>
                            {/* Hover actions */}
                            <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0"
                              onClick={e => e.stopPropagation()}>
                              <button onClick={() => setEditTarget({ ...recipe, tags: Array.isArray(recipe.tags) ? recipe.tags.join(', ') : (recipe.tags ?? '') })}
                                className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => setDeleteConfirm(recipe.id)}
                                className="p-1.5 text-zinc-600 hover:text-red-400 rounded transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isOpen && (
                            <div className="mx-3 mb-3 space-y-3 pt-3 border-t border-zinc-800/60">
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { label: 'Calories', val: `${recipe.macros.calories}` },
                                  { label: 'Protein',  val: `${recipe.macros.protein}g` },
                                  { label: 'Carbs',    val: `${recipe.macros.carbs}g`   },
                                  { label: 'Fat',      val: `${recipe.macros.fat}g`     },
                                ].map(m => (
                                  <div key={m.label} className="text-center p-2 bg-zinc-800/60 rounded-lg">
                                    <p className="text-[10px] text-zinc-600">{m.label}</p>
                                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{m.val}</p>
                                  </div>
                                ))}
                              </div>
                              {(recipe.serving_size || (recipe.servings ?? 1) > 1) && (
                                <p className="text-xs text-zinc-500">
                                  Serving: <span className="text-zinc-300">{recipe.serving_size ?? '1 serving'}</span>
                                  {(recipe.servings ?? 1) > 1 && <span> · {recipe.servings} per batch</span>}
                                </p>
                              )}
                              {recipe.allergens?.filter(a => a !== 'none').length > 0 && (
                                <div className="border border-zinc-700/40 rounded-lg p-2.5 space-y-1.5">
                                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Contains</p>
                                  <div className="flex flex-wrap gap-1">
                                    {recipe.allergens.filter(a => a !== 'none').map(a => (
                                      <span key={a} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">{a}</span>
                                    ))}
                                  </div>
                                  {isStaff && hasConflicts && (
                                    <div className="pt-1.5 border-t border-zinc-700/40 space-y-0.5">
                                      {Object.entries(athleteConflicts).map(([aid, cons]) => {
                                        const a = mockAthletes.find(x => x.id === aid)
                                        return (
                                          <p key={aid} className="text-[10px] text-amber-600">
                                            {a?.full_name?.split(' ')[0]}: {cons.map(c => c.type === 'allergen' ? c.value : `not ${c.value}`).join(', ')}
                                          </p>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">Ingredients</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {recipe.ingredients.map((ing, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 px-2 bg-zinc-800/40 rounded">
                                      <span className="text-xs text-zinc-300">{ing.name}</span>
                                      <span className="text-[10px] text-zinc-600 ml-2">{ing.amount}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Instructions</p>
                                <p className="text-xs text-zinc-400 leading-relaxed">{recipe.instructions}</p>
                              </div>
                              {recipe.tags?.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {recipe.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-px bg-zinc-800 rounded text-zinc-600">#{t}</span>)}
                                </div>
                              )}
                              <p className="text-[10px] text-zinc-700">Prep {recipe.prep_time}m{recipe.cook_time > 0 ? ` · Cook ${recipe.cook_time}m` : ''} · Total {totalTime}m</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        })()}
      </div>

      <RecipeFormModal open={addOpen} onClose={() => setAddOpen(false)} initial={null} onSave={handleAdd} />
      {editTarget && (
        <RecipeFormModal open={!!editTarget} onClose={() => setEditTarget(null)} initial={editTarget}
          onSave={(updated) => { handleEdit(updated); setEditTarget(null) }} />
      )}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Recipe?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">This recipe will be permanently removed.</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Conflict warning override modal */}
      {conflictWarning && (
        <Modal open onClose={() => setConflictWarning(null)} title="Dietary Conflict Detected" size="sm">
          <div className="p-6 space-y-4">
            <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold text-red-300">{conflictWarning.recipe.name}</p>
              <p className="text-xs text-zinc-400">
                This recipe may not be suitable for <strong className="text-zinc-200">{conflictWarning.athlete.full_name}</strong> due to:
              </p>
              <ul className="space-y-1">
                {conflictWarning.conflicts.map((c, i) => (
                  <li key={i} className="text-xs text-red-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {c.type === 'allergen' ? `Contains ${c.value} (athlete has ${c.value} allergy)` : `Recipe not ${c.value} (athlete is ${c.value})`}
                    {c.detail && <span className="text-zinc-500">— {c.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-zinc-500">You can still assign and then tweak the recipe for this athlete to make it safe.</p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setConflictWarning(null)}>Cancel</Button>
              <Button className="flex-1 bg-orange-700 hover:bg-orange-600" onClick={() => {
                doAssign(conflictWarning.recipe, conflictWarning.athlete.id)
                setConflictWarning(null)
              }}>
                <AlertTriangle className="w-4 h-4" /> Assign Anyway + Tweak
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tweak recipe for athlete modal */}
      {editAthleteRecipe && (
        <AthleteRecipeTweakModal
          open
          onClose={() => setEditAthleteRecipe(null)}
          athleteId={editAthleteRecipe.athleteId}
          recipe={editAthleteRecipe.recipe}
          onSave={(athleteId, updated) => saveAthleteRecipeTweak(athleteId, updated)}
          saved={tweakSaved}
        />
      )}
    </div>
  )
}

// ─── Athlete Recipe Tweak Modal ───────────────────────────────────────────────
function AthleteRecipeTweakModal({ open, onClose, athleteId, recipe, onSave, saved }) {
  const { isDemo } = useAuthStore()
  const athlete = (isDemo ? MOCK_ATHLETES : []).find(a => a.id === athleteId)
  const [form, setForm] = useState(recipe)
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const setM = (k, v) => setForm(prev => ({ ...prev, macros: { ...prev.macros, [k]: Number(v) } }))

  return (
    <Modal open={open} onClose={onClose} title={`Tweak Recipe for ${athlete?.full_name ?? athleteId}`} size="md">
      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 p-2 bg-orange-900/20 border border-orange-800/30 rounded-lg">
          <Edit2 className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <p className="text-xs text-orange-300">
            Changes here only apply to <strong>{athlete?.full_name}</strong>'s copy. Other athletes are unaffected.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recipe Name</label>
          <input value={form.name} onChange={e => setF('name', e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>

        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Macros per serving</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'calories', label: 'Calories', color: 'text-orange-300' },
              { key: 'protein',  label: 'Protein',  color: 'text-blue-300' },
              { key: 'carbs',    label: 'Carbs',    color: 'text-purple-300' },
              { key: 'fat',      label: 'Fat',      color: 'text-yellow-300' },
            ].map(f => (
              <div key={f.key} className="bg-zinc-700/30 rounded-xl p-2">
                <label className={cn('block text-xs font-medium mb-1', f.color)}>{f.label}</label>
                <input type="number" min="0" value={form.macros?.[f.key] ?? ''} onChange={e => setM(f.key, e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Instructions</label>
          <textarea value={form.instructions} onChange={e => setF('instructions', e.target.value)} rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes / Athlete-Specific Adjustments</label>
          <textarea value={form.athlete_notes ?? ''} onChange={e => setF('athlete_notes', e.target.value)} rows={2}
            placeholder={`e.g. Extra sweet potato for ${athlete?.full_name?.split(' ')[0]} during peak block`}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className={cn('flex-1', saved ? 'bg-green-700 hover:bg-green-700' : '')}
            onClick={() => onSave(athleteId, form)}
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Tweak</>}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// --- Item Form Modal ---
function ItemFormModal({ open, onClose, initial, onSave }) {
  const blank = { name: '', amount: '', category: 'Pantry', price: '', weight_g: '', calories_per_100g: '', protein_per_100g: '', carbs_per_100g: '', fat_per_100g: '' }
  const [form, setForm] = useState(() => initial ?? blank)

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = () => {
    if (!form.name.trim()) return
    onSave({
      ...form,
      id: form.id ?? genItemId(),
      checked: form.checked ?? false,
      recipe_ids: form.recipe_ids ?? [],
      price:             form.price !== '' ? Number(form.price) : 0,
      weight_g:          form.weight_g !== '' ? Number(form.weight_g) : 0,
      calories_per_100g: form.calories_per_100g !== '' ? Number(form.calories_per_100g) : null,
      protein_per_100g:  form.protein_per_100g  !== '' ? Number(form.protein_per_100g)  : null,
      carbs_per_100g:    form.carbs_per_100g    !== '' ? Number(form.carbs_per_100g)    : null,
      fat_per_100g:      form.fat_per_100g      !== '' ? Number(form.fat_per_100g)      : null,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit Item' : 'Add Item'} size="md">
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Item Name *</label>
            <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Chicken breast"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Category</label>
            <select value={form.category} onChange={e => setF('category', e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {SHOPPING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[{ label: 'Amount', key: 'amount', type: 'text', placeholder: '1.4kg' },
            { label: 'Price ($)', key: 'price', type: 'number', placeholder: '0.00' },
            { label: 'Weight (g)', key: 'weight_g', type: 'number', placeholder: '0' }].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
              <input type={f.type} min="0" step={f.key === 'price' ? '0.01' : '1'} value={form[f.key]} onChange={e => setF(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-400 mb-2">Nutrition per 100g <span className="text-zinc-600 font-normal">(optional)</span></p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'calories_per_100g', label: 'Calories', color: 'text-orange-300' },
              { key: 'protein_per_100g',  label: 'Protein',  color: 'text-blue-300' },
              { key: 'carbs_per_100g',    label: 'Carbs',    color: 'text-purple-300' },
              { key: 'fat_per_100g',      label: 'Fat',      color: 'text-yellow-300' },
            ].map(f => (
              <div key={f.key} className="bg-zinc-700/30 rounded-xl p-2">
                <label className={cn('block text-xs font-medium mb-1', f.color)}>{f.label}</label>
                <input type="number" min="0" value={form[f.key]} onChange={e => setF(f.key, e.target.value)} placeholder="—"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave}><Save className="w-4 h-4" /> {initial?.id ? 'Save Changes' : 'Add Item'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Link Picker ──────────────────────────────────────────────────────────────
function LinkPicker({ linkedGoalIds, linkedBlockId, linkedMeetId, onChange }) {
  const { isDemo } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const { blocks: storeBlocks, meets: storeMeets } = useTrainingStore()
  const goals  = storeGoals.length  ? storeGoals  : (isDemo ? MOCK_GOALS : [])
  const blocks = storeBlocks.length ? storeBlocks : (isDemo ? MOCK_TRAINING_BLOCKS : [])
  const meets  = storeMeets.length  ? storeMeets  : (isDemo ? MOCK_MEETS : [])
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-purple-400" />Goals</p>
        <div className="flex flex-wrap gap-1.5">
          {goals.map(g => {
            const active = linkedGoalIds.includes(g.id)
            return (
              <button key={g.id} onClick={() => onChange({
                linkedGoalIds: active ? linkedGoalIds.filter(x => x !== g.id) : [...linkedGoalIds, g.id],
                linkedBlockId, linkedMeetId
              })}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  active ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                )}>
                {active && <Check className="w-2.5 h-2.5 inline mr-1" />}{g.name}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-blue-400" />Training Block</p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onChange({ linkedGoalIds, linkedBlockId: null, linkedMeetId })}
            className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
              !linkedBlockId ? 'bg-blue-600/30 border-blue-500/50 text-blue-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            )}>None</button>
          {blocks.map(b => {
            const active = linkedBlockId === b.id
            return (
              <button key={b.id} onClick={() => onChange({ linkedGoalIds, linkedBlockId: active ? null : b.id, linkedMeetId })}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  active ? 'bg-blue-600/30 border-blue-500/50 text-blue-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                )}>
                {active && <Check className="w-2.5 h-2.5 inline mr-1" />}{b.name}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-orange-400" />Competition / Meet</p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => onChange({ linkedGoalIds, linkedBlockId, linkedMeetId: null })}
            className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
              !linkedMeetId ? 'bg-orange-600/30 border-orange-500/50 text-orange-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            )}>None</button>
          {meets.map(m => {
            const active = linkedMeetId === m.id
            return (
              <button key={m.id} onClick={() => onChange({ linkedGoalIds, linkedBlockId, linkedMeetId: active ? null : m.id })}
                className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                  active ? 'bg-orange-600/30 border-orange-500/50 text-orange-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                )}>
                {active && <Check className="w-2.5 h-2.5 inline mr-1" />}{m.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Link Chips (display) ─────────────────────────────────────────────────────
function LinkChips({ linkedGoalIds = [], linkedBlockId, linkedMeetId }) {
  const { isDemo } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const { blocks: storeBlocks, meets: storeMeets } = useTrainingStore()
  const allGoals  = storeGoals.length  ? storeGoals  : (isDemo ? MOCK_GOALS : [])
  const allBlocks = storeBlocks.length ? storeBlocks : (isDemo ? MOCK_TRAINING_BLOCKS : [])
  const allMeets  = storeMeets.length  ? storeMeets  : (isDemo ? MOCK_MEETS : [])
  const goals  = allGoals.filter(g => linkedGoalIds.includes(g.id))
  const block  = allBlocks.find(b => b.id === linkedBlockId)
  const meet   = allMeets.find(m => m.id === linkedMeetId)
  if (!goals.length && !block && !meet) return null
  return (
    <div className="flex flex-wrap gap-1">
      {goals.map(g => (
        <span key={g.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300">
          <Target className="w-2.5 h-2.5" />{g.name}
        </span>
      ))}
      {block && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300">
          <Layers className="w-2.5 h-2.5" />{block.name}
        </span>
      )}
      {meet && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-300">
          <CalendarDays className="w-2.5 h-2.5" />{meet.name}
        </span>
      )}
    </div>
  )
}

// ─── Athlete Shopping View ────────────────────────────────────────────────────
const SLOT_ICON_MAP = {}
let _nextSliId  = 5000
const genSliId  = () => `sli-n${_nextSliId++}`

function AthleteShoppingView({ athleteRecipes, athleteShoppingLists, setAthleteShoppingLists, selectedAthleteId, setSelectedAthleteId, athletePrepLog, boardPlans }) {
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes } = useRosterStore()
  const { orgRecipes } = useNutritionStore()
  const mockAthletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const athlete    = mockAthletes.find(a => a.id === selectedAthleteId)
  const myLists    = athleteShoppingLists?.[selectedAthleteId] ?? []
  const [activeAslId, setActiveAslId] = useState(myLists[0]?.id ?? null)
  const activeList  = myLists.find(l => l.id === activeAslId) ?? myLists[0] ?? null
  const myRecipes   = athleteRecipes?.[selectedAthleteId] ?? []
  const [slDragging, setSlDragging]     = useState(null)
  const [slDragOver, setSlDragOver]     = useState(false)
  const [newListModal, setNewListModal]  = useState(false)
  const [newListLabel, setNewListLabel]  = useState('')
  const [newListStart, setNewListStart]  = useState('')
  const [newListEnd, setNewListEnd]      = useState('')
  const [newListShopDate, setNewListShopDate] = useState('')
  const [panelTab, setPanelTab]          = useState('list') // 'list' | 'pantry' | 'suggested'
  const [pantryNote, setPantryNote]      = useState({}) // id → editing note string
  const [expandedItem, setExpandedItem]  = useState(null) // item id
  const [shopIntervalModal, setShopIntervalModal] = useState(false)
  const [shopInterval, setShopInterval]  = useState({ cadence: activeList?.cadence ?? 'weekly', shopping_day: 'sunday', budget: athlete?.dietary_profile?.weekly_food_budget ?? 150 })

  const budget     = shopInterval.budget || athlete?.dietary_profile?.weekly_food_budget || 0
  const allItems   = (activeList?.categories ?? []).flatMap(c => c.items)
  const spent      = allItems.reduce((s, i) => s + (i.price || 0), 0)
  const checkedSpent = allItems.filter(i => i.checked).reduce((s, i) => s + (i.price || 0), 0)
  const remaining  = budget - spent
  const budgetPct  = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
  const budgetColor = spent > budget ? 'text-red-400' : spent > budget * 0.85 ? 'text-yellow-400' : 'text-green-400'
  const barColor    = spent > budget ? 'bg-red-500' : spent > budget * 0.85 ? 'bg-yellow-500' : 'bg-teal-500'

  // Days until shopping date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const shopDate = activeList?.shopping_date ? new Date(activeList.shopping_date) : null
  const daysToShop = shopDate ? Math.ceil((shopDate - today) / (1000 * 60 * 60 * 24)) : null

  // Recipe name lookup helper — pull from all available sources
  const recipeNameMap = useMemo(() => {
    const map = {}
    // Athlete-specific recipes
    myRecipes.forEach(r => { map[r.id] = r.name })
    // Org / global meal plan recipes
    ;(isDemo ? MOCK_MEAL_PLAN_RECIPES : orgRecipes).forEach(r => { map[r.id] = r.name })
    // Athlete prep log items (recipe_id → recipe_name)
    ;(athletePrepLog?.[selectedAthleteId] ?? []).forEach(session => {
      ;(session.items ?? []).forEach(item => {
        if (item.recipe_id && item.recipe_name) map[item.recipe_id] = item.recipe_name
      })
    })
    // Board plan items (recipe_id → name)
    Object.values(boardPlans?.[selectedAthleteId] ?? {}).forEach(daySlots => {
      Object.values(daySlots).forEach(slotItems => {
        ;(slotItems ?? []).forEach(item => {
          if (item.recipe_id && item.name) map[item.recipe_id] = item.name
        })
      })
    })
    return map
  }, [myRecipes, orgRecipes, athletePrepLog, boardPlans, selectedAthleteId])

  // Ingredient category mapping for auto-grouping
  const INGREDIENT_CATEGORY_MAP = useMemo(() => ({
    // Proteins
    'chicken breast': 'Proteins', 'salmon fillet': 'Proteins', 'ground turkey': 'Proteins',
    'egg whites': 'Proteins', 'whey protein powder': 'Proteins', 'greek yogurt': 'Proteins',
    'tuna': 'Proteins', 'beef': 'Proteins', 'pork': 'Proteins', 'tofu': 'Proteins',
    'turkey': 'Proteins', 'cod': 'Proteins', 'tilapia': 'Proteins', 'shrimp': 'Proteins',
    // Carbohydrates
    'rolled oats': 'Carbohydrates', 'white rice': 'Carbohydrates', 'sweet potato': 'Carbohydrates',
    'banana': 'Carbohydrates', 'brown rice': 'Carbohydrates', 'quinoa': 'Carbohydrates',
    'bread': 'Carbohydrates', 'pasta': 'Carbohydrates', 'oat': 'Carbohydrates',
    'potato': 'Carbohydrates', 'honey': 'Carbohydrates', 'dextrose': 'Carbohydrates',
    // Vegetables
    'broccoli': 'Vegetables', 'asparagus': 'Vegetables', 'spinach': 'Vegetables',
    'baby spinach': 'Vegetables', 'cherry tomatoes': 'Vegetables', 'tomato': 'Vegetables',
    'kale': 'Vegetables', 'cucumber': 'Vegetables', 'zucchini': 'Vegetables',
    'capsicum': 'Vegetables', 'bell pepper': 'Vegetables', 'onion': 'Vegetables',
    'garlic': 'Vegetables', 'green beans': 'Vegetables', 'peas': 'Vegetables',
    // Dairy & Alternatives
    'unsweetened almond milk': 'Dairy & Alternatives', 'whole milk': 'Dairy & Alternatives',
    'coconut yogurt': 'Dairy & Alternatives', 'feta cheese': 'Dairy & Alternatives',
    'cheddar': 'Dairy & Alternatives', 'cottage cheese': 'Dairy & Alternatives',
  }), [])

  const getIngredientCategory = (name) => {
    const lower = name.toLowerCase()
    for (const [key, cat] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
      if (lower.includes(key)) return cat
    }
    return 'Pantry'
  }

  // Derive suggested items from boardPlans — expand recipe ingredients, group by category
  const suggestedItems = useMemo(() => {
    const athletePlan   = boardPlans?.[selectedAthleteId] ?? {}
    const myRecipeMap   = Object.fromEntries(myRecipes.map(r => [r.id, r]))
    const existingNames = new Set(allItems.map(i => i.name.toLowerCase()))
    const seen          = new Set()
    const items         = []

    // ── From board plan: collect unique recipe_ids, expand their ingredients ──
    const planRecipeIdSet = new Set()
    Object.values(athletePlan).forEach(daySlots => {
      Object.values(daySlots).forEach(slotItems => {
        ;(slotItems || []).forEach(item => {
          if (item.recipe_id) planRecipeIdSet.add(item.recipe_id)
        })
      })
    })

    planRecipeIdSet.forEach(rid => {
      const recipe = myRecipeMap[rid]
      if (!recipe) {
        // No recipe found — fall back to bare meal name entry
        const planItem = Object.values(athletePlan).flatMap(d => Object.values(d).flat()).find(i => i.recipe_id === rid)
        if (planItem) {
          const key = planItem.name.toLowerCase()
          if (!seen.has(key) && !existingNames.has(key)) {
            seen.add(key)
            items.push({ name: planItem.name, amount: '', category: 'Pantry', source: 'planner', recipe_id: rid, recipe_name: planItem.name })
          }
        }
        return
      }
      // Expand ingredients
      ;(recipe.ingredients ?? []).forEach(ing => {
        const key = ing.name.toLowerCase()
        if (!seen.has(key) && !existingNames.has(key)) {
          seen.add(key)
          items.push({
            name:        ing.name,
            amount:      ing.amount ?? '',
            category:    getIngredientCategory(ing.name),
            source:      'planner',
            recipe_id:   rid,
            recipe_name: recipe.name,
          })
        }
      })
    })

    // ── From linked_recipe_ids on activeList (not already covered by board plan) ──
    ;(activeList?.linked_recipe_ids ?? []).forEach(rid => {
      if (planRecipeIdSet.has(rid)) return // already expanded above
      const r = myRecipes.find(r => r.id === rid)
      if (!r) return
      ;(r.ingredients ?? []).forEach(ing => {
        const key = ing.name.toLowerCase()
        if (!seen.has(key) && !existingNames.has(key)) {
          seen.add(key)
          items.push({
            name:        ing.name,
            amount:      ing.amount ?? '',
            category:    getIngredientCategory(ing.name),
            source:      'recipe',
            recipe_id:   rid,
            recipe_name: r.name,
          })
        }
      })
    })

    return items
  }, [boardPlans, selectedAthleteId, allItems, activeList, myRecipes, INGREDIENT_CATEGORY_MAP])

  // Pantry log = all checked items ever, from pantry_log field + current checked items
  const pantryLog = useMemo(() => {
    const historical = (activeList?.pantry_log ?? [])
    const currentChecked = allItems
      .filter(i => i.checked)
      .map(i => ({
        id: `cur-${i.id}`,
        name: i.name,
        amount: i.amount,
        price: i.price,
        purchased_at: activeList?.shopping_date ?? activeList?.week_start ?? '',
        recipe_ids: i.recipe_ids ?? [],
        list_label: activeList?.label ?? '',
        notes: i.notes ?? '',
        is_current: true,
      }))
    return [...historical, ...currentChecked]
  }, [activeList, allItems])

  // Group pantry log by list_label
  const pantryByList = useMemo(() => {
    const groups = {}
    pantryLog.forEach(entry => {
      const key = entry.list_label || 'Uncategorized'
      if (!groups[key]) groups[key] = []
      groups[key].push(entry)
    })
    return groups
  }, [pantryLog])

  // When athlete changes, reset active list + tab
  useEffect(() => {
    const lists = athleteShoppingLists?.[selectedAthleteId] ?? []
    setActiveAslId(lists[0]?.id ?? null)
    setPanelTab('list')
  }, [selectedAthleteId, athleteShoppingLists])

  function handleRecipeDropToList(e) {
    e.preventDefault()
    setSlDragOver(false)
    if (!slDragging || !activeList) return
    const newItems = (slDragging.ingredients ?? []).length === 0
      ? [{ id: genAsliId(), name: slDragging.name + ' ingredients', amount: `${slDragging.servings ?? 1} serving(s)`, price: 0, checked: false, recipe_ids: [slDragging.id], allergen_flag: (slDragging.allergens ?? []).some(a => (athlete?.dietary_profile?.allergens ?? []).includes(a)) }]
      : (slDragging.ingredients ?? []).map(ing => ({
          id: genAsliId(),
          name: ing.name ?? ing,
          amount: ing.amount ?? '',
          price: 0,
          checked: false,
          recipe_ids: [slDragging.id],
          allergen_flag: (slDragging.allergens ?? []).some(a => (athlete?.dietary_profile?.allergens ?? []).includes(a)),
        }))
    const existingNames = new Set(allItems.map(i => i.name.toLowerCase()))
    const toAdd = newItems.filter(i => !existingNames.has(i.name.toLowerCase()))
    if (!toAdd.length) { setSlDragging(null); return }
    const catName = slDragging.name
    setAthleteShoppingLists(prev => ({
      ...prev,
      [selectedAthleteId]: (prev[selectedAthleteId] ?? []).map(l => {
        if (l.id !== activeAslId) return l
        const existsCat = l.categories.find(c => c.name === catName)
        if (existsCat) return { ...l, categories: l.categories.map(c => c.name === catName ? { ...c, items: [...c.items, ...toAdd] } : c) }
        return { ...l, categories: [...l.categories, { name: catName, icon: '', items: toAdd }] }
      }),
    }))
    setSlDragging(null)
  }

  function handleToggleItem(catName, itemId) {
    const cat = activeList?.categories?.find(c => c.name === catName)
    const item = cat?.items?.find(i => i.id === itemId)
    const nowChecking = item && !item.checked
    // Persist to DB for real item IDs
    if (!isDemo && itemId && !String(itemId).startsWith('sli-') && !String(itemId).startsWith('asl')) {
      toggleShoppingItem(itemId, nowChecking)
    }
    setAthleteShoppingLists(prev => ({
      ...prev,
      [selectedAthleteId]: (prev[selectedAthleteId] ?? []).map(l => {
        if (l.id !== activeAslId) return l
        // When checking an item: also push to pantry_log if not already there
        const updatedCats = l.categories.map(c => c.name !== catName ? c : {
          ...c, items: c.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i)
        })
        if (nowChecking && item) {
          const existing = (l.pantry_log ?? []).find(p => p.name.toLowerCase() === item.name.toLowerCase() && p.list_label === l.label)
          if (!existing) {
            const logEntry = {
              id: `pl-auto-${itemId}`,
              name: item.name,
              amount: item.amount,
              price: item.price,
              purchased_at: l.shopping_date ?? new Date().toISOString().slice(0, 10),
              recipe_ids: item.recipe_ids ?? [],
              list_label: l.label,
              notes: '',
            }
            return { ...l, categories: updatedCats, pantry_log: [...(l.pantry_log ?? []), logEntry] }
          }
        }
        return { ...l, categories: updatedCats }
      })
    }))
  }

  function handleCreateList() {
    const label = newListLabel.trim() || `${athlete?.full_name?.split(' ')[0]} — New List`
    const myRecipeMap = Object.fromEntries(myRecipes.map(r => [r.id, r]))

    // Auto-derive ingredient categories for initial population
    const CATEGORY_ORDER = ['Proteins', 'Carbohydrates', 'Vegetables', 'Dairy & Alternatives', 'Pantry']
    const categoryMap = {}
    CATEGORY_ORDER.forEach(c => { categoryMap[c] = { name: c, icon: '', items: [] } })

    // Pull all recipe_ids from this athlete's board plan and expand ingredients
    const athletePlan = boardPlans?.[selectedAthleteId] ?? {}
    const planRecipeIdSet = new Set()
    Object.values(athletePlan).forEach(daySlots => {
      Object.values(daySlots).forEach(slotItems => {
        ;(slotItems || []).forEach(item => { if (item.recipe_id) planRecipeIdSet.add(item.recipe_id) })
      })
    })

    const seenNames = new Set()
    planRecipeIdSet.forEach(rid => {
      const recipe = myRecipeMap[rid]
      if (!recipe) return
      ;(recipe.ingredients ?? []).forEach(ing => {
        const key = ing.name.toLowerCase()
        if (seenNames.has(key)) return
        seenNames.add(key)
        const cat = getIngredientCategory(ing.name)
        if (!categoryMap[cat]) categoryMap[cat] = { name: cat, icon: '', items: [] }
        categoryMap[cat].items.push({
          id: genAsliId(),
          name: ing.name,
          amount: ing.amount ?? '',
          price: 0,
          checked: false,
          recipe_ids: [rid],
          allergen_flag: (recipe.allergens ?? []).some(a => (athlete?.dietary_profile?.allergens ?? []).includes(a)),
        })
      })
    })

    // Only include non-empty categories, preserve order
    const allCats = CATEGORY_ORDER
      .map(c => categoryMap[c])
      .filter(c => c.items.length > 0)
    // Add any extra cats not in the order list
    Object.values(categoryMap).forEach(c => {
      if (!CATEGORY_ORDER.includes(c.name) && c.items.length > 0) allCats.push(c)
    })
    // If nothing derived, fall back to empty standard categories
    const finalCats = allCats.length > 0
      ? allCats
      : [
          { name: 'Proteins',      icon: '', items: [] },
          { name: 'Carbohydrates', icon: '', items: [] },
          { name: 'Vegetables',    icon: '', items: [] },
          { name: 'Pantry',        icon: '', items: [] },
        ]

    const newList = {
      id: genAslId(),
      athlete_id: selectedAthleteId,
      label,
      week_start: newListStart,
      week_end: newListEnd,
      shopping_date: newListShopDate,
      budget: athlete?.dietary_profile?.weekly_food_budget ?? 150,
      status: 'active',
      pantry_log: [],
      linked_recipe_ids: [...planRecipeIdSet],
      linked_block_id: null,
      notes: '',
      categories: finalCats,
    }
    setAthleteShoppingLists(prev => ({ ...prev, [selectedAthleteId]: [...(prev[selectedAthleteId] ?? []), newList] }))
    setActiveAslId(newList.id)
    setNewListModal(false)
    setNewListLabel('')
    setNewListStart('')
    setNewListEnd('')
    setNewListShopDate('')
    if (!isDemo && selectedAthleteId) {
      saveShoppingList(selectedAthleteId, profile?.id, activeOrgId, {
        label: newList.label,
        week_start: newList.week_start,
        week_end: newList.week_end,
        budget: newList.budget,
        status: 'active',
      })
    }
  }

  return (
    <div className="flex gap-4 min-h-0">
      {/* ── Athlete sidebar ─────────────────── */}
      <div className="w-48 flex-shrink-0 space-y-1.5">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1 mb-2">Athletes</p>
        {mockAthletes.map(a => {
          const aLists = athleteShoppingLists?.[a.id] ?? []
          const dp = a.dietary_profile
          const aItems = aLists.filter(l => l.status === 'active').flatMap(l => l.categories.flatMap(c => c.items))
          const aUnchecked = aItems.filter(i => !i.checked).length
          const aBudget = dp?.weekly_food_budget ?? 0
          const aSpent = aItems.reduce((s, i) => s + (i.price || 0), 0)
          const aPct = aBudget > 0 ? Math.min(100, (aSpent / aBudget) * 100) : 0
          const aBarColor = aSpent > aBudget ? 'bg-red-500' : aSpent > aBudget * 0.85 ? 'bg-yellow-500' : 'bg-teal-500'
          const aTxtColor = aSpent > aBudget ? 'text-red-400' : aSpent > aBudget * 0.85 ? 'text-yellow-400' : 'text-green-400'
          const isSelected = a.id === selectedAthleteId
          // Next shop date
          const aActiveList = aLists.find(l => l.status === 'active')
          const aShopDate = aActiveList?.shopping_date ? new Date(aActiveList.shopping_date) : null
          const aDaysToShop = aShopDate ? Math.ceil((aShopDate - today) / (1000 * 60 * 60 * 24)) : null
          return (
            <button key={a.id}
              onClick={() => setSelectedAthleteId(a.id)}
              className={cn('w-full text-left p-2.5 rounded-xl border transition-all',
                isSelected ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600'
              )}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                  isSelected ? 'bg-zinc-600 text-white' : 'bg-zinc-700 text-zinc-400')}>
                  {a.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-200 truncate">{a.full_name.split(' ')[0]}</p>
                  {aDaysToShop !== null && (
                    <p className={cn('text-[9px]', aDaysToShop <= 1 ? 'text-amber-500' : 'text-zinc-600')}>
                      {aDaysToShop === 0 ? 'shop today' : aDaysToShop < 0 ? 'overdue' : `shop in ${aDaysToShop}d`}
                    </p>
                  )}
                </div>
                {aUnchecked > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400 flex-shrink-0">{aUnchecked}</span>
                )}
              </div>
              <div className="h-1 w-full bg-zinc-700/60 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', aBarColor)} style={{ width: `${aPct}%` }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-zinc-600">budget</span>
                <span className={cn('text-[9px] font-semibold', aTxtColor)}>${aSpent.toFixed(0)}/${aBudget}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Main panel ──────────────────────── */}
      <div className="flex-1 space-y-3 min-w-0">

        {/* Header card: list info + shop date + stats */}
        <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-2xl p-4 space-y-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-zinc-100">{athlete?.full_name?.split(' ')[0]}</p>
                {activeList && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-700/60 px-2 py-0.5 rounded">{activeList.label}</span>
                )}
              </div>
              {/* Date range */}
              {activeList?.week_start && (
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  {activeList.week_start} → {activeList.week_end}
                  {activeList.cadence && <span className="ml-1.5 capitalize">{activeList.cadence}</span>}
                </p>
              )}
              {/* Shopping date countdown */}
              {shopDate && (
                <div className={cn('flex items-center gap-1.5 mt-1.5 text-xs font-semibold',
                  daysToShop === 0 ? 'text-amber-400' : daysToShop < 0 ? 'text-red-400' : daysToShop <= 2 ? 'text-amber-400' : 'text-zinc-400'
                )}>
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                  {daysToShop === 0
                    ? 'Shopping today — ' + shopDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : daysToShop < 0
                    ? `Shopping was ${Math.abs(daysToShop)}d ago`
                    : `Shopping in ${daysToShop} day${daysToShop !== 1 ? 's' : ''} — ${shopDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                  }
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className={cn('text-xl font-black leading-none', budgetColor)}>${spent.toFixed(2)}</p>
              <p className="text-[10px] text-zinc-500">of ${budget}</p>
              <p className={cn('text-[10px] font-semibold mt-0.5', remaining >= 0 ? 'text-green-400' : 'text-red-400')}>
                {remaining >= 0 ? `$${remaining.toFixed(2)} left` : `$${Math.abs(remaining).toFixed(2)} over`}
              </p>
            </div>
          </div>

          {/* Budget bar */}
          <div className="h-1.5 w-full bg-zinc-700/60 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${budgetPct}%` }} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { val: allItems.length,                        label: 'items',     color: 'text-zinc-200' },
              { val: allItems.filter(i => i.checked).length, label: 'got',       color: 'text-teal-400' },
              { val: allItems.filter(i => !i.checked).length,label: 'to get',    color: 'text-zinc-400' },
              { val: `$${checkedSpent.toFixed(0)}`,          label: 'spent',     color: 'text-zinc-300' },
            ].map(s => (
              <div key={s.label} className="bg-zinc-700/30 rounded-xl py-1.5">
                <p className={cn('text-sm font-bold', s.color)}>{s.val}</p>
                <p className="text-[9px] text-zinc-600">{s.label}</p>
              </div>
            ))}
          </div>

          {/* List selector + new list */}
          {myLists.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-700/30">
              <select value={activeAslId ?? ''} onChange={e => setActiveAslId(e.target.value)}
                className="flex-1 bg-zinc-700/50 border border-zinc-600/50 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none">
                {myLists.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              <button onClick={() => setNewListModal(true)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600/50 rounded-lg text-zinc-300 transition-colors">
                <Plus className="w-3 h-3" /> New
              </button>
            </div>
          )}
        </div>

        {/* Tab switcher: Shopping List | Suggested | Pantry / History */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-1 flex-1">
            {[
              { key: 'list',      label: 'Shopping List', count: allItems.filter(i => !i.checked).length },
              { key: 'suggested', label: 'Suggested',     count: suggestedItems.length },
              { key: 'pantry',    label: 'History',        count: pantryLog.length },
            ].map(t => (
              <button key={t.key} onClick={() => setPanelTab(t.key)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg font-semibold transition-colors',
                  panelTab === t.key ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
                )}>
                {t.label}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                  panelTab === t.key ? 'bg-zinc-600 text-zinc-200' : 'bg-zinc-700/60 text-zinc-600'
                )}>{t.count}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setShopIntervalModal(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors flex-shrink-0">
            <Settings className="w-3.5 h-3.5" />
            <span className="capitalize">{shopInterval.cadence}</span>
          </button>
        </div>

        {/* ── SHOPPING LIST TAB ── */}
        {panelTab === 'list' && (
          <>
            {/* Drag-a-recipe zone */}
            {myRecipes.length > 0 && (
              <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 font-semibold mb-2 uppercase tracking-wider">Drag recipe → add its ingredients</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {myRecipes.map(r => (
                    <div key={r.id} draggable
                      onDragStart={() => setSlDragging(r)}
                      onDragEnd={() => setSlDragging(null)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded border text-xs cursor-grab select-none transition-all',
                        'bg-zinc-700/60 border-zinc-600/60 text-zinc-400 hover:border-zinc-500',
                        slDragging?.id === r.id && 'opacity-40'
                      )}>
                      
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setSlDragOver(true) }}
                  onDragLeave={() => setSlDragOver(false)}
                  onDrop={handleRecipeDropToList}
                  className={cn(
                    'flex items-center justify-center h-10 rounded-lg border border-dashed transition-all text-[11px]',
                    slDragOver ? 'bg-teal-900/20 border-teal-500/60 text-teal-400' : 'border-zinc-700/40 text-zinc-600'
                  )}>
                  {slDragOver ? 'Drop to add ingredients' : 'Drop here'}
                </div>
              </div>
            )}

            {/* Shopping list body */}
            {activeList ? (
              <div className="space-y-2">
                {(activeList.categories ?? []).map(category => {
                  const catTotal   = category.items.reduce((s, i) => s + (i.price || 0), 0)
                  const catChecked = category.items.filter(i => i.checked).length
                  if (category.items.length === 0) return null
                  return (
                    <div key={category.name} className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{category.icon}</span>
                          <span className="text-xs font-semibold text-zinc-300">{category.name}</span>
                          <span className="text-[10px] text-zinc-600">{catChecked}/{category.items.length}</span>
                        </div>
                        {catTotal > 0 && <span className="text-[10px] text-zinc-500">${catTotal.toFixed(2)}</span>}
                      </div>
                      <div className="divide-y divide-zinc-800/60">
                        {category.items.map(item => {
                          // Resolve linked recipe names + board plan usage for this item
                          const linkedRecipes = (item.recipe_ids ?? [])
                            .map(rid => {
                              const name = recipeNameMap[rid]
                              if (!name) return null
                              // Find board plan days/slots where this recipe appears
                              const usages = []
                              const athletePlan = boardPlans?.[selectedAthleteId] ?? {}
                              Object.entries(athletePlan).forEach(([day, daySlots]) => {
                                Object.entries(daySlots).forEach(([slot, slotItems]) => {
                                  ;(slotItems ?? []).forEach(bi => {
                                    if (bi.recipe_id === rid) {
                                      usages.push({ day: DAY_SHORT_MAP[day] ?? day, slot: slot.replace('-', ' ') })
                                    }
                                  })
                                })
                              })
                              return { id: rid, name, usages }
                            })
                            .filter(Boolean)
                          const isExpanded = expandedItem === item.id
                          const hasLinked = linkedRecipes.length > 0

                          return (
                            <div key={item.id}>
                              {/* Main row — entire row clickable to expand */}
                              <div
                                onClick={() => hasLinked && setExpandedItem(isExpanded ? null : item.id)}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2.5 transition-colors',
                                  item.checked ? 'bg-zinc-900/30' : 'hover:bg-zinc-700/20',
                                  hasLinked && 'cursor-pointer'
                                )}
                              >
                                {/* Checkbox — stops propagation so it doesn't also toggle expand */}
                                <button
                                  onClick={e => { e.stopPropagation(); handleToggleItem(category.name, item.id) }}
                                  className="flex-shrink-0"
                                >
                                  {item.checked
                                    ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                                    : <Circle className="w-4 h-4 text-zinc-600" />}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={cn('text-sm', item.checked ? 'text-zinc-600 line-through' : 'text-zinc-200')}>
                                      {item.name}
                                    </p>
                                    {item.allergen_flag && (
                                      <span className="text-[9px] text-red-400 font-semibold">⚠ allergen</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {item.amount && <span className="text-[10px] text-zinc-600">{item.amount}</span>}
                                    {hasLinked && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-zinc-500">
                                        <UtensilsCrossed className="w-2.5 h-2.5" />
                                        {linkedRecipes.length === 1
                                          ? linkedRecipes[0].name
                                          : `${linkedRecipes.length} meals`}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-[10px] text-zinc-600">${(item.price || 0).toFixed(2)}</span>
                                  {hasLinked && (
                                    <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-600 transition-transform', isExpanded && 'rotate-180')} />
                                  )}
                                </div>
                              </div>

                              {/* Expanded meal association panel */}
                              {isExpanded && hasLinked && (
                                <div className="bg-zinc-900/60 border-t border-zinc-800 px-3 py-3 space-y-2">
                                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Used in</p>
                                  {linkedRecipes.map(recipe => (
                                    <div key={recipe.id} className="bg-zinc-800/60 rounded-xl px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <UtensilsCrossed className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                                        <p className="text-xs font-semibold text-zinc-200">{recipe.name}</p>
                                      </div>
                                      {recipe.usages.length > 0 ? (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          {recipe.usages.map((u, ui) => (
                                            <span key={ui}
                                              className="text-[10px] px-2 py-0.5 bg-zinc-700/60 border border-zinc-700 rounded-full text-zinc-400 capitalize">
                                              {u.day} · {u.slot}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-zinc-600 mt-1">Linked — not yet placed on planner</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (

              <div className="text-center py-10 text-zinc-500 bg-zinc-800/40 rounded-2xl border border-zinc-700/40">
                <ShoppingCart className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm mb-3">No shopping list yet.</p>
                <button onClick={() => setNewListModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600/40 rounded-xl text-zinc-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Create Shopping List
                </button>
              </div>
            )}
          </>
        )}

        {/* ── SUGGESTED ITEMS TAB ── */}
        {panelTab === 'suggested' && (
          <div className="space-y-3">
            {suggestedItems.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 bg-zinc-800/40 rounded-2xl border border-zinc-700/40">
                <ShoppingCart className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No suggestions yet.</p>
                <p className="text-xs mt-1">Assign meals in the Meal Planner or link recipes to this list.</p>
              </div>
            ) : (() => {
              // Group by recipe
              const byRecipe = {}
              suggestedItems.forEach(item => {
                const key = item.recipe_id ?? '__misc__'
                if (!byRecipe[key]) byRecipe[key] = { recipe_name: item.recipe_name ?? 'Other', recipe_id: item.recipe_id, items: [] }
                byRecipe[key].items.push(item)
              })
              const addItemsToList = (itemsToAdd) => {
                setAthleteShoppingLists(prev => {
                  const updated = (prev[selectedAthleteId] ?? []).map(l => {
                    if (l.id !== activeList?.id) return l
                    let cats = l.categories.map(c => ({ ...c, items: [...c.items] }))
                    itemsToAdd.forEach(item => {
                      const newItem = { id: genAsliId(), name: item.name, amount: item.amount ?? '', price: 0, checked: false, recipe_ids: item.recipe_id ? [item.recipe_id] : [] }
                      const existsCat = cats.find(c => c.name === item.category)
                      if (existsCat) { cats = cats.map(c => c.name === item.category ? { ...c, items: [...c.items, newItem] } : c) }
                      else cats = [...cats, { name: item.category, icon: '', items: [newItem] }]
                    })
                    return { ...l, categories: cats }
                  })
                  return { ...prev, [selectedAthleteId]: updated }
                })
              }
              const allNotAdded = suggestedItems.filter(item => !allItems.some(i => i.name.toLowerCase() === item.name.toLowerCase()))
              return (
                <div className="space-y-3">
                  {/* Add all banner */}
                  {allNotAdded.length > 0 && (
                    <div className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/40 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">{allNotAdded.length} ingredient{allNotAdded.length !== 1 ? 's' : ''} to add</p>
                        <p className="text-[10px] text-zinc-500">from {Object.keys(byRecipe).length} recipe{Object.keys(byRecipe).length !== 1 ? 's' : ''} on your plan</p>
                      </div>
                      <button onClick={() => { addItemsToList(allNotAdded); setPanelTab('list') }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-colors flex-shrink-0">
                        <Plus className="w-3.5 h-3.5" /> Add All
                      </button>
                    </div>
                  )}
                  {/* Per-recipe groups */}
                  {Object.values(byRecipe).map(group => {
                    const groupNotAdded = group.items.filter(item => !allItems.some(i => i.name.toLowerCase() === item.name.toLowerCase()))
                    const allGroupAdded = groupNotAdded.length === 0
                    return (
                      <div key={group.recipe_id ?? '__misc__'} className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl overflow-hidden">
                        {/* Recipe header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/30 bg-zinc-800/60">
                          <div className="flex items-center gap-2 min-w-0">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                            <p className="text-xs font-semibold text-zinc-300 truncate">{group.recipe_name}</p>
                            <span className="text-[10px] text-zinc-600 flex-shrink-0">{group.items.length} ingredients</span>
                          </div>
                          {allGroupAdded ? (
                            <span className="text-[10px] text-teal-400 flex items-center gap-1 flex-shrink-0"><CheckCircle2 className="w-3 h-3" />All added</span>
                          ) : (
                            <button onClick={() => addItemsToList(groupNotAdded)}
                              className="flex items-center gap-1 text-[10px] px-2 py-1 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600/60 rounded-lg text-zinc-300 transition-colors flex-shrink-0">
                              <Plus className="w-2.5 h-2.5" /> Add {groupNotAdded.length}
                            </button>
                          )}
                        </div>
                        {/* Ingredient rows */}
                        <div className="divide-y divide-zinc-800/60">
                          {group.items.map((item, idx) => {
                            const alreadyAdded = allItems.some(i => i.name.toLowerCase() === item.name.toLowerCase())
                            return (
                              <div key={idx} className={cn('flex items-center gap-3 px-3 py-2 transition-colors', alreadyAdded ? 'opacity-40' : 'hover:bg-zinc-700/20')}>
                                <div className="flex-1 min-w-0">
                                  <p className={cn('text-sm', alreadyAdded ? 'line-through text-zinc-500' : 'text-zinc-200')}>{item.name}</p>
                                  <div className="flex gap-2 mt-0.5 flex-wrap">
                                    {item.amount && <span className="text-[10px] text-zinc-500">{item.amount}</span>}
                                    <span className="text-[10px] text-zinc-700">{item.category}</span>
                                  </div>
                                </div>
                                {alreadyAdded ? (
                                  <CheckCircle2 className="w-4 h-4 text-teal-500/50 flex-shrink-0" />
                                ) : (
                                  <button onClick={() => addItemsToList([item])}
                                    className="text-[10px] px-2 py-1 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600/60 rounded-lg text-zinc-400 transition-colors flex-shrink-0">
                                    + Add
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ── PANTRY / HISTORY TAB ── */}
        {panelTab === 'pantry' && (
          <div className="space-y-3">
            {pantryLog.length === 0 ? (
              <div className="text-center py-10 text-zinc-600 bg-zinc-800/40 rounded-2xl border border-zinc-700/40">
                <Package className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pantry history yet.</p>
                <p className="text-xs mt-1">Items checked off the shopping list will appear here.</p>
              </div>
            ) : (
              <>
                <div className="px-1 pb-1 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-zinc-500" />
                  <p className="text-xs text-zinc-500">{athlete?.full_name?.split(' ')[0]}'s pantry — {pantryLog.length} item{pantryLog.length !== 1 ? 's' : ''} on record</p>
                </div>
                {Object.entries(pantryByList)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([listLabel, entries]) => (
                  <div key={listLabel} className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700/30 bg-zinc-800/60">
                      <Archive className="w-3 h-3 text-zinc-600" />
                      <span className="text-xs font-semibold text-zinc-400">{listLabel}</span>
                      <span className="text-[10px] text-zinc-600 ml-auto">{entries.length} item{entries.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-zinc-800/60">
                      {entries.map(entry => {
                        const linkedRecipeNames = (entry.recipe_ids ?? [])
                          .map(rid => recipeNameMap[rid])
                          .filter(Boolean)
                        const isEditingNote = pantryNote[entry.id] !== undefined
                        return (
                          <div key={entry.id} className="px-3 py-2 hover:bg-zinc-700/20 transition-colors">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500/60 mt-0.5 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm text-zinc-300">{entry.name}</span>
                                  {entry.is_current && (
                                    <span className="text-[9px] px-1.5 py-px bg-teal-900/40 border border-teal-700/40 rounded text-teal-400">current</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-zinc-600">
                                  {entry.amount && <span>{entry.amount}</span>}
                                  {entry.purchased_at && (
                                    <span className="flex items-center gap-0.5">
                                      <CalendarDays className="w-2.5 h-2.5" />
                                      {new Date(entry.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                  {linkedRecipeNames.length > 0 && (
                                    <span className="flex items-center gap-0.5 text-zinc-500">
                                      <Link2 className="w-2.5 h-2.5" />
                                      {linkedRecipeNames.join(' · ')}
                                    </span>
                                  )}
                                </div>
                                {/* Notes */}
                                {isEditingNote ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={pantryNote[entry.id]}
                                    onChange={e => setPantryNote(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                    onBlur={() => {
                                      // Save note back to pantry_log
                                      setAthleteShoppingLists(prev => ({
                                        ...prev,
                                        [selectedAthleteId]: (prev[selectedAthleteId] ?? []).map(l =>
                                          l.id !== activeAslId ? l : {
                                            ...l, pantry_log: (l.pantry_log ?? []).map(p =>
                                              p.id === entry.id ? { ...p, notes: pantryNote[entry.id] } : p
                                            )
                                          }
                                        )
                                      }))
                                      setPantryNote(prev => { const n = { ...prev }; delete n[entry.id]; return n })
                                    }}
                                    placeholder="Add note (e.g. half used, expired)"
                                    className="mt-1 w-full bg-zinc-700/60 border border-zinc-600/50 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                                  />
                                ) : (
                                  <button
                                    onClick={() => setPantryNote(prev => ({ ...prev, [entry.id]: entry.notes ?? '' }))}
                                    className="mt-1 text-[10px] text-zinc-700 hover:text-zinc-400 transition-colors"
                                  >
                                    {entry.notes ? entry.notes : '+ note'}
                                  </button>
                                )}
                              </div>
                              {entry.price > 0 && (
                                <span className="text-[10px] text-zinc-600 flex-shrink-0">${entry.price.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* New list modal */}
      {newListModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setNewListModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-zinc-100">New Shopping List — {athlete?.full_name?.split(' ')[0]}</p>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Label</label>
              <input type="text" value={newListLabel} onChange={e => setNewListLabel(e.target.value)}
                placeholder={`${athlete?.full_name?.split(' ')[0]} — Week ...`}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Week start</label>
                <input type="date" value={newListStart} onChange={e => setNewListStart(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Week end</label>
                <input type="date" value={newListEnd} onChange={e => setNewListEnd(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">Shopping date</label>
              <input type="date" value={newListShopDate} onChange={e => setNewListShopDate(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 focus:outline-none" />
            </div>
            <p className="text-[10px] text-zinc-600">Budget defaults to ${athlete?.dietary_profile?.weekly_food_budget ?? 150}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setNewListModal(false)} className="flex-1 text-sm py-2 rounded-xl bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 transition-colors">Cancel</button>
              <button onClick={handleCreateList} className="flex-1 text-sm py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold transition-colors flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SHOP INTERVAL / BUDGET SETTINGS ── */}
      <Modal open={shopIntervalModal} onClose={() => setShopIntervalModal(false)} title="Shopping Settings" size="sm">
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Shopping interval</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ key: 'weekly', label: 'Weekly' }, { key: 'biweekly', label: 'Bi-weekly' }, { key: 'monthly', label: 'Monthly' }].map(c => (
                <button key={c.key} onClick={() => setShopInterval(p => ({ ...p, cadence: c.key }))}
                  className={cn('text-xs py-2 rounded-xl border font-semibold transition-colors',
                    shopInterval.cadence === c.key ? 'bg-zinc-700 border-zinc-500 text-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  )}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Preferred shopping day</label>
            <select value={shopInterval.shopping_day} onChange={e => setShopInterval(p => ({ ...p, shopping_day: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600">
              {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => (
                <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Budget per interval ($)</label>
            <input type="number" min="0" step="5" value={shopInterval.budget}
              onChange={e => setShopInterval(p => ({ ...p, budget: Number(e.target.value) }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setShopIntervalModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => setShopIntervalModal(false)}><Check className="w-4 h-4" /> Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Pantry Tab ───────────────────────────────────────────────────────────────
// Shows all prepped meals per athlete with servings remaining, storage type,
// freshness estimate, and ability to log consumption or mark as finished.

const STORAGE_FRESHNESS = { fridge: 5, freezer: 90, counter: 1 } // days
const STORAGE_BADGE = {
  fridge:  'bg-blue-500/10 text-blue-300 border-blue-500/20',
  freezer: 'bg-zinc-700/60 text-zinc-400 border-zinc-600/40',
  counter: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
}

function PantryTab({ isAdmin, athletePrepLog, setAthletePrepLog, athleteRecipes }) {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes } = useRosterStore()
  const mockAthletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const myAssignments = mockStaffAssignments.filter(a => a.staff_id === profile?.id)
  const assignedIds   = myAssignments.map(a => a.athlete_id)
  const athletes      = isAdmin
    ? mockAthletes
    : assignedIds.length > 0 ? mockAthletes.filter(a => assignedIds.includes(a.id)) : mockAthletes

  const [selectedAthleteId, setSelectedAthleteId] = useState(athletes[0]?.id ?? null)
  const [filterStorage, setFilterStorage] = useState('all') // 'all' | 'fridge' | 'freezer' | 'counter'
  const [logModal, setLogModal] = useState(null) // { sessionId, item }
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ recipe_name: '', servings_made: 1, storage: 'fridge', notes: '', date: new Date().toISOString().slice(0,10), macros_per_serving: { calories: 0, protein: 0, carbs: 0, fat: 0 } })

  const today = new Date()
  const athlete = athletes.find(a => a.id === selectedAthleteId)
  const sessions = athletePrepLog?.[selectedAthleteId] ?? []

  // Flatten all items with session context, filter out fully consumed
  const allItems = useMemo(() => {
    return sessions.flatMap(s =>
      (s.items || []).map(item => ({
        ...item,
        sessionId:  s.id,
        sessionLabel: s.label,
        prepDate:   s.date,
        remaining:  Math.max(0, item.servings_made - item.servings_consumed),
      }))
    ).filter(item => item.remaining > 0)
  }, [sessions])

  const filteredItems = filterStorage === 'all'
    ? allItems
    : allItems.filter(i => i.storage === filterStorage)

  // Total macros available in pantry
  const totals = useMemo(() => filteredItems.reduce((acc, item) => ({
    calories: acc.calories + (item.macros_per_serving?.calories || 0) * item.remaining,
    protein:  acc.protein  + (item.macros_per_serving?.protein  || 0) * item.remaining,
    servings: acc.servings + item.remaining,
  }), { calories: 0, protein: 0, servings: 0 }), [filteredItems])

  function getDaysOld(prepDate) {
    if (!prepDate) return null
    const d = new Date(prepDate)
    return Math.floor((today - d) / 86400000)
  }

  function getFreshnessStatus(item) {
    const daysOld    = getDaysOld(item.prepDate)
    const maxDays    = STORAGE_FRESHNESS[item.storage] ?? 5
    if (daysOld === null) return { label: 'Unknown', color: 'text-zinc-500' }
    const daysLeft = maxDays - daysOld
    if (daysLeft <= 0)  return { label: 'Expired',     color: 'text-red-400',    urgent: true }
    if (daysLeft === 1) return { label: '1 day left',  color: 'text-orange-400', urgent: true }
    if (daysLeft <= 2)  return { label: `${daysLeft}d left`, color: 'text-yellow-400' }
    return { label: `${daysLeft}d left`, color: 'text-zinc-400' }
  }

  function logServing(sessionId, itemId, delta) {
    setAthletePrepLog(prev => ({
      ...prev,
      [selectedAthleteId]: (prev[selectedAthleteId] ?? []).map(s =>
        s.id !== sessionId ? s : {
          ...s, items: s.items.map(i => i.id !== itemId ? i : {
            ...i, servings_consumed: Math.max(0, Math.min(i.servings_made, i.servings_consumed + delta))
          })
        }
      )
    }))
  }

  function handleAddItem() {
    if (!addForm.recipe_name.trim()) return
    const sessionId = `apl-new-${Date.now()}`
    const itemId    = `api-new-${Date.now()}`
    const newSession = {
      id:          sessionId,
      athlete_id:  selectedAthleteId,
      label:       addForm.recipe_name,
      date:        addForm.date,
      week_start:  addForm.date,
      week_end:    addForm.date,
      linked_goal_ids: [], linked_block_id: null, linked_meet_id: null,
      notes:       addForm.notes,
      total_calories_prepped: addForm.macros_per_serving.calories * addForm.servings_made,
      total_protein_prepped:  addForm.macros_per_serving.protein  * addForm.servings_made,
      items: [{
        id:                  itemId,
        recipe_name:         addForm.recipe_name,
        servings_made:       Number(addForm.servings_made),
        servings_consumed:   0,
        storage:             addForm.storage,
        notes:               addForm.notes,
        macros_per_serving:  { ...addForm.macros_per_serving },
      }]
    }
    setAthletePrepLog(prev => ({
      ...prev,
      [selectedAthleteId]: [newSession, ...(prev[selectedAthleteId] ?? [])]
    }))
    // Persist to Supabase for real users
    if (!isDemo && selectedAthleteId && activeOrgId) {
      savePrepSessionFull(selectedAthleteId, activeOrgId, profile?.id, newSession, newSession.items)
        .then(saved => {
          if (saved?.id) {
            setAthletePrepLog(prev => ({
              ...prev,
              [selectedAthleteId]: (prev[selectedAthleteId] ?? []).map(s =>
                s.id === sessionId ? { ...s, id: saved.id } : s
              )
            }))
          }
        })
        .catch(err => console.error('[PantryTab] savePrepSessionFull error:', err))
    }
    setAddModal(false)
    setAddForm({ recipe_name: '', servings_made: 1, storage: 'fridge', notes: '', date: new Date().toISOString().slice(0,10), macros_per_serving: { calories: 0, protein: 0, carbs: 0, fat: 0 } })
  }

  return (
    <div className="space-y-4">
      {/* Athlete selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {athletes.map(a => (
          <button key={a.id} onClick={() => setSelectedAthleteId(a.id)}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
              selectedAthleteId === a.id
                ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600'
            )}>
            {a.full_name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Header + stats */}
      {athlete && (
        <Card>
          <CardBody className="py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold text-zinc-100">{athlete.full_name.split(' ')[0]}'s Pantry</p>
                <p className="text-xs text-zinc-500 mt-0.5">{allItems.length} item{allItems.length !== 1 ? 's' : ''} ready to eat</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-lg font-black text-zinc-100">{totals.servings}</p>
                  <p className="text-[10px] text-zinc-500">servings</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-zinc-100">{Math.round(totals.calories).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500">kcal available</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-zinc-100">{Math.round(totals.protein)}g</p>
                  <p className="text-[10px] text-zinc-500">protein</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setAddModal(true)}>
                <Plus className="w-3.5 h-3.5" /> Add to Pantry
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Storage filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'fridge', 'freezer', 'counter'].map(s => (
          <button key={s} onClick={() => setFilterStorage(s)}
            className={cn('px-3 py-1 rounded-lg text-xs font-medium border transition-colors capitalize',
              filterStorage === s
                ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/50 hover:text-zinc-300'
            )}>
            {s === 'all' ? 'All Storage' : s}
            {s !== 'all' && (
              <span className="ml-1.5 text-zinc-600">
                ({allItems.filter(i => i.storage === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {allItems.length === 0 ? 'No prepped meals in pantry.' : 'No items in this storage type.'}
          </p>
          {allItems.length === 0 && (
            <p className="text-xs mt-1 text-zinc-600">Log a prep session in Meal Prep to populate the pantry.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const freshness = getFreshnessStatus(item)
            const pct = item.servings_made > 0 ? Math.round((item.servings_consumed / item.servings_made) * 100) : 0
            return (
              <Card key={`${item.sessionId}-${item.id}`}>
                <CardBody className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-zinc-100">{item.recipe_name}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border capitalize', STORAGE_BADGE[item.storage] ?? STORAGE_BADGE.fridge)}>
                          {item.storage}
                        </span>
                        {freshness.urgent && (
                          <span className={cn('text-[10px] font-semibold', freshness.color)}>{freshness.label}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mb-1.5">From: {item.sessionLabel} · prepped {getDaysOld(item.prepDate) ?? '?'}d ago</p>
                      <div className="flex gap-3 text-xs text-zinc-400 flex-wrap mb-2">
                        <span className="font-semibold text-zinc-200">{item.remaining} serving{item.remaining !== 1 ? 's' : ''} left</span>
                        <span>of {item.servings_made} made</span>
                        {item.macros_per_serving?.calories > 0 && (
                          <>
                            <span className="text-zinc-600">·</span>
                            <span>{item.macros_per_serving.calories} kcal / serving</span>
                            <span className="text-zinc-600">·</span>
                            <span>{item.macros_per_serving.protein}g P</span>
                          </>
                        )}
                        {!freshness.urgent && (
                          <>
                            <span className="text-zinc-600">·</span>
                            <span className={freshness.color}>{freshness.label}</span>
                          </>
                        )}
                      </div>
                      <ProgressBar value={item.servings_consumed} max={Math.max(item.servings_made, 1)} color={pct >= 80 ? 'green' : 'teal'} />
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button onClick={() => logServing(item.sessionId, item.id, -1)}
                        disabled={item.servings_consumed <= 0}
                        className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 rounded-lg text-zinc-300 transition-colors">−</button>
                      <span className="text-[10px] text-zinc-500 text-center">{item.servings_consumed} used</span>
                      <button onClick={() => logServing(item.sessionId, item.id, 1)}
                        disabled={item.remaining <= 0}
                        className="text-xs px-2 py-1 bg-zinc-700/60 hover:bg-zinc-700 disabled:opacity-30 border border-zinc-600 rounded-lg text-zinc-300 transition-colors">+ Use</button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add item modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={`Add to ${athlete?.full_name.split(' ')[0]}'s Pantry`} size="sm">
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Item / Recipe Name *</label>
            <input value={addForm.recipe_name} onChange={e => setAddForm(p => ({ ...p, recipe_name: e.target.value }))}
              placeholder="e.g. Chicken & Rice Bowl"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Servings</label>
              <input type="number" min="1" value={addForm.servings_made} onChange={e => setAddForm(p => ({ ...p, servings_made: Number(e.target.value) }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Storage</label>
              <select value={addForm.storage} onChange={e => setAddForm(p => ({ ...p, storage: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600">
                {['fridge', 'freezer', 'counter'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Prep Date</label>
              <input type="date" value={addForm.date} onChange={e => setAddForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Cal / serving</label>
              <input type="number" min="0" value={addForm.macros_per_serving.calories} onChange={e => setAddForm(p => ({ ...p, macros_per_serving: { ...p.macros_per_serving, calories: Number(e.target.value) } }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Protein (g) / serving</label>
              <input type="number" min="0" value={addForm.macros_per_serving.protein} onChange={e => setAddForm(p => ({ ...p, macros_per_serving: { ...p.macros_per_serving, protein: Number(e.target.value) } }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
              <input value={addForm.notes} onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAddItem}><Plus className="w-4 h-4" /> Add Item</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Shopping List Tab ─────────────────────────────────────────────────────────
let _nextListId = 10
const genListId = () => `sl-new${_nextListId++}`

function ShoppingListTab({ isStaff, athleteRecipes, athleteShoppingLists, setAthleteShoppingLists, athletePrepLog, boardPlans }) {
  const { isDemo, profile, activeOrgId } = useAuthStore()
  const { athletes: rosterAthletes, loadRoster } = useRosterStore()
  const { loadAthleteNutrition } = useNutritionStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : profile?.id
  const mockAthletes = isDemo ? MOCK_ATHLETES : rosterAthletes
  const mockShoppingLists = isDemo ? MOCK_SHOPPING_LISTS : (athleteShoppingLists?.[MY_ATHLETE_ID] ?? [])
  const [lists, setLists] = useState(() => mockShoppingLists.map(l => ({ ...l, categories: (l.categories ?? []).map(c => ({ ...c, items: c.items.map(i => ({ ...i })) })) })))
  const [activeListId, setActiveListId] = useState(mockShoppingLists[0]?.id ?? null)

  // For real users: sync from store when store changes (loaded on mount by NutritionPage)
  useEffect(() => {
    if (!isDemo && MY_ATHLETE_ID) {
      const storeLists = athleteShoppingLists?.[MY_ATHLETE_ID] ?? []
      if (storeLists.length > 0) {
        setLists(storeLists.map(l => ({ ...l, categories: (l.categories ?? []).map(c => ({ ...c, items: (c.items ?? []).map(i => ({ ...i })) })) })))
        setActiveListId(prev => prev ?? storeLists[0]?.id ?? null)
      }
    }
  }, [athleteShoppingLists, MY_ATHLETE_ID, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist lists back to store so other tabs stay in sync
  useEffect(() => {
    if (!isDemo && MY_ATHLETE_ID) {
      setAthleteShoppingLists(prev => ({ ...prev, [MY_ATHLETE_ID]: lists }))
    }
  }, [lists]) // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView]               = useState('list') // 'list' | 'history'
  const [shopMode, setShopMode]       = useState(isStaff ? 'athletes' : 'personal') // 'personal' | 'athletes' | 'templates'
  const [selectedShopAthleteId, setSelectedShopAthleteId] = useState(mockAthletes[0]?.id ?? null)
  const [addOpen, setAddOpen]         = useState(false)
  const [editTarget, setEditTarget]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [collapsed, setCollapsed]     = useState({})
  const [showNutrition, setShowNutrition] = useState({})
  const [editBudget, setEditBudget]   = useState(false)
  const [optimized, setOptimized]     = useState(false)
  const [duplicateListModal, setDuplicateListModal] = useState(false)
  const [newListModal, setNewListModal] = useState(false)
  const [copyItemModal, setCopyItemModal] = useState(null)  // { item, catName }
  const [linkModal, setLinkModal]     = useState(false)

  // ── Shopping List Templates (staff only) ──────────────────────────────────
  const [templates, setTemplates] = useState(!isDemo ? [] : [
    {
      id: 'tmpl-1',
      name: 'High-Protein Base',
      description: 'Lean proteins + complex carbs for training blocks',
      categories: [
        { name: 'Proteins', icon: '🥩', items: [
          { id: 'ti-1', name: 'Chicken Breast (2 lbs)', amount: '2 lbs', price: 12.99, checked: false },
          { id: 'ti-2', name: 'Salmon Fillet (1 lb)',  amount: '1 lb',  price: 14.99, checked: false },
          { id: 'ti-3', name: 'Greek Yogurt (32oz)',   amount: '32 oz', price: 6.49,  checked: false },
          { id: 'ti-4', name: 'Eggs (1 dozen)',         amount: '12',    price: 4.99,  checked: false },
        ]},
        { name: 'Carbohydrates', icon: '🌾', items: [
          { id: 'ti-5', name: 'Brown Rice (5 lbs)',    amount: '5 lbs', price: 7.49,  checked: false },
          { id: 'ti-6', name: 'Sweet Potatoes (3 lbs)', amount: '3 lbs', price: 5.49, checked: false },
          { id: 'ti-7', name: 'Oats (2 lbs)',           amount: '2 lbs', price: 4.99,  checked: false },
        ]},
        { name: 'Vegetables', icon: '🥦', items: [
          { id: 'ti-8', name: 'Broccoli (2 heads)',    amount: '2',     price: 3.98,  checked: false },
          { id: 'ti-9', name: 'Spinach (5oz bag)',     amount: '5 oz',  price: 3.49,  checked: false },
        ]},
      ],
      assignedAthletes: [],
    },
    {
      id: 'tmpl-2',
      name: 'Meet Week Cuts',
      description: 'Low-sodium, moderate carb for water management',
      categories: [
        { name: 'Proteins', icon: '🥩', items: [
          { id: 'ti-10', name: 'Tilapia (2 lbs)',       amount: '2 lbs', price: 10.99, checked: false },
          { id: 'ti-11', name: 'Egg Whites (carton)',   amount: '1 carton', price: 5.99, checked: false },
        ]},
        { name: 'Vegetables', icon: '🥦', items: [
          { id: 'ti-12', name: 'Asparagus (1 lb)',      amount: '1 lb',  price: 4.99,  checked: false },
          { id: 'ti-13', name: 'Cucumber (2 ct)',       amount: '2',     price: 1.98,  checked: false },
        ]},
      ],
      assignedAthletes: [],
    },
  ])
  const [templateView, setTemplateView] = useState('list') // 'list' | 'edit'
  const [editingTemplate, setEditingTemplate] = useState(null) // null | template object
  const [tmplAssignModal, setTmplAssignModal] = useState(null) // template id
  const [newTmplForm, setNewTmplForm] = useState({ name: '', description: '' })
  const [newTmplModal, setNewTmplModal] = useState(false)
  const [tmplItemForm, setTmplItemForm] = useState({ name: '', amount: '', price: '', category: '' })
  const [tmplAddItemOpen, setTmplAddItemOpen] = useState(false)

  // duplicate / new list form state
  const [dupForm, setDupForm] = useState({ label: '', week_start: '', week_end: '', cadence: 'weekly', budget: 150 })
  const [newForm, setNewForm] = useState({ label: '', week_start: '', week_end: '', cadence: 'weekly', budget: 150, notes: '' })

  const activeList = lists.find(l => l.id === activeListId) ?? lists[0]

  const categories = activeList?.categories ?? []
  const allItems   = categories.flatMap(c => c.items)
  const totalItems = allItems.length
  const checkedCount = allItems.filter(i => i.checked).length
  const totalCost    = allItems.reduce((s, i) => s + (i.price || 0), 0)
  const budget       = activeList?.budget ?? 0
  const budgetColor  = totalCost > budget ? 'red' : totalCost > budget * 0.85 ? 'yellow' : 'green'
  const budgetTextColor = totalCost > budget ? 'text-red-400' : totalCost > budget * 0.85 ? 'text-yellow-400' : 'text-green-400'

  const updateActiveList = (fn) =>
    setLists(prev => prev.map(l => l.id === activeListId ? fn(l) : l))

  const toggle = (catName, itemId) => {
    // Find current checked state to compute new value
    const item = (activeList?.categories ?? []).find(c => c.name === catName)?.items.find(i => i.id === itemId)
    const newChecked = item ? !item.checked : true
    updateActiveList(l => ({ ...l, categories: l.categories.map(c => c.name !== catName ? c : { ...c, items: c.items.map(i => i.id === itemId ? { ...i, checked: newChecked } : i) }) }))
    // Persist to Supabase for real users (fire-and-forget)
    if (!isDemo && !itemId.startsWith('asli-') && !itemId.startsWith('ti-')) {
      toggleShoppingItem(itemId, newChecked)
    }
  }
  const toggleCollapse  = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))
  const toggleNutrition = (id)   => setShowNutrition(prev => ({ ...prev, [id]: !prev[id] }))
  const clearChecked = () =>
    updateActiveList(l => ({ ...l, categories: l.categories.map(c => ({ ...c, items: c.items.map(i => ({ ...i, checked: false })) })) }))
  const setBudget = (val) => updateActiveList(l => ({ ...l, budget: val }))

  const catIcon = {}

  const handleAddItem = (item) => {
    updateActiveList(l => {
      const existing = l.categories.find(c => c.name === item.category)
      if (existing) return { ...l, categories: l.categories.map(c => c.name === item.category ? { ...c, items: [...c.items, item] } : c) }
      return { ...l, categories: [...l.categories, { name: item.category, icon: catIcon[item.category] ?? '', items: [item] }] }
    })
  }
  const handleEditItem = (item) => {
    updateActiveList(l => ({ ...l, categories: l.categories.map(c => ({ ...c, items: c.items.map(i => i.id === item.id ? { ...item } : i) })) }))
    setEditTarget(null)
  }
  const handleDeleteItem = ({ categoryName, itemId }) => {
    updateActiveList(l => ({ ...l, categories: l.categories.map(c => c.name !== categoryName ? c : { ...c, items: c.items.filter(i => i.id !== itemId) }) }))
    setDeleteConfirm(null)
    // Persist deletion for real users (skip local/template ids)
    if (!isDemo && !itemId.startsWith('asli-') && !itemId.startsWith('ti-') && !itemId.startsWith('sli-')) {
      deleteShoppingListItem(itemId)
    }
  }

  // Copy/Move item to another list
  const handleCopyItem = (targetListId, item, catName, doMove) => {
    setLists(prev => {
      let updated = prev.map(l => {
        if (l.id !== targetListId) return l
        const exists = l.categories.find(c => c.name === catName)
        const newItem = { ...item, id: genSliId(), checked: false }
        if (exists) return { ...l, categories: l.categories.map(c => c.name === catName ? { ...c, items: [...c.items, newItem] } : c) }
        return { ...l, categories: [...l.categories, { name: catName, icon: catIcon[catName] ?? '', items: [newItem] }] }
      })
      if (doMove) {
        updated = updated.map(l => l.id !== activeListId ? l : {
          ...l, categories: l.categories.map(c => c.name !== catName ? c : { ...c, items: c.items.filter(i => i.id !== item.id) })
        })
      }
      return updated
    })
    setCopyItemModal(null)
  }

  // Duplicate entire list
  const handleDuplicateList = () => {
    if (!dupForm.label.trim()) return
    const newList = {
      ...activeList,
      id: genListId(),
      label: dupForm.label,
      week_start: dupForm.week_start,
      week_end: dupForm.week_end,
      cadence: dupForm.cadence,
      budget: Number(dupForm.budget),
      status: 'active',
      categories: activeList.categories.map(c => ({
        ...c, items: c.items.map(i => ({ ...i, id: genSliId(), checked: false }))
      }))
    }
    setLists(prev => [newList, ...prev])
    setActiveListId(newList.id)
    setDuplicateListModal(false)
    setView('list')
  }

  // Create new empty list
  const handleNewList = async () => {
    if (!newForm.label.trim()) return
    const newList = {
      id: genListId(),
      label: newForm.label,
      week_start: newForm.week_start,
      week_end: newForm.week_end,
      cadence: newForm.cadence,
      budget: Number(newForm.budget),
      status: 'active',
      linked_goal_ids: [],
      linked_block_id: null,
      linked_meet_id: null,
      notes: newForm.notes,
      categories: SHOPPING_CATEGORIES.map(name => ({ name, icon: catIcon[name] ?? '', items: [] }))
    }
    setLists(prev => [newList, ...prev])
    setActiveListId(newList.id)
    setNewListModal(false)
    setView('list')
    // Persist to Supabase for real users
    if (!isDemo && MY_ATHLETE_ID) {
      const saved = await saveShoppingList(MY_ATHLETE_ID, MY_ATHLETE_ID, activeOrgId, newList)
      if (saved) {
        setLists(prev => prev.map(l => l.id === newList.id ? { ...l, id: saved.id } : l))
        setActiveListId(prev => prev === newList.id ? saved.id : prev)
      }
    }
  }

  const handleOptimize = () => {
    if (totalCost <= budget) return
    const sorted = allItems.filter(i => !i.checked).sort((a, b) => (b.price || 0) - (a.price || 0))
    let running = totalCost
    const toRemove = new Set()
    for (const item of sorted) {
      if (running <= budget) break
      toRemove.add(item.id)
      running -= (item.price || 0)
    }
    updateActiveList(l => ({ ...l, categories: l.categories.map(c => ({ ...c, items: c.items.filter(i => !toRemove.has(i.id)) })) }))
    setOptimized(true)
    setTimeout(() => setOptimized(false), 3000)
  }

  const markCompleted = () => updateActiveList(l => ({ ...l, status: 'completed' }))

  const cadenceBadge = { weekly: 'bg-teal-500/15 text-teal-300 border-teal-500/25', biweekly: 'bg-blue-500/15 text-blue-300 border-blue-500/25', monthly: 'bg-purple-500/15 text-purple-300 border-purple-500/25' }

  // Staff: athlete shopping view
  if (isStaff && shopMode === 'athletes') {
    return (
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-1">
          {[{ key: 'athletes', label: 'Athlete Lists' }, { key: 'personal', label: 'General List' }].map(m => (
            <button key={m.key} onClick={() => setShopMode(m.key)}
              className={cn('flex-1 text-xs py-2 rounded-xl border font-semibold transition-colors',
                shopMode === m.key ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}>{m.label}</button>
          ))}
        </div>
        <AthleteShoppingView
          athleteRecipes={athleteRecipes}
          athleteShoppingLists={athleteShoppingLists}
          setAthleteShoppingLists={setAthleteShoppingLists}
          selectedAthleteId={selectedShopAthleteId}
          setSelectedAthleteId={setSelectedShopAthleteId}
          athletePrepLog={athletePrepLog}
          boardPlans={boardPlans}
        />
      </div>
    )
  }

  if (view === 'history') {
    const completed = lists.filter(l => l.status === 'completed')
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-sm font-bold text-zinc-100 ml-2">Shopping List History</h2>
        </div>
        {completed.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Archive className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No completed shopping lists yet.</p>
          </div>
        )}
        {completed.map(l => {
          const items = l.categories.flatMap(c => c.items)
          const cost  = items.reduce((s, i) => s + (i.price || 0), 0)
          const checked = items.filter(i => i.checked).length
          return (
            <Card key={l.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', cadenceBadge[l.cadence] ?? cadenceBadge.weekly)}>{l.cadence}</span>
                      <span className="text-xs text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed</span>
                    </div>
                    <p className="font-bold text-zinc-100">{l.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{l.week_start} → {l.week_end}</p>
                    <LinkChips linkedGoalIds={l.linked_goal_ids} linkedBlockId={l.linked_block_id} linkedMeetId={l.linked_meet_id} />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-100">${cost.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">of ${l.budget} budget</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-zinc-700/30 rounded-lg py-2">
                    <p className="text-sm font-bold text-zinc-100">{items.length}</p>
                    <p className="text-xs text-zinc-500">items total</p>
                  </div>
                  <div className="bg-zinc-700/30 rounded-lg py-2">
                    <p className="text-sm font-bold text-teal-400">{checked}</p>
                    <p className="text-xs text-zinc-500">purchased</p>
                  </div>
                  <div className="bg-zinc-700/30 rounded-lg py-2">
                    <p className={cn('text-sm font-bold', cost > l.budget ? 'text-red-400' : 'text-green-400')}>
                      {cost > l.budget ? `+$${(cost - l.budget).toFixed(2)}` : `-$${(l.budget - cost).toFixed(2)}`}
                    </p>
                    <p className="text-xs text-zinc-500">{cost > l.budget ? 'over' : 'under'} budget</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => {
                  setDupForm({ label: l.label + ' (copy)', week_start: '', week_end: '', cadence: l.cadence, budget: l.budget })
                  setActiveListId(l.id)
                  setDuplicateListModal(true)
                  setView('list')
                }}>
                  <Copy className="w-3.5 h-3.5" /> Duplicate to New Week
                </Button>
              </CardBody>
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Staff mode toggle */}
      {isStaff && (
        <div className="flex gap-1">
          {[{ key: 'athletes', label: 'Athlete Lists' }, { key: 'personal', label: 'General List' }, { key: 'templates', label: 'Templates' }].map(m => (
            <button key={m.key} onClick={() => setShopMode(m.key)}
              className={cn('flex-1 text-xs py-2 rounded-xl border font-semibold transition-colors',
                shopMode === m.key ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              )}>{m.label}</button>
          ))}
        </div>
      )}

      {/* ── TEMPLATES panel ── */}
      {isStaff && shopMode === 'templates' && (() => {
        // Assign template to athlete → creates a new active shopping list for them
        const assignTemplate = (tmplId, athleteId) => {
          const tmpl = templates.find(t => t.id === tmplId)
          if (!tmpl) return
          const athlete = mockAthletes.find(a => a.id === athleteId)
          const newList = {
            id: `sl-tmpl-${Date.now()}`,
            label: `${tmpl.name} – ${athlete?.full_name ?? 'Athlete'}`,
            week_start: new Date().toISOString().slice(0,10),
            week_end: new Date(Date.now() + 6*86400000).toISOString().slice(0,10),
            cadence: 'weekly', budget: 150, status: 'active',
            linked_goal_ids: [], linked_block_id: null, linked_meet_id: null,
            categories: tmpl.categories.map(c => ({
              ...c, items: c.items.map(i => ({ ...i, id: genSliId(), checked: false }))
            })),
          }
          setAthleteShoppingLists(prev => ({
            ...prev,
            [athleteId]: [newList, ...(prev[athleteId] ?? [])],
          }))
          setTemplates(prev => prev.map(t => t.id !== tmplId ? t : {
            ...t, assignedAthletes: t.assignedAthletes.includes(athleteId)
              ? t.assignedAthletes : [...t.assignedAthletes, athleteId],
          }))
          setTmplAssignModal(null)
        }

        if (templateView === 'edit' && editingTemplate) {
          const tmpl = editingTemplate
          const totalCost = tmpl.categories.flatMap(c => c.items).reduce((s, i) => s + (i.price || 0), 0)
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setTemplateView('list'); setEditingTemplate(null) }}
                  className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h2 className="text-sm font-bold text-zinc-100 ml-2">{tmpl.name}</h2>
                <span className="text-xs text-zinc-500">Est. ${totalCost.toFixed(2)}</span>
              </div>

              {/* Template categories */}
              {tmpl.categories.map((cat, ci) => (
                <Card key={ci}>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="font-semibold text-zinc-200 text-sm">{cat.name}</span>
                        <span className="text-xs text-zinc-500">{cat.items.length} items</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {cat.items.map((item, ii) => (
                        <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/40 rounded-lg group">
                          <p className="flex-1 text-sm text-zinc-200">{item.name}</p>
                          <span className="text-xs text-zinc-500">{item.amount}</span>
                          <span className="text-xs text-teal-400 font-semibold">${(item.price||0).toFixed(2)}</span>
                          <button onClick={() => setEditingTemplate(prev => ({ ...prev, categories: prev.categories.map((c2, c2i) => c2i !== ci ? c2 : {
                            ...c2, items: c2.items.filter((_, iii) => iii !== ii)
                          })}))}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              ))}

              {/* Add item to template */}
              <Card>
                <CardBody className="space-y-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Add Item</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Item name" value={tmplItemForm.name}
                      onChange={e => setTmplItemForm(p => ({ ...p, name: e.target.value }))}
                      className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <input placeholder="Amount (e.g. 2 lbs)" value={tmplItemForm.amount}
                      onChange={e => setTmplItemForm(p => ({ ...p, amount: e.target.value }))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <input placeholder="Price $" type="number" min="0" step="0.01" value={tmplItemForm.price}
                      onChange={e => setTmplItemForm(p => ({ ...p, price: e.target.value }))}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <input placeholder="Category (e.g. Proteins)" value={tmplItemForm.category}
                      onChange={e => setTmplItemForm(p => ({ ...p, category: e.target.value }))}
                      className="col-span-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                  <button
                    onClick={() => {
                      if (!tmplItemForm.name.trim() || !tmplItemForm.category.trim()) return
                      const newItem = { id: genSliId(), name: tmplItemForm.name.trim(), amount: tmplItemForm.amount, price: parseFloat(tmplItemForm.price)||0, checked: false }
                      setEditingTemplate(prev => {
                        const catName = tmplItemForm.category.trim()
                        const existsCat = prev.categories.find(c => c.name === catName)
                        if (existsCat) return { ...prev, categories: prev.categories.map(c => c.name === catName ? { ...c, items: [...c.items, newItem] } : c) }
                        return { ...prev, categories: [...prev.categories, { name: catName, icon: '', items: [newItem] }] }
                      })
                      setTmplItemForm({ name: '', amount: '', price: '', category: tmplItemForm.category })
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add to Template
                  </button>
                </CardBody>
              </Card>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...tmpl } : t))
                    setTemplateView('list')
                    setEditingTemplate(null)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 rounded-xl text-teal-300 transition-colors">
                  <Save className="w-4 h-4" /> Save Template
                </button>
                <button
                  onClick={() => setTmplAssignModal(tmpl.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 transition-colors">
                  <Users className="w-4 h-4" /> Assign to Athlete
                </button>
              </div>
            </div>
          )
        }

        // Template list view
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-zinc-100">Shopping Templates</p>
                <p className="text-xs text-zinc-500 mt-0.5">Reusable lists — assign to athletes to create their shopping list instantly</p>
              </div>
              <button onClick={() => setNewTmplModal(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Template
              </button>
            </div>

            {templates.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center text-zinc-600">
                <ClipboardList className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No templates yet</p>
                <p className="text-xs mt-1">Create a reusable shopping list template</p>
              </div>
            )}

            <div className="space-y-3">
              {templates.map(tmpl => {
                const itemCount = tmpl.categories.flatMap(c => c.items).length
                const estCost   = tmpl.categories.flatMap(c => c.items).reduce((s, i) => s + (i.price||0), 0)
                const assigned  = tmpl.assignedAthletes.map(id => mockAthletes.find(a => a.id === id)?.full_name).filter(Boolean)
                return (
                  <Card key={tmpl.id}>
                    <CardBody className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-zinc-100">{tmpl.name}</p>
                          {tmpl.description && <p className="text-xs text-zinc-500 mt-0.5">{tmpl.description}</p>}
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                            <span>{itemCount} items</span>
                            <span className="text-teal-400 font-semibold">Est. ${estCost.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => { setEditingTemplate(JSON.parse(JSON.stringify(tmpl))); setTemplateView('edit') }}
                            className="p-1.5 text-zinc-500 hover:text-purple-400 bg-zinc-800 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setTemplates(prev => prev.filter(t => t.id !== tmpl.id))}
                            className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-800 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Category chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {tmpl.categories.map(cat => (
                          <span key={cat.name} className="text-[10px] px-2 py-0.5 bg-zinc-800/60 border border-zinc-700/40 rounded-full text-zinc-400">
                            {cat.icon} {cat.name} ({cat.items.length})
                          </span>
                        ))}
                      </div>

                      {/* Assigned athletes */}
                      {assigned.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {assigned.map(name => (
                            <span key={name} className="text-[10px] px-2 py-0.5 bg-blue-900/30 border border-blue-800/40 rounded-full text-blue-300">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setTmplAssignModal(tmpl.id)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-300 transition-colors">
                        <Users className="w-3.5 h-3.5" /> Assign to Athlete
                      </button>
                    </CardBody>
                  </Card>
                )
              })}
            </div>

            {/* Assign modal */}
            {tmplAssignModal && (() => {
              const tmpl = templates.find(t => t.id === tmplAssignModal) ?? editingTemplate
              return (
                <Modal open onClose={() => setTmplAssignModal(null)} title={`Assign "${tmpl?.name}" to Athlete`}>
                  <div className="space-y-3 p-4">
                    <p className="text-xs text-zinc-400">Select an athlete — this will create a new active shopping list from this template for them.</p>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {mockAthletes.map(a => {
                        const isAssigned = tmpl?.assignedAthletes?.includes(a.id)
                        return (
                          <button key={a.id} onClick={() => assignTemplate(tmplAssignModal, a.id)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left',
                              isAssigned
                                ? 'bg-blue-900/30 border-blue-800/40 text-blue-200'
                                : 'bg-zinc-800/50 border-zinc-700/40 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                            )}>
                            <Avatar name={a.full_name} role="athlete" size="sm" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.full_name}</p>
                              <p className="text-xs text-zinc-500">{a.weight_class}</p>
                            </div>
                            {isAssigned && <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </Modal>
              )
            })()}

            {/* New template modal */}
            {newTmplModal && (
              <Modal open onClose={() => setNewTmplModal(false)} title="New Template">
                <div className="space-y-3 p-4">
                  <input placeholder="Template name" value={newTmplForm.name}
                    onChange={e => setNewTmplForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <textarea placeholder="Description (optional)" value={newTmplForm.description}
                    onChange={e => setNewTmplForm(p => ({ ...p, description: e.target.value }))} rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
                  <Button className="w-full" onClick={() => {
                    if (!newTmplForm.name.trim()) return
                    const newTmpl = { id: `tmpl-${Date.now()}`, name: newTmplForm.name.trim(), description: newTmplForm.description, categories: [], assignedAthletes: [] }
                    setTemplates(prev => [...prev, newTmpl])
                    setEditingTemplate(newTmpl)
                    setTemplateView('edit')
                    setNewTmplModal(false)
                    setNewTmplForm({ name: '', description: '' })
                  }}>Create &amp; Add Items</Button>
                </div>
              </Modal>
            )}
          </div>
        )
      })()}

      {/* Only show general list / athlete lists when NOT in templates mode */}
      {shopMode !== 'templates' && (
      <div className="space-y-4">
      {/* Empty state when no lists exist (personal mode) */}
      {!activeList && shopMode === 'personal' ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
          <ShoppingCart className="w-10 h-10 text-zinc-600" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">No shopping lists yet</p>
            <p className="text-xs text-zinc-500 mt-1">Create a list to track groceries for your nutrition plan</p>
          </div>
          <button
            onClick={() => setNewListModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Shopping List
          </button>
        </div>
      ) : !activeList && shopMode === 'athletes' ? null : (
      <>
      {/* List Selector Header */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ShoppingCart className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <select value={activeListId} onChange={e => setActiveListId(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-zinc-100 focus:outline-none flex-1 min-w-0 truncate cursor-pointer">
                {lists.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', cadenceBadge[activeList.cadence] ?? cadenceBadge.weekly)}>
                {activeList.cadence}
              </span>
              {activeList.status === 'completed' && (
                <span className="text-xs text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Done</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <p className="text-xs text-zinc-500">{activeList.week_start} → {activeList.week_end}</p>
            <LinkChips linkedGoalIds={activeList.linked_goal_ids} linkedBlockId={activeList.linked_block_id} linkedMeetId={activeList.linked_meet_id} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-zinc-100">{checkedCount}<span className="text-zinc-500 text-base font-medium">/{totalItems}</span></p>
              <p className="text-xs text-zinc-500">items checked</p>
            </div>
            <ProgressBar value={checkedCount} max={Math.max(totalItems, 1)} color="teal" />
          </div>

          {/* Budget */}
          <div className="bg-zinc-700/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-semibold text-zinc-200">Budget</span>
              </div>
              {editBudget ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-400">$</span>
                  <input type="number" min="0" value={budget} onChange={e => setBudget(Number(e.target.value))} autoFocus
                    className="w-20 bg-zinc-800 border border-zinc-600 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <button onClick={() => setEditBudget(false)} className="text-teal-400 hover:text-teal-300"><CheckCircle2 className="w-4 h-4" /></button>
                </div>
              ) : (
                <button onClick={() => setEditBudget(true)} className="flex items-center gap-1.5 text-sm font-bold text-zinc-200 hover:text-zinc-100 transition-colors">
                  ${budget.toFixed(2)} <Edit2 className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Estimated total</span>
              <span className={cn('font-bold text-sm', budgetTextColor)}>
                ${totalCost.toFixed(2)}
                {totalCost > budget && <span className="text-red-400 ml-1">(+${(totalCost - budget).toFixed(2)} over)</span>}
              </span>
            </div>
            <ProgressBar value={Math.min(totalCost, budget)} max={budget} color={budgetColor} />
            {totalCost > budget && (
              <button onClick={handleOptimize}
                className="w-full mt-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Optimize for Budget
              </button>
            )}
            {optimized && <p className="text-xs text-center text-green-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Optimized!</p>}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={clearChecked} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
              <Printer className="w-3 h-3" /> Print
            </button>
            <button onClick={() => setLinkModal(true)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
              <Link2 className="w-3 h-3" /> Link
            </button>
            <button onClick={() => {
              setDupForm({ label: activeList.label + ' (copy)', week_start: '', week_end: '', cadence: activeList.cadence, budget: activeList.budget })
              setDuplicateListModal(true)
            }} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 transition-colors">
              <Copy className="w-3 h-3" /> Duplicate List
            </button>
            {activeList.status !== 'completed' && (
              <button onClick={markCompleted} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-300 transition-colors">
                <CheckCircle2 className="w-3 h-3" /> Mark Done
              </button>
            )}
            <button onClick={() => setView('history')} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
              <Archive className="w-3 h-3" /> History
            </button>
            <button onClick={() => {
              setNewForm({ label: '', week_start: '', week_end: '', cadence: 'weekly', budget: 150, notes: '' })
              setNewListModal(true)
            }} className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 transition-colors ml-auto">
              <Plus className="w-3 h-3" /> New List
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Category rows */}
      {categories.map(category => {
        const catChecked  = category.items.filter(i => i.checked).length
        const catTotal    = category.items.reduce((s, i) => s + (i.price || 0), 0)
        const isCollapsed = collapsed[category.name]
        return (
          <Card key={category.name}>
            <CardBody>
              <button className="w-full flex items-center justify-between" onClick={() => toggleCollapse(category.name)}>
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{category.icon}</span>
                  <span className="font-bold text-zinc-100">{category.name}</span>
                  <span className="text-xs text-zinc-500">{catChecked}/{category.items.length}</span>
                  {catChecked === category.items.length && catChecked > 0 && <span className="text-xs text-green-400 font-semibold">Done</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">${catTotal.toFixed(2)}</span>
                  {isCollapsed ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="mt-3 space-y-1">
                  {category.items.map(item => {
                    const isChecked    = item.checked
                    const showNut      = showNutrition[item.id]
                    const totalCals    = item.weight_g && item.calories_per_100g ? Math.round(item.calories_per_100g * item.weight_g / 100) : null
                    const totalProtein = item.weight_g && item.protein_per_100g  ? Math.round(item.protein_per_100g  * item.weight_g / 100) : null
                    return (
                      <div key={item.id} className={cn(isChecked ? 'opacity-60' : '')}>
                        <div className="flex items-center justify-between px-2 py-2 hover:bg-zinc-700/30 rounded-lg group">
                          <button onClick={() => toggle(category.name, item.id)} className="flex items-center gap-3 flex-1 text-left">
                            {isChecked
                              ? <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                              : <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0 group-hover:text-zinc-400" />}
                            <div>
                              <span className={cn('text-sm font-medium', isChecked ? 'text-zinc-500 line-through' : 'text-zinc-200')}>{item.name}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-zinc-500">{item.amount}</span>
                                {item.weight_g > 0 && <span className="text-xs text-zinc-600">{item.weight_g}g</span>}
                                {totalCals    && <span className="text-xs text-orange-400/70">{totalCals} kcal</span>}
                                {totalProtein && <span className="text-xs text-blue-400/70">{totalProtein}g P</span>}
                              </div>
                            </div>
                          </button>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={cn('text-xs font-semibold', isChecked ? 'text-zinc-600' : 'text-teal-400')}>${(item.price || 0).toFixed(2)}</span>
                            {item.calories_per_100g != null && (
                              <button onClick={() => toggleNutrition(item.id)} className="p-1 text-zinc-600 hover:text-blue-400 transition-colors" title="Nutrition">
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setCopyItemModal({ item, catName: category.name })}
                              className="p-1 text-zinc-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100" title="Copy/Move to list">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditTarget({ ...item, category: category.name })}
                              className="p-1 text-zinc-600 hover:text-purple-400 transition-colors opacity-0 group-hover:opacity-100" title="Edit">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm({ categoryName: category.name, itemId: item.id })}
                              className="p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" title="Remove">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {showNut && item.calories_per_100g != null && (
                          <div className="mx-2 mb-2 px-3 py-2 bg-zinc-700/30 rounded-lg">
                            <p className="text-xs font-semibold text-zinc-500 mb-1.5">Nutrition per 100g</p>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { label: 'Cal',     val: item.calories_per_100g,       color: 'text-orange-300' },
                                { label: 'Protein', val: `${item.protein_per_100g}g`, color: 'text-blue-300' },
                                { label: 'Carbs',   val: `${item.carbs_per_100g}g`,   color: 'text-purple-300' },
                                { label: 'Fat',     val: `${item.fat_per_100g}g`,     color: 'text-yellow-300' },
                              ].map(n => (
                                <div key={n.label}>
                                  <p className={cn('text-xs font-bold', n.color)}>{n.val}</p>
                                  <p className="text-xs text-zinc-600">{n.label}</p>
                                </div>
                              ))}
                            </div>
                            {item.weight_g > 0 && (
                              <p className="text-xs text-zinc-500 mt-1.5 text-center">
                                For {item.weight_g}g:&nbsp;
                                <span className="text-orange-300">{Math.round(item.calories_per_100g * item.weight_g / 100)} kcal</span>&nbsp;·&nbsp;
                                <span className="text-blue-300">{Math.round(item.protein_per_100g * item.weight_g / 100)}g P</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <button onClick={() => setAddOpen(true)}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-600 hover:text-purple-400 hover:bg-zinc-700/20 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add item to {category.name}
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        )
      })}

      <ItemFormModal open={addOpen} onClose={() => setAddOpen(false)} initial={null} onSave={handleAddItem} />
      {editTarget && (
        <ItemFormModal open={!!editTarget} onClose={() => setEditTarget(null)} initial={editTarget} onSave={handleEditItem} />
      )}

      {/* Delete item confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove Item?" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-300">Remove this item from your shopping list?</p>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => handleDeleteItem(deleteConfirm)}><Trash2 className="w-4 h-4" /> Remove</Button>
          </div>
        </div>
      </Modal>

      {/* Copy/Move item modal */}
      <Modal open={!!copyItemModal} onClose={() => setCopyItemModal(null)} title="Copy / Move Item" size="sm">
        {copyItemModal && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-zinc-300">Send <span className="font-semibold text-zinc-100">{copyItemModal.item.name}</span> to another list:</p>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {lists.filter(l => l.id !== activeListId).map(l => (
                <div key={l.id} className="flex items-center justify-between p-2.5 bg-zinc-700/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{l.label}</p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border capitalize', cadenceBadge[l.cadence] ?? cadenceBadge.weekly)}>{l.cadence}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleCopyItem(l.id, copyItemModal.item, copyItemModal.catName, false)}
                      className="text-xs px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 transition-colors flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                    <button onClick={() => handleCopyItem(l.id, copyItemModal.item, copyItemModal.catName, true)}
                      className="text-xs px-2.5 py-1 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-orange-300 transition-colors flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> Move
                    </button>
                  </div>
                </div>
              ))}
              {lists.length < 2 && <p className="text-xs text-zinc-500 text-center py-4">No other lists available. Create a new list first.</p>}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setCopyItemModal(null)}>Cancel</Button>
          </div>
        )}
      </Modal>

      {/* Duplicate list modal */}
      <Modal open={duplicateListModal} onClose={() => setDuplicateListModal(false)} title="Duplicate List to New Week" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-400">All items from <span className="text-zinc-200 font-medium">{activeList.label}</span> will be copied (unchecked) to a new list.</p>
          {[
            { label: 'New List Label', key: 'label', type: 'text', placeholder: 'e.g. Week 9 — Mar 2–8, 2026' },
            { label: 'Week Start', key: 'week_start', type: 'date', placeholder: '' },
            { label: 'Week End', key: 'week_end', type: 'date', placeholder: '' },
            { label: 'Budget ($)', key: 'budget', type: 'number', placeholder: '150' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
              <input type={f.type} value={dupForm[f.key]} onChange={e => setDupForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cadence</label>
            <select value={dupForm.cadence} onChange={e => setDupForm(prev => ({ ...prev, cadence: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {['weekly', 'biweekly', 'monthly'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setDuplicateListModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleDuplicateList}><Copy className="w-4 h-4" /> Duplicate</Button>
          </div>
        </div>
      </Modal>

      {/* New list modal */}
      <Modal open={newListModal} onClose={() => setNewListModal(false)} title="Create New Shopping List" size="sm">
        <div className="p-6 space-y-4">
          {[
            { label: 'List Label *', key: 'label', type: 'text', placeholder: 'e.g. Week 9 — Mar 2–8, 2026' },
            { label: 'Week Start', key: 'week_start', type: 'date', placeholder: '' },
            { label: 'Week End', key: 'week_end', type: 'date', placeholder: '' },
            { label: 'Budget ($)', key: 'budget', type: 'number', placeholder: '150' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
              <input type={f.type} value={newForm[f.key]} onChange={e => setNewForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cadence</label>
            <select value={newForm.cadence} onChange={e => setNewForm(prev => ({ ...prev, cadence: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
              {['weekly', 'biweekly', 'monthly'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea value={newForm.notes} onChange={e => setNewForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} placeholder="Optional notes…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setNewListModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleNewList}><Plus className="w-4 h-4" /> Create List</Button>
          </div>
        </div>
      </Modal>

      {/* Link modal */}
      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Link to Goal / Block / Meet" size="sm">
        <div className="p-6 space-y-4">
          <LinkPicker
            linkedGoalIds={activeList?.linked_goal_ids ?? []}
            linkedBlockId={activeList?.linked_block_id ?? null}
            linkedMeetId={activeList?.linked_meet_id ?? null}
            onChange={({ linkedGoalIds, linkedBlockId, linkedMeetId }) =>
              updateActiveList(l => ({ ...l, linked_goal_ids: linkedGoalIds, linked_block_id: linkedBlockId, linked_meet_id: linkedMeetId }))
            }
          />
          <Button className="w-full" onClick={() => setLinkModal(false)}><Check className="w-4 h-4" /> Done</Button>
        </div>
      </Modal>
      </>
      )}
      </div>)}
    </div>
  )
}

// ─── Meal Prep Log Tab ────────────────────────────────────────────────────────
let _nextMplId  = 10
const genMplId  = () => `mpl-n${_nextMplId++}`
let _nextMpiId  = 100
const genMpiId  = () => `mpi-n${_nextMpiId++}`

function MealPrepLogTab() {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { athletePrepLog, setAthletePrepLog, loadAthleteNutrition } = useNutritionStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : profile?.id

  // Derive sessions: for real users read from store (loaded on mount by NutritionPage)
  // For demo users seed from MOCK, but only once
  const liveSessions = isDemo ? MOCK_MEAL_PREP_LOG : (athletePrepLog?.[MY_ATHLETE_ID] ?? [])
  const [localSessions, setLocalSessions] = useState(null)
  // localSessions shadows store for optimistic updates; null means "use store"
  const sessions = localSessions !== null ? localSessions : liveSessions
  const setSessions = (updater) => {
    setLocalSessions(prev => {
      const cur = prev !== null ? prev : liveSessions
      return typeof updater === 'function' ? updater(cur) : updater
    })
  }

  const [expanded, setExpanded]     = useState(null)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [linkModal, setLinkModal]   = useState(null) // sessionId
  const [consumeModal, setConsumeModal] = useState(null) // { sessionId, item }

  // Sync local sessions back into store when they change (so Pantry/Planner stay in sync)
  useEffect(() => {
    if (localSessions !== null && MY_ATHLETE_ID) {
      setAthletePrepLog(prev => ({ ...prev, [MY_ATHLETE_ID]: localSessions }))
    }
  }, [localSessions]) // eslint-disable-line react-hooks/exhaustive-deps

  // new session form
  const [nsForm, setNsForm] = useState({
    label: '', date: '', cadence: 'weekly', week_start: '', week_end: '',
    notes: '', linked_goal_ids: [], linked_block_id: null, linked_meet_id: null,
    items: [{ recipe_name: '', servings_made: 1, storage: 'fridge', notes: '', macros_per_serving: { calories: 0, protein: 0, carbs: 0, fat: 0 } }]
  })

  const addNsItem = () => setNsForm(prev => ({
    ...prev,
    items: [...prev.items, { recipe_name: '', servings_made: 1, storage: 'fridge', notes: '', macros_per_serving: { calories: 0, protein: 0, carbs: 0, fat: 0 } }]
  }))
  const removeNsItem = (idx) => setNsForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  const setNsItem = (idx, key, val) => setNsForm(prev => {
    const items = [...prev.items]; items[idx] = { ...items[idx], [key]: val }; return { ...prev, items }
  })
  const setNsItemMacro = (idx, key, val) => setNsForm(prev => {
    const items = [...prev.items]; items[idx] = { ...items[idx], macros_per_serving: { ...items[idx].macros_per_serving, [key]: Number(val) } }; return { ...prev, items }
  })

  const handleCreateSession = async () => {
    if (!nsForm.label.trim()) return
    const items = nsForm.items.map(i => ({ ...i, id: genMpiId(), servings_consumed: 0 }))
    const totalCal  = items.reduce((s, i) => s + i.macros_per_serving.calories * i.servings_made, 0)
    const totalProt = items.reduce((s, i) => s + i.macros_per_serving.protein * i.servings_made, 0)
    const session = {
      id: genMplId(), ...nsForm, items,
      total_calories_prepped: totalCal,
      total_protein_prepped: totalProt,
    }
    // Optimistic update
    setSessions(prev => [session, ...prev])
    setNewSessionOpen(false)
    setNsForm({ label: '', date: '', cadence: 'weekly', week_start: '', week_end: '', notes: '', linked_goal_ids: [], linked_block_id: null, linked_meet_id: null,
      items: [{ recipe_name: '', servings_made: 1, storage: 'fridge', notes: '', macros_per_serving: { calories: 0, protein: 0, carbs: 0, fat: 0 } }]
    })
    // Persist to Supabase for real users
    if (!isDemo && MY_ATHLETE_ID) {
      savePrepSessionFull(MY_ATHLETE_ID, activeOrgId, MY_ATHLETE_ID, session, items).then(saved => {
        if (saved) {
          // Replace local temp id with real DB id
          setSessions(prev => prev.map(s => s.id === session.id ? { ...s, id: saved.id } : s))
        }
      })
    }
  }

  const logServings = (sessionId, itemId, delta) => {
    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s, items: s.items.map(i => i.id !== itemId ? i : {
        ...i, servings_consumed: Math.max(0, Math.min(i.servings_made, i.servings_consumed + delta))
      })
    }))
  }

  const cadenceBadge = { weekly: 'bg-teal-500/15 text-teal-300 border-teal-500/25', biweekly: 'bg-blue-500/15 text-blue-300 border-blue-500/25', monthly: 'bg-purple-500/15 text-purple-300 border-purple-500/25' }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-zinc-100">{sessions.length}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Prep sessions</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-orange-300">{sessions.reduce((s, ss) => s + ss.total_calories_prepped, 0).toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total kcal prepped</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-3">
          <p className="text-2xl font-black text-blue-300">{sessions.reduce((s, ss) => s + ss.total_protein_prepped, 0)}g</p>
          <p className="text-xs text-zinc-500 mt-0.5">Total protein</p>
        </CardBody></Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-zinc-300">Prep Sessions</h2>
        <Button size="sm" onClick={() => setNewSessionOpen(true)}><Plus className="w-3.5 h-3.5" /> Log Prep Session</Button>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No prep sessions logged yet.</p>
        </div>
      )}

      {sessions.map(session => {
        const isOpen = expanded === session.id
        const totalConsumed = session.items.reduce((s, i) => s + i.servings_consumed, 0)
        const totalMade     = session.items.reduce((s, i) => s + i.servings_made, 0)
        const pct           = totalMade > 0 ? Math.round(totalConsumed / totalMade * 100) : 0
        return (
          <Card key={session.id}>
            <CardBody>
              <button className="w-full text-left" onClick={() => setExpanded(isOpen ? null : session.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border capitalize', cadenceBadge[session.cadence] ?? cadenceBadge.weekly)}>{session.cadence}</span>
                      <span className="text-xs text-zinc-500">{session.date}</span>
                    </div>
                    <p className="font-bold text-zinc-100">{session.label}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-orange-300">{session.total_calories_prepped.toLocaleString()} kcal</span>
                      <span className="text-xs text-blue-300">{session.total_protein_prepped}g protein</span>
                      <span className="text-xs text-zinc-400">{totalConsumed}/{totalMade} servings used</span>
                    </div>
                    <LinkChips linkedGoalIds={session.linked_goal_ids} linkedBlockId={session.linked_block_id} linkedMeetId={session.linked_meet_id} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-zinc-200">{pct}%</p>
                      <p className="text-xs text-zinc-500">consumed</p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={totalConsumed} max={Math.max(totalMade, 1)} color={pct >= 80 ? 'green' : pct >= 40 ? 'yellow' : 'teal'} />
                </div>
              </button>

              {isOpen && (
                <div className="mt-4 space-y-3 pt-4 border-t border-zinc-700/50">
                  {session.notes && <p className="text-xs text-zinc-400 italic">{session.notes}</p>}

                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prepped Items</p>
                    <button onClick={(e) => { e.stopPropagation(); setLinkModal(session.id) }}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
                      <Link2 className="w-3 h-3" /> Edit Links
                    </button>
                  </div>

                  {session.items.map(item => {
                    const remaining = item.servings_made - item.servings_consumed
                    const calsConsumed = Math.round(item.macros_per_serving.calories * item.servings_consumed)
                    return (
                      <div key={item.id} className="bg-zinc-700/20 rounded-xl p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-100">{item.recipe_name}</p>
                            <div className="flex flex-wrap gap-2 mt-0.5">
                              <span className="text-xs text-zinc-400">{item.servings_made} servings made</span>
                              <span className="text-xs text-zinc-500">·</span>
                              <span className="text-xs text-zinc-400">{item.storage}</span>
                              {item.notes && <span className="text-xs text-zinc-500 italic">{item.notes}</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-zinc-400">{remaining} left</p>
                            <p className="text-xs text-orange-300">{calsConsumed} kcal eaten</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ProgressBar value={item.servings_consumed} max={Math.max(item.servings_made, 1)} color="teal" />
                          <span className="text-xs font-bold text-teal-300 w-12 text-right flex-shrink-0">{item.servings_consumed}/{item.servings_made}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); logServings(session.id, item.id, -1) }}
                            disabled={item.servings_consumed === 0}
                            className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 rounded-lg text-zinc-300 transition-colors">−</button>
                          <span className="text-xs text-zinc-300 min-w-[4rem] text-center">{item.servings_consumed} eaten</span>
                          <button onClick={(e) => { e.stopPropagation(); logServings(session.id, item.id, 1) }}
                            disabled={item.servings_consumed >= item.servings_made}
                            className="text-xs px-2 py-1 bg-teal-600/30 hover:bg-teal-600/50 disabled:opacity-30 border border-teal-500/30 rounded-lg text-teal-300 transition-colors">+ Use Serving</button>
                          <div className="flex gap-2 ml-auto text-xs text-zinc-500">
                            <span className="text-orange-300/80">{item.macros_per_serving.calories} kcal</span>
                            <span className="text-blue-300/80">{item.macros_per_serving.protein}g P</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )
      })}

      {/* New session modal */}
      <Modal open={newSessionOpen} onClose={() => setNewSessionOpen(false)} title="Log Prep Session" size="lg">
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Session Label *</label>
              <input value={nsForm.label} onChange={e => setNsForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Week 9 Sunday Prep"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Date</label>
              <input type="date" value={nsForm.date} onChange={e => setNsForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Cadence</label>
              <select value={nsForm.cadence} onChange={e => setNsForm(p => ({ ...p, cadence: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500">
                {['weekly', 'biweekly', 'monthly'].map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Period Start</label>
              <input type="date" value={nsForm.week_start} onChange={e => setNsForm(p => ({ ...p, week_start: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Period End</label>
              <input type="date" value={nsForm.week_end} onChange={e => setNsForm(p => ({ ...p, week_end: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
            </div>
          </div>

          {/* Link picker */}
          <div className="bg-zinc-700/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Link to Goal / Block / Meet</p>
            <LinkPicker
              linkedGoalIds={nsForm.linked_goal_ids}
              linkedBlockId={nsForm.linked_block_id}
              linkedMeetId={nsForm.linked_meet_id}
              onChange={({ linkedGoalIds, linkedBlockId, linkedMeetId }) =>
                setNsForm(p => ({ ...p, linked_goal_ids: linkedGoalIds, linked_block_id: linkedBlockId, linked_meet_id: linkedMeetId }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea value={nsForm.notes} onChange={e => setNsForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="e.g. Sunday prep, 2.5 hours total"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-zinc-400">Prepped Items</p>
              <button onClick={addNsItem} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Item</button>
            </div>
            <div className="space-y-3">
              {nsForm.items.map((item, idx) => (
                <div key={idx} className="bg-zinc-700/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <input value={item.recipe_name} onChange={e => setNsItem(idx, 'recipe_name', e.target.value)} placeholder="Recipe / item name"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Servings made</label>
                        <input type="number" min="1" value={item.servings_made} onChange={e => setNsItem(idx, 'servings_made', Number(e.target.value))}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-500 mb-1">Storage</label>
                        <select value={item.storage} onChange={e => setNsItem(idx, 'storage', e.target.value)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500">
                          {['fridge', 'freezer', 'counter'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </div>
                    </div>
                    {nsForm.items.length > 1 && (
                      <button onClick={() => removeNsItem(idx)} className="text-zinc-600 hover:text-red-400 mt-1 transition-colors flex-shrink-0"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { key: 'calories', label: 'Cal', color: 'text-orange-300' },
                      { key: 'protein',  label: 'P (g)', color: 'text-blue-300' },
                      { key: 'carbs',    label: 'C (g)', color: 'text-purple-300' },
                      { key: 'fat',      label: 'F (g)', color: 'text-yellow-300' },
                    ].map(m => (
                      <div key={m.key} className="bg-zinc-800/60 rounded-lg p-1.5">
                        <label className={cn('block text-xs mb-0.5', m.color)}>{m.label}</label>
                        <input type="number" min="0" value={item.macros_per_serving[m.key]} onChange={e => setNsItemMacro(idx, m.key, e.target.value)}
                          className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                  <input value={item.notes} onChange={e => setNsItem(idx, 'notes', e.target.value)} placeholder="Notes (optional)"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setNewSessionOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleCreateSession}><Save className="w-4 h-4" /> Log Session</Button>
          </div>
        </div>
      </Modal>

      {/* Link edit modal */}
      <Modal open={!!linkModal} onClose={() => setLinkModal(null)} title="Edit Links" size="sm">
        {linkModal && (() => {
          const session = sessions.find(s => s.id === linkModal)
          if (!session) return null
          return (
            <div className="p-6 space-y-4">
              <LinkPicker
                linkedGoalIds={session.linked_goal_ids}
                linkedBlockId={session.linked_block_id}
                linkedMeetId={session.linked_meet_id}
                onChange={({ linkedGoalIds, linkedBlockId, linkedMeetId }) =>
                  setSessions(prev => prev.map(s => s.id !== linkModal ? s : {
                    ...s, linked_goal_ids: linkedGoalIds, linked_block_id: linkedBlockId, linked_meet_id: linkedMeetId
                  }))
                }
              />
              <Button className="w-full" onClick={() => setLinkModal(null)}><Check className="w-4 h-4" /> Done</Button>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

// ─── Athlete History ──────────────────────────────────────────────────────────
function AthleteHistory() {
  const { isDemo, profile } = useAuthStore()
  const { nutritionLogs } = useNutritionStore()
  const MY_ATHLETE_ID = isDemo ? 'u-ath-001' : profile?.id
  const [cadence, setCadence] = useState('weekly') // 'weekly' | 'biweekly' | 'monthly'

  const dailyData = isDemo ? [
    { date: 'Mar 1',  compliance: 87, protein: 193, calories: 3150, bw: 92.3 },
    { date: 'Feb 28', compliance: 84, protein: 178, calories: 3050, bw: 92.4 },
    { date: 'Feb 27', compliance: 91, protein: 196, calories: 3200, bw: 92.6 },
    { date: 'Feb 26', compliance: 78, protein: 165, calories: 2900, bw: 92.8 },
    { date: 'Feb 25', compliance: 95, protein: 203, calories: 3300, bw: 92.5 },
    { date: 'Feb 24', compliance: 88, protein: 185, calories: 3100, bw: 92.4 },
    { date: 'Feb 23', compliance: 72, protein: 155, calories: 2750, bw: 92.9 },
    { date: 'Feb 22', compliance: 90, protein: 192, calories: 3150, bw: 92.7 },
    { date: 'Feb 21', compliance: 83, protein: 175, calories: 3000, bw: 92.8 },
    { date: 'Feb 20', compliance: 76, protein: 160, calories: 2850, bw: 93.0 },
    { date: 'Feb 19', compliance: 92, protein: 198, calories: 3250, bw: 92.6 },
    { date: 'Feb 18', compliance: 85, protein: 182, calories: 3080, bw: 92.7 },
    { date: 'Feb 17', compliance: 89, protein: 190, calories: 3130, bw: 92.6 },
    { date: 'Feb 16', compliance: 94, protein: 202, calories: 3280, bw: 92.4 },
  ] : (nutritionLogs?.[MY_ATHLETE_ID] ?? []).map(log => ({
    date:       log.log_date ?? log.date ?? '',
    compliance: log.compliance_score ?? 0,
    protein:    log.protein_actual   ?? 0,
    calories:   log.calories_actual  ?? 0,
    bw:         log.body_weight      ?? null,
  }))

  const grouped = useMemo(() => {
    if (dailyData.length === 0) return []
    if (cadence === 'weekly') {
      // Dynamically group by calendar week (Mon–Sun)
      const weekMap = {}
      dailyData.forEach(d => {
        if (!d.date) return
        const dt = new Date(d.date)
        if (isNaN(dt.getTime())) return
        const dow = dt.getDay() // 0=Sun
        const mon = new Date(dt); mon.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1))
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
        const key = mon.toISOString().slice(0, 10)
        const fmtShort = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!weekMap[key]) weekMap[key] = { label: `${fmtShort(mon)} – ${fmtShort(sun)}`, days: [], _monDate: mon }
        weekMap[key].days.push(d)
      })
      return Object.values(weekMap)
        .sort((a, b) => new Date(b._monDate) - new Date(a._monDate))
        .filter(w => w.days.length > 0)
        .map(w => ({
          label: w.label,
          days: w.days,
          avgCompliance: Math.round(w.days.reduce((s, d) => s + (d.compliance || 0), 0) / w.days.length),
          avgProtein:    Math.round(w.days.reduce((s, d) => s + (d.protein || 0), 0) / w.days.length),
          avgCalories:   Math.round(w.days.reduce((s, d) => s + (d.calories || 0), 0) / w.days.length),
          startBw: w.days[w.days.length - 1]?.bw ?? null,
          endBw:   w.days[0]?.bw ?? null,
        }))
    }
    if (cadence === 'biweekly') {
      const mid = Math.floor(dailyData.length / 2)
      const half1 = dailyData.slice(0, mid)
      const half2 = dailyData.slice(mid)
      const mkGroup = (days, label) => ({
        label,
        days,
        avgCompliance: days.length ? Math.round(days.reduce((s, d) => s + (d.compliance || 0), 0) / days.length) : 0,
        avgProtein:    days.length ? Math.round(days.reduce((s, d) => s + (d.protein || 0), 0) / days.length) : 0,
        avgCalories:   days.length ? Math.round(days.reduce((s, d) => s + (d.calories || 0), 0) / days.length) : 0,
        startBw: days[days.length - 1]?.bw ?? null,
        endBw:   days[0]?.bw ?? null,
      })
      const groups = []
      if (half1.length) groups.push(mkGroup(half1, half1[0]?.date ? `${half1[0].date} – ${half1[half1.length - 1]?.date}` : 'Recent 2 weeks'))
      if (half2.length) groups.push(mkGroup(half2, half2[0]?.date ? `${half2[0].date} – ${half2[half2.length - 1]?.date}` : 'Previous 2 weeks'))
      return groups
    }
    // monthly — group by month
    const monthMap = {}
    dailyData.forEach(d => {
      if (!d.date) return
      const dt = new Date(d.date)
      if (isNaN(dt.getTime())) return
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!monthMap[key]) monthMap[key] = { label, days: [], _key: key }
      monthMap[key].days.push(d)
    })
    return Object.values(monthMap)
      .sort((a, b) => b._key.localeCompare(a._key))
      .filter(m => m.days.length > 0)
      .map(m => ({
        label: m.label,
        days: m.days,
        avgCompliance: Math.round(m.days.reduce((s, d) => s + (d.compliance || 0), 0) / m.days.length),
        avgProtein:    Math.round(m.days.reduce((s, d) => s + (d.protein || 0), 0) / m.days.length),
        avgCalories:   Math.round(m.days.reduce((s, d) => s + (d.calories || 0), 0) / m.days.length),
        startBw: m.days[m.days.length - 1]?.bw ?? null,
        endBw:   m.days[0]?.bw ?? null,
      }))
  }, [cadence, dailyData])

  const { athletePrepLog } = useNutritionStore()
  const linkedPrepSessions = isDemo ? MOCK_MEAL_PREP_LOG : (athletePrepLog?.[MY_ATHLETE_ID] ?? [])

  return (
    <div className="space-y-4">
      {/* Cadence selector */}
      <div className="flex gap-2">
        {[
          { key: 'weekly',   label: 'Weekly' },
          { key: 'biweekly', label: 'Bi-Weekly' },
          { key: 'monthly',  label: 'Monthly' },
        ].map(c => (
          <button key={c.key} onClick={() => setCadence(c.key)}
            className={cn('flex-1 text-sm py-2 rounded-xl border font-semibold transition-colors',
              cadence === c.key ? 'bg-purple-600 border-purple-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            )}>
            {c.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No history logged yet.</p>
        </div>
      ) : grouped.map(period => (
        <div key={period.label} className="space-y-3">
          {/* Period summary card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-purple-400" />{period.label}</CardTitle>
                  <CardSubtitle>{period.days.length} days tracked</CardSubtitle>
                </div>
                <div className="text-right">
                  <p className={cn('text-lg font-black', period.avgCompliance >= 85 ? 'text-green-400' : period.avgCompliance >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                    {period.avgCompliance}%
                  </p>
                  <p className="text-xs text-zinc-500">avg compliance</p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Avg Calories',  val: `${period.avgCalories}`,     sub: 'kcal/day',  color: 'text-orange-300' },
                  { label: 'Avg Protein',   val: `${period.avgProtein}g`,      sub: 'per day',   color: 'text-blue-300' },
                  { label: 'Start BW',      val: `${period.startBw}kg`,        sub: 'start',     color: 'text-zinc-300' },
                  { label: 'End BW',        val: `${period.endBw}kg`,          sub: `${period.endBw < period.startBw ? '↓' : '↑'} ${Math.abs(period.endBw - period.startBw).toFixed(1)}kg`, color: period.endBw < period.startBw ? 'text-green-300' : 'text-yellow-300' },
                ].map(s => (
                  <div key={s.label} className="text-center bg-zinc-700/30 rounded-xl p-2">
                    <p className={cn('text-sm font-bold', s.color)}>{s.val}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Daily breakdown */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      {['Date', 'Compliance', 'Protein', 'Calories', 'BW'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-zinc-500 pb-2 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {period.days.map((d, i) => (
                      <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2 pr-3 text-zinc-300 text-xs">{d.date}</td>
                        <td className="py-2 pr-3">
                          <span className={cn('text-xs font-bold', d.compliance >= 85 ? 'text-green-400' : d.compliance >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                            {d.compliance}%
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-blue-300 text-xs">{d.protein}g</td>
                        <td className="py-2 pr-3 text-orange-300 text-xs">{d.calories}</td>
                        <td className="py-2 text-zinc-300 text-xs">{d.bw}kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Linked prep sessions for this period */}
          {linkedPrepSessions.filter(s => s.cadence === cadence).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-2 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Prep Sessions This Period</p>
              {linkedPrepSessions.filter(s => s.cadence === cadence).map(session => {
                const totalConsumed = session.items.reduce((s, i) => s + i.servings_consumed, 0)
                const totalMade     = session.items.reduce((s, i) => s + i.servings_made, 0)
                return (
                  <Card key={session.id}>
                    <CardBody>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">{session.label}</p>
                          <p className="text-xs text-zinc-500">{session.date} · {session.total_protein_prepped}g protein prepped</p>
                          <LinkChips linkedGoalIds={session.linked_goal_ids} linkedBlockId={session.linked_block_id} linkedMeetId={session.linked_meet_id} />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-teal-300">{totalConsumed}/{totalMade}</p>
                          <p className="text-xs text-zinc-500">servings used</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Staff Roster ─────────────────────────────────────────────────────────────
// ─── Athlete Nutrition Profile Modal ─────────────────────────────────────────
function AthleteNutritionProfile({ athlete, onClose, isAdmin, canEdit: canEditProp }) {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const { blocks: storeBlocks } = useTrainingStore()
  const { orgRecipes, athletePrepLog: storePrepLog } = useNutritionStore()
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const mockMealHistory = isDemo ? MOCK_MEAL_HISTORY : []
  const mockMealPlans = isDemo ? MOCK_ATHLETE_MEAL_PLANS : {}
  const mockTrainingBlocks = storeBlocks.length ? storeBlocks : (isDemo ? MOCK_TRAINING_BLOCKS : [])
  const mockGoals = storeGoals.length ? storeGoals : (isDemo ? MOCK_GOALS : [])
  const mockRecipes = isDemo ? MOCK_MEAL_PLAN_RECIPES : orgRecipes
  const mockPrepLog = isDemo ? MOCK_MEAL_PREP_LOG : (storePrepLog?.[athlete.id] ?? [])
  const assignment = mockStaffAssignments.find(a => a.staff_id === profile?.id && a.athlete_id === athlete.id)
  const canEdit = isAdmin || (canEditProp ?? assignment?.can_edit_nutrition ?? false)

  const [profileTab, setProfileTab] = useState('plan') // 'plan' | 'meals' | 'shopping' | 'notes'

  // ── Safe macro defaults (real users may not have nutrition_macros yet) ──
  const macroDefaults = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const safeMacroPlan   = athlete.nutrition_macros?.plan   ?? macroDefaults
  const safeMacroActual = athlete.nutrition_macros?.actual ?? macroDefaults

  // ── Plan state ──
  const [plan, setPlan] = useState({
    training: { ...safeMacroPlan },
    rest: {
      calories: Math.round((safeMacroPlan.calories || 0) * 0.88),
      protein:  safeMacroPlan.protein || 0,
      carbs:    Math.round((safeMacroPlan.carbs || 0) * 0.79),
      fat:      safeMacroPlan.fat || 0,
    },
    notes: athlete.coach_notes ?? '',
  })
  const [planSaved, setPlanSaved] = useState(false)

  // ── Meal planner state ──
  const DAYS_LIST = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  const DAY_LABELS = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' }
  const SLOT_LABELS = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner', snack:'Snack', 'pre-workout':'Pre-Workout', 'post-workout':'Post-Workout', supplements:'Supplements' }
  const SLOT_ICONS = {}

  const [weekOffset, setWeekOffset] = useState(0) // 0 = current block week
  const [selectedDay, setSelectedDay] = useState('monday')
  const [mealHistory, setMealHistory] = useState(() =>
    mockMealHistory.filter(e => e.athlete_id === athlete.id)
  )
  const [mealPlan, setMealPlan] = useState(() => {
    const seed = mockMealPlans[athlete.id]
    if (seed) return JSON.parse(JSON.stringify(seed))
    const empty = {}
    DAYS_LIST.forEach(d => { empty[d] = { breakfast:[], lunch:[], dinner:[], snack:[], 'pre-workout':[], 'post-workout':[], supplements:[] } })
    return empty
  })
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [addingSlot, setAddingSlot] = useState(null)   // which slot we're adding to
  const [addMode, setAddMode] = useState('recipe')     // 'recipe' | 'prep' | 'custom'
  const [customItem, setCustomItem] = useState({ name:'', calories:0, protein:0, carbs:0, fat:0, notes:'' })
  const [mealPlanSaved, setMealPlanSaved] = useState(false)

  // Block + week context helpers
  const activeBlock = mockTrainingBlocks.find(b => b.id === athlete.current_block_id)
    || mockTrainingBlocks.find(b => b.status === 'active')
  const linkedGoals = mockGoals.filter(g => activeBlock?.linked_goal_ids?.includes(g.id))
  // Compute current week's Monday as base
  const _now1 = new Date(); _now1.setHours(0,0,0,0)
  const _dow1 = _now1.getDay()
  const BASE_WEEK = new Date(_now1); BASE_WEEK.setDate(_now1.getDate() - (_dow1 === 0 ? 6 : _dow1 - 1))
  const weekStart = new Date(BASE_WEEK)
  weekStart.setDate(BASE_WEEK.getDate() + weekOffset * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekRangeLabel = `${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`
  const weekNumber = 1 + weekOffset // week 1 = current week as base

  function saveMealPlanToHistory() {
    const dt = dayTotals(selectedDay)
    const targetCal = plan.training.calories
    const targetProt = plan.training.protein
    const dayPlan = mealPlan[selectedDay]
    const hasPre = dayPlan['pre-workout']?.length > 0
    const hasPost = dayPlan['post-workout']?.length > 0
    const dayType = (hasPre || hasPost) ? 'training' : 'rest'
    const compliance = Math.min(100, Math.round((dt.calories / targetCal) * 100))
    const dateStr = new Date(weekStart.getTime() + DAYS_LIST.indexOf(selectedDay) * 86400000).toISOString().split('T')[0]
    const entry = {
      id: `mh-${Date.now()}`,
      athlete_id: athlete.id,
      date: dateStr,
      week_label: `Week ${weekNumber} — ${activeBlock?.phase || 'Block'}`,
      block_id: activeBlock?.id || null,
      goal_ids: linkedGoals.map(g => g.id),
      day_type: dayType,
      meals: JSON.parse(JSON.stringify(dayPlan)),
      totals: dt,
      targets: { calories: targetCal, protein: targetProt },
      compliance_pct: compliance,
      notes: '',
    }
    setMealHistory(prev => [entry, ...prev.filter(e => e.date !== dateStr)])
    setMealPlanSaved(true)
  }

  function addItemFromRecipe(recipe) {
    const item = {
      id: `amp-${Date.now()}`,
      name: recipe.name,
      calories: recipe.macros.calories,
      protein: recipe.macros.protein,
      carbs: recipe.macros.carbs,
      fat: recipe.macros.fat,
      source: 'recipe',
      recipe_id: recipe.id,
      servings: 1,
      notes: '',
    }
    setMealPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [addingSlot]: [...prev[selectedDay][addingSlot], item],
      },
    }))
    setAddingSlot(null)
    setMealPlanSaved(false)
  }

  function addItemFromPrep(prepItem) {
    const item = {
      id: `amp-${Date.now()}`,
      name: prepItem.recipe_name,
      calories: prepItem.macros_per_serving.calories,
      protein: prepItem.macros_per_serving.protein,
      carbs: prepItem.macros_per_serving.carbs,
      fat: prepItem.macros_per_serving.fat,
      source: 'prep',
      prep_item_id: prepItem.id,
      servings: 1,
      notes: '',
    }
    setMealPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [addingSlot]: [...prev[selectedDay][addingSlot], item],
      },
    }))
    setAddingSlot(null)
    setMealPlanSaved(false)
  }

  function addCustomItem() {
    if (!customItem.name.trim()) return
    const item = { id: `amp-${Date.now()}`, ...customItem, source: 'custom', servings: 1 }
    setMealPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [addingSlot]: [...prev[selectedDay][addingSlot], item],
      },
    }))
    setCustomItem({ name:'', calories:0, protein:0, carbs:0, fat:0, notes:'' })
    setAddingSlot(null)
    setMealPlanSaved(false)
  }

  function removeItem(slot, itemId) {
    setMealPlan(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        [slot]: prev[selectedDay][slot].filter(i => i.id !== itemId),
      },
    }))
    setMealPlanSaved(false)
  }

  // Compute day totals
  function dayTotals(day) {
    let cal=0, prot=0, carbs=0, fat=0
    Object.values(mealPlan[day]).forEach(slot => slot.forEach(item => {
      cal += item.calories * (item.servings || 1)
      prot += item.protein * (item.servings || 1)
      carbs += item.carbs * (item.servings || 1)
      fat += item.fat * (item.servings || 1)
    }))
    return { calories: Math.round(cal), protein: Math.round(prot), carbs: Math.round(carbs), fat: Math.round(fat) }
  }

  // ── Shopping state ──
  const [shopItems, setShopItems] = useState([
    { id: 'sh-p1', name: 'Chicken Breast 2kg', category: 'Proteins', done: false },
    { id: 'sh-p2', name: 'Canned Tuna ×6', category: 'Proteins', done: false },
    { id: 'sh-c1', name: 'White Rice 5kg', category: 'Carbohydrates', done: false },
    { id: 'sh-c2', name: 'Rolled Oats 1kg', category: 'Carbohydrates', done: false },
    { id: 'sh-v1', name: 'Broccoli 1kg', category: 'Vegetables', done: false },
    { id: 'sh-d1', name: 'Greek Yogurt 1kg', category: 'Dairy & Eggs', done: false },
    { id: 'sh-d2', name: 'Eggs ×30', category: 'Dairy & Eggs', done: false },
  ])
  const [newShopItem, setNewShopItem] = useState({ name:'', category:'Proteins' })

  const PROFILE_TABS = [
    { id: 'plan',     label: 'Targets' },
    { id: 'meals',    label: 'Meal Planner' },
    { id: 'shopping', label: 'Shopping List' },
    { id: 'notes',    label: 'Notes' },
    { id: 'history',  label: 'History' },
  ]

  const nc = athlete.nutrition_compliance
  const compColor = nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400'
  const FLAG_META = {
    pain_flag:       { label: 'Pain',           color: 'text-red-400 bg-red-500/15 border-red-500/30' },
    missed_sessions: { label: 'Missed Sessions', color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
    low_sleep:       { label: 'Low Sleep',       color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
    low_compliance:  { label: 'Low Compliance',  color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl h-full bg-zinc-900 border-l border-zinc-700/50 flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-zinc-700/50 bg-zinc-900/95">
          <Avatar name={athlete.full_name} role="athlete" size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-zinc-100">{athlete.full_name}</h2>
              <span className="text-xs text-zinc-500 font-medium">{athlete.weight_class} · {athlete.federation}</span>
              <span className={cn('text-xs font-bold', compColor)}>{nc}%</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {athlete.flags.map(f => (
                <span key={f} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', FLAG_META[f]?.color ?? 'text-zinc-400 bg-zinc-700/40 border-zinc-600/40')}>
                  {FLAG_META[f]?.label ?? f}
                </span>
              ))}
              {!canEdit && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-zinc-500 bg-zinc-800/40 border-zinc-700/30">View Only</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex border-b border-zinc-700/50 px-5 pt-1 gap-1">
          {PROFILE_TABS.map(t => (
            <button key={t.id} onClick={() => setProfileTab(t.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
                profileTab === t.id
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── TARGETS TAB ── */}
          {profileTab === 'plan' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: 'Training Day', key: 'training' },
                  { title: 'Rest Day',     key: 'rest' },
                ].map(({ title, key }) => (
                  <div key={key} className="space-y-3">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</p>
                    <div className="space-y-2">
                      {['calories','protein','carbs','fat'].map(f => (
                        <div key={f}>
                          <label className="block text-xs text-zinc-500 mb-1 capitalize">{f}</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={plan[key][f]}
                              disabled={!canEdit}
                              onChange={e => { setPlan(p => ({ ...p, [key]: { ...p[key], [f]: Number(e.target.value) } })); setPlanSaved(false) }}
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                            />
                            <span className="text-xs text-zinc-500 w-8">{f === 'calories' ? 'kcal' : 'g'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Current vs Plan summary */}
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BarChart2 className="w-3 h-3" />Current Actuals vs Training Day Targets
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Calories', plan: plan.training.calories, actual: safeMacroActual.calories, unit: 'kcal', color: 'orange' },
                    { label: 'Protein',  plan: plan.training.protein,  actual: safeMacroActual.protein,  unit: 'g', color: 'blue' },
                    { label: 'Carbs',    plan: plan.training.carbs,    actual: safeMacroActual.carbs,    unit: 'g', color: 'purple' },
                    { label: 'Fat',      plan: plan.training.fat,      actual: safeMacroActual.fat,      unit: 'g', color: 'yellow' },
                  ].map(m => {
                    const pct = Math.round((m.actual / m.plan) * 100)
                    const barColor = pct >= 90 ? m.color : pct >= 70 ? 'yellow' : 'red'
                    return (
                      <div key={m.label} className="bg-zinc-800/40 rounded-xl p-2">
                        <p className="text-xs text-zinc-500 mb-1">{m.label}</p>
                        <p className="text-sm font-bold text-zinc-200">{m.actual}{m.unit}</p>
                        <p className="text-xs text-zinc-600">/ {m.plan}{m.unit}</p>
                        <ProgressBar value={m.actual} max={m.plan} color={barColor} size="sm" />
                      </div>
                    )
                  })}
                </div>
              </div>

              {canEdit && (
                <Button className="w-full" onClick={async () => {
                  if (!isDemo && athlete?.id && activeOrgId) {
                    try {
                      await saveNutritionPlan(athlete.id, profile?.id, activeOrgId, {
                        name: 'Nutrition Plan',
                        calories_training: plan.training.calories,
                        calories_rest:     plan.rest.calories,
                        protein_g:         plan.training.protein,
                        carbs_g:           plan.training.carbs,
                        fat_g:             plan.training.fat,
                        coach_notes:       plan.notes,
                      })
                    } catch (err) {
                      console.error('[AthleteNutritionProfile] saveNutritionPlan error:', err)
                    }
                  }
                  setPlanSaved(true)
                  setTimeout(() => setPlanSaved(false), 2500)
                }} disabled={planSaved}>
                  {planSaved ? <><Check className="w-4 h-4" />Saved</> : <><Save className="w-4 h-4" />Save Targets</>}
                </Button>
              )}
            </div>
          )}

          {/* ── MEAL PLANNER TAB ── */}
          {profileTab === 'meals' && (
            <div className="space-y-4">

              {/* Block context banner */}
              {activeBlock && (
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-950/40 border border-purple-900/40 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-purple-300 truncate flex-1">{activeBlock.name}</span>
                  <span className="text-xs text-purple-500 capitalize">· {activeBlock.phase}</span>
                  <span className="text-xs text-purple-500 whitespace-nowrap ml-2">Wk {weekNumber} of {activeBlock.weeks}</span>
                </div>
              )}

              {/* Goal pills */}
              {linkedGoals.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Target className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                  {linkedGoals.map(g => (
                    <span key={g.id} className="text-xs px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300">
                      {g.title}
                    </span>
                  ))}
                </div>
              )}

              {/* Week navigator */}
              <div className="flex items-center gap-2 bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-3 py-2">
                <button onClick={() => setWeekOffset(o => o - 1)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-xs font-semibold text-zinc-200">Week {weekNumber}</span>
                  <span className="text-xs text-zinc-500 ml-2">{weekRangeLabel}</span>
                </div>
                <button onClick={() => setWeekOffset(o => o + 1)} className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {DAYS_LIST.map(day => {
                  const t = dayTotals(day)
                  const hasItems = Object.values(mealPlan[day]).some(slot => slot.length > 0)
                  const hasSessions = (mealPlan[day]['pre-workout']?.length > 0) || (mealPlan[day]['post-workout']?.length > 0)
                  return (
                    <button key={day} onClick={() => setSelectedDay(day)}
                      className={cn(
                        'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
                        selectedDay === day
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : hasItems
                            ? 'bg-zinc-800/60 border-zinc-600/50 text-zinc-300 hover:border-zinc-500/60'
                            : 'bg-zinc-800/30 border-zinc-700/40 text-zinc-600 hover:text-zinc-400'
                      )}>
                      <span>{DAY_LABELS[day]}</span>
                      <span className={cn('text-[10px] font-normal', hasSessions ? 'text-orange-400' : 'text-zinc-600')}>
                        {hasSessions ? 'T' : 'R'}
                      </span>
                      {hasItems && <span className="text-zinc-500 font-normal">{t.calories}kcal</span>}
                    </button>
                  )
                })}
              </div>

              {/* Day totals banner */}
              {(() => {
                const t = dayTotals(selectedDay)
                return (
                  <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/40">
                    {[
                      { label: 'Calories', value: `${t.calories}`, unit:'kcal', target: plan.training.calories },
                      { label: 'Protein',  value: `${t.protein}`,  unit:'g',    target: plan.training.protein },
                      { label: 'Carbs',    value: `${t.carbs}`,    unit:'g',    target: plan.training.carbs },
                      { label: 'Fat',      value: `${t.fat}`,      unit:'g',    target: plan.training.fat },
                    ].map(m => {
                      const pct = m.target ? Math.round((Number(m.value) / m.target) * 100) : 0
                      return (
                        <div key={m.label} className="text-center">
                          <p className="text-xs text-zinc-500">{m.label}</p>
                          <p className={cn('text-sm font-bold', pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-zinc-300')}>
                            {m.value}<span className="text-xs font-normal text-zinc-600">{m.unit}</span>
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Meal slots */}
              <div className="space-y-2">
                {Object.keys(SLOT_LABELS).map(slot => {
                  const items = mealPlan[selectedDay][slot] || []
                  const isExpanded = expandedSlot === slot
                  const slotCals = items.reduce((s, i) => s + i.calories * (i.servings || 1), 0)
                  const slotProt = items.reduce((s, i) => s + i.protein * (i.servings || 1), 0)

                  return (
                    <div key={slot} className="rounded-xl border border-zinc-700/50 overflow-hidden">
                      {/* Slot header */}
                      <button
                        onClick={() => setExpandedSlot(isExpanded ? null : slot)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-800/50 hover:bg-zinc-800/80 transition-colors text-left"
                      >
                        <span className="text-sm">{SLOT_ICONS[slot]}</span>
                        <span className="text-xs font-semibold text-zinc-300 flex-1">{SLOT_LABELS[slot]}</span>
                        {items.length > 0 && (
                          <span className="text-xs text-zinc-500">{items.length} item{items.length > 1 ? 's' : ''} · {Math.round(slotCals)}kcal · {Math.round(slotProt)}g P</span>
                        )}
                        {items.length === 0 && <span className="text-xs text-zinc-700">Empty</span>}
                        <ChevronDown className={cn('w-3.5 h-3.5 text-zinc-600 transition-transform', isExpanded && 'rotate-180')} />
                      </button>

                      {/* Slot items */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 bg-zinc-900/50">
                          {items.length === 0 && (
                            <p className="text-xs text-zinc-600 text-center py-2">No items assigned yet</p>
                          )}
                          {items.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 bg-zinc-800/40 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium text-zinc-200 truncate">{item.name}</p>
                                  <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium flex-shrink-0',
                                    item.source === 'recipe' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                                    item.source === 'prep'   ? 'text-teal-400 bg-teal-500/10 border-teal-500/20' :
                                    'text-zinc-400 bg-zinc-700/30 border-zinc-600/30'
                                  )}>{item.source}</span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {item.servings > 1 ? `×${item.servings} · ` : ''}{Math.round(item.calories * item.servings)}kcal · {Math.round(item.protein * item.servings)}g P · {Math.round(item.carbs * item.servings)}g C · {Math.round(item.fat * item.servings)}g F
                                </p>
                                {item.notes && <p className="text-xs text-zinc-600 italic mt-0.5">{item.notes}</p>}
                              </div>
                              {canEdit && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button onClick={() => {
                                    setMealPlan(prev => {
                                      const updated = { ...prev[selectedDay][slot].find(i => i.id === item.id) }
                                      updated.servings = Math.max(0.5, (updated.servings || 1) - 0.5)
                                      return { ...prev, [selectedDay]: { ...prev[selectedDay], [slot]: prev[selectedDay][slot].map(i => i.id === item.id ? updated : i) } }
                                    })
                                    setMealPlanSaved(false)
                                  }} className="w-5 h-5 flex items-center justify-center rounded bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 text-xs">−</button>
                                  <span className="text-xs text-zinc-400 w-6 text-center">{item.servings}</span>
                                  <button onClick={() => {
                                    setMealPlan(prev => {
                                      const updated = { ...prev[selectedDay][slot].find(i => i.id === item.id) }
                                      updated.servings = (updated.servings || 1) + 0.5
                                      return { ...prev, [selectedDay]: { ...prev[selectedDay], [slot]: prev[selectedDay][slot].map(i => i.id === item.id ? updated : i) } }
                                    })
                                    setMealPlanSaved(false)
                                  }} className="w-5 h-5 flex items-center justify-center rounded bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 text-xs">+</button>
                                  <button onClick={() => removeItem(slot, item.id)} className="text-zinc-600 hover:text-red-400 transition-colors ml-1">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Add item UI */}
                          {canEdit && addingSlot !== slot && (
                            <button onClick={() => { setAddingSlot(slot); setAddMode('recipe') }}
                              className="w-full flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors py-1">
                              <Plus className="w-3.5 h-3.5" /> Assign item
                            </button>
                          )}

                          {canEdit && addingSlot === slot && (
                            <div className="space-y-2 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/40">
                              {/* Mode selector */}
                              <div className="flex gap-1.5">
                                {[
                                  { id: 'recipe', label: 'Recipe' },
                                  { id: 'prep',   label: 'From Prep' },
                                  { id: 'custom', label: 'Custom' },
                                ].map(m => (
                                  <button key={m.id} onClick={() => setAddMode(m.id)}
                                    className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                                      addMode === m.id
                                        ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                                        : 'bg-zinc-700/30 border-zinc-600/30 text-zinc-500 hover:text-zinc-300'
                                    )}>
                                    {m.label}
                                  </button>
                                ))}
                                <button onClick={() => setAddingSlot(null)} className="ml-auto text-zinc-600 hover:text-zinc-400">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Recipe picker */}
                              {addMode === 'recipe' && (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {mockRecipes.map(r => (
                                    <button key={r.id} onClick={() => addItemFromRecipe(r)}
                                      className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-700/30 hover:bg-zinc-700/60 transition-colors text-left">
                                      <div>
                                        <p className="text-xs font-medium text-zinc-200">{r.name}</p>
                                        <p className="text-xs text-zinc-500">{r.meal_type} · {r.macros.calories}kcal · {r.macros.protein}g P</p>
                                      </div>
                                      <Plus className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Prep log picker */}
                              {addMode === 'prep' && (
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                  {mockPrepLog.flatMap(session => session.items).map(prepItem => (
                                    <button key={prepItem.id} onClick={() => addItemFromPrep(prepItem)}
                                      className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-700/30 hover:bg-zinc-700/60 transition-colors text-left">
                                      <div>
                                        <p className="text-xs font-medium text-zinc-200">{prepItem.recipe_name}</p>
                                        <p className="text-xs text-zinc-500">{prepItem.servings_made - prepItem.servings_consumed} servings avail · {prepItem.macros_per_serving.calories}kcal / serving</p>
                                      </div>
                                      <Plus className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Custom item form */}
                              {addMode === 'custom' && (
                                <div className="space-y-2">
                                  <input placeholder="Item name" value={customItem.name}
                                    onChange={e => setCustomItem(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                  <div className="grid grid-cols-4 gap-1.5">
                                    {['calories','protein','carbs','fat'].map(f => (
                                      <div key={f}>
                                        <label className="block text-xs text-zinc-600 mb-0.5 capitalize">{f === 'calories' ? 'kcal' : f}</label>
                                        <input type="number" value={customItem[f]}
                                          onChange={e => setCustomItem(p => ({ ...p, [f]: Number(e.target.value) }))}
                                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <input placeholder="Notes (optional)" value={customItem.notes}
                                    onChange={e => setCustomItem(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                  />
                                  <Button size="xs" className="w-full" onClick={addCustomItem}>
                                    <Plus className="w-3 h-3" /> Add Custom Item
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {canEdit && (
                <Button className="w-full" onClick={saveMealPlanToHistory} disabled={mealPlanSaved}>
                  {mealPlanSaved ? <><Check className="w-4 h-4" />Plan Saved</> : <><Save className="w-4 h-4" />Save Meal Plan</>}
                </Button>
              )}
            </div>
          )}

          {/* ── SHOPPING LIST TAB ── */}
          {profileTab === 'shopping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-200">Shopping List for {athlete.full_name}</p>
                <span className="text-xs text-zinc-500">{shopItems.filter(i => !i.done).length} remaining</span>
              </div>

              {SHOPPING_CATEGORIES.map(cat => {
                const catItems = shopItems.filter(i => i.category === cat)
                if (catItems.length === 0) return null
                return (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{cat}</p>
                    <div className="space-y-1">
                      {catItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2.5 p-2 bg-zinc-800/40 rounded-xl">
                          <button onClick={() => setShopItems(p => p.map(i => i.id === item.id ? { ...i, done: !i.done } : i))}
                            className="flex-shrink-0">
                            {item.done
                              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                              : <Circle className="w-4 h-4 text-zinc-600" />}
                          </button>
                          <span className={cn('text-sm flex-1', item.done ? 'line-through text-zinc-600' : 'text-zinc-200')}>{item.name}</span>
                          {canEdit && (
                            <button onClick={() => setShopItems(p => p.filter(i => i.id !== item.id))}
                              className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {canEdit && (
                <div className="flex gap-2 pt-2">
                  <input
                    value={newShopItem.name}
                    onChange={e => setNewShopItem(p => ({ ...p, name: e.target.value }))}
                    placeholder="Add item…"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <select value={newShopItem.category} onChange={e => setNewShopItem(p => ({ ...p, category: e.target.value }))}
                    className="bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none">
                    {SHOPPING_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <Button size="sm" onClick={() => {
                    if (!newShopItem.name.trim()) return
                    setShopItems(p => [...p, { id: `sh-${Date.now()}`, ...newShopItem, done: false }])
                    setNewShopItem(p => ({ ...p, name: '' }))
                  }}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES TAB ── */}
          {profileTab === 'notes' && (
            <div className="space-y-4">
              {athlete.injury_notes && (
                <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-xl">
                  <p className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" />Injury Notes
                  </p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{athlete.injury_notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />Nutrition Notes
                </p>
                <textarea
                  value={plan.notes}
                  disabled={!canEdit}
                  onChange={e => { setPlan(p => ({ ...p, notes: e.target.value })); setPlanSaved(false) }}
                  rows={5}
                  placeholder="Add coaching notes…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none disabled:opacity-50"
                />
              </div>

              {/* Check-in trend */}
              {athlete.check_in_trend?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-blue-400" />Check-in Trend
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          {['Week','Sleep','Soreness','Stress','Energy','BW'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left text-zinc-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {athlete.check_in_trend.map((row, i) => (
                          <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                            <td className="px-2 py-1.5 font-semibold text-zinc-300">{row.week}</td>
                            <td className="px-2 py-1.5"><span className={cn('font-medium', row.sleep >= 7 ? 'text-green-400' : row.sleep >= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.sleep}h</span></td>
                            <td className="px-2 py-1.5"><span className={cn('font-medium', row.soreness <= 4 ? 'text-green-400' : row.soreness <= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.soreness}/10</span></td>
                            <td className="px-2 py-1.5"><span className={cn('font-medium', row.stress <= 4 ? 'text-green-400' : row.stress <= 6 ? 'text-yellow-400' : 'text-red-400')}>{row.stress}/10</span></td>
                            <td className="px-2 py-1.5"><span className={cn('font-medium', row.energy >= 7 ? 'text-green-400' : row.energy >= 5 ? 'text-yellow-400' : 'text-red-400')}>{row.energy}/10</span></td>
                            <td className="px-2 py-1.5 text-zinc-300">{row.bodyweight}kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {canEdit && (
                <Button className="w-full" onClick={() => setPlanSaved(true)} disabled={planSaved}>
                  {planSaved ? <><Check className="w-4 h-4" />Saved</> : <><Save className="w-4 h-4" />Save Notes</>}
                </Button>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {profileTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-400" />Meal History
                </p>
                <span className="text-xs text-zinc-500">{mealHistory.length} logged days</span>
              </div>

              {mealHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-8 h-8 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No meal history yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Save a day's plan from the Meal Planner tab to log it here</p>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  {(() => {
                    const avg = Math.round(mealHistory.reduce((s, e) => s + e.compliance_pct, 0) / mealHistory.length)
                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
                          <p className="text-xs text-zinc-500">Avg Compliance</p>
                          <p className={cn('text-lg font-bold', avg >= 85 ? 'text-green-400' : avg >= 70 ? 'text-yellow-400' : 'text-red-400')}>{avg}%</p>
                        </div>
                        <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
                          <p className="text-xs text-zinc-500">Training Days</p>
                          <p className="text-lg font-bold text-orange-400">{mealHistory.filter(e => e.day_type === 'training').length}</p>
                        </div>
                        <div className="bg-zinc-800/40 rounded-xl p-3 text-center border border-zinc-700/40">
                          <p className="text-xs text-zinc-500">Rest Days</p>
                          <p className="text-lg font-bold text-blue-400">{mealHistory.filter(e => e.day_type === 'rest').length}</p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Group by week */}
                  {(() => {
                    const byWeek = {}
                    mealHistory.forEach(e => {
                      const key = e.week_label || 'Unknown Week'
                      if (!byWeek[key]) byWeek[key] = []
                      byWeek[key].push(e)
                    })
                    return Object.entries(byWeek).map(([week, entries]) => (
                      <div key={week}>
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3" />{week}
                        </p>
                        <div className="space-y-2">
                          {entries.sort((a, b) => a.date.localeCompare(b.date)).map(entry => (
                            <div key={entry.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium text-zinc-100">{entry.date}</p>
                                  <span className={cn('text-xs capitalize font-medium', entry.day_type === 'training' ? 'text-orange-400' : 'text-blue-400')}>
                                    {entry.day_type === 'training' ? 'Training' : 'Rest'}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className={cn('text-base font-bold', entry.compliance_pct >= 85 ? 'text-green-400' : entry.compliance_pct >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                                    {entry.compliance_pct}%
                                  </p>
                                  <p className="text-xs text-zinc-500">compliance</p>
                                </div>
                              </div>

                              {/* Macro totals */}
                              <div className="grid grid-cols-4 gap-1.5 mb-2">
                                {[
                                  { label: 'Cal', val: entry.totals.calories, tgt: entry.targets?.calories, unit: '' },
                                  { label: 'Prot', val: entry.totals.protein, tgt: entry.targets?.protein, unit: 'g' },
                                  { label: 'Carbs', val: entry.totals.carbs, tgt: null, unit: 'g' },
                                  { label: 'Fat', val: entry.totals.fat, tgt: null, unit: 'g' },
                                ].map(m => (
                                  <div key={m.label} className="bg-zinc-900/60 rounded-lg p-1.5 text-center">
                                    <p className="text-[10px] text-zinc-500">{m.label}</p>
                                    <p className="text-xs font-bold text-zinc-200">{m.val}{m.unit}</p>
                                    {m.tgt && <p className="text-[9px] text-zinc-600">/ {m.tgt}</p>}
                                  </div>
                                ))}
                              </div>

                              {/* Meal slot breakdown */}
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(entry.meals || {}).map(([slot, items]) =>
                                  items?.length > 0 ? (
                                    <span key={slot} className="text-[10px] px-1.5 py-0.5 bg-zinc-700/60 rounded text-zinc-400">
                                      {SLOT_ICONS[slot]} {SLOT_LABELS[slot]} ×{items.length}
                                    </span>
                                  ) : null
                                )}
                              </div>

                              {/* Completed items summary */}
                              {Object.values(entry.meals || {}).flat().some(i => i.completed === false) && (
                                <p className="text-[10px] text-yellow-500 mt-1.5">
                                  ⚠ {Object.values(entry.meals || {}).flat().filter(i => i.completed === false).length} item(s) not completed
                                </p>
                              )}

                              {entry.notes && (
                                <p className="text-xs text-zinc-500 italic mt-1.5">"{entry.notes}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Meal Planner Board (Drag & Drop) ────────────────────────────────────────

const BOARD_SLOTS = ['breakfast', 'pre-workout', 'lunch', 'snack', 'dinner', 'post-workout', 'supplements']
const BOARD_DAYS  = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT   = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' }
const SLOT_ICON   = {}
const SLOT_COLOR  = {
  breakfast:      'text-yellow-300',
  'pre-workout':  'text-orange-300',
  lunch:          'text-green-300',
  snack:          'text-purple-300',
  dinner:         'text-blue-300',
  'post-workout': 'text-teal-300',
  supplements:    'text-pink-300',
}

function emptyWeekBoard() {
  const w = {}
  BOARD_DAYS.forEach(d => {
    w[d] = {}
    BOARD_SLOTS.forEach(s => { w[d][s] = [] })
  })
  return w
}

function MealPlannerBoard({ isAdmin, athleteRecipes, setAthleteRecipes, athletePrepLog, setAthletePrepLog, athleteShoppingLists, setAthleteShoppingLists, onBoardPlansChange, initialAthleteId }) {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { goals: storeGoals } = useGoalsStore()
  const { blocks: storeBlocks } = useTrainingStore()
  const { athletes: liveAthletes, loadRoster } = useRosterStore()

  // Load roster for real users on mount
  useEffect(() => {
    if (!isDemo && activeOrgId && liveAthletes.length === 0) {
      loadRoster(activeOrgId)
    }
  }, [isDemo, activeOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const mockAthletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const mockMealPlans = isDemo ? MOCK_ATHLETE_MEAL_PLANS : {}
  const mockTrainingBlocks = storeBlocks.length ? storeBlocks : (isDemo ? MOCK_TRAINING_BLOCKS : [])
  const mockGoals = storeGoals.length ? storeGoals : (isDemo ? MOCK_GOALS : [])

  const myAssignments = mockStaffAssignments.filter(a => a.staff_id === profile?.id)
  const assignedIds   = myAssignments.map(a => a.athlete_id)
  const athletes      = isAdmin
    ? mockAthletes
    : assignedIds.length > 0 ? mockAthletes.filter(a => assignedIds.includes(a.id)) : mockAthletes

  // Pre-select athlete from deep-link if provided, otherwise default to first
  const defaultAthleteId = (initialAthleteId && athletes.find(a => a.id === initialAthleteId))
    ? initialAthleteId
    : athletes[0]?.id ?? null

  const [selectedAthleteId, setSelectedAthleteId] = useState(defaultAthleteId)
  const [weekOffset, setWeekOffset]               = useState(0)
  const [boardPlan, setBoardPlan]                 = useState(() => {
    const init = {}
    athletes.forEach(a => {
      const seed = mockMealPlans[a.id]
      init[a.id] = seed ? JSON.parse(JSON.stringify(seed)) : emptyWeekBoard()
    })
    return init
  })
  const [dragging, setDragging]           = useState(null)
  const [dragOver, setDragOver]           = useState(null)
  const [weekNotes, setWeekNotes]         = useState({})
  const [linkedGoalIds, setLinkedGoalIds] = useState({})
  const [saved, setSaved]                 = useState(false)
  const [sourceTab, setSourceTab]         = useState('recipes')
  const [expandedPantryId, setExpandedPantryId] = useState(null) // pantry item id expanded in sidebar
  // Modal for clicking a calendar item to view/edit/delete
  const [calItemModal, setCalItemModal]   = useState(null) // { day, slot, idx, item }

  // Sync board plans up so Shopping tab can derive ingredient needs
  useEffect(() => { onBoardPlansChange?.(boardPlan) }, [boardPlan])

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId)
  const activeBlock     = mockTrainingBlocks.find(b => b.status === 'active')
  const blockGoals      = mockGoals.filter(g => activeBlock?.linked_goal_ids?.includes(g.id))
  const allGoals        = mockGoals

  // Athlete-specific recipes and prep items
  const myRecipes      = (athleteRecipes?.[selectedAthleteId] || [])
  const myPrepSessions = (athletePrepLog?.[selectedAthleteId] || [])

  // Count how many servings are already placed on the board but NOT yet eaten
  // so they show as "reserved" and don't inflate available count
  const boardReserved = useMemo(() => {
    const counts = {}
    const plan = boardPlan[selectedAthleteId] || {}
    Object.values(plan).forEach(daySlots => {
      Object.values(daySlots).forEach(slotItems => {
        ;(slotItems || []).forEach(item => {
          if (item.prep_item_id && !item.eaten) {
            counts[item.prep_item_id] = (counts[item.prep_item_id] || 0) + 1
          }
        })
      })
    })
    return counts
  }, [boardPlan, selectedAthleteId])

  // Available = prepped − consumed (already eaten) − reserved on board not yet eaten
  // servings_consumed in the log is incremented on drop, so we just use that directly
  const myPrepItems = myPrepSessions.flatMap(s =>
    (s.items || []).map(item => ({
      ...item,
      servings_remaining: (item.servings_made || 0) - (item.servings_consumed || 0),
    }))
  ).filter(item => item.servings_remaining > 0)

  // Week range label
  const TODAY     = new Date(); TODAY.setHours(0, 0, 0, 0) // current date — drops blocked before this
  const _dow2 = TODAY.getDay()
  const BASE      = new Date(TODAY); BASE.setDate(TODAY.getDate() - (_dow2 === 0 ? 6 : _dow2 - 1))
  const weekStart = new Date(BASE)
  weekStart.setDate(BASE.getDate() + weekOffset * 7)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const fmtD      = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekLabel  = `${fmtD(weekStart)} – ${fmtD(weekEnd)}`
  const weekNum    = 1 + weekOffset

  // Determine which days are in the past (before today) — drops & edits blocked
  const DAY_DATE_MAP = useMemo(() => {
    const map = {}
    BOARD_DAYS.forEach((d, i) => {
      const dt = new Date(weekStart)
      dt.setDate(weekStart.getDate() + i)
      map[d] = dt
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const isPastDay = (day) => {
    const dt = DAY_DATE_MAP[day]
    if (!dt) return false
    const t = new Date(TODAY); t.setHours(0,0,0,0)
    const d2 = new Date(dt);   d2.setHours(0,0,0,0)
    return d2 < t
  }

  const noteKey     = `${selectedAthleteId}_${weekOffset}`
  const weekNote    = weekNotes[noteKey] || ''
  const weekGoalIds = linkedGoalIds[noteKey] || []

  const dayPlan = boardPlan[selectedAthleteId] || emptyWeekBoard()

  // Build a placement map: recipe_id / source_recipe_id / prep_item_id → [{ day, slot }]
  // Board items store recipe_id as the GLOBAL id (e.g. 'r1'), but athlete-recipe sidebar
  // cards have id like 'ar-001-r1' with source_recipe_id: 'r1'. We index by BOTH so
  // sidebar cards always find their placements.
  const itemPlacements = useMemo(() => {
    const map = {}
    // build a quick lookup: global recipe_id → athlete recipe id
    const globalToAthleteId = {}
    myRecipes.forEach(r => {
      if (r.source_recipe_id) globalToAthleteId[r.source_recipe_id] = r.id
    })
    BOARD_DAYS.forEach(day => {
      BOARD_SLOTS.forEach(slot => {
        ;(dayPlan[day]?.[slot] ?? []).forEach(item => {
          const entry = { day: DAY_SHORT[day] ?? day, slot: slot.replace('-', ' ') }
          // index by raw recipe_id (for any recipe items from board)
          if (item.recipe_id) {
            if (!map[item.recipe_id]) map[item.recipe_id] = []
            map[item.recipe_id].push(entry)
            // also index by athlete recipe id so sidebar cards find it
            const athId = globalToAthleteId[item.recipe_id]
            if (athId) {
              if (!map[athId]) map[athId] = []
              map[athId].push(entry)
            }
          }
          if (item.prep_item_id) {
            if (!map[item.prep_item_id]) map[item.prep_item_id] = []
            map[item.prep_item_id].push(entry)
          }
        })
      })
    })
    return map
  }, [dayPlan, myRecipes])

  function handleDrop(day, slot) {
    if (!dragging || !selectedAthleteId) return
    if (isPastDay(day)) return // block drops onto past days
    const isRecipe   = dragging.type === 'recipe'
    const isPrepItem = dragging.type === 'prep'
    const newItem = {
      id:           `dp-${Date.now()}`,
      name:         dragging.name,
      calories:     isRecipe ? (dragging.macros?.calories || 0) : (dragging.macros_per_serving?.calories || 0),
      protein:      isRecipe ? (dragging.macros?.protein  || 0) : (dragging.macros_per_serving?.protein  || 0),
      carbs:        isRecipe ? (dragging.macros?.carbs    || 0) : (dragging.macros_per_serving?.carbs    || 0),
      fat:          isRecipe ? (dragging.macros?.fat      || 0) : (dragging.macros_per_serving?.fat      || 0),
      source:       dragging.type,
      recipe_id:    isRecipe ? dragging.id : null,
      prep_item_id: isPrepItem ? dragging.prep_item_id : null,
      servings:     1,
      eaten:        false, // athlete marks this when they actually eat it
    }
    setBoardPlan(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      if (!next[selectedAthleteId])            next[selectedAthleteId] = emptyWeekBoard()
      if (!next[selectedAthleteId][day])       next[selectedAthleteId][day] = {}
      if (!next[selectedAthleteId][day][slot]) next[selectedAthleteId][day][slot] = []
      next[selectedAthleteId][day][slot].push(newItem)
      return next
    })
    // For prep items: placing on board reserves the serving (consumed++)
    // It gets reversed if the athlete never marks it eaten (handled in removeItem)
    if (isPrepItem && dragging.prep_item_id) {
      setAthletePrepLog(prev => {
        const next = JSON.parse(JSON.stringify(prev))
        ;(next[selectedAthleteId] || []).forEach(session => {
          session.items?.forEach(item => {
            if (item.id === dragging.prep_item_id) {
              item.servings_consumed = Math.min((item.servings_consumed || 0) + 1, item.servings_made || 0)
            }
          })
        })
        return next
      })
    }
    // For recipes: auto-add ingredients to the athlete's active shopping list
    if (isRecipe && setAthleteShoppingLists) {
      const recipe = dragging
      setAthleteShoppingLists(prev => {
        const lists = prev[selectedAthleteId] ?? []
        const activeList = lists.find(l => l.status === 'active')
        if (!activeList) return prev
        // Collect existing item names to avoid duplicate adds
        const existingNames = new Set(
          activeList.categories.flatMap(c => c.items.map(i => i.name.toLowerCase()))
        )
        // Build ingredient items from recipe (use recipe.ingredients if available, else a single placeholder)
        const athlete = mockAthletes.find(a => a.id === selectedAthleteId)
        const newIngredients = (recipe.ingredients ?? []).length > 0
          ? recipe.ingredients
              .filter(ing => !existingNames.has((ing.name ?? ing).toLowerCase()))
              .map(ing => ({
                id:           genAsliId(),
                name:         ing.name ?? ing,
                amount:       ing.amount ?? '',
                price:        0,
                checked:      false,
                recipe_ids:   [recipe.id],
                allergen_flag: (recipe.allergens ?? []).some(a =>
                  (athlete?.dietary_profile?.allergens ?? []).includes(a)
                ),
              }))
          : (!existingNames.has(recipe.name.toLowerCase())
              ? [{ id: genAsliId(), name: recipe.name + ' ingredients', amount: `×${recipe.servings ?? 1}`, price: 0, checked: false, recipe_ids: [recipe.id], allergen_flag: false }]
              : [])
        if (!newIngredients.length) return prev
        const catName = recipe.name
        return {
          ...prev,
          [selectedAthleteId]: lists.map(l => {
            if (l.id !== activeList.id) return l
            const existsCat = l.categories.find(c => c.name === catName)
            if (existsCat) {
              return { ...l, categories: l.categories.map(c => c.name === catName
                ? { ...c, items: [...c.items, ...newIngredients] }
                : c
              )}
            }
            return { ...l, categories: [...l.categories, {
              name: catName,
              icon: '',
              items: newIngredients,
            }]}
          }),
        }
      })
    }
    setDragging(null)
    setDragOver(null)
    setSaved(false)
  }

  // Mark a board meal as eaten → update prep log servings_consumed if it's a prep item,
  // or do nothing extra for recipe-sourced items (they weren't pre-counted)
  function markEaten(day, slot, idx) {
    const item = (dayPlan[day]?.[slot] ?? [])[idx]
    if (!item || item.eaten) return
    setBoardPlan(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selectedAthleteId][day][slot][idx].eaten = true
      return next
    })
    // For recipe-sourced items: now actually consumed, so decrement from prep if linked
    // (prep items already had serving reserved on drop; marking eaten finalises it)
    // Nothing more needed for prep items — already counted on drop.
  }

  function removeItem(day, slot, idx) {
    const item = (dayPlan[day]?.[slot] ?? [])[idx]
    // If prep item and NOT eaten → restore the serving we reserved on drop
    if (item?.prep_item_id && !item.eaten) {
      setAthletePrepLog(prev => {
        const next = JSON.parse(JSON.stringify(prev))
        ;(next[selectedAthleteId] || []).forEach(session => {
          session.items?.forEach(pi => {
            if (pi.id === item.prep_item_id) {
              pi.servings_consumed = Math.max(0, (pi.servings_consumed || 0) - 1)
            }
          })
        })
        return next
      })
    }
    setBoardPlan(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next[selectedAthleteId][day][slot].splice(idx, 1)
      return next
    })
    setSaved(false)
  }

  function updateCalItem(day, slot, idx, patch) {
    setBoardPlan(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const item = next[selectedAthleteId]?.[day]?.[slot]?.[idx]
      if (item) Object.assign(item, patch)
      return next
    })
    setSaved(false)
  }

  function toggleGoalLink(goalId) {
    setLinkedGoalIds(prev => {
      const cur = prev[noteKey] || []
      return {
        ...prev,
        [noteKey]: cur.includes(goalId) ? cur.filter(id => id !== goalId) : [...cur, goalId],
      }
    })
  }

  function getDayType(day) {
    const dp = dayPlan[day] || {}
    return (dp['pre-workout']?.length > 0 || dp['post-workout']?.length > 0) ? 'training' : 'rest'
  }

  function getDayCals(day) {
    const dp = dayPlan[day] || {}
    return Object.values(dp).flat().reduce((s, i) => s + (i.calories || 0), 0)
  }

  function getDayMacros(day) {
    const dp = dayPlan[day] || {}
    const items = Object.values(dp).flat()
    return {
      protein: items.reduce((s, i) => s + (i.protein || 0), 0),
      carbs:   items.reduce((s, i) => s + (i.carbs   || 0), 0),
      fat:     items.reduce((s, i) => s + (i.fat     || 0), 0),
    }
  }

  return (
    <>
    <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)', minHeight: '620px' }}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 overflow-hidden">

        {/* Athlete selector */}
        <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden flex-shrink-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-3 py-2 border-b border-zinc-700/40">
            Athletes
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: '176px' }}>
            {athletes.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAthleteId(a.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                  selectedAthleteId === a.id
                    ? 'bg-purple-900/40 text-purple-200'
                    : 'text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200'
                )}
              >
                <Avatar name={a.full_name} role="athlete" size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.full_name}</p>
                  <p className="text-[10px] text-zinc-600">{a.weight_class}</p>
                </div>
                {selectedAthleteId === a.id && (
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Source panel — combined Recipes + Pantry */}
        <div className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl overflow-hidden flex flex-col min-h-0">

          {/* Header row with section labels */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/40 flex-shrink-0">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Recipes &amp; Pantry</span>
            <span className="text-[9px] text-zinc-600">{myRecipes.length + myPrepItems.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">

            {/* ── RECIPES section ── */}
            {myRecipes.length > 0 && (
              <p className="text-[9px] font-semibold text-purple-400 uppercase tracking-wider px-1 pt-0.5">
                Recipes · {myRecipes.length}
              </p>
            )}
            {myRecipes.length === 0 && myPrepItems.length === 0 && (
              <div className="text-center py-8 space-y-1">
                <p className="text-xs text-zinc-600">No items for this athlete.</p>
                <p className="text-[10px] text-zinc-700">Assign recipes in Meal Prep · add prep in Pantry.</p>
              </div>
            )}
            {myRecipes.map(r => {
              const placements  = itemPlacements[r.id] || []
              const placedCount = placements.length
              return (
                <div
                  key={r.id}
                  draggable
                  onDragStart={() => setDragging({ ...r, type: 'recipe' })}
                  onDragEnd={() => setDragging(null)}
                  className={cn(
                    'p-2 bg-zinc-700/40 border border-zinc-600/40 rounded-lg cursor-grab active:cursor-grabbing',
                    'hover:border-purple-500/40 hover:bg-zinc-700/60 transition-colors select-none',
                    r.is_custom_for_athlete && 'border-orange-800/40',
                    dragging?.id === r.id && 'opacity-50 ring-1 ring-purple-400'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-zinc-200 flex-1 truncate">{r.name}</p>
                    {placedCount > 0 && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-900/60 text-purple-300 flex-shrink-0">
                        {placedCount}×
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {r.macros.calories} kcal · {r.macros.protein}g P
                  </p>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    <span className={cn('text-[9px] capitalize', SLOT_COLOR[r.meal_type] || 'text-zinc-500')}>
                      {r.meal_type.replace('-', ' ')}
                    </span>
                    {r.day_types?.map(dt => (
                      <span key={dt} className="text-[9px] text-zinc-600">· {dt}</span>
                    ))}
                  </div>
                  {placements.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-zinc-700/40">
                      {placements.map((p, pi) => (
                        <span key={pi} className="text-[8px] px-1 py-0.5 rounded bg-purple-950/60 border border-purple-900/40 text-purple-400">
                          {p.day} · {p.slot}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-zinc-700 mt-1">Not on calendar</p>
                  )}
                </div>
              )
            })}

            {/* ── PANTRY divider ── */}
            {myPrepItems.length > 0 && (
              <p className="text-[9px] font-semibold text-teal-400 uppercase tracking-wider px-1 pt-2">
                Pantry · {myPrepItems.length}
              </p>
            )}
            {myPrepItems.length === 0 && myRecipes.length > 0 && (
              <p className="text-[9px] text-zinc-700 px-1 pt-2 pb-1">Pantry empty — add prepped meals in the Pantry tab.</p>
            )}
            {myPrepItems.map((item, i) => {
              const placements   = itemPlacements[item.id] || []
              const placedCount  = placements.length
              const isExpanded   = expandedPantryId === item.id
              const linkedRecipe = item.recipe_id
                ? myRecipes.find(r => r.source_recipe_id === item.recipe_id || r.id === item.recipe_id)
                : null
              const daysOld  = item.prepDate ? Math.floor((new Date() - new Date(item.prepDate)) / 86400000) : null
              const maxDays  = { fridge: 5, freezer: 90, counter: 1 }[item.storage] ?? 5
              const daysLeft = daysOld !== null ? maxDays - daysOld : null
              const freshColor = daysLeft === null ? 'text-zinc-500'
                : daysLeft <= 0  ? 'text-red-400'
                : daysLeft <= 1  ? 'text-orange-400'
                : daysLeft <= 2  ? 'text-yellow-400'
                : 'text-teal-500'
              return (
                <div
                  key={`${item.id}-${i}`}
                  className={cn(
                    'border rounded-lg overflow-hidden transition-colors select-none',
                    item.servings_remaining <= 1 ? 'border-yellow-800/40' : 'border-zinc-600/40',
                    isExpanded ? 'bg-zinc-700/60' : 'bg-zinc-700/40',
                    dragging?.prep_item_id === item.id && 'opacity-50 ring-1 ring-teal-400'
                  )}
                >
                  {/* Draggable header row */}
                  <div
                    draggable
                    onDragStart={() => setDragging({ ...item, name: item.recipe_name, type: 'prep', prep_item_id: item.id })}
                    onDragEnd={() => setDragging(null)}
                    className="p-2 cursor-grab active:cursor-grabbing hover:bg-zinc-700/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-zinc-200 flex-1 truncate">{item.recipe_name}</p>
                      {placedCount > 0 && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-teal-900/60 text-teal-300 flex-shrink-0">
                          {placedCount}×
                        </span>
                      )}
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); setExpandedPantryId(isExpanded ? null : item.id) }}
                        className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 transition-colors ml-0.5"
                        title={isExpanded ? 'Collapse' : 'View recipe'}
                      >
                        <ChevronDown className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-180')} />
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {item.macros_per_serving?.calories} kcal · {item.macros_per_serving?.protein}g P
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={cn('text-[9px]', item.servings_remaining <= 1 ? 'text-yellow-500' : 'text-zinc-600')}>
                        {item.servings_remaining} serving{item.servings_remaining !== 1 ? 's' : ''} left
                      </p>
                      <div className="flex items-center gap-1.5">
                        {item.storage && <span className="text-[8px] text-zinc-600 capitalize">{item.storage}</span>}
                        {daysLeft !== null && (
                          <span className={cn('text-[8px]', freshColor)}>
                            {daysLeft <= 0 ? 'expired' : `${daysLeft}d`}
                          </span>
                        )}
                        {item.servings_remaining <= 1 && <span className="text-[8px] text-yellow-600">low</span>}
                      </div>
                    </div>
                    {placements.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-zinc-700/40">
                        {placements.map((p, pi) => (
                          <span key={pi} className="text-[8px] px-1 py-0.5 rounded bg-teal-950/60 border border-teal-900/40 text-teal-400">
                            {p.day} · {p.slot}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[9px] text-zinc-700 mt-1">Not on calendar</p>
                    )}
                  </div>

                  {/* Expanded recipe detail */}
                  {isExpanded && (
                    <div className="border-t border-zinc-700/50 bg-zinc-800/60 px-2.5 py-2 space-y-2">
                      {linkedRecipe ? (
                        <>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-purple-400">Recipe</p>
                            <span className={cn('text-[9px] capitalize', SLOT_COLOR[linkedRecipe.meal_type] || 'text-zinc-500')}>
                              {linkedRecipe.meal_type?.replace('-', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200 font-medium leading-tight">{linkedRecipe.name}</p>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            {[['Cal', linkedRecipe.macros?.calories, 'text-orange-300'], ['Pro', linkedRecipe.macros?.protein, 'text-blue-300'], ['Carb', linkedRecipe.macros?.carbs, 'text-green-300'], ['Fat', linkedRecipe.macros?.fat, 'text-yellow-300']].map(([lbl, val, c]) => (
                              <div key={lbl} className="bg-zinc-900/50 rounded px-1 py-0.5">
                                <p className={cn('text-[10px] font-bold', c)}>{val ?? 0}</p>
                                <p className="text-[8px] text-zinc-600">{lbl}</p>
                              </div>
                            ))}
                          </div>
                          {linkedRecipe.ingredients?.length > 0 && (
                            <div>
                              <p className="text-[9px] text-zinc-600 mb-1">Ingredients</p>
                              <div className="space-y-0.5">
                                {linkedRecipe.ingredients.map((ing, ii) => (
                                  <div key={ii} className="flex items-center justify-between">
                                    <span className="text-[9px] text-zinc-400">{ing.name}</span>
                                    <span className="text-[9px] text-zinc-600">{ing.amount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {linkedRecipe.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {linkedRecipe.tags.map(t => (
                                <span key={t} className="text-[8px] px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-700/40 rounded text-zinc-500">{t}</span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[10px] text-zinc-600 italic">No linked recipe.</p>
                      )}
                      {item.notes && (
                        <p className="text-[9px] text-zinc-500 border-t border-zinc-700/40 pt-1.5 italic">{item.notes}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

          </div>

          <div className="px-3 py-2 border-t border-zinc-700/40 flex-shrink-0">
            <p className="text-[10px] text-zinc-600 text-center">Drag items → calendar grid</p>
          </div>
        </div>
      </div>

      {/* ── MAIN BOARD ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top: Athlete context + week nav */}
        <div className="flex-shrink-0 space-y-2 mb-3">
          {selectedAthlete && (
            <div className="flex items-center gap-2 flex-wrap">
              <Avatar name={selectedAthlete.full_name} role="athlete" size="sm" />
              <p className="text-sm font-bold text-zinc-100">{selectedAthlete.full_name}</p>
              <span className="text-xs text-zinc-500">{selectedAthlete.weight_class}</span>
              {activeBlock && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/40 border border-purple-900/40 rounded-lg">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-purple-300 font-medium">{activeBlock.name}</span>
                  <span className="text-xs text-purple-500">· Wk {weekNum}/{activeBlock.weeks}</span>
                </div>
              )}
              {blockGoals.map(g => (
                <span
                  key={g.id}
                  className="text-xs px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300"
                >
                  {g.title}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-zinc-200">Week {weekNum}</span>
            <span className="text-xs text-zinc-500">{weekLabel}</span>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="ml-auto">
              <Button
                size="xs"
                className={cn(saved ? 'bg-green-700 hover:bg-green-700' : 'bg-zinc-700 hover:bg-zinc-600')}
                onClick={async () => {
                  if (!isDemo && selectedAthleteId && activeOrgId) {
                    try {
                      const dp = boardPlan[selectedAthleteId] ?? {}
                      const dayCount = Object.keys(dp).length || 1
                      const allBoardItems = Object.values(dp).flatMap(daySlots =>
                        Object.values(daySlots).flat()
                      )
                      const avgCals = Math.round(
                        allBoardItems.reduce((s, i) => s + (i?.calories || 0), 0) / dayCount
                      )
                      const weekNote = weekNotes[selectedAthleteId] ?? ''
                      await saveNutritionPlan(selectedAthleteId, profile?.id, activeOrgId, {
                        name: `Week ${weekNum} Meal Plan`,
                        calories_training: avgCals,
                        coach_notes: weekNote,
                      })
                    } catch (err) {
                      console.error('[MealPlannerBoard] saveNutritionPlan error:', err)
                    }
                  }
                  setSaved(true)
                  setTimeout(() => setSaved(false), 1800)
                }}
              >
                {saved
                  ? <><Check className="w-3 h-3" /> Saved</>
                  : <><Save className="w-3 h-3" /> Save Week</>
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Week grid */}
        <div className="flex-1 overflow-auto rounded-xl border border-zinc-700/40">
          <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="bg-zinc-900 border-b border-r border-zinc-800 p-2 text-left text-zinc-600 font-medium w-24">
                  Slot
                </th>
                {BOARD_DAYS.map(day => {
                  const dt   = getDayType(day)
                  const cals = getDayCals(day)
                  const m    = getDayMacros(day)
                  const past = isPastDay(day)
                  return (
                    <th key={day} className={cn('bg-zinc-900/95 border-b border-r border-zinc-800 p-2 text-center min-w-[100px]', past && 'opacity-50')}>
                      <p className={cn('font-semibold text-xs', past ? 'text-zinc-500' : dt === 'training' ? 'text-orange-300' : 'text-blue-300')}>
                        {DAY_SHORT[day]}
                      </p>
                      {past ? (
                        <p className="text-[9px] font-normal mt-0.5 text-zinc-600">Past</p>
                      ) : (
                        <p className={cn('text-[9px] font-normal mt-0.5', dt === 'training' ? 'text-orange-500' : 'text-blue-600')}>
                          {dt === 'training' ? 'Train' : 'Rest'}
                        </p>
                      )}
                      {cals > 0 && (
                        <p className="text-[9px] font-normal text-zinc-500 mt-0.5">
                          {cals} kcal
                        </p>
                      )}
                      {m.protein > 0 && (
                        <p className="text-[9px] font-normal text-zinc-600">
                          {m.protein}P · {m.carbs}C · {m.fat}F
                        </p>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {BOARD_SLOTS.map(slot => (
                <tr key={slot}>
                  {/* Slot label */}
                  <td className="bg-zinc-900/80 border-b border-r border-zinc-800 p-2 align-top sticky left-0 z-10">
                    <div className={cn('flex items-center gap-1', SLOT_COLOR[slot] || 'text-zinc-500')}>
                      <span className="text-sm">{SLOT_ICON[slot]}</span>
                      <span className="text-[10px] font-medium capitalize leading-tight">
                        {slot.replace('-', ' ')}
                      </span>
                    </div>
                  </td>

                  {/* Day × Slot cells */}
                  {BOARD_DAYS.map(day => {
                    const items  = dayPlan[day]?.[slot] || []
                    const isOver = dragOver?.day === day && dragOver?.slot === slot
                    const past   = isPastDay(day)
                    return (
                      <td
                        key={day}
                        onDragOver={e => { if (past) return; e.preventDefault(); setDragOver({ day, slot }) }}
                        onDragLeave={e => {
                          if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null)
                        }}
                        onDrop={() => handleDrop(day, slot)}
                        className={cn(
                          'border-b border-r border-zinc-800/50 align-top p-1 transition-colors',
                          past
                            ? 'bg-zinc-900/60 opacity-60 cursor-not-allowed'
                            : isOver
                            ? 'bg-green-900/30 ring-1 ring-inset ring-green-500/50'
                            : 'hover:bg-zinc-800/20'
                        )}
                        style={{ minHeight: '56px', verticalAlign: 'top' }}
                      >
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className={cn(
                                'flex items-start gap-1 p-1 border rounded group/item transition-colors cursor-pointer',
                                item.eaten
                                  ? 'bg-teal-950/40 border-teal-700/40 opacity-60'
                                  : 'bg-zinc-800/70 border-zinc-700/40 hover:border-purple-500/50 hover:bg-zinc-700/60'
                              )}
                              onClick={() => setCalItemModal({ day, slot, idx, item: JSON.parse(JSON.stringify(item)) })}
                            >
                              {/* Eaten indicator / toggle */}
                              <button
                                title={item.eaten ? 'Eaten ✓' : 'Mark as eaten'}
                                onClick={e => { e.stopPropagation(); markEaten(day, slot, idx) }}
                                className={cn(
                                  'flex-shrink-0 mt-0.5 transition-colors',
                                  item.eaten ? 'text-teal-400' : 'text-zinc-700 hover:text-teal-500'
                                )}
                              >
                                {item.eaten
                                  ? <CheckCircle2 className="w-3 h-3" />
                                  : <Circle className="w-3 h-3" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-[10px] font-medium leading-tight truncate', item.eaten ? 'text-zinc-500 line-through' : 'text-zinc-200')}>
                                  {item.name}
                                </p>
                                <p className="text-[9px] text-zinc-500 leading-tight">
                                  {item.calories}kcal · {item.protein}g P
                                  {item.source === 'prep' && <span className="text-teal-700 ml-1">· prep</span>}
                                  {item.source === 'recipe' && <span className="text-purple-700 ml-1">· recipe</span>}
                                </p>
                              </div>
                              <button
                                onClick={e => { e.stopPropagation(); removeItem(day, slot, idx) }}
                                className="opacity-0 group-hover/item:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}

                          {/* Drop zone hint */}
                          {items.length === 0 && dragging && isOver && (
                            <div className="text-[9px] text-green-400 text-center py-2 border border-dashed border-green-600/40 rounded">
                              Drop here
                            </div>
                          )}
                          {items.length === 0 && !(dragging && isOver) && (
                            <div style={{ minHeight: '28px' }} />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom: Week notes + goal / block links */}
        <div className="flex-shrink-0 mt-3 bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Week Notes
            </p>
            <div className="flex items-center gap-1 flex-wrap ml-2">
              <Target className="w-3 h-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-600 mr-0.5">Link goals:</span>
              {allGoals.map(g => (
                <button
                  key={g.id}
                  onClick={() => toggleGoalLink(g.id)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                    weekGoalIds.includes(g.id)
                      ? 'bg-purple-900/50 border-purple-600/60 text-purple-300'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500'
                  )}
                >
                  {g.title}
                </button>
              ))}
            </div>
            {activeBlock && (
              <div className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Layers className="w-3 h-3" />
                <span className="capitalize">{activeBlock.phase}</span>
                <span className="text-zinc-700">·</span>
                <span>Wk {weekNum}/{activeBlock.weeks}</span>
              </div>
            )}
          </div>

          {weekGoalIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-purple-400 font-medium">Linked:</span>
              {weekGoalIds.map(gid => {
                const g = allGoals.find(x => x.id === gid)
                return g ? (
                  <span key={gid} className="text-[10px] px-2 py-0.5 bg-purple-900/30 border border-purple-800/50 rounded-full text-purple-300">
                    {g.title}
                  </span>
                ) : null
              })}
            </div>
          )}

          <textarea
            value={weekNote}
            onChange={e => setWeekNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
            rows={2}
            placeholder={`Notes for ${selectedAthlete?.full_name ?? 'athlete'} — Week ${weekNum}… link to block goals, recovery, timing adjustments`}
            className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none"
          />
        </div>
      </div>
    </div>

    {/* ── Calendar item modal (click to view/edit/delete) ── */}
    {calItemModal && (() => {
      const { day, slot, idx } = calItemModal
      const live = dayPlan[day]?.[slot]?.[idx]
      if (!live) { setCalItemModal(null); return null }
      const linked = live.recipe_id
        ? myRecipes.find(r => r.id === live.recipe_id || r.source_recipe_id === live.recipe_id)
        : null
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setCalItemModal(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <p className="text-sm font-bold text-zinc-100">{live.name}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {DAY_SHORT[day]} · <span className="capitalize">{slot.replace('-', ' ')}</span>
                  {live.source && <span className="ml-2 text-zinc-600">· {live.source}</span>}
                </p>
              </div>
              <button onClick={() => setCalItemModal(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Macros row */}
            <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-zinc-800">
              {[['Calories', live.calories, 'kcal', 'text-orange-300'], ['Protein', live.protein, 'g', 'text-blue-300'], ['Carbs', live.carbs, 'g', 'text-green-300'], ['Fat', live.fat, 'g', 'text-yellow-300']].map(([label, val, unit, color]) => (
                <div key={label} className="text-center">
                  <p className={cn('text-sm font-bold', color)}>{val ?? 0}<span className="text-[9px] text-zinc-500 ml-0.5">{unit}</span></p>
                  <p className="text-[9px] text-zinc-600">{label}</p>
                </div>
              ))}
            </div>

            {/* Editable fields */}
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Name</label>
                <input
                  value={live.name}
                  onChange={e => updateCalItem(day, slot, idx, { name: e.target.value })}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Servings</label>
                  <input
                    type="number" min="0.5" step="0.5"
                    value={live.servings ?? 1}
                    onChange={e => {
                      const sv = parseFloat(e.target.value) || 1
                      const base = linked?.macros ?? { calories: live.calories, protein: live.protein, carbs: live.carbs, fat: live.fat }
                      updateCalItem(day, slot, idx, {
                        servings:  sv,
                        calories:  Math.round((base.calories || live.calories) * sv),
                        protein:   Math.round((base.protein  || live.protein)  * sv),
                        carbs:     Math.round((base.carbs    || live.carbs)    * sv),
                        fat:       Math.round((base.fat      || live.fat)      * sv),
                      })
                    }}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Calories (override)</label>
                  <input
                    type="number" min="0"
                    value={live.calories ?? 0}
                    onChange={e => updateCalItem(day, slot, idx, { calories: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Notes</label>
                <textarea
                  value={live.notes ?? ''}
                  onChange={e => updateCalItem(day, slot, idx, { notes: e.target.value })}
                  rows={2}
                  placeholder="Timing, substitutions, reminders…"
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none"
                />
              </div>

              {/* Linked recipe info */}
              {linked && (
                <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-purple-400 mb-1">Linked recipe</p>
                  <p className="text-xs text-zinc-300">{linked.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {linked.macros?.calories} kcal · {linked.macros?.protein}g P · {linked.prep_time}min prep
                  </p>
                  {linked.ingredients?.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-zinc-700/40">
                      <p className="text-[9px] text-zinc-600 mb-1">Ingredients</p>
                      <div className="flex flex-wrap gap-1">
                        {linked.ingredients.map((ing, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 bg-zinc-900/60 border border-zinc-700/40 rounded text-zinc-400">
                            {ing.name} {ing.amount}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => {
                  updateCalItem(day, slot, idx, { eaten: !live.eaten })
                }}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
                  live.eaten
                    ? 'bg-teal-900/40 border-teal-700/50 text-teal-300 hover:bg-teal-900/60'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-teal-300 hover:border-teal-700/50'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {live.eaten ? 'Mark uneaten' : 'Mark eaten'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { removeItem(day, slot, idx); setCalItemModal(null) }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-950/50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
                <button
                  onClick={() => setCalItemModal(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}

function StaffRoster({ isAdmin }) {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes, loading: rosterLoading, loadRoster } = useRosterStore()
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const mockMealPlans = isDemo ? MOCK_ATHLETE_MEAL_PLANS : {}
  const macroDefaults = { calories: 0, protein: 0, carbs: 0, fat: 0 }
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'flags' | 'low_compliance'
  const [profileAthleteId, setProfileAthleteId] = useState(null)

  // For real users: load roster on mount if not already loaded
  useEffect(() => {
    if (!isDemo && activeOrgId && liveAthletes.length === 0 && !rosterLoading) {
      loadRoster(activeOrgId)
    }
  }, [isDemo, activeOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Use live athletes for real users, mock for demo
  const allAthletes = isDemo ? MOCK_ATHLETES : liveAthletes

  // Admin sees ALL athletes; other staff see only their assignments
  const myAssignments = mockStaffAssignments.filter(a => a.staff_id === profile?.id)
  const assignedIds = myAssignments.map(a => a.athlete_id)
  const rosterAthletes = isAdmin
    ? allAthletes
    : assignedIds.length > 0 ? allAthletes.filter(a => assignedIds.includes(a.id)) : allAthletes

  const FLAG_META = {
    pain_flag:       { label: 'Pain Flag',        color: 'text-red-400 bg-red-500/15 border-red-500/30' },
    missed_sessions: { label: 'Missed Sessions',  color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
    low_sleep:       { label: 'Low Sleep',         color: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30' },
    low_compliance:  { label: 'Low Compliance',   color: 'text-orange-400 bg-orange-500/15 border-orange-500/30' },
  }

  const filtered = rosterAthletes.filter(a => {
    const matchSearch = (a.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (a.weight_class ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'flags' ? (a.flags ?? []).length > 0 :
      filter === 'low_compliance' ? (a.nutrition_compliance ?? 100) < 80 :
      true
    return matchSearch && matchFilter
  })

  const profileAthlete = allAthletes.find(a => a.id === profileAthleteId)
  const profileAssignment = mockStaffAssignments.find(a => a.staff_id === profile?.id && a.athlete_id === profileAthleteId)

  return (
    <>
      <div className="space-y-4">
        {/* Search + filter bar */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search athletes…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <Users className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          </div>
          {['all','flags','low_compliance'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-medium border transition-colors',
                filter === f
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
              )}>
              {f === 'all' ? `All (${rosterAthletes.length})` : f === 'flags' ? 'Has Flags' : 'Low Compliance'}
            </button>
          ))}
        </div>

        {/* Athlete cards */}
        <div className="space-y-3">
          {filtered.map((athlete) => {
            const nc = athlete.nutrition_compliance
            const compColor = nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400'
            const compBar = nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'
            const hasMealPlan = !!mockMealPlans[athlete.id]

            return (
              <Card key={athlete.id} className="hover:border-zinc-600/50 transition-colors">
                <CardBody>
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <Avatar name={athlete.full_name} role="athlete" size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-100">{athlete.full_name}</p>
                        <span className="text-xs text-zinc-500">{athlete.weight_class} · {athlete.federation}</span>
                        {athlete.flags.map(f => (
                          <span key={f} className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', FLAG_META[f]?.color ?? 'text-zinc-400 bg-zinc-700/40 border-zinc-600/40')}>
                            {FLAG_META[f]?.label ?? f}
                          </span>
                        ))}
                        {hasMealPlan && (
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-purple-400 bg-purple-500/10 border-purple-500/20">
                            Plan Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{athlete.bio}</p>
                    </div>
                  </div>

          {/* Stats row */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">Nutrition</p>
                      <p className={cn('text-sm font-bold', compColor)}>{nc}%</p>
                      <ProgressBar value={nc} max={100} color={compBar} size="sm" />
                    </div>
                    <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                      <p className="text-xs text-zinc-500 mb-0.5 flex items-center justify-center gap-1"><Moon className="w-3 h-3" />Sleep</p>
                      <p className={cn('text-sm font-bold', athlete.sleep_avg >= 7 ? 'text-green-400' : athlete.sleep_avg >= 6 ? 'text-yellow-400' : 'text-red-400')}>
                        {athlete.sleep_avg}h
                      </p>
                    </div>
                    <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">Sessions</p>
                      <p className={cn('text-sm font-bold', athlete.sessions_this_week >= athlete.sessions_planned_this_week ? 'text-green-400' : 'text-yellow-400')}>
                        {athlete.sessions_this_week}/{athlete.sessions_planned_this_week}
                      </p>
                    </div>
                    <div className="bg-zinc-800/40 rounded-xl p-2 text-center">
                      <p className="text-xs text-zinc-500 mb-0.5">Avg RPE</p>
                      <p className="text-sm font-bold text-zinc-200">{athlete.rpe_avg_this_week}</p>
                    </div>
                  </div>

                  {/* Macro targets vs actuals */}
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(() => {
                      const mp = athlete.nutrition_macros?.plan   ?? macroDefaults
                      const ma = athlete.nutrition_macros?.actual ?? macroDefaults
                      return [
                        { label: 'Calories', plan: mp.calories, actual: ma.calories, unit: 'kcal', barColor: 'bg-orange-500' },
                        { label: 'Protein',  plan: mp.protein,  actual: ma.protein,  unit: 'g',    barColor: 'bg-blue-500'   },
                        { label: 'Carbs',    plan: mp.carbs,    actual: ma.carbs,    unit: 'g',    barColor: 'bg-yellow-500' },
                        { label: 'Fat',      plan: mp.fat,      actual: ma.fat,      unit: 'g',    barColor: 'bg-pink-500'   },
                      ]
                    })().map(m => {
                      const pct = m.plan > 0 ? Math.min(100, Math.round((m.actual / m.plan) * 100)) : 0
                      const valColor = pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400'
                      return (
                        <div key={m.label} className="bg-zinc-800/40 rounded-xl p-2">
                          <p className="text-[10px] text-zinc-500 mb-0.5">{m.label}</p>
                          <p className="text-xs font-bold text-zinc-200">{m.plan}{m.unit}</p>
                          <p className={cn('text-[10px]', valColor)}>{m.actual}{m.unit} actual</p>
                          <div className="mt-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', m.barColor)} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-700/40">
                    <Button size="xs" variant="ghost" className="gap-1.5">
                      <MessageSquare className="w-3 h-3" /> Message
                    </Button>
                    <Button size="xs" className="gap-1.5 ml-auto" onClick={() => setProfileAthleteId(athlete.id)}>
                      <ClipboardList className="w-3 h-3" /> Open Profile
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-600">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No athletes match your search</p>
          </div>
        )}
      </div>

      {/* Full Athlete Nutrition Profile Side Panel */}
      {profileAthlete && (
        <AthleteNutritionProfile
          athlete={profileAthlete}
          isAdmin={isAdmin}
          canEdit={isAdmin || profileAssignment?.can_edit_nutrition}
          onClose={() => setProfileAthleteId(null)}
        />
      )}
    </>
  )
}

// ─── Staff Plans ──────────────────────────────────────────────────────────────
function StaffPlans({ isAdmin }) {
  const { profile, isDemo, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes } = useRosterStore()
  const { orgRecipes } = useNutritionStore()
  const mockAthletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const mockRecipes = isDemo ? MOCK_MEAL_PLAN_RECIPES : orgRecipes
  const [editingAthleteId, setEditingAthleteId] = useState(null)
  const [planFilter, setPlanFilter] = useState('all') // 'all' | 'low_compliance' | 'no_plan'
  const [plans, setPlans] = useState(() =>
    Object.fromEntries(mockAthletes.map(a => {
      const mp = a.nutrition_macros?.plan ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
      return [a.id, {
        training: { ...mp },
        rest: {
          calories: Math.round((mp.calories || 0) * 0.88),
          protein:  mp.protein || 0,
          carbs:    Math.round((mp.carbs || 0) * 0.79),
          fat:      mp.fat || 0,
        },
        notes: a.coach_notes ?? 'No notes yet.',
      }]
    }))
  )

  // For real users: reinitialize plans when roster finishes loading
  useEffect(() => {
    if (!isDemo && liveAthletes.length > 0) {
      setPlans(prev => {
        const next = { ...prev }
        liveAthletes.forEach(a => {
          if (!next[a.id]) {
            const mp = a.nutrition_macros?.plan ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
            next[a.id] = {
              training: { ...mp },
              rest: {
                calories: Math.round((mp.calories || 0) * 0.88),
                protein:  mp.protein || 0,
                carbs:    Math.round((mp.carbs || 0) * 0.79),
                fat:      mp.fat || 0,
              },
              notes: a.coach_notes ?? '',
            }
          }
        })
        return next
      })
    }
  }, [liveAthletes, isDemo])

  // Admin sees ALL athletes; other staff see only their assignments
  const myAssignments = mockStaffAssignments.filter(a => a.staff_id === profile?.id)
  const assignedIds = myAssignments.map(a => a.athlete_id)
  const planAthletes = isAdmin
    ? mockAthletes
    : assignedIds.length > 0 ? mockAthletes.filter(a => assignedIds.includes(a.id)) : mockAthletes

  const filtered = planAthletes.filter(a => {
    if (planFilter === 'low_compliance') return a.nutrition_compliance < 80
    if (planFilter === 'no_plan') return false // placeholder
    return true
  })

  const editingAthlete = mockAthletes.find(a => a.id === editingAthleteId)
  const editingPlan = plans[editingAthleteId]

  return (
    <>
      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'all',            label: `All Athletes (${planAthletes.length})` },
          { id: 'low_compliance', label: 'Low Compliance' },
        ].map(f => (
          <button key={f.id} onClick={() => setPlanFilter(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
              planFilter === f.id
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((athlete) => {
          const plan = plans[athlete.id]
          const nc = athlete.nutrition_compliance
          const compColor = nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400'
          const assign = mockStaffAssignments.find(a => a.staff_id === profile?.id && a.athlete_id === athlete.id)
          const canEdit = isAdmin || (assign?.can_edit_nutrition ?? true) // admin always can edit

          return (
            <Card key={athlete.id}>
              <CardBody>
                {/* Header */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={athlete.full_name} role="athlete" size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-200">{athlete.full_name}</p>
                        {athlete.flags.map(f => (
                          <span key={f} className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium',
                            f === 'pain_flag' ? 'text-red-400 bg-red-500/15 border-red-500/30' :
                            f === 'missed_sessions' ? 'text-orange-400 bg-orange-500/15 border-orange-500/30' :
                            'text-yellow-400 bg-yellow-500/15 border-yellow-500/30'
                          )}>⚠ {f.replace('_',' ')}</span>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-400">{athlete.weight_class} · {athlete.federation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-zinc-500">Nutrition Compliance</p>
                      <p className={cn('text-sm font-bold', compColor)}>{nc}%</p>
                    </div>
                    {canEdit ? (
                      <Button size="xs" variant="outline" onClick={() => setEditingAthleteId(athlete.id)}>
                        <Edit2 className="w-3 h-3" /> Edit Plan
                      </Button>
                    ) : (
                      <Button size="xs" variant="ghost" onClick={() => setEditingAthleteId(athlete.id)}>
                        <Eye className="w-3 h-3" /> View Plan
                      </Button>
                    )}
                  </div>
                </div>

                {/* Macro summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {(() => {
                    const ma = athlete.nutrition_macros?.actual ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
                    return [
                      { label: 'Calories', plan: plan?.training?.calories ?? 0, actual: ma.calories, unit: 'kcal' },
                      { label: 'Protein',  plan: plan?.training?.protein  ?? 0, actual: ma.protein,  unit: 'g' },
                      { label: 'Carbs',    plan: plan?.training?.carbs    ?? 0, actual: ma.carbs,    unit: 'g' },
                      { label: 'Fat',      plan: plan?.training?.fat      ?? 0, actual: ma.fat,      unit: 'g' },
                    ]
                  })().map(m => {
                    const pct = m.plan > 0 ? Math.round((m.actual / m.plan) * 100) : 0
                    return (
                      <div key={m.label} className="bg-zinc-700/30 rounded-xl p-2">
                        <p className="text-xs text-zinc-500">{m.label}</p>
                        <p className="text-sm font-bold text-zinc-200 mt-0.5">{m.plan}{m.unit}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className={cn('text-xs', pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                            {m.actual}{m.unit}
                          </p>
                          <span className="text-zinc-600 text-xs">actual</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Compliance bar + injury flag */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-32">
                    <p className="text-xs text-zinc-500 mb-1">7-day compliance</p>
                    <ProgressBar value={nc} max={100} color={nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'} size="sm" />
                  </div>
                  {athlete.injury_notes && athlete.injury_notes !== 'No active injuries.' && athlete.injury_notes !== 'No active issues.' && (
                    <div className="flex items-start gap-1.5 p-2 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-300 max-w-xs">
                      <Stethoscope className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{athlete.injury_notes}</span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      {/* Edit Plan Modal */}
      <Modal
        open={!!editingAthleteId}
        onClose={() => setEditingAthleteId(null)}
        title={`Edit Plan — ${editingAthlete?.full_name ?? ''}`}
        size="md"
      >
        {editingPlan && (
          <div className="p-6 space-y-5">
            {/* Training day + Rest day side by side */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { title: 'Training Day', key: 'training' },
                { title: 'Rest Day',     key: 'rest' },
              ].map(({ title, key }) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</p>
                  <div className="space-y-2">
                    {['calories', 'protein', 'carbs', 'fat'].map(f => (
                      <div key={f}>
                        <label className="block text-xs text-zinc-500 mb-1 capitalize">{f}</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={editingPlan[key][f]}
                            onChange={e => setPlans(prev => ({
                              ...prev,
                              [editingAthleteId]: {
                                ...prev[editingAthleteId],
                                [key]: { ...prev[editingAthleteId][key], [f]: Number(e.target.value) },
                              },
                            }))}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                          />
                          <span className="text-xs text-zinc-500 w-8">{f === 'calories' ? 'kcal' : 'g'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Assigned Recipes */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Assigned Recipes</p>
              <div className="space-y-1.5">
                {mockRecipes.map(r => {
                  const meta = MEAL_TYPE_META[r.meal_type] || { label: r.meal_type, color: 'text-zinc-400 bg-zinc-700 border-zinc-600' }
                  return (
                    <div key={r.id} className="flex items-center justify-between p-2 bg-zinc-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', meta.color)}>{meta.label}</span>
                        <span className="text-sm text-zinc-200">{r.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">{r.macros.protein}g P · {r.macros.calories} kcal</span>
                        <button className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button className="mt-2 flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add recipe
              </button>
            </div>

            {/* Coach Notes */}
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Coach Notes</p>
              <textarea
                value={editingPlan.notes}
                onChange={e => setPlans(prev => ({
                  ...prev,
                  [editingAthleteId]: { ...prev[editingAthleteId], notes: e.target.value },
                }))}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEditingAthleteId(null)}>Cancel</Button>
              <Button className="flex-1" onClick={async () => {
                if (!isDemo && editingAthleteId && activeOrgId) {
                  try {
                    await saveNutritionPlan(editingAthleteId, profile?.id, activeOrgId, {
                      name: 'Nutrition Plan',
                      calories_training: editingPlan.training.calories,
                      calories_rest:     editingPlan.rest.calories,
                      protein_g:         editingPlan.training.protein,
                      carbs_g:           editingPlan.training.carbs,
                      fat_g:             editingPlan.training.fat,
                      coach_notes:       editingPlan.notes,
                    })
                  } catch (err) {
                    console.error('[StaffPlans] saveNutritionPlan error:', err)
                  }
                }
                setEditingAthleteId(null)
              }}>
                <Save className="w-4 h-4" /> Save Plan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

// ─── Staff Team Overview (admin only) ────────────────────────────────────────
function StaffTeamOverview() {
  const { isDemo, activeOrgId } = useAuthStore()
  const { athletes: liveAthletes, loading: rosterLoading, loadRoster } = useRosterStore()

  // Load roster if not yet loaded for real users
  useEffect(() => {
    if (!isDemo && activeOrgId && liveAthletes.length === 0 && !rosterLoading) {
      loadRoster(activeOrgId)
    }
  }, [isDemo, activeOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const allAthletes = isDemo ? MOCK_ATHLETES : liveAthletes
  const mockStaffAssignments = isDemo ? MOCK_STAFF_ASSIGNMENTS : []
  const mockOrgMembers = isDemo ? MOCK_ORG_MEMBERS : []
  const mockMealPlans = isDemo ? MOCK_ATHLETE_MEAL_PLANS : {}
  // Aggregate staff members from the org
  const staffRoles = ['head_coach','coach','nutritionist']
  const orgStaff = mockOrgMembers.filter(m => m.org_id === 'org-001' && staffRoles.includes(m.org_role))

  const staffCards = orgStaff.map(member => {
    const assignments = mockStaffAssignments.filter(a => a.staff_id === member.user_id)
    const assignedAthleteIds = assignments.map(a => a.athlete_id).filter(id => allAthletes.find(a => a.id === id))
    const assignedAthletes = allAthletes.filter(a => assignedAthleteIds.includes(a.id))
    const avgCompliance = assignedAthletes.length > 0
      ? Math.round(assignedAthletes.reduce((s, a) => s + (a.nutrition_compliance ?? 0), 0) / assignedAthletes.length)
      : null
    const flaggedAthletes = assignedAthletes.filter(a => (a.flags ?? []).length > 0)
    return { member, assignedAthletes, avgCompliance, flaggedAthletes }
  })

  // Org-wide nutrition stats
  const orgAvgCompliance = allAthletes.length > 0
    ? Math.round(allAthletes.reduce((s, a) => s + (a.nutrition_compliance ?? 0), 0) / allAthletes.length)
    : 0
  const athletesWithFlags = allAthletes.filter(a => (a.flags ?? []).length > 0)
  const athletesLowCompliance = allAthletes.filter(a => (a.nutrition_compliance ?? 100) < 80)
  const athletesWithPlan = Object.keys(mockMealPlans).length

  const ROLE_META = {
    head_coach:   { label: 'Head Coach',   color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' },
    coach:        { label: 'Coach',        color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
    nutritionist: { label: 'Nutritionist', color: 'text-green-300 bg-green-500/10 border-green-500/20' },
  }

  return (
    <div className="space-y-6">
      {/* Org-wide summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Avg Compliance" value={`${orgAvgCompliance}%`} sub="org-wide" icon={Target} color={orgAvgCompliance >= 85 ? 'green' : orgAvgCompliance >= 70 ? 'yellow' : 'red'} />
        <StatCard label="Total Athletes" value={`${allAthletes.length}`} sub="on roster" icon={Users} color="blue" />
        <StatCard label="With Meal Plan" value={`${athletesWithPlan}`} sub={`of ${allAthletes.length}`} icon={ClipboardList} color="purple" />
        <StatCard label="Needs Attention" value={`${Math.max(athletesWithFlags.length, athletesLowCompliance.length)}`} sub="flagged or low" icon={AlertTriangle} color="orange" />
      </div>

      {/* Athlete compliance overview */}
      <Card>
        <CardHeader>
          <CardTitle>Athlete Nutrition Compliance</CardTitle>
          <CardSubtitle>All {allAthletes.length} athletes</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {allAthletes.map(a => {
              const nc = a.nutrition_compliance ?? 0
              const compColor = nc >= 85 ? 'text-green-400' : nc >= 70 ? 'text-yellow-400' : 'text-red-400'
              const compBar = nc >= 85 ? 'green' : nc >= 70 ? 'yellow' : 'red'
              const hasPlan = !!mockMealPlans[a.id]
              return (
                <div key={a.id} className="flex items-center gap-3">
                  <Avatar name={a.full_name} role="athlete" size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-zinc-200 truncate">{a.full_name}</p>
                      <span className="text-xs text-zinc-600">{a.weight_class}</span>
                      {(a.flags ?? []).map(f => (
                        <span key={f} className="text-xs text-red-400">⚠</span>
                      ))}
                    </div>
                    <ProgressBar value={nc} max={100} color={compBar} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('text-sm font-bold w-10 text-right', compColor)}>{nc}%</span>
                    {hasPlan
                      ? <span className="text-xs text-purple-400 w-16 text-right">Active</span>
                      : <span className="text-xs text-zinc-700 w-16 text-right">No plan</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* Staff cards */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-purple-400" />Staff Overview
        </h3>
        <div className="space-y-3">
          {staffCards.map(({ member, assignedAthletes, avgCompliance, flaggedAthletes }) => {
            const roleMeta = ROLE_META[member.org_role] ?? { label: member.org_role, color: 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30' }
            return (
              <Card key={member.id}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <Avatar name={member.full_name} role={member.org_role === 'nutritionist' ? 'nutritionist' : 'coach'} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-100">{member.full_name}</p>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', roleMeta.color)}>
                          {roleMeta.label}
                        </span>
                        {member.is_self_athlete && (
                          <span className="text-xs px-2 py-0.5 rounded-full border font-medium text-zinc-400 bg-zinc-700/20 border-zinc-600/20">
                            Self-athlete
                          </span>
                        )}
                      </div>

                      {assignedAthletes.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-xs text-zinc-500">Athletes</p>
                              <p className="text-sm font-bold text-zinc-200">{assignedAthletes.length}</p>
                            </div>
                            {avgCompliance !== null && (
                              <div>
                                <p className="text-xs text-zinc-500">Avg Compliance</p>
                                <p className={cn('text-sm font-bold', avgCompliance >= 85 ? 'text-green-400' : avgCompliance >= 70 ? 'text-yellow-400' : 'text-red-400')}>
                                  {avgCompliance}%
                                </p>
                              </div>
                            )}
                            {flaggedAthletes.length > 0 && (
                              <div>
                                <p className="text-xs text-zinc-500">Flagged</p>
                                <p className="text-sm font-bold text-orange-400">{flaggedAthletes.length}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {assignedAthletes.map(a => (
                              <span key={a.id} className={cn(
                                'text-xs px-2 py-0.5 rounded-full border font-medium',
                                (a.flags ?? []).length > 0
                                  ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                  : 'text-zinc-400 bg-zinc-700/20 border-zinc-600/20'
                              )}>
                                {a.full_name.split(' ')[0]}
                                {(a.flags ?? []).length > 0 && ' ⚠'}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 mt-1">No athlete assignments</p>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}


