import clsx from 'clsx'

export { clsx as cn }

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return formatDate(dateStr)
}

export function calcE1RM(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  return Math.round(weight * (1 + reps / 30))
}

/**
 * Official IPF DOTS score formula.
 * total & bodyweight must both be in kg.
 */
export function calcDotsScore(total, bodyweight, isMale = true) {
  if (!total || !bodyweight || bodyweight <= 0) return 0
  const bw = bodyweight
  // Coefficients from the official IPF DOTS table
  const [a, b, c, d, e] = isMale
    ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093]
    : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706]
  const denom = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4
  return denom > 0 ? Math.round((500 / denom) * total * 100) / 100 : 0
}

export function kgToLbs(kg) {
  return Math.round(kg * 2.20462 * 10) / 10
}

export function lbsToKg(lbs) {
  return Math.round((lbs / 2.20462) * 10) / 10
}

/** Convert a weight value to the display unit. Always returns a number. */
export function convertWeight(value, unit) {
  const num = Number(value)
  if (!num) return 0
  return unit === 'lbs' ? kgToLbs(num) : num
}

/** Convert a weight entered in `unit` back to kg for storage. */
export function toKg(value, unit) {
  const num = Number(value)
  if (!num) return 0
  return unit === 'lbs' ? lbsToKg(num) : num
}

export function roleColor(role) {
  const map = {
    admin: 'text-purple-400 bg-purple-400/10',
    coach: 'text-blue-400 bg-blue-400/10',
    nutritionist: 'text-green-400 bg-green-400/10',
    athlete: 'text-yellow-400 bg-yellow-400/10',
  }
  return map[role] || 'text-zinc-400 bg-zinc-400/10'
}

export function adherenceColor(pct) {
  if (pct >= 90) return 'text-green-400'
  if (pct >= 75) return 'text-yellow-400'
  return 'text-red-400'
}

export function flagLabel(flag) {
  const map = {
    pain_flag: { label: 'Pain Reported', color: 'text-red-400 bg-red-400/10' },
    missed_sessions: { label: 'Missed Sessions', color: 'text-orange-400 bg-orange-400/10' },
    low_sleep: { label: 'Low Sleep', color: 'text-blue-400 bg-blue-400/10' },
    video_pending: { label: 'Video Pending', color: 'text-purple-400 bg-purple-400/10' },
  }
  return map[flag] || { label: flag, color: 'text-zinc-400 bg-zinc-400/10' }
}

export function macroPercent(actual, target) {
  if (!target || target === 0) return 0
  return Math.min(100, Math.round((actual / target) * 100))
}

export function getRPEColor(rpe) {
  if (rpe >= 9) return 'text-red-400'
  if (rpe >= 7) return 'text-orange-400'
  if (rpe >= 5) return 'text-yellow-400'
  return 'text-green-400'
}

/**
 * Wilks2020 score. total & bodyweight in kg.
 * Coefficients from the updated 2020 formula.
 */
export function calcWilks(total, bodyweight, isMale = true) {
  if (!total || !bodyweight || bodyweight <= 0) return 0
  const bw = bodyweight
  const [a, b, c, d, e, f] = isMale
    ? [47.4617885411949, 8.47206137941125, 0.073694103462609, -0.00139583381094385, 7.07665973070743e-6, -1.20804336482315e-8]
    : [-125.425539779509, 13.7121941940124, -0.0330725063103405, -0.000152577581160959, 1.13720398474914e-6, -2.51051664932578e-9]
  const denom = a + b * bw + c * bw ** 2 + d * bw ** 3 + e * bw ** 4 + f * bw ** 5
  return denom > 0 ? Math.round((600 / denom) * total * 100) / 100 : 0
}

/**
 * Glossbrenner score. total & bodyweight in kg.
 * Uses Wilks2 + IPF points averaged (simplified commonly-used version).
 */
export function calcGlossbrenner(total, bodyweight, isMale = true) {
  if (!total || !bodyweight || bodyweight <= 0) return 0
  const wilks = calcWilks(total, bodyweight, isMale)
  const dots = calcDotsScore(total, bodyweight, isMale)
  return Math.round(((wilks + dots) / 2) * 100) / 100
}

/**
 * e1RM using Brzycki formula: weight / (1.0278 - 0.0278 * reps)
 */
export function calcE1RMBrzycki(weight, reps) {
  if (!weight || !reps || reps <= 0 || reps >= 37) return 0
  return Math.round(weight / (1.0278 - 0.0278 * reps))
}

/**
 * e1RM using Lombardi formula: weight * reps^0.10
 */
export function calcE1RMLombardi(weight, reps) {
  if (!weight || !reps || reps <= 0) return 0
  return Math.round(weight * Math.pow(reps, 0.10))
}

/**
 * Attempt selection based on a training e1RM (kg).
 * Returns opener, second, and two third attempt options (conservative / aggressive).
 */
export function calcAttemptSuggestions(e1rmKg) {
  if (!e1rmKg || e1rmKg <= 0) return null
  const round = (v) => Math.round(v / 2.5) * 2.5  // round to nearest 2.5 kg
  return {
    opener: round(e1rmKg * 0.90),
    second: round(e1rmKg * 0.96),
    thirdConservative: round(e1rmKg * 1.00),
    thirdAggressive: round(e1rmKg * 1.03),
  }
}

/**
 * Total tonnage for an array of sets: sum of weight_kg * reps.
 * Each element should have { weight_kg, reps }.
 */
export function calcTonnage(setsArray) {
  if (!Array.isArray(setsArray)) return 0
  return Math.round(setsArray.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0))
}

/**
 * Aggregate tonnage across multiple sessions.
 * Each session should have blocks[].exercises[].sets_logged[].
 */
export function calcSessionsTonnage(sessions) {
  if (!Array.isArray(sessions)) return 0
  let total = 0
  sessions.forEach((session) => {
    session.blocks?.forEach((block) => {
      block.exercises?.forEach((ex) => {
        total += calcTonnage(ex.sets_logged || [])
      })
    })
  })
  return Math.round(total)
}
