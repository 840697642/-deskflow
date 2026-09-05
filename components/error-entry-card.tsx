'use client'

import { useId, useState } from 'react'
import { CheckCircle2, ChevronDown, History, Link2, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, FOCUS_RING, TONE_BAR } from '@/components/ui-primitives'
import { Badge, ERROR_STATUS_META, SEVERITY_META, TOOL_META, TagPill, relativeTime, shortDateTime, type Conversation, type ErrorEntry, type ErrorStatus } from '@/components/knowledge-shared'

interface Props {
  error: ErrorEntry
  fromConversation?: Conversation
  onSetStatus: (id: string, status: ErrorStatus) => void
  onOpenConversation?: (conv: Conversation) => void
}

/**
 * 错题卡片
 * 结构：标题 + 徽章 | 报错原文 | 根因 / 解决方案（绿色框） | 可展开的历史记录 | 标签 + 回链
 */
export default function ErrorEntryCard({ error, fromConversation, onSetStatus, onOpenConversation }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyId = useId()
  const st = ERROR_STATUS_META[error.status]
  const sv = SEVERITY_META[error.severity]

  return (
    <li className="rounded-lg bg-muted/60 p-5">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span aria-hidden="true" className={cn('size-2 rounded-full', TONE_BAR[sv.tone])} />
            <h3 className="text-[13px] font-medium text-foreground">{error.title}</h3>
            <Badge tone={sv.tone}>{sv.label}优先级</Badge>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {error.occurrenceCount > 1 && (
              <Badge tone="danger">
                <History className="size-3" aria-hidden="true" />
                出现 {error.occurrenceCount} 次
              </Badge>
            )}
            <span>
              {error.env} · 更新于 {error.updatedAt}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {error.status === 'open' && (
            <Button variant="primary" onClick={() => onSetStatus(error.id, 'solved')}>
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              标为已解决
            </Button>
          )}
          {error.status === 'solved' && (
            <Button variant="ghost" onClick={() => onSetStatus(error.id, 'archived')}>
              归档
            </Button>
          )}
          {error.status === 'archived' && (
            <Button variant="ghost" onClick={() => onSetStatus(error.id, 'open')}>
              重新打开
            </Button>
          )}
        </div>
      </div>

      {/* 最新报错 */}
      <pre className="mt-3 overflow-x-auto rounded-md bg-card p-3 font-mono text-[11px] leading-relaxed text-destructive whitespace-pre-wrap">{error.message}</pre>

      {/* 根因 + 解决方案 */}
      <div className="mt-3 grid gap-3 text-[13px] md:grid-cols-2">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">根因</p>
          <p className={cn('mt-0.5 leading-relaxed text-pretty', error.rootCause ? 'text-foreground' : 'text-muted-foreground')}>{error.rootCause ?? '尚未定位'}</p>
        </div>
        {error.solution ? (
          <div className="rounded-md bg-success/10 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-success">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              解决方案
            </p>
            <p className="mt-1 leading-relaxed text-foreground text-pretty">{error.solution}</p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">解决方案</p>
            <p className="mt-0.5 leading-relaxed text-muted-foreground">待补充</p>
          </div>
        )}
      </div>

      {/* 历史记录（可展开） */}
      {error.contexts.length > 0 && (
        <div className="mt-3 rounded-md bg-card">
          <button
            type="button"
            aria-expanded={historyOpen}
            aria-controls={historyId}
            onClick={() => setHistoryOpen((v) => !v)}
            className={cn('flex h-9 w-full items-center gap-2 rounded-md px-3 text-[13px] text-foreground transition-colors duration-150 hover:bg-surface-raised', FOCUS_RING)}
          >
            <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', historyOpen && 'rotate-180')} aria-hidden="true" />
            查看历史记录
            <span className="tabular-nums text-[11px] text-muted-foreground">{error.contexts.length} 条</span>
            {!historyOpen && <span className="ml-auto text-[11px] text-muted-foreground">最近一次 {relativeTime(error.contexts[0].occurredAt)}</span>}
          </button>
          {historyOpen && (
            <ol id={historyId} className="flex flex-col divide-y divide-border/60 border-t border-border/60">
              {error.contexts.map((ctx, i) => (
                <li key={`${ctx.occurredAt}-${i}`} className="grid gap-2 px-3 py-3 text-[12px] md:grid-cols-[104px_minmax(0,1fr)]">
                  <div className="flex flex-col gap-0.5">
                    <time dateTime={ctx.occurredAt} className="font-mono text-[11px] tabular-nums text-foreground">
                      {shortDateTime(ctx.occurredAt)}
                    </time>
                    <span className="text-[11px] text-muted-foreground">{relativeTime(ctx.occurredAt)}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <code className="block overflow-x-auto font-mono text-[11px] leading-relaxed text-destructive whitespace-pre-wrap">{ctx.message}</code>
                    {ctx.reproductionPath && (
                      <span className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        <Route className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                        <span>
                          <span className="font-medium text-foreground">复现路径：</span>
                          {ctx.reproductionPath}
                        </span>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* 标签 + 回链 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {error.tags.map((t) => (
          <TagPill key={t}>{t}</TagPill>
        ))}
        {fromConversation && (
          <button type="button" onClick={() => onOpenConversation?.(fromConversation)} className={cn('ml-auto flex items-center gap-1 rounded text-primary hover:underline', FOCUS_RING)}>
            <Link2 className="size-3" aria-hidden="true" />
            来自 {TOOL_META[fromConversation.tool].label} 对话「{fromConversation.title}」
          </button>
        )}
      </div>
    </li>
  )
}
