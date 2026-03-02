import { cn } from '../../lib/utils'

export function Button({ children, variant = 'primary', size = 'md', className, disabled, onClick, type = 'button' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-500 text-white focus:ring-purple-500',
    secondary: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100 focus:ring-zinc-500',
    danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 focus:ring-zinc-500',
    success: 'bg-green-600 hover:bg-green-500 text-white focus:ring-green-500',
    outline: 'border border-zinc-600 hover:border-zinc-400 bg-transparent text-zinc-300 hover:text-zinc-100 focus:ring-zinc-500',
  }

  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  )
}
