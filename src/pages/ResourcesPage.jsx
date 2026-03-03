import { useState } from 'react'
import { BookOpen, Search, Tag, Video, FileText, ChevronRight, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { MOCK_RESOURCES } from '../lib/mockData'
import { cn } from '../lib/utils'
import { useAuthStore } from '../lib/store'

const CATEGORIES = ['all', 'technique', 'meet_day', 'recovery', 'nutrition', 'rules']

const categoryColor = {
  technique: 'blue',
  meet_day: 'yellow',
  recovery: 'green',
  nutrition: 'orange',
  rules: 'purple',
}

const categoryIcon = {
  technique: 'technique',
  meet_day: 'meet_day',
  recovery: 'recovery',
  nutrition: 'nutrition',
  rules: 'rules',
}

export function ResourcesPage() {
  const { isDemo } = useAuthStore()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = (isDemo ? MOCK_RESOURCES : []).filter((r) => {
    const matchCat = activeCategory === 'all' || r.category === activeCategory
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.tags?.some((t) => t.includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  if (selected) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <button onClick={() => setSelected(null)} className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors">
          ← Back to Resources
        </button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{categoryIcon[selected.category]}</span>
            <h1 className="text-xl font-bold text-zinc-100">{selected.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge color={categoryColor[selected.category]}>{selected.category}</Badge>
            {selected.tags?.map((t) => <Badge key={t} color="default">{t}</Badge>)}
          </div>
          <div className="prose prose-invert max-w-none">
            <ResourceContent title={selected.title} category={selected.category} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Resource Library</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Technique guides, meet day protocols, and playbooks</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize',
              activeCategory === cat
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            )}
          >
            {cat === 'all' ? 'All' : cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Resources grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((resource) => (
          <Card
            key={resource.id}
            className="cursor-pointer hover:border-zinc-600 transition-all group"
            onClick={() => setSelected(resource)}
          >
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0">{categoryIcon[resource.category]}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors">{resource.title}</h3>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Badge color={categoryColor[resource.category]}>{resource.category}</Badge>
                  {resource.tags?.slice(0, 2).map((t) => <Badge key={t} color="default">{t}</Badge>)}
                </div>
                <p className="text-xs text-zinc-500 mt-1.5">Updated {resource.updated_at}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0 mt-0.5" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ResourceContent({ title, category }) {
  const content = {
    'Meet Day Checklist': `
## Meet Day Checklist

### Night Before
- Weigh in (track vs. class)
- Pack singlet, belt, shoes, wraps/sleeves
- Prepare attempt selection strategy
- Prep food: meet day meals + snacks
- Confirm timing: weigh-in time, flight order

### Morning of Meet
- Eat a full meal 3-4 hours before your first attempt
- Hydrate 500ml+ on waking
- Arrive at venue 90min before your flight

### Weigh-In
- Submit opening attempts at weigh-in
- Confirm singlet/equipment passes inspection

### Warm-Up (Squat)
- Start warming up ~1hr before first attempt
- Work up: 40%, 55%, 65%, 75%, 85%, 93% of opener
- Final warm-up: ~5-8 min before first attempt on platform

### Between Flights
- Small carb snacks every 20-30min
- Stay warm — light movement
- Confirm 2nd and 3rd attempts after each lift

### Mental Checklist
- Breathe. Setup > execution.
- Trust the opener. It should feel easy.
- Aggressive but controlled.
    `,
    'Attempt Selection Guide': `
## Attempt Selection Guide

### General Strategy
- **Opener**: 92–95% of max. Should be "almost embarrassingly easy." Your job is to get on the board.
- **2nd attempt**: 97–100% of current best. Solid, attainable, adds to the total.
- **3rd attempt**: Competition best or a new PR. Go for it if 2nd goes well.

### Powerlifting-Specific
- Squat first, then bench, then deadlift
- You get 3 chances per lift
- You need 1 successful attempt per lift to post a total

### Common Mistakes
- Opening too heavy (miss the first lift, mental spiral)
- Attempt jumps too aggressive between 1st and 2nd
- Changing attempts last-second under pressure
- Not leaving gas in the tank for deadlifts

### Example: 650kg Total Goal
| Lift | Opener | 2nd | 3rd |
|------|--------|-----|-----|
| Squat | 192.5 | 202.5 | 210 |
| Bench | 140 | 147.5 | 152.5 |
| Deadlift | 260 | 272.5 | 287.5 |
    `,
  }

  const defaultContent = `
## ${title}

This resource covers key concepts for powerlifting athletes. Content is provided by your coaching staff and updated regularly.

### Key Points
- Focus on consistent execution
- Track metrics to identify trends
- Communicate with your coach if something feels off

### Notes from Coach
Check back regularly — your coaching team updates these resources throughout your training cycles.
  `

  const text = content[title] || defaultContent

  return (
    <div className="text-sm text-zinc-300 space-y-4 leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-zinc-100 mt-2">{line.slice(3)}</h2>
        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-zinc-200 mt-4">{line.slice(4)}</h3>
        if (line.startsWith('- ')) return <p key={i} className="text-zinc-400 pl-2">{line.slice(2)}</p>
        
        if (line.startsWith('- ')) return <p key={i} className="text-zinc-300 pl-2">• {line.slice(2)}</p>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-semibold text-zinc-200">{line.slice(2, -2)}</p>
        if (line.trim() === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-zinc-400">{line}</p>
      })}
    </div>
  )
}
