import { AppWindow, BookOpen, Clapperboard, Gamepad2, Inbox, MessageSquareMore, type LucideIcon } from 'lucide-react'
import type { Conversation, ErrorEntry, Folder, KnowledgeFile, Space } from '@/lib/types/knowledge'
import { ErrorSeverity, ErrorStatus, FilePriority, SpaceType } from '@/lib/types/knowledge'
import type { Conversation as UiConversation, ErrorEntry as UiErrorEntry, KFile, KFolder, Space as UiSpace } from '@/components/knowledge-base'

export function formatKnowledgeTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时前`
  if (minutes < 10080) return `${Math.floor(minutes / 1440)} 天前`
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const iconMap: Array<[string, LucideIcon, string]> = [
  ['视频', Clapperboard, 'text-warning'],
  ['游戏', Gamepad2, 'text-technical'],
  ['应用', AppWindow, 'text-technical'],
  ['学习', BookOpen, 'text-info'],
  ['收集', Inbox, 'text-muted-foreground'],
  ['对话', MessageSquareMore, 'text-primary'],
]

function inferSpaceVisual(space: Space): { icon: LucideIcon; className: string; description: string } {
  const match = iconMap.find(([name]) => space.name.includes(name))
  return {
    icon: match?.[1] ?? (space.type === SpaceType.PROJECT ? AppWindow : BookOpen),
    className: match?.[2] ?? 'text-primary',
    description: space.type === SpaceType.PROJECT ? '项目资料、规范、任务与发布记录。' : '跨项目收集的资料与 AI 对话。',
  }
}

export function adaptKnowledgeSpace(space: Space): UiSpace {
  const visual = inferSpaceVisual(space)
  return { id: space.id, name: space.name, group: space.type, icon: visual.icon, className: visual.className, description: visual.description }
}

export function adaptKnowledgeFolder(folder: Folder): KFolder {
  return { id: folder.id, spaceId: folder.spaceId, parentId: folder.parentId ?? null, name: folder.name }
}

function fileKind(type: KnowledgeFile['type']): KFile['kind'] {
  if (type === 'code') return 'code'
  if (type === 'pdf') return 'doc'
  if (type === 'conversation') return 'summary'
  return 'doc'
}

export function adaptKnowledgeFile(file: KnowledgeFile): KFile {
  return {
    id: file.id,
    spaceId: file.spaceId,
    folderId: file.folderId ?? '',
    title: file.title,
    kind: fileKind(file.type),
    tags: file.tags,
    starred: file.priority === FilePriority.CRITICAL,
    aiSummary: file.aiSummary?.status === 'completed' ? file.aiSummary.content ?? '已完成 AI 总结' : undefined,
    status: file.priority === FilePriority.PENDING ? 'inbox' : 'organized',
    updatedAt: formatKnowledgeTime(file.updatedAt),
    size: file.metadata.size,
  }
}

function uiErrorStatus(status: ErrorStatus): UiErrorEntry['status'] {
  if (status === ErrorStatus.RESOLVED) return 'solved'
  if (status === ErrorStatus.ARCHIVED) return 'archived'
  return 'open'
}

function uiSeverity(severity: ErrorSeverity): UiErrorEntry['severity'] {
  if (severity === ErrorSeverity.LOW) return 'low'
  if (severity === ErrorSeverity.MEDIUM) return 'medium'
  return 'high'
}

export function adaptKnowledgeError(error: ErrorEntry): UiErrorEntry {
  return { id: error.id, spaceId: error.spaceId, title: error.title, message: error.errorMessage, env: error.reproductionPath, rootCause: undefined, fix: error.solution, status: uiErrorStatus(error.status), severity: uiSeverity(error.severity), occurrences: error.occurrenceCount, tags: [], updatedAt: formatKnowledgeTime(error.lastOccurredAt), fromConversationId: error.relatedConversationId }
}

export function adaptKnowledgeConversation(conversation: Conversation): UiConversation {
  const tool: UiConversation['tool'] = conversation.tool === 'claude_code' ? 'claude' : conversation.tool === 'codex' || conversation.tool === 'cursor' || conversation.tool === 'trae' ? conversation.tool : 'claude'
  return { id: conversation.id, spaceId: conversation.spaceId, tool, title: conversation.title, messages: conversation.messageCount, capturedAt: formatKnowledgeTime(conversation.createdAt), summarized: conversation.summary?.status === 'completed', tags: [], hasError: conversation.hasErrors }
}
