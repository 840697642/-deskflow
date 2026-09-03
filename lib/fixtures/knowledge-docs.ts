import type { KnowledgeDoc } from '@/lib/types/knowledge-doc'

export const mockKnowledgeDocs: KnowledgeDoc[] = [
  {
    id: 'doc-1', title: 'AI 视频制作规范', type: 'markdown', path: '/docs/ai-video-spec.md', size: '128 KB',
    updatedAt: '2026-09-02T15:30:00Z', pinned: true, tags: ['AI', '视频'],
    previewText: '本文档定义了 AI 视频生成的标准流程，包括脚本撰写、角色设计、镜头规划等环节。', icon: 'FileText',
  },
  {
    id: 'doc-2', title: 'Harmony Game 设计文档', type: 'notion', path: 'https://notion.so/harmony-game-design', size: '856 KB',
    updatedAt: '2026-09-01T18:45:00Z', pinned: true, tags: ['游戏', '设计'],
    previewText: '鸿蒙游戏的核心玩法、关卡设计和美术风格定义。包含完整的技能树和角色成长系统。', icon: 'FileCode2',
  },
  {
    id: 'doc-3', title: 'API 对接清单', type: 'spreadsheet', path: '/sheets/api-checklist.xlsx', size: '45 KB',
    updatedAt: '2026-09-03T09:20:00Z', pinned: false, tags: ['API', '后端'],
    previewText: '后端 API 开发进度跟踪表，包含输入、授权和知识库端点的状态和测试结果。', icon: 'FileSpreadsheet',
  },
  {
    id: 'doc-4', title: 'v0 组件库使用指南', type: 'pdf', path: '/docs/v0-component-guide.pdf', size: '3.2 MB',
    updatedAt: '2026-08-30T11:00:00Z', pinned: false, tags: ['前端', 'v0'],
    previewText: 'v0.app 组件的使用规范和最佳实践，包含常用组件的示例代码。', icon: 'FileText',
  },
  {
    id: 'doc-5', title: '工作流自动化脚本', type: 'code', path: '/scripts/workflow-automation.ts', size: '12 KB',
    updatedAt: '2026-08-28T14:30:00Z', pinned: false, tags: ['自动化', 'TypeScript'],
    previewText: '自动化任务调度和执行的核心脚本，支持并发控制和错误重试。', icon: 'FileCode2',
  },
  {
    id: 'doc-6', title: '数据库架构设计', type: 'markdown', path: '/docs/database-schema.md', size: '89 KB',
    updatedAt: '2026-08-25T16:00:00Z', pinned: false, tags: ['数据库', '架构'],
    previewText: '完整的数据库表结构、索引策略和查询优化方案。', icon: 'FileText',
  },
  {
    id: 'doc-7', title: '团队协作规范', type: 'notion', path: 'https://notion.so/team-collaboration', size: '234 KB',
    updatedAt: '2026-08-20T10:00:00Z', pinned: false, tags: ['团队', '规范'],
    previewText: 'Git 分支管理、代码审查流程和文档编写标准。', icon: 'FileText',
  },
  {
    id: 'doc-8', title: '性能优化报告', type: 'pdf', path: '/reports/performance-optimization.pdf', size: '1.8 MB',
    updatedAt: '2026-08-15T13:30:00Z', pinned: false, tags: ['性能', '优化'],
    previewText: '前端渲染性能分析和优化方案，包含 Lighthouse 测试结果。', icon: 'FileText',
  },
]
