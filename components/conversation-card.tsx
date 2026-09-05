'use client'

import type { ReactNode } from 'react'
import { Bug, CheckCircle2, MessageSquare, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, FOCUS_RING } from '@/components/ui-primitives'
import { Badge, TOOL_META, TagPill, ToolTag, type Conversation } from '@/components/knowledge-shared'

interface Props {
  conversation: Conversation
  onOpen: (c: Conversation) => void
  onSummarize: (id: string) => void
  onViewErrors?: (c: Conversation) => void
  /** 归档控件等额外操作（由父组件按空间决定是否渲染） */
  extraActions?: ReactNode
}

/**
 * AI 对话卡片
 * 结构：工具色块 | 标题 + AI 摘要 + 前 2 条要点 + 元数据 | 悬停操作
 */
export default function ConversationCard({ conversation: c, onOpen, onSummarize, onViewErrors, extraActions }: Props) {
  const keyPoints = c.summary?.keyPoints?.slice(0, 2) ?? []

  return (
    <li className="group flex items-start gap-4 px-6 py-4 transition-colors duration-150 hover:bg-surface-raised">
      <span className={cn('mt-0.5 flex h-9 w-20 shrink-0 items-center justify-center rounded-md text-[11px] font-medium', TOOL_META[c.tool].className)}>{TOOL_META[c.tool].label}</span>

      <button type="button" className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)} onClick={() => onOpen(c)}>
        <span className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">{c.title}</span>
          {c.summary ? (
            <Badge tone="success">
              <Sparkles className="size-3" aria-hidden="true" />
              已总结
            </Badge>
          ) : (
            <Badge tone="info">待总结</Badge>
          )}
          {c.hasError && (
            <Badge tone="danger">
              <Bug className="size-3" aria-hidden="true" />
              含报错
            </Badge>
          )}
        </span>

        {/* AI 摘要 */}
        {c.summary?.content && <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground text-pretty">{c.summary.content}</span>}

        {/* 前 2 条要点 */}
        {keyPoints.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1">
            {keyPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] leading-relaxed text-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
                <span className="text-pretty">{p}</span>
              </li>
            ))}
          </ul>
        )}

        {/* 元数据 */}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums">
            <MessageSquare className="size-3" aria-hidden="true" />
            {c.messageCount} 条消息
          </span>
          <span>采集于 {c.capturedAt}</span>
          <ToolTag tool={c.tool} />
          {c.tags.map((t) => (
            <TagPill key={t}>{t}</TagPill>
          ))}
        </span>
      </button>

      <div className="mt-0.5 flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {!c.summary && (
          <Button variant="ghost" onClick={() => onSummarize(c.id)}>
            <Wand2 className="size-3.5" aria-hidden="true" />
            生成总结
          </Button>
        )}
        {c.hasError && onViewErrors && (
          <Button variant="ghost" onClick={() => onViewErrors(c)}>
            <Bug className="size-3.5" aria-hidden="true" />
            查看错题
          </Button>
        )}
        {extraActions}
      </div>
    </li>
  )
}
