import type { Conversation } from '@/lib/types/common'

export const mockConversations: Conversation[] = [
  {
    id: 'conversation-1',
    title: 'AI Agent Research',
    tool: 'Claude Code',
    model: 'Claude',
    status: 'reviewed',
    updatedAt: '2026-09-02T09:30:00Z',
    projectId: 'project-tri-mode',
  },
  {
    id: 'conversation-2',
    title: 'Harmony Game 原型讨论',
    tool: 'Kimi K3',
    model: 'Kimi K3',
    status: 'candidate',
    updatedAt: '2026-09-02T08:50:00Z',
    projectId: 'project-tri-mode',
  },
]
