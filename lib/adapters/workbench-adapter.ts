/**
 * Workbench 适配器
 *
 * 把现有后端的 Task/Job/ModuleHealth 数据转换为 v0 生成的 Workbench 组件所需的格式
 */

import type { Job as BackendJob, Task as BackendTask, ModuleHealth, WorkbenchSummary } from '@/lib/api-client'
import { JobStatus as BackendJobStatus, TaskStatus, TaskPriority } from '@/lib/types'

// =============================================================================
// v0 Workbench 组件的类型定义（从 components/workbench.tsx 复制）
// =============================================================================

export type WorkbenchJobStatus =
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

export interface WorkbenchJob {
  id: string
  name: string
  project: string
  domain: Domain
  status: WorkbenchJobStatus
  step: string
  progress?: number
  heartbeat: string
  heartbeatStale?: boolean
  startedAt: string
  eta?: string
  note?: string
  logs: string[]
}

export interface WorkbenchService {
  id: string
  name: string
  scope: 'local' | 'cloud'
  status: ServiceStatus
  detail: string
  actionLabel?: string
}

export interface WorkbenchProject {
  id: string
  name: string
  domain: Domain
  updatedAt: string
  activeJobs: number
}

export interface WorkbenchAnnouncement {
  id: string
  text: string
  tone: 'info' | 'warning' | 'success'
  pinned: boolean
  publishedAt: string
}

export type PlanColumn = 'todo' | 'doing' | 'done'

export interface WorkbenchPlanCard {
  id: string
  title: string
  project: string
  domain: Domain
  due: string
  priority: 'high' | 'medium' | 'low'
  column: PlanColumn
}

// =============================================================================
// 状态映射
// =============================================================================

function mapJobStatus(backendStatus: BackendJobStatus): WorkbenchJobStatus {
  const mapping: Record<BackendJobStatus, WorkbenchJobStatus> = {
    [BackendJobStatus.QUEUED]: 'queued',
    [BackendJobStatus.STARTING]: 'running',
    [BackendJobStatus.RUNNING]: 'running',
    [BackendJobStatus.PAUSED]: 'paused',
    [BackendJobStatus.WAITING]: 'waiting_input',
    [BackendJobStatus.WAITING_INPUT]: 'waiting_input',
    [BackendJobStatus.WAITING_FOR_DEPENDENCY]: 'waiting_input',
    [BackendJobStatus.WAITING_AUTH]: 'permission_required',
    [BackendJobStatus.FAILED]: 'failed',
    [BackendJobStatus.SUCCEEDED]: 'success',
    [BackendJobStatus.CANCELED]: 'failed',
    [BackendJobStatus.STALE]: 'failed',
  }
  return mapping[backendStatus] || 'loading'
}

function mapModuleStatus(status: string): ServiceStatus {
  const mapping: Record<string, ServiceStatus> = {
    healthy: 'online',
    degraded: 'degraded',
    offline: 'offline',
    permission_required: 'permission_required',
    checking: 'loading',
  }
  return (mapping[status] as ServiceStatus) || 'offline'
}

function mapTaskPriority(priority: TaskPriority): 'high' | 'medium' | 'low' {
  const mapping: Record<TaskPriority, 'high' | 'medium' | 'low'> = {
    [TaskPriority.HIGH]: 'high',
    [TaskPriority.MEDIUM]: 'medium',
    [TaskPriority.LOW]: 'low',
  }
  return mapping[priority] || 'medium'
}

function mapTaskColumn(status: TaskStatus): PlanColumn {
  const mapping: Record<TaskStatus, PlanColumn> = {
    [TaskStatus.TODO]: 'todo',
    [TaskStatus.DONE]: 'done',
    [TaskStatus.BLOCKED]: 'doing',
    [TaskStatus.OVERDUE]: 'todo',
  }
  return mapping[status] || 'todo'
}

// =============================================================================
// 领域推断（从模块名推断领域）
// =============================================================================

function inferDomain(module: string): Domain {
  const lowerModule = module.toLowerCase()
  if (lowerModule.includes('video') || lowerModule.includes('render')) return 'video'
  if (lowerModule.includes('game') || lowerModule.includes('harmony')) return 'game'
  if (lowerModule.includes('app') || lowerModule.includes('electron')) return 'app'
  if (lowerModule.includes('knowledge') || lowerModule.includes('doc')) return 'knowledge'
  if (lowerModule.includes('skill')) return 'skill'
  return 'chat'
}

// =============================================================================
// 时间格式化
// =============================================================================

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const target = new Date(isoString)
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) return `${diffSec} 秒前`
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  return target.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// =============================================================================
// 适配器函数
// =============================================================================

export function adaptJob(job: BackendJob): WorkbenchJob {
  const domain = inferDomain(job.module)
  const status = mapJobStatus(job.status)

  // 根据状态生成 step 文案
  let step = job.type
  if (job.progress > 0 && job.progress < 100) {
    step = `进度 ${job.progress}%`
  } else if (job.errorMessage) {
    step = job.errorMessage.substring(0, 30)
  }

  // 心跳是否过期（超过 5 分钟）
  const heartbeatMs = new Date().getTime() - new Date(job.lastHeartbeat).getTime()
  const heartbeatStale = heartbeatMs > 5 * 60 * 1000

  return {
    id: job.id,
    name: job.title,
    project: job.projectId || '默认项目',
    domain,
    status,
    step,
    progress: job.progress > 0 ? job.progress : undefined,
    heartbeat: formatRelativeTime(job.lastHeartbeat),
    heartbeatStale,
    startedAt: job.startedAt ? formatTime(job.startedAt) : '—',
    eta: job.eta,
    note: job.errorMessage,
    logs: job.logs,
  }
}

export function adaptModule(module: ModuleHealth): WorkbenchService {
  return {
    id: module.id,
    name: module.name,
    scope: 'local', // 目前后端没有 cloud/local 区分，默认 local
    status: mapModuleStatus(module.status),
    detail: module.statusText + (module.errorMessage ? ` · ${module.errorMessage}` : ''),
    actionLabel: module.canReconnect ? '重新连接' : undefined,
  }
}

export function adaptTask(task: BackendTask): WorkbenchPlanCard {
  const domain = inferDomain(task.module)

  return {
    id: task.id,
    title: task.title,
    project: task.projectId || '默认项目',
    domain,
    due: task.dueDate ? formatRelativeTime(task.dueDate) : '未设置',
    priority: mapTaskPriority(task.priority),
    column: mapTaskColumn(task.status),
  }
}

export function adaptWorkbenchSummaryToAnnouncements(summary: WorkbenchSummary): WorkbenchAnnouncement[] {
  return summary.needsAttention.map((item, index) => ({
    id: `announcement-${item.id}`,
    text: `${item.title}：${item.message}`,
    tone: item.type === 'module' ? 'warning' : 'info' as 'info' | 'warning' | 'success',
    pinned: item.retryable,
    publishedAt: '刚刚',
  }))
}

// =============================================================================
// 聚合函数（从后端数据生成前端需要的聚合数据）
// =============================================================================

export function aggregateProjects(tasks: BackendTask[], jobs: BackendJob[]): WorkbenchProject[] {
  const projectMap = new Map<string, WorkbenchProject>()

  // 从 tasks 收集项目
  for (const task of tasks) {
    const pid = task.projectId || 'default'
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        id: pid,
        name: pid === 'default' ? '默认项目' : pid,
        domain: inferDomain(task.module),
        updatedAt: formatRelativeTime(task.updatedAt),
        activeJobs: 0,
      })
    }
  }

  // 从 jobs 计算活跃作业数
  for (const job of jobs) {
    const pid = job.projectId || 'default'
    const project = projectMap.get(pid)
    if (project && [BackendJobStatus.RUNNING, BackendJobStatus.QUEUED, BackendJobStatus.STARTING].includes(job.status)) {
      project.activeJobs++
    }

    // 更新项目时间
    if (project) {
      const jobTime = new Date(job.updatedAt).getTime()
      const projectTime = new Date(project.updatedAt).getTime()
      if (jobTime > projectTime) {
        project.updatedAt = formatRelativeTime(job.updatedAt)
      }
    }
  }

  return Array.from(projectMap.values())
}
