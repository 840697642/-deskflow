import type { ErrorEntry } from '@/lib/types/knowledge'
import { ErrorSeverity, ErrorStatus } from '@/lib/types/knowledge'
const t = '2026-09-04T10:00:00Z'
export const mockKnowledgeErrors: ErrorEntry[] = [
  { id: 'kerr-1', spaceId: 'space-ai-video', title: '模型超时', errorMessage: 'Error: model request timeout', severity: ErrorSeverity.CRITICAL, reproductionPath: '运行视频生成', status: ErrorStatus.UNRESOLVED, occurrenceCount: 3, relatedFileIds: [], firstOccurredAt: t, lastOccurredAt: t },
  { id: 'kerr-2', spaceId: 'space-ai-video', title: '文件未找到', errorMessage: 'Exception: file not found', severity: ErrorSeverity.HIGH, reproductionPath: '导出视频', solution: '检查路径', status: ErrorStatus.RESOLVED, occurrenceCount: 2, relatedFileIds: ['kfile-1'], firstOccurredAt: t, lastOccurredAt: t, resolvedAt: t },
  { id: 'kerr-3', spaceId: 'space-game-dev', title: '空引用', errorMessage: 'Cannot read properties of undefined', severity: ErrorSeverity.MEDIUM, reproductionPath: '打开关卡', status: ErrorStatus.UNRESOLVED, occurrenceCount: 1, relatedFileIds: [], firstOccurredAt: t, lastOccurredAt: t },
  { id: 'kerr-4', spaceId: 'space-game-dev', title: '构建失败', errorMessage: 'Failed: build pipeline', severity: ErrorSeverity.HIGH, reproductionPath: '执行构建', status: ErrorStatus.ARCHIVED, occurrenceCount: 5, relatedFileIds: ['kfile-6'], firstOccurredAt: t, lastOccurredAt: t },
  { id: 'kerr-5', spaceId: 'space-app-dev', title: '端口冲突', errorMessage: 'Error: port already in use', severity: ErrorSeverity.LOW, reproductionPath: '启动开发服务器', status: ErrorStatus.UNRESOLVED, occurrenceCount: 1, relatedFileIds: [], firstOccurredAt: t, lastOccurredAt: t },
  { id: 'kerr-6', spaceId: 'space-app-dev', title: '类型错误', errorMessage: 'Exception: type mismatch', severity: ErrorSeverity.MEDIUM, reproductionPath: '运行 tsc', status: ErrorStatus.RESOLVED, occurrenceCount: 4, relatedFileIds: ['kfile-7'], firstOccurredAt: t, lastOccurredAt: t, resolvedAt: t },
  { id: 'kerr-7', spaceId: 'space-daily-learn', title: '网络失败', errorMessage: 'Failed: network request', severity: ErrorSeverity.LOW, reproductionPath: '请求 API', status: ErrorStatus.UNRESOLVED, occurrenceCount: 2, relatedFileIds: [], firstOccurredAt: t, lastOccurredAt: t },
  { id: 'kerr-8', spaceId: 'space-inbox', title: '未定义变量', errorMessage: 'undefined is not a function', severity: ErrorSeverity.HIGH, reproductionPath: '运行脚本', status: ErrorStatus.ARCHIVED, occurrenceCount: 1, relatedFileIds: [], firstOccurredAt: t, lastOccurredAt: t },
]
export const MOCK_ERRORS = mockKnowledgeErrors
