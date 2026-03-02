import { cn } from '../../lib/utils'

export function ProgressBar({ value, max = 100, color = 'purple', size = 'md', className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  const colorMap = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
  }

  const sizeMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full bg-zinc-700 rounded-full overflow-hidden', sizeMap[size], className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colorMap[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
