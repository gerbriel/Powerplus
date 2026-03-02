import { cn } from '../../lib/utils'

export function Card({ children, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4',
        onClick && 'cursor-pointer hover:border-zinc-600 transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return <div className={cn('mb-3', className)}>{children}</div>
}

export function CardTitle({ children, className }) {
  return <h3 className={cn('text-sm font-semibold text-zinc-100', className)}>{children}</h3>
}

export function CardSubtitle({ children, className }) {
  return <p className={cn('text-xs text-zinc-400 mt-0.5', className)}>{children}</p>
}

export function CardBody({ children, className }) {
  return <div className={cn('', className)}>{children}</div>
}
