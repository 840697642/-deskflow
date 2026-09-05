import { cn } from '@/lib/utils'
import { TONE_BAR } from '../constants'
import type { Tone } from '../types'

interface ProgressBarProps {
  value?: number
  tone: Tone
  label: string
}

/**
 * 进度条组件
 * value 为 undefined 时显示为不确定状态（indeterminate）
 */
export function ProgressBar({ value, tone, label }: ProgressBarProps) {
  const indeterminate = value === undefined
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
      className="relative h-1 w-full overflow-hidden rounded-full bg-border/60"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONE_BAR[tone], indeterminate && 'w-1/3 opacity-40')}
        style={indeterminate ? undefined : { width: `${value}%` }}
      />
    </div>
  )
}
