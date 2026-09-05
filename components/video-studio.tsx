'use client'

import { useMemo, useState } from 'react'
import { Clapperboard, Film, ScrollText, Sparkles, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, TONE_BADGE, TONE_BAR, type Toast } from '@/components/ui-primitives'
import {
  ConnBanner,
  StudioCard,
  StudioEmpty,
  StudioSection,
  openDeepLink,
  type StudioCardModel,
  type ToolConn,
} from '@/components/creation-shared'

// =============================================================================
// AI 视频工作室摘要：脚本 → 分镜 → 导演台（生成 / 合成）
// 数据来自 GET /studios/video/cards（SSE card.updated 增量），此处为 Mock。
// =============================================================================

interface RenderQueueItem {
  id: string
  shot: string
  episode: string
  model: string
  status: 'rendering' | 'queued' | 'failed' | 'done'
  progress?: number
  eta?: string
  error?: string
}

const RENDER_MODELS = ['kling-v2.1', 'runway-gen4', 'veo-3', 'local/wan-2.2']

const MOCK_QUEUE: RenderQueueItem[] = [
  { id: 'rq-1', shot: 'S03-C12 追逐', episode: '第 3 集', model: 'kling-v2.1', status: 'rendering', progress: 62, eta: '4 分' },
  { id: 'rq-2', shot: 'S03-C13 回眸', episode: '第 3 集', model: 'kling-v2.1', status: 'queued' },
  { id: 'rq-3', shot: 'S03-C09 雨夜', episode: '第 3 集', model: 'runway-gen4', status: 'failed', error: '内容策略拦截：画面含不明标识' },
  { id: 'rq-4', shot: 'S03-C08 巷口', episode: '第 3 集', model: 'kling-v2.1', status: 'done' },
]

const QUEUE_STATUS = {
  rendering: { label: '渲染中', tone: 'primary' as const },
  queued: { label: '排队', tone: 'muted' as const },
  failed: { label: '失败', tone: 'danger' as const },
  done: { label: '完成', tone: 'success' as const },
}

export default function VideoStudio({
  cards,
  conn,
  todayCost,
  todayTokens,
  onToast,
  onAddToPlan,
  onSaveError,
}: {
  cards: StudioCardModel[]
  conn: ToolConn
  todayCost: number
  todayTokens: number
  onToast: (t: Omit<Toast, 'id'>) => void
  onAddToPlan: (card: StudioCardModel) => void
  onSaveError: (card: StudioCardModel) => void
}) {
  const [model, setModel] = useState(RENDER_MODELS[0])
  const [queue, setQueue] = useState(MOCK_QUEUE)

  const scripts = useMemo(() => cards.filter((c) => c.kind === 'script'), [cards])
  const boards = useMemo(() => cards.filter((c) => c.kind === 'storyboard'), [cards])
  const director = useMemo(() => cards.filter((c) => c.kind === 'director'), [cards])

  const openTool = () => openDeepLink('trimode://video/director')
  const openCard = (c: StudioCardModel) => openDeepLink(c.deepLink)

  const retry = (id: string) => {
    setQueue((q) => q.map((i) => (i.id === id ? { ...i, status: 'queued', error: undefined } : i)))
    onToast({ tone: 'info', title: '已重新排队', description: `使用 ${model} 重试渲染。` })
  }

  if (cards.length === 0 && conn.status !== 'connected') {
    return <StudioEmpty toolId="video" onOpen={openTool} />
  }

  const failed = queue.filter((q) => q.status === 'failed').length

  return (
    <div className="flex flex-col gap-6">
      <ConnBanner
        conn={conn}
        cost={todayCost}
        tokens={todayTokens}
        onOpen={openTool}
        onReconnect={() => onToast({ tone: 'info', title: '正在连接 AI 视频工具', description: '若工具未启动，将尝试通过 trimode:// 唤起。' })}
      />

      {/* 脚本 */}
      <StudioSection title="脚本" icon={ScrollText} count={scripts.length} description="每集脚本的版本、字数与 AI 生成状态。">
        {scripts.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
        ))}
      </StudioSection>

      {/* 场景 / 分镜 */}
      <StudioSection title="场景 / 分镜" icon={Film} count={boards.length} description="镜头数、已渲染与失败镜头；失败镜头会高亮。">
        {boards.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} onSaveError={onSaveError} />
        ))}
      </StudioSection>

      {/* 导演台 */}
      <section aria-label="导演台" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4 px-1">
          <div>
            <h2 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <Clapperboard className="size-4 text-muted-foreground" aria-hidden="true" />
              导演台
              <span className="tabular-nums text-muted-foreground">{queue.length}</span>
              {failed > 0 && <span className={cn('rounded px-1.5 text-[11px] font-medium', TONE_BADGE.danger)}>{failed} 个失败</span>}
            </h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">当前渲染队列与生成模型；重试会消耗新一轮 Token。</p>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            生成模型
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {RENDER_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* 渲染队列 */}
          <div className="overflow-hidden rounded-lg bg-card shadow-sm">
            <ul className="divide-y divide-border/60">
              {queue.map((q) => {
                const s = QUEUE_STATUS[q.status]
                return (
                  <li key={q.id} className="flex items-center gap-4 px-5 py-3">
                    <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TONE_BAR[s.tone], q.status === 'rendering' && 'animate-pulse')} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-foreground">
                        <span className="truncate">{q.shot}</span>
                        <span className="shrink-0 text-[11px] font-normal text-muted-foreground">{q.episode}</span>
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        <span className="font-mono">{q.model}</span>
                        {q.eta && ` · 预计 ${q.eta}`}
                        {q.error && <span className="text-destructive"> · {q.error}</span>}
                      </p>
                      {q.progress !== undefined && (
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn('h-full rounded-full', TONE_BAR.primary)} style={{ width: `${q.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={cn('shrink-0 rounded px-1.5 text-[11px] font-medium whitespace-nowrap', TONE_BADGE[s.tone])}>{s.label}</span>
                    {q.status === 'failed' && (
                      <Button variant="outline" onClick={() => retry(q.id)} className="h-8">
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        重试
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 导演台状态卡 */}
          <div className="flex flex-col gap-3">
            {director.map((c) => (
              <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
            ))}
            <Button variant="outline" onClick={openTool} className="justify-center">
              <Sparkles className="size-3.5" aria-hidden="true" />
              在导演台中编排
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
