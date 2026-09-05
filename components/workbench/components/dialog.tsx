import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_BADGE } from '../constants'
import type { IconType, Tone } from '../types'
import { IconButton } from './icon-button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  icon?: IconType
  tone?: Tone
  role?: 'dialog' | 'alertdialog'
  width?: 'sm' | 'md' | 'lg'
  children?: ReactNode
  footer?: ReactNode
}

/**
 * 对话框组件
 * 支持不同尺寸、图标和底部操作区
 */
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
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }
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
        className={cn('relative flex w-full flex-col overflow-hidden rounded-xl bg-card shadow-lg outline-none', widths[width])}
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
