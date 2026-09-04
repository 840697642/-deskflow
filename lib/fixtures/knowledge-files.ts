import type { KnowledgeFile } from '@/lib/types/knowledge'
import { FilePriority, FileSource } from '@/lib/types/knowledge'
const base = '2026-09-04T10:00:00Z'
export const mockKnowledgeFiles: KnowledgeFile[] = [
  { id: 'kfile-1', spaceId: 'space-ai-video', title: '视频制作规范', type: 'markdown', source: FileSource.AI_IMPORT, priority: FilePriority.CRITICAL, tags: ['AI', '流程'], content: '# 视频制作规范', metadata: { size: '12 KB', author: 'Claude Code' }, createdAt: base, updatedAt: base },
  { id: 'kfile-2', spaceId: 'space-ai-video', title: '镜头脚本', type: 'note', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.PENDING, tags: ['脚本'], content: 'Scene 01', metadata: { size: '8 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-3', spaceId: 'space-ai-video', title: '渲染配置', type: 'code', source: FileSource.AI_IMPORT, priority: FilePriority.NORMAL, tags: ['配置'], content: 'export default {}', metadata: { size: '4 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-4', spaceId: 'space-game-dev', title: '关卡设计', type: 'pdf', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.CRITICAL, tags: ['游戏', '关卡'], content: 'Level design', metadata: { size: '2 MB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-5', spaceId: 'space-game-dev', title: '技能树', type: 'markdown', source: FileSource.AI_IMPORT, priority: FilePriority.PENDING, tags: ['游戏'], content: '# Skills', metadata: { size: '22 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-6', spaceId: 'space-game-dev', title: '战斗脚本', type: 'code', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.NORMAL, tags: ['代码'], content: 'function fight() {}', metadata: { size: '9 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-7', spaceId: 'space-app-dev', title: '架构说明', type: 'markdown', source: FileSource.AI_IMPORT, priority: FilePriority.CRITICAL, tags: ['架构'], content: '# Architecture', metadata: { size: '18 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-8', spaceId: 'space-app-dev', title: '接口清单', type: 'markdown', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.PENDING, tags: ['API'], content: 'GET /api', metadata: { size: '35 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-9', spaceId: 'space-app-dev', title: '部署脚本', type: 'code', source: FileSource.AUTO_COLLECT, priority: FilePriority.NORMAL, tags: ['部署'], content: 'npm run build', metadata: { size: '3 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-10', spaceId: 'space-daily-learn', title: 'TypeScript 笔记', type: 'note', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.NORMAL, tags: ['学习'], content: 'Types', metadata: { size: '6 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-11', spaceId: 'space-daily-learn', title: 'React 性能', type: 'pdf', source: FileSource.AI_IMPORT, priority: FilePriority.PENDING, tags: ['性能'], content: 'React memo', metadata: { size: '1 MB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-12', spaceId: 'space-daily-learn', title: '浏览器调试', type: 'markdown', source: FileSource.AUTO_COLLECT, priority: FilePriority.NORMAL, tags: ['调试'], content: '# DevTools', metadata: { size: '10 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-13', spaceId: 'space-inbox', title: '待整理对话', type: 'conversation', source: FileSource.AUTO_COLLECT, priority: FilePriority.PENDING, tags: ['收集箱'], content: 'Conversation', metadata: { size: '14 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-14', spaceId: 'space-inbox', title: '临时方案', type: 'note', source: FileSource.MANUAL_UPLOAD, priority: FilePriority.NORMAL, tags: ['待整理'], content: 'Draft', metadata: { size: '2 KB' }, createdAt: base, updatedAt: base },
  { id: 'kfile-15', spaceId: 'space-inbox', title: '错误日志', type: 'code', source: FileSource.AUTO_COLLECT, priority: FilePriority.CRITICAL, tags: ['报错'], content: 'Error: timeout', metadata: { size: '1 KB' }, createdAt: base, updatedAt: base },
]
export const MOCK_FILES = mockKnowledgeFiles
