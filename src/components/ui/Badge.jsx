import { cn } from '../../lib/utils'

export function Badge({ children, color = 'default', className }) {
  const colors = {
    default: 'bg-zinc-700 text-zinc-300',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    green: 'bg-green-500/15 text-green-400 border border-green-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    red: 'bg-red-500/15 text-red-400 border border-red-500/30',
    orange: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[color], className)}>
      {children}
    </span>
  )
}
