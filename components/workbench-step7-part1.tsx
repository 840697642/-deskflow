'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CircleAlert,
  Cloud,
  ExternalLink,
  FileText,
  FolderKanban,
  HardDrive,
  ListTodo,
  Lock,
  Megaphone,
  MessageSquareMore,
  PanelRight,
  Pause,
  Pin,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import KnowledgeBase from '@/components/knowledge-base'
import AiChatPanel from '@/components/ai-chat-panel'
import SettingsView from '@/components/settings-view'
import LogCenter from '@/components/log-center'
import SkillLibrary from '@/components/skill-library'
import VideoStudio from '@/components/video-studio'
import GameStudio from '@/components/game-studio'
import AppStudio from '@/components/app-studio'
import PlanInbox, { type AcceptPayload } from '@/components/plan-inbox'
import type { InboxItem as CreationInboxItem, StudioCardModel } from '@/components/creation-shared'
import {
  ApiError,
  cancelJob as cancelJobApi,
  pauseJob as pauseJobApi,
  resumeJob as resumeJobApi,
  retryJob as retryJobApi,
  reconnectModule as reconnectModuleApi,
  acceptInboxItem,
  createInboxItem,
  dismissInboxItem,
  saveCardAsError,
  updateTask as updateTaskApi,
} from '@/lib/api-client'
import { TaskStatus as BackendTaskStatus } from '@/lib/types/task'

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

type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

// =============================================================================
// 跑马灯公告条
// =============================================================================

function Ticker({ items, onManage }: { items: Announcement[]; onManage: () => void }) {
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
// 左侧导航栏
// =============================================================================

function NavRail({ active, onSelect, services }: { active: string; onSelect: (id: string) => void; services: Service[] }) {
  const online = services.filter((s) => s.status === 'online').length
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-foreground/[0.04] bg-card/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold tracking-tight text-card">N1</div>
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
              <span key={s.id} className={cn('h-1 flex-1 rounded-full', TONE_BAR[s.status === 'online' ? 'success' : 'danger'])} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

// =============================================================================
// 顶部命令栏
// =============================================================================

function CommandBar({
  current,
  inspectorOpen,
  onToggleInspector,
  chatOpen,
  onToggleChat,
}: {
  current: string
  inspectorOpen: boolean
  onToggleInspector: () => void
  chatOpen: boolean
  onToggleChat: () => void
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-foreground/[0.04] bg-card/75 px-6 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <nav aria-label="面包屑" className="flex items-center gap-1.5 text-[13px]">
          <span className="text-muted-foreground">工作空间</span>
          <span className="text-border" aria-hidden="true">/</span>
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

// PLACEHOLDER: 继续编写...
