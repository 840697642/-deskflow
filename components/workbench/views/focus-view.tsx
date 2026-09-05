import { useMemo } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  Cloud,
  HardDrive,
  Lock,
  MessageSquareMore,
  Megaphone,
  PanelRight,
  Pin,
  PinOff,
  Play,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ATTENTION_RANK,
  BUCKET_META,
  BUCKET_ORDER,
  DOMAIN_META,
  DOC_KIND_ICON,
  FOCUS_RING,
  PRIORITY_META,
  STATUS_META,
  TONE_BAR,
  TONE_TEXT,
  TONE_BADGE,
  ANN_TONE,
  bucketOf,
} from '../constants'
import type {
  Job,
  JobStatus,
  PlanCard,
  KnowledgeDoc,
  Announcement,
  Service,
  View,
  Domain,
  IconType,
  Tone,
  Bucket,
} from '../types'
import { Button, IconButton, EmptyState, SectionHeader } from '../components'

type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

interface TimelineItem {
  id: string
  kind: 'plan' | 'job'
  title: string
  project: string
  domain: Domain
  bucket: Bucket
  meta: string
  tone: Tone
  jobId?: string
}

interface FocusViewProps {
  jobs: Job[]
  plan: PlanCard[]
  docs: KnowledgeDoc[]
  announcements: Announcement[]
  services: Service[]
  onJobAction: (id: string, action: JobAction) => void
  onServiceAction: (id: string) => void
  onSelectJob: (id: string) => void
  onNavigate: (view: View) => void
  onTogglePinDoc: (id: string) => void
}

/**
 * 今日焦点视图
 * 显示需要处理的事项、时间线、置顶文件和公告
 */
export function FocusView({
  jobs,
  plan,
  docs,
  announcements,
  services,
  onJobAction,
  onServiceAction,
  onSelectJob,
  onNavigate,
  onTogglePinDoc,
}: FocusViewProps) {
  const attentionJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.status !== 'loading' && (ATTENTION_RANK[j.status] !== undefined || j.heartbeatStale))
        .sort((a, b) => (ATTENTION_RANK[a.status] ?? 3) - (ATTENTION_RANK[b.status] ?? 3)),
    [jobs],
  )
  const attentionServices = services.filter((s) => s.status === 'offline' || s.status === 'permission_required' || s.status === 'degraded')

  const timeline = useMemo(() => {
    const items: TimelineItem[] = []
    for (const j of jobs) {
      if (j.status === 'running') {
        items.push({
          id: `job-${j.id}`,
          kind: 'job',
          title: j.name,
          project: j.project,
          domain: j.domain,
          bucket: 'today',
          meta: `${j.step}${j.progress !== undefined ? ` · ${j.progress}%` : ''}${j.eta ? ` · 预计 ${j.eta} 完成` : ''}`,
          tone: 'primary',
          jobId: j.id,
        })
      }
    }
    for (const c of plan) {
      if (c.column === 'done') continue
      const bucket = bucketOf(c.due)
      items.push({
        id: `plan-${c.id}`,
        kind: 'plan',
        title: c.title,
        project: c.project,
        domain: c.domain,
        bucket,
        meta: `${c.column === 'doing' ? '进行中' : '待办'} · 截止 ${c.due} · ${PRIORITY_META[c.priority].label}优先级`,
        tone: bucket === 'overdue' ? 'danger' : PRIORITY_META[c.priority].tone,
      })
    }
    return BUCKET_ORDER.map((b) => ({ bucket: b, items: items.filter((i) => i.bucket === b) })).filter((g) => g.items.length > 0)
  }, [jobs, plan])

  const pinnedDocs = docs.filter((d) => d.pinned)
  const pinnedAnnouncements = announcements.filter((a) => a.pinned)

  const primaryAction = (job: Job): { label: string; icon: IconType; action: JobAction } | null => {
    switch (job.status) {
      case 'failed':
        return { label: '重试', icon: RotateCcw, action: 'retry' }
      case 'permission_required':
        return { label: '去授权', icon: Lock, action: 'authorize' }
      case 'waiting_input':
        return { label: '提供输入', icon: MessageSquareMore, action: 'input' }
      case 'paused':
        return { label: '继续', icon: Play, action: 'resume' }
      default:
        return null
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_288px]">
      <div className="flex min-w-0 flex-col gap-6">
        {/* 需要你处理 */}
        <section aria-labelledby="attention-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <SectionHeader title="需要你处理" count={attentionJobs.length + attentionServices.length}>
            <Button variant="ghost" onClick={() => onNavigate('queue')}>
              全部任务
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          </SectionHeader>
          <span id="attention-heading" className="sr-only">
            需要你处理
          </span>
          {attentionJobs.length === 0 && attentionServices.length === 0 ? (
            <EmptyState icon={CircleCheck} title="暂无待处理事项" description="所有任务与服务运行正常。" />
          ) : (
            <ul className="divide-y divide-border/60 border-t border-border/60">
              {attentionJobs.map((job) => {
                const meta = STATUS_META[job.status]
                const act = primaryAction(job)
                const stale = job.heartbeatStale && ATTENTION_RANK[job.status] === undefined
                return (
                  <li key={job.id} className="flex min-h-16 items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-surface-raised">
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', stale ? TONE_BAR.warning : TONE_BAR[meta.tone])} />
                    <button type="button" onClick={() => onSelectJob(job.id)} className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
                      <span className="block truncate text-[13px] font-medium text-foreground">{job.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        <span className={cn('font-medium', stale ? 'text-warning' : TONE_TEXT[meta.tone])}>{stale ? '长时间无响应' : meta.label}</span>
                        {' · '}
                        {job.note ?? job.step}
                      </span>
                    </button>
                    {act && (
                      <Button variant="primary" onClick={() => onJobAction(job.id, act.action)}>
                        <act.icon className="size-3.5" aria-hidden="true" />
                        {act.label}
                      </Button>
                    )}
                    <IconButton label="查看详情" icon={PanelRight} onClick={() => onSelectJob(job.id)} side="left" />
                  </li>
                )
              })}
              {attentionServices.map((s) => {
                const meta = STATUS_META[s.status]
                const ScopeIcon = s.scope === 'local' ? HardDrive : Cloud
                return (
                  <li key={s.id} className="flex min-h-16 items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-surface-raised">
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TONE_BAR[meta.tone])} />
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                        <ScopeIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        {s.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        <span className={cn('font-medium', TONE_TEXT[meta.tone])}>{meta.label}</span>
                        {' · '}
                        {s.detail}
                      </span>
                    </div>
                    {s.actionLabel ? (
                      <Button variant={s.status === 'permission_required' ? 'primary' : 'outline'} onClick={() => onServiceAction(s.id)}>
                        {s.status === 'permission_required' ? <Lock className="size-3.5" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
                        {s.actionLabel}
                      </Button>
                    ) : (
                      <Button variant="ghost" onClick={() => onNavigate('services')}>
                        查看
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 时间线 */}
        <section aria-labelledby="timeline-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <SectionHeader title="时间线">
            <Button variant="ghost" onClick={() => onNavigate('plan')}>
              计划看板
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Button>
          </SectionHeader>
          <span id="timeline-heading" className="sr-only">
            时间线
          </span>
          {timeline.length === 0 ? (
            <EmptyState icon={CalendarDays} title="近期没有安排" description="在计划看板中新建计划，或启动任务后会出现在这里。" />
          ) : (
            <div className="flex flex-col gap-6 border-t border-border/60 px-6 py-6">
              {timeline.map((group) => {
                const bm = BUCKET_META[group.bucket]
                return (
                  <div key={group.bucket} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                    <div className="flex flex-col items-start gap-1 pt-0.5">
                      <span className={cn('text-[13px] font-medium', TONE_TEXT[bm.tone])}>{bm.label}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{group.items.length} 项</span>
                    </div>
                    <ul className="relative flex flex-col gap-2 border-l border-border/60 pl-5">
                      {group.items.map((item) => {
                        const d = DOMAIN_META[item.domain]
                        const DIcon = d.icon
                        const inner = (
                          <>
                            <span aria-hidden="true" className={cn('absolute top-3.5 -left-[25px] size-2 rounded-full ring-4 ring-card', TONE_BAR[item.tone], item.kind === 'job' && 'animate-pulse')} />
                            <span className="flex min-w-0 items-center gap-2">
                              <DIcon className={cn('size-3.5 shrink-0', d.className)} aria-hidden="true" />
                              <span className="truncate text-[13px] font-medium text-foreground">{item.title}</span>
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {item.project} · {item.meta}
                            </span>
                          </>
                        )
                        return (
                          <li key={item.id} className="relative">
                            {item.jobId ? (
                              <button
                                type="button"
                                onClick={() => onSelectJob(item.jobId!)}
                                className={cn('flex w-full flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2 text-left transition-colors duration-150 hover:bg-muted', FOCUS_RING)}
                              >
                                {inner}
                              </button>
                            ) : (
                              <div className="flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-surface-raised">{inner}</div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* 右栏：置顶文件 + 置顶公告 */}
      <div className="flex flex-col gap-6">
        <section aria-labelledby="pinned-docs-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex h-14 items-center justify-between gap-2 pr-3 pl-6">
            <h2 id="pinned-docs-heading" className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <Pin className="size-3.5 text-primary" aria-hidden="true" />
              置顶文件
              <span className="tabular-nums font-normal text-muted-foreground">{pinnedDocs.length}</span>
            </h2>
            <Button variant="ghost" className="h-8 px-2 text-[11px] text-muted-foreground" onClick={() => onNavigate('knowledge')}>
              知识库
              <ArrowRight className="size-3" aria-hidden="true" />
            </Button>
          </div>
          {pinnedDocs.length === 0 ? (
            <EmptyState icon={Pin} title="尚无置顶文件" description="在知识库中点击图钉，把常用文件固定在这里。" />
          ) : (
            <ul className="divide-y divide-border/60 border-t border-border/60">
              {pinnedDocs.map((doc) => {
                const Icon = DOC_KIND_ICON[doc.kind]
                return (
                  <li key={doc.id} className="flex min-h-12 items-center gap-3 py-2 pr-2 pl-6 transition-colors duration-150 hover:bg-surface-raised">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <button type="button" className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
                      <span className="block truncate text-[13px] font-medium text-foreground">{doc.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{doc.project} · {doc.updatedAt}</span>
                    </button>
                    <IconButton label="取消置顶" icon={PinOff} onClick={() => onTogglePinDoc(doc.id)} side="left" className="size-8" />
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="pinned-ann-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex h-14 items-center gap-2 px-6">
            <h2 id="pinned-ann-heading" className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <Megaphone className="size-3.5 text-primary" aria-hidden="true" />
              置顶公告
              <span className="tabular-nums font-normal text-muted-foreground">{pinnedAnnouncements.length}</span>
            </h2>
          </div>
          {pinnedAnnouncements.length === 0 ? (
            <EmptyState icon={Megaphone} title="暂无置顶公告" description="在公告管理中置顶的公告会显示在这里。" />
          ) : (
            <ul className="flex flex-col gap-2 border-t border-border/60 p-4">
              {pinnedAnnouncements.map((a) => (
                <li key={a.id} className={cn('flex gap-2.5 rounded-lg p-3 text-[13px] leading-relaxed text-pretty', TONE_BADGE[ANN_TONE[a.tone]])}>
                  <span aria-hidden="true" className={cn('mt-2 size-1.5 shrink-0 rounded-full', TONE_BAR[ANN_TONE[a.tone]])} />
                  <span>
                    {a.text}
                    <span className="mt-1 block text-[11px] opacity-70">{a.publishedAt}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
