import { cn } from '../../lib/utils'

export function Slider({ label, value, min = 1, max = 10, onChange, colorFn, className }) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-xs font-medium text-zinc-400">{label}</label>
          <span className={cn('text-sm font-bold', colorFn ? colorFn(value) : 'text-zinc-100')}>{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500"
      />
      <div className="flex justify-between text-xs text-zinc-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
