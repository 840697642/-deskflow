'use client'

import type { ReactNode } from 'react'
import { FileCode2, FileSpreadsheet, FileText, Film, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING, TONE_BADGE, type IconType, type Tone } from '@/components/ui-primitives'

// =============================================================================
// 知识库共享类型（占位；接入后端时替换为 API 类型）
// =============================================================================

/** 空间：项目空间彼此隔离，通用空间与项目空间隔离 */
export type SpaceId = 'app' | 'video' | 'game' | 'learning' | 'collect' | 'chat'

export type ToolId = 'codex' | 'cursor' | 'trae' | 'claude'

export type FileKind = 'doc' | 'code' | 'sheet' | 'media' | 'summary'

/** AI 清洗后的摘要：正文 + 可选要点 */
export interface AiSummary {
  content: string
  keyPoints?: string[]
  generatedAt?: string
}

export interface KFolder {
  id: string
  spaceId: SpaceId
  parentId: string | null
  name: string
}

export interface KFile {
  id: string
  spaceId: SpaceId
  folderId: string
  title: string
  kind: FileKind
  tags: string[]
  starred: boolean // 重点
  aiSummary?: AiSummary // 存在即代表已清洗
  status: 'inbox' | 'organized' // 待整理 / 已归类
  updatedAt: string
  size: string
  accessCount: number
  lastAccessedAt: string // ISO 8601
  sourceTool?: ToolId // 由哪个 AI 工具的对话导入；手动上传时为空
}

export type ErrorStatus = 'open' | 'solved' | 'archived'
export type Severity = 'high' | 'medium' | 'low'

/** 一次错误发生的上下文记录 */
export interface ErrorContext {
  message: string
  reproductionPath?: string
  occurredAt: string // ISO 8601
}

export interface ErrorEntry {
  id: string
  spaceId: SpaceId
  title: string
  message: string // 最新一次的原始报错（等宽显示）
  env: string // 环境 / 工具版本
  rootCause?: string
  solution?: string
  status: ErrorStatus
  severity: Severity
  occurrenceCount: number
  contexts: ErrorContext[] // 历史记录，按时间倒序
  tags: string[]
  updatedAt: string
  fromConversationId?: string // 由 AI 对话自动提取
}

export interface Conversation {
  id: string
  spaceId: SpaceId // 归属空间：默认 chat，可归档到项目空间
  tool: ToolId
  title: string
  messageCount: number
  capturedAt: string
  summary?: AiSummary // 存在即代表已总结
  tags: string[]
  hasError: boolean // 检测到报错堆栈
}

// =============================================================================
// 元数据
// =============================================================================

export const TOOL_META: Record<ToolId, { label: string; className: string }> = {
  codex: { label: 'Codex', className: 'bg-foreground text-card' },
  cursor: { label: 'Cursor', className: 'bg-info/10 text-info' },
  trae: { label: 'Trae', className: 'bg-destructive/8 text-destructive' },
  claude: { label: 'Claude Code', className: 'bg-warning/10 text-warning' },
}

export const KIND_ICON: Record<FileKind, IconType> = { doc: FileText, code: FileCode2, sheet: FileSpreadsheet, media: Film, summary: Sparkles }

export const ERROR_STATUS_META: Record<ErrorStatus, { label: string; tone: Tone }> = {
  open: { label: '未解决', tone: 'danger' },
  solved: { label: '已解决', tone: 'success' },
  archived: { label: '已归档', tone: 'muted' },
}

export const SEVERITY_META: Record<Severity, { label: string; tone: Tone }> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'muted' },
}

// =============================================================================
// 工具函数
// =============================================================================

/** 相对时间：把 ISO 时间转成“刚刚 / N 小时前 / N 天前” */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  return `${month} 个月前`
}

/** 绝对时间：09-03 14:20 */
export function shortDateTime(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

// =============================================================================
// 小组件
// =============================================================================

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] transition-colors duration-150',
        FOCUS_RING,
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TagPill({ children }: { children: ReactNode }) {
  return <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{children}</span>
}

export function Badge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap', TONE_BADGE[tone], className)}>{children}</span>
}

/** 工具标识：统一的来源工具小徽标 */
export function ToolTag({ tool, className }: { tool: ToolId; className?: string }) {
  return <span className={cn('inline-flex h-5 items-center rounded px-1.5 text-[11px] font-medium', TOOL_META[tool].className, className)}>{TOOL_META[tool].label}</span>
}
