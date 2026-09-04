import { TriangleAlert } from 'lucide-react'
import { Dialog } from './dialog'
import { Button } from './button'

interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

interface ConfirmDialogProps {
  state: ConfirmState | null
  onClose: () => void
}

/**
 * 确认对话框组件
 * 用于需要用户确认的危险操作
 */
export function ConfirmDialog({ state, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      open={state !== null}
      onClose={onClose}
      role="alertdialog"
      width="sm"
      icon={TriangleAlert}
      tone="danger"
      title={state?.title ?? ''}
      description={state?.description}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            取消
          </Button>
          <Button
            size="md"
            className="border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              state?.onConfirm()
              onClose()
            }}
          >
            {state?.confirmLabel}
          </Button>
        </>
      }
    />
  )
}
