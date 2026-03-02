import { cn } from '../../lib/utils'

export function StatCard({ label, value, sub, icon: Icon, trend, trendLabel, color = 'purple', className }) {
  const colorMap = {
    purple: 'text-purple-400 bg-purple-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-green-400 bg-green-400/10',
    yellow: 'text-yellow-400 bg-yellow-400/10',
    red: 'text-red-400 bg-red-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
  }

  return (
    <div className={cn('bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4 flex items-start gap-4', className)}>
      {Icon && (
        <div className={cn('p-2.5 rounded-lg flex-shrink-0', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-zinc-100 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        {trendLabel && (
          <p className={cn('text-xs mt-1 font-medium', trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400')}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {trendLabel}
          </p>
        )}
      </div>
    </div>
  )
}
