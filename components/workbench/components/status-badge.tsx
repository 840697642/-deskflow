import { cn } from '@/lib/utils'
import { STATUS_META, TONE_TEXT, TONE_BAR } from '../constants'
import type { JobStatus, ServiceStatus } from '../types'

interface StatusBadgeProps {
  status: JobStatus | ServiceStatus
  className?: string
}

/**
 * 状态徽章
 * 8px 状态圆点 + 文字 + 图标：绝不仅靠颜色传达状态
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <span className={cn('inline-flex h-6 items-center gap-2 text-[13px] font-medium whitespace-nowrap', TONE_TEXT[meta.tone], className)}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TONE_BAR[meta.tone], meta.spin && 'animate-pulse')} />
      {meta.label}
      <Icon className={cn('size-3.5 opacity-70', meta.spin && 'animate-spin')} aria-hidden="true" />
    </span>
  )
}
