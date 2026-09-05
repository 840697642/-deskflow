export type ModelKind = 'local' | 'api'
export type ContextKind = 'job' | 'file' | 'error' | 'skill' | 'log' | 'project'
export interface ChatModel { id: string; label: string; provider: string; kind: ModelKind; available: boolean; latencyMs?: number; tier?: 'free' | 'low' | 'mid' | 'high' }
export interface ChatContext { kind: ContextKind; id: string; label: string }
export interface ToolCall { name: string; input: string; output?: string; status: 'running' | 'done' | 'failed' }
export interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; toolCalls?: ToolCall[]; sources?: ChatContext[]; status: 'streaming' | 'done' | 'failed'; createdAt: string }
export interface ChatSession { id: string; spaceId: string | 'global'; title: string; model: string; mode: 'chat' | 'agent'; contexts: ChatContext[]; messages: ChatMessage[]; pinned?: boolean; updatedAt: string }
