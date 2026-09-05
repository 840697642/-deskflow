import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '../constants'
import type { IconType } from '../types'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: IconType
  active?: boolean
  side?: 'bottom' | 'top' | 'left'
}

/**
 * 图标按钮
 * 必须带 tooltip 与 aria-label
 */
export function IconButton({ label, icon: Icon, className, active, side = 'bottom', ...props }: IconButtonProps) {
  const pos =
    side === 'bottom'
      ? 'top-full left-1/2 mt-1.5 -translate-x-1/2'
      : side === 'top'
        ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
        : 'right-full top-1/2 mr-1.5 -translate-y-1/2'

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground',
          'disabled:pointer-events-none disabled:opacity-40',
          FOCUS_RING,
          active && 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
          className,
        )}
        {...props}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-card opacity-0 shadow-md transition-opacity duration-150',
          'group-hover:opacity-100 group-focus-within:opacity-100',
          pos,
        )}
      >
        {label}
      </span>
    </span>
  )
}
