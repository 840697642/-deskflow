import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  count?: number
  children?: ReactNode
}

/**
 * 区块头部组件
 * 显示标题、可选的计数和操作按钮
 */
export function SectionHeader({ title, count, children }: SectionHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between gap-4 px-6">
      <h2 className="flex items-baseline gap-2 text-base font-medium leading-snug text-foreground">
        {title}
        {count !== undefined && <span className="text-[13px] font-normal tabular-nums text-muted-foreground">{count}</span>}
      </h2>
      {children}
    </div>
  )
}
