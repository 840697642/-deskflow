'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  AppWindow,
  Bell,
  BookOpen,
  Bot,
  Check,
  Clapperboard,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Gamepad2,
  Globe,
  GripVertical,
  Keyboard,
  Palette,
  RefreshCw,
  RotateCcw,
  ScrollText,
  Search,
  Shield,
  Sparkles,
  TriangleAlert,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Dialog, FOCUS_RING, TONE_BADGE, TONE_BAR, type IconType, type Toast, type Tone } from '@/components/ui-primitives'
import type { SpaceId } from '@/components/knowledge-shared'
import { fetchSettings } from '@/lib/api-client'

// =============================================================================
// 类型
// =============================================================================

export type SettingsScope = 'global' | Extract<SpaceId, 'app' | 'video' | 'game'>

type SectionId = 'models' | 'rules' | 'isolation' | 'knowledge' | 'notify' | 'logs' | 'appearance' | 'diagnostics'

/** 一个设置项：全局值 + 每个项目的可选覆盖 */
interface Setting<T = unknown> {
  global: T
  overrides: Partial<Record<Exclude<SettingsScope, 'global'>, T>>
}

type Values = Record<string, Setting>

const SCOPES: { id: SettingsScope; label: string; icon: IconType }[] = [
  { id: 'global', label: '全局', icon: Globe },
  { id: 'app', label: '应用开发', icon: AppWindow },
  { id: 'video', label: 'AI 视频', icon: Clapperboard },
  { id: 'game', label: '游戏开发', icon: Gamepad2 },
]

const SECTIONS: { id: SectionId; label: string; icon: IconType; description: string; keywords: string }[] = [
  { id: 'models', label: '模型与连接', icon: Cpu, description: '模型提供方、API Key、任务路由与成本上限。', keywords: '模型 api key ollama 路由 成本 降级' },
  { id: 'rules', label: 'AI 规则', icon: Bot, description: '系统提示、项目规则、行为开关与输出偏好。', keywords: '规则 提示词 记忆 联网 确认 代理' },
  { id: 'isolation', label: '隔离与权限', icon: Shield, description: '沙箱目录、跨项目访问、MCP 与 Skill 白名单。', keywords: '沙箱 隔离 权限 mcp skill 白名单 密钥' },
  { id: 'knowledge', label: '知识库与采集', icon: BookOpen, description: '归属规则、自动总结、错题提取、脱敏与保留。', keywords: '知识库 采集 总结 错题 脱敏 保留' },
  { id: 'notify', label: '通知策略', icon: Bell, description: '级别到渠道的矩阵、安静时段、聚合频率。', keywords: '通知 toast 公告 webhook 安静' },
  { id: 'logs', label: '日志', icon: ScrollText, description: '保留天数、级别阈值、订阅项目、导出。', keywords: '日志 保留 级别 订阅 导出' },
  { id: 'appearance', label: '外观与快捷键', icon: Palette, description: '主题、密度、字号与快捷键。', keywords: '主题 密度 字号 快捷键 外观' },
  { id: 'diagnostics', label: '诊断', icon: Activity, description: '服务连通性、错误统计、诊断包与重置。', keywords: '诊断 连通 重置 错误' },
]

// =============================================================================
// 初始值
// =============================================================================

const INITIAL: Values = {
  // 模型与连接
  'models.ollama.endpoint': { global: 'http://127.0.0.1:11434', overrides: {} },
  'models.default': { global: 'anthropic/claude-sonnet-4.5', overrides: { game: 'ollama/qwen2.5-coder:14b' } },
  'models.budget.daily': { global: 30, overrides: { video: 80 } },
  'models.budget.monthly': { global: 600, overrides: { video: 1200, game: 300, app: 400 } },
  'models.budget.warnAt': { global: 80, overrides: {} },
  'models.budget.onExceed': { global: 'fallback', overrides: {} },
  'models.routing': {
    global: [
      { task: '代码生成 / 重构', primary: 'anthropic/claude-sonnet-4.5', fallback: ['deepseek/deepseek-chat', 'ollama/qwen2.5-coder:14b'] },
      { task: '代码审查', primary: 'deepseek/deepseek-chat', fallback: ['ollama/qwen2.5-coder:14b'] },
      { task: '分镜 / 文案', primary: 'openai/gpt-5', fallback: ['anthropic/claude-sonnet-4.5'] },
      { task: '日志解读 / 总结', primary: 'ollama/qwen2.5-coder:14b', fallback: ['deepseek/deepseek-chat'] },
      { task: '错题分析', primary: 'anthropic/claude-sonnet-4.5', fallback: ['deepseek/deepseek-chat'] },
    ],
    overrides: {},
  },
  // AI 规则
  'rules.global': {
    global: `# 全局规则\n- 回复使用中文，代码注释使用中文。\n- 修改前先说明改动范围，超过 3 个文件需列出清单。\n- 不得删除用户数据；破坏性操作必须二次确认。\n- 引用知识库内容时给出来源。`,
    overrides: {},
  },
  'rules.project': {
    global: '',
    overrides: {
      game: `# 游戏开发规则\n- 遵循《ArkTS 编码规范 v3》，禁止 @Link 跨层传递。\n- 数值改动必须同步更新 关卡数值表。\n- 发布包只能用发布证书签名。`,
      app: `# 应用开发规则\n- 金额一律使用整数分。\n- 接口改动需同步 LedgerService 接口定义 v2。`,
    },
  },
  'rules.confirmCommands': { global: true, overrides: {} },
  'rules.allowNetwork': { global: true, overrides: { game: false } },
  'rules.writeScope': { global: './', overrides: { app: './apps/ledger', game: './entry' } },
  'rules.maxToolRounds': { global: 12, overrides: {} },
  'rules.agentDefault': { global: false, overrides: {} },
  'rules.language': { global: 'zh-CN', overrides: {} },
  'rules.replyLength': { global: 'balanced', overrides: {} },
  'rules.citeSources': { global: true, overrides: {} },
  'rules.memory.enabled': { global: true, overrides: {} },
  // 隔离与权限
  'isolation.root': { global: '~/NO.1 3mode', overrides: { app: '~/NO.1 3mode/apps/ledger', video: '~/NO.1 3mode/video', game: '~/NO.1 3mode/game' } },
  'isolation.crossRead': { global: false, overrides: {} },
  'isolation.perProjectKey': { global: true, overrides: {} },
  'isolation.mcp': { global: ['filesystem', 'knowledge', 'github'], overrides: { video: ['filesystem', 'knowledge', 'render-cluster'] } },
  'isolation.skills': { global: ['s-1', 's-2', 's-3'], overrides: { game: ['s-3', 's-5'] } },
  'isolation.keyVisibility': { global: 'owner', overrides: {} },
  // 知识库与采集
  'kb.defaultSpace': { global: 'chat', overrides: { app: 'app', video: 'video', game: 'game' } },
  'kb.autoSummary': { global: true, overrides: {} },
  'kb.autoError': { global: true, overrides: {} },
  'kb.redact': { global: true, overrides: {} },
  'kb.retentionDays': { global: 365, overrides: {} },
  // 通知
  'notify.matrix': {
    global: { bug: ['toast', 'banner', 'system'], warn: ['toast', 'banner'], notice: ['toast'], info: [] },
    overrides: { video: { bug: ['toast', 'banner', 'system', 'webhook'], warn: ['toast'], notice: [], info: [] } },
  },
  'notify.quiet': { global: { enabled: true, from: '23:00', to: '08:00' }, overrides: {} },
  'notify.digest': { global: '15m', overrides: {} },
  // 日志
  'logs.retentionDays': { global: 30, overrides: { video: 14 } },
  'logs.minLevel': { global: 'info', overrides: {} },
  'logs.subscribe': { global: ['app', 'video', 'game', 'system'], overrides: {} },
  'logs.exportDir': { global: '~/NO.1 3mode/exports/logs', overrides: {} },
  // 外观
  'ui.theme': { global: 'system', overrides: {} },
  'ui.density': { global: 'comfortable', overrides: {} },
  'ui.fontSize': { global: 13, overrides: {} },
  'ui.shortcuts': {
    global: [
      { action: '全局搜索', keys: 'Cmd K' },
      { action: 'AI 对话', keys: 'Cmd L' },
      { action: '任务队列', keys: 'Cmd J' },
      { action: '知识库', keys: 'Cmd Shift K' },
      { action: '日志', keys: 'Cmd Shift L' },
      { action: '新建任务', keys: 'Cmd N' },
    ],
    overrides: {},
  },
}

const MODEL_OPTIONS = [
  { id: 'ollama/qwen2.5-coder:14b', label: 'Qwen2.5 Coder 14B · 本地' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
  { id: 'openai/gpt-5', label: 'GPT-5' },
]

const PROVIDERS = [
  { id: 'ollama', label: 'Ollama（本地）', kind: 'local', status: 'online' as const, key: null },
  { id: 'deepseek', label: 'DeepSeek', kind: 'api', status: 'online' as const, key: 'sk-de••••••••7f2a' },
  { id: 'anthropic', label: 'Anthropic', kind: 'api', status: 'online' as const, key: 'sk-an••••••••c91e' },
  { id: 'openai', label: 'OpenAI', kind: 'api', status: 'degraded' as const, key: 'sk-op••••••••0b44' },
  { id: 'custom', label: '自定义 OpenAI 兼容端点', kind: 'api', status: 'offline' as const, key: null },
]

const MCP_ALL = ['filesystem', 'knowledge', 'github', 'render-cluster', 'browser', 'shell']
const SKILL_ALL = [
  { id: 's-1', name: '需求拆解' },
  { id: 's-2', name: '接口文档生成' },
  { id: 's-3', name: 'ArkTS 代码审查' },
  { id: 's-4', name: '分镜提示词' },
  { id: 's-5', name: 'HAP 发布检查' },
]

// =============================================================================
// 通用表单控件
// =============================================================================

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150', FOCUS_RING, checked ? 'bg-primary' : 'bg-border')}
    >
      <span aria-hidden="true" className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-card shadow-sm transition-transform duration-150', checked && 'translate-x-4')} />
    </button>
  )
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md bg-muted p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className={cn('h-8 rounded px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-150', FOCUS_RING, value === o.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const inputCls = cn('h-9 rounded-lg border border-transparent bg-muted px-3 text-[13px] text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:border-primary focus:bg-card', FOCUS_RING)

/** 一行设置：标题 / 说明 / 控件 + 作用域覆盖标记 */
function Row({
  title,
  description,
  overridden,
  inheritable,
  onReset,
  children,
  align = 'center',
}: {
  title: string
  description?: string
  overridden?: boolean
  inheritable?: boolean // 处于项目作用域时显示「继承全局」
  onReset?: () => void
  children: ReactNode
  align?: 'center' | 'start'
}) {
  return (
    <div className={cn('flex flex-col gap-3 py-4 md:flex-row md:justify-between md:gap-8', align === 'center' ? 'md:items-center' : 'md:items-start')}>
      <div className="min-w-0 md:max-w-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          {inheritable && (overridden ? <span className="rounded bg-primary/8 px-1.5 py-0.5 text-[11px] font-medium text-primary">已覆盖</span> : <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">继承全局</span>)}
          {inheritable && overridden && onReset && (
            <button type="button" onClick={onReset} className={cn('flex items-center gap-1 rounded text-[11px] text-muted-foreground hover:text-foreground', FOCUS_RING)}>
              <RotateCcw className="size-3" aria-hidden="true" />
              重置
            </button>
          )}
        </div>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2 md:max-w-[520px]">{children}</div>
    </div>
  )
}

function Card({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
        <div>
          <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="divide-y divide-border/60 px-6">{children}</div>
    </section>
  )
}

// =============================================================================
// 主组件
// =============================================================================

export default function SettingsView({ onToast }: { onToast: (t: Omit<Toast, 'id'>) => void }) {
  const [scope, setScope] = useState<SettingsScope>('global')
  const [section, setSection] = useState<SectionId>('models')
  const [values, setValues] = useState<Values>(INITIAL)
  useEffect(() => { void fetchSettings(scope).then((result) => setValues((prev) => Object.fromEntries(Object.entries(prev).map(([key, setting]) => [key, { ...setting, global: result.values[key] ?? setting.global }])) as Values)).catch(() => undefined) }, [scope])
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const isProject = scope !== 'global'
  const projectScope = isProject ? (scope as Exclude<SettingsScope, 'global'>) : null

  /** 读取当前作用域生效值 */
  const get = <T,>(key: string): T => {
    const s = values[key]
    if (projectScope && s.overrides[projectScope] !== undefined) return s.overrides[projectScope] as T
    return s.global as T
  }
  const isOverridden = (key: string) => !!projectScope && values[key].overrides[projectScope] !== undefined
  /** 写入：全局作用域改 global；项目作用域写 override */
  const set = <T,>(key: string, v: T) => {
    setValues((prev) => {
      const s = prev[key]
      return { ...prev, [key]: projectScope ? { ...s, overrides: { ...s.overrides, [projectScope]: v } } : { ...s, global: v } }
    })
    setDirty((d) => new Set(d).add(key))
  }
  const reset = (key: string) => {
    if (!projectScope) return
    setValues((prev) => {
      const s = prev[key]
      const o = { ...s.overrides }
      delete o[projectScope]
      return { ...prev, [key]: { ...s, overrides: o } }
    })
    setDirty((d) => new Set(d).add(key))
  }

  const save = () => {
    setDirty(new Set())
    onToast({ tone: 'success', title: '设置已保存', description: `${SCOPES.find((s) => s.id === scope)?.label} · ${dirty.size} 项变更` })
  }
  const discard = () => {
    setValues(INITIAL)
    setDirty(new Set())
  }

  const overrideCount = useMemo(() => (projectScope ? Object.values(values).filter((s) => s.overrides[projectScope] !== undefined).length : 0), [values, projectScope])

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? SECTIONS.filter((s) => `${s.label} ${s.description} ${s.keywords}`.toLowerCase().includes(q)) : SECTIONS
  }, [query])

  const rowProps = (key: string) => ({ inheritable: isProject, overridden: isOverridden(key), onReset: () => reset(key) })

  // ---- 合并预览：全局规则 + 项目规则 + 行为开关 ----
  const effectiveRules = useMemo(() => {
    const g = (values['rules.global'].global as string).trim()
    const p = projectScope ? ((values['rules.project'].overrides[projectScope] as string) ?? '').trim() : ''
    const flags = [
      `- 执行命令前确认：${get<boolean>('rules.confirmCommands') ? '是' : '否'}`,
      `- 允许联网：${get<boolean>('rules.allowNetwork') ? '是' : '否'}`,
      `- 可写目录：${get<string>('rules.writeScope')}`,
      `- 最大工具调用轮数：${get<number>('rules.maxToolRounds')}`,
      `- 回复语言：${get<string>('rules.language')}`,
    ].join('\n')
    return [g, p, `# 行为约束（由设置生成）\n${flags}`].filter(Boolean).join('\n\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, projectScope])

  return (
    <div className="flex flex-col gap-6">
      {/* ===== 顶部：作用域 + 搜索 + 导入导出 ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="设置作用域" className="flex rounded-lg bg-card p-1 shadow-sm">
          {SCOPES.map((s) => {
            const Icon = s.icon
            const active = s.id === scope
            const count = s.id === 'global' ? 0 : Object.values(values).filter((v) => v.overrides[s.id as Exclude<SettingsScope, 'global'>] !== undefined).length
            return (
              <button key={s.id} role="tab" type="button" aria-selected={active} onClick={() => setScope(s.id)} className={cn('flex h-9 items-center gap-2 rounded-md px-3 text-[13px] transition-colors duration-150', FOCUS_RING, active ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <Icon className="size-4" aria-hidden="true" />
                {s.label}
                {count > 0 && <span className={cn('rounded px-1 text-[11px] tabular-nums', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{count}</span>}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">搜索设置项</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索设置" className={cn(inputCls, 'w-52 pl-9')} />
          </label>
          <Button onClick={() => onToast({ tone: 'success', title: '已导出配置', description: `settings.${scope}.json` })}>
            <Download className="size-4" aria-hidden="true" />
            导出
          </Button>
          <Button onClick={() => onToast({ tone: 'info', title: '导入配置', description: '接入后端后支持从文件导入。' })}>
            <Upload className="size-4" aria-hidden="true" />
            导入
          </Button>
        </div>
      </div>

      {isProject && (
        <p className="-mt-2 text-[11px] text-muted-foreground">
          正在编辑「{SCOPES.find((s) => s.id === scope)?.label}」的项目设置：未覆盖的项继承全局，当前有 <span className="font-medium text-foreground">{overrideCount}</span> 项覆盖。
        </p>
      )}

      {/* ===== 未保存提示 ===== */}
      {dirty.size > 0 && (
        <div className={cn('flex items-center justify-between gap-4 rounded-lg px-4 py-3 text-[13px]', TONE_BADGE.warning)} role="status">
          <span className="flex items-center gap-2">
            <TriangleAlert className="size-4" aria-hidden="true" />
            有 {dirty.size} 项未保存的更改
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={discard}>
              放弃
            </Button>
            <Button variant="primary" onClick={save}>
              保存
            </Button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* ===== 左：分区导航 ===== */}
        <nav aria-label="设置分区" className="lg:sticky lg:top-0">
          <ul className="flex flex-col gap-0.5 rounded-lg bg-card p-2 shadow-sm">
            {visibleSections.map((s) => {
              const Icon = s.icon
              const active = s.id === section
              return (
                <li key={s.id}>
                  <button type="button" aria-current={active ? 'page' : undefined} onClick={() => setSection(s.id)} className={cn('flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors duration-150', FOCUS_RING, active ? 'bg-accent font-medium text-accent-foreground' : 'text-foreground hover:bg-muted')}>
                    <Icon className={cn('size-4 shrink-0', !active && 'text-muted-foreground')} aria-hidden="true" />
                    <span className="truncate">{s.label}</span>
                  </button>
                </li>
              )
            })}
            {visibleSections.length === 0 && <li className="px-2 py-3 text-[12px] text-muted-foreground">没有匹配的设置</li>}
          </ul>
        </nav>

        {/* ===== 右：分区内容 ===== */}
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h2 className="text-base font-medium text-foreground">{SECTIONS.find((s) => s.id === section)?.label}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{SECTIONS.find((s) => s.id === section)?.description}</p>
          </div>

          {/* ---------- 模型与连接 ---------- */}
          {section === 'models' && (
            <>
              <Card title="模型提供方" description="本地模型通过 Ollama 接入；API Key 只在保存时上传，界面只显示前后缀。">
                {PROVIDERS.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[p.status === 'online' ? 'success' : p.status === 'degraded' ? 'warning' : 'muted'])} />
                      <div>
                        <p className="text-[13px] font-medium text-foreground">{p.label}</p>
                        <p className="text-[11px] text-muted-foreground">{p.kind === 'local' ? get<string>('models.ollama.endpoint') : p.status === 'online' ? '已连接' : p.status === 'degraded' ? '延迟较高' : '未配置'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.kind === 'local' ? (
                        <input aria-label="Ollama 地址" value={get<string>('models.ollama.endpoint')} onChange={(e) => set('models.ollama.endpoint', e.target.value)} className={cn(inputCls, 'w-56 font-mono text-[12px]')} />
                      ) : (
                        <div className="relative">
                          <input aria-label={`${p.label} API Key`} type={showKeys[p.id] ? 'text' : 'password'} defaultValue={p.key ?? ''} placeholder="sk-…" className={cn(inputCls, 'w-56 pr-9 font-mono text-[12px]')} onChange={() => setDirty((d) => new Set(d).add(`key.${p.id}`))} />
                          <button type="button" aria-label={showKeys[p.id] ? '隐藏' : '显示'} onClick={() => setShowKeys((s) => ({ ...s, [p.id]: !s[p.id] }))} className={cn('absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground', FOCUS_RING)}>
                            {showKeys[p.id] ? <EyeOff className="size-3.5" aria-hidden="true" /> : <Eye className="size-3.5" aria-hidden="true" />}
                          </button>
                        </div>
                      )}
                      <Button onClick={() => onToast({ tone: 'info', title: '正在测试连接', description: p.label })}>
                        <RefreshCw className="size-3.5" aria-hidden="true" />
                        测试
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>

              <Card title="默认模型与成本" description="成本按 API 用量估算；本地模型不计费。">
                <Row title="默认模型" description="未命中路由表时使用。" {...rowProps('models.default')}>
                  <select aria-label="默认模型" value={get<string>('models.default')} onChange={(e) => set('models.default', e.target.value)} className={cn(inputCls, 'w-64')}>
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row title="每日上限（¥）" {...rowProps('models.budget.daily')}>
                  <input type="number" aria-label="每日上限" value={get<number>('models.budget.daily')} onChange={(e) => set('models.budget.daily', Number(e.target.value))} className={cn(inputCls, 'w-28 tabular-nums')} />
                </Row>
                <Row title="每月上限（¥）" {...rowProps('models.budget.monthly')}>
                  <input type="number" aria-label="每月上限" value={get<number>('models.budget.monthly')} onChange={(e) => set('models.budget.monthly', Number(e.target.value))} className={cn(inputCls, 'w-28 tabular-nums')} />
                </Row>
                <Row title="接近预算提醒（%）" description="月度花费达到该比例时在今日焦点与工作室页高亮提醒。" {...rowProps('models.budget.warnAt')}>
                  <input type="number" min={50} max={100} aria-label="接近预算提醒百分比" value={get<number>('models.budget.warnAt')} onChange={(e) => set('models.budget.warnAt', Number(e.target.value))} className={cn(inputCls, 'w-28 tabular-nums')} />
                </Row>
                <Row title="超限行为" {...rowProps('models.budget.onExceed')}>
                  <Segmented label="超限行为" value={get<string>('models.budget.onExceed')} onChange={(v) => set('models.budget.onExceed', v)} options={[{ id: 'fallback', label: '降级到本地' }, { id: 'pause', label: '暂停任务' }, { id: 'notify', label: '仅提醒' }]} />
                </Row>
              </Card>

              {scope === 'global' && (
                <Card title="各工具月度预算一览" description="每个创作工具的月度上限；切换到对应项目作用域可单独修改，未覆盖的沿用全局值。">
                  <ul className="grid gap-3 py-2 md:grid-cols-3">
                    {(['video', 'game', 'app'] as const).map((id) => {
                      const budget = values['models.budget.monthly']
                      const amount = (budget.overrides[id] ?? budget.global) as number
                      const overridden = budget.overrides[id] !== undefined
                      const meta = SCOPES.find((entry) => entry.id === id)!
                      const Icon = meta.icon
                      return (
                        <li key={id} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="flex-1 text-[13px] text-foreground">{meta.label}</span>
                          <span className="text-[13px] tabular-nums text-foreground">¥{amount}</span>
                          <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', overridden ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground')}>{overridden ? '已覆盖' : '继承'}</span>
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              )}

              <Card title="任务路由表" description="任务类型 → 首选模型 → 降级链；拖动手柄可调整优先级（接入后端后生效）。" action={isProject && <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', isOverridden('models.routing') ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground')}>{isOverridden('models.routing') ? '已覆盖' : '继承全局'}</span>}>
                <div className="py-2">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-muted-foreground">
                        <th className="w-6 py-2" />
                        <th className="py-2">任务类型</th>
                        <th className="py-2">首选模型</th>
                        <th className="py-2">降级链</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {get<{ task: string; primary: string; fallback: string[] }[]>('models.routing').map((r, i) => (
                        <tr key={r.task}>
                          <td className="py-2 text-muted-foreground">
                            <GripVertical className="size-4 cursor-grab" aria-label="拖动排序" />
                          </td>
                          <td className="py-2 font-medium text-foreground">{r.task}</td>
                          <td className="py-2">
                            <select
                              aria-label={`${r.task} 首选模型`}
                              value={r.primary}
                              onChange={(e) => {
                                const next = get<{ task: string; primary: string; fallback: string[] }[]>('models.routing').map((x, j) => (j === i ? { ...x, primary: e.target.value } : x))
                                set('models.routing', next)
                              }}
                              className={cn(inputCls, 'h-8 w-52 text-[12px]')}
                            >
                              {MODEL_OPTIONS.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {r.fallback.map((f, j) => (
                                <span key={f} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                                  {j + 1}. {MODEL_OPTIONS.find((m) => m.id === f)?.label.split(' ·')[0] ?? f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* ---------- AI 规则 ---------- */}
          {section === 'rules' && (
            <>
              <Card
                title="规则文件"
                description="相当于 CLAUDE.md / AGENTS.md：全局规则对所有项目生效，项目规则只在对应作用域生效，最终按 全局 → 项目 → 行为约束 顺序合并。"
                action={
                  <Button onClick={() => setPreviewOpen(true)}>
                    <Eye className="size-4" aria-hidden="true" />
                    预览合并结果
                  </Button>
                }
              >
                <div className="grid gap-4 py-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      全局规则
                      {isProject && <span className="font-normal">只读 · 在「全局」作用域编辑</span>}
                    </span>
                    <textarea aria-label="全局规则" readOnly={isProject} value={values['rules.global'].global as string} onChange={(e) => set('rules.global', e.target.value)} rows={12} className={cn('resize-y rounded-lg border border-transparent bg-muted p-3 font-mono text-[12px] leading-relaxed text-foreground focus:border-primary focus:bg-card', FOCUS_RING, isProject && 'opacity-70')} />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      项目规则
                      {!isProject && <span className="font-normal">切换到项目作用域编辑</span>}
                    </span>
                    <textarea
                      aria-label="项目规则"
                      readOnly={!isProject}
                      placeholder={isProject ? '# 项目规则\n- …' : '在顶部选择一个项目作用域后编辑'}
                      value={isProject ? ((values['rules.project'].overrides[projectScope!] as string) ?? '') : ''}
                      onChange={(e) => set('rules.project', e.target.value)}
                      rows={12}
                      className={cn('resize-y rounded-lg border border-transparent bg-muted p-3 font-mono text-[12px] leading-relaxed text-foreground focus:border-primary focus:bg-card', FOCUS_RING, !isProject && 'opacity-70')}
                    />
                  </label>
                </div>
              </Card>

              <Card title="行为开关">
                <Row title="执行命令前需确认" description="关闭后 AI 可直接运行白名单内的命令。" {...rowProps('rules.confirmCommands')}>
                  <Switch label="执行命令前需确认" checked={get<boolean>('rules.confirmCommands')} onChange={(v) => set('rules.confirmCommands', v)} />
                </Row>
                <Row title="允许联网" description="关闭后只能使用本地模型与本地知识库。" {...rowProps('rules.allowNetwork')}>
                  <Switch label="允许联网" checked={get<boolean>('rules.allowNetwork')} onChange={(v) => set('rules.allowNetwork', v)} />
                </Row>
                <Row title="允许写入的目录" description="相对项目沙箱根目录；目录外的写操作会被拒绝并记录到日志。" {...rowProps('rules.writeScope')}>
                  <input aria-label="允许写入的目录" value={get<string>('rules.writeScope')} onChange={(e) => set('rules.writeScope', e.target.value)} className={cn(inputCls, 'w-64 font-mono text-[12px]')} />
                </Row>
                <Row title="最大工具调用轮数" description="单次请求内的上限，防止代理模式失控。" {...rowProps('rules.maxToolRounds')}>
                  <input type="number" min={1} max={50} aria-label="最大工具调用轮数" value={get<number>('rules.maxToolRounds')} onChange={(e) => set('rules.maxToolRounds', Number(e.target.value))} className={cn(inputCls, 'w-24 tabular-nums')} />
                </Row>
                <Row title="默认使用代理模式" {...rowProps('rules.agentDefault')}>
                  <Switch label="默认使用代理模式" checked={get<boolean>('rules.agentDefault')} onChange={(v) => set('rules.agentDefault', v)} />
                </Row>
              </Card>

              <Card title="输出偏好">
                <Row title="回复语言" {...rowProps('rules.language')}>
                  <Segmented label="回复语言" value={get<string>('rules.language')} onChange={(v) => set('rules.language', v)} options={[{ id: 'zh-CN', label: '中文' }, { id: 'en', label: 'English' }, { id: 'auto', label: '跟随输入' }]} />
                </Row>
                <Row title="回复长度" {...rowProps('rules.replyLength')}>
                  <Segmented label="回复长度" value={get<string>('rules.replyLength')} onChange={(v) => set('rules.replyLength', v)} options={[{ id: 'concise', label: '精简' }, { id: 'balanced', label: '均衡' }, { id: 'detailed', label: '详细' }]} />
                </Row>
                <Row title="引用来源" description="回答中标注引用的知识库文件与错题。" {...rowProps('rules.citeSources')}>
                  <Switch label="引用来源" checked={get<boolean>('rules.citeSources')} onChange={(v) => set('rules.citeSources', v)} />
                </Row>
              </Card>

              <Card title="记忆">
                <Row title="允许写入记忆" description="AI 可把你的偏好与项目约定写入记忆文件。" {...rowProps('rules.memory.enabled')}>
                  <Switch label="允许写入记忆" checked={get<boolean>('rules.memory.enabled')} onChange={(v) => set('rules.memory.enabled', v)} />
                </Row>
                <Row title="记忆文件" description="~/NO.1 3mode/.memory/">
                  <Button variant="danger" onClick={() => onToast({ tone: 'warning', title: '需要确认', description: '清空记忆是不可逆操作。' })}>
                    清空记忆
                  </Button>
                </Row>
              </Card>
            </>
          )}

          {/* ---------- 隔离与权限 ---------- */}
          {section === 'isolation' && (
            <>
              <Card title="沙箱" description="每个项目在独立目录内运行；所有文件读写、命令执行都限制在沙箱内。">
                <Row title="沙箱根目录" {...rowProps('isolation.root')}>
                  <input aria-label="沙箱根目录" value={get<string>('isolation.root')} onChange={(e) => set('isolation.root', e.target.value)} className={cn(inputCls, 'w-72 font-mono text-[12px]')} />
                </Row>
                <Row title="允许跨项目读取" description="开启后 AI 可读取其他项目空间的文件（仍不可写）。" {...rowProps('isolation.crossRead')}>
                  <Switch label="允许跨项目读取" checked={get<boolean>('isolation.crossRead')} onChange={(v) => set('isolation.crossRead', v)} />
                </Row>
                <Row title="每项目独立 API Key" description="关闭后所有项目共用全局 Key，成本无法按项目统计。" {...rowProps('isolation.perProjectKey')}>
                  <Switch label="每项目独立 API Key" checked={get<boolean>('isolation.perProjectKey')} onChange={(v) => set('isolation.perProjectKey', v)} />
                </Row>
                <Row title="密钥可见性" {...rowProps('isolation.keyVisibility')}>
                  <Segmented label="密钥可见性" value={get<string>('isolation.keyVisibility')} onChange={(v) => set('isolation.keyVisibility', v)} options={[{ id: 'owner', label: '仅所有者' }, { id: 'project', label: '项目成员' }, { id: 'none', label: '仅写入' }]} />
                </Row>
              </Card>

              <Card title="MCP 服务白名单" description="未勾选的 MCP 在该作用域内不可被调用。">
                <Row title="可用 MCP" {...rowProps('isolation.mcp')} align="start">
                  <div className="flex flex-wrap gap-2">
                    {MCP_ALL.map((m) => {
                      const list = get<string[]>('isolation.mcp')
                      const on = list.includes(m)
                      return (
                        <button key={m} type="button" aria-pressed={on} onClick={() => set('isolation.mcp', on ? list.filter((x) => x !== m) : [...list, m])} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 font-mono text-[12px] transition-colors duration-150', FOCUS_RING, on ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                          {on && <Check className="size-3" aria-hidden="true" />}
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </Row>
              </Card>

              <Card title="Skill 启用清单" description="与 Skill 库同步；这里控制哪些 Skill 可在该作用域内被 AI 调用。">
                <Row title="已启用 Skill" {...rowProps('isolation.skills')} align="start">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_ALL.map((s) => {
                      const list = get<string[]>('isolation.skills')
                      const on = list.includes(s.id)
                      return (
                        <button key={s.id} type="button" aria-pressed={on} onClick={() => set('isolation.skills', on ? list.filter((x) => x !== s.id) : [...list, s.id])} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors duration-150', FOCUS_RING, on ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                          <Sparkles className="size-3" aria-hidden="true" />
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                </Row>
              </Card>
            </>
          )}

          {/* ---------- 知识库与采集 ---------- */}
          {section === 'knowledge' && (
            <>
              <Card title="归属与采集" description="这里是总控；知识库「接入采集」页中的开关与此同步。">
                <Row title="默认归属空间" description="AI 对话与采集内容未命中项目时的落点。" {...rowProps('kb.defaultSpace')}>
                  <select aria-label="默认归属空间" value={get<string>('kb.defaultSpace')} onChange={(e) => set('kb.defaultSpace', e.target.value)} className={cn(inputCls, 'w-48')}>
                    <option value="chat">AI 对话</option>
                    <option value="collect">收集箱</option>
                    <option value="app">应用开发</option>
                    <option value="video">AI 视频</option>
                    <option value="game">游戏开发</option>
                  </select>
                </Row>
                <Row title="自动 AI 总结" {...rowProps('kb.autoSummary')}>
                  <Switch label="自动 AI 总结" checked={get<boolean>('kb.autoSummary')} onChange={(v) => set('kb.autoSummary', v)} />
                </Row>
                <Row title="自动提取错题" description="检测到堆栈 / HTTP 错误 / 断言失败时生成错题草稿。" {...rowProps('kb.autoError')}>
                  <Switch label="自动提取错题" checked={get<boolean>('kb.autoError')} onChange={(v) => set('kb.autoError', v)} />
                </Row>
                <Row title="入库前脱敏" description="API Key / Token / 邮箱 / 手机号在服务端替换为占位符。" {...rowProps('kb.redact')}>
                  <Switch label="入库前脱敏" checked={get<boolean>('kb.redact')} onChange={(v) => set('kb.redact', v)} />
                </Row>
                <Row title="保留天数" description="超过后自动归档；重点文件不受影响。" {...rowProps('kb.retentionDays')}>
                  <input type="number" aria-label="保留天数" value={get<number>('kb.retentionDays')} onChange={(e) => set('kb.retentionDays', Number(e.target.value))} className={cn(inputCls, 'w-28 tabular-nums')} />
                </Row>
              </Card>
              <Card title="采集 API Key" description="供 Codex / Cursor / Trae 等工具推送对话使用；只在生成时显示一次明文。">
                <Row title="kb_live_8f3a••••••••" description="上次使用：2 小时前 · 60 次/分钟">
                  <Button onClick={() => onToast({ tone: 'warning', title: '需要确认', description: '重新生成后旧 Key 立即失效。' })}>
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    重新生成
                  </Button>
                </Row>
              </Card>
            </>
          )}

          {/* ---------- 通知策略 ---------- */}
          {section === 'notify' && (
            <>
              <Card title="级别 → 渠道" description="Bug 级别始终至少走 Toast，不能关闭。" action={isProject && <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', isOverridden('notify.matrix') ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground')}>{isOverridden('notify.matrix') ? '已覆盖' : '继承全局'}</span>}>
                <div className="py-2">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-muted-foreground">
                        <th className="py-2">级别</th>
                        {['toast', 'banner', 'system', 'webhook'].map((c) => (
                          <th key={c} className="py-2 text-center">
                            {c === 'toast' ? 'Toast' : c === 'banner' ? '公告条' : c === 'system' ? '系统通知' : 'Webhook'}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {(['bug', 'warn', 'notice', 'info'] as const).map((lvl) => {
                        const matrix = get<Record<string, string[]>>('notify.matrix')
                        const tone: Tone = lvl === 'bug' ? 'danger' : lvl === 'warn' ? 'warning' : lvl === 'notice' ? 'primary' : 'muted'
                        return (
                          <tr key={lvl}>
                            <td className="py-2.5">
                              <span className="flex items-center gap-2 font-medium text-foreground">
                                <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[tone])} />
                                {lvl === 'bug' ? 'Bug' : lvl === 'warn' ? '警告' : lvl === 'notice' ? '提示' : '信息'}
                              </span>
                            </td>
                            {['toast', 'banner', 'system', 'webhook'].map((c) => {
                              const on = matrix[lvl].includes(c)
                              const locked = lvl === 'bug' && c === 'toast'
                              return (
                                <td key={c} className="py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    aria-label={`${lvl} 通过 ${c}`}
                                    checked={on}
                                    disabled={locked}
                                    onChange={() => set('notify.matrix', { ...matrix, [lvl]: on ? matrix[lvl].filter((x) => x !== c) : [...matrix[lvl], c] })}
                                    className="size-4 accent-primary"
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card title="安静时段与聚合">
                <Row title="安静时段" description="期间只有 Bug 级别会打断；其他通知聚合后在结束时推送。" {...rowProps('notify.quiet')}>
                  {(() => {
                    const q = get<{ enabled: boolean; from: string; to: string }>('notify.quiet')
                    return (
                      <>
                        <Switch label="启用安静时段" checked={q.enabled} onChange={(v) => set('notify.quiet', { ...q, enabled: v })} />
                        <input type="time" aria-label="开始" value={q.from} onChange={(e) => set('notify.quiet', { ...q, from: e.target.value })} className={cn(inputCls, 'w-28')} />
                        <span className="text-[13px] text-muted-foreground">至</span>
                        <input type="time" aria-label="结束" value={q.to} onChange={(e) => set('notify.quiet', { ...q, to: e.target.value })} className={cn(inputCls, 'w-28')} />
                      </>
                    )
                  })()}
                </Row>
                <Row title="聚合频率" description="同类通知在此窗口内合并为一条。" {...rowProps('notify.digest')}>
                  <Segmented label="聚合频率" value={get<string>('notify.digest')} onChange={(v) => set('notify.digest', v)} options={[{ id: 'off', label: '不聚合' }, { id: '5m', label: '5 分钟' }, { id: '15m', label: '15 分钟' }, { id: '1h', label: '1 小时' }]} />
                </Row>
              </Card>
            </>
          )}

          {/* ---------- 日志 ---------- */}
          {section === 'logs' && (
            <Card title="日志" description="工作台是所有项目的日志聚合端；这里决定收什么、留多久。">
              <Row title="保留天数" {...rowProps('logs.retentionDays')}>
                <input type="number" aria-label="日志保留天数" value={get<number>('logs.retentionDays')} onChange={(e) => set('logs.retentionDays', Number(e.target.value))} className={cn(inputCls, 'w-28 tabular-nums')} />
              </Row>
              <Row title="最低记录级别" description="低于该级别的日志不会写入。" {...rowProps('logs.minLevel')}>
                <Segmented label="最低记录级别" value={get<string>('logs.minLevel')} onChange={(v) => set('logs.minLevel', v)} options={[{ id: 'debug', label: 'Debug' }, { id: 'info', label: 'Info' }, { id: 'notice', label: '提示' }, { id: 'warn', label: '警告' }]} />
              </Row>
              <Row title="订阅的项目" description="只在全局作用域配置。" align="start">
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'app', label: '应用开发' }, { id: 'video', label: 'AI 视频' }, { id: 'game', label: '游戏开发' }, { id: 'system', label: '系统' }].map((p) => {
                    const list = values['logs.subscribe'].global as string[]
                    const on = list.includes(p.id)
                    return (
                      <button key={p.id} type="button" aria-pressed={on} onClick={() => { setValues((prev) => ({ ...prev, 'logs.subscribe': { ...prev['logs.subscribe'], global: on ? list.filter((x) => x !== p.id) : [...list, p.id] } })); setDirty((d) => new Set(d).add('logs.subscribe')) }} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors duration-150', FOCUS_RING, on ? 'bg-primary/8 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}>
                        {on && <Check className="size-3" aria-hidden="true" />}
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </Row>
              <Row title="导出目录" {...rowProps('logs.exportDir')}>
                <input aria-label="导出目录" value={get<string>('logs.exportDir')} onChange={(e) => set('logs.exportDir', e.target.value)} className={cn(inputCls, 'w-72 font-mono text-[12px]')} />
              </Row>
            </Card>
          )}

          {/* ---------- 外观与快捷键 ---------- */}
          {section === 'appearance' && (
            <>
              <Card title="外观" description="外观设置只有全局作用域。">
                <Row title="主题">
                  <Segmented label="主题" value={values['ui.theme'].global as string} onChange={(v) => { setValues((p) => ({ ...p, 'ui.theme': { ...p['ui.theme'], global: v } })); setDirty((d) => new Set(d).add('ui.theme')) }} options={[{ id: 'light', label: '浅色' }, { id: 'dark', label: '深色' }, { id: 'system', label: '跟随系统' }]} />
                </Row>
                <Row title="密度">
                  <Segmented label="密度" value={values['ui.density'].global as string} onChange={(v) => { setValues((p) => ({ ...p, 'ui.density': { ...p['ui.density'], global: v } })); setDirty((d) => new Set(d).add('ui.density')) }} options={[{ id: 'compact', label: '紧凑' }, { id: 'comfortable', label: '舒适' }]} />
                </Row>
                <Row title="正文字号">
                  <input type="range" min={12} max={15} aria-label="正文字号" value={values['ui.fontSize'].global as number} onChange={(e) => { setValues((p) => ({ ...p, 'ui.fontSize': { ...p['ui.fontSize'], global: Number(e.target.value) } })); setDirty((d) => new Set(d).add('ui.fontSize')) }} className="w-40 accent-primary" />
                  <span className="w-10 text-right text-[13px] tabular-nums text-foreground">{values['ui.fontSize'].global as number}px</span>
                </Row>
              </Card>
              <Card title="快捷键" description="点击组合键可重新录制（接入后端后生效）。">
                {(values['ui.shortcuts'].global as { action: string; keys: string }[]).map((s) => (
                  <Row key={s.action} title={s.action}>
                    <button type="button" onClick={() => onToast({ tone: 'info', title: '录制快捷键', description: `按下新的组合键以替换 ${s.keys}` })} className={cn('flex h-8 items-center gap-1 rounded-md bg-muted px-2.5 font-mono text-[12px] text-foreground hover:bg-accent', FOCUS_RING)}>
                      <Keyboard className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {s.keys}
                    </button>
                  </Row>
                ))}
              </Card>
            </>
          )}

          {/* ---------- 诊断 ---------- */}
          {section === 'diagnostics' && (
            <>
              <Card
                title="服务连通性"
                action={
                  <Button onClick={() => onToast({ tone: 'info', title: '正在重新检测', description: '约需 5 秒。' })}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    重新检测
                  </Button>
                }
              >
                {[
                  { name: 'Ollama 本地模型', status: 'online', detail: '2 个模型 · 180 ms' },
                  { name: 'DeepSeek API', status: 'online', detail: '640 ms' },
                  { name: 'Anthropic API', status: 'online', detail: '920 ms' },
                  { name: 'OpenAI API', status: 'degraded', detail: '1.8 s · 连续 3 次超时' },
                  { name: 'MCP · render-cluster', status: 'offline', detail: '维护窗口 · 预计 10:30 恢复' },
                  { name: '知识库存储', status: 'online', detail: '1.2 GB / 20 GB' },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between gap-4 py-3">
                    <span className="flex items-center gap-3">
                      {s.status === 'offline' ? <WifiOff className="size-4 text-muted-foreground" aria-hidden="true" /> : <Wifi className="size-4 text-muted-foreground" aria-hidden="true" />}
                      <span className="text-[13px] font-medium text-foreground">{s.name}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {s.detail}
                      <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[s.status === 'online' ? 'success' : s.status === 'degraded' ? 'warning' : 'danger'])} />
                    </span>
                  </div>
                ))}
              </Card>
              <Card title="最近 24 小时">
                <div className="grid gap-4 py-4 sm:grid-cols-3">
                  {[
                    { label: 'Bug', value: 3, tone: 'danger' as Tone },
                    { label: '警告', value: 17, tone: 'warning' as Tone },
                    { label: '模型调用失败', value: 6, tone: 'muted' as Tone },
                  ].map((k) => (
                    <div key={k.label} className="rounded-lg bg-muted/60 p-4">
                      <p className="text-[11px] text-muted-foreground">{k.label}</p>
                      <p className={cn('mt-1 text-2xl font-semibold tabular-nums', k.tone === 'danger' ? 'text-destructive' : k.tone === 'warning' ? 'text-warning' : 'text-foreground')}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="维护">
                <Row title="生成诊断包" description="包含配置（已脱敏）、最近日志、服务状态，用于排障。">
                  <Button onClick={() => onToast({ tone: 'success', title: '诊断包已生成', description: 'diagnostics-20260904.zip' })}>
                    <Download className="size-4" aria-hidden="true" />
                    生成
                  </Button>
                </Row>
                <Row title="重置到默认" description={isProject ? '清除该项目的所有覆盖，恢复继承全局。' : '恢复所有全局设置到默认值；项目覆盖不受影响。'}>
                  <Button variant="danger" onClick={() => setResetOpen(true)}>
                    <RotateCcw className="size-4" aria-hidden="true" />
                    重置
                  </Button>
                </Row>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* ===== 合并预览 ===== */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} icon={Bot} tone="primary" title="最终生效的规则" description={`作用域：${SCOPES.find((s) => s.id === scope)?.label} · 全局规则 → 项目规则 → 行为约束`} width="lg">
        <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-foreground">{effectiveRules}</pre>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(effectiveRules)
              onToast({ tone: 'success', title: '已复制' })
            }}
          >
            复制
          </Button>
          <Button variant="primary" onClick={() => setPreviewOpen(false)}>
            关闭
          </Button>
        </div>
      </Dialog>

      {/* ===== 重置确认 ===== */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} icon={TriangleAlert} tone="danger" title={isProject ? '清除项目覆盖？' : '重置全局设置？'} description={isProject ? `「${SCOPES.find((s) => s.id === scope)?.label}」的 ${overrideCount} 项覆盖将被清除，恢复为继承全局。` : '所有全局设置将恢复默认值，此操作不可撤销。'} role="alertdialog">
        <div className="flex justify-end gap-2">
          <Button onClick={() => setResetOpen(false)}>取消</Button>
          <Button
            variant="primary"
            className="bg-destructive hover:bg-destructive/90"
            onClick={() => {
              if (projectScope) {
                setValues((prev) => Object.fromEntries(Object.entries(prev).map(([k, s]) => { const o = { ...s.overrides }; delete o[projectScope]; return [k, { ...s, overrides: o }] })))
              } else {
                setValues(INITIAL)
              }
              setDirty(new Set())
              setResetOpen(false)
              onToast({ tone: 'success', title: '已重置' })
            }}
          >
            确认重置
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
