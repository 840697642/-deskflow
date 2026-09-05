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
  HardDrive,
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

// =============================================================================
// 类型定义（占位类型，后续可直接替换为真实 API 响应类型）
// =============================================================================

type IconType = ComponentType<LucideProps>

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
