import type { Space } from '@/lib/types/knowledge'
import { SpaceType } from '@/lib/types/knowledge'
export const mockKnowledgeSpaces: Space[] = [
  { id: 'space-ai-video', name: 'AI 视频', type: SpaceType.PROJECT, fileCount: 28, pendingCount: 3, icon: 'Video', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-04T10:30:00Z' },
  { id: 'space-game-dev', name: '游戏开发', type: SpaceType.PROJECT, fileCount: 45, pendingCount: 7, icon: 'Gamepad2', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-03T18:20:00Z' },
  { id: 'space-app-dev', name: '应用开发', type: SpaceType.PROJECT, fileCount: 67, pendingCount: 2, icon: 'Code2', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-04T09:15:00Z' },
  { id: 'space-daily-learn', name: '日常学习', type: SpaceType.GENERAL, fileCount: 123, pendingCount: 15, icon: 'BookOpen', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-04T08:00:00Z' },
  { id: 'space-inbox', name: '收集箱', type: SpaceType.GENERAL, fileCount: 34, pendingCount: 34, icon: 'Inbox', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-09-04T11:00:00Z' },
]
export const MOCK_SPACES = mockKnowledgeSpaces
