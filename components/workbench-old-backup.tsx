'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  AppWindow,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clapperboard,
  Cloud,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  Gamepad2,
  GitCommitHorizontal,
  HardDrive,
  History,
  Hourglass,
  Info,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  Loader2,
  Lock,
  Megaphone,
  MessageSquareMore,
  Pause,
  PanelRight,
  Pin,
  PinOff,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  TriangleAlert,
  WifiOff,
  X,
  type LucideProps,
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

// =============================================================================
// 类型定义（占位类型，后续可直接替换为真实 API 响应类型）
// =============================================================================

export type IconType = ComponentType<LucideProps>

export type JobStatus =
  | 'running'
  | 'queued'
  | 'paused'
  | 'waiting_input'
  | 'failed'
  | 'permission_required'
  | 'success'
  | 'loading'

export type ServiceStatus = 'online' | 'offline' | 'degraded' | 'permission_required' | 'loading'

export type Domain = 'video' | 'game' | 'app' | 'chat' | 'knowledge' | 'skill'

export interface Job {
  id: string
  name: string
  project: string
  domain: Domain
  status: JobStatus
  step: string
  progress?: number // 0-100，可选
  heartbeat: string // 相对时间文案，占位
  heartbeatStale?: boolean // 心跳超时
  startedAt: string
  eta?: string // 预计完成时间（占位）
  note?: string // 状态说明 / 下一步动作
  logs: string[]
}

export interface Service {
  id: string
  name: string
  scope: 'local' | 'cloud'
  status: ServiceStatus
  detail: string
  actionLabel?: string
}

export interface Project {
  id: string
  name: string
  domain: Domain
  updatedAt: string
  activeJobs: number
}

/** 跑马灯公告 */
export interface Announcement {
  id: string
  text: string
  tone: 'info' | 'warning' | 'success'
  pinned: boolean
  publishedAt: string
}

/** 知识库文档 */
export interface KnowledgeDoc {
  id: string
  title: string
  kind: 'doc' | 'code' | 'sheet'
  project: string
  updatedAt: string
  size: string
  pinned: boolean
}

/** 计划看板卡片 */
export type PlanColumn = 'todo' | 'doing' | 'done'
export interface PlanCard {
  id: string
  title: string
  project: string
  domain: Domain
  due: string
  priority: 'high' | 'medium' | 'low'
  column: PlanColumn
}

export interface WorkbenchProps {
  onDataLoaded?: (counts: { tasks: number; jobs: number; modules: number }) => void
}

/** 轻提示 */
export interface Toast {
  id: number
  title: string
  description?: string
  tone: 'success' | 'info' | 'warning' | 'danger'
}

interface NavItem {
  id: string
  label: string
  icon: IconType
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

// =============================================================================
// Mock 数据（集中放置，便于后续抽离替换）
// =============================================================================

const MOCK_NAV: NavSection[] = [
  {
    title: '工作空间',
    items: [
      { id: 'workbench', label: '今日焦点', icon: LayoutDashboard },
      { id: 'queue', label: '任务队列', icon: ListTodo, badge: 4 },
      { id: 'plan', label: '计划看板', icon: KanbanSquare },
      { id: 'projects', label: '项目', icon: FolderKanban },
      { id: 'services', label: '服务', icon: HardDrive },
    ],
  },
  {
    title: '创作工具',
    items: [
      { id: 'video', label: 'AI 视频', icon: Clapperboard },
      { id: 'game', label: '鸿蒙游戏', icon: Gamepad2 },
      { id: 'app', label: '应用开发', icon: AppWindow },
      { id: 'knowledge', label: '知识库', icon: BookOpen },
      { id: 'skills', label: '技能', icon: Sparkles },
    ],
  },
  {
    title: '系统',
    items: [
      { id: 'logs', label: '日志', icon: ScrollText },
      { id: 'settings', label: '设置', icon: Settings },
      { id: 'changelog', label: '开发日志', icon: History },
    ],
  },
]

const MOCK_JOBS: Job[] = [
  {
    id: 'job-1042',
    name: '《山海拾遗》第 3 集分镜渲染',
    project: '山海拾遗',
    domain: 'video',
    status: 'running',
    step: '渲染镜头 14 / 22',
    progress: 63,
    heartbeat: '8 秒前',
    startedAt: '10:42',
    eta: '11:40',
    logs: [
      '[10:42:03] 任务开始，加载分镜脚本 v7',
      '[10:44:18] 镜头 01-08 渲染完成',
      '[10:51:02] 镜头 09-13 渲染完成',
      '[10:57:40] 正在渲染镜头 14，采样步数 30/50',
    ],
  },
  {
    id: 'job-1041',
    name: '鸿蒙 ArkTS 编译 · 关卡编辑器',
    project: '星尘塔防',
    domain: 'game',
    status: 'waiting_input',
    step: '等待选择签名证书',
    heartbeat: '2 分钟前',
    startedAt: '10:31',
    note: '需要选择用于 HAP 包签名的证书后才能继续。',
    logs: ['[10:31:10] hvigor 构建开始', '[10:36:55] 构建完成，等待签名证书'],
  },
  {
    id: 'job-1040',
    name: '知识库向量化 · 鸿蒙 API 文档',
    project: '共享知识库',
    domain: 'knowledge',
    status: 'paused',
    step: '已处理 1,280 / 3,400 个片段',
    progress: 38,
    heartbeat: '14 分钟前',
    heartbeatStale: true,
    startedAt: '09:58',
    note: '由用户手动暂停。',
    logs: ['[09:58:00] 开始切分文档', '[10:12:31] 已写入 1,280 个向量', '[10:12:35] 用户暂停任务'],
  },
  {
    id: 'job-1039',
    name: '云端配音合成 · 第 2 集旁白',
    project: '山海拾遗',
    domain: 'video',
    status: 'permission_required',
    step: '等待授权云 TTS 服务',
    heartbeat: '—',
    startedAt: '10:20',
    note: '云 TTS 访问令牌已过期，请重新授权后任务将自动继续。',
    logs: ['[10:20:12] 提交合成请求', '[10:20:13] 401：访问令牌已过期'],
  },
  {
    id: 'job-1038',
    name: '记账应用 · 单元测试',
    project: '轻记账',
    domain: 'app',
    status: 'failed',
    step: '3 个测试失败',
    progress: 100,
    heartbeat: '26 分钟前',
    startedAt: '09:40',
    note: 'LedgerService.spec.ts 断言失败，查看日志了解详情。',
    logs: ['[09:40:02] 运行 128 个测试用例', '[09:46:10] ✕ LedgerService › 应正确汇总月度支出', '[09:46:11] 测试结束：125 通过，3 失败'],
  },
  {
    id: 'job-1037',
    name: '技能「分镜脚本生成」评估',
    project: '技能库',
    domain: 'skill',
    status: 'queued',
    step: '排队中 · 第 2 位',
    heartbeat: '—',
    startedAt: '—',
    logs: [],
  },
  {
    id: 'job-1036',
    name: '资产导出 · 角色贴图打包',
    project: '星尘塔防',
    domain: 'game',
    status: 'success',
    step: '已导出 42 个文件',
    progress: 100,
    heartbeat: '1 小时前',
    startedAt: '08:55',
    logs: ['[08:55:00] 开始打包', '[09:02:14] 导出完成，共 42 个文件 (186 MB)'],
  },
  {
    id: 'job-loading',
    name: '',
    project: '',
    domain: 'chat',
    status: 'loading',
    step: '',
    heartbeat: '',
    startedAt: '',
    logs: [],
  },
]

const MOCK_SERVICES: Service[] = [
  { id: 'svc-1', name: '本地渲染引擎', scope: 'local', status: 'online', detail: 'GPU 使用率 72% · 显存 9.4 / 12 GB' },
  {
    id: 'svc-2',
    name: 'DevEco 构建服务',
    scope: 'local',
    status: 'offline',
    detail: '未检测到进程。请启动 DevEco Studio 后重连。',
    actionLabel: '重新连接',
  },
  { id: 'svc-3', name: '本地模型 (Ollama)', scope: 'local', status: 'degraded', detail: '响应延迟 4.8s，高于 2s 阈值' },
  {
    id: 'svc-4',
    name: '云端 TTS',
    scope: 'cloud',
    status: 'permission_required',
    detail: '访问令牌已过期，需要重新授权。',
    actionLabel: '重新授权',
  },
  { id: 'svc-5', name: '云端对话模型', scope: 'cloud', status: 'online', detail: '今日已用 38,200 tokens' },
  { id: 'svc-6', name: '对象存储同步', scope: 'cloud', status: 'loading', detail: '正在检查连接…' },
]

const MOCK_PROJECTS: Project[] = [
  { id: 'p-1', name: '山海拾遗', domain: 'video', updatedAt: '刚刚', activeJobs: 2 },
  { id: 'p-2', name: '星尘塔防', domain: 'game', updatedAt: '5 分钟前', activeJobs: 1 },
  { id: 'p-3', name: '轻记账', domain: 'app', updatedAt: '26 分钟前', activeJobs: 0 },
  { id: 'p-4', name: '共享知识库', domain: 'knowledge', updatedAt: '14 分钟前', activeJobs: 1 },
]

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a-1', text: '本周六 02:00–04:00 云端渲染集群例行维护，期间云渲染任务将自动排队。', tone: 'warning', pinned: true, publishedAt: '今天 09:00' },
  { id: 'a-2', text: '鸿蒙 NEXT API 12 文档已同步至知识库，向量化完成后即可检索。', tone: 'info', pinned: true, publishedAt: '昨天 18:30' },
  { id: 'a-3', text: '新技能「分镜脚本生成 v2」已上线，支持多角色对白。', tone: 'success', pinned: false, publishedAt: '昨天 14:00' },
  { id: 'a-4', text: '本地模型 Ollama 建议升级到 0.6.x 以修复长上下文延迟问题。', tone: 'info', pinned: false, publishedAt: '3 天前' },
]

const MOCK_DOCS: KnowledgeDoc[] = [
  { id: 'd-1', title: '鸿蒙 ArkTS 编码规范 v3', kind: 'doc', project: '共享知识库', updatedAt: '2 小时前', size: '48 KB', pinned: true },
  { id: 'd-2', title: '《山海拾遗》世界观设定集', kind: 'doc', project: '山海拾遗', updatedAt: '昨天', size: '1.2 MB', pinned: true },
  { id: 'd-3', title: 'HAP 签名与发布流程', kind: 'doc', project: '星尘塔防', updatedAt: '3 天前', size: '22 KB', pinned: true },
  { id: 'd-4', title: 'LedgerService 测试用例矩阵', kind: 'sheet', project: '轻记账', updatedAt: '26 分钟前', size: '96 KB', pinned: false },
  { id: 'd-5', title: '分镜提示词模板库', kind: 'code', project: '技能库', updatedAt: '5 小时前', size: '14 KB', pinned: false },
  { id: 'd-6', title: '云 TTS 音色对照表', kind: 'sheet', project: '山海拾遗', updatedAt: '1 周前', size: '31 KB', pinned: false },
]

const MOCK_PLAN: PlanCard[] = [
  { id: 'pl-1', title: '第 4 集分镜脚本定稿', project: '山海拾遗', domain: 'video', due: '9 月 5 日', priority: 'high', column: 'todo' },
  { id: 'pl-2', title: '接入华为账号登录', project: '轻记账', domain: 'app', due: '9 月 8 日', priority: 'medium', column: 'todo' },
  { id: 'pl-3', title: '技能评估基准集扩充', project: '技能库', domain: 'skill', due: '9 月 12 日', priority: 'low', column: 'todo' },
  { id: 'pl-4', title: '关卡编辑器 HAP 签名发布', project: '星尘塔防', domain: 'game', due: '9 月 3 日', priority: 'high', column: 'doing' },
  { id: 'pl-5', title: '鸿蒙 API 文档向量化', project: '共享知识库', domain: 'knowledge', due: '9 月 4 日', priority: 'medium', column: 'doing' },
  { id: 'pl-6', title: '第 3 集分镜渲染', project: '山海拾遗', domain: 'video', due: '9 月 2 日', priority: 'high', column: 'doing' },
  { id: 'pl-7', title: '角色贴图资产打包', project: '星尘塔防', domain: 'game', due: '9 月 1 日', priority: 'medium', column: 'done' },
  { id: 'pl-8', title: '第 2 集旁白脚本', project: '山海拾遗', domain: 'video', due: '8 月 30 日', priority: 'low', column: 'done' },
]

const PLAN_COLUMNS: { id: PlanColumn; label: string; tone: Tone }[] = [
  { id: 'todo', label: '待办', tone: 'muted' },
  { id: 'doing', label: '进行中', tone: 'primary' },
  { id: 'done', label: '已完成', tone: 'success' },
]

const PRIORITY_META: Record<PlanCard['priority'], { label: string; tone: Tone }> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'muted' },
}

const DOC_KIND_ICON: Record<KnowledgeDoc['kind'], IconType> = {
  doc: FileText,
  code: FileCode2,
  sheet: FileSpreadsheet,
}

// =============================================================================
// 状态元数据：颜色 + 文本 + 图标 三者组合，绝不只依赖颜色
// =============================================================================

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

interface StatusMeta {
  label: string
  icon: IconType
  tone: Tone
  spin?: boolean
}

const STATUS_META: Record<JobStatus | ServiceStatus, StatusMeta> = {
  running: { label: '运行中', icon: Loader2, tone: 'primary', spin: true },
  queued: { label: '排队中', icon: Hourglass, tone: 'muted' },
  paused: { label: '已暂停', icon: Pause, tone: 'warning' },
  waiting_input: { label: '等待输入', icon: MessageSquareMore, tone: 'info' },
  failed: { label: '失败', icon: CircleAlert, tone: 'danger' },
  permission_required: { label: '需要授权', icon: Lock, tone: 'warning' },
  success: { label: '已完成', icon: CircleCheck, tone: 'success' },
  loading: { label: '加载中', icon: Loader2, tone: 'muted', spin: true },
  online: { label: '在线', icon: CircleCheck, tone: 'success' },
  offline: { label: '离线', icon: WifiOff, tone: 'danger' },
  degraded: { label: '性能降级', icon: TriangleAlert, tone: 'warning' },
}

const DOMAIN_META: Record<Domain, { label: string; icon: IconType; className: string }> = {
  video: { label: 'AI 视频', icon: Clapperboard, className: 'text-warning' },
  game: { label: '鸿蒙游戏', icon: Gamepad2, className: 'text-technical' },
  app: { label: '应用开发', icon: AppWindow, className: 'text-technical' },
  chat: { label: 'AI 对话', icon: MessageSquareMore, className: 'text-muted-foreground' },
  knowledge: { label: '知识库', icon: BookOpen, className: 'text-muted-foreground' },
  skill: { label: '技能', icon: Sparkles, className: 'text-muted-foreground' },
}

type Filter = 'all' | 'running' | 'waiting_input' | 'failed' | 'success'

const FILTERS: { id: Filter; label: string; match: (s: JobStatus) => boolean }[] = [
  { id: 'all', label: '全部', match: () => true },
  { id: 'running', label: '运行中', match: (s) => s === 'running' || s === 'paused' },
  { id: 'waiting_input', label: '需处理', match: (s) => s === 'waiting_input' || s === 'permission_required' },
  { id: 'failed', label: '失败', match: (s) => s === 'failed' },
  { id: 'success', label: '已完成', match: (s) => s === 'success' },
]

// =============================================================================
// 基础控件：统一的默认 / 悬停 / 键盘焦点 / 禁用 状态
// =============================================================================

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

function StatusBadge({ status, className }: { status: JobStatus | ServiceStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  // 8px 状态圆点 + 文字 + 图标：绝不仅靠颜色传达状态
  return (
    <span className={cn('inline-flex h-6 items-center gap-2 text-[13px] font-medium whitespace-nowrap', TONE_TEXT[meta.tone], className)}>
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TONE_BAR[meta.tone], meta.spin && 'animate-pulse')} />
      {meta.label}
      <Icon className={cn('size-3.5 opacity-70', meta.spin && 'animate-spin')} aria-hidden="true" />
    </span>
  )
}

function ProgressBar({ value, tone, label }: { value?: number; tone: Tone; label: string }) {
  const indeterminate = value === undefined
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : value}
      className="relative h-1 w-full overflow-hidden rounded-full bg-border/60"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', TONE_BAR[tone], indeterminate && 'w-1/3 opacity-40')}
        style={indeterminate ? undefined : { width: `${value}%` }}
      />
    </div>
  )
}

function Skeleton({ className }: { className?: string }) {
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

function SectionHeader({ title, count, children }: { title: string; count?: number; children?: ReactNode }) {
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

// =============================================================================
// 弹层：模态对话框 / 危险操作确认 / 轻提示 Toast
// =============================================================================

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
  width?: 'sm' | 'md' | 'lg'
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

interface ConfirmState {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}

function ConfirmDialog({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
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

const TOAST_ICON: Record<Toast['tone'], IconType> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  danger: CircleAlert,
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
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

// =============================================================================
// 跑马灯公告条（置顶公告优先滚动）
// =============================================================================

const ANN_TONE: Record<Announcement['tone'], Tone> = { info: 'info', warning: 'warning', success: 'success' }

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

function JobRow({
  job,
  selected,
  onSelect,
  onAction,
}: {
  job: Job
  selected: boolean
  onSelect: () => void
  onAction: (a: JobAction) => void
}) {
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
          title={job.heartbeatStale ? '任务已长时间未上报进度，可能卡住或掉线' : '任务最后一次上报“仍在运行”的时间'}
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

// =============================================================================
// 服务面板：在线 / 离线 / 降级 / 需要授权 / 加载中
// =============================================================================

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

type View = 'focus' | 'queue' | 'plan' | 'knowledge' | 'services' | 'projects' | 'changelog' | 'skills' | 'logs' | 'settings' | 'video' | 'game' | 'app'

const NAV_VIEW: Record<string, View> = {
  workbench: 'focus',
  queue: 'queue',
  plan: 'plan',
  knowledge: 'knowledge',
  services: 'services',
  projects: 'projects',
  changelog: 'changelog',
  skills: 'skills',
  logs: 'logs',
  settings: 'settings',
  video: 'video',
  game: 'game',
  app: 'app',
}

const VIEW_META: Record<View, { title: string; description: string }> = {
  focus: { title: '今日焦点', description: '' },
  queue: { title: '任务队列', description: '所有后台任务的状态、进度与操作。' },
  plan: { title: '计划看板', description: '按待办 / 进行中 / 已完成管理近期计划。' },
  knowledge: { title: '知识库', description: '置顶常用文件，快速回到最近更新的文档。' },
  services: { title: '本地 / 云服务', description: '服务连接状态与需要处理的授权、重连。' },
  projects: { title: '项目', description: '最近活跃的项目及其运行中的任务。' },
  changelog: { title: '开发日志', description: '前端每次迭代的改动、数据契约与后端对接要点。' },
  skills: { title: 'Skill 库', description: '管理可复用技能、效果展示与进化谱系。' },
  logs: { title: '日志中心', description: '按来源、级别和链路查看运行日志。' },
  settings: { title: '设置', description: '管理全局与项目作用域的模型、规则和通知。' },
  video: { title: 'AI 视频工作室', description: '脚本、分镜与导演台的状态摘要。' },
  game: { title: '鸿蒙游戏工作室', description: '引擎、问题阻塞与里程碑状态。' },
  app: { title: '应用开发工作室', description: 'Bug、构建部署与依赖告警。' },
}

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

const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.6',
    date: '9 月 4 日',
    title: '知识库专属界面：空间隔离 / 错题本 / 对话采集',
    summary: '知识库改为独立组件 knowledge-base.tsx：按空间隔离，四个分区（文件 / 错题本 / AI 对话 / 接入采集），文件详情弹窗展示 AI 总结与原文。',
    branch: 'main',
    changes: [
      { kind: 'ui', text: '左栏：空间切换（项目空间 × 3 相互隔离 + 通用空间 × 3）与可折叠目录树；右栏：优先级统计条 + 四个标签页。' },
      { kind: 'interaction', text: '文件列表重点优先排序；悬停出现「归类 / AI 总结 / 重点」；统计条数字可直接跳转对应筛选。' },
      { kind: 'interaction', text: '错题按严重度排序，未解决 → 已解决 → 已归档 单向流转；AI 对话可归档到项目空间。' },
      { kind: 'contract', text: '新增 Space / Folder / File / ErrorEntry / Conversation 五个实体，以及对话采集端点 POST /api/v1/conversations。' },
      { kind: 'rename', text: '旧「置顶文件」概念并入 File.starred（重点）；「置顶」仅保留给公告。' },
    ],
    contracts: [
      {
        entity: 'File',
        fields: [
          { name: 'spaceId', type: "'app' | 'video' | 'game' | 'learning' | 'collect' | 'chat'", note: '所有查询必须带 spaceId，空间之间不可跨查。' },
          { name: 'folderId', type: 'string', note: '目录树按 parentId 递归；前端选中父目录时会展示所有子目录文件，后端请提供 descendants 查询或返回全量目录。' },
          { name: 'starred', type: 'boolean', note: '重点标记，列表默认置顶。' },
          { name: 'aiSummary', type: 'string | null', note: 'AI 清洗后的要点；为 null 表示未清洗。清洗是异步任务，返回 job id，前端走任务队列。' },
          { name: 'status', type: "'inbox' | 'organized'", note: '待整理 / 已归类。上传或采集进入 inbox。' },
          { name: 'tags', type: 'string[]', note: '标签在空间内维护，前端按空间聚合展示。' },
        ],
      },
      {
        entity: 'ErrorEntry',
        fields: [
          { name: 'message', type: 'string', note: '原始报错，保留换行，前端等宽展示。' },
          { name: 'severity', type: "'high' | 'medium' | 'low'", note: '决定排序与圆点颜色。' },
          { name: 'status', type: "'open' | 'solved' | 'archived'", note: '单向流转，archived 可 reopen。' },
          { name: 'occurrences', type: 'number', note: '同一错误再次出现时 +1 而不是新建，去重依据 message 指纹。' },
          { name: 'fromConversationId', type: 'string | null', note: '由对话自动提取时回链原对话。' },
        ],
      },
      {
        entity: 'Conversation',
        fields: [
          { name: 'source', type: "'codex' | 'cursor' | 'trae' | 'claude' | 'custom'", note: '来源工具。' },
          { name: 'sessionId', type: 'string', note: '去重合并键，同 sessionId 多次推送合并为一条。' },
          { name: 'projectHint', type: 'string | null', note: '仓库名 / 工作目录；匹配到项目则 spaceId 归入该项目，否则 chat。' },
          { name: 'summarized', type: 'boolean', note: '是否已生成总结文件。' },
          { name: 'hasError', type: 'boolean', note: '服务端检测堆栈 / HTTP 错误码 / 断言失败后置 true，并生成错题草稿。' },
        ],
      },
    ],
    actions: [
      { action: 'POST /api/v1/conversations  (Bearer API Key)', trigger: 'Codex / Cursor / Trae / Claude Code 会话结束推送', expect: '201 返回 { id, space_id, summary_job_id }；同 sessionId 返回 200 并合并；2 MB 上限；60 次/分钟，超限 429 + Retry-After。' },
      { action: 'MCP: save_conversation · save_error · search_knowledge', trigger: 'AI 工具通过 MCP 调用', expect: 'search_knowledge 需按空间权限过滤，默认只检索当前项目空间 + 通用空间。' },
      { action: 'POST /files/:id/summarize', trigger: '文件行「AI 总结」/ 详情弹窗', expect: '异步；返回 job id；完成后写入 aiSummary 并发通知。' },
      { action: 'PATCH /files/:id  { starred | status | folderId | tags }', trigger: '重点 / 归类 / 移动 / 标签', expect: '前端乐观更新，失败回滚。' },
      { action: 'PATCH /errors/:id  { status }', trigger: '标为已解决 / 归档 / 重新打开', expect: '校验状态流转。' },
      { action: 'PATCH /conversations/:id  { spaceId }', trigger: '「归档到…」下拉', expect: '只能从 chat 归档到项目空间。' },
      { action: 'POST /api-keys/rotate', trigger: '接入采集页「重新生成」', expect: '需二次确认；旧 Key 立即失效。' },
    ],
    cautions: [
      '空间隔离是硬约束：所有 files / errors / conversations 接口都必须校验 spaceId 归属，不能只靠前端筛选。',
      '入库前脱敏（API Key / Token / 邮箱 / 手机号）在服务端执行，前端只展示开关状态。',
      'API Key 只在生成时返回一次明文，之后只返回前 8 位；前端「显示」按钮仅对当前会话缓存有效。',
    ],
  },
  {
    version: 'v0.5',
    date: '9 月 4 日',
    title: '今日焦点首屏 + 视图切换',
    summary: '首屏改为“需要你处理 + 时间线”，其余模块由左侧导航切换，不再纵向堆叠。',
    branch: 'main',
    changes: [
      { kind: 'ui', text: '新增「今日焦点」视图，右栏 288px 放置顶文件与置顶公告。' },
      { kind: 'interaction', text: '左侧导航驱动视图切换：任务队列 / 计划看板 / 知识库 / 服务 / 项目各占一屏。' },
      { kind: 'contract', text: '任务新增可选字段 eta（预计完成时间），时间线用它排列运行中任务。' },
      { kind: 'rename', text: '导航「工作台」更名为「今日焦点」，「日志」保留。' },
    ],
    contracts: [{ entity: 'Job', fields: [{ name: 'eta', type: 'string | null', note: '预计完成时间，ISO 8601；前端按本地时区显示 HH:mm。运行中任务缺失时不显示。' }] }],
    actions: [{ action: 'GET /jobs?status=failed,permission_required,waiting_input', trigger: '进入今日焦点', expect: '按紧急度排序：failed > permission_required > waiting_input；heartbeatStale 为 true 的任务也需返回。' }],
    cautions: ['时间分段（今天 / 明天 / 本周）目前由前端按 due 计算，后端返回统一 ISO 日期即可，不要返回“9 月 5 日”这类文案。'],
  },
  {
    version: 'v0.4',
    date: '9 月 3 日',
    title: '弹层体系、跑马灯、看板、知识库',
    summary: '加入 Toast / 确认框 / 公告弹窗三类弹层，新增计划看板与知识库置顶。',
    branch: 'main',
    changes: [
      { kind: 'interaction', text: '取消任务前弹出二次确认（alertdialog）；其他操作用右下角 Toast 反馈，4 秒自动消失。' },
      { kind: 'ui', text: '命令栏下新增 40px 跑马灯公告条，置顶公告优先滚动，悬停暂停。' },
      { kind: 'ui', text: '新增计划看板（待办 / 进行中 / 已完成）与知识库面板（置顶文件 / 最近更新）。' },
      { kind: 'rename', text: '任务列「最近心跳」更名为「最近响应」，超时显示“无响应”并附解释提示。' },
      { kind: 'contract', text: '新增 Announcement / KnowledgeDoc / PlanCard 三个实体。' },
    ],
    contracts: [
      { entity: 'Announcement', fields: [
        { name: 'id', type: 'string', note: '' },
        { name: 'text', type: 'string', note: '单行文案，建议 ≤ 80 字，跑马灯不换行。' },
        { name: 'tone', type: "'info' | 'warning' | 'success'", note: '决定圆点颜色。' },
        { name: 'pinned', type: 'boolean', note: '置顶公告进入弹窗与跑马灯前列。' },
        { name: 'publishedAt', type: 'string', note: 'ISO 8601。' },
      ] },
      { entity: 'KnowledgeDoc', fields: [
        { name: 'kind', type: "'doc' | 'code' | 'sheet'", note: '决定文件图标。' },
        { name: 'pinned', type: 'boolean', note: '用户可切换；需按用户维度持久化。' },
        { name: 'size', type: 'number', note: '字节数，前端格式化为 KB / MB。' },
      ] },
      { entity: 'PlanCard', fields: [
        { name: 'column', type: "'todo' | 'doing' | 'done'", note: '看板列。' },
        { name: 'priority', type: "'high' | 'medium' | 'low'", note: '高优先级在时间线中标红。' },
        { name: 'due', type: 'string', note: 'ISO 8601 日期。' },
      ] },
    ],
    actions: [
      { action: 'PATCH /announcements/:id  { pinned }', trigger: '公告管理弹窗点击置顶 / 取消置顶', expect: '返回更新后的对象；前端乐观更新，失败需回滚并提示。' },
      { action: 'PATCH /docs/:id  { pinned }', trigger: '知识库图钉', expect: '同上。' },
      { action: 'PATCH /plan/:id  { column }', trigger: '看板卡片「移到下一列」', expect: '仅允许 todo→doing→done 顺序流转；后端拒绝时返回 409。' },
    ],
    cautions: ['取消任务是不可逆操作，接口应幂等：重复调用已取消任务返回 200 而不是报错。', '跑马灯文案由后端提供，请勿包含 HTML。'],
  },
  { version: 'v0.3', date: '9 月 2 日', title: 'Apple 风格视觉精炼', summary: '切换到 #007AFF 主色、无边框卡片、8px 状态圆点，纯样式改动，无契约变化。', branch: 'ui', changes: [
    { kind: 'ui', text: '色板、圆角、阴影、字号层级全部替换为规范令牌。' },
    { kind: 'ui', text: '状态徽章改为「圆点 + 文字 + 图标」组合，不再使用带边框标签。' },
    { kind: 'ui', text: '检查器在 1280px 宽下改为浮层覆盖，避免挤压任务表。' },
  ] },
  { version: 'v0.2', date: '9 月 2 日', title: '任务队列与检查器', summary: '定义任务状态机与操作集合，是后端任务接口的核心契约。', branch: 'main', changes: [
    { kind: 'contract', text: '定义 JobStatus 八种状态与 Job 实体。' },
    { kind: 'interaction', text: '暂停 / 继续 / 取消 / 重试 / 查看日志 / 去授权 / 提供输入 七种任务操作。' },
    { kind: 'ui', text: '任务行固定 80px，加载态与正常态等高避免抖动。' },
  ], contracts: [{ entity: 'Job', fields: [
    { name: 'status', type: "'running' | 'queued' | 'paused' | 'waiting_input' | 'failed' | 'permission_required' | 'completed'", note: '前端还有本地 loading 态，后端无需返回。' },
    { name: 'progress', type: 'number | null', note: '0–100；queued / waiting_input 可为 null。' },
    { name: 'heartbeat', type: 'string', note: '最后一次上报时间，ISO 8601；前端显示相对时间。' },
    { name: 'heartbeatStale', type: 'boolean', note: '由后端判定（建议阈值 60s），前端不自行计算。' },
    { name: 'note', type: 'string | null', note: '失败原因 / 等待说明，直接展示给用户。' },
    { name: 'logs', type: 'string[]', note: '最近 N 条，检查器只展示，不做分页。' },
  ] }], actions: [
    { action: 'POST /jobs/:id/pause · resume · cancel · retry', trigger: '任务行与检查器操作按钮', expect: '返回更新后的 Job；状态流转由后端校验。' },
    { action: 'POST /jobs/:id/authorize', trigger: '「去授权」', expect: '返回授权 URL 或直接完成；完成后状态回到 running。' },
    { action: 'POST /jobs/:id/input  { value }', trigger: '「提供输入」', expect: '成功后状态回到 running。' },
  ], cautions: ['重试应生成新的执行记录但保留同一 Job id，前端依赖 id 做选中态。'] },
  { version: 'v0.1', date: '9 月 1 日', title: '工作台骨架', summary: '224px 导航、64px 命令栏、320px 检查器的三栏布局与设计令牌。', branch: 'main', changes: [
    { kind: 'ui', text: '建立布局骨架与 globals.css 设计令牌。' },
    { kind: 'contract', text: '定义 Service / Project 实体与服务状态（online / offline / degraded / permission_required）。' },
  ], contracts: [{ entity: 'Service', fields: [
    { name: 'scope', type: "'local' | 'cloud'", note: '决定图标。' },
    { name: 'status', type: "'online' | 'offline' | 'degraded' | 'permission_required'", note: '' },
    { name: 'actionLabel', type: 'string | null', note: '异常时的下一步动作文案，如“重新连接”。' },
  ] }] },
]

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

/** 演示用的“今天”日期；接入后端后请改用真实日期 */
const TODAY = { month: 9, day: 2, weekday: '星期三' }

type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'

const BUCKET_META: Record<Bucket, { label: string; tone: Tone }> = {
  overdue: { label: '已逾期', tone: 'danger' },
  today: { label: '今天', tone: 'primary' },
  tomorrow: { label: '明天', tone: 'info' },
  week: { label: '本周', tone: 'muted' },
  later: { label: '之后', tone: 'muted' },
}

const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later']

function bucketOf(due: string): Bucket {
  const m = due.match(/(\d+)\s*月\s*(\d+)\s*日/)
  if (!m) return 'later'
  const month = Number(m[1])
  const day = Number(m[2])
  const offset = (month - TODAY.month) * 31 + (day - TODAY.day)
  if (offset < 0) return 'overdue'
  if (offset === 0) return 'today'
  if (offset === 1) return 'tomorrow'
  if (offset <= 6) return 'week'
  return 'later'
}

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

/** 需要处理的任务：失败 > 需授权 > 等待输入 > 无响应 */
const ATTENTION_RANK: Partial<Record<JobStatus, number>> = { failed: 0, permission_required: 1, waiting_input: 2 }

function FocusView({
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
}: {
  jobs: Job[]
  plan: PlanCard[]
  docs: KnowledgeDoc[]
  announcements: Announcement[]
  services: Service[]
  onJobAction: (id: string, a: JobAction) => void
  onServiceAction: (id: string) => void
  onSelectJob: (id: string) => void
  onNavigate: (v: View) => void
  onTogglePinDoc: (id: string) => void
}) {
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

// =============================================================================
// 页面：工作台
// =============================================================================

export default function Workbench({ onDataLoaded }: WorkbenchProps = {}) {
  const [activeNav, setActiveNav] = useState('workbench')
  const view: View = NAV_VIEW[activeNav] ?? 'focus'
  const navigate = (v: View) => setActiveNav(Object.keys(NAV_VIEW).find((k) => NAV_VIEW[k] === v) ?? 'workbench')
  const [jobs, setJobs] = useState<Job[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  // 新增：公告 / 知识库 / 看板 / 弹层状态
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [docs, setDocs] = useState<KnowledgeDoc[]>(MOCK_DOCS)
  const [plan, setPlan] = useState<PlanCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(true)
  const [creationConnections, setCreationConnections] = useState<Record<ToolId, ToolConn>>({
    video: { toolId: 'video', status: 'starting' }, game: { toolId: 'game', status: 'starting' }, app: { toolId: 'app', status: 'starting' },
  })
  const [studioCards, setStudioCards] = useState<StudioCardModel[]>([])
  const [inbox, setInbox] = useState<CreationInboxItem[]>([])
  const [usage, setUsage] = useState<Usage[]>([])
  const [toolTime, setToolTime] = useState<ToolTimeDay[]>([])
  const toastSeq = useRef(0)

  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++toastSeq.current
    setToasts((prev) => [...prev, { ...t, id }].slice(-4))
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000)
  }, [])
  const dismissToast = (id: number) => setToasts((prev) => prev.filter((x) => x.id !== id))
  const closeConfirm = useCallback(() => setConfirm(null), [])
  const closeAnnounce = useCallback(() => setAnnounceOpen(false), [])
  const closeNotice = useCallback(() => setNoticeOpen(false), [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      const [tasksData, jobsData, modulesData, summaryData] = await Promise.all([
        fetchTasks(),
        fetchJobs(),
        fetchModules(),
        fetchWorkbenchSummary(),
      ])
      const nextJobs = jobsData.map(adaptJob)
      setJobs(nextJobs)
      setServices(modulesData.map(adaptModule))
      setPlan(tasksData.map(adaptTask))
      setProjects(aggregateProjects(tasksData, jobsData))
      setAnnouncements(adaptWorkbenchSummaryToAnnouncements(summaryData))
      setSelectedId((current) => current && nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id)
      onDataLoaded?.({ tasks: tasksData.length, jobs: jobsData.length, modules: modulesData.length })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : '加载工作台数据失败，请重试'
      setError(message)
      pushToast({ tone: 'danger', title: '加载失败', description: message })
    } finally {
      setLoading(false)
    }
  }, [onDataLoaded, pushToast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void Promise.all([fetchToolConnection('video'), fetchToolConnection('game'), fetchToolConnection('app')]).then((connections) => {
      const mapped = connections.map((connection: ToolConnection) => [connection.toolId, {
        ...connection,
        status: connection.status === 'connecting' ? 'starting' : connection.status,
      } satisfies ToolConn] as const)
      setCreationConnections(Object.fromEntries(mapped) as Record<ToolId, ToolConn>)
    }).catch(() => undefined)
    void fetchInboxItems({ status: 'pending' }).then((items) => setInbox(items as CreationInboxItem[])).catch(() => undefined)
    void fetchUsageRecords().then((items) => setUsage(items as Usage[])).catch(() => undefined)
    void fetchToolTimeStats({ days: 7 }).then((items) => setToolTime(items as ToolTimeDay[])).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (view !== 'video' && view !== 'game' && view !== 'app') return
    void fetchStudioCards(view).then((cards) => setStudioCards(cards as StudioCardModel[])).catch(() => setStudioCards([]))
  }, [view])

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
