'use client'

import type { ReactNode } from 'react'
import { AppWindow, Clapperboard, ExternalLink, Gamepad2, ListPlus, PlugZap, RefreshCw, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, EmptyState, FOCUS_RING, TONE_BADGE, TONE_BAR, TONE_TEXT, type IconType, type Tone } from '@/components/ui-primitives'

// =============================================================================
// 创作工具接入共享层：类型 / 元数据 / 通用卡片
// 原则：工作台只显示状态并发出命令，工具本体独立运行，通过深链打开。
// 注意：只从 ui-primitives 导入基础件，禁止反向依赖 workbench。
// =============================================================================

// -----------------------------------------------------------------------------
// 类型（占位，字段与后端契约对齐后可直接替换）
// -----------------------------------------------------------------------------

export type ToolId = 'video' | 'game' | 'app'

export type StudioStatus = 'idle' | 'running' | 'blocked' | 'failed' | 'done' | 'draft'

/** 工作室通用状态卡：三个工具共用同一渲染 */
export interface StudioCardModel {
  id: string
  toolId: ToolId
  /** 分组键：video → script | storyboard | director；game → engine | issue | milestone；app → bug | build | dependency */
  kind: string
  title: string
  subtitle?: string
  status: StudioStatus
  /** 键值元信息，按顺序渲染，最多 4 条 */
  meta: { label: string; value: string; tone?: Tone }[]
  progress?: number
  /** 相对时间文案 */
  updatedAt: string
  /** 深链：桌面工具用 trimode:// 协议，Web 工具为 https */
  deepLink: string
  /** 允许「加入计划」 */
  planable?: boolean
  /** 允许「存为错题」（问题 / Bug 类） */
  errorable?: boolean
}

/** 看板收件箱条目：由工具上报，采纳后生成 PlanCard */
export interface InboxItem {
  id: string
  toolId: ToolId
  type: 'idea' | 'issue' | 'task'
  title: string
  note?: string
  priority?: 'high' | 'medium' | 'low'
  project?: string
  /** 回链到工具内的具体位置 */
  refUrl?: string
  createdAt: string
  status: 'pending' | 'accepted' | 'dismissed'
}

/** 用量原子记录：前端按维度聚合，不落库 */
export interface Usage {
  toolId: ToolId
  model: string
  project: string
  tokensIn: number
  tokensOut: number
  /** 人民币元 */
  cost: number
  /** ISO 日期 YYYY-MM-DD */
  day: string
}

/** 工具连接状态 */
export interface ToolConn {
  toolId: ToolId
  status: 'connected' | 'offline' | 'starting'
  version?: string
  endpoint?: string
  lastSeen?: string
}

/** 每日各工具使用时长（分钟） */
export interface ToolTimeDay {
  day: string
  label: string
  minutes: Record<ToolId, number>
}

// -----------------------------------------------------------------------------
// 元数据
// -----------------------------------------------------------------------------

export const TOOL_META: Record<
  ToolId,
  { label: string; short: string; icon: IconType; tone: Tone; bar: string; text: string; badge: string; emptyHint: string }
> = {
  video: {
    label: 'AI 视频工作室',
    short: 'AI 视频',
    icon: Clapperboard,
    tone: 'warning',
    bar: 'bg-warning',
    text: 'text-warning',
    badge: 'bg-warning/10 text-warning',
    emptyHint: '打开 AI 视频工具并连接后，脚本 / 分镜 / 导演台卡片会在这里同步。',
  },
  game: {
    label: '鸿蒙游戏工作室',
    short: '鸿蒙游戏',
    icon: Gamepad2,
    tone: 'primary',
    bar: 'bg-technical',
    text: 'text-technical',
    badge: 'bg-technical/10 text-technical',
    emptyHint: '打开游戏开发工具并连接后，引擎 / 构建 / 问题卡片会在这里同步。',
  },
  app: {
    label: '应用开发工作室',
    short: '应用开发',
    icon: AppWindow,
    tone: 'info',
    bar: 'bg-info',
    text: 'text-info',
    badge: 'bg-info/10 text-info',
    emptyHint: '打开应用开发工具并连接后，Bug / 构建 / 依赖卡片会在这里同步。',
  },
}

export const TOOL_ORDER: ToolId[] = ['video', 'game', 'app']

export const STUDIO_STATUS: Record<StudioStatus, { label: string; tone: Tone }> = {
  idle: { label: '空闲', tone: 'muted' },
  running: { label: '进行中', tone: 'primary' },
  blocked: { label: '阻塞', tone: 'warning' },
  failed: { label: '失败', tone: 'danger' },
  done: { label: '已完成', tone: 'success' },
  draft: { label: '草稿', tone: 'muted' },
}

export const INBOX_TYPE: Record<InboxItem['type'], { label: string; tone: Tone }> = {
  idea: { label: '想法', tone: 'info' },
  issue: { label: '问题', tone: 'warning' },
  task: { label: '任务', tone: 'primary' },
}

export const CONN_META: Record<ToolConn['status'], { label: string; tone: Tone }> = {
  connected: { label: '已连接', tone: 'success' },
  offline: { label: '未运行', tone: 'muted' },
  starting: { label: '启动中', tone: 'info' },
}

// -----------------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------------

/** 深链打开：iframe 内新标签，否则当前窗口。桌面工具自定义协议直接 assign。 */
export function openDeepLink(link: string) {
  if (typeof window === 'undefined') return
  const inIframe = window.self !== window.top
  if (link.startsWith('trimode://') || !inIframe) {
    window.location.assign(link)
  } else {
    window.open(link, '_blank', 'noopener,noreferrer')
  }
}

export function fmtCost(v: number) {
  return `¥${v.toFixed(v >= 100 ? 0 : 2)}`
}

export function fmtTokens(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(v >= 100_000 ? 0 : 1)}k`
  return String(v)
}

export function fmtMinutes(m: number) {
  if (m < 60) return `${m} 分`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} 小时 ${r} 分` : `${h} 小时`
}

// -----------------------------------------------------------------------------
// 通用组件
// -----------------------------------------------------------------------------

/** 花费小额徽标 */
export function CostChip({ cost, tokens, label = '今日' }: { cost: number; tokens?: number; label?: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-muted px-2 text-[11px] tabular-nums text-muted-foreground">
      <Coins className="size-3" aria-hidden="true" />
      <span>
        {label} {fmtCost(cost)}
      </span>
      {tokens !== undefined && <span className="text-muted-foreground/70">· {fmtTokens(tokens)} tok</span>}
    </span>
  )
}

/** 工具连接横幅：显示连接状态、版本，以及深链打开按钮 */
export function ConnBanner({
  conn,
  cost,
  tokens,
  onOpen,
  onReconnect,
}: {
  conn: ToolConn
  cost: number
  tokens: number
  onOpen: () => void
  onReconnect: () => void
}) {
  const t = TOOL_META[conn.toolId]
  const c = CONN_META[conn.status]
  const Icon = t.icon
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-card px-5 py-4 shadow-sm">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-[10px]', t.badge)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
          {t.label}
          <span className={cn('inline-flex h-5 items-center gap-1.5 rounded px-1.5 text-[11px] font-medium', TONE_BADGE[c.tone])}>
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[c.tone], conn.status === 'starting' && 'animate-pulse')} />
            {c.label}
          </span>
          {conn.version && <span className="font-mono text-[11px] text-muted-foreground">v{conn.version}</span>}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {conn.status === 'connected' ? `${conn.endpoint ?? '本地网关'} · 最近同步 ${conn.lastSeen ?? '刚刚'}` : conn.status === 'starting' ? '正在等待工具就绪…' : '工具未运行，卡片为最近一次同步的快照。'}
        </p>
      </div>
      <CostChip cost={cost} tokens={tokens} />
      {conn.status !== 'connected' && (
        <Button variant="outline" onClick={onReconnect}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
          重新连接
        </Button>
      )}
      <Button variant="primary" onClick={onOpen}>
        <ExternalLink className="size-3.5" aria-hidden="true" />
        在工具中打开
      </Button>
    </div>
  )
}

/** 工作室分组：标题 + 计数 + 网格 */
export function StudioSection({
  title,
  description,
  count,
  icon: Icon,
  action,
  children,
  columns = 3,
}: {
  title: string
  description?: string
  count?: number
  icon?: IconType
  action?: ReactNode
  children: ReactNode
  columns?: 2 | 3
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden="true" />}
            {title}
            {count !== undefined && <span className="tabular-nums text-muted-foreground">{count}</span>}
          </h2>
          {description && <p className="mt-0.5 text-[11px] text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action}
      </div>
      <div className={cn('grid gap-3', columns === 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2')}>{children}</div>
    </section>
  )
}

/** 工作室通用卡片：状态 + 元信息 + 深链 + 加入计划 */
export function StudioCard({
  card,
  onOpen,
  onAddToPlan,
  onSaveError,
}: {
  card: StudioCardModel
  onOpen: (card: StudioCardModel) => void
  onAddToPlan?: (card: StudioCardModel) => void
  onSaveError?: (card: StudioCardModel) => void
}) {
  const s = STUDIO_STATUS[card.status]
  return (
    <article className="group flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium leading-snug text-foreground">{card.title}</h3>
          {card.subtitle && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{card.subtitle}</p>}
        </div>
        <span className={cn('inline-flex h-5 shrink-0 items-center gap-1.5 rounded px-1.5 text-[11px] font-medium whitespace-nowrap', TONE_BADGE[s.tone])}>
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[s.tone], card.status === 'running' && 'animate-pulse')} />
          {s.label}
        </span>
      </div>

      {card.progress !== undefined && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={card.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={cn('h-full rounded-full transition-[width] duration-300', TONE_BAR[s.tone])} style={{ width: `${card.progress}%` }} />
          </div>
          <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">{card.progress}%</span>
        </div>
      )}

      {card.meta.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {card.meta.slice(0, 4).map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
              <dd className={cn('truncate text-[13px] tabular-nums', m.tone ? TONE_TEXT[m.tone] : 'text-foreground')}>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-muted-foreground">{card.updatedAt}</span>
        <div className="flex items-center gap-1">
          {card.errorable && onSaveError && (
            <Button variant="ghost" onClick={() => onSaveError(card)} className="h-8 px-2">
              存为错题
            </Button>
          )}
          {card.planable && onAddToPlan && (
            <Button variant="ghost" onClick={() => onAddToPlan(card)} className="h-8 px-2">
              <ListPlus className="size-3.5" aria-hidden="true" />
              加入计划
            </Button>
          )}
          <button
            type="button"
            onClick={() => onOpen(card)}
            aria-label={`在工具中打开「${card.title}」`}
            className={cn('inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-primary transition-colors hover:bg-accent', FOCUS_RING)}
          >
            打开
            <ExternalLink className="size-3" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  )
}

/** 工具未连接且无快照时的空态 */
export function StudioEmpty({ toolId, onOpen }: { toolId: ToolId; onOpen: () => void }) {
  const t = TOOL_META[toolId]
  return (
    <div className="rounded-lg bg-card shadow-sm">
      <EmptyState
        icon={PlugZap}
        title={`${t.short}尚未连接`}
        description={t.emptyHint}
        action={
          <Button variant="primary" onClick={onOpen}>
            <ExternalLink className="size-3.5" aria-hidden="true" />
            打开工具
          </Button>
        }
      />
    </div>
  )
}
