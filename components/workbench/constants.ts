import {
  AppWindow,
  BookOpen,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  Clapperboard,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Hourglass,
  Loader2,
  Lock,
  MessageSquareMore,
  Pause,
  Sparkles,
  TriangleAlert,
  WifiOff,
} from 'lucide-react'
import type {
  Tone,
  StatusMeta,
  JobStatus,
  ServiceStatus,
  Domain,
  DomainMeta,
  FilterOption,
  View,
  ViewMeta,
  ChangeKind,
  Bucket,
  ColumnConfig,
  PriorityMeta,
  IconType,
} from './types'

// =============================================================================
// 样式常量
// =============================================================================

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

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

// =============================================================================
// 状态元数据
// =============================================================================

export const STATUS_META: Record<JobStatus | ServiceStatus, StatusMeta> = {
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

export const DOMAIN_META: Record<Domain, DomainMeta> = {
  video: { label: 'AI 视频', icon: Clapperboard, className: 'text-warning' },
  game: { label: '鸿蒙游戏', icon: Gamepad2, className: 'text-technical' },
  app: { label: '应用开发', icon: AppWindow, className: 'text-technical' },
  chat: { label: 'AI 对话', icon: MessageSquareMore, className: 'text-muted-foreground' },
  knowledge: { label: '知识库', icon: BookOpen, className: 'text-muted-foreground' },
  skill: { label: '技能', icon: Sparkles, className: 'text-muted-foreground' },
}

// =============================================================================
// 筛选器
// =============================================================================

export const FILTERS: FilterOption[] = [
  { id: 'all', label: '全部', match: () => true },
  { id: 'running', label: '运行中', match: (s) => s === 'running' || s === 'paused' },
  { id: 'waiting_input', label: '需处理', match: (s) => s === 'waiting_input' || s === 'permission_required' },
  { id: 'failed', label: '失败', match: (s) => s === 'failed' },
  { id: 'success', label: '已完成', match: (s) => s === 'success' },
]

// =============================================================================
// 视图映射
// =============================================================================

export const NAV_VIEW: Record<string, View> = {
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

export const VIEW_META: Record<View, ViewMeta> = {
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
// 计划看板
// =============================================================================

export const PLAN_COLUMNS: ColumnConfig[] = [
  { id: 'todo', label: '待办', tone: 'muted' },
  { id: 'doing', label: '进行中', tone: 'primary' },
  { id: 'done', label: '已完成', tone: 'success' },
]

export const PRIORITY_META: Record<'high' | 'medium' | 'low', PriorityMeta> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'muted' },
}

// =============================================================================
// 知识库
// =============================================================================

export const DOC_KIND_ICON: Record<'doc' | 'code' | 'sheet', IconType> = {
  doc: FileText,
  code: FileCode2,
  sheet: FileSpreadsheet,
}

// 公告色调映射
export const ANN_TONE: Record<'info' | 'warning' | 'success', Tone> = {
  info: 'info',
  warning: 'warning',
  success: 'success',
}

// =============================================================================
// 开发日志
// =============================================================================

export const CHANGE_KIND_META: Record<ChangeKind, { label: string; tone: Tone }> = {
  contract: { label: '数据契约', tone: 'primary' },
  interaction: { label: '交互', tone: 'success' },
  ui: { label: '界面', tone: 'muted' },
  rename: { label: '命名变更', tone: 'warning' },
}

// =============================================================================
// 时间线 / 今日焦点
// =============================================================================

/** 演示用的"今天"日期；接入后端后请改用真实日期 */
export const TODAY = { month: 9, day: 4, weekday: '星期三' }

export const TODAY_ISO = '2026-09-04'

export const BUCKET_META: Record<Bucket, { label: string; tone: Tone }> = {
  overdue: { label: '已逾期', tone: 'danger' },
  today: { label: '今天', tone: 'primary' },
  tomorrow: { label: '明天', tone: 'info' },
  week: { label: '本周', tone: 'muted' },
  later: { label: '之后', tone: 'muted' },
}

export const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later']

/** 需要处理的任务：失败 > 需授权 > 等待输入 > 无响应 */
export const ATTENTION_RANK: Partial<Record<JobStatus, number>> = {
  failed: 0,
  permission_required: 1,
  waiting_input: 2,
}

// =============================================================================
// 工具函数
// =============================================================================

/**
 * 将日期字符串转换为时间桶
 * @param due 日期字符串，格式如 "9 月 4 日"
 * @returns 时间桶标识
 */
export function bucketOf(due: string): Bucket {
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
