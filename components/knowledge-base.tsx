'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AppWindow,
  ArrowRight,
  BookOpen,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  Copy,
  Eye,
  EyeOff,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  GraduationCap,
  Inbox,
  KeyRound,
  Link2,
  MessageSquareMore,
  Plug,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  Upload,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Button,
  Dialog,
  EmptyState,
  FOCUS_RING,
  IconButton,
  TONE_BADGE,
  TONE_BAR,
  TONE_TEXT,
  type IconType,
  type Toast,
  type Tone,
} from '@/components/workbench'
import {
  archiveKnowledgeConversation,
  createKnowledgeApiKey,
  fetchKnowledgeApiKeys,
  fetchKnowledgeConversations,
  fetchKnowledgeErrors,
  fetchKnowledgeFiles,
  fetchKnowledgeFolders,
  fetchKnowledgeSpaces,
  summarizeKnowledgeConversation,
  summarizeKnowledgeFile,
  updateKnowledgeError,
  updateKnowledgeFile,
  ApiError,
} from '@/lib/api-client'
import type { ApiKey } from '@/lib/types/knowledge'
import { ErrorStatus as BackendErrorStatus, FilePriority } from '@/lib/types/knowledge'
import {
  adaptKnowledgeConversation,
  adaptKnowledgeError,
  adaptKnowledgeFile,
  adaptKnowledgeFolder,
  adaptKnowledgeSpace,
} from '@/lib/adapters/knowledge-adapter'

// =============================================================================
// 类型定义（占位；接入后端时替换为 API 类型）
// =============================================================================

/** 空间：项目空间彼此隔离，通用空间与项目空间隔离 */
export type SpaceId = string

export interface Space {
  id: SpaceId
  name: string
  group: 'project' | 'general'
  icon: IconType
  className: string
  description: string
}

export interface KFolder {
  id: string
  spaceId: SpaceId
  parentId: string | null
  name: string
}

export type FileKind = 'doc' | 'code' | 'sheet' | 'media' | 'summary'

export interface KFile {
  id: string
  spaceId: SpaceId
  folderId: string
  title: string
  kind: FileKind
  tags: string[]
  starred: boolean // 重点
  aiSummary?: string // AI 清洗总结后的内容（存在即代表已清洗）
  status: 'inbox' | 'organized' // 待整理 / 已归类
  updatedAt: string
  size: string
}

export type ErrorStatus = 'open' | 'solved' | 'archived'
export type Severity = 'high' | 'medium' | 'low'

export interface ErrorEntry {
  id: string
  spaceId: SpaceId
  title: string
  message: string // 原始报错（等宽显示）
  env: string // 环境 / 工具版本
  rootCause?: string
  fix?: string
  status: ErrorStatus
  severity: Severity
  occurrences: number
  tags: string[]
  updatedAt: string
  fromConversationId?: string // 由 AI 对话自动提取
}

export type ToolId = 'codex' | 'cursor' | 'trae' | 'claude'

export interface Conversation {
  id: string
  spaceId: SpaceId // 归属空间：默认 chat，可归档到项目空间
  tool: ToolId
  title: string
  messages: number
  capturedAt: string
  summarized: boolean
  tags: string[]
  hasError: boolean // 检测到报错堆栈
}

interface ToolConnection {
  id: ToolId
  name: string
  method: 'REST' | 'MCP' | 'CLI Hook'
  status: 'connected' | 'pending' | 'disconnected'
  lastSync?: string
  captured: number
}

// =============================================================================
// Mock 数据
// =============================================================================

const SPACES: Space[] = [
  { id: 'app', name: '应用开发', group: 'project', icon: AppWindow, className: 'text-technical', description: '轻记账等应用项目的需求、接口、测试与发布文档。' },
  { id: 'video', name: 'AI 视频', group: 'project', icon: Clapperboard, className: 'text-warning', description: '世界观、分镜脚本、提示词与素材。' },
  { id: 'game', name: '游戏开发', group: 'project', icon: Gamepad2, className: 'text-technical', description: '鸿蒙游戏的策划、规范、关卡数据与签名发布。' },
  { id: 'learning', name: '日常学习', group: 'general', icon: GraduationCap, className: 'text-info', description: '课程笔记、阅读摘录与技术学习。' },
  { id: 'collect', name: '收集箱', group: 'general', icon: Inbox, className: 'text-muted-foreground', description: '网页剪藏与尚未分类的资料。' },
  { id: 'chat', name: 'AI 对话', group: 'general', icon: MessageSquareMore, className: 'text-primary', description: '从 Codex / Cursor / Trae 等工具自动采集的对话。' },
]

const FOLDERS: KFolder[] = [
  // 应用开发
  { id: 'f-app-req', spaceId: 'app', parentId: null, name: '需求与设计' },
  { id: 'f-app-api', spaceId: 'app', parentId: null, name: '接口文档' },
  { id: 'f-app-api-auth', spaceId: 'app', parentId: 'f-app-api', name: '认证' },
  { id: 'f-app-api-ledger', spaceId: 'app', parentId: 'f-app-api', name: '记账' },
  { id: 'f-app-test', spaceId: 'app', parentId: null, name: '测试' },
  { id: 'f-app-release', spaceId: 'app', parentId: null, name: '发布' },
  // AI 视频
  { id: 'f-vid-world', spaceId: 'video', parentId: null, name: '世界观设定' },
  { id: 'f-vid-story', spaceId: 'video', parentId: null, name: '分镜脚本' },
  { id: 'f-vid-story-s1', spaceId: 'video', parentId: 'f-vid-story', name: '第一季' },
  { id: 'f-vid-prompt', spaceId: 'video', parentId: null, name: '提示词库' },
  { id: 'f-vid-asset', spaceId: 'video', parentId: null, name: '素材清单' },
  // 游戏开发
  { id: 'f-game-design', spaceId: 'game', parentId: null, name: '策划案' },
  { id: 'f-game-spec', spaceId: 'game', parentId: null, name: 'ArkTS 规范' },
  { id: 'f-game-level', spaceId: 'game', parentId: null, name: '关卡数据' },
  { id: 'f-game-sign', spaceId: 'game', parentId: null, name: '签名与发布' },
  // 日常学习
  { id: 'f-learn-harmony', spaceId: 'learning', parentId: null, name: '鸿蒙开发' },
  { id: 'f-learn-ai', spaceId: 'learning', parentId: null, name: 'AI 工作流' },
  { id: 'f-learn-read', spaceId: 'learning', parentId: null, name: '阅读笔记' },
  // 收集箱
  { id: 'f-col-web', spaceId: 'collect', parentId: null, name: '网页剪藏' },
  { id: 'f-col-todo', spaceId: 'collect', parentId: null, name: '待分类' },
  // AI 对话（按工具）
  { id: 'f-chat-codex', spaceId: 'chat', parentId: null, name: 'Codex' },
  { id: 'f-chat-cursor', spaceId: 'chat', parentId: null, name: 'Cursor' },
  { id: 'f-chat-trae', spaceId: 'chat', parentId: null, name: 'Trae' },
  { id: 'f-chat-claude', spaceId: 'chat', parentId: null, name: 'Claude Code' },
]

const FILES: KFile[] = [
  { id: 'k-1', spaceId: 'app', folderId: 'f-app-api-auth', title: '华为账号登录接入方案', kind: 'doc', tags: ['认证', '鸿蒙'], starred: true, aiSummary: '接入流程分三步：申请 Client ID → 配置 scope → 换取 unionId。注意 refresh token 有效期 30 天，需在后台静默刷新；沙箱环境与正式环境的 redirect URI 不可混用。', status: 'organized', updatedAt: '2 小时前', size: '36 KB' },
  { id: 'k-2', spaceId: 'app', folderId: 'f-app-api-ledger', title: 'LedgerService 接口定义 v2', kind: 'code', tags: ['接口', '记账'], starred: true, status: 'organized', updatedAt: '昨天', size: '18 KB' },
  { id: 'k-3', spaceId: 'app', folderId: 'f-app-test', title: 'LedgerService 测试用例矩阵', kind: 'sheet', tags: ['测试'], starred: false, aiSummary: '共 42 条用例，覆盖新增 / 修改 / 删除 / 汇总四类操作；其中 6 条涉及跨月边界，是历史上失败率最高的分组。', status: 'organized', updatedAt: '26 分钟前', size: '96 KB' },
  { id: 'k-4', spaceId: 'app', folderId: 'f-app-req', title: '轻记账 PRD 1.3', kind: 'doc', tags: ['需求'], starred: false, status: 'organized', updatedAt: '3 天前', size: '210 KB' },
  { id: 'k-5', spaceId: 'app', folderId: 'f-app-release', title: '应用市场上架检查清单（导入）', kind: 'doc', tags: [], starred: false, status: 'inbox', updatedAt: '刚刚', size: '12 KB' },
  { id: 'k-6', spaceId: 'video', folderId: 'f-vid-world', title: '《山海拾遗》世界观设定集', kind: 'doc', tags: ['设定', '角色'], starred: true, aiSummary: '三大势力、七位主角、两条时间线。核心冲突围绕“拾遗人”与“守山者”对古物归属的分歧；第一季只展开东荒线。', status: 'organized', updatedAt: '昨天', size: '1.2 MB' },
  { id: 'k-7', spaceId: 'video', folderId: 'f-vid-story-s1', title: '第 3 集分镜脚本', kind: 'doc', tags: ['分镜', 'S1'], starred: true, status: 'organized', updatedAt: '今天 09:12', size: '64 KB' },
  { id: 'k-8', spaceId: 'video', folderId: 'f-vid-story-s1', title: '第 4 集分镜脚本（草稿）', kind: 'doc', tags: ['分镜', 'S1'], starred: false, status: 'organized', updatedAt: '今天 10:40', size: '41 KB' },
  { id: 'k-9', spaceId: 'video', folderId: 'f-vid-prompt', title: '分镜提示词模板库', kind: 'code', tags: ['提示词'], starred: true, aiSummary: '按镜头类型分 12 组模板；远景与特写模板的负面提示词差异最大。建议把“角色一致性”片段抽成公共前缀。', status: 'organized', updatedAt: '5 小时前', size: '14 KB' },
  { id: 'k-10', spaceId: 'video', folderId: 'f-vid-asset', title: '云 TTS 音色对照表', kind: 'sheet', tags: ['音频'], starred: false, status: 'organized', updatedAt: '1 周前', size: '31 KB' },
  { id: 'k-11', spaceId: 'video', folderId: 'f-vid-asset', title: '第 2 集成片 v3', kind: 'media', tags: ['成片'], starred: false, status: 'organized', updatedAt: '2 天前', size: '840 MB' },
  { id: 'k-12', spaceId: 'game', folderId: 'f-game-spec', title: '鸿蒙 ArkTS 编码规范 v3', kind: 'doc', tags: ['规范', 'ArkTS'], starred: true, aiSummary: '相较 v2 新增 14 条规则，重点是状态管理装饰器的使用边界与并发任务的取消约定。违反最多的是 @Link 跨层传递。', status: 'organized', updatedAt: '2 小时前', size: '48 KB' },
  { id: 'k-13', spaceId: 'game', folderId: 'f-game-sign', title: 'HAP 签名与发布流程', kind: 'doc', tags: ['发布', '签名'], starred: true, status: 'organized', updatedAt: '3 天前', size: '22 KB' },
  { id: 'k-14', spaceId: 'game', folderId: 'f-game-level', title: '关卡 1-10 数值表', kind: 'sheet', tags: ['数值'], starred: false, status: 'organized', updatedAt: '昨天', size: '58 KB' },
  { id: 'k-15', spaceId: 'game', folderId: 'f-game-design', title: '塔防核心循环策划案', kind: 'doc', tags: ['策划'], starred: false, aiSummary: '核心循环：布防 → 波次 → 结算 → 升级。数值节奏建议每 5 波一个小高潮；当前草案 7-8 波难度断层需要平滑。', status: 'organized', updatedAt: '5 天前', size: '120 KB' },
  { id: 'k-16', spaceId: 'learning', folderId: 'f-learn-harmony', title: 'ArkUI 状态管理学习笔记', kind: 'doc', tags: ['鸿蒙', '笔记'], starred: false, aiSummary: '@State / @Prop / @Link / @Provide 的适用场景对照与常见误用。', status: 'organized', updatedAt: '昨天', size: '20 KB' },
  { id: 'k-17', spaceId: 'learning', folderId: 'f-learn-ai', title: '多智能体工作流设计模式', kind: 'doc', tags: ['AI', '架构'], starred: true, status: 'organized', updatedAt: '4 天前', size: '33 KB' },
  { id: 'k-18', spaceId: 'collect', folderId: 'f-col-web', title: 'HarmonyOS NEXT 发布会要点（剪藏）', kind: 'doc', tags: [], starred: false, status: 'inbox', updatedAt: '今天 08:30', size: '9 KB' },
  { id: 'k-19', spaceId: 'collect', folderId: 'f-col-todo', title: 'Sora 提示词技巧合集', kind: 'doc', tags: [], starred: false, status: 'inbox', updatedAt: '昨天', size: '6 KB' },
]

const ERRORS: ErrorEntry[] = [
  { id: 'e-1', spaceId: 'app', title: '跨月汇总时金额精度丢失', message: 'AssertionError: expected 1234.56 to equal 1234.5600000000002\n  at LedgerService.sumByMonth (ledger.service.ts:142)', env: 'Node 20 · Jest 29', rootCause: '浮点数直接相加；汇总链路未统一使用 Decimal。', fix: '入库与计算统一使用整数分；展示层再格式化。', status: 'solved', severity: 'high', occurrences: 3, tags: ['测试', '记账', '精度'], updatedAt: '昨天' },
  { id: 'e-2', spaceId: 'app', title: '华为账号登录回调 redirect_uri_mismatch', message: 'HTTP 400 { "error": "redirect_uri_mismatch" }', env: '鸿蒙 NEXT · 沙箱环境', status: 'open', severity: 'high', occurrences: 2, tags: ['认证', '鸿蒙'], updatedAt: '2 小时前', fromConversationId: 'c-2' },
  { id: 'e-3', spaceId: 'video', title: '云渲染排队后任务丢失', message: 'RenderJob 8821 not found after requeue (ttl expired)', env: '云渲染集群 · 维护窗口', rootCause: '维护期间队列 TTL 为 30 分钟，超时未消费即丢弃。', status: 'open', severity: 'medium', occurrences: 1, tags: ['渲染', '云服务'], updatedAt: '今天 09:00' },
  { id: 'e-4', spaceId: 'game', title: 'HAP 签名校验失败', message: 'error: 9568320 signature verification failed\n  hvigor: sign task aborted', env: 'DevEco Studio 5.0 · hvigor 5', rootCause: '使用了调试证书签发布包。', fix: '在 build-profile.json5 中为 release 指定发布证书与 profile。', status: 'solved', severity: 'high', occurrences: 4, tags: ['签名', '发布'], updatedAt: '3 天前' },
  { id: 'e-5', spaceId: 'game', title: '@Link 跨层传递导致渲染循环', message: 'Warning: Maximum update depth exceeded in LevelEditor', env: 'ArkTS · API 12', status: 'open', severity: 'medium', occurrences: 2, tags: ['ArkTS', '状态管理'], updatedAt: '昨天', fromConversationId: 'c-4' },
  { id: 'e-6', spaceId: 'game', title: '旧版 hvigor 缓存导致资源未更新', message: 'resources/base/media/*.png stale in build cache', env: 'hvigor 4.x', rootCause: '升级 hvigor 后未清理缓存。', fix: 'hvigorw clean 后重新构建。', status: 'archived', severity: 'low', occurrences: 1, tags: ['构建'], updatedAt: '2 周前' },
]

const CONVERSATIONS: Conversation[] = [
  { id: 'c-1', spaceId: 'app', tool: 'codex', title: '重构 LedgerService 汇总逻辑使用整数分', messages: 24, capturedAt: '今天 10:12', summarized: true, tags: ['记账', '重构'], hasError: false },
  { id: 'c-2', spaceId: 'app', tool: 'cursor', title: '排查华为账号登录 redirect_uri_mismatch', messages: 17, capturedAt: '2 小时前', summarized: false, tags: ['认证'], hasError: true },
  { id: 'c-3', spaceId: 'video', tool: 'claude', title: '第 4 集分镜节奏调整建议', messages: 9, capturedAt: '今天 10:45', summarized: true, tags: ['分镜'], hasError: false },
  { id: 'c-4', spaceId: 'game', tool: 'trae', title: 'LevelEditor 渲染循环问题定位', messages: 31, capturedAt: '昨天 21:30', summarized: false, tags: ['ArkTS'], hasError: true },
  { id: 'c-5', spaceId: 'chat', tool: 'codex', title: '对比三种向量数据库的本地部署方案', messages: 12, capturedAt: '昨天 16:00', summarized: true, tags: ['AI', '基础设施'], hasError: false },
  { id: 'c-6', spaceId: 'chat', tool: 'cursor', title: '写一个批量重命名脚本', messages: 5, capturedAt: '3 天前', summarized: false, tags: [], hasError: false },
]

const TOOLS: ToolConnection[] = [
  { id: 'codex', name: 'Codex', method: 'CLI Hook', status: 'connected', lastSync: '5 分钟前', captured: 128 },
  { id: 'cursor', name: 'Cursor', method: 'REST', status: 'connected', lastSync: '2 小时前', captured: 86 },
  { id: 'trae', name: 'Trae', method: 'REST', status: 'pending', captured: 12 },
  { id: 'claude', name: 'Claude Code', method: 'MCP', status: 'connected', lastSync: '刚刚', captured: 203 },
]

const TOOL_META: Record<ToolId, { label: string; className: string }> = {
  codex: { label: 'Codex', className: 'bg-foreground text-card' },
  cursor: { label: 'Cursor', className: 'bg-info/10 text-info' },
  trae: { label: 'Trae', className: 'bg-destructive/8 text-destructive' },
  claude: { label: 'Claude Code', className: 'bg-warning/10 text-warning' },
}

const KIND_ICON: Record<FileKind, IconType> = { doc: FileText, code: FileCode2, sheet: FileSpreadsheet, media: Film, summary: Sparkles }

const ERROR_STATUS_META: Record<ErrorStatus, { label: string; tone: Tone }> = {
  open: { label: '未解决', tone: 'danger' },
  solved: { label: '已解决', tone: 'success' },
  archived: { label: '已归档', tone: 'muted' },
}

const SEVERITY_META: Record<Severity, { label: string; tone: Tone }> = {
  high: { label: '高', tone: 'danger' },
  medium: { label: '中', tone: 'warning' },
  low: { label: '低', tone: 'muted' },
}

const CONNECTION_META: Record<ToolConnection['status'], { label: string; tone: Tone }> = {
  connected: { label: '已连接', tone: 'success' },
  pending: { label: '待配置', tone: 'warning' },
  disconnected: { label: '未连接', tone: 'muted' },
}

const API_ENDPOINT = 'https://kb.no1-3mode.local/api/v1/conversations'
const API_KEY_PLACEHOLDER = '未生成 API Key'

// =============================================================================
// 小组件
// =============================================================================

function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[13px] transition-colors duration-150',
        FOCUS_RING,
        active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

function TagPill({ children }: { children: ReactNode }) {
  return <span className="rounded px-1.5 py-0.5 text-[11px] bg-muted text-muted-foreground">{children}</span>
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', TONE_BADGE[tone])}>{children}</span>
}

function CodeBlock({ code, onCopy }: { code: string; onCopy?: () => void }) {
  return (
    <div className="relative rounded-lg bg-foreground p-4">
      <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-card whitespace-pre">{code}</pre>
      {onCopy && (
        <button
          type="button"
          aria-label="复制代码"
          onClick={onCopy}
          className={cn('absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-md text-card/60 hover:bg-card/10 hover:text-card', FOCUS_RING)}
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        <span className="block text-[11px] leading-relaxed text-muted-foreground text-pretty">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors duration-150', FOCUS_RING, checked ? 'bg-primary' : 'bg-border')}
      >
        <span aria-hidden="true" className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-card shadow-sm transition-transform duration-150', checked && 'translate-x-4')} />
      </button>
    </label>
  )
}

// =============================================================================
// 目录树
// =============================================================================

function FolderTree({
  folders,
  fileCounts,
  selected,
  onSelect,
}: {
  folders: KFolder[]
  fileCounts: Record<string, number>
  selected: string | null
  onSelect: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.filter((f) => f.parentId === null).map((f) => f.id)))
  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const total = Object.values(fileCounts).reduce((a, b) => a + b, 0)

  // 含子目录的累计文件数
  const countDeep = (id: string): number => (fileCounts[id] ?? 0) + folders.filter((f) => f.parentId === id).reduce((a, f) => a + countDeep(f.id), 0)

  const render = (parentId: string | null, depth: number) =>
    folders
      .filter((f) => f.parentId === parentId)
      .map((f) => {
        const children = folders.filter((c) => c.parentId === f.id)
        const open = expanded.has(f.id)
        const active = selected === f.id
        const Icon = open && children.length ? FolderOpen : Folder
        return (
          <li key={f.id}>
            <div
              className={cn('group flex h-8 items-center gap-1 rounded-md pr-2 text-[13px] transition-colors duration-150', active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-surface-raised')}
              style={{ paddingLeft: 8 + depth * 14 }}
            >
              {children.length > 0 ? (
                <button type="button" aria-label={open ? '收起' : '展开'} aria-expanded={open} onClick={() => toggle(f.id)} className={cn('inline-flex size-5 items-center justify-center rounded text-muted-foreground', FOCUS_RING)}>
                  {open ? <ChevronDown className="size-3.5" aria-hidden="true" /> : <ChevronRight className="size-3.5" aria-hidden="true" />}
                </button>
              ) : (
                <span className="size-5" aria-hidden="true" />
              )}
              <button type="button" aria-current={active ? 'true' : undefined} onClick={() => onSelect(f.id)} className={cn('flex min-w-0 flex-1 items-center gap-2 rounded text-left', FOCUS_RING)}>
                <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
                <span className="truncate">{f.name}</span>
              </button>
              <span className="text-[11px] tabular-nums text-muted-foreground">{countDeep(f.id)}</span>
            </div>
            {open && children.length > 0 && <ul>{render(f.id, depth + 1)}</ul>}
          </li>
        )
      })

  return (
    <ul aria-label="目录树" className="flex flex-col gap-0.5">
      <li>
        <button
          type="button"
          aria-current={selected === null ? 'true' : undefined}
          onClick={() => onSelect(null)}
          className={cn('flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] transition-colors duration-150', FOCUS_RING, selected === null ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-surface-raised')}
        >
          <BookOpen className={cn('size-4', selected === null ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true" />
          <span className="flex-1 text-left">全部文件</span>
          <span className="text-[11px] font-normal tabular-nums text-muted-foreground">{total}</span>
        </button>
      </li>
      {render(null, 0)}
    </ul>
  )
}

// =============================================================================
// 主组件
// =============================================================================

type Tab = 'files' | 'errors' | 'chats' | 'ingest'
type FileFilter = 'all' | 'starred' | 'summarized' | 'inbox'

export default function KnowledgeBase({ onToast }: { onToast: (t: Omit<Toast, 'id'>) => void }) {
  const [spaceId, setSpaceId] = useState<SpaceId>('')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [folderId, setFolderId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('files')
  const [files, setFiles] = useState<KFile[]>([])
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [chats, setChats] = useState<Conversation[]>([])
  const [folders, setFolders] = useState<KFolder[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>()
  const [fileFilter, setFileFilter] = useState<FileFilter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [errorStatus, setErrorStatus] = useState<ErrorStatus | 'all'>('open')
  const [toolFilter, setToolFilter] = useState<ToolId | 'all'>('all')
  const [detail, setDetail] = useState<KFile | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [rules, setRules] = useState({ autoSpace: true, autoSummary: true, autoError: true, dedupe: true, redact: true })

  const loadData = useCallback(async (requestedSpaceId?: string) => {
    setLoading(true)
    setLoadError(undefined)
    try {
      const remoteSpaces = (await fetchKnowledgeSpaces()).map(adaptKnowledgeSpace)
      const activeSpaceId = requestedSpaceId ?? remoteSpaces[0]?.id
      if (!activeSpaceId) {
        setSpaces([])
        setFiles([])
        setErrors([])
        setChats([])
        setFolders([])
        return
      }
      const [remoteFiles, remoteErrors, remoteChats, remoteFolders, remoteKeys] = await Promise.all([
        fetchKnowledgeFiles({ spaceId: activeSpaceId }),
        fetchKnowledgeErrors({ spaceId: activeSpaceId }),
        fetchKnowledgeConversations({ spaceId: activeSpaceId }),
        fetchKnowledgeFolders({ spaceId: activeSpaceId }),
        fetchKnowledgeApiKeys(),
      ])
      setSpaces(remoteSpaces)
      setSpaceId(activeSpaceId)
      setFiles(remoteFiles.map(adaptKnowledgeFile))
      setErrors(remoteErrors.map(adaptKnowledgeError))
      setChats(remoteChats.map(adaptKnowledgeConversation))
      setFolders(remoteFolders.map(adaptKnowledgeFolder))
      setApiKeys(remoteKeys)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : '知识库加载失败，请重试'
      setLoadError(message)
      onToast({ tone: 'danger', title: '知识库加载失败', description: message })
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const space = spaces.find((s) => s.id === spaceId) ?? spaces[0] ?? SPACES[0]
  const spaceFolders = useMemo(() => folders.filter((f) => f.spaceId === spaceId), [folders, spaceId])
  const spaceFiles = useMemo(() => files.filter((f) => f.spaceId === spaceId), [files, spaceId])
  const spaceErrors = useMemo(() => errors.filter((e) => e.spaceId === spaceId), [errors, spaceId])
  const spaceChats = useMemo(() => chats.filter((c) => c.spaceId === spaceId), [chats, spaceId])

  const fileCounts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const f of spaceFiles) m[f.folderId] = (m[f.folderId] ?? 0) + 1
    return m
  }, [spaceFiles])

  // 子目录集合，用于“选中父目录时显示子目录文件”
  const descendantIds = useMemo(() => {
    if (!folderId) return null
    const set = new Set<string>([folderId])
    let grew = true
    while (grew) {
      grew = false
      for (const f of spaceFolders) if (f.parentId && set.has(f.parentId) && !set.has(f.id)) { set.add(f.id); grew = true }
    }
    return set
  }, [folderId, spaceFolders])

  const allTags = useMemo(() => Array.from(new Set(spaceFiles.flatMap((f) => f.tags))).sort(), [spaceFiles])

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return spaceFiles
      .filter((f) => !descendantIds || descendantIds.has(f.folderId))
      .filter((f) => (fileFilter === 'starred' ? f.starred : fileFilter === 'summarized' ? !!f.aiSummary : fileFilter === 'inbox' ? f.status === 'inbox' : true))
      .filter((f) => !tagFilter || f.tags.includes(tagFilter))
      .filter((f) => !q || f.title.toLowerCase().includes(q) || f.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.starred) - Number(a.starred)) // 重点优先
  }, [spaceFiles, descendantIds, fileFilter, tagFilter, query])

  const visibleErrors = useMemo(() => {
    const order: Severity[] = ['high', 'medium', 'low']
    return spaceErrors.filter((e) => errorStatus === 'all' || e.status === errorStatus).sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
  }, [spaceErrors, errorStatus])

  const visibleChats = useMemo(() => spaceChats.filter((c) => toolFilter === 'all' || c.tool === toolFilter), [spaceChats, toolFilter])

  const stats = {
    files: spaceFiles.length,
    starred: spaceFiles.filter((f) => f.starred).length,
    summarized: spaceFiles.filter((f) => f.aiSummary).length,
    inbox: spaceFiles.filter((f) => f.status === 'inbox').length,
    openErrors: spaceErrors.filter((e) => e.status === 'open').length,
    unsummarizedChats: spaceChats.filter((c) => !c.summarized).length,
  }

  const folderPath = (id: string | null): KFolder[] => {
    const path: KFolder[] = []
    let cur = id ? spaceFolders.find((f) => f.id === id) : undefined
    while (cur) { path.unshift(cur); cur = cur.parentId ? spaceFolders.find((f) => f.id === cur!.parentId) : undefined }
    return path
  }

  const switchSpace = (id: SpaceId) => { setSpaceId(id); setFolderId(null); setTagFilter(null); setFileFilter('all'); setQuery(''); void loadData(id) }

  const toggleStar = (id: string) => {
    const t = files.find((f) => f.id === id)
    if (!t) return
    void updateKnowledgeFile(id, { priority: t.starred ? FilePriority.NORMAL : FilePriority.CRITICAL }).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: t.starred ? '已取消重点' : '已标为重点', description: t.title })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '更新重点失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const summarize = (id: string) => {
    const t = files.find((f) => f.id === id)
    if (!t) return
    void summarizeKnowledgeFile(id).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: '已生成 AI 总结', description: t.title })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: 'AI 总结失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const organize = (id: string) => {
    const t = files.find((f) => f.id === id)
    if (!t) return
    void updateKnowledgeFile(id, { priority: FilePriority.NORMAL }).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: '已标记为已归类', description: t.title })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '归类失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const setErrorState = (id: string, status: ErrorStatus) => {
    const apiStatus = status === 'solved' ? BackendErrorStatus.RESOLVED : status === 'archived' ? BackendErrorStatus.ARCHIVED : BackendErrorStatus.UNRESOLVED
    void updateKnowledgeError(id, { status: apiStatus }).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: `错题已${ERROR_STATUS_META[status].label}` })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '更新错题失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const summarizeChat = (id: string) => {
    void summarizeKnowledgeConversation(id).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: '已生成对话总结', description: '总结文件已保存到当前空间。' })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '对话总结失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const archiveChat = (id: string, to: SpaceId) => {
    void archiveKnowledgeConversation(id, to).then(() => loadData(spaceId)).then(() => {
      onToast({ tone: 'success', title: `已归档到「${spaces.find((s) => s.id === to)?.name ?? to}」` })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '归档失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const generateApiKey = () => {
    void createKnowledgeApiKey({ name: '知识库采集 Key', scopes: ['save_conversation', 'save_error', 'search_knowledge'], spaceId }).then((key) => {
      setApiKeys((prev) => [key, ...prev])
      setShowKey(true)
      onToast({ tone: 'success', title: 'API Key 已生成', description: '明文只显示这一次，请立即复制保存。' })
    }).catch((error: unknown) => onToast({ tone: 'danger', title: '生成 API Key 失败', description: error instanceof ApiError ? error.message : '请重试' }))
  }
  const copy = (text: string, label: string) => { navigator.clipboard?.writeText(text); onToast({ tone: 'success', title: `已复制${label}` }) }

  const TABS: { id: Tab; label: string; icon: IconType; badge?: number; badgeTone?: Tone }[] = [
    { id: 'files', label: '文件', icon: FileText, badge: stats.inbox || undefined, badgeTone: 'warning' },
    { id: 'errors', label: '错题本', icon: Bug, badge: stats.openErrors || undefined, badgeTone: 'danger' },
    { id: 'chats', label: 'AI 对话', icon: MessageSquareMore, badge: stats.unsummarizedChats || undefined, badgeTone: 'info' },
    { id: 'ingest', label: '接入采集', icon: Plug },
  ]

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {loading && <div role="status" className="col-span-full rounded-lg bg-muted px-4 py-3 text-[13px] text-muted-foreground">正在同步知识库数据…</div>}
      {loadError && <div role="alert" className="col-span-full flex items-center justify-between gap-4 rounded-lg bg-destructive/8 px-4 py-3 text-[13px] text-destructive"><span>{loadError}</span><Button variant="primary" onClick={() => void loadData()}>重试</Button></div>}
      {/* ================= 左栏：空间 + 目录树 ================= */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-0">
        <section aria-label="知识空间" className="overflow-hidden rounded-lg bg-card shadow-sm">
          {(['project', 'general'] as const).map((group) => (
            <div key={group} className={cn('px-3 py-3', group === 'general' && 'border-t border-border/60')}>
              <p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">{group === 'project' ? '项目空间 · 相互隔离' : '通用空间'}</p>
              <ul className="flex flex-col gap-0.5">
                {spaces.filter((s) => s.group === group).map((s) => {
                  const active = s.id === spaceId
                  const Icon = s.icon
                  const openErr = errors.filter((e) => e.spaceId === s.id && e.status === 'open').length
                  const inbox = files.filter((f) => f.spaceId === s.id && f.status === 'inbox').length
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        aria-current={active ? 'true' : undefined}
                        onClick={() => switchSpace(s.id)}
                        className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150', FOCUS_RING, active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-surface-raised')}
                      >
                        <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : s.className)} aria-hidden="true" />
                        <span className="flex-1 truncate text-left">{s.name}</span>
                        {openErr > 0 && <span className="rounded px-1 text-[11px] font-medium tabular-nums bg-destructive/8 text-destructive" title={`${openErr} 个未解决错题`}>{openErr}</span>}
                        {inbox > 0 && <span className="rounded px-1 text-[11px] font-medium tabular-nums bg-warning/10 text-warning" title={`${inbox} 个待整理`}>{inbox}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </section>

        <section aria-label="目录" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex h-12 items-center justify-between pr-2 pl-4">
            <h3 className="text-[13px] font-medium text-foreground">目录</h3>
            <IconButton label="新建目录" icon={FolderPlus} className="size-8" onClick={() => onToast({ tone: 'info', title: '新建目录', description: '接入后端后在此创建目录。' })} />
          </div>
          <div className="border-t border-border/60 px-2 py-2">
            <FolderTree folders={spaceFolders} fileCounts={fileCounts} selected={folderId} onSelect={(id) => { setFolderId(id); setTab('files') }} />
          </div>
        </section>
      </div>

      {/* ================= 右栏：空间概览 + 标签页 ================= */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* 空间头部 */}
        <section aria-label="空间概览" className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="flex items-start justify-between gap-6 p-6">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-muted">
                <space.icon className={cn('size-5', space.className)} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium leading-snug text-foreground">{space.name}</h2>
                  <Badge tone={space.group === 'project' ? 'primary' : 'muted'}>{space.group === 'project' ? '隔离空间' : '通用'}</Badge>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground text-pretty">{space.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button onClick={() => onToast({ tone: 'info', title: '上传文件', description: `将上传到「${space.name}」当前目录。` })}>
                <Upload className="size-3.5" aria-hidden="true" />
                上传
              </Button>
              <Button variant="primary" onClick={() => onToast({ tone: 'info', title: '新建文档' })}>
                <Plus className="size-3.5" aria-hidden="true" />
                新建
              </Button>
            </div>
          </div>
          {/* 优先级统计：待处理项放在最前 */}
          <dl className="grid grid-cols-3 divide-x divide-border/60 border-t border-border/60 md:grid-cols-6">
            {[
              { label: '未解决错题', value: stats.openErrors, tone: stats.openErrors ? 'danger' : 'muted', go: 'errors' as Tab },
              { label: '待整理', value: stats.inbox, tone: stats.inbox ? 'warning' : 'muted', go: 'files' as Tab, filter: 'inbox' as FileFilter },
              { label: '对话待总结', value: stats.unsummarizedChats, tone: stats.unsummarizedChats ? 'info' : 'muted', go: 'chats' as Tab },
              { label: '重点', value: stats.starred, tone: 'primary', go: 'files' as Tab, filter: 'starred' as FileFilter },
              { label: 'AI 已总结', value: stats.summarized, tone: 'success', go: 'files' as Tab, filter: 'summarized' as FileFilter },
              { label: '文件总数', value: stats.files, tone: 'muted', go: 'files' as Tab, filter: 'all' as FileFilter },
            ].map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => { setTab(s.go); if (s.filter) setFileFilter(s.filter) }}
                className={cn('flex flex-col gap-0.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-raised', FOCUS_RING, 'focus-visible:relative focus-visible:z-10')}
              >
                <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                <dd className={cn('text-lg font-semibold tabular-nums leading-tight', TONE_TEXT[s.tone as Tone])}>{s.value}</dd>
              </button>
            ))}
          </dl>
        </section>

        {/* 标签页 */}
        <section className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div role="tablist" aria-label="知识库分区" className="flex items-center gap-1 border-b border-border/60 px-4 pt-3 pb-0">
            {TABS.map((t) => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={cn('relative -mb-px flex h-10 items-center gap-2 rounded-t-md px-3 text-[13px] transition-colors duration-150', FOCUS_RING, active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  <t.icon className="size-4" aria-hidden="true" />
                  {t.label}
                  {t.badge !== undefined && <span className={cn('rounded px-1.5 text-[11px] font-medium tabular-nums', TONE_BADGE[t.badgeTone ?? 'muted'])}>{t.badge}</span>}
                  {active && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>

          {/* ---------------- 文件 ---------------- */}
          {tab === 'files' && (
            <div role="tabpanel">
              <div className="flex flex-col gap-3 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <nav aria-label="目录路径" className="flex min-w-0 items-center gap-1.5 text-[13px]">
                    <button type="button" onClick={() => setFolderId(null)} className={cn('rounded text-muted-foreground hover:text-foreground', FOCUS_RING)}>{space.name}</button>
                    {folderPath(folderId).map((f, i, arr) => (
                      <span key={f.id} className="flex items-center gap-1.5">
                        <ChevronRight className="size-3.5 text-border" aria-hidden="true" />
                        <button type="button" onClick={() => setFolderId(f.id)} className={cn('rounded', FOCUS_RING, i === arr.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}>{f.name}</button>
                      </span>
                    ))}
                  </nav>
                  <label className="relative">
                    <span className="sr-only">搜索文件</span>
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索标题或标签" className={cn('h-9 w-56 rounded-lg border border-transparent bg-muted pr-3 pl-9 text-[13px] text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary focus:bg-card', FOCUS_RING)} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {([['all', '全部'], ['starred', '重点'], ['summarized', 'AI 已总结'], ['inbox', '待整理']] as [FileFilter, string][]).map(([id, label]) => (
                    <Chip key={id} active={fileFilter === id} onClick={() => setFileFilter(id)}>
                      {id === 'starred' && <Star className="size-3.5" aria-hidden="true" />}
                      {id === 'summarized' && <Sparkles className="size-3.5" aria-hidden="true" />}
                      {id === 'inbox' && <Inbox className="size-3.5" aria-hidden="true" />}
                      {label}
                    </Chip>
                  ))}
                  {allTags.length > 0 && <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />}
                  {allTags.map((t) => (
                    <Chip key={t} active={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className="h-7 text-[11px]">
                      <Tag className="size-3" aria-hidden="true" />
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>

              {visibleFiles.length === 0 ? (
                <EmptyState icon={FileText} title="没有匹配的文件" description="换个筛选条件，或上传文件到当前目录。" />
              ) : (
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {visibleFiles.map((f) => {
                    const Icon = KIND_ICON[f.kind]
                    const folder = spaceFolders.find((x) => x.id === f.folderId)
                    return (
                      <li key={f.id} className="group flex min-h-16 items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-surface-raised">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <button type="button" onClick={() => setDetail(f)} className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-foreground">{f.title}</span>
                            {f.starred && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="重点" />}
                            {f.aiSummary && <Badge tone="success"><Sparkles className="size-3" aria-hidden="true" />AI 总结</Badge>}
                            {f.status === 'inbox' && <Badge tone="warning">待整理</Badge>}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{folder?.name ?? '—'} · {f.size} · {f.updatedAt}</span>
                            {f.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                          {f.status === 'inbox' && <Button variant="ghost" onClick={() => organize(f.id)}>归类</Button>}
                          {!f.aiSummary && (
                            <Button variant="ghost" onClick={() => summarize(f.id)}>
                              <Wand2 className="size-3.5" aria-hidden="true" />
                              AI 总结
                            </Button>
                          )}
                          <IconButton label={f.starred ? '取消重点' : '标为重点'} icon={Star} active={f.starred} onClick={() => toggleStar(f.id)} side="left" />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ---------------- 错题本 ---------------- */}
          {tab === 'errors' && (
            <div role="tabpanel">
              <div className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex items-center gap-1">
                  {([['open', '未解决'], ['solved', '已解决'], ['archived', '已归档'], ['all', '全部']] as [ErrorStatus | 'all', string][]).map(([id, label]) => (
                    <Chip key={id} active={errorStatus === id} onClick={() => setErrorStatus(id)}>
                      {label}
                      <span className="tabular-nums opacity-70">{id === 'all' ? spaceErrors.length : spaceErrors.filter((e) => e.status === id).length}</span>
                    </Chip>
                  ))}
                </div>
                <Button variant="primary" onClick={() => onToast({ tone: 'info', title: '新建错题', description: '也可以在 AI 对话中一键提取报错。' })}>
                  <Plus className="size-3.5" aria-hidden="true" />
                  新建错题
                </Button>
              </div>
              {space.group === 'general' && spaceErrors.length === 0 ? (
                <EmptyState icon={Bug} title="通用空间不记录错题" description="错题本按项目空间隔离，请切换到应用开发 / AI 视频 / 游戏开发查看。" />
              ) : visibleErrors.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="没有该状态的错题" description="当前空间下此状态没有记录。" />
              ) : (
                <ul className="flex flex-col gap-4 border-t border-border/60 p-6">
                  {visibleErrors.map((e) => {
                    const st = ERROR_STATUS_META[e.status]
                    const sv = SEVERITY_META[e.severity]
                    const conv = e.fromConversationId ? chats.find((c) => c.id === e.fromConversationId) : undefined
                    return (
                      <li key={e.id} className="rounded-lg bg-muted/60 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[sv.tone])} />
                              <h3 className="text-[13px] font-medium text-foreground">{e.title}</h3>
                              <Badge tone={sv.tone}>{sv.label}优先级</Badge>
                              <Badge tone={st.tone}>{st.label}</Badge>
                              {e.occurrences > 1 && <Badge tone="muted">复现 {e.occurrences} 次</Badge>}
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">{e.env} · 更新于 {e.updatedAt}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            {e.status === 'open' && <Button variant="primary" onClick={() => setErrorState(e.id, 'solved')}><CheckCircle2 className="size-3.5" aria-hidden="true" />标为已解决</Button>}
                            {e.status === 'solved' && <Button variant="ghost" onClick={() => setErrorState(e.id, 'archived')}>归档</Button>}
                            {e.status === 'archived' && <Button variant="ghost" onClick={() => setErrorState(e.id, 'open')}>重新打开</Button>}
                          </div>
                        </div>
                        <pre className="mt-3 overflow-x-auto rounded-md bg-card p-3 font-mono text-[11px] leading-relaxed text-destructive whitespace-pre-wrap">{e.message}</pre>
                        <dl className="mt-3 grid gap-3 text-[13px] md:grid-cols-2">
                          <div>
                            <dt className="text-[11px] font-medium text-muted-foreground">根因</dt>
                            <dd className={cn('mt-0.5 leading-relaxed text-pretty', e.rootCause ? 'text-foreground' : 'text-muted-foreground')}>{e.rootCause ?? '尚未定位'}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] font-medium text-muted-foreground">解决方案</dt>
                            <dd className={cn('mt-0.5 leading-relaxed text-pretty', e.fix ? 'text-foreground' : 'text-muted-foreground')}>{e.fix ?? '待补充'}</dd>
                          </div>
                        </dl>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                          {e.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
                          {conv && (
                            <button type="button" onClick={() => { setTab('chats'); setToolFilter(conv.tool) }} className={cn('ml-auto flex items-center gap-1 rounded text-primary hover:underline', FOCUS_RING)}>
                              <Link2 className="size-3" aria-hidden="true" />
                              来自 {TOOL_META[conv.tool].label} 对话「{conv.title}」
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* ---------------- AI 对话 ---------------- */}
          {tab === 'chats' && (
            <div role="tabpanel">
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="flex flex-wrap items-center gap-1">
                  <Chip active={toolFilter === 'all'} onClick={() => setToolFilter('all')}>全部 <span className="tabular-nums opacity-70">{spaceChats.length}</span></Chip>
                  {(Object.keys(TOOL_META) as ToolId[]).map((t) => (
                    <Chip key={t} active={toolFilter === t} onClick={() => setToolFilter(t)}>
                      {TOOL_META[t].label} <span className="tabular-nums opacity-70">{spaceChats.filter((c) => c.tool === t).length}</span>
                    </Chip>
                  ))}
                </div>
                <Button variant="ghost" onClick={() => setTab('ingest')}>
                  <Plug className="size-3.5" aria-hidden="true" />
                  接入更多工具
                </Button>
              </div>
              {visibleChats.length === 0 ? (
                <EmptyState icon={MessageSquareMore} title="暂无采集到的对话" description={spaceId === 'chat' ? '连接 Codex / Cursor / Trae 后，对话会自动出现在这里。' : '在「AI 对话」空间中把相关对话归档到本项目。'} action={<Button variant="primary" onClick={() => setTab('ingest')}>去接入</Button>} />
              ) : (
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {visibleChats.map((c) => (
                    <li key={c.id} className="group flex min-h-16 items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-surface-raised">
                      <span className={cn('flex h-9 w-20 shrink-0 items-center justify-center rounded-md text-[11px] font-medium', TOOL_META[c.tool].className)}>{TOOL_META[c.tool].label}</span>
                      <button type="button" className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)} onClick={() => onToast({ tone: 'info', title: '打开对话', description: c.title })}>
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">{c.title}</span>
                          {c.summarized ? <Badge tone="success"><Sparkles className="size-3" aria-hidden="true" />已总结</Badge> : <Badge tone="info">待总结</Badge>}
                          {c.hasError && <Badge tone="danger"><Bug className="size-3" aria-hidden="true" />含报错</Badge>}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{c.messages} 条消息 · 采集于 {c.capturedAt}</span>
                          {c.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        {!c.summarized && <Button variant="ghost" onClick={() => summarizeChat(c.id)}><Wand2 className="size-3.5" aria-hidden="true" />生成总结</Button>}
                        {c.hasError && <Button variant="ghost" onClick={() => { setTab('errors'); setErrorStatus('all') }}><Bug className="size-3.5" aria-hidden="true" />查看错题</Button>}
                        {spaces.some((s) => s.id === c.spaceId && s.group === 'general') && (
                          <label className="relative">
                            <span className="sr-only">归档到项目空间</span>
                            <select
                              defaultValue=""
                              onChange={(e) => e.target.value && archiveChat(c.id, e.target.value as SpaceId)}
                              className={cn('h-9 rounded-lg border border-border bg-transparent px-2 text-[13px] text-primary', FOCUS_RING)}
                            >
                              <option value="" disabled>归档到…</option>
                              {spaces.filter((s) => s.group === 'project').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---------------- 接入采集 ---------------- */}
          {tab === 'ingest' && (
            <div role="tabpanel" className="flex flex-col divide-y divide-border/60">
              {/* 已连接工具 */}
              <div className="p-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[13px] font-medium text-foreground">已接入的工具</h3>
                  <Button variant="ghost" onClick={() => onToast({ tone: 'info', title: '正在同步全部工具' })}><RefreshCw className="size-3.5" aria-hidden="true" />全部同步</Button>
                </div>
                <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {TOOLS.map((t) => {
                    const cm = CONNECTION_META[t.status]
                    return (
                      <li key={t.id} className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('rounded-md px-2 py-1 text-[11px] font-medium', TOOL_META[t.id].className)}>{t.name}</span>
                          <span className={cn('flex items-center gap-1.5 text-[11px] font-medium', TONE_TEXT[cm.tone])}>
                            <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[cm.tone])} />
                            {cm.label}
                          </span>
                        </div>
                        <dl className="grid grid-cols-2 gap-1 text-[11px]">
                          <dt className="text-muted-foreground">方式</dt><dd className="text-right font-mono text-foreground">{t.method}</dd>
                          <dt className="text-muted-foreground">已采集</dt><dd className="text-right tabular-nums text-foreground">{t.captured} 条</dd>
                          <dt className="text-muted-foreground">最近同步</dt><dd className="text-right text-foreground">{t.lastSync ?? '—'}</dd>
                        </dl>
                        <Button variant={t.status === 'pending' ? 'primary' : 'outline'} className="w-full" onClick={() => onToast({ tone: 'info', title: `${t.status === 'pending' ? '配置' : '管理'} ${t.name}` })}>
                          {t.status === 'pending' ? '完成配置' : '管理'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* 端点与密钥 */}
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-1 text-[13px] font-medium text-foreground">采集端点</h3>
                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">任何能发 HTTP 请求的工具都可以把对话推送到这里。</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3">
                    <span className="rounded bg-success/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-success">POST</span>
                    <code className="min-w-0 flex-1 truncate py-2.5 font-mono text-[13px] text-foreground">{API_ENDPOINT}</code>
                    <IconButton label="复制端点" icon={Copy} className="size-8" onClick={() => copy(API_ENDPOINT, '端点')} />
                  </div>
                </div>
                <div>
                  <h3 className="mb-1 text-[13px] font-medium text-foreground">API Key</h3>
                  <p className="mb-3 text-[11px] leading-relaxed text-muted-foreground">放在 <code className="font-mono">Authorization: Bearer</code> 头中；重新生成后旧 Key 立即失效。</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3">
                    <KeyRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <code className="min-w-0 flex-1 truncate py-2.5 font-mono text-[13px] text-foreground">{showKey ? (apiKeys[0]?.key ?? API_KEY_PLACEHOLDER) : (apiKeys[0]?.key ? `${apiKeys[0].key.slice(0, 8)}${'•'.repeat(24)}` : API_KEY_PLACEHOLDER)}</code>
                    <IconButton label={showKey ? '隐藏' : '显示'} icon={showKey ? EyeOff : Eye} className="size-8" onClick={() => setShowKey((v) => !v)} />
                    <IconButton label="复制 Key" icon={Copy} className="size-8" onClick={() => apiKeys[0]?.key && copy(apiKeys[0].key, 'API Key')} />
                    <IconButton label="生成 Key" icon={RefreshCw} className="size-8" onClick={generateApiKey} />
                  </div>
                </div>
              </div>

              {/* 接入方式 */}
              <IngestGuides onCopy={copy} />

              {/* 采集规则 */}
              <div className="p-6">
                <h3 className="mb-1 text-[13px] font-medium text-foreground">采集规则</h3>
                <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">规则在服务端执行，对所有工具生效。</p>
                <div className="divide-y divide-border/60">
                  <Toggle label="自动归入项目空间" description="根据对话里的工作目录 / 仓库名匹配项目；匹配不到的进入「AI 对话」空间。" checked={rules.autoSpace} onChange={(v) => setRules({ ...rules, autoSpace: v })} />
                  <Toggle label="自动生成 AI 总结" description="对话结束后清洗为要点、决策与待办，原文保留可追溯。" checked={rules.autoSummary} onChange={(v) => setRules({ ...rules, autoSummary: v })} />
                  <Toggle label="自动提取错题" description="检测到堆栈、HTTP 错误码或断言失败时，生成一条错题草稿并关联原对话。" checked={rules.autoError} onChange={(v) => setRules({ ...rules, autoError: v })} />
                  <Toggle label="去重合并" description="同一会话多次推送按 session_id 合并，不产生重复记录。" checked={rules.dedupe} onChange={(v) => setRules({ ...rules, dedupe: v })} />
                  <Toggle label="敏感信息脱敏" description="入库前替换 API Key、Token、邮箱与手机号。" checked={rules.redact} onChange={(v) => setRules({ ...rules, redact: v })} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ================= 文件详情弹窗 ================= */}
      <FileDetail file={detail} folders={spaceFolders} errors={errors} onClose={() => setDetail(null)} onToggleStar={toggleStar} onSummarize={summarize} />
    </div>
  )
}

// =============================================================================
// 接入方式指南（REST / MCP / CLI Hook）
// =============================================================================

const PAYLOAD_EXAMPLE = `{
  "source": "cursor",              // codex | cursor | trae | claude | custom
  "session_id": "c7e1-…",          // 同一会话用于去重合并
  "title": "排查登录回调错误",
  "project_hint": "qingjizhang",   // 仓库名 / 工作目录，用于自动归入空间
  "messages": [
    { "role": "user", "content": "登录回调报 redirect_uri_mismatch", "ts": "2026-09-04T10:12:00+08:00" },
    { "role": "assistant", "content": "先核对沙箱与正式环境的 redirect URI…" }
  ],
  "tags": ["认证"],                 // 可选
  "attachments": []                // 可选：文件/截图 URL
}`

const CURL_EXAMPLE = `curl -X POST ${API_ENDPOINT} \\
  -H "Authorization: Bearer $KB_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d @conversation.json`

const MCP_EXAMPLE = `// ~/.claude/settings.json 或 Cursor MCP 配置
{
  "mcpServers": {
    "no1-knowledge": {
      "url": "https://kb.no1-3mode.local/mcp",
      "headers": { "Authorization": "Bearer $KB_API_KEY" }
    }
  }
}
// 暴露工具：save_conversation · save_error · search_knowledge`

const HOOK_EXAMPLE = `# Codex / 任意 CLI：会话结束时自动推送
# ~/.codex/hooks/on-session-end.sh
kb push --source codex \\
  --session "$CODEX_SESSION_ID" \\
  --project "$(basename "$PWD")" \\
  --file "$CODEX_TRANSCRIPT_PATH"`

function IngestGuides({ onCopy }: { onCopy: (text: string, label: string) => void }) {
  const [mode, setMode] = useState<'rest' | 'mcp' | 'hook'>('rest')
  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-[13px] font-medium text-foreground">接入方式</h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground">三种方式任选；MCP 方式还能让 AI 工具直接检索知识库。</p>
        </div>
        <div role="group" aria-label="接入方式" className="flex shrink-0 rounded-md bg-muted p-0.5">
          {([['rest', 'REST API'], ['mcp', 'MCP 服务'], ['hook', 'CLI Hook']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={cn('h-7 whitespace-nowrap rounded px-2.5 text-[11px] font-medium transition-colors duration-150', FOCUS_RING, mode === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
          ))}
        </div>
      </div>
      {mode === 'rest' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">请求体结构</p>
            <CodeBlock code={PAYLOAD_EXAMPLE} onCopy={() => onCopy(PAYLOAD_EXAMPLE, '请求体示例')} />
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">调用示例</p>
              <CodeBlock code={CURL_EXAMPLE} onCopy={() => onCopy(CURL_EXAMPLE, 'cURL 示例')} />
            </div>
            <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span>返回 <code className="font-mono text-foreground">201 {'{ id, space_id, summary_job_id }'}</code>；同 session_id 重复推送返回 200 并合并。</span></li>
              <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />单次请求上限 2 MB；超长对话请分批推送同一 session_id。</li>
              <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />每分钟 60 次；超限返回 429 与 Retry-After。</li>
            </ul>
          </div>
        </div>
      )}
      {mode === 'mcp' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeBlock code={MCP_EXAMPLE} onCopy={() => onCopy(MCP_EXAMPLE, 'MCP 配置')} />
          <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />适用于 Claude Code、Cursor、Trae 等支持 MCP 的工具。</li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span><code className="font-mono text-foreground">save_conversation</code> 由工具在会话结束时调用；<code className="font-mono text-foreground">save_error</code> 可在遇到报错时主动记录到错题本。</span></li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span><code className="font-mono text-foreground">search_knowledge</code> 让 AI 在回答前先检索你的规范与错题，减少重复踩坑。</span></li>
          </ul>
        </div>
      )}
      {mode === 'hook' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <CodeBlock code={HOOK_EXAMPLE} onCopy={() => onCopy(HOOK_EXAMPLE, 'Hook 脚本')} />
          <ul className="flex flex-col gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" />适用于 Codex 等提供会话钩子或本地转录文件的 CLI 工具。</li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span><code className="font-mono text-foreground">kb</code> 是本地小工具，读取转录文件并调用 REST 端点，离线时排队重试。</span></li>
            <li className="flex gap-2"><ArrowRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span><code className="font-mono text-foreground">--project</code> 传工作目录名即可命中「自动归入项目空间」规则。</span></li>
          </ul>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// 文件详情弹窗：原文 / AI 总结 / 元数据 / 关联错题
// =============================================================================

function FileDetail({
  file,
  folders,
  errors,
  onClose,
  onToggleStar,
  onSummarize,
}: {
  file: KFile | null
  folders: KFolder[]
  errors: ErrorEntry[]
  onClose: () => void
  onToggleStar: (id: string) => void
  onSummarize: (id: string) => void
}) {
  const [pane, setPane] = useState<'summary' | 'original'>('summary')
  if (!file) return null
  const Icon = KIND_ICON[file.kind]
  const folder = folders.find((f) => f.id === file.folderId)
  const related = errors.filter((e) => e.spaceId === file.spaceId && e.tags.some((t) => file.tags.includes(t)))
  const showSummary = pane === 'summary' && file.aiSummary

  return (
    <Dialog
      open
      onClose={onClose}
      width="lg"
      icon={Icon}
      tone="muted"
      title={file.title}
      description={`${folder?.name ?? ''} · ${file.size} · 更新于 ${file.updatedAt}`}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => onToggleStar(file.id)}>
            <Star className={cn('size-4', file.starred && 'fill-warning text-warning')} aria-hidden="true" />
            {file.starred ? '取消重点' : '标为重点'}
          </Button>
          {!file.aiSummary && (
            <Button size="md" onClick={() => onSummarize(file.id)}>
              <Wand2 className="size-4" aria-hidden="true" />
              生成 AI 总结
            </Button>
          )}
          <Button variant="primary" size="md" onClick={onClose}>
            打开原文
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {file.starred && <Badge tone="warning"><Star className="size-3" aria-hidden="true" />重点</Badge>}
          {file.status === 'inbox' && <Badge tone="warning">待整理</Badge>}
          {file.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}
          <button type="button" className={cn('flex h-6 items-center gap-1 rounded px-1.5 text-[11px] text-primary hover:bg-accent', FOCUS_RING)}>
            <Plus className="size-3" aria-hidden="true" />
            添加标签
          </button>
        </div>

        <div role="group" aria-label="查看内容" className="flex w-fit rounded-md bg-muted p-0.5">
          {([['summary', 'AI 总结'], ['original', '原文']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={pane === id} onClick={() => setPane(id)} className={cn('h-7 rounded px-2.5 text-[11px] font-medium transition-colors duration-150', FOCUS_RING, pane === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>

        {pane === 'summary' ? (
          showSummary ? (
            <div className={cn('rounded-lg p-4 text-[13px] leading-relaxed text-pretty', TONE_BADGE.success)}>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium"><Sparkles className="size-3.5" aria-hidden="true" />AI 清洗要点</p>
              <p className="text-foreground">{file.aiSummary}</p>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/60 px-4 py-6 text-center text-[13px] text-muted-foreground">
              尚未生成 AI 总结。生成后会提炼要点、决策与待办，并保留原文可追溯。
            </div>
          )
        ) : (
          <div className="rounded-lg bg-muted/60 p-4 text-[13px] leading-relaxed text-muted-foreground">
            原文预览将在接入存储后显示（{file.kind === 'media' ? '媒体文件将以播放器呈现' : '支持 Markdown / 代码高亮 / 表格'}）。
          </div>
        )}

        {related.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">关联错题（按标签匹配）</p>
            <ul className="flex flex-col gap-1.5">
              {related.map((e) => (
                <li key={e.id} className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-[13px]">
                  <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[SEVERITY_META[e.severity].tone])} />
                  <span className="min-w-0 flex-1 truncate text-foreground">{e.title}</span>
                  <Badge tone={ERROR_STATUS_META[e.status].tone}>{ERROR_STATUS_META[e.status].label}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialog>
  )
}
