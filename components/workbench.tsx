'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Bell,
  FileCode2,
  FileSpreadsheet,
  FileText,
  GitCommitHorizontal,
  HardDrive,
  Megaphone,
  MessageSquareMore,
  PanelRight,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import KnowledgeBase from '@/components/knowledge-base'
import AiChatPanel, { type ChatContext } from '@/components/ai-chat-panel'
import SettingsView from '@/components/settings-view'
import LogCenter from '@/components/log-center'
import SkillLibrary from '@/components/skill-library'
import VideoStudio from '@/components/video-studio'
import GameStudio from '@/components/game-studio'
import AppStudio from '@/components/app-studio'
import PlanInbox, { type AcceptPayload } from '@/components/plan-inbox'
import { ToolTimeShare, UsageBreakdown, UsageSummary, totalFor } from '@/components/usage-overview'
import type { InboxItem as CreationInboxItem, StudioCardModel, ToolConn, ToolId, ToolTimeDay, Usage } from '@/components/creation-shared'
import {
  ApiError,
  cancelJob as cancelJobApi,
  fetchJobs,
  fetchModules,
  fetchTasks,
  fetchWorkbenchSummary,
  pauseJob as pauseJobApi,
  reconnectModule as reconnectModuleApi,
  resumeJob as resumeJobApi,
  retryJob as retryJobApi,
  acceptInboxItem,
  createInboxItem,
  dismissInboxItem,
  fetchInboxItems,
  fetchStudioCards,
  fetchToolConnection,
  fetchToolTimeStats,
  fetchUsageRecords,
  saveCardAsError,
  updateTask as updateTaskApi,
} from '@/lib/api-client'
import {
  adaptJob,
  adaptModule,
  adaptTask,
  adaptWorkbenchSummaryToAnnouncements,
  aggregateProjects,
} from '@/lib/adapters/workbench-adapter'
import { TaskStatus as BackendTaskStatus } from '@/lib/types/task'
import type { ToolConnection } from '@/lib/types/creation-tools'

// 导入所有提取的模块
import type {
  Job,
  Service,
  Project,
  Announcement,
  KnowledgeDoc,
  PlanCard,
  PlanColumn,
  View,
  Filter,
  WorkbenchProps,
  Toast,
  ConfirmState,
  Domain,
  IconType,
} from './workbench/types'

import {
  NAV_VIEW,
  PLAN_COLUMNS,
  FILTERS,
  TONE_BAR,
  TONE_BADGE,
  TONE_TEXT,
  ANN_TONE,
  FOCUS_RING,
  STATUS_META,
  DOMAIN_META,
  PRIORITY_META,
  DOC_KIND_ICON,
  TODAY,
  VIEW_META,
} from './workbench/constants'

import { MOCK_NAV, MOCK_DOCS } from '@/lib/fixtures/workbench-mocks'
import { CHANGELOG } from './workbench/changelog-data'

import {
  Button,
  IconButton,
  StatusBadge,
  EmptyState,
  SectionHeader,
  ProgressBar,
  Skeleton,
  Dialog,
  ConfirmDialog,
  ToastStack,
} from './workbench/components'

import { useWorkbenchData, useToast, useCreationTools } from './workbench/hooks'
import { FocusView, QueueView } from './workbench/views'

// 重新导出供其他组件使用
export {
  Button,
  IconButton,
  StatusBadge,
  EmptyState,
  SectionHeader,
  ProgressBar,
  Skeleton,
  Dialog,
  ConfirmDialog,
  ToastStack,
  TONE_BAR,
  TONE_BADGE,
  TONE_TEXT,
  FOCUS_RING,
}

export type { IconType, Toast, Tone } from './workbench/types'

type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

function Ticker({ items, onManage }: { items: Announcement[]; onManage: () => void }) {
  // 置顶在前；重复一份以实现无缝循环
  const ordered = useMemo(() => [...items.filter((a) => a.pinned), ...items.filter((a) => !a.pinned)], [items])
  const pinnedCount = items.filter((a) => a.pinned).length
  if (ordered.length === 0) return null
  const loop = [...ordered, ...ordered]
  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-foreground/[0.04] bg-card/60 pl-6 pr-3 backdrop-blur-xl">
      <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-primary">
        <Megaphone className="size-3.5" aria-hidden="true" />
        公告
      </span>
      <div className="ticker-mask relative min-w-0 flex-1 overflow-hidden" aria-label="滚动公告">
        <ul className="ticker-track flex w-max items-center gap-10 whitespace-nowrap text-[13px]">
          {loop.map((a, i) => (
            <li key={`${a.id}-${i}`} className="flex items-center gap-2 text-foreground" aria-hidden={i >= ordered.length}>
              {a.pinned && <Pin className="size-3 text-primary" aria-label="置顶" />}
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[ANN_TONE[a.tone]])} />
              {a.text}
            </li>
          ))}
        </ul>
      </div>
      <Button variant="ghost" onClick={onManage} className="h-8 px-2 text-[11px] text-muted-foreground">
        {pinnedCount} 条置顶 · 管理
      </Button>
    </div>
  )
}

// =============================================================================
// 左侧导航栏（224px，磨砂玻璃）
// =============================================================================

function NavRail({ active, onSelect, services }: { active: string; onSelect: (id: string) => void; services: Service[] }) {
  const online = services.filter((s) => s.status === 'online').length
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-foreground/[0.04] bg-card/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold tracking-tight text-card">
          N1
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">NO.1 3mode</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">创作开发工作台</p>
        </div>
      </div>

      <nav aria-label="主导航" className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
        {MOCK_NAV.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">{section.title}</p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive = item.id === active
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150',
                        FOCUS_RING,
                        isActive ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-foreground/[0.04]',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', !isActive && 'text-muted-foreground')} aria-hidden="true" />
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={cn('text-[11px] font-medium tabular-nums', isActive ? 'text-primary' : 'text-muted-foreground')}>{item.badge}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4">
        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <HardDrive className="size-3.5" aria-hidden="true" />
              服务
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {online} / {services.length} 在线
            </span>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {services.map((s) => (
              <span key={s.id} className={cn('h-1 flex-1 rounded-full', TONE_BAR[STATUS_META[s.status].tone])} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// =============================================================================
// 顶部命令栏（64px，磨砂玻璃）
// =============================================================================

function CommandBar({ current, inspectorOpen, onToggleInspector, chatOpen, onToggleChat }: { current: string; inspectorOpen: boolean; onToggleInspector: () => void; chatOpen: boolean; onToggleChat: () => void }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-foreground/[0.04] bg-card/75 px-6 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <nav aria-label="面包屑" className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">工作空间</span>
          <span className="text-border" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-foreground">{current}</span>
        </nav>
        <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
          <RefreshCw className="size-3" aria-hidden="true" />
          上次同步 12 秒前
        </span>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative hidden md:block">
          <span className="sr-only">全局搜索</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder="搜索任务、项目、技能…"
            className={cn(
              'h-10 w-64 rounded-lg border border-transparent bg-muted pr-14 pl-9 text-[13px] text-foreground transition-colors duration-150 placeholder:text-muted-foreground',
              'focus:border-primary focus:bg-card',
              FOCUS_RING,
            )}
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-muted-foreground">Ctrl K</kbd>
        </label>
        <Button variant="primary" size="sm">
          <Plus className="size-4" aria-hidden="true" />
          新建任务
        </Button>
        <div className="mx-2 h-5 w-px bg-border" aria-hidden="true" />
        <IconButton label="通知（2 条未读）" icon={Bell} />
        <IconButton label={chatOpen ? '关闭 AI 对话' : '打开 AI 对话'} icon={MessageSquareMore} active={chatOpen} onClick={onToggleChat} />
        <IconButton label={inspectorOpen ? '关闭检查器' : '打开检查器'} icon={PanelRight} active={inspectorOpen} onClick={onToggleInspector} />
      </div>
    </header>
  )
}

// =============================================================================
// 任务行：状态 / 心跳 / 进度 / 操作
// =============================================================================

type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

function ServiceItem({ service, onAction }: { service: Service; onAction: () => void }) {
  const meta = STATUS_META[service.status]
  const Icon = meta.icon
  const ScopeIcon = service.scope === 'local' ? HardDrive : Cloud
  const needsAttention = service.status === 'offline' || service.status === 'permission_required'
  return (
    <li className="flex min-h-12 flex-col gap-2 px-6 py-4 transition-colors duration-150 hover:bg-surface-raised">
      <div className="flex items-center justify-between gap-4">
        <span className="flex min-w-0 items-center gap-2">
          <ScopeIcon className="size-4 shrink-0 text-muted-foreground" aria-label={service.scope === 'local' ? '本地服务' : '云服务'} />
          <span className="truncate text-[13px] font-medium text-foreground">{service.name}</span>
        </span>
        <span className={cn('flex shrink-0 items-center gap-2 text-[13px]', TONE_TEXT[meta.tone])}>
          <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[meta.tone], meta.spin && 'animate-pulse')} />
          {meta.label}
          <Icon className={cn('size-3.5 opacity-70', meta.spin && 'animate-spin')} aria-hidden="true" />
        </span>
      </div>
      {service.status === 'loading' ? (
        <Skeleton className="h-3 w-40" />
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground text-pretty">{service.detail}</p>
      )}
      {needsAttention && service.actionLabel && (
        <div className="pt-1">
          <Button size="sm" variant={service.status === 'permission_required' ? 'primary' : 'outline'} onClick={onAction}>
            {service.status === 'permission_required' ? (
              <Lock className="size-3.5" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            )}
            {service.actionLabel}
          </Button>
        </div>
      )}
    </li>
  )
}

// =============================================================================
// 右侧检查器（320px 浮层，磨砂玻璃）
// =============================================================================

function Inspector({ job, onClose, onAction }: { job: Job | undefined; onClose: () => void; onAction: (a: JobAction) => void }) {
  return (
    <aside
      aria-label="任务检查器"
      // 1280px 以下作为浮层覆盖在内容之上，避免挤压任务表；xl 及以上并排停靠
      className="absolute inset-y-6 right-6 z-30 flex w-80 shrink-0 flex-col overflow-hidden rounded-[10px] border border-foreground/[0.04] bg-card/90 shadow-lg backdrop-blur-xl xl:static xl:my-6 xl:mr-6 xl:bg-card/75 xl:shadow-md"
    >
      <div className="flex h-14 items-center justify-between pr-3 pl-6">
        <h2 className="text-base font-medium text-foreground">检查器</h2>
        <IconButton label="关闭检查器" icon={X} onClick={onClose} side="left" />
      </div>

      {!job || job.status === 'loading' ? (
        <EmptyState icon={ListTodo} title="未选择任务" description="在任务队列中选择一项任务，可在此查看状态、心跳、步骤和日志。" />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* 摘要区：不透明，保证可读 */}
          <div className="bg-card p-6">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] text-muted-foreground">{job.id}</p>
              <h3 className="text-base font-medium leading-snug text-foreground text-pretty">{job.name}</h3>
              <StatusBadge status={job.status} />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-[11px]">
              <div>
                <dt className="text-muted-foreground">项目</dt>
                <dd className="mt-0.5 font-medium text-foreground">{job.project}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">类型</dt>
                <dd className="mt-0.5 font-medium text-foreground">{DOMAIN_META[job.domain].label}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">开始时间</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-foreground">{job.startedAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">最近响应</dt>
                <dd className={cn('mt-0.5 flex items-center gap-1 font-medium tabular-nums', job.heartbeatStale ? 'text-warning' : 'text-foreground')}>
                  {job.heartbeatStale && <TriangleAlert className="size-3" aria-label="长时间无响应" />}
                  {job.heartbeat}
                </dd>
              </div>
            </dl>

            {(job.progress !== undefined || job.status === 'running') && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{job.step}</span>
                  {job.progress !== undefined && <span className="font-medium tabular-nums text-foreground">{job.progress}%</span>}
                </div>
                <ProgressBar value={job.progress} tone={STATUS_META[job.status].tone} label="任务进度" />
              </div>
            )}

            {job.note && (
              <div className={cn('mt-6 flex gap-2 rounded-lg p-4 text-[13px] leading-relaxed text-pretty', TONE_BADGE[STATUS_META[job.status].tone])}>
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{job.note}</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {job.status === 'running' && (
                <Button onClick={() => onAction('pause')}>
                  <Pause className="size-3.5" aria-hidden="true" />
                  暂停
                </Button>
              )}
              {job.status === 'paused' && (
                <Button variant="primary" onClick={() => onAction('resume')}>
                  <Play className="size-3.5" aria-hidden="true" />
                  继续
                </Button>
              )}
              {job.status === 'failed' && (
                <Button variant="primary" onClick={() => onAction('retry')}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  重试
                </Button>
              )}
              {job.status === 'waiting_input' && (
                <Button variant="primary" onClick={() => onAction('input')}>
                  <MessageSquareMore className="size-3.5" aria-hidden="true" />
                  提供输入
                </Button>
              )}
              {job.status === 'permission_required' && (
                <Button variant="primary" onClick={() => onAction('authorize')}>
                  <Lock className="size-3.5" aria-hidden="true" />
                  去授权
                </Button>
              )}
              {job.status !== 'success' && job.status !== 'failed' && (
                <Button variant="danger" onClick={() => onAction('cancel')}>
                  <X className="size-3.5" aria-hidden="true" />
                  取消
                </Button>
              )}
              <Button variant="ghost" onClick={() => onAction('logs')} disabled={job.logs.length === 0}>
                <FileText className="size-3.5" aria-hidden="true" />
                完整日志
              </Button>
            </div>
          </div>

          {/* 日志尾部 */}
          <div className="border-t border-border/60 px-6 py-6">
            <p className="mb-3 text-[11px] font-medium text-muted-foreground">最近日志</p>
            {job.logs.length === 0 ? (
              <div className="rounded-lg bg-muted">
                <EmptyState icon={ScrollText} title="暂无日志" description="任务尚未开始执行，开始后日志会实时显示在这里。" />
              </div>
            ) : (
              <ol className="rounded-lg bg-muted p-4 font-mono text-[11px] leading-relaxed text-foreground">
                {job.logs.map((line, i) => (
                  <li key={i} className={cn('break-all', line.includes('✕') || line.includes('401') ? 'text-destructive' : undefined)}>
                    {line}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}

// =============================================================================
// 计划看板（卡片式，三列）
// =============================================================================

function PlanBoard({ cards, onMove }: { cards: PlanCard[]; onMove: (id: string, to: PlanColumn) => void }) {
  return (
    <section aria-labelledby="plan-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title="计划看板" count={cards.length}>
        <Button variant="ghost">
          <Plus className="size-3.5" aria-hidden="true" />
          新建计划
        </Button>
      </SectionHeader>
      <span id="plan-heading" className="sr-only">
        计划看板
      </span>
      <div className="grid grid-cols-3 gap-4 px-6 pb-6">
        {PLAN_COLUMNS.map((col, colIdx) => {
          const list = cards.filter((c) => c.column === col.id)
          const next = PLAN_COLUMNS[colIdx + 1]
          return (
            <div key={col.id} className="flex min-h-48 flex-col gap-3 rounded-lg bg-muted/60 p-3">
              <div className="flex items-center justify-between px-1">
                <span className={cn('flex items-center gap-2 text-[13px] font-medium', TONE_TEXT[col.tone])}>
                  <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[col.tone])} />
                  {col.label}
                </span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{list.length}</span>
              </div>
              {list.length === 0 ? (
                <p className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground">暂无卡片</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {list.map((card) => {
                    const d = DOMAIN_META[card.domain]
                    const DIcon = d.icon
                    const pr = PRIORITY_META[card.priority]
                    return (
                      <li key={card.id} className="group flex flex-col gap-2 rounded-lg bg-card p-3 shadow-sm transition-shadow duration-150 hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-[13px] font-medium leading-snug text-foreground text-pretty', col.id === 'done' && 'text-muted-foreground line-through')}>
                            {card.title}
                          </p>
                          <span className={cn('shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium', TONE_BADGE[pr.tone])}>{pr.label}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <DIcon className={cn('size-3.5 shrink-0', d.className)} aria-hidden="true" />
                            <span className="truncate">{card.project}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 tabular-nums">
                            <CalendarDays className="size-3" aria-hidden="true" />
                            {card.due}
                          </span>
                        </div>
                        {next && (
                          <button
                            type="button"
                            onClick={() => onMove(card.id, next.id)}
                            className={cn(
                              'flex h-7 items-center justify-center gap-1 rounded-md text-[11px] font-medium text-primary opacity-0 transition-opacity duration-150 hover:bg-accent group-hover:opacity-100 focus-visible:opacity-100',
                              FOCUS_RING,
                            )}
                          >
                            移到「{next.label}」
                            <ArrowRight className="size-3" aria-hidden="true" />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =============================================================================
// 知识库：置顶文件 + 最近文档
// =============================================================================

function KnowledgePanel({ docs, onTogglePin }: { docs: KnowledgeDoc[]; onTogglePin: (id: string) => void }) {
  const pinned = docs.filter((d) => d.pinned)
  const recent = docs.filter((d) => !d.pinned)

  const renderDoc = (doc: KnowledgeDoc) => {
    const Icon = DOC_KIND_ICON[doc.kind]
    return (
      <li key={doc.id} className="flex min-h-14 items-center gap-3 px-6 py-2.5 transition-colors duration-150 hover:bg-surface-raised">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <button type="button" className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
          <span className="block truncate text-[13px] font-medium text-foreground">{doc.title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {doc.project} · {doc.size} · 更新于 {doc.updatedAt}
          </span>
        </button>
        <IconButton
          label={doc.pinned ? '取消置顶' : '置顶到工作台'}
          icon={doc.pinned ? PinOff : Pin}
          active={doc.pinned}
          onClick={() => onTogglePin(doc.id)}
          side="left"
        />
      </li>
    )
  }

  return (
    <section aria-label="知识库" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title="知识库" count={docs.length}>
        <Button variant="ghost">
          <ExternalLink className="size-3.5" aria-hidden="true" />
          打开知识库
        </Button>
      </SectionHeader>
      <div className="flex items-center gap-1.5 px-6 pb-2 text-[11px] font-medium text-muted-foreground">
        <Pin className="size-3 text-primary" aria-hidden="true" />
        置顶文件 <span className="tabular-nums">{pinned.length}</span>
      </div>
      {pinned.length === 0 ? (
        <EmptyState icon={Pin} title="尚无置顶文件" description="点击文档右侧的图钉，把常用文件固定在工作台顶部。" />
      ) : (
        <ul className="divide-y divide-border/60 border-y border-border/60">{pinned.map(renderDoc)}</ul>
      )}
      <div className="px-6 pt-4 pb-2 text-[11px] font-medium text-muted-foreground">最近更新</div>
      <ul className="divide-y divide-border/60 border-t border-border/60">{recent.map(renderDoc)}</ul>
    </section>
  )
}

// =============================================================================
// 视图切换：左侧导航驱动，每个视图一屏完成，避免纵向堆叠
// =============================================================================

// =============================================================================
// 开发日志：版本树 + 面向后端的契约说明
// 每次前端迭代新增一个节点；contracts / actions 是后端对接时的直接依据
// =============================================================================

type ChangeKind = 'ui' | 'interaction' | 'contract' | 'rename'

const CHANGE_KIND_META: Record<ChangeKind, { label: string; tone: Tone }> = {
  contract: { label: '数据契约', tone: 'primary' },
  interaction: { label: '交互', tone: 'success' },
  ui: { label: '界面', tone: 'muted' },
  rename: { label: '命名变更', tone: 'warning' },
}

interface ContractField {
  name: string
  type: string
  note: string
}

interface ContractAction {
  action: string
  trigger: string
  expect: string
}

interface ChangelogEntry {
  version: string
  date: string
  title: string
  summary: string
  branch: 'main' | 'ui'
  changes: { kind: ChangeKind; text: string }[]
  contracts?: { entity: string; fields: ContractField[] }[]
  actions?: ContractAction[]
  cautions?: string[]
}


function ChangelogView({ onToast }: { onToast: (t: Omit<Toast, 'id'>) => void }) {
  const [devMode, setDevMode] = useState(true)
  const [selected, setSelected] = useState(CHANGELOG[0].version)
  const entry = CHANGELOG.find((e) => e.version === selected) ?? CHANGELOG[0]

  const copyContract = () => {
    const lines: string[] = [`# ${entry.version} ${entry.title}（${entry.date}）`, '', entry.summary, '']
    entry.contracts?.forEach((c) => {
      lines.push(`## ${c.entity}`)
      c.fields.forEach((f) => lines.push(`- ${f.name}: ${f.type}${f.note ? ` — ${f.note}` : ''}`))
      lines.push('')
    })
    entry.actions?.forEach((a) => lines.push(`- ${a.action}\n  触发：${a.trigger}\n  期望：${a.expect}`))
    if (entry.cautions?.length) {
      lines.push('', '## 注意事项')
      entry.cautions.forEach((c) => lines.push(`- ${c}`))
    }
    void navigator.clipboard?.writeText(lines.join('\n'))
    onToast({ tone: 'success', title: '已复制契约说明', description: `${entry.version} · Markdown 格式` })
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[288px_minmax(0,1fr)]">
      <section aria-labelledby="tree-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between gap-2 pr-3 pl-6">
          <h2 id="tree-heading" className="flex items-center gap-2 text-[13px] font-medium text-foreground"><GitCommitHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />版本树<span className="font-normal tabular-nums text-muted-foreground">{CHANGELOG.length}</span></h2>
          <div role="group" aria-label="显示模式" className="flex rounded-md bg-muted p-0.5">
            {(['dev', 'release'] as const).map((m) => {
              const on = (m === 'dev') === devMode
              return <button key={m} type="button" aria-pressed={on} onClick={() => setDevMode(m === 'dev')} className={cn('h-7 rounded px-2 text-[11px] font-medium transition-colors duration-150', FOCUS_RING, on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{m === 'dev' ? '开发' : '发布'}</button>
            })}
          </div>
        </div>
        <ol className="flex flex-col border-t border-border/60 px-6 py-4" aria-label="版本列表">
          {CHANGELOG.map((e, i) => {
            const active = e.version === selected
            const isLast = i === CHANGELOG.length - 1
            const onSide = e.branch === 'ui'
            const contractCount = e.changes.filter((c) => c.kind === 'contract').length
            return <li key={e.version} className="relative">
              {!isLast && <span aria-hidden="true" className="absolute top-5 bottom-0 left-[7px] w-px bg-border" />}
              {onSide && <span aria-hidden="true" className="absolute top-0 bottom-0 left-[7px] w-4 rounded-r-lg border-y border-r border-dashed border-technical/50" />}
              <button type="button" aria-current={active ? 'true' : undefined} onClick={() => setSelected(e.version)} className={cn('relative flex w-full items-start gap-4 rounded-md py-2 pr-2 text-left transition-colors duration-150 hover:bg-surface-raised', FOCUS_RING, active && 'bg-accent/60 hover:bg-accent/60')}>
                <span aria-hidden="true" className={cn('mt-1.5 size-[15px] shrink-0 rounded-full border-2 bg-card', onSide ? 'ml-4 border-technical' : 'border-primary', active && (onSide ? 'bg-technical' : 'bg-primary'))} />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="font-mono text-[13px] font-medium text-foreground">{e.version}</span><span className="text-[11px] tabular-nums text-muted-foreground">{e.date}</span>{devMode && contractCount > 0 && <span className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium bg-primary/8 text-primary">契约 {contractCount}</span>}</span><span className="block truncate text-[13px] text-foreground">{e.title}</span></span>
              </button>
            </li>
          })}
        </ol>
        <div className="flex items-center gap-4 border-t border-border/60 px-6 py-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-primary" />主干</span><span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2 rounded-full bg-technical" />纯样式分支</span></div>
      </section>

      <section aria-labelledby="entry-heading" className="flex flex-col overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex items-start justify-between gap-4 p-6"><div className="min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-[13px] font-medium text-primary">{entry.version}</span><span className="text-[11px] text-muted-foreground">{entry.date}</span>{entry.branch === 'ui' && <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-technical/10 text-technical">纯样式</span>}</div><h2 id="entry-heading" className="mt-1 text-base font-medium leading-snug text-foreground">{entry.title}</h2><p className="mt-1 text-[13px] leading-relaxed text-muted-foreground text-pretty">{entry.summary}</p></div>{devMode && (entry.contracts || entry.actions) && <Button onClick={copyContract}><FileCode2 className="size-3.5" aria-hidden="true" />复制契约</Button>}</div>
        <div className="border-t border-border/60 px-6 py-5"><p className="mb-3 text-[11px] font-medium text-muted-foreground">改动</p><ul className="flex flex-col gap-2">{entry.changes.filter((c) => devMode || c.kind !== 'contract').map((c, i) => { const km = CHANGE_KIND_META[c.kind]; return <li key={i} className="flex items-start gap-3 text-[13px] leading-relaxed"><span className={cn('mt-0.5 w-16 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-medium', TONE_BADGE[km.tone])}>{km.label}</span><span className="text-foreground text-pretty">{c.text}</span></li> })}</ul></div>
        {devMode && entry.contracts && <div className="border-t border-border/60 px-6 py-5"><p className="mb-3 text-[11px] font-medium text-muted-foreground">数据契约（前端期望的字段）</p><div className="flex flex-col gap-4">{entry.contracts.map((c) => <div key={c.entity} className="overflow-hidden rounded-lg bg-muted/60"><div className="flex items-center gap-2 px-4 py-2 font-mono text-[13px] font-medium text-foreground"><span className="text-technical">interface</span> {c.entity}</div><table className="w-full text-[13px]"><thead className="sr-only"><tr><th>字段</th><th>类型</th><th>说明</th></tr></thead><tbody className="divide-y divide-border/60 border-t border-border/60">{c.fields.map((f) => <tr key={f.name} className="align-top"><td className="w-36 px-4 py-2 font-mono text-foreground">{f.name}</td><td className="w-56 px-2 py-2 font-mono text-[11px] leading-relaxed text-technical">{f.type}</td><td className="px-4 py-2 text-[11px] leading-relaxed text-muted-foreground text-pretty">{f.note || '—'}</td></tr>)}</tbody></table></div>)}</div></div>}
        {devMode && entry.actions && <div className="border-t border-border/60 px-6 py-5"><p className="mb-3 text-[11px] font-medium text-muted-foreground">动作接口（前端触发 → 后端期望）</p><ul className="flex flex-col gap-2">{entry.actions.map((a) => <li key={a.action} className="rounded-lg bg-muted/60 p-4"><code className="block font-mono text-[13px] font-medium text-foreground">{a.action}</code><dl className="mt-2 grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[11px] leading-relaxed"><dt className="text-muted-foreground">触发</dt><dd className="text-foreground">{a.trigger}</dd><dt className="text-muted-foreground">期望</dt><dd className="text-foreground text-pretty">{a.expect}</dd></dl></li>)}</ul></div>}
        {devMode && entry.cautions && entry.cautions.length > 0 && <div className="border-t border-border/60 px-6 py-5"><p className="mb-3 text-[11px] font-medium text-muted-foreground">注意事项</p><ul className="flex flex-col gap-2">{entry.cautions.map((c, i) => <li key={i} className={cn('flex gap-2.5 rounded-lg p-3 text-[13px] leading-relaxed text-pretty', TONE_BADGE.warning)}><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{c}</li>)}</ul></div>}
        {!devMode && <div className="border-t border-border/60 px-6 py-4 text-[11px] text-muted-foreground">发布模式仅展示用户可感知的改动；切换到「开发」查看数据契约与接口。</div>}
      </section>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 今日焦点：需要处理的事项 + 按时间段排列的时间线
// -----------------------------------------------------------------------------

export default function Workbench({ onDataLoaded }: WorkbenchProps = {}) {
  const [activeNav, setActiveNav] = useState('workbench')
  const view: View = NAV_VIEW[activeNav] ?? 'focus'
  const navigate = (v: View) => setActiveNav(Object.keys(NAV_VIEW).find((k) => NAV_VIEW[k] === v) ?? 'workbench')

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<KnowledgeDoc[]>(MOCK_DOCS)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(true)

  // 使用提取的 hooks
  const { toasts, pushToast, dismissToast } = useToast()
  const {
    jobs,
    services,
    projects,
    plan,
    announcements,
    loading,
    error,
    refetch: loadData,
    setJobs,
    setServices,
    setPlan,
    setAnnouncements,
  } = useWorkbenchData({ onDataLoaded })

  const {
    connections: creationConnections,
    studioCards,
    inbox,
    usage,
    toolTime,
    setInbox,
    setStudioCards,
  } = useCreationTools(view)

  const closeConfirm = useCallback(() => setConfirm(null), [])
  const closeAnnounce = useCallback(() => setAnnounceOpen(false), [])
  const closeNotice = useCallback(() => setNoticeOpen(false), [])

  const togglePinAnnouncement = (id: string) => {
    const target = announcements.find((a) => a.id === id)
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)))
    if (target) pushToast({ tone: 'success', title: target.pinned ? '已取消置顶公告' : '公告已置顶', description: '跑马灯将优先滚动置顶公告。' })
  }

  const togglePinDoc = (id: string) => {
    const target = docs.find((d) => d.id === id)
    setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, pinned: !d.pinned } : d)))
    if (target) pushToast({ tone: 'success', title: target.pinned ? '已取消置顶' : '已置顶到工作台', description: target.title })
  }

  const movePlan = async (id: string, to: PlanColumn) => {
    const target = plan.find((c) => c.id === id)
    if (!target) return
    const statusByColumn: Record<PlanColumn, BackendTaskStatus> = {
      todo: BackendTaskStatus.TODO,
      doing: BackendTaskStatus.BLOCKED,
      done: BackendTaskStatus.DONE,
    }
    try {
      await updateTaskApi(id, { status: statusByColumn[to] })
      pushToast({ tone: 'info', title: `已移到「${PLAN_COLUMNS.find((c) => c.id === to)?.label}」`, description: target.title })
      await loadData()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '更新计划失败'
      setError(message)
      pushToast({ tone: 'danger', title: '更新计划失败', description: message })
    }
  }

  const pendingInbox = inbox.filter((item) => item.status === 'pending')
  const todayIso = new Date().toISOString().slice(0, 10)
  const creationDomain = (tool: ToolId): Domain => tool === 'video' ? 'video' : tool === 'game' ? 'game' : 'app'
  const acceptInbox = async (id: string, payload: AcceptPayload) => {
    try {
      const card = await acceptInboxItem(id, payload)
      const source = inbox.find((item) => item.id === id)
      if (source) {
        setInbox((items) => items.map((item) => item.id === id ? { ...item, status: 'accepted' } : item))
        setPlan((cards) => [...cards, { id: card.id, title: card.title, project: card.project, domain: creationDomain(source.toolId), due: payload.due ?? '待定', priority: payload.priority, column: payload.column }])
      }
      pushToast({ tone: 'success', title: '已采纳到计划看板', description: source?.title })
    } catch (err) { pushToast({ tone: 'danger', title: '采纳失败', description: err instanceof ApiError ? err.message : '请稍后重试' }) }
  }
  const dismissInbox = async (id: string) => {
    try { await dismissInboxItem(id); setInbox((items) => items.map((item) => item.id === id ? { ...item, status: 'dismissed' } : item)); pushToast({ tone: 'info', title: '已忽略收件箱条目' }) }
    catch (err) { pushToast({ tone: 'danger', title: '忽略失败', description: err instanceof ApiError ? err.message : '请稍后重试' }) }
  }
  const addCreationCardToPlan = async (card: StudioCardModel) => {
    try { const item = await createInboxItem({ toolId: card.toolId, type: card.errorable ? 'issue' : 'task', title: card.title, note: card.subtitle, refUrl: card.deepLink }); setInbox((items) => [item as CreationInboxItem, ...items]); pushToast({ tone: 'success', title: '已加入计划收件箱', description: card.title }) }
    catch (err) { pushToast({ tone: 'danger', title: '加入计划失败', description: err instanceof ApiError ? err.message : '请稍后重试' }) }
  }
  const saveCreationCardAsError = async (card: StudioCardModel) => {
    try { await saveCardAsError({ toolId: card.toolId, title: card.title, refUrl: card.deepLink, cardId: card.id }); pushToast({ tone: 'success', title: '已保存为错题', description: card.title }) }
    catch (err) { pushToast({ tone: 'danger', title: '保存错题失败', description: err instanceof ApiError ? err.message : '请稍后重试' }) }
  }

  const realJobs = useMemo(() => jobs.filter((j) => j.status !== 'loading'), [jobs])

  const filteredJobs = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      if (j.status === 'loading') return filter === 'all' && q === ''
      if (!f.match(j.status)) return false
      if (q && !`${j.name} ${j.project}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [jobs, filter, query])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: realJobs.length, running: 0, waiting_input: 0, failed: 0, success: 0 }
    for (const j of realJobs) {
      for (const f of FILTERS) if (f.id !== 'all' && f.match(j.status)) c[f.id]++
    }
    return c
  }, [realJobs])

  const selectedJob = jobs.find((j) => j.id === selectedId)

  const applyAction = async (id: string, action: JobAction): Promise<void> => {
    try {
      if (action === 'pause') await pauseJobApi(id)
      else if (action === 'resume') await resumeJobApi(id)
      else if (action === 'retry') await retryJobApi(id)
      else if (action === 'cancel') await cancelJobApi(id)
      else return
      const labels: Partial<Record<JobAction, { tone: Toast['tone']; title: string }>> = {
        pause: { tone: 'info', title: '任务已暂停' },
        resume: { tone: 'success', title: '任务已继续' },
        retry: { tone: 'success', title: '已重新排队执行' },
        cancel: { tone: 'warning', title: '任务已取消' },
      }
      const feedback = labels[action]
      if (feedback) pushToast({ ...feedback, description: jobs.find((item) => item.id === id)?.name })
      await loadData()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '作业操作失败'
      setError(message)
      pushToast({ tone: 'danger', title: '操作失败', description: message })
    }
  }

  const handleAction = (id: string, action: JobAction) => {
    const job = jobs.find((j) => j.id === id)
    if (!job) return
    switch (action) {
      case 'cancel':
        // 危险操作：二次确认
        setConfirm({
          title: '取消这个任务？',
          description: `「${job.name}」将立即停止，已完成的部分不会保留。此操作无法撤销。`,
          confirmLabel: '确认取消',
          onConfirm: () => {
            void applyAction(id, 'cancel')
          },
        })
        return
      case 'logs':
        setSelectedId(id)
        setInspectorOpen(true)
        return
      case 'open':
        pushToast({ tone: 'info', title: '正在打开结果', description: job.step })
        return
      case 'pause':
        void applyAction(id, action)
        return
      case 'resume':
        void applyAction(id, action)
        return
      case 'retry':
        void applyAction(id, action)
        return
      case 'authorize':
        pushToast({ tone: 'warning', title: '授权功能暂未接入', description: job.name })
        return
      case 'input':
        pushToast({ tone: 'warning', title: '输入功能暂未接入', description: job.name })
        return
    }
  }

  const attentionCount = counts.waiting_input + counts.failed
  const attentionServices = services.filter((s) => s.status === 'offline' || s.status === 'permission_required' || s.status === 'degraded')

  const handleServiceAction = async (id: string): Promise<void> => {
    const service = services.find((item) => item.id === id)
    if (!service?.actionLabel) return
    if (service.actionLabel !== '重新连接') {
      pushToast({ tone: 'warning', title: '授权功能暂未接入', description: service.name })
      return
    }
    try {
      await reconnectModuleApi(id)
      pushToast({ tone: 'success', title: `${service.name} 正在重新连接` })
      await loadData()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '重新连接失败'
      setError(message)
      pushToast({ tone: 'danger', title: '重新连接失败', description: message })
    }
  }

  if (loading && jobs.length === 0) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">加载工作台...</div>
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>{error}</p>
        <Button variant="outline" onClick={() => void loadData()}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-dvh min-h-[640px] w-full min-w-[1024px] overflow-hidden bg-background text-foreground">
      <NavRail active={activeNav} onSelect={setActiveNav} services={services} />

      <div className="flex min-w-0 flex-1 flex-col">
        <CommandBar current={VIEW_META[view].title} inspectorOpen={inspectorOpen} onToggleInspector={() => { setInspectorOpen((v) => !v); setChatOpen(false) }} chatOpen={chatOpen} onToggleChat={() => { setChatOpen((v) => !v); setInspectorOpen(false) }} />
        <Ticker items={announcements} onManage={() => setAnnounceOpen(true)} />

        <div className="relative flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 p-6">
              {/* 页头：随视图变化 */}
              <div className="flex items-end justify-between gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{VIEW_META[view].title}</h1>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {view === 'focus' ? (
                      <>
                        {TODAY.month} 月 {TODAY.day} 日 {TODAY.weekday} ·{' '}
                        {attentionCount > 0 ? (
                          <>
                            <span className="font-medium text-foreground">{attentionCount} 项任务</span> 需要你处理
                            {attentionServices.length > 0 && (
                              <>
                                ，<span className="font-medium text-foreground">{attentionServices.length} 个服务</span> 状态异常
                              </>
                            )}
                            。
                          </>
                        ) : (
                          '所有任务正常运行。'
                        )}
                      </>
                    ) : (
                      VIEW_META[view].description
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {view === 'plan' ? (
                    <Button variant="primary" size="md">
                      <Plus className="size-4" aria-hidden="true" />
                      新建计划
                    </Button>
                  ) : view === 'knowledge' ? (
                    <Button size="md">
                      <ExternalLink className="size-4" aria-hidden="true" />
                      打开知识库
                    </Button>
                  ) : view === 'services' ? (
                    <Button size="md">
                      <RefreshCw className="size-4" aria-hidden="true" />
                      刷新状态
                    </Button>
                  ) : view === 'changelog' ? (
                    <Button variant="primary" size="md" onClick={() => pushToast({ tone: 'info', title: '新建版本节点', description: '接入后端后在此录入本次迭代的改动与契约。' })}>
                      <Plus className="size-4" aria-hidden="true" />
                      新建版本
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="md">
                        <FolderKanban className="size-4" aria-hidden="true" />
                        导入项目
                      </Button>
                      <Button size="md">
                        <ScrollText className="size-4" aria-hidden="true" />
                        查看全部日志
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {view === 'focus' && (
                <>
                  <FocusView
                    jobs={jobs}
                    plan={plan}
                    docs={docs}
                    announcements={announcements}
                    services={services}
                    onJobAction={handleAction}
                    onServiceAction={(id) => void handleServiceAction(id)}
                    onSelectJob={(id) => {
                      setSelectedId(id)
                      setInspectorOpen(true)
                    }}
                    onNavigate={navigate}
                    onTogglePinDoc={togglePinDoc}
                  />
                  <div className="grid gap-6 lg:grid-cols-2">
                    <UsageSummary usage={usage} today={todayIso} budgets={{ video: 1200, game: 300, app: 400 }} onNavigate={(tool) => navigate(tool)} />
                    <ToolTimeShare days={toolTime} />
                  </div>
                </>
              )}

              {view === 'plan' && <><PlanInbox items={inbox} onAccept={acceptInbox} onDismiss={(id) => void dismissInbox(id)} /><PlanBoard cards={plan} onMove={movePlan} /></>}

              {view === 'video' && <><VideoStudio cards={studioCards.filter((card) => card.toolId === 'video')} conn={creationConnections.video} todayCost={totalFor(usage, todayIso, 'today', 'video').cost} todayTokens={totalFor(usage, todayIso, 'today', 'video').tokens} onToast={pushToast} onAddToPlan={(card) => void addCreationCardToPlan(card)} onSaveError={(card) => void saveCreationCardAsError(card)} /><UsageBreakdown usage={usage} today={todayIso} toolId="video" budget={1200} /></>}
              {view === 'game' && <><GameStudio cards={studioCards.filter((card) => card.toolId === 'game')} conn={creationConnections.game} todayCost={totalFor(usage, todayIso, 'today', 'game').cost} todayTokens={totalFor(usage, todayIso, 'today', 'game').tokens} onToast={pushToast} onAddToPlan={(card) => void addCreationCardToPlan(card)} onSaveError={(card) => void saveCreationCardAsError(card)} /><UsageBreakdown usage={usage} today={todayIso} toolId="game" budget={300} /></>}
              {view === 'app' && <><AppStudio cards={studioCards.filter((card) => card.toolId === 'app')} conn={creationConnections.app} todayCost={totalFor(usage, todayIso, 'today', 'app').cost} todayTokens={totalFor(usage, todayIso, 'today', 'app').tokens} onToast={pushToast} onAddToPlan={(card) => void addCreationCardToPlan(card)} onSaveError={(card) => void saveCreationCardAsError(card)} /><UsageBreakdown usage={usage} today={todayIso} toolId="app" budget={400} /></>}

              {view === 'changelog' && <ChangelogView onToast={pushToast} />}

              {view === 'knowledge' && <KnowledgeBase onToast={pushToast} />}

              {view === 'skills' && <SkillLibrary onToast={pushToast} />}
              {view === 'logs' && <LogCenter onToast={pushToast} onExplainWithAi={() => setChatOpen(true)} onOpenJob={(id) => { setSelectedId(id); setInspectorOpen(true); setChatOpen(false) }} />}
              {view === 'settings' && <SettingsView onToast={pushToast} />}

              {view === 'services' && (
                <section aria-label="服务状态" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <ul className="grid grid-cols-1 divide-y divide-border/60 md:grid-cols-2 md:divide-y-0 md:[&>li:nth-child(n+3)]:border-t md:[&>li:nth-child(odd)]:border-r md:[&>li]:border-border/60">
                    {services.map((s) => (
                      <ServiceItem key={s.id} service={s} onAction={() => void handleServiceAction(s.id)} />
                    ))}
                  </ul>
                </section>
              )}

              {view === 'projects' && (
                <section aria-label="项目" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <ul className="divide-y divide-border/60">
                    {projects.map((p) => {
                      const d = DOMAIN_META[p.domain]
                      const Icon = d.icon
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={cn(
                              'flex min-h-16 w-full items-center gap-4 px-6 py-3 text-left transition-colors duration-150 hover:bg-surface-raised',
                              'focus-visible:relative focus-visible:z-10',
                              FOCUS_RING,
                            )}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                              <Icon className={cn('size-4', d.className)} aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-foreground">{p.name}</span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {d.label} · 更新于 {p.updatedAt}
                              </span>
                            </span>
                            {p.activeJobs > 0 && (
                              <span className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-primary">
                                <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-primary" />
                                {p.activeJobs} 运行中
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              )}

              {view === 'queue' && (
                <section aria-labelledby="jobs-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
                  <SectionHeader title="任务队列" count={realJobs.length}>
                    <label className="relative">
                      <span className="sr-only">筛选任务</span>
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
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
                          onClick={() => setFilter(f.id)}
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
                          后台任务运行时会定期向工作台报告“我还在运行”。这里显示最后一次报告的时间；如果超过预期仍无报告，会标为“无响应”，说明任务可能卡住或掉线。
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
                            setFilter('all')
                            setQuery('')
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
                          onSelect={() => {
                            setSelectedId(job.id)
                            setInspectorOpen(true)
                          }}
                          onAction={(a) => handleAction(job.id, a)}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>
          </main>

          {inspectorOpen && (
            <Inspector job={selectedJob} onClose={() => setInspectorOpen(false)} onAction={(a) => selectedJob && handleAction(selectedJob.id, a)} />
          )}
          {chatOpen && <AiChatPanel onClose={() => setChatOpen(false)} onToast={pushToast} viewHint={view} autoContexts={selectedId ? [{ kind: 'job', id: selectedId, label: '当前任务' }] : []} />}
        </div>
      </div>

      {/* 危险操作二次确认 */}
      <ConfirmDialog state={confirm} onClose={closeConfirm} />

      {/* 重要公告弹窗：进入工作台时展示置顶公告 */}
      <Dialog
        open={noticeOpen}
        onClose={closeNotice}
        icon={Megaphone}
        tone="warning"
        title="重要公告"
        description="以下是当前置顶的公告，请在开始工作前确认。"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => { closeNotice(); setAnnounceOpen(true) }}>
              管理公告
            </Button>
            <Button variant="primary" size="md" onClick={closeNotice}>
              我知道了
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-2">
          {announcements.filter((a) => a.pinned).map((a) => (
            <li key={a.id} className={cn('flex gap-3 rounded-lg p-4 text-[13px] leading-relaxed text-pretty', TONE_BADGE[ANN_TONE[a.tone]])}>
              <Pin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {a.text}
                <span className="mt-1 block text-[11px] opacity-70">{a.publishedAt}</span>
              </span>
            </li>
          ))}
        </ul>
      </Dialog>

      {/* 公告管理：置顶 / 取消置顶 */}
      <Dialog open={announceOpen} onClose={closeAnnounce} icon={Megaphone} title="公告管理" description="置顶的公告会优先出现在跑马灯中，并在进入工作台时弹出提醒。" width="lg" footer={<Button variant="primary" size="md" onClick={closeAnnounce}>完成</Button>}>
        <ul className="divide-y divide-border/60 rounded-lg bg-muted/60">
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start gap-3 p-4">
              <span aria-hidden="true" className={cn('mt-2 size-2 shrink-0 rounded-full', TONE_BAR[ANN_TONE[a.tone]])} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-relaxed text-foreground text-pretty">{a.text}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.publishedAt}</p>
              </div>
              <Button variant={a.pinned ? 'outline' : 'ghost'} onClick={() => togglePinAnnouncement(a.id)}>
                {a.pinned ? <PinOff className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
                {a.pinned ? '取消置顶' : '置顶'}
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
