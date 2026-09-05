import { CircleCheck, Info, TriangleAlert, CircleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_BADGE, FOCUS_RING } from '../constants'
import type { Toast, IconType, Tone } from '../types'

const TOAST_ICON: Record<Toast['tone'], IconType> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
}

interface ToastStackProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

/**
 * Toast 堆栈组件
 * 显示在右下角的轻提示
 */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed right-6 bottom-6 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.tone]
        const tone: Tone = t.tone
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-[10px] border border-foreground/[0.04] bg-card/95 p-4 shadow-lg backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE_BADGE[tone])}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium leading-snug text-foreground">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground text-pretty">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => onDismiss(t.id)}
              className={cn('-mt-1 -mr-1 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground', FOCUS_RING)}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
