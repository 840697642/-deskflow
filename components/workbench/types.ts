import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'

// =============================================================================
// 基础类型
// =============================================================================

export type IconType = ComponentType<LucideProps>

export type Tone = 'primary' | 'info' | 'warning' | 'success' | 'danger' | 'muted'

export type Domain = 'video' | 'game' | 'app' | 'chat' | 'knowledge' | 'skill'

// =============================================================================
// 任务和服务状态
// =============================================================================

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

export interface StatusMeta {
  label: string
  icon: IconType
  tone: Tone
  spin?: boolean
}

// =============================================================================
// 核心数据模型
// =============================================================================

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

// =============================================================================
// UI 组件类型
// =============================================================================

/** 轻提示 */
export interface Toast {
  id: number
  title: string
  description?: string
  tone: 'success' | 'info' | 'warning' | 'danger'
}

export interface ConfirmState {
  title: string
  description: string
  confirmLabel?: string
  confirmTone?: 'primary' | 'danger'
  onConfirm: () => void
}

export interface NavItem {
  id: string
  label: string
  icon: IconType
  badge?: number
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// =============================================================================
// 视图和筛选
// =============================================================================

export type View =
  | 'focus'
  | 'queue'
  | 'plan'
  | 'knowledge'
  | 'services'
  | 'projects'
  | 'changelog'
  | 'skills'
  | 'logs'
  | 'settings'
  | 'video'
  | 'game'
  | 'app'

export type Filter = 'all' | 'running' | 'waiting_input' | 'failed' | 'success'

export interface FilterOption {
  id: Filter
  label: string
  match: (status: JobStatus) => boolean
}

// =============================================================================
// 时间线
// =============================================================================

export type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later'

export interface TimelineItem {
  id: string
  kind: 'plan' | 'job'
  title: string
  time: string
  bucket: Bucket
  domain: Domain
  status?: JobStatus
  progress?: number
}

// =============================================================================
// 开发日志
// =============================================================================

export type ChangeKind = 'ui' | 'interaction' | 'contract' | 'rename'

export interface ContractField {
  name: string
  type: string
  optional?: boolean
}

export interface ContractAction {
  action: string
  trigger: string
  result: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  kinds: ChangeKind[]
  summary: string
  sections?: {
    title: string
    changes: string[]
  }[]
  contract?: {
    fields?: ContractField[]
    actions?: ContractAction[]
  }
}

// =============================================================================
// 任务操作
// =============================================================================

export type JobAction = 'pause' | 'resume' | 'cancel' | 'retry' | 'logs' | 'authorize' | 'input' | 'open'

// =============================================================================
// 组件 Props
// =============================================================================

export interface WorkbenchProps {
  onDataLoaded?: (counts: { tasks: number; jobs: number; modules: number }) => void
}

export interface DomainMeta {
  label: string
  icon: IconType
  className: string
}

export interface ViewMeta {
  title: string
  description: string
}

export interface ColumnConfig {
  id: PlanColumn
  label: string
  tone: Tone
}

export interface PriorityMeta {
  label: string
  tone: Tone
}

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger'
