'use client'

// 这是重构后的精简版 workbench.tsx
// 使用所有已提取的模块

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

// 导入所有已提取的模块
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
  creationDomain,
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

// 临时：这些组件暂未提取，保留在主文件中
// TODO: 后续可以继续提取 Inspector、PlanBoard 等组件

