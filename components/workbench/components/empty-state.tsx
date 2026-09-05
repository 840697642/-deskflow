import type { ReactNode } from 'react'
import type { IconType } from '../types'

interface EmptyStateProps {
  icon: IconType
  title: string
  description: string
  action?: ReactNode
}

/**
 * 空状态组件
 * 用于展示无数据时的提示信息
 */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="mb-2 flex size-12 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <p className="text-base font-medium leading-snug text-foreground">{title}</p>
      <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground text-pretty">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
