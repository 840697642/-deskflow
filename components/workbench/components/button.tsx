import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '../constants'
import type { ButtonVariant } from '../types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  children: ReactNode
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground border-transparent shadow-sm hover:bg-primary-hover',
  outline: 'bg-transparent text-primary border-border hover:bg-muted',
  ghost: 'bg-transparent text-foreground border-transparent hover:bg-muted',
  danger: 'bg-transparent text-destructive border-transparent hover:bg-destructive/8',
}

/**
 * 按钮组件
 * 支持 4 种变体：primary, outline, ghost, danger
 */
export function Button({ variant = 'outline', size = 'sm', className, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors duration-150',
        size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10 px-4 text-[13px]',
        'disabled:pointer-events-none disabled:opacity-40',
        FOCUS_RING,
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
