'use client'

import { Clock3, Eye, Sparkles, Star, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, FOCUS_RING } from '@/components/ui-primitives'
import { Badge, KIND_ICON, TagPill, ToolTag, relativeTime, type KFile } from '@/components/knowledge-shared'

interface Props {
  file: KFile
  folderName?: string
  onOpen: (file: KFile) => void
  onToggleStar: (id: string) => void
  onSummarize: (id: string) => void
  onOrganize: (id: string) => void
}

/**
 * 文件卡片（列表行）
 * 结构：类型图标 | 标题 + AI 摘要 + 元数据 | 悬停操作 + 右上角星标
 */
export default function KnowledgeFileCard({ file, folderName, onOpen, onToggleStar, onSummarize, onOrganize }: Props) {
  const Icon = KIND_ICON[file.kind]

  return (
    <li className="group relative flex items-start gap-4 px-6 py-4 transition-colors duration-150 hover:bg-surface-raised">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <button type="button" onClick={() => onOpen(file)} className={cn('min-w-0 flex-1 rounded-md text-left', FOCUS_RING)}>
        {/* 标题行：为右上角星标预留空间 */}
        <span className="flex items-center gap-2 pr-9">
          <span className="truncate text-[13px] font-medium text-foreground">{file.title}</span>
          {file.aiSummary && (
            <Badge tone="success">
              <Sparkles className="size-3" aria-hidden="true" />
              AI 总结
            </Badge>
          )}
          {file.status === 'inbox' && <Badge tone="warning">待整理</Badge>}
        </span>

        {/* AI 摘要：灰色小字，最多两行 */}
        {file.aiSummary?.content && <span className="mt-1 line-clamp-2 block text-[12px] leading-relaxed text-muted-foreground text-pretty">{file.aiSummary.content}</span>}

        {/* 元数据 */}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="truncate">
            {folderName ?? '—'} · {file.size} · 更新于 {file.updatedAt}
          </span>
          <span className="flex items-center gap-1 tabular-nums" title="访问次数">
            <Eye className="size-3" aria-hidden="true" />
            {file.accessCount} 次访问
          </span>
          <span className="flex items-center gap-1" title="最近访问">
            <Clock3 className="size-3" aria-hidden="true" />
            最近访问：{relativeTime(file.lastAccessedAt)}
          </span>
          {file.sourceTool && (
            <span className="flex items-center gap-1">
              来自
              <ToolTag tool={file.sourceTool} />
            </span>
          )}
          {file.tags.map((t) => (
            <TagPill key={t}>{t}</TagPill>
          ))}
        </span>
      </button>

      {/* 悬停操作 */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-9 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {file.status === 'inbox' && (
          <Button variant="ghost" onClick={() => onOrganize(file.id)}>
            归类
          </Button>
        )}
        {!file.aiSummary && (
          <Button variant="ghost" onClick={() => onSummarize(file.id)}>
            <Wand2 className="size-3.5" aria-hidden="true" />
            AI 总结
          </Button>
        )}
      </div>

      {/* 右上角星标：常显 */}
      <button
        type="button"
        aria-label={file.starred ? '取消重点' : '标为重点'}
        aria-pressed={file.starred}
        onClick={() => onToggleStar(file.id)}
        className={cn(
          'absolute top-3 right-4 flex size-8 items-center justify-center rounded-md transition-colors duration-150',
          FOCUS_RING,
          file.starred ? 'text-warning hover:bg-warning/10' : 'text-muted-foreground/60 hover:bg-surface-raised hover:text-foreground',
        )}
      >
        <Star className={cn('size-4', file.starred && 'fill-warning')} aria-hidden="true" />
      </button>
    </li>
  )
}
