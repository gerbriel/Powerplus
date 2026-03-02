import { cn } from '../../lib/utils'

export function Input({ label, error, className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>}
      <input
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors',
          error && 'border-red-500 focus:ring-red-500/50',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>}
      <select
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>}
      <textarea
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-colors',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
