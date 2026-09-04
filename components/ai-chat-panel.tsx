'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AtSign,
  Bot,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  History,
  ListTodo,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Slash,
  Sparkles,
  Square,
  Terminal,
  TriangleAlert,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, FOCUS_RING, IconButton, TONE_BADGE, type IconType, type Toast } from '@/components/ui-primitives'
import type { SpaceId } from '@/components/knowledge-shared'
import { fetchChatModels, fetchChatSessions } from '@/lib/api-client'

// =============================================================================
// 类型（契约见开发日志 v0.8）
// =============================================================================

export type ModelKind = 'local' | 'api'

export interface ChatModel {
  id: string
  label: string
  provider: string
  kind: ModelKind
  available: boolean
  latencyMs?: number
  tier?: 'free' | 'low' | 'mid' | 'high' // 价格档
}

export type ContextKind = 'job' | 'file' | 'error' | 'skill' | 'log' | 'project'

export interface ChatContext {
  kind: ContextKind
  id: string
  label: string
}

export interface ToolCall {
  name: string
  input: string
  output?: string
  status: 'running' | 'done' | 'failed'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  sources?: ChatContext[]
  status: 'streaming' | 'done' | 'failed'
  createdAt: string
}

export interface ChatSession {
  id: string
  spaceId: SpaceId | 'global'
  title: string
  model: string
  mode: 'chat' | 'agent'
  contexts: ChatContext[]
  messages: ChatMessage[]
  pinned?: boolean
  updatedAt: string
}

// =============================================================================
// 模拟数据
// =============================================================================

const MODELS: ChatModel[] = [
  { id: 'ollama/qwen2.5-coder:14b', label: 'Qwen2.5 Coder 14B', provider: 'Ollama', kind: 'local', available: true, latencyMs: 180, tier: 'free' },
  { id: 'ollama/deepseek-r1:8b', label: 'DeepSeek R1 8B', provider: 'Ollama', kind: 'local', available: false, tier: 'free' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', provider: 'DeepSeek', kind: 'api', available: true, latencyMs: 640, tier: 'low' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5', provider: 'Anthropic', kind: 'api', available: true, latencyMs: 920, tier: 'high' },
  { id: 'openai/gpt-5', label: 'GPT-5', provider: 'OpenAI', kind: 'api', available: true, latencyMs: 1100, tier: 'high' },
]

const CONTEXT_META: Record<ContextKind, { label: string; icon: IconType }> = {
  job: { label: '任务', icon: ListTodo },
  file: { label: '文件', icon: FileText },
  error: { label: '错题', icon: Bug },
  skill: { label: 'Skill', icon: Sparkles },
  log: { label: '日志', icon: Terminal },
  project: { label: '项目', icon: Bot },
}

/** 可添加的上下文候选（接入后端后由当前视图 / 搜索接口提供） */
const CONTEXT_CANDIDATES: ChatContext[] = [
  { kind: 'job', id: 'job-1042', label: '生成第 3 集分镜 · 运行中' },
  { kind: 'job', id: 'job-1039', label: 'LedgerService 单测 · 失败' },
  { kind: 'file', id: 'k-12', label: '鸿蒙 ArkTS 编码规范 v3' },
  { kind: 'file', id: 'k-2', label: 'LedgerService 接口定义 v2' },
  { kind: 'error', id: 'e-5', label: '@Link 跨层传递导致渲染循环' },
  { kind: 'error', id: 'e-2', label: '华为账号登录 redirect_uri_mismatch' },
  { kind: 'skill', id: 's-3', label: 'ArkTS 代码审查' },
  { kind: 'log', id: 'trace-7f21', label: 'trace 7f21 · 任务 1039 失败链路' },
]

const SLASH_COMMANDS = [
  { cmd: '/summarize', desc: '总结当前上下文并存入知识库' },
  { cmd: '/explain-error', desc: '解释选中的错题或日志' },
  { cmd: '/new-skill', desc: '从本次对话提炼一个 Skill' },
  { cmd: '/log', desc: '把这段对话写入项目日志' },
  { cmd: '/plan', desc: '拆解为任务并加入队列（代理模式）' },
]

const now = () => new Date().toISOString()

const SEED_SESSIONS: ChatSession[] = [
  {
    id: 'cs-1',
    spaceId: 'game',
    title: 'LevelEditor 渲染循环排查',
    model: 'anthropic/claude-sonnet-4.5',
    mode: 'chat',
    contexts: [
      { kind: 'error', id: 'e-5', label: '@Link 跨层传递导致渲染循环' },
      { kind: 'file', id: 'k-12', label: '鸿蒙 ArkTS 编码规范 v3' },
    ],
    messages: [
      { id: 'm-1', role: 'user', content: '这个渲染循环是怎么触发的？', status: 'done', createdAt: now() },
      {
        id: 'm-2',
        role: 'assistant',
        status: 'done',
        createdAt: now(),
        toolCalls: [
          { name: '读取文件', input: 'entry/src/main/ets/pages/LevelEditor.ets', output: '共 412 行，定位到第 88–104 行 @Link 声明。', status: 'done' },
          { name: '检索知识库', input: 'space=game q="@Link 跨层"', output: '命中《ArkTS 编码规范 v3》第 6.3 节。', status: 'done' },
        ],
        sources: [{ kind: 'file', id: 'k-12', label: 'ArkTS 编码规范 v3 · 6.3' }],
        content:
          '根因是 `LevelEditor` 把 `@Link towers` 直接透传给了三层以下的 `TowerSlot`，而 `TowerSlot` 在 `aboutToAppear` 里又回写了同一个数组，形成 父 → 子 → 父 的同步更新环。\n\n规范 6.3 明确要求跨层共享状态用 `@Provide / @Consume`：\n\n```ts\n// LevelEditor.ets\n@Provide(\'towers\') towers: Tower[] = []\n\n// TowerSlot.ets\n@Consume(\'towers\') towers: Tower[]\n```\n\n改完后 `TowerSlot` 的回写只会触发一次订阅者更新，不再回流到父组件。',
      },
    ],
    updatedAt: now(),
  },
  { id: 'cs-2', spaceId: 'app', title: '整数分迁移脚本', model: 'deepseek/deepseek-chat', mode: 'agent', contexts: [], messages: [], pinned: true, updatedAt: now() },
  { id: 'cs-3', spaceId: 'global', title: '对比三种向量库部署', model: 'ollama/qwen2.5-coder:14b', mode: 'chat', contexts: [], messages: [], updatedAt: now() },
]

// =============================================================================
// 小组件
// =============================================================================

function ModelDot({ m }: { m: ChatModel }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', !m.available ? 'bg-destructive' : (m.latencyMs ?? 0) < 400 ? 'bg-success' : 'bg-warning')} />
}

function ModelPicker({ value, onChange, models }: { value: string; onChange: (id: string) => void; models: ChatModel[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = models.find((m) => m.id === value) ?? models[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('flex h-8 max-w-[220px] items-center gap-2 rounded-md bg-muted px-2.5 text-[13px] text-foreground hover:bg-accent', FOCUS_RING)}
      >
        <ModelDot m={current} />
        <span className="truncate">{current.label}</span>
        <span className={cn('rounded px-1 text-[11px] font-medium', current.kind === 'local' ? 'bg-success/10 text-success' : 'bg-primary/8 text-primary')}>{current.kind === 'local' ? '本地' : 'API'}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <ul role="listbox" aria-label="选择模型" className="absolute top-full left-0 z-40 mt-1 w-72 overflow-hidden rounded-lg border border-foreground/[0.04] bg-card p-1 shadow-lg">
          {(['local', 'api'] as ModelKind[]).map((kind) => (
            <li key={kind}>
              <p className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{kind === 'local' ? '本地模型' : 'API 模型'}</p>
              <ul>
                {models
                  .filter((m) => m.kind === kind)
                  .map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={m.id === value}
                        disabled={!m.available}
                        onClick={() => {
                          onChange(m.id)
                          setOpen(false)
                        }}
                        className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-50', FOCUS_RING, m.id === value ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')}
                      >
                        <ModelDot m={m} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{m.label}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {m.provider}
                            {m.available ? (m.latencyMs ? ` · ${m.latencyMs} ms` : '') : ' · 离线'}
                            {m.tier && m.tier !== 'free' && ` · ${m.tier === 'low' ? '¥' : m.tier === 'mid' ? '¥¥' : '¥¥¥'}`}
                          </span>
                        </span>
                        {m.id === value && <Check className="size-3.5 text-primary" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ContextChip({ ctx, onRemove }: { ctx: ChatContext; onRemove?: () => void }) {
  const meta = CONTEXT_META[ctx.kind]
  const Icon = meta.icon
  return (
    <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md bg-primary/8 pr-1 pl-2 text-[11px] text-primary">
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="text-primary/70">@{meta.label}</span>
      <span className="truncate font-medium">{ctx.label}</span>
      {onRemove && (
        <button type="button" aria-label={`移除上下文 ${ctx.label}`} onClick={onRemove} className={cn('flex size-5 items-center justify-center rounded hover:bg-primary/10', FOCUS_RING)}>
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  )
}

/** 将 AI 输出中的 ```lang ... ``` 代码块渲染为带复制按钮的块 */
function MessageBody({ content, onCopy }: { content: string; onCopy: (text: string) => void }) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-foreground">
      {parts.map((p, i) => {
        if (p.startsWith('```')) {
          const m = p.match(/^```(\w+)?\n([\s\S]*?)```$/)
          const lang = m?.[1] ?? ''
          const code = m?.[2] ?? p.replace(/```/g, '')
          return (
            <div key={i} className="overflow-hidden rounded-lg bg-foreground text-card">
              <div className="flex h-8 items-center justify-between px-3 text-[11px] text-card/60">
                <span className="font-mono">{lang || 'text'}</span>
                <button type="button" onClick={() => onCopy(code)} className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-card/10 hover:text-card', FOCUS_RING)}>
                  <Copy className="size-3" aria-hidden="true" />
                  复制
                </button>
              </div>
              <pre className="overflow-x-auto px-3 pb-3 font-mono text-[12px] leading-relaxed whitespace-pre">{code}</pre>
            </div>
          )
        }
        // 行内代码
        const inline = p.split(/(`[^`]+`)/g).map((s, j) => (s.startsWith('`') ? <code key={j} className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{s.slice(1, -1)}</code> : <span key={j}>{s}</span>))
        return p.trim() ? (
          <p key={i} className="whitespace-pre-wrap text-pretty">
            {inline}
          </p>
        ) : null
      })}
    </div>
  )
}

function ToolCallCard({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-lg bg-muted/60">
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className={cn('flex h-9 w-full items-center gap-2 px-3 text-left text-[12px]', FOCUS_RING)}>
        <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform duration-150', open && 'rotate-90')} aria-hidden="true" />
        <Wrench className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="font-medium text-foreground">{call.name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{call.input}</span>
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', call.status === 'done' ? 'bg-success' : call.status === 'failed' ? 'bg-destructive' : 'animate-pulse bg-warning')} />
      </button>
      {open && (
        <dl className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-border/60 px-3 py-2 text-[11px]">
          <dt className="text-muted-foreground">输入</dt>
          <dd className="font-mono break-all text-foreground">{call.input}</dd>
          <dt className="text-muted-foreground">输出</dt>
          <dd className="text-foreground">{call.output ?? '…'}</dd>
        </dl>
      )}
    </div>
  )
}

// =============================================================================
// 面板主体
// =============================================================================

interface AiChatPanelProps {
  onClose: () => void
  onToast: (t: Omit<Toast, 'id'>) => void
  /** 当前视图自动带入的上下文（由 workbench 提供） */
  autoContexts?: ChatContext[]
  /** 当前视图 id，用于生成建议卡 */
  viewHint?: string
}

export default function AiChatPanel({ onClose, onToast, autoContexts = [], viewHint }: AiChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(SEED_SESSIONS)
  useEffect(() => { void Promise.all([fetchChatModels(), fetchChatSessions()]).then(([models, remoteSessions]) => { if (models.length) setSessions(remoteSessions as ChatSession[]) }).catch(() => undefined) }, [])
  const [activeId, setActiveId] = useState<string>('cs-1')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [input, setInput] = useState('')
  const [ctxPickerOpen, setCtxPickerOpen] = useState(false)
  const [slashOpen, setSlashOpen] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [dismissedOffline, setDismissedOffline] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const streamTimer = useRef<number | null>(null)

  const session = sessions.find((s) => s.id === activeId) ?? sessions[0]
  const model = MODELS.find((m) => m.id === session.model) ?? MODELS[0]
  const modelOffline = !model.available

  const patchSession = (id: string, patch: Partial<ChatSession> | ((s: ChatSession) => ChatSession)) =>
    setSessions((prev) => prev.map((s) => (s.id === id ? (typeof patch === 'function' ? patch(s) : { ...s, ...patch, updatedAt: now() }) : s)))

  // 首次进入 / 切换视图时自动合并上下文
  useEffect(() => {
    if (autoContexts.length === 0) return
    patchSession(session.id, (s) => {
      const existing = new Set(s.contexts.map((c) => `${c.kind}:${c.id}`))
      const merged = [...s.contexts, ...autoContexts.filter((c) => !existing.has(`${c.kind}:${c.id}`))]
      return merged.length === s.contexts.length ? s : { ...s, contexts: merged }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoContexts.map((c) => c.id).join(',')])

  // 输入框自动增高
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  // 新消息滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [session.messages.length, streaming])

  useEffect(() => () => {
    if (streamTimer.current) window.clearInterval(streamTimer.current)
  }, [])

  const newSession = () => {
    const id = `cs-${Date.now()}`
    setSessions((prev) => [{ id, spaceId: 'global', title: '新会话', model: session.model, mode: session.mode, contexts: autoContexts, messages: [], updatedAt: now() }, ...prev])
    setActiveId(id)
    setHistoryOpen(false)
    textareaRef.current?.focus()
  }

  const stop = () => {
    if (streamTimer.current) window.clearInterval(streamTimer.current)
    streamTimer.current = null
    setStreaming(false)
    patchSession(session.id, (s) => ({ ...s, messages: s.messages.map((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m)) }))
  }

  /** 模拟流式回复：接入后端后替换为 POST /chat/stream (SSE) */
  const send = (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    if (modelOffline) {
      onToast({ tone: 'warning', title: '模型离线', description: `${model.label} 当前不可用，请切换到其他模型。` })
      return
    }
    setInput('')
    setSlashOpen(false)
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, role: 'user', content, status: 'done', createdAt: now() }
    const aiId = `m-${Date.now() + 1}`
    const isAgent = session.mode === 'agent'
    const full = isAgent
      ? `已将请求拆解为 3 个步骤并加入任务队列（当前排在第 2 位）：\n\n1. 读取相关文件并定位改动点\n2. 生成修改并运行单测\n3. 输出变更摘要到项目日志\n\n完成后会通知你，你也可以在「任务队列」中查看进度。`
      : `收到。基于当前 ${session.contexts.length} 个上下文，我的建议如下：\n\n先确认问题范围，再给出最小改动方案。如果需要我直接执行，切换到「代理」模式即可。\n\n\`\`\`bash\n# 示例：查看最近一次失败任务的日志\nkb logs --job job-1039 --level error\n\`\`\``
    patchSession(session.id, (s) => ({
      ...s,
      title: s.messages.length === 0 ? content.slice(0, 24) : s.title,
      messages: [
        ...s.messages,
        userMsg,
        {
          id: aiId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          createdAt: now(),
          toolCalls: isAgent ? [{ name: '创建任务', input: 'queue.enqueue(plan)', output: 'job-1043 · 排队中', status: 'done' }] : undefined,
        },
      ],
      updatedAt: now(),
    }))
    setStreaming(true)
    let i = 0
    streamTimer.current = window.setInterval(() => {
      i += 6
      const done = i >= full.length
      patchSession(session.id, (s) => ({ ...s, messages: s.messages.map((m) => (m.id === aiId ? { ...m, content: full.slice(0, i), status: done ? 'done' : 'streaming' } : m)) }))
      if (done) {
        if (streamTimer.current) window.clearInterval(streamTimer.current)
        streamTimer.current = null
        setStreaming(false)
      }
    }, 30)
  }

  const retry = (msgId: string) => {
    const idx = session.messages.findIndex((m) => m.id === msgId)
    const prevUser = [...session.messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
    patchSession(session.id, (s) => ({ ...s, messages: s.messages.filter((m) => m.id !== msgId) }))
    if (prevUser) send(prevUser.content)
  }

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
    onToast({ tone: 'success', title: '已复制' })
  }

  const addContext = (c: ChatContext) => {
    patchSession(session.id, (s) => (s.contexts.some((x) => x.kind === c.kind && x.id === c.id) ? s : { ...s, contexts: [...s.contexts, c] }))
    setCtxPickerOpen(false)
  }

  const suggestions = (() => {
    switch (viewHint) {
      case 'knowledge':
        return ['总结当前空间未整理的文件', '分析这条错题的根因并给出修复', '把最近的 Cursor 对话提炼成 Skill', '找出与「签名」相关的所有资料']
      case 'queue':
      case 'focus':
        return ['解释 job-1039 为什么失败', '哪些任务超过预计时间了？', '把失败任务的日志转成错题', '帮我安排今天的任务顺序']
      case 'logs':
        return ['解释 trace 7f21 的失败链路', '最近 24 小时最常见的报错是什么', '哪些 warn 应该升级为 bug？', '生成一份日志周报']
      case 'skills':
        return ['对比「代码审查」的两个版本', '分析这个 Skill 的结构与适用场景', '把两个分镜 Skill 融合成新版本', '为当前 Skill 生成 3 个 Golden 用例']
      default:
        return ['今天有什么需要我处理的？', '总结昨天的开发进展', '检查所有服务连接状态', '帮我写一条公告']
    }
  })()

  const spaceLabel: Record<ChatSession['spaceId'], string> = { global: '通用', app: '应用开发', video: 'AI 视频', game: '游戏开发', learning: '日常学习', collect: '收集箱', chat: 'AI 对话' }

  return (
    <aside
      aria-label="AI 对话"
      className={cn(
        'z-30 flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-foreground/[0.04] bg-card/90 shadow-lg backdrop-blur-xl',
        fullscreen ? 'absolute inset-6' : 'absolute inset-y-6 right-6 w-96 xl:static xl:my-6 xl:mr-6 xl:bg-card/75 xl:shadow-md',
      )}
    >
      {/* ===== 头部 ===== */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 pr-3 pl-4">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton label="会话历史" icon={History} active={historyOpen} onClick={() => setHistoryOpen((v) => !v)} />
          <input
            aria-label="会话标题"
            value={session.title}
            onChange={(e) => patchSession(session.id, { title: e.target.value })}
            className={cn('h-8 min-w-0 flex-1 truncate rounded-md bg-transparent px-2 text-[13px] font-medium text-foreground hover:bg-muted focus:bg-muted', FOCUS_RING)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label="新会话" icon={Plus} onClick={newSession} />
          <IconButton label={fullscreen ? '退出全屏' : '全屏'} icon={fullscreen ? Minimize2 : Maximize2} onClick={() => setFullscreen((v) => !v)} />
          <IconButton label="关闭 AI 对话" icon={X} onClick={onClose} side="left" />
        </div>
      </div>

      {/* ===== 模型 + 模式 ===== */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3">
        <ModelPicker value={session.model} models={MODELS} onChange={(id) => patchSession(session.id, { model: id })} />
        <div role="group" aria-label="模式" className="flex rounded-md bg-muted p-0.5">
          {(['chat', 'agent'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={session.mode === m}
              onClick={() => patchSession(session.id, { mode: m })}
              className={cn('h-7 rounded px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors duration-150', FOCUS_RING, session.mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {m === 'chat' ? '对话' : '代理'}
            </button>
          ))}
        </div>
      </div>

      {/* ===== 离线提示 ===== */}
      {modelOffline && !dismissedOffline && (
        <div className={cn('mx-4 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]', TONE_BADGE.warning)}>
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">本地模型 {model.label} 离线</span>
          <Button variant="ghost" onClick={() => patchSession(session.id, { model: MODELS.find((m) => m.kind === 'api' && m.available)!.id })}>
            切到 API
          </Button>
          <button type="button" aria-label="忽略" onClick={() => setDismissedOffline(true)} className={cn('rounded p-0.5', FOCUS_RING)}>
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ===== 上下文条 ===== */}
      <div className="relative flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border/60 px-4 py-2.5">
        {session.contexts.map((c) => (
          <ContextChip key={`${c.kind}:${c.id}`} ctx={c} onRemove={() => patchSession(session.id, (s) => ({ ...s, contexts: s.contexts.filter((x) => !(x.kind === c.kind && x.id === c.id)) }))} />
        ))}
        <button type="button" aria-expanded={ctxPickerOpen} onClick={() => setCtxPickerOpen((v) => !v)} className={cn('flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground', FOCUS_RING)}>
          <AtSign className="size-3" aria-hidden="true" />
          添加上下文
        </button>
        {ctxPickerOpen && (
          <ul role="listbox" aria-label="选择上下文" className="absolute top-full left-4 z-40 mt-1 max-h-64 w-80 overflow-y-auto rounded-lg border border-foreground/[0.04] bg-card p-1 shadow-lg">
            {CONTEXT_CANDIDATES.map((c) => {
              const Icon = CONTEXT_META[c.kind].icon
              const used = session.contexts.some((x) => x.kind === c.kind && x.id === c.id)
              return (
                <li key={`${c.kind}:${c.id}`}>
                  <button type="button" role="option" aria-selected={used} disabled={used} onClick={() => addContext(c)} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted disabled:opacity-40', FOCUS_RING)}>
                    <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className="text-[11px] text-muted-foreground">@{CONTEXT_META[c.kind].label}</span>
                    <span className="truncate text-foreground">{c.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ===== 消息区 / 历史抽屉 ===== */}
      <div className="relative min-h-0 flex-1">
        {historyOpen && (
          <div className="absolute inset-0 z-20 flex flex-col bg-card">
            <div className="flex h-11 items-center justify-between border-b border-border/60 px-4">
              <p className="text-[13px] font-medium text-foreground">会话历史</p>
              <Button variant="ghost" onClick={() => setHistoryOpen(false)}>
                返回
              </Button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {[...sessions]
                .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
                .map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={s.id === activeId ? 'true' : undefined}
                      onClick={() => {
                        setActiveId(s.id)
                        setHistoryOpen(false)
                      }}
                      className={cn('flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted', FOCUS_RING, s.id === activeId && 'bg-accent')}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-foreground">{s.title}</span>
                          {s.pinned && <span className="rounded bg-warning/10 px-1 text-[11px] text-warning">置顶</span>}
                          {s.mode === 'agent' && <span className="rounded bg-primary/8 px-1 text-[11px] text-primary">代理</span>}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {spaceLabel[s.spaceId]} · {s.messages.length} 条 · {MODELS.find((m) => m.id === s.model)?.label}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            <div className="border-t border-border/60 p-3">
              <Button className="w-full" onClick={() => onToast({ tone: 'success', title: '已归档到知识库', description: `${session.title} → AI 对话空间` })}>
                归档当前会话到知识库
              </Button>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="h-full overflow-y-auto px-4 py-4">
          {session.messages.length === 0 ? (
            <div className="flex h-full flex-col justify-end gap-3">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                你可以从这些开始
              </div>
              <ul className="grid grid-cols-1 gap-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => send(s)} className={cn('w-full rounded-lg bg-muted/60 px-3 py-2.5 text-left text-[13px] text-foreground transition-colors duration-150 hover:bg-accent', FOCUS_RING)}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="flex flex-col gap-5">
              {session.messages.map((m) => (
                <li key={m.id} className={cn('flex flex-col gap-2', m.role === 'user' && 'items-end')}>
                  {m.role === 'user' ? (
                    <div className="max-w-[88%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{m.content}</div>
                  ) : (
                    <div className="flex w-full flex-col gap-3">
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {m.toolCalls.map((c, i) => (
                            <ToolCallCard key={i} call={c} />
                          ))}
                        </div>
                      )}
                      {m.content && <MessageBody content={m.content} onCopy={copy} />}
                      {m.status === 'streaming' && <span aria-label="生成中" className="inline-block h-4 w-2 animate-pulse rounded-sm bg-primary/60" />}
                      {m.status === 'failed' && (
                        <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]', TONE_BADGE.danger)}>
                          <TriangleAlert className="size-3.5" aria-hidden="true" />
                          生成失败
                          <Button variant="ghost" onClick={() => retry(m.id)}>
                            重试
                          </Button>
                        </div>
                      )}
                      {m.sources && m.sources.length > 0 && m.status === 'done' && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.sources.map((s) => (
                            <ContextChip key={`${s.kind}:${s.id}`} ctx={s} />
                          ))}
                        </div>
                      )}
                      {m.status === 'done' && m.content && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <IconButton label="复制回复" icon={Copy} onClick={() => copy(m.content)} />
                          <IconButton label="重新生成" icon={RefreshCw} onClick={() => retry(m.id)} />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* ===== 输入区 ===== */}
      <div className="relative shrink-0 border-t border-border/60 p-3">
        {slashOpen && (
          <ul role="listbox" aria-label="命令" className="absolute bottom-full left-3 z-40 mb-1 w-80 rounded-lg border border-foreground/[0.04] bg-card p-1 shadow-lg">
            {SLASH_COMMANDS.filter((c) => c.cmd.startsWith(input.trim() || '/')).map((c) => (
              <li key={c.cmd}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setInput(c.cmd + ' ')
                    setSlashOpen(false)
                    textareaRef.current?.focus()
                  }}
                  className={cn('flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted', FOCUS_RING)}
                >
                  <code className="font-mono text-[12px] text-primary">{c.cmd}</code>
                  <span className="truncate text-[12px] text-muted-foreground">{c.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={cn('flex flex-col rounded-xl bg-muted transition-colors duration-150 focus-within:bg-card focus-within:ring-2 focus-within:ring-ring')}>
          <textarea
            ref={textareaRef}
            aria-label="输入消息"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setSlashOpen(e.target.value.startsWith('/') && !e.target.value.includes(' '))
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
              if (e.key === 'Escape') setSlashOpen(false)
            }}
            placeholder={session.mode === 'agent' ? '描述要完成的任务，AI 会拆解并加入队列…' : '提问，@ 添加上下文，/ 使用命令'}
            className="max-h-[200px] min-h-[40px] w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-0.5">
              <IconButton label="添加上下文" icon={AtSign} onClick={() => setCtxPickerOpen(true)} />
              <IconButton label="命令" icon={Slash} onClick={() => { setInput('/'); setSlashOpen(true); textareaRef.current?.focus() }} />
              <IconButton label="附件" icon={Paperclip} onClick={() => onToast({ tone: 'info', title: '附件', description: '接入后端后支持图片与文件。' })} />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-muted-foreground sm:inline">Enter 发送 · Shift+Enter 换行</span>
              {streaming ? (
                <Button variant="danger" onClick={stop}>
                  <Square className="size-3.5" aria-hidden="true" />
                  停止
                </Button>
              ) : (
                <Button variant="primary" onClick={() => send()} disabled={!input.trim()}>
                  <Send className="size-3.5" aria-hidden="true" />
                  发送
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export { MODELS as CHAT_MODELS }
export type { ReactNode }
