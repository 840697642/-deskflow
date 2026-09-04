'use client'

import { useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import { X, type LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// 基础控件与设计令牌：不依赖任何业务模块，供 workbench 及各子视图共用。
// 注意：不要从这里导入 '@/components/workbench'，否则会重新形成循环依赖。
// =============================================================================

export type IconType = ComponentType<LucideProps>

/** 轻提示 */
export interface Toast {
  id: number
  title: string
  description?: string
  tone: 'success' | 'info' | 'warning' | 'danger'
}

// -----------------------------------------------------------------------------
// 色调令牌：颜色 + 文本 + 图标 三者组合，绝不只依赖颜色
// -----------------------------------------------------------------------------

export type Tone = 'primary' | 'info' | 'warning' | 'success' | 'danger' | 'muted'

/** 柔和的着色背景：用于提示条，不带边框 */
export const TONE_BADGE: Record<Tone, string> = {
  primary: 'bg-primary/8 text-primary',
  info: 'bg-info/8 text-info',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  danger: 'bg-destructive/8 text-destructive',
  muted: 'bg-muted text-muted-foreground',
}

export const TONE_TEXT: Record<Tone, string> = {
  primary: 'text-primary',
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
}

export const TONE_BAR: Record<Tone, string> = {
  primary: 'bg-primary',
  info: 'bg-info',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
  muted: 'bg-muted-foreground',
}

// -----------------------------------------------------------------------------
// 基础控件：统一的默认 / 悬停 / 键盘焦点 / 禁用 状态
// -----------------------------------------------------------------------------

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'

export function Button({
  variant = 'outline',
  size = 'sm',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground border-transparent shadow-sm hover:bg-primary-hover',
    outline: 'bg-transparent text-primary border-border hover:bg-muted',
    ghost: 'bg-transparent text-foreground border-transparent hover:bg-muted',
    danger: 'bg-transparent text-destructive border-transparent hover:bg-destructive/8',
  }
  return (
    <button
      type="button"
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-medium transition-colors duration-150',
        size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10 px-4 text-[13px]',
        'disabled:pointer-events-none disabled:opacity-40',
        FOCUS_RING,
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/** 图标按钮：必须带 tooltip 与 aria-label */
export function IconButton({
  label,
  icon: Icon,
  className,
  active,
  side = 'bottom',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  icon: IconType
  active?: boolean
  side?: 'bottom' | 'top' | 'left'
}) {
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

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-muted', className)} />
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: IconType; title: string; description: string; action?: ReactNode }) {
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

export function SectionHeader({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
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

// -----------------------------------------------------------------------------
// 模态对话框
// -----------------------------------------------------------------------------

/** 通用模态容器：Esc 关闭、点击遮罩关闭、打开时聚焦 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  tone = 'primary',
  role = 'dialog',
  width = 'md',
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: IconType
  tone?: Tone
  role?: 'dialog' | 'alertdialog'
  width?: 'sm' | 'md' | 'lg' | 'xl'
  children?: ReactNode
  footer?: ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" aria-hidden="true" />
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-desc' : undefined}
        tabIndex={-1}
        className={cn('relative flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-y-auto rounded-xl bg-card shadow-lg outline-none', widths[width])}
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          {Icon && (
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-[10px]', TONE_BADGE[tone])}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="dialog-title" className="text-base font-medium leading-snug text-foreground">
              {title}
            </h2>
            {description && (
              <p id="dialog-desc" className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">
                {description}
              </p>
            )}
          </div>
          <IconButton label="关闭" icon={X} onClick={onClose} className="-mt-1 -mr-2" side="left" />
        </div>
        {children && <div className="px-6 pt-4">{children}</div>}
        {footer && <div className="flex justify-end gap-2 px-6 pt-6 pb-6">{footer}</div>}
      </div>
    </div>
  )
}
