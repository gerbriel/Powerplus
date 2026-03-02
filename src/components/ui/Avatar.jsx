import { getInitials, cn } from '../../lib/utils'

const sizeMap = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const colorMap = {
  admin: 'bg-purple-700 text-purple-100',
  coach: 'bg-blue-700 text-blue-100',
  nutritionist: 'bg-green-700 text-green-100',
  athlete: 'bg-yellow-700 text-yellow-100',
  default: 'bg-zinc-700 text-zinc-100',
}

export function Avatar({ name, role = 'default', src, size = 'md', className }) {
  const sizeClass = sizeMap[size] || sizeMap.md
  const colorClass = colorMap[role] || colorMap.default

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold flex-shrink-0', sizeClass, colorClass, className)}>
      {getInitials(name)}
    </div>
  )
}
