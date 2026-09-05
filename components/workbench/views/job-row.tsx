import {
  ExternalLink,
  FileText,
  Lock,
  MessageSquareMore,
  Pause,
  Play,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DOMAIN_META, FOCUS_RING, STATUS_META } from '../constants'
import type { Job } from '../types'
import { Button, IconButton, ProgressBar, Skeleton, StatusBadge } from '../components'

type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

interface JobRowProps {
  job: Job
  selected: boolean
  onSelect: () => void
  onAction: (action: JobAction) => void
}

/**
 * 任务行组件
 * 显示任务的状态、心跳、进度和操作按钮
 */
export function JobRow({ job, selected, onSelect, onAction }: JobRowProps) {
  // 加载态：与正常行等高，避免布局抖动
  if (job.status === 'loading') {
    return (
      <li aria-busy="true" aria-label="任务加载中" className="grid h-20 grid-cols-[minmax(0,1fr)_120px_110px_248px] items-center gap-6 px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-56" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-16" />
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </li>
    )
  }

  const meta = STATUS_META[job.status]
  const domain = DOMAIN_META[job.domain]
  const DomainIcon = domain.icon
  const showProgress = job.progress !== undefined || job.status === 'running'
  const hasLogs = job.logs.length > 0

  const stop = (e: React.MouseEvent) => e.stopPropagation()
  const act = (a: JobAction) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onAction(a)
  }

  return (
    <li
      className={cn(
        'grid h-20 cursor-pointer grid-cols-[minmax(0,1fr)_120px_110px_248px] items-center gap-6 px-6 transition-colors duration-150 hover:bg-surface-raised',
        selected && 'bg-accent/60 hover:bg-accent/60',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn('flex min-w-0 flex-col gap-1 rounded-md text-left', FOCUS_RING)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <DomainIcon className={cn('size-4 shrink-0', domain.className)} aria-hidden="true" />
          <span className="truncate text-[13px] font-medium text-foreground">{job.name}</span>
        </span>
        <span className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            {job.project} · {job.step}
          </span>
          {job.progress !== undefined && job.status !== 'success' && job.status !== 'failed' && (
            <span className="tabular-nums">{job.progress}%</span>
          )}
        </span>
        {showProgress && (
          <span className="mt-0.5 block w-full max-w-xs">
            <ProgressBar value={job.progress} tone={meta.tone} label={`${job.name} 进度`} />
          </span>
        )}
      </button>

      <div>
        <StatusBadge status={job.status} />
      </div>

      <div className="flex flex-col gap-0.5" onClick={stop}>
        <span className="text-[11px] text-muted-foreground">最近响应</span>
        <span
          title={job.heartbeatStale ? '任务已长时间未上报进度，可能卡住或掉线' : '任务最后一次上报"仍在运行"的时间'}
          className={cn('flex items-center gap-1 text-[13px] tabular-nums', job.heartbeatStale ? 'font-medium text-warning' : 'text-foreground')}
        >
          {job.heartbeatStale && <TriangleAlert className="size-3" aria-label="长时间无响应" />}
          {job.heartbeat}
          {job.heartbeatStale && <span className="text-[11px] font-normal">无响应</span>}
        </span>
      </div>

      <div className="flex justify-end gap-1" onClick={stop}>
        {job.status === 'running' && (
          <>
            <Button onClick={act('pause')}>
              <Pause className="size-3.5" aria-hidden="true" />
              暂停
            </Button>
            <Button variant="danger" onClick={act('cancel')}>
              <X className="size-3.5" aria-hidden="true" />
              取消
            </Button>
          </>
        )}
        {job.status === 'paused' && (
          <>
            <Button variant="primary" onClick={act('resume')}>
              <Play className="size-3.5" aria-hidden="true" />
              继续
            </Button>
            <Button variant="danger" onClick={act('cancel')}>
              <X className="size-3.5" aria-hidden="true" />
              取消
            </Button>
          </>
        )}
        {job.status === 'waiting_input' && (
          <>
            <Button variant="primary" onClick={act('input')}>
              <MessageSquareMore className="size-3.5" aria-hidden="true" />
              提供输入
            </Button>
            <Button variant="danger" onClick={act('cancel')}>
              <X className="size-3.5" aria-hidden="true" />
              取消
            </Button>
          </>
        )}
        {job.status === 'permission_required' && (
          <>
            <Button variant="primary" onClick={act('authorize')}>
              <Lock className="size-3.5" aria-hidden="true" />
              去授权
            </Button>
            <Button variant="danger" onClick={act('cancel')}>
              <X className="size-3.5" aria-hidden="true" />
              取消
            </Button>
          </>
        )}
        {job.status === 'failed' && (
          <Button variant="primary" onClick={act('retry')}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            重试
          </Button>
        )}
        {job.status === 'queued' && (
          <Button variant="danger" onClick={act('cancel')}>
            <X className="size-3.5" aria-hidden="true" />
            取消
          </Button>
        )}
        {job.status === 'success' && (
          <Button onClick={act('open')}>
            <ExternalLink className="size-3.5" aria-hidden="true" />
            打开结果
          </Button>
        )}
        <IconButton label={hasLogs ? '查看日志' : '尚无日志'} icon={FileText} disabled={!hasLogs} onClick={act('logs')} side="left" />
      </div>
    </li>
  )
}
