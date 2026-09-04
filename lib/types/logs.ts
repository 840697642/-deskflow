export type LogLevel = 'bug' | 'warn' | 'notice' | 'info' | 'debug'
export type LogCategory = 'call' | 'task' | 'permission' | 'system' | 'user' | 'collect'
export type LogSource = 'app' | 'video' | 'game' | 'system'
export type HandledBy = 'retry' | 'fallback' | 'manual'
export interface LogEntry { id: string; ts: string; level: LogLevel; category: LogCategory; traceId: string; parentId?: string; projectId: LogSource; jobId?: string; event: string; message: string; data?: Record<string, unknown>; durationMs?: number; notified: boolean; read: boolean; handledBy?: HandledBy; repeat?: number }
