'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AppWindow,
  Bell,
  BellOff,
  Bookmark,
  Bug,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Gamepad2,
  Layers,
  ListTree,
  Pause,
  Play,
  Search,
  Server,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, EmptyState, FOCUS_RING, IconButton, TONE_BADGE, TONE_BAR, type IconType, type Toast, type Tone } from '@/components/ui-primitives'
import { fetchLogs } from '@/lib/api-client'

// =============================================================================
// 类型（契约见开发日志 v0.8）
// =============================================================================

export type LogLevel = 'bug' | 'warn' | 'notice' | 'info' | 'debug'
export type LogCategory = 'call' | 'task' | 'permission' | 'system' | 'user' | 'collect'
export type LogSource = 'app' | 'video' | 'game' | 'system'
export type HandledBy = 'retry' | 'fallback' | 'manual'

export interface LogEntry {
  id: string
  ts: string // HH:mm:ss.SSS（接入后端为 ISO）
  level: LogLevel
  category: LogCategory
  traceId: string
  parentId?: string
  projectId: LogSource
  jobId?: string
  event: string
  message: string
  data?: Record<string, unknown>
  durationMs?: number
  notified: boolean
  read: boolean
  handledBy?: HandledBy
  stack?: string
  repeat?: number // 同 trace 内折叠的重复条数
}

const LEVEL_META: Record<LogLevel, { label: string; tone: Tone; order: number }> = {
  bug: { label: 'Bug', tone: 'danger', order: 0 },
  warn: { label: '警告', tone: 'warning', order: 1 },
  notice: { label: '提示', tone: 'primary', order: 2 },
  info: { label: '信息', tone: 'muted', order: 3 },
  debug: { label: 'Debug', tone: 'muted', order: 4 },
}

const CATEGORY_META: Record<LogCategory, { label: string; icon: IconType }> = {
  call: { label: '调用', icon: Cpu },
  task: { label: '任务', icon: Layers },
  permission: { label: '权限', icon: Bell },
  system: { label: '系统', icon: Server },
  user: { label: '用户操作', icon: Terminal },
  collect: { label: '采集', icon: Bookmark },
}

const SOURCE_META: Record<LogSource, { label: string; icon: IconType }> = {
  app: { label: '应用开发', icon: AppWindow },
  video: { label: 'AI 视频', icon: Clapperboard },
  game: { label: '游戏开发', icon: Gamepad2 },
  system: { label: '系统', icon: Server },
}

const HANDLED_LABEL: Record<HandledBy, string> = { retry: '自动重试', fallback: '降级处理', manual: '人工介入' }

// =============================================================================
// 模拟数据：4 条 trace
// =============================================================================

const MOCK_LOGS: LogEntry[] = [
  // trace 7f21：任务 1039 失败链路（bug）
  { id: 'l-1', ts: '09:41:02.110', level: 'notice', category: 'task', traceId: '7f21', projectId: 'app', jobId: 'job-1039', event: 'job.start', message: '运行任务 job-1039 · LedgerService 单元测试补全', notified: false, read: true, durationMs: 184300 },
  { id: 'l-2', ts: '09:41:02.412', level: 'info', category: 'call', traceId: '7f21', parentId: 'l-1', projectId: 'app', jobId: 'job-1039', event: 'model.call', message: '调用 anthropic/claude-sonnet-4.5 生成测试用例', data: { tokensIn: 8210, tokensOut: 2904, latencyMs: 9120 }, durationMs: 9120, notified: false, read: true },
  { id: 'l-3', ts: '09:41:11.601', level: 'debug', category: 'system', traceId: '7f21', parentId: 'l-1', projectId: 'app', jobId: 'job-1039', event: 'fs.read', message: '读取 apps/ledger/src/service/LedgerService.ts', notified: false, read: true, repeat: 12 },
  { id: 'l-4', ts: '09:41:12.030', level: 'info', category: 'system', traceId: '7f21', parentId: 'l-1', projectId: 'app', jobId: 'job-1039', event: 'fs.write', message: '写入 LedgerService.test.ts（+312 行）', notified: false, read: true },
  { id: 'l-5', ts: '09:41:14.877', level: 'warn', category: 'call', traceId: '7f21', parentId: 'l-1', projectId: 'app', jobId: 'job-1039', event: 'shell.exec', message: 'pnpm test 退出码 1：3 个用例失败', data: { failed: 3, passed: 41 }, durationMs: 42100, notified: true, read: true, handledBy: 'retry' },
  { id: 'l-6', ts: '09:42:01.204', level: 'info', category: 'call', traceId: '7f21', parentId: 'l-5', projectId: 'app', jobId: 'job-1039', event: 'model.call', message: '重试 · 携带失败输出重新生成', data: { attempt: 2 }, durationMs: 11300, notified: false, read: true },
  { id: 'l-7', ts: '09:43:56.019', level: 'bug', category: 'task', traceId: '7f21', parentId: 'l-1', projectId: 'app', jobId: 'job-1039', event: 'job.fail', message: 'AssertionError: 期望 1999 分，实际 19.99 元 — 金额单位不一致', stack: 'AssertionError: expected 1999 to equal 19.99\n    at LedgerService.test.ts:88:21\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)', notified: true, read: false, handledBy: 'manual' },
  // trace a3c9：分镜生成（正常，含降级）
  { id: 'l-8', ts: '10:02:00.004', level: 'notice', category: 'task', traceId: 'a3c9', projectId: 'video', jobId: 'job-1042', event: 'job.start', message: '运行任务 job-1042 · 生成第 3 集分镜', notified: false, read: true, durationMs: 612000 },
  { id: 'l-9', ts: '10:02:00.301', level: 'warn', category: 'call', traceId: 'a3c9', parentId: 'l-8', projectId: 'video', jobId: 'job-1042', event: 'model.call', message: 'openai/gpt-5 连续 3 次超时（1.8 s）', data: { timeouts: 3 }, notified: true, read: true, handledBy: 'fallback' },
  { id: 'l-10', ts: '10:02:06.110', level: 'info', category: 'call', traceId: 'a3c9', parentId: 'l-9', projectId: 'video', jobId: 'job-1042', event: 'model.fallback', message: '降级到 anthropic/claude-sonnet-4.5', durationMs: 8300, notified: false, read: true },
  { id: 'l-11', ts: '10:02:14.550', level: 'info', category: 'collect', traceId: 'a3c9', parentId: 'l-8', projectId: 'video', jobId: 'job-1042', event: 'kb.write', message: '分镜脚本已写入知识库 · AI 视频空间', notified: false, read: true },
  // trace 5e10：权限
  { id: 'l-12', ts: '10:20:33.900', level: 'warn', category: 'permission', traceId: '5e10', projectId: 'game', jobId: 'job-1041', event: 'permission.request', message: 'HAP 打包需要访问发布证书 · 等待授权', notified: true, read: false },
  { id: 'l-13', ts: '10:20:33.912', level: 'debug', category: 'system', traceId: '5e10', parentId: 'l-12', projectId: 'game', jobId: 'job-1041', event: 'job.pause', message: '任务已暂停，等待用户操作', notified: false, read: true },
  // trace 0b77：系统
  { id: 'l-14', ts: '10:30:00.000', level: 'notice', category: 'system', traceId: '0b77', projectId: 'system', event: 'mcp.maintenance', message: 'MCP render-cluster 进入维护窗口', notified: true, read: true },
  { id: 'l-15', ts: '10:30:00.120', level: 'info', category: 'system', traceId: '0b77', parentId: 'l-14', projectId: 'system', event: 'queue.hold', message: '2 个依赖 render-cluster 的任务已挂起', notified: false, read: true },
  { id: 'l-16', ts: '10:31:15.408', level: 'bug', category: 'call', traceId: '0b77', parentId: 'l-14', projectId: 'system', event: 'mcp.error', message: 'render-cluster 健康检查返回 503', data: { status: 503, endpoint: '/health' }, notified: true, read: false, handledBy: 'retry' },
  // 用户操作
  { id: 'l-17', ts: '10:35:02.000', level: 'info', category: 'user', traceId: 'u-01', projectId: 'game', event: 'user.action', message: '用户置顶了《鸿蒙 ArkTS 编码规范 v3》', notified: false, read: true },
]

// =============================================================================
// 工具
// =============================================================================

type Mode = 'tree' | 'ai'

interface TraceNode {
  entry: LogEntry
  children: TraceNode[]
}

function buildTrees(entries: LogEntry[]): TraceNode[] {
  const byId = new Map(entries.map((e) => [e.id, { entry: e, children: [] as TraceNode[] }]))
  const roots: TraceNode[] = []
  for (const node of byId.values()) {
    const p = node.entry.parentId ? byId.get(node.entry.parentId) : undefined
    if (p) p.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** 一棵树的最高级别（用于 trace 摘要） */
function worstLevel(node: TraceNode): LogLevel {
  let worst = node.entry.level
  for (const c of node.children) {
    const w = worstLevel(c)
    if (LEVEL_META[w].order < LEVEL_META[worst].order) worst = w
  }
  return worst
}

function hasErrorPath(node: TraceNode): boolean {
  return node.entry.level === 'bug' || node.entry.level === 'warn' || node.children.some(hasErrorPath)
}

function toNdjson(entries: LogEntry[]) {
  return entries
    .map((e) =>
      JSON.stringify({
        ts: `2026-09-04T${e.ts}+08:00`,
        level: e.level,
        category: e.category,
        traceId: e.traceId,
        parentId: e.parentId,
        projectId: e.projectId,
        jobId: e.jobId,
        event: e.event,
        message: e.message,
        data: e.data,
        durationMs: e.durationMs,
        handled: e.handledBy ?? null,
      }),
    )
    .join('\n')
}

function fmtDuration(ms?: number) {
  if (ms === undefined) return ''
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms / 60000)} min`
}

function LevelPill({ level }: { level: LogLevel }) {
  const m = LEVEL_META[level]
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[11px] font-medium whitespace-nowrap', TONE_BADGE[m.tone], level === 'debug' && 'opacity-70')}>
      {level === 'bug' && <Bug className="mr-1 size-3" aria-hidden="true" />}
      {m.label}
    </span>
  )
}

// =============================================================================
// 树节点
// =============================================================================

function TreeRow({ node, depth, selectedId, onSelect, expanded, toggle, errorOnly }: { node: TraceNode; depth: number; selectedId?: string; onSelect: (e: LogEntry) => void; expanded: Set<string>; toggle: (id: string) => void; errorOnly: boolean }) {
  const e = node.entry
  const children = errorOnly ? node.children.filter(hasErrorPath) : node.children
  const open = expanded.has(e.id)
  const tone = LEVEL_META[e.level].tone
  const Icon = CATEGORY_META[e.category].icon
  return (
    <li>
      <div
        role="treeitem"
        aria-selected={selectedId === e.id}
        aria-expanded={children.length > 0 ? open : undefined}
        aria-level={depth + 1}
        className={cn('group flex items-stretch gap-2 rounded-md transition-colors duration-150 hover:bg-muted/70', selectedId === e.id && 'bg-accent')}
        style={{ paddingLeft: depth * 20 }}
      >
        {/* 级别色条 */}
        <span aria-hidden="true" className={cn('my-1.5 w-0.5 shrink-0 rounded-full', TONE_BAR[tone], e.level === 'debug' && 'opacity-40')} />
        <button
          type="button"
          aria-label={open ? '折叠' : '展开'}
          onClick={() => toggle(e.id)}
          disabled={children.length === 0}
          className={cn('flex w-5 shrink-0 items-center justify-center text-muted-foreground disabled:opacity-0', FOCUS_RING)}
        >
          <ChevronRight className={cn('size-3.5 transition-transform duration-150', open && 'rotate-90')} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onSelect(e)} className={cn('flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-3 text-left', FOCUS_RING)}>
          <span className="w-[86px] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{e.ts.slice(0, 8)}</span>
          <LevelPill level={e.level} />
          <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className={cn('min-w-24 flex-1 truncate text-[13px]', e.level === 'debug' ? 'text-muted-foreground' : 'text-foreground', !e.read && e.level !== 'debug' && 'font-medium')}>{e.message}</span>
          {e.repeat && <span className="shrink-0 rounded bg-muted px-1.5 text-[11px] tabular-nums whitespace-nowrap text-muted-foreground">×{e.repeat}</span>}
          {e.handledBy && <span className="hidden shrink-0 rounded bg-muted px-1.5 text-[11px] whitespace-nowrap text-muted-foreground xl:inline">{HANDLED_LABEL[e.handledBy]}</span>}
          {e.notified && <Bell className="size-3 shrink-0 text-muted-foreground/70" aria-label="已通知" />}
          {!e.read && <span aria-label="未读" className="size-1.5 shrink-0 rounded-full bg-primary" />}
          <span className="hidden w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground lg:inline">{fmtDuration(e.durationMs)}</span>
        </button>
      </div>
      {open && children.length > 0 && (
        <ul role="group">
          {children.map((c) => (
            <TreeRow key={c.entry.id} node={c} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} toggle={toggle} errorOnly={errorOnly} />
          ))}
        </ul>
      )}
    </li>
  )
}

// =============================================================================
// 时间刷：迷你直方图（每 10 分钟一桶）
// =============================================================================

function parseLogTime(ts: string): [number, number] {
  const date = new Date(ts)
  if (!Number.isNaN(date.getTime())) return [date.getHours(), date.getMinutes()]
  const [hour, minute] = ts.split(':').map(Number)
  return [Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0]
}

function TimeBrush({ entries, range, onChange }: { entries: LogEntry[]; range: [number, number] | null; onChange: (r: [number, number] | null) => void }) {
  const buckets = useMemo(() => {
    const b: Record<number, Record<LogLevel, number>> = {}
    for (let i = 0; i < 12; i++) b[i] = { bug: 0, warn: 0, notice: 0, info: 0, debug: 0 }
    for (const e of entries) {
      const [h, m] = parseLogTime(e.ts)
      const idx = Math.min(11, Math.max(0, Math.floor(((h - 9) * 60 + m) / 10))) // 09:00–11:00
      b[idx][e.level] += e.repeat ?? 1
    }
    return Object.values(b)
  }, [entries])
  const max = Math.max(1, ...buckets.map((x) => Object.values(x).reduce((a, c) => a + c, 0)))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-10 items-end gap-0.5" role="group" aria-label="按时间筛选（每格 10 分钟）">
        {buckets.map((b, i) => {
          const total = Object.values(b).reduce((a, c) => a + c, 0)
          const inRange = !range || (i >= range[0] && i <= range[1])
          return (
            <button
              key={i}
              type="button"
              aria-label={`09:${String(i * 10).padStart(2, '0')} 起 · ${total} 条`}
              aria-pressed={!!range && inRange}
              onClick={() => onChange(range && range[0] === i && range[1] === i ? null : [i, i])}
              className={cn('flex flex-1 flex-col justify-end overflow-hidden rounded-sm transition-opacity duration-150 hover:opacity-100', FOCUS_RING, inRange ? 'opacity-100' : 'opacity-30')}
              style={{ height: '100%' }}
            >
              <span className="flex h-full flex-col justify-end" aria-hidden="true">
                {(['debug', 'info', 'notice', 'warn', 'bug'] as LogLevel[]).map((lvl) =>
                  b[lvl] ? <span key={lvl} className={cn('w-full', TONE_BAR[LEVEL_META[lvl].tone], lvl === 'debug' && 'opacity-30')} style={{ height: `${(b[lvl] / max) * 100}%` }} /> : null,
                )}
                {total === 0 && <span className="h-0.5 w-full bg-border" />}
              </span>
            </button>
          )
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>09:00</span>
        <span>10:00</span>
        <span>11:00</span>
      </div>
    </div>
  )
}

// =============================================================================
// 主组件
// =============================================================================

interface LogCenterProps {
  onToast: (t: Omit<Toast, 'id'>) => void
  onExplainWithAi?: (entry: LogEntry) => void
  onOpenJob?: (jobId: string) => void
}

export default function LogCenter({ onToast, onExplainWithAi, onOpenJob }: LogCenterProps) {
  const [mode, setMode] = useState<Mode>('tree')
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS)
  useEffect(() => { void fetchLogs().then((items) => setLogs(items as LogEntry[])).catch(() => undefined) }, [])
  const [levels, setLevels] = useState<Set<LogLevel>>(new Set(['bug', 'warn', 'notice', 'info', 'debug']))
  const [categories, setCategories] = useState<Set<LogCategory>>(new Set(Object.keys(CATEGORY_META) as LogCategory[]))
  const [sources, setSources] = useState<Set<LogSource>>(new Set(['app', 'video', 'game', 'system']))
  const [query, setQuery] = useState('')
  const [range, setRange] = useState<[number, number] | null>(null)
  const [live, setLive] = useState(true)
  const [pendingCount] = useState(3)
  const [errorOnly, setErrorOnly] = useState(false)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(MOCK_LOGS.filter((l) => !l.parentId).map((l) => l.id)))
  const [selected, setSelected] = useState<LogEntry | undefined>(MOCK_LOGS.find((l) => l.id === 'l-7'))

  const toggleSet = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n
  }

  const levelCounts = useMemo(() => {
    const c: Record<LogLevel, number> = { bug: 0, warn: 0, notice: 0, info: 0, debug: 0 }
    logs.forEach((l) => (c[l.level] += 1))
    return c
  }, [logs])
  const unreadCount = logs.filter((l) => !l.read).length

  /** 过滤：来源 / 类别 / ��别 / 时间 / 搜索；树模式下只按 trace 过滤，保留链路完整 */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = (l: LogEntry) => {
      if (!sources.has(l.projectId)) return false
      if (!levels.has(l.level)) return false
      if (!categories.has(l.category)) return false
      if (unreadOnly && l.read) return false
      if (range) {
        const [h, m] = parseLogTime(l.ts)
        const idx = Math.floor(((h - 9) * 60 + m) / 10)
        if (idx < range[0] || idx > range[1]) return false
      }
      if (q && !`${l.message} ${l.event} ${l.traceId} ${l.jobId ?? ''}`.toLowerCase().includes(q)) return false
      return true
    }
    if (mode === 'ai') return logs.filter(matches)
    // 树模式：命中任一节点则保留整条 trace，但级别过滤仍作用于节点
    const hitTraces = new Set(logs.filter(matches).map((l) => l.traceId))
    return logs.filter((l) => hitTraces.has(l.traceId) && sources.has(l.projectId) && levels.has(l.level))
  }, [logs, sources, levels, categories, unreadOnly, range, query, mode])

  const trees = useMemo(() => buildTrees(filtered), [filtered])
  const visibleTrees = errorOnly ? trees.filter(hasErrorPath) : trees

  const expandAll = () => setExpanded(new Set(filtered.map((l) => l.id)))
  const collapseAll = () => setExpanded(new Set())

  const markRead = (id: string) => setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, read: true } : l)))
  const markAllRead = () => {
    setLogs((prev) => prev.map((l) => ({ ...l, read: true })))
    onToast({ tone: 'success', title: '已全部标为已读' })
  }

  const copy = (text: string, label = '已复制') => {
    navigator.clipboard?.writeText(text)
    onToast({ tone: 'success', title: label })
  }

  const select = (e: LogEntry) => {
    setSelected(e)
    if (!e.read) markRead(e.id)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ===== 工具栏 ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="查看模式" className="flex rounded-lg bg-card p-1 shadow-sm">
            {(
              [
                { id: 'tree', label: '简易模式', icon: ListTree },
                { id: 'ai', label: 'AI 模式', icon: Terminal },
              ] as { id: Mode; label: string; icon: IconType }[]
            ).map((m) => {
              const Icon = m.icon
              const active = mode === m.id
              return (
                <button key={m.id} role="tab" type="button" aria-selected={active} onClick={() => setMode(m.id)} className={cn('flex h-9 items-center gap-2 rounded-md px-3 text-[13px] transition-colors duration-150', FOCUS_RING, active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="size-4" aria-hidden="true" />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* 级别筛选 */}
          <div role="group" aria-label="按级别筛选" className="flex items-center gap-1">
            {(Object.keys(LEVEL_META) as LogLevel[]).map((lvl) => {
              const on = levels.has(lvl)
              const m = LEVEL_META[lvl]
              return (
                <button key={lvl} type="button" aria-pressed={on} onClick={() => setLevels(toggleSet(levels, lvl))} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors duration-150', FOCUS_RING, on ? TONE_BADGE[m.tone] : 'bg-muted text-muted-foreground/60')}>
                  <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[m.tone], !on && 'opacity-40')} />
                  {m.label}
                  <span className="tabular-nums opacity-70">{levelCounts[lvl]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">搜索日志</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索消息 / 事件 / trace" className={cn('h-9 w-56 rounded-lg border border-transparent bg-muted pr-3 pl-9 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card', FOCUS_RING)} />
          </label>
          <Button variant={live ? 'primary' : 'outline'} onClick={() => setLive((v) => !v)} aria-pressed={live}>
            {live ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {live ? '实时' : `暂停 · ${pendingCount} 条新`}
          </Button>
          <Button onClick={() => copy(toNdjson(filtered), `已导出 ${filtered.length} 条（NDJSON 已复制）`)}>
            <Download className="size-4" aria-hidden="true" />
            导出
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)_320px]">
        {/* ===== 左：来源树 + 类别 + 时间刷 ===== */}
        <aside className="flex flex-col gap-4">
          <section className="rounded-lg bg-card p-3 shadow-sm">
            <p className="mb-2 px-1 text-[11px] font-medium text-muted-foreground">日志来源 · 订阅</p>
            <ul className="flex flex-col gap-0.5">
              {(Object.keys(SOURCE_META) as LogSource[]).map((s) => {
                const on = sources.has(s)
                const Icon = SOURCE_META[s].icon
                const n = logs.filter((l) => l.projectId === s).length
                const bugs = logs.filter((l) => l.projectId === s && l.level === 'bug' && !l.read).length
                return (
                  <li key={s}>
                    <label className={cn('flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-muted', !on && 'opacity-60')}>
                      <input type="checkbox" checked={on} onChange={() => setSources(toggleSet(sources, s))} className="size-3.5 accent-primary" aria-label={`订阅 ${SOURCE_META[s].label}`} />
                      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1 truncate text-foreground">{SOURCE_META[s].label}</span>
                      {bugs > 0 && <span className="rounded bg-destructive/8 px-1 text-[11px] font-medium tabular-nums text-destructive">{bugs}</span>}
                      <span className="text-[11px] tabular-nums text-muted-foreground">{n}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-lg bg-card p-3 shadow-sm">
            <p className="mb-2 px-1 text-[11px] font-medium text-muted-foreground">类别</p>
            <ul className="flex flex-wrap gap-1.5 px-1">
              {(Object.keys(CATEGORY_META) as LogCategory[]).map((c) => {
                const on = categories.has(c)
                return (
                  <li key={c}>
                    <button type="button" aria-pressed={on} onClick={() => setCategories(toggleSet(categories, c))} className={cn('h-7 rounded-md px-2 text-[11px] transition-colors duration-150', FOCUS_RING, on ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground/70')}>
                      {CATEGORY_META[c].label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-lg bg-card p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-medium text-muted-foreground">时间分布</p>
              {range && (
                <button type="button" onClick={() => setRange(null)} className={cn('text-[11px] text-primary hover:underline', FOCUS_RING)}>
                  清除
                </button>
              )}
            </div>
            <TimeBrush entries={logs.filter((l) => sources.has(l.projectId))} range={range} onChange={setRange} />
          </section>

          <section className="rounded-lg bg-card p-3 shadow-sm">
            <p className="mb-2 px-1 text-[11px] font-medium text-muted-foreground">快捷视图</p>
            <ul className="flex flex-col gap-0.5">
              <li>
                <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly((v) => !v)} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-muted', FOCUS_RING, unreadOnly && 'bg-accent text-accent-foreground')}>
                  <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-left">未读</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{unreadCount}</span>
                </button>
              </li>
              <li>
                <button type="button" aria-pressed={errorOnly} onClick={() => setErrorOnly((v) => !v)} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-muted', FOCUS_RING, errorOnly && 'bg-accent text-accent-foreground')}>
                  <Bug className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-left">只看报错路径</span>
                </button>
              </li>
              <li>
                <button type="button" onClick={markAllRead} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-muted', FOCUS_RING)}>
                  <BellOff className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-left">全部标为已读</span>
                </button>
              </li>
            </ul>
          </section>
        </aside>

        {/* ===== 中：树 / NDJSON ===== */}
        <section className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm" aria-labelledby="logs-heading">
          <div className="flex h-12 items-center justify-between gap-4 border-b border-border/60 px-4">
            <h2 id="logs-heading" className="flex items-baseline gap-2 text-[13px] font-medium text-foreground">
              {mode === 'tree' ? '操作链路' : '结构化日志'}
              <span className="text-[11px] font-normal tabular-nums text-muted-foreground">
                {mode === 'tree' ? `${visibleTrees.length} 条 trace · ${filtered.length} 条记录` : `${filtered.length} 行`}
              </span>
            </h2>
            {mode === 'tree' ? (
              <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={expandAll}>
                  全部展开
                </Button>
                <Button variant="ghost" onClick={collapseAll}>
                  全部折叠
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => copy(toNdjson(filtered))}>
                  <Copy className="size-3.5" aria-hidden="true" />
                  复制全部
                </Button>
                <Button variant="ghost" onClick={() => copy(`以下是 NO.1 3mode 工作台导出的结构化日志（NDJSON，每行一个事件；level 中 bug 最高）。请分析失败链路并给出处理建议：\n\n${toNdjson(filtered)}`, '已复制为 Prompt')}>
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  复制为 Prompt
                </Button>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={ListTree} title="没有匹配的日志" description="调整级别、类别、来源或时间范围后重试。" action={<Button variant="ghost" onClick={() => { setLevels(new Set(['bug', 'warn', 'notice', 'info', 'debug'])); setCategories(new Set(Object.keys(CATEGORY_META) as LogCategory[])); setSources(new Set(['app', 'video', 'game', 'system'])); setQuery(''); setRange(null); setUnreadOnly(false); setErrorOnly(false) }}>清除筛选</Button>} />
          ) : mode === 'tree' ? (
            <ul role="tree" aria-label="日志树" className="flex flex-col gap-1 p-2">
              {visibleTrees.map((t) => {
                const worst = worstLevel(t)
                return (
                  <li key={t.entry.id} className="rounded-lg bg-muted/30 p-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">trace {t.entry.traceId}</span>
                      <span aria-hidden="true">·</span>
                      <span>{SOURCE_META[t.entry.projectId].label}</span>
                      {t.entry.jobId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button type="button" onClick={() => onOpenJob?.(t.entry.jobId!)} className={cn('font-mono hover:text-foreground hover:underline', FOCUS_RING)}>
                            {t.entry.jobId}
                          </button>
                        </>
                      )}
                      <span className="ml-auto flex items-center gap-1.5">
                        最高级别 <LevelPill level={worst} />
                      </span>
                    </div>
                    <ul role="group">
                      <TreeRow node={t} depth={0} selectedId={selected?.id} onSelect={select} expanded={expanded} toggle={(id) => setExpanded(toggleSet(expanded, id))} errorOnly={errorOnly} />
                    </ul>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ol className="max-h-[70vh] overflow-auto bg-foreground font-mono text-[12px] leading-relaxed text-card" aria-label="NDJSON">
              {filtered.map((l, i) => {
                const obj = { ts: `2026-09-04T${l.ts}+08:00`, level: l.level, category: l.category, traceId: l.traceId, projectId: l.projectId, jobId: l.jobId, event: l.event, message: l.message, data: l.data, durationMs: l.durationMs, handled: l.handledBy ?? null }
                const tone = LEVEL_META[l.level].tone
                return (
                  <li key={l.id}>
                    <button type="button" onClick={() => select(l)} className={cn('flex w-full items-start gap-3 px-4 py-1 text-left hover:bg-card/10', selected?.id === l.id && 'bg-card/15', FOCUS_RING)}>
                      <span className="w-8 shrink-0 text-right text-card/40 tabular-nums select-none">{i + 1}</span>
                      <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_BAR[tone])} />
                      <span className="min-w-0 flex-1 break-all whitespace-pre-wrap">
                        {'{'}
                        {Object.entries(obj)
                          .filter(([, v]) => v !== undefined)
                          .map(([k, v], j, arr) => (
                            <span key={k}>
                              <span className="text-card/60">&quot;{k}&quot;</span>
                              <span className="text-card/40">: </span>
                              <span className={k === 'level' && (l.level === 'bug' || l.level === 'warn') ? (l.level === 'bug' ? 'text-destructive' : 'text-warning') : typeof v === 'string' ? 'text-success' : 'text-info'}>{JSON.stringify(v)}</span>
                              {j < arr.length - 1 && <span className="text-card/40">, </span>}
                            </span>
                          ))}
                        {'}'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* ===== 右：详情 ===== */}
        <aside className="hidden xl:block" aria-label="日志详情">
          {selected ? <LogDetail entry={selected} allLogs={logs} onClose={() => setSelected(undefined)} onToast={onToast} onExplain={onExplainWithAi} onOpenJob={onOpenJob} onCopy={copy} /> : <div className="rounded-lg bg-card p-6 shadow-sm"><EmptyState icon={Terminal} title="未选择日志" description="在左侧点击任意一条记录查看完整字段与处理链路。" /></div>}
        </aside>
      </div>

      {/* 窄屏：详情以浮层展示 */}
      {selected && (
        <div className="fixed inset-x-4 bottom-4 z-40 xl:hidden">
          <LogDetail entry={selected} allLogs={logs} onClose={() => setSelected(undefined)} onToast={onToast} onExplain={onExplainWithAi} onOpenJob={onOpenJob} onCopy={copy} compact />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// 详情抽屉
// =============================================================================

function LogDetail({ entry: e, allLogs, onClose, onToast, onExplain, onOpenJob, onCopy, compact }: { entry: LogEntry; allLogs: LogEntry[]; onClose: () => void; onToast: (t: Omit<Toast, 'id'>) => void; onExplain?: (e: LogEntry) => void; onOpenJob?: (id: string) => void; onCopy: (t: string, l?: string) => void; compact?: boolean }) {
  const chain = useMemo(() => {
    const byId = new Map(allLogs.map((l) => [l.id, l]))
    const out: LogEntry[] = []
    let cur: LogEntry | undefined = e
    while (cur) {
      out.unshift(cur)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return out
  }, [e, allLogs])
  const [dataOpen, setDataOpen] = useState(true)

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-foreground">{children}</dd>
    </div>
  )

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg bg-card shadow-lg', compact ? 'max-h-[60vh]' : 'shadow-sm')}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 pr-2 pl-4">
        <div className="flex items-center gap-2">
          <LevelPill level={e.level} />
          <span className="font-mono text-[11px] text-muted-foreground">{e.event}</span>
        </div>
        <IconButton label="关闭详情" icon={X} onClick={onClose} side="left" />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-[13px] leading-relaxed font-medium text-foreground text-pretty">{e.message}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="时间">
            <span className="font-mono tabular-nums">{e.ts}</span>
          </Field>
          <Field label="耗时">{fmtDuration(e.durationMs) || '—'}</Field>
          <Field label="来源">{SOURCE_META[e.projectId].label}</Field>
          <Field label="类别">{CATEGORY_META[e.category].label}</Field>
          <Field label="trace">
            <span className="font-mono">{e.traceId}</span>
          </Field>
          <Field label="任务">
            {e.jobId ? (
              <button type="button" onClick={() => onOpenJob?.(e.jobId!)} className={cn('inline-flex items-center gap-1 font-mono text-primary hover:underline', FOCUS_RING)}>
                {e.jobId}
                <ExternalLink className="size-3" aria-hidden="true" />
              </button>
            ) : (
              '—'
            )}
          </Field>
          <Field label="通知">{e.notified ? '已通知' : '未通知'}</Field>
          <Field label="处理方式">{e.handledBy ? HANDLED_LABEL[e.handledBy] : '—'}</Field>
        </dl>

        {/* 处理链路 */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">处理链路</p>
          <ol className="flex flex-col">
            {chain.map((c, i) => (
              <li key={c.id} className="flex gap-3">
                <span className="flex flex-col items-center">
                  <span aria-hidden="true" className={cn('mt-1.5 size-2 shrink-0 rounded-full', TONE_BAR[LEVEL_META[c.level].tone])} />
                  {i < chain.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-border" />}
                </span>
                <span className={cn('pb-3 text-[12px] leading-relaxed', c.id === e.id ? 'font-medium text-foreground' : 'text-muted-foreground')}>{c.message}</span>
              </li>
            ))}
          </ol>
        </div>

        {e.stack && (
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">堆栈</p>
            <pre className="overflow-x-auto rounded-lg bg-destructive/5 p-3 font-mono text-[11px] leading-relaxed text-destructive">{e.stack}</pre>
          </div>
        )}

        {e.data && (
          <div className="mt-3">
            <button type="button" aria-expanded={dataOpen} onClick={() => setDataOpen((v) => !v)} className={cn('mb-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground', FOCUS_RING)}>
              <ChevronDown className={cn('size-3 transition-transform duration-150', !dataOpen && '-rotate-90')} aria-hidden="true" />
              data
            </button>
            {dataOpen && <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed text-foreground">{JSON.stringify(e.data, null, 2)}</pre>}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 border-t border-border/60 p-3">
        {(e.level === 'bug' || e.level === 'warn') && (
          <Button variant="primary" onClick={() => onToast({ tone: 'success', title: '已存为错题', description: `${e.message.slice(0, 32)}… → ${SOURCE_META[e.projectId].label}空间` })}>
            <Bug className="size-3.5" aria-hidden="true" />
            存为错题
          </Button>
        )}
        <Button onClick={() => onExplain?.(e)}>
          <Sparkles className="size-3.5" aria-hidden="true" />
          用 AI 解释
        </Button>
        <Button variant="ghost" onClick={() => onCopy(toNdjson([e]))}>
          <Copy className="size-3.5" aria-hidden="true" />
          复制 JSON
        </Button>
      </div>
    </div>
  )
}
