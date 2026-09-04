import type { Folder } from '@/lib/types/knowledge'
const t = '2026-09-04T10:00:00Z'
export const mockKnowledgeFolders: Folder[] = [
  { id: 'folder-root', spaceId: 'space-ai-video', name: '项目资料', fileCount: 3, collapsed: false, createdAt: t },
  { id: 'folder-script', spaceId: 'space-ai-video', parentId: 'folder-root', name: '脚本', fileCount: 2, collapsed: false, createdAt: t },
  { id: 'folder-scenes', spaceId: 'space-ai-video', parentId: 'folder-script', name: '镜头', fileCount: 1, collapsed: true, createdAt: t },
  { id: 'folder-game', spaceId: 'space-game-dev', name: '游戏设计', fileCount: 3, collapsed: false, createdAt: t },
  { id: 'folder-app', spaceId: 'space-app-dev', name: '应用文档', fileCount: 3, collapsed: false, createdAt: t },
]
export const MOCK_FOLDERS = mockKnowledgeFolders
