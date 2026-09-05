import { useCallback, useRef, useState } from 'react'
import type { Toast } from '../types'

/**
 * Toast 通知 Hook
 * 管理 Toast 队列和自动消失逻辑
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastSeq = useRef(0)

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastSeq.current
    setToasts((prev) => [...prev, { ...t, id }].slice(-4))
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  return {
    toasts,
    pushToast,
    dismissToast,
  }
}
