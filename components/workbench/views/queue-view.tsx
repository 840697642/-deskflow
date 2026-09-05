import { Info, ListTodo, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FILTERS, FOCUS_RING } from '../constants'
import type { Job, Filter } from '../types'
import { Button, EmptyState, SectionHeader } from '../components'
import { JobRow } from './job-row'

interface QueueViewProps {
  jobs: Job[]
  filter: Filter
  query: string
  selectedId?: string
  counts: Record<Filter, number>
  onFilterChange: (filter: Filter) => void
  onQueryChange: (query: string) => void
  onSelectJob: (jobId: string) => void
  onJobAction: (jobId: string, action: string) => void
}

/**
 * 任务队列视图
 * 显示所有任务的列表，支持筛选和搜索
 */
export function QueueView({
  jobs,
  filter,
  query,
  selectedId,
  counts,
  onFilterChange,
  onQueryChange,
  onSelectJob,
  onJobAction,
}: QueueViewProps) {
  const filteredJobs = jobs
    .filter((j) => j.status !== 'loading')
    .filter((j) => {
      if (filter === 'all') return true
      if (filter === 'active') return j.status === 'running' || j.status === 'queued' || j.status === 'paused'
      if (filter === 'attention') return j.status === 'failed' || j.status === 'permission_required' || j.status === 'waiting_input' || j.heartbeatStale
      if (filter === 'done') return j.status === 'success'
      return true
    })
    .filter((j) => {
      if (!query) return true
      const q = query.toLowerCase()
      return j.name.toLowerCase().includes(q) || j.project.toLowerCase().includes(q)
    })

  return (
    <section aria-labelledby="jobs-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title="任务队列" count={jobs.filter((j) => j.status !== 'loading').length}>
        <label className="relative">
          <span className="sr-only">筛选任务</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="筛选任务名或项目"
            className={cn(
              'h-10 w-56 rounded-lg border border-transparent bg-muted pr-3 pl-9 text-[13px] text-foreground transition-colors duration-150 placeholder:text-muted-foreground',
              'focus:border-primary focus:bg-card',
              FOCUS_RING,
            )}
          />
        </label>
      </SectionHeader>
      <span id="jobs-heading" className="sr-only">
        任务队列
      </span>

      {/* 状态筛选：可点击，承担实际筛选功能 */}
      <div role="tablist" aria-label="按状态筛选" className="flex gap-1 px-4 pb-4">
        {FILTERS.map((f) => {
          const isActive = f.id === filter
          return (
            <button
              key={f.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] transition-colors duration-150',
                FOCUS_RING,
                isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {f.label}
              <span className={cn('tabular-nums', isActive ? 'text-primary' : 'text-muted-foreground/70')}>{counts[f.id]}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_120px_110px_248px] gap-6 border-b border-border/60 px-6 py-2 text-[11px] font-medium text-muted-foreground">
        <span>任务</span>
        <span>状态</span>
        <span className="flex items-center gap-1">
          最近响应
          <span className="group relative inline-flex">
            <Info className="size-3 cursor-help text-muted-foreground/70" aria-label="什么是最近响应" tabIndex={0} />
            <span
              role="tooltip"
              className="pointer-events-none absolute top-full left-1/2 z-40 mt-1.5 w-56 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-2 text-[11px] font-normal leading-relaxed whitespace-normal text-card opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              后台任务运行时会定期向工作台报告"我还在运行"。这里显示最后一次报告的时间；如果超过预期仍无报告，会标为"无响应"，说明任务可能卡住或掉线。
            </span>
          </span>
        </span>
        <span className="text-right">操作</span>
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="没有匹配的任务"
          description="试试更换筛选条件或清空搜索关键词。"
          action={
            <Button
              variant="ghost"
              onClick={() => {
                onFilterChange('all')
                onQueryChange('')
              }}
            >
              清除筛选
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border/60">
          {filteredJobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              selected={job.id === selectedId}
              onSelect={() => onSelectJob(job.id)}
              onAction={(action) => onJobAction(job.id, action)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
