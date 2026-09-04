'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  GitBranch,
  GitCompareArrows,
  GitMerge,
  GitFork,
  Globe,
  Grid3X3,
  ImageIcon,
  Layers,
  Link2,
  ListChecks,
  Loader2,
  MessageSquareText,
  Pin,
  Play,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Dialog, EmptyState, FOCUS_RING, IconButton, TONE_BADGE, TONE_TEXT, type IconType, type Toast, type Tone } from '@/components/ui-primitives'
import { Badge, Chip, TagPill, relativeTime } from '@/components/knowledge-shared'
import { fetchSkills } from '@/lib/api-client'

// =============================================================================
// 类型定义（占位；接入后端时替换为 API 类型）
// =============================================================================

export type SkillOutput = 'image' | 'text' | 'code' | 'video' | 'data'
export type SkillSourceKind = 'github' | 'url' | 'local' | 'tool' | 'evolved'
export type SkillDomain = 'app' | 'video' | 'game' | 'general'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface SkillSource {
  kind: SkillSourceKind
  label: string // 显示名：仓库名 / 站点 / 工具名
  url?: string
  linked: boolean // 是否仍与来源保持连接（可检查更新）
  version?: string
  upstreamVersion?: string // 上游最新版本，与 version 不同则提示可更新
}

export interface SkillCompat {
  codex: boolean
  cursor: boolean
  trae: boolean
  claude: boolean
}

export interface SkillPermission {
  label: string
  risk: RiskLevel
}

export interface SkillShowcase {
  id: string
  output: SkillOutput
  title: string
  prompt: string
  model: string
  result: string // 文本结果或图片 alt 描述
  imageSrc?: string
  score?: number // 用户评分 1-5
  createdAt: string
}

export interface Skill {
  id: string
  name: string
  slug: string
  description: string
  output: SkillOutput
  domains: SkillDomain[]
  tags: string[] // 结构 / 效果 / 场景 / 用法 四类标签打平
  structure: string[] // 结构分析：由哪些部分组成
  useCases: string[] // 场景
  usage: string // 用法：一句话触发方式
  pinned: boolean
  usageCount: number // 总调用
  usageTrend: number[] // 最近 7 天调用
  successRate: number // 0–100
  lastUsedAt: string
  addedAt: string
  source: SkillSource
  compat: SkillCompat
  permissions: SkillPermission[]
  version: string
  parentIds?: string[] // 进化谱系：由哪些 skill 融合而来
  showcase: SkillShowcase[]
  goldenCases: number // 固定测试用例数量
}

// =============================================================================
// 元数据
// =============================================================================

const OUTPUT_META: Record<SkillOutput, { label: string; icon: IconType; tone: Tone }> = {
  image: { label: '图片', icon: ImageIcon, tone: 'primary' },
  text: { label: '文本', icon: MessageSquareText, tone: 'info' },
  code: { label: '代码', icon: Layers, tone: 'success' },
  video: { label: '视频', icon: Play, tone: 'warning' },
  data: { label: '数据', icon: Grid3X3, tone: 'muted' },
}

const SOURCE_META: Record<SkillSourceKind, { label: string; icon: IconType }> = {
  github: { label: 'GitHub', icon: GitFork },
  url: { label: '网页', icon: Globe },
  local: { label: '本地', icon: Upload },
  tool: { label: '工具导入', icon: Download },
  evolved: { label: '进化生成', icon: GitMerge },
}

const DOMAIN_LABEL: Record<SkillDomain, string> = { app: '应用开发', video: 'AI 视频', game: '游戏开发', general: '通用' }

const RISK_META: Record<RiskLevel, { label: string; tone: Tone }> = {
  low: { label: '低', tone: 'muted' },
  medium: { label: '中', tone: 'warning' },
  high: { label: '高', tone: 'danger' },
}

const TOOL_LABEL = { codex: 'Codex', cursor: 'Cursor', trae: 'Trae', claude: 'Claude Code' } as const

/** 效果展示可选模型（占位；接入后由设置页「模型与路由」提供） */
const MODELS: { id: string; label: string; outputs: SkillOutput[]; local?: boolean }[] = [
  { id: 'gpt-image-1', label: 'GPT Image 1', outputs: ['image'] },
  { id: 'flux-1.1-pro', label: 'FLUX 1.1 Pro', outputs: ['image'] },
  { id: 'sd-xl-local', label: 'SDXL（本地）', outputs: ['image'], local: true },
  { id: 'claude-sonnet-4', label: 'Claude Sonnet 4', outputs: ['text', 'code', 'data'] },
  { id: 'gpt-5', label: 'GPT-5', outputs: ['text', 'code', 'data'] },
  { id: 'qwen3-local', label: 'Qwen3 32B（本地）', outputs: ['text', 'code', 'data'], local: true },
  { id: 'kling-2', label: 'Kling 2.0', outputs: ['video'] },
]

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

// =============================================================================
// 演示数据
// =============================================================================

const SKILLS: Skill[] = [
  {
    id: 's-1', name: '分镜提示词生成器', slug: 'storyboard-prompt', description: '根据剧本片段生成分镜级图像提示词，自动补齐镜头类型、光线、角色一致性前缀。',
    output: 'image', domains: ['video'], tags: ['多段模板', '角色一致性', '分镜', '剧本→提示词', '前缀注入'],
    structure: ['系统提示：风格锁定与负面词', '镜头模板 × 12', '角色一致性前缀', '输出格式约束'],
    useCases: ['短剧分镜', '概念图批量生成', '角色三视图'], usage: '/storyboard <剧本片段> --shot=close',
    pinned: true, usageCount: 312, usageTrend: [8, 14, 11, 22, 19, 27, 31], successRate: 92, lastUsedAt: ago(1), addedAt: ago(24 * 40),
    source: { kind: 'github', label: 'vid-tools/storyboard-skill', url: 'https://github.com/vid-tools/storyboard-skill', linked: true, version: '2.3.0', upstreamVersion: '2.4.1' },
    compat: { codex: true, cursor: true, trae: true, claude: true }, permissions: [{ label: '读取剧本文件', risk: 'low' }, { label: '调用图像模型', risk: 'low' }],
    version: '2.3.0', goldenCases: 6,
    showcase: [
      { id: 'sc-1', output: 'image', title: '东荒线 · 第 3 集 · 镜头 7', prompt: '拾遗人立于山巅，晨雾，广角，逆光', model: 'FLUX 1.1 Pro', result: '山巅剪影，晨雾弥漫的广角逆光镜头', imageSrc: '/showcase/storyboard-1.jpg', score: 5, createdAt: ago(3) },
      { id: 'sc-2', output: 'image', title: '守山者特写', prompt: '守山者面部特写，青铜面具，冷光', model: 'GPT Image 1', result: '青铜面具冷光特写', imageSrc: '/showcase/storyboard-2.jpg', score: 4, createdAt: ago(30) },
    ],
  },
  {
    id: 's-2', name: 'ArkTS 组件脚手架', slug: 'arkts-scaffold', description: '按鸿蒙编码规范 v3 生成 ArkUI 组件骨架，内置状态装饰器选择逻辑。',
    output: 'code', domains: ['game', 'app'], tags: ['代码生成', '规范约束', 'ArkTS', '脚手架', '状态管理'],
    structure: ['规范文档引用（RAG）', '装饰器决策树', '模板 × 4', '自检清单'],
    useCases: ['新建页面组件', '重构旧组件', '规范审查'], usage: '/arkts component <名称> --state=provide',
    pinned: true, usageCount: 188, usageTrend: [5, 9, 12, 8, 15, 11, 14], successRate: 88, lastUsedAt: ago(4), addedAt: ago(24 * 20),
    source: { kind: 'local', label: '本地 skills/arkts-scaffold', linked: false, version: '1.2.0' },
    compat: { codex: true, cursor: true, trae: true, claude: false }, permissions: [{ label: '读写项目源码', risk: 'medium' }, { label: '读取知识库规范', risk: 'low' }],
    version: '1.2.0', goldenCases: 12,
    showcase: [{ id: 'sc-3', output: 'code', title: 'LevelCard 组件', prompt: '生成关卡卡片组件，含进度与星级', model: 'Claude Sonnet 4', result: '@Component\nstruct LevelCard {\n  @Prop level: LevelInfo\n  @Consume progress: ProgressStore\n  build() {\n    Column() { /* ... */ }\n  }\n}', score: 4, createdAt: ago(5) },
    ],
  },
  {
    id: 's-3', name: '错题根因分析', slug: 'error-rca', description: '读取报错堆栈与最近对话，输出根因、复现路径与修复建议，可直接写入错题本。',
    output: 'text', domains: ['general'], tags: ['分析', '结构化输出', '错题本', '堆栈解析', 'RCA'],
    structure: ['堆栈解析器', '上下文拼装（对话 + 文件）', '根因模板', '错题本 schema 输出'],
    useCases: ['CI 失败排查', '运行时异常', '构建报错'], usage: '/rca <错误 id 或粘贴堆栈>',
    pinned: false, usageCount: 97, usageTrend: [2, 4, 3, 6, 5, 9, 7], successRate: 81, lastUsedAt: ago(9), addedAt: ago(24 * 12),
    source: { kind: 'tool', label: '从 Claude Code 导入', linked: true, version: '0.9.0', upstreamVersion: '0.9.0' },
    compat: { codex: true, cursor: false, trae: false, claude: true }, permissions: [{ label: '读取日志', risk: 'low' }, { label: '写入错题本', risk: 'medium' }],
    version: '0.9.0', goldenCases: 8,
    showcase: [{ id: 'sc-4', output: 'text', title: 'HAP 签名失败', prompt: 'error: 9568320 signature verification failed', model: 'GPT-5', result: '根因：release 构建使用了调试证书。复现：Build APP(s) → release。修复：build-profile.json5 指定发布证书与 profile。', score: 5, createdAt: ago(48) }],
  },
  {
    id: 's-4', name: '短视频节奏剪辑建议', slug: 'edit-rhythm', description: '分析分镜脚本的节奏曲线，给出压缩 / 提前冲突 / 结尾钩子建议。',
    output: 'text', domains: ['video'], tags: ['分析', '分镜', '节奏', '剧本'],
    structure: ['节奏曲线计算', '三幕检查', '建议模板'], useCases: ['分镜评审', '成片前检查'], usage: '/rhythm <分镜脚本>',
    pinned: false, usageCount: 41, usageTrend: [1, 0, 3, 2, 4, 3, 5], successRate: 76, lastUsedAt: ago(26), addedAt: ago(24 * 5),
    source: { kind: 'url', label: 'prompts.chat/edit-rhythm', url: 'https://prompts.chat', linked: false, version: '1.0.0' },
    compat: { codex: true, cursor: true, trae: true, claude: true }, permissions: [{ label: '读取知识库文件', risk: 'low' }],
    version: '1.0.0', goldenCases: 0, showcase: [],
  },
  {
    id: 's-5', name: '角色三视图生成', slug: 'char-turnaround', description: '给定角色设定文本，生成正 / 侧 / 背三视图，保持服饰与配色一致。',
    output: 'image', domains: ['video', 'game'], tags: ['多段模板', '角色一致性', '三视图', '设定→图像'],
    structure: ['设定解析', '一致性锚点提取', '三视角模板'], useCases: ['角色设定', '游戏立绘', '建模参考'], usage: '/turnaround <角色设定>',
    pinned: false, usageCount: 66, usageTrend: [3, 5, 2, 6, 4, 8, 6], successRate: 84, lastUsedAt: ago(15), addedAt: ago(24 * 9),
    source: { kind: 'github', label: 'art-kit/turnaround', url: 'https://github.com/art-kit/turnaround', linked: true, version: '1.1.0', upstreamVersion: '1.1.0' },
    compat: { codex: true, cursor: true, trae: false, claude: true }, permissions: [{ label: '调用图像模型', risk: 'low' }],
    version: '1.1.0', goldenCases: 3,
    showcase: [{ id: 'sc-5', output: 'image', title: '拾遗人 · 三视图', prompt: '拾遗人，褐色斗篷，铜铃，正侧背', model: 'FLUX 1.1 Pro', result: '褐色斗篷角色三视图', imageSrc: '/showcase/turnaround-1.jpg', score: 4, createdAt: ago(16) }],
  },
  {
    id: 's-6', name: '接口契约生成', slug: 'api-contract', description: '从前端类型定义反推 REST 契约与字段说明，输出可直接交给后端的 Markdown。',
    output: 'data', domains: ['app'], tags: ['结构化输出', '契约', 'TypeScript→API', '文档'],
    structure: ['类型扫描', '端点推断规则', 'Markdown 模板'], useCases: ['前后端交接', '开发日志契约段'], usage: '/contract <类型文件>',
    pinned: false, usageCount: 23, usageTrend: [0, 1, 2, 1, 3, 4, 2], successRate: 90, lastUsedAt: ago(50), addedAt: ago(24 * 3),
    source: { kind: 'local', label: '本地 skills/api-contract', linked: false, version: '0.3.0' },
    compat: { codex: true, cursor: true, trae: true, claude: true }, permissions: [{ label: '读取项目源码', risk: 'low' }],
    version: '0.3.0', goldenCases: 2, showcase: [],
  },
  {
    id: 's-7', name: '视觉一致性提示词 · 进化版', slug: 'visual-consistency-v2', description: '融合「分镜提示词生成器」与「角色三视图生成」的一致性前缀逻辑，统一角色锚点与镜头模板。',
    output: 'image', domains: ['video', 'game'], tags: ['多段模板', '角色一致性', '融合', '分镜', '三视图'],
    structure: ['共享一致性锚点（合并）', '镜头模板 × 12（继承 s-1）', '三视角模板（继承 s-5）', '冲突消解：负面词合并策略'],
    useCases: ['同一角色跨分镜 / 立绘保持一致'], usage: '/vc <角色设定> --shot=<类型> | --turnaround',
    pinned: false, usageCount: 12, usageTrend: [0, 0, 0, 2, 3, 3, 4], successRate: 83, lastUsedAt: ago(6), addedAt: ago(24 * 1.5),
    source: { kind: 'evolved', label: '由 s-1 + s-5 融合', linked: false, version: '0.1.0' },
    compat: { codex: true, cursor: true, trae: false, claude: true }, permissions: [{ label: '调用图像模型', risk: 'low' }],
    version: '0.1.0', parentIds: ['s-1', 's-5'], goldenCases: 6,
    showcase: [{ id: 'sc-6', output: 'image', title: '同一角色：分镜 + 三视图', prompt: '拾遗人 · 山巅广角 + 三视图', model: 'FLUX 1.1 Pro', result: '同一角色在广角分镜与三视图中服饰配色一致', imageSrc: '/showcase/consistency-1.jpg', score: 5, createdAt: ago(6) }],
  },
]

// =============================================================================
// 小组件
// =============================================================================

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1)
  return (
    <span aria-hidden="true" className={cn('flex h-5 items-end gap-0.5', className)}>
      {data.map((v, i) => (
        <span key={i} className="w-1 rounded-sm bg-primary/70" style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </span>
  )
}

function CompatDots({ compat }: { compat: SkillCompat }) {
  return (
    <span className="flex items-center gap-1" aria-label={`兼容：${(Object.keys(compat) as (keyof SkillCompat)[]).filter((k) => compat[k]).map((k) => TOOL_LABEL[k]).join('、') || '无'}`}>
      {(Object.keys(TOOL_LABEL) as (keyof SkillCompat)[]).map((k) => (
        <span key={k} title={`${TOOL_LABEL[k]}${compat[k] ? '' : '（不兼容）'}`} className={cn('rounded px-1 py-0.5 font-mono text-[10px] leading-none', compat[k] ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground line-through')}>
          {TOOL_LABEL[k].slice(0, 2)}
        </span>
      ))}
    </span>
  )
}

function OutputBadge({ output }: { output: SkillOutput }) {
  const m = OUTPUT_META[output]
  const Icon = m.icon
  return (
    <Badge tone={m.tone}>
      <Icon className="size-3" aria-hidden="true" />
      {m.label}
    </Badge>
  )
}

function SourceLine({ source }: { source: SkillSource }) {
  const m = SOURCE_META[source.kind]
  const Icon = m.icon
  const canUpdate = source.linked && source.upstreamVersion && source.upstreamVersion !== source.version
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer" className={cn('truncate hover:text-foreground hover:underline', FOCUS_RING)}>
          {source.label}
        </a>
      ) : (
        <span className="truncate">{source.label}</span>
      )}
      {source.linked ? (
        <span className="flex items-center gap-0.5 text-success"><Link2 className="size-3" aria-hidden="true" />已连接</span>
      ) : (
        <span className="text-muted-foreground">未连接</span>
      )}
      {canUpdate && <Badge tone="warning">可更新 {source.upstreamVersion}</Badge>}
    </span>
  )
}

/** 效果展示：图片占位用渐变块 + alt，避免依赖不存在的图片文件 */
function ShowcaseThumb({ item, className }: { item: SkillShowcase; className?: string }) {
  if (item.output === 'image' || item.output === 'video') {
    return (
      <figure className={cn('relative overflow-hidden rounded-lg bg-muted', className)}>
        <div role="img" aria-label={item.result} className="absolute inset-0 bg-gradient-to-br from-primary/30 via-technical/20 to-muted" />
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-3 text-[11px] text-card">
          <span className="block truncate font-medium">{item.title}</span>
          <span className="block truncate opacity-80">{item.model}</span>
        </figcaption>
      </figure>
    )
  }
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg bg-muted/60', className)}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="truncate font-medium text-foreground">{item.title}</span>
        <span className="shrink-0">{item.model}</span>
      </div>
      <pre className="flex-1 overflow-hidden px-3 pb-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">{item.result}</pre>
    </div>
  )
}

function Stars({ value }: { value?: number }) {
  if (!value) return <span className="text-[11px] text-muted-foreground">未评分</span>
  return (
    <span className="flex items-center gap-0.5" aria-label={`评分 ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn('size-3', i <= value ? 'fill-warning text-warning' : 'text-border')} aria-hidden="true" />)}
    </span>
  )
}

// =============================================================================
// Skill 卡片
// =============================================================================

function SkillCard({ skill, selected, onOpen, onTogglePin, onToggleSelect, compact }: { skill: Skill; selected?: boolean; onOpen: (s: Skill) => void; onTogglePin: (id: string) => void; onToggleSelect?: (id: string) => void; compact?: boolean }) {
  return (
    <li className={cn('group relative flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm transition-shadow duration-150 hover:shadow-md', selected && 'ring-2 ring-primary')}>
      <div className="flex items-start gap-3">
        {onToggleSelect && (
          <label className="mt-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center">
            <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(skill.id)} className="peer sr-only" aria-label={`选择 ${skill.name} 进行对比`} />
            <span className={cn('flex size-4 items-center justify-center rounded border border-border bg-card transition-colors duration-150 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring', selected && 'border-primary bg-primary')}>
              {selected && <Check className="size-3 text-primary-foreground" aria-hidden="true" />}
            </span>
          </label>
        )}
        <button type="button" onClick={() => onOpen(skill)} className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{skill.name}</span>
            <OutputBadge output={skill.output} />
            {skill.source.kind === 'evolved' && <Badge tone="primary"><GitMerge className="size-3" aria-hidden="true" />进化版</Badge>}
            {skill.source.linked && skill.source.upstreamVersion && skill.source.upstreamVersion !== skill.version && <Badge tone="warning">可更新</Badge>}
          </span>
          {!compact && <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground text-pretty">{skill.description}</span>}
        </button>
        <IconButton label={skill.pinned ? '取消置顶' : '置顶'} icon={Pin} active={skill.pinned} onClick={() => onTogglePin(skill.id)} side="left" />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {skill.tags.slice(0, compact ? 3 : 5).map((t) => <TagPill key={t}>{t}</TagPill>)}
        {skill.tags.length > (compact ? 3 : 5) && <span className="text-[11px] text-muted-foreground">+{skill.tags.length - (compact ? 3 : 5)}</span>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><TrendingUp className="size-3" aria-hidden="true" />{skill.usageCount} 次</span>
          <Sparkline data={skill.usageTrend} />
          <span className={cn(skill.successRate >= 85 ? TONE_TEXT.success : skill.successRate >= 75 ? TONE_TEXT.warning : TONE_TEXT.danger)}>{skill.successRate}% 成功</span>
        </span>
        <CompatDots compat={skill.compat} />
      </div>
      {!compact && <SourceLine source={skill.source} />}
    </li>
  )
}

// =============================================================================
// 主组件
// =============================================================================

type Tab = 'overview' | 'all' | 'compare' | 'lineage'
type SortKey = 'recent' | 'usage' | 'success' | 'added'

export default function SkillLibrary({ onToast }: { onToast: (t: Omit<Toast, 'id'>) => void }) {
  const [skills, setSkills] = useState<Skill[]>(SKILLS)
  useEffect(() => { void fetchSkills().then((items) => setSkills(items as Skill[])).catch(() => undefined) }, [])
  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [outputFilter, setOutputFilter] = useState<SkillOutput | 'all'>('all')
  const [domainFilter, setDomainFilter] = useState<SkillDomain | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('recent')
  const [detail, setDetail] = useState<Skill | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>(['s-1', 's-5'])
  const [compareModel, setCompareModel] = useState('flux-1.1-pro')
  const [comparePrompt, setComparePrompt] = useState('拾遗人立于山巅，晨雾，广角，逆光')
  const [compareRunning, setCompareRunning] = useState(false)
  const [compareResult, setCompareResult] = useState<null | { same: string[]; diff: { aspect: string; a: string; b: string }[]; outputs: { id: string; result: string }[] }>(null)
  const [evolveOpen, setEvolveOpen] = useState(false)

  const togglePin = (id: string) => setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)))
  const toggleCompare = (id: string) =>
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) {
        onToast({ tone: 'warning', title: '最多对比 3 个 Skill' })
        return prev
      }
      return [...prev, id]
    })

  const q = query.trim().toLowerCase()
  const allTags = useMemo(() => Array.from(new Set(skills.flatMap((s) => s.tags))).sort(), [skills])

  const filtered = useMemo(() => {
    const list = skills
      .filter((s) => outputFilter === 'all' || s.output === outputFilter)
      .filter((s) => domainFilter === 'all' || s.domains.includes(domainFilter))
      .filter((s) => !tagFilter || s.tags.includes(tagFilter))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)))
    const by: Record<SortKey, (a: Skill, b: Skill) => number> = {
      recent: (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
      usage: (a, b) => b.usageCount - a.usageCount,
      success: (a, b) => b.successRate - a.successRate,
      added: (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
    }
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || by[sort](a, b))
  }, [skills, outputFilter, domainFilter, tagFilter, q, sort])

  const recent = useMemo(() => [...skills].sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()).slice(0, 4), [skills])
  const pinned = useMemo(() => skills.filter((s) => s.pinned), [skills])
  const newest = useMemo(() => [...skills].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()).slice(0, 3), [skills])
  const updatable = skills.filter((s) => s.source.linked && s.source.upstreamVersion && s.source.upstreamVersion !== s.version)
  const allShowcase = useMemo(() => skills.flatMap((s) => s.showcase.map((sc) => ({ ...sc, skillName: s.name, skillId: s.id }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [skills])

  const compareSkills = compareIds.map((id) => skills.find((s) => s.id === id)!).filter(Boolean)
  const compareOutput = compareSkills[0]?.output
  const compareModels = MODELS.filter((m) => !compareOutput || m.outputs.includes(compareOutput))

  const runCompare = () => {
    if (compareSkills.length < 2) return onToast({ tone: 'warning', title: '至少选择 2 个 Skill' })
    setCompareRunning(true)
    setCompareResult(null)
    // 模拟：接入后端后改为 POST /skills/compare，SSE 返回逐个结果
    window.setTimeout(() => {
      const [a, b] = compareSkills
      const same = a.tags.filter((t) => b.tags.includes(t))
      const structSame = a.structure.filter((x) => b.structure.some((y) => y.includes('一致性') && x.includes('一致性')))
      setCompareResult({
        same: [...same.map((t) => `标签「${t}」`), ...structSame.map((s) => `结构：${s}`)],
        diff: [
          { aspect: '输出重点', a: a.useCases[0], b: b.useCases[0] },
          { aspect: '结构层数', a: `${a.structure.length} 层`, b: `${b.structure.length} 层` },
          { aspect: '触发方式', a: a.usage, b: b.usage },
          { aspect: '成功率', a: `${a.successRate}%`, b: `${b.successRate}%` },
          { aspect: '兼容工具', a: Object.entries(a.compat).filter(([, v]) => v).map(([k]) => TOOL_LABEL[k as keyof SkillCompat]).join(' / '), b: Object.entries(b.compat).filter(([, v]) => v).map(([k]) => TOOL_LABEL[k as keyof SkillCompat]).join(' / ') },
        ],
        outputs: compareSkills.map((s) => ({ id: s.id, result: `${s.name} 生成结果（${MODELS.find((m) => m.id === compareModel)?.label}）` })),
      })
      setCompareRunning(false)
      onToast({ tone: 'success', title: '对比完成', description: `${compareSkills.length} 个 Skill · 同一提示词 · 同一模型` })
    }, 1400)
  }

  const TABS: { id: Tab; label: string; icon: IconType; badge?: number }[] = [
    { id: 'overview', label: '总览', icon: Sparkles },
    { id: 'all', label: '全部', icon: Grid3X3, badge: skills.length },
    { id: 'compare', label: '对比与进化', icon: GitCompareArrows, badge: compareIds.length || undefined },
    { id: 'lineage', label: '谱系', icon: GitBranch },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 顶部：搜索 + 标签页 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Skill 库分区" className="flex rounded-lg bg-muted p-1">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} role="tab" type="button" aria-selected={active} onClick={() => setTab(t.id)} className={cn('flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-150', FOCUS_RING, active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="size-4" aria-hidden="true" />
                {t.label}
                {t.badge !== undefined && <span className={cn('rounded px-1.5 text-[11px] tabular-nums', active ? 'bg-primary/10 text-primary' : 'bg-card text-muted-foreground')}>{t.badge}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <label className="relative w-full max-w-xs">
            <span className="sr-only">搜索 Skill</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQuery('')} placeholder="搜索名称、描述、标签" className={cn('h-9 w-full rounded-lg border border-transparent bg-card pr-8 pl-9 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary', FOCUS_RING)} />
            {query && <button type="button" aria-label="清空" onClick={() => setQuery('')} className={cn('absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground', FOCUS_RING)}><X className="size-3.5" aria-hidden="true" /></button>}
          </label>
          <Button variant="primary" size="md" onClick={() => onToast({ tone: 'info', title: '收录 Skill', description: '支持 GitHub 仓库、网页、本地目录或从 Codex / Cursor / Trae / Claude Code 导入。' })}>
            <Plus className="size-4" aria-hidden="true" />
            收录
          </Button>
        </div>
      </div>

      {/* ================= 总览 ================= */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          {updatable.length > 0 && (
            <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-[13px]', TONE_BADGE.warning)}>
              <span className="flex items-center gap-2"><Download className="size-4" aria-hidden="true" />{updatable.length} 个已连接来源的 Skill 有上游更新：{updatable.map((s) => `${s.name} ${s.version} → ${s.source.upstreamVersion}`).join('；')}</span>
              <Button onClick={() => onToast({ tone: 'info', title: '检查差异', description: '接入后端后显示上游 diff 并可一键更新，保留本地修改。' })}>查看差异</Button>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex flex-col gap-6">
              {/* 最近使用 */}
              <section aria-labelledby="recent-h" className="rounded-lg bg-card shadow-sm">
                <div className="flex h-14 items-center justify-between px-6">
                  <h2 id="recent-h" className="flex items-center gap-2 text-[13px] font-medium text-foreground"><Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />最近使用</h2>
                  <Button variant="ghost" onClick={() => { setTab('all'); setSort('recent') }}>全部<ChevronRight className="size-3.5" aria-hidden="true" /></Button>
                </div>
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {recent.map((s) => {
                    const Icon = OUTPUT_META[s.output].icon
                    return (
                      <li key={s.id} className="flex items-center gap-4 px-6 py-3 transition-colors duration-150 hover:bg-surface-raised">
                        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', TONE_BADGE[OUTPUT_META[s.output].tone])}><Icon className="size-4" aria-hidden="true" /></span>
                        <button type="button" onClick={() => setDetail(s)} className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
                          <span className="flex items-center gap-2"><span className="truncate text-[13px] font-medium text-foreground">{s.name}</span>{s.pinned && <Pin className="size-3 fill-warning text-warning" aria-label="已置顶" />}</span>
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">{s.usage}</span>
                        </button>
                        <span className="flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground"><Sparkline data={s.usageTrend} /><span>{relativeTime(s.lastUsedAt)}</span></span>
                      </li>
                    )
                  })}
                </ul>
              </section>

              {/* 效果展示 */}
              <section aria-labelledby="showcase-h" className="rounded-lg bg-card shadow-sm">
                <div className="flex h-14 items-center justify-between px-6">
                  <h2 id="showcase-h" className="flex items-center gap-2 text-[13px] font-medium text-foreground"><FlaskConical className="size-4 text-muted-foreground" aria-hidden="true" />效果展示<span className="font-normal tabular-nums text-muted-foreground">{allShowcase.length}</span></h2>
                  <Button onClick={() => setTab('compare')}><Wand2 className="size-3.5" aria-hidden="true" />生成新效果</Button>
                </div>
                <ul className="grid gap-4 border-t border-border/60 p-6 sm:grid-cols-2 xl:grid-cols-3">
                  {allShowcase.slice(0, 6).map((sc) => (
                    <li key={sc.id} className="flex flex-col gap-2">
                      <ShowcaseThumb item={sc} className="aspect-[4/3]" />
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <button type="button" onClick={() => setDetail(skills.find((s) => s.id === sc.skillId)!)} className={cn('truncate rounded hover:text-foreground hover:underline', FOCUS_RING)}>{sc.skillName}</button>
                        <Stars value={sc.score} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="flex flex-col gap-6">
              {/* 置顶 */}
              <section aria-labelledby="pinned-h" className="rounded-lg bg-card shadow-sm">
                <div className="flex h-14 items-center px-6"><h2 id="pinned-h" className="flex items-center gap-2 text-[13px] font-medium text-foreground"><Pin className="size-4 text-muted-foreground" aria-hidden="true" />置顶<span className="font-normal tabular-nums text-muted-foreground">{pinned.length}</span></h2></div>
                <ul className="flex flex-col gap-3 border-t border-border/60 p-4">
                  {pinned.map((s) => <SkillCard key={s.id} skill={s} compact onOpen={setDetail} onTogglePin={togglePin} />)}
                  {pinned.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-muted-foreground">还没有置顶的 Skill</li>}
                </ul>
              </section>
              {/* 最近收录 */}
              <section aria-labelledby="newest-h" className="rounded-lg bg-card shadow-sm">
                <div className="flex h-14 items-center px-6"><h2 id="newest-h" className="flex items-center gap-2 text-[13px] font-medium text-foreground"><Plus className="size-4 text-muted-foreground" aria-hidden="true" />最近收录</h2></div>
                <ul className="divide-y divide-border/60 border-t border-border/60">
                  {newest.map((s) => (
                    <li key={s.id} className="flex flex-col gap-1 px-6 py-3">
                      <button type="button" onClick={() => setDetail(s)} className={cn('flex items-center justify-between gap-2 rounded text-left text-[13px] font-medium text-foreground', FOCUS_RING)}><span className="truncate">{s.name}</span><span className="shrink-0 text-[11px] font-normal text-muted-foreground">{relativeTime(s.addedAt)}</span></button>
                      <SourceLine source={s.source} />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ================= 全部 ================= */}
      {tab === 'all' && (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6 lg:sticky lg:top-0">
            <section className="rounded-lg bg-card p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">输出类型</p>
              <div className="flex flex-col gap-0.5">
                <Chip active={outputFilter === 'all'} onClick={() => setOutputFilter('all')} className="justify-between">全部<span className="tabular-nums opacity-70">{skills.length}</span></Chip>
                {(Object.keys(OUTPUT_META) as SkillOutput[]).map((o) => {
                  const Icon = OUTPUT_META[o].icon
                  const n = skills.filter((s) => s.output === o).length
                  return <Chip key={o} active={outputFilter === o} onClick={() => setOutputFilter(o)} className="justify-between"><span className="flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden="true" />{OUTPUT_META[o].label}</span><span className="tabular-nums opacity-70">{n}</span></Chip>
                })}
              </div>
            </section>
            <section className="rounded-lg bg-card p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">适用领域</p>
              <div className="flex flex-col gap-0.5">
                <Chip active={domainFilter === 'all'} onClick={() => setDomainFilter('all')}>全部</Chip>
                {(Object.keys(DOMAIN_LABEL) as SkillDomain[]).map((d) => <Chip key={d} active={domainFilter === d} onClick={() => setDomainFilter(d)}>{DOMAIN_LABEL[d]}</Chip>)}
              </div>
            </section>
            <section className="rounded-lg bg-card p-4 shadow-sm">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Tag className="size-3.5" aria-hidden="true" />标签</p>
              <div className="flex flex-wrap gap-1">
                {allTags.map((t) => (
                  <button key={t} type="button" aria-pressed={tagFilter === t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={cn('rounded px-1.5 py-0.5 text-[11px] transition-colors duration-150', FOCUS_RING, tagFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground')}>{t}</button>
                ))}
              </div>
            </section>
          </aside>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[13px] text-muted-foreground">{filtered.length} 个 Skill{compareIds.length > 0 && ` · 已选 ${compareIds.length} 个待对比`}</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  排序
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={cn('h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground', FOCUS_RING)}>
                    <option value="recent">最近使用</option><option value="usage">调用次数</option><option value="success">成功率</option><option value="added">收录时间</option>
                  </select>
                </label>
                {compareIds.length >= 2 && <Button variant="primary" onClick={() => setTab('compare')}><GitCompareArrows className="size-3.5" aria-hidden="true" />对比 {compareIds.length} 个</Button>}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg bg-card shadow-sm"><EmptyState icon={Search} title="没有匹配的 Skill" description="换个关键词或清除筛选条件。" action={<Button onClick={() => { setQuery(''); setOutputFilter('all'); setDomainFilter('all'); setTagFilter(null) }}>清除筛选</Button>} /></div>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {filtered.map((s) => <SkillCard key={s.id} skill={s} selected={compareIds.includes(s.id)} onOpen={setDetail} onTogglePin={togglePin} onToggleSelect={toggleCompare} />)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ================= 对比与进化 ================= */}
      {tab === 'compare' && (
        <div className="flex flex-col gap-6">
          <section className="rounded-lg bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <h2 className="text-[13px] font-medium text-foreground">对比对象</h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">选择 2–3 个同类输出的 Skill；用同一提示词、同一模型生成结果进行对比。</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setTab('all')}><Plus className="size-3.5" aria-hidden="true" />添加 Skill</Button>
                <Button variant="primary" disabled={compareSkills.length < 2} onClick={() => setEvolveOpen(true)}><GitMerge className="size-3.5" aria-hidden="true" />融合为进化版</Button>
              </div>
            </div>
            <div className="grid gap-4 border-t border-border/60 p-6 md:grid-cols-2 xl:grid-cols-3">
              {compareSkills.map((s) => (
                <div key={s.id} className="relative flex flex-col gap-3 rounded-lg bg-muted/60 p-4">
                  <button type="button" aria-label={`移出 ${s.name}`} onClick={() => toggleCompare(s.id)} className={cn('absolute top-3 right-3 flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-card hover:text-foreground', FOCUS_RING)}><X className="size-3.5" aria-hidden="true" /></button>
                  <div className="flex items-center gap-2 pr-8"><span className="text-[13px] font-medium text-foreground">{s.name}</span><OutputBadge output={s.output} /></div>
                  <dl className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[11px]">
                    <dt className="text-muted-foreground">结构</dt><dd className="text-foreground">{s.structure.length} 层：{s.structure.join(' → ')}</dd>
                    <dt className="text-muted-foreground">场景</dt><dd className="text-foreground">{s.useCases.join('、')}</dd>
                    <dt className="text-muted-foreground">用法</dt><dd className="font-mono text-foreground">{s.usage}</dd>
                    <dt className="text-muted-foreground">效果</dt><dd className="text-foreground">{s.successRate}% 成功 · {s.usageCount} 次 · {s.goldenCases} 个固定用例</dd>
                  </dl>
                  <div className="flex flex-wrap gap-1">{s.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}</div>
                </div>
              ))}
              {compareSkills.length < 3 && (
                <button type="button" onClick={() => setTab('all')} className={cn('flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-[13px] text-muted-foreground transition-colors duration-150 hover:border-primary hover:text-primary', FOCUS_RING)}>
                  <Plus className="size-5" aria-hidden="true" />从「全部」勾选加入
                </button>
              )}
            </div>
          </section>

          {/* 生成对比 */}
          <section className="rounded-lg bg-card shadow-sm">
            <div className="flex flex-wrap items-end gap-3 px-6 py-4">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                统一提示词
                <input value={comparePrompt} onChange={(e) => setComparePrompt(e.target.value)} className={cn('h-9 rounded-lg border border-border bg-card px-3 text-[13px] font-normal text-foreground', FOCUS_RING)} />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                模型
                <select value={compareModel} onChange={(e) => setCompareModel(e.target.value)} className={cn('h-9 rounded-lg border border-border bg-card px-2 text-[13px] font-normal text-foreground', FOCUS_RING)}>
                  {compareModels.map((m) => <option key={m.id} value={m.id}>{m.label}{m.local ? ' · 本地' : ''}</option>)}
                </select>
              </label>
              <Button variant="primary" size="md" disabled={compareRunning || compareSkills.length < 2} onClick={runCompare}>
                {compareRunning ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
                {compareRunning ? '生成中…' : '生成并对比'}
              </Button>
            </div>

            {compareRunning && (
              <div className="grid gap-4 border-t border-border/60 p-6 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {compareSkills.map((s) => <div key={s.id} className="aspect-[4/3] animate-pulse rounded-lg bg-muted" />)}
              </div>
            )}

            {compareResult && !compareRunning && (
              <div className="flex flex-col gap-6 border-t border-border/60 p-6">
                <div>
                  <p className="mb-3 text-[11px] font-medium text-muted-foreground">生成结果（同一提示词 · {MODELS.find((m) => m.id === compareModel)?.label}）</p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {compareResult.outputs.map((o) => {
                      const s = skills.find((x) => x.id === o.id)!
                      return (
                        <div key={o.id} className="flex flex-col gap-2">
                          <ShowcaseThumb item={{ id: o.id, output: s.output, title: s.name, prompt: comparePrompt, model: MODELS.find((m) => m.id === compareModel)?.label ?? '', result: o.result, createdAt: new Date().toISOString() }} className="aspect-[4/3]" />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-muted-foreground">评分</span>
                            <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} type="button" aria-label={`${s.name} 评 ${i} 星`} onClick={() => onToast({ tone: 'success', title: `已评分 ${i} 星`, description: s.name })} className={cn('rounded text-border hover:text-warning', FOCUS_RING)}><Star className="size-3.5" aria-hidden="true" /></button>)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className={cn('rounded-lg p-4', TONE_BADGE.success)}>
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium"><CheckCircle2 className="size-3.5" aria-hidden="true" />相同之处</p>
                    <ul className="flex flex-col gap-1 text-[13px] text-foreground">{compareResult.same.map((s, i) => <li key={i} className="flex items-start gap-1.5"><Check className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{s}</li>)}{compareResult.same.length === 0 && <li className="text-muted-foreground">没有共同标签或结构</li>}</ul>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><GitCompareArrows className="size-3.5" aria-hidden="true" />差异</p>
                    <table className="w-full text-[13px]">
                      <thead><tr className="text-left text-[11px] text-muted-foreground"><th className="pb-1 font-medium">维度</th><th className="pb-1 font-medium">{compareSkills[0]?.name}</th><th className="pb-1 font-medium">{compareSkills[1]?.name}</th></tr></thead>
                      <tbody className="divide-y divide-border/60">{compareResult.diff.map((d) => <tr key={d.aspect} className="align-top"><td className="py-1.5 pr-2 text-muted-foreground">{d.aspect}</td><td className="py-1.5 pr-2 text-foreground">{d.a}</td><td className="py-1.5 text-foreground">{d.b}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= 谱系 ================= */}
      {tab === 'lineage' && (
        <section className="rounded-lg bg-card shadow-sm">
          <div className="flex h-14 items-center justify-between px-6">
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground"><GitBranch className="size-4 text-muted-foreground" aria-hidden="true" />进化谱系</h2>
            <p className="text-[11px] text-muted-foreground">进化版从父 Skill 继承结构；父 Skill 更新时提示是否重新融合。</p>
          </div>
          <ul className="flex flex-col gap-6 border-t border-border/60 p-6">
            {skills.filter((s) => s.parentIds?.length).map((child) => (
              <li key={child.id} className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)]">
                <ul className="flex flex-col gap-3">
                  {child.parentIds!.map((pid) => { const p = skills.find((s) => s.id === pid)!; return <SkillCard key={pid} skill={p} compact onOpen={setDetail} onTogglePin={togglePin} /> })}
                </ul>
                <div className="flex items-center justify-center text-muted-foreground" aria-hidden="true"><GitMerge className="size-5 rotate-90 lg:rotate-0" /></div>
                <ul><SkillCard skill={child} compact onOpen={setDetail} onTogglePin={togglePin} /></ul>
              </li>
            ))}
            {skills.filter((s) => s.parentIds?.length).length === 0 && <li><EmptyState icon={GitBranch} title="还没有进化版 Skill" description="在「对比与进化」中选择 2 个以上 Skill，融合为进化版。" /></li>}
          </ul>
        </section>
      )}

      {/* ================= 详情弹窗 ================= */}
      <SkillDetail skill={detail} skills={skills} onClose={() => setDetail(null)} onTogglePin={togglePin} onToast={onToast} onCompare={(id) => { setDetail(null); setTab('compare'); if (!compareIds.includes(id)) toggleCompare(id) }} />

      {/* ================= 融合弹窗 ================= */}
      <Dialog open={evolveOpen} onClose={() => setEvolveOpen(false)} title="融合为进化版" description={`将 ${compareSkills.map((s) => s.name).join(' + ')} 的结构合并为新 Skill`} width="md">
        <div className="flex flex-col gap-4 p-6">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">新 Skill 名称<input defaultValue={`${compareSkills[0]?.name ?? ''} · 进化版`} className={cn('h-9 rounded-lg border border-border bg-card px-3 text-[13px] font-normal text-foreground', FOCUS_RING)} /></label>
          <div>
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">合并策略</p>
            <ul className="flex flex-col gap-2 text-[13px]">
              {[['共同结构层合并为一层，保留更严格的约束', true], ['差异结构层全部保留，按父 Skill 顺序排列', true], ['标签取并集；场景与用法由 AI 重写', true], ['继承父 Skill 的固定用例作为回归基线', true]].map(([t, on]) => <li key={t as string} className="flex items-center gap-2 text-foreground"><CheckCircle2 className={cn('size-4', on ? 'text-success' : 'text-border')} aria-hidden="true" />{t as string}</li>)}
            </ul>
          </div>
          <div className={cn('flex gap-2 rounded-lg p-3 text-[13px]', TONE_BADGE.info)}><ListChecks className="mt-0.5 size-4 shrink-0" aria-hidden="true" />融合后会自动跑父 Skill 的全部固定用例（共 {compareSkills.reduce((a, s) => a + s.goldenCases, 0)} 个），通过率低于父 Skill 时标记为草稿。</div>
          <div className="flex justify-end gap-2"><Button onClick={() => setEvolveOpen(false)}>取消</Button><Button variant="primary" onClick={() => { setEvolveOpen(false); onToast({ tone: 'success', title: '已创建进化版草稿', description: '接入后端后由 AI 生成合并结构并运行回归用例。' }) }}><GitMerge className="size-3.5" aria-hidden="true" />开始融合</Button></div>
        </div>
      </Dialog>
    </div>
  )
}

// =============================================================================
// 详情弹窗：结构 / 效果 / 场景 / 用法 + 来源 + 兼容 + 权限 + 效果展示
// =============================================================================

function SkillDetail({ skill, skills, onClose, onTogglePin, onToast, onCompare }: { skill: Skill | null; skills: Skill[]; onClose: () => void; onTogglePin: (id: string) => void; onToast: (t: Omit<Toast, 'id'>) => void; onCompare: (id: string) => void }) {
  const [genModel, setGenModel] = useState('')
  const [genPrompt, setGenPrompt] = useState('')
  const [running, setRunning] = useState(false)
  if (!skill) return null
  const models = MODELS.filter((m) => m.outputs.includes(skill.output))
  const model = genModel || models[0]?.id
  const parents = skill.parentIds?.map((id) => skills.find((s) => s.id === id)!).filter(Boolean) ?? []
  const children = skills.filter((s) => s.parentIds?.includes(skill.id))

  const run = () => {
    setRunning(true)
    window.setTimeout(() => { setRunning(false); onToast({ tone: 'success', title: '已生成效果', description: `${skill.name} · ${MODELS.find((m) => m.id === model)?.label}` }) }, 1200)
  }

  const Section = ({ title, icon: Icon, children }: { title: string; icon: IconType; children: ReactNode }) => (
    <section className="flex flex-col gap-2"><h3 className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{title}</h3>{children}</section>
  )

  return (
    <Dialog open onClose={onClose} title={skill.name} description={`${skill.usage} · v${skill.version} · ${skill.domains.map((d) => DOMAIN_LABEL[d]).join(' / ')}`} width="xl">
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          <p className="text-[13px] leading-relaxed text-foreground text-pretty">{skill.description}</p>
          <div className="grid gap-6 md:grid-cols-2">
            <Section title="结构分析" icon={Layers}><ol className="flex flex-col gap-1.5">{skill.structure.map((s, i) => <li key={i} className="flex items-start gap-2 text-[13px] text-foreground"><span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-muted font-mono text-[10px] text-muted-foreground">{i + 1}</span>{s}</li>)}</ol></Section>
            <Section title="适用场景" icon={BookOpen}><ul className="flex flex-col gap-1.5">{skill.useCases.map((u) => <li key={u} className="flex items-start gap-2 text-[13px] text-foreground"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />{u}</li>)}</ul></Section>
          </div>
          <Section title="标签（结构 / 效果 / 场景 / 用法）" icon={Tag}><div className="flex flex-wrap gap-1">{skill.tags.map((t) => <TagPill key={t}>{t}</TagPill>)}</div></Section>

          {/* 效果展示 + 生成 */}
          <Section title="效果展示" icon={FlaskConical}>
            <div className="flex flex-wrap items-end gap-2 rounded-lg bg-muted/60 p-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-muted-foreground">提示词<input value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder={skill.showcase[0]?.prompt ?? '输入测试提示词'} className={cn('h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground', FOCUS_RING)} /></label>
              <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">模型<select value={model} onChange={(e) => setGenModel(e.target.value)} className={cn('h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground', FOCUS_RING)}>{models.map((m) => <option key={m.id} value={m.id}>{m.label}{m.local ? ' · 本地' : ''}</option>)}</select></label>
              <Button variant="primary" disabled={running} onClick={run}>{running ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}{running ? '生成中' : '生成'}</Button>
            </div>
            {skill.showcase.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">{skill.showcase.map((sc) => <li key={sc.id} className="flex flex-col gap-1.5"><ShowcaseThumb item={sc} className="aspect-[4/3]" /><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span className="truncate">{sc.prompt}</span><Stars value={sc.score} /></div></li>)}</ul>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-[13px] text-muted-foreground">还没有效果记录，先生成一次看看。</p>
            )}
          </Section>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="flex gap-2"><Button variant={skill.pinned ? 'primary' : 'outline'} className="flex-1" onClick={() => onTogglePin(skill.id)}><Pin className="size-3.5" aria-hidden="true" />{skill.pinned ? '已置顶' : '置顶'}</Button><Button className="flex-1" onClick={() => onCompare(skill.id)}><GitCompareArrows className="size-3.5" aria-hidden="true" />加入对比</Button></div>
          <Section title="使用统计" icon={TrendingUp}>
            <div className="rounded-lg bg-muted/60 p-3 text-[13px]"><div className="flex items-end justify-between"><span className="text-2xl font-semibold tabular-nums text-foreground">{skill.usageCount}</span><Sparkline data={skill.usageTrend} className="h-8" /></div><p className="mt-1 text-[11px] text-muted-foreground">总调用 · 近 7 天 {skill.usageTrend.reduce((a, b) => a + b, 0)} 次 · 成功率 <span className={TONE_TEXT[skill.successRate >= 85 ? 'success' : 'warning']}>{skill.successRate}%</span></p><p className="mt-1 text-[11px] text-muted-foreground">最近使用 {relativeTime(skill.lastUsedAt)} · 固定用例 {skill.goldenCases} 个</p></div>
          </Section>
          <Section title="来源" icon={SOURCE_META[skill.source.kind].icon}><div className="rounded-lg bg-muted/60 p-3"><SourceLine source={skill.source} />{skill.source.linked && skill.source.upstreamVersion !== skill.version && <Button className="mt-2 w-full" onClick={() => onToast({ tone: 'info', title: '检查上游差异' })}><Download className="size-3.5" aria-hidden="true" />更新到 {skill.source.upstreamVersion}</Button>}{skill.source.url && <a href={skill.source.url} target="_blank" rel="noreferrer" className={cn('mt-2 flex items-center gap-1 text-[11px] text-primary hover:underline', FOCUS_RING)}><ExternalLink className="size-3" aria-hidden="true" />打开来源</a>}</div></Section>
          <Section title="兼容工具" icon={Grid3X3}><div className="grid grid-cols-2 gap-1.5">{(Object.keys(TOOL_LABEL) as (keyof SkillCompat)[]).map((k) => <span key={k} className={cn('flex items-center gap-1.5 rounded px-2 py-1 text-[11px]', skill.compat[k] ? TONE_BADGE.success : 'bg-muted text-muted-foreground')}>{skill.compat[k] ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}{TOOL_LABEL[k]}</span>)}</div><Button className="w-full" onClick={() => onToast({ tone: 'success', title: '已复制安装命令', description: `kb skill install ${skill.slug}` })}><Copy className="size-3.5" aria-hidden="true" />复制安装命令</Button></Section>
          <Section title="权限与风险" icon={ShieldAlert}><ul className="flex flex-col gap-1">{skill.permissions.map((p) => <li key={p.label} className="flex items-center justify-between gap-2 text-[13px]"><span className="text-foreground">{p.label}</span><Badge tone={RISK_META[p.risk].tone}>{RISK_META[p.risk].label}风险</Badge></li>)}</ul></Section>
          {(parents.length > 0 || children.length > 0) && (
            <Section title="谱系" icon={GitBranch}><ul className="flex flex-col gap-1 text-[13px]">{parents.map((p) => <li key={p.id} className="flex items-center gap-1.5 text-muted-foreground"><span className="text-[11px]">父</span><span className="text-foreground">{p.name}</span></li>)}{children.map((c) => <li key={c.id} className="flex items-center gap-1.5 text-muted-foreground"><span className="text-[11px]">子</span><span className="text-foreground">{c.name}</span></li>)}</ul></Section>
          )}
        </aside>
      </div>
    </Dialog>
  )
}
