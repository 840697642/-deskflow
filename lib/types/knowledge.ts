import type { MutationMetadata } from './common'

export enum SpaceType { PROJECT = 'project', GENERAL = 'general' }
export interface Space {
  id: string
  name: string
  type: SpaceType
  fileCount: number
  pendingCount: number
  icon?: string
  createdAt: string
  updatedAt: string
}

export enum FileSource { AI_IMPORT = 'ai_import', MANUAL_UPLOAD = 'manual_upload', AUTO_COLLECT = 'auto_collect' }
export enum FilePriority { CRITICAL = 'critical', PENDING = 'pending', NORMAL = 'normal' }
export enum AISummaryStatus { PENDING = 'pending', COMPLETED = 'completed', FAILED = 'failed' }
export type KnowledgeFileType = 'markdown' | 'pdf' | 'code' | 'note' | 'conversation'
export interface KnowledgeFile {
  id: string
  spaceId: string
  folderId?: string
  title: string
  type: KnowledgeFileType
  source: FileSource
  priority: FilePriority
  starred: boolean
  tags: string[]
  aiSummary?: { status: AISummaryStatus; content?: string; generatedAt?: string }
  content: string
  metadata: { size: string; author?: string; relatedConversationId?: string }
  verified: boolean
  verifiedAt?: string
  accessCount: number
  createdAt: string
  updatedAt: string
  lastAccessedAt: string
}

export enum ErrorSeverity { CRITICAL = 'critical', HIGH = 'high', MEDIUM = 'medium', LOW = 'low' }
export enum ErrorStatus { UNRESOLVED = 'unresolved', RESOLVED = 'resolved', ARCHIVED = 'archived' }
export interface ErrorEntry {
  id: string
  spaceId: string
  title: string
  errorMessage: string
  signature: string
  severity: ErrorSeverity
  reproductionPath: string
  solution?: string
  status: ErrorStatus
  occurrenceCount: number
  contexts: Array<{ message: string; reproductionPath: string; context?: string; occurredAt: string }>
  relatedConversationId?: string
  relatedFileIds: string[]
  firstOccurredAt: string
  lastOccurredAt: string
  resolvedAt?: string
}

export enum ConversationTool { CODEX = 'codex', CURSOR = 'cursor', TRAE = 'trae', CLAUDE_CODE = 'claude_code', OTHER = 'other' }
export interface ConversationMessage { role: 'user' | 'assistant'; content: string; timestamp: string }
export interface Conversation {
  id: string
  spaceId: string
  title: string
  tool: ConversationTool
  messageCount: number
  hasErrors: boolean
  summary?: { status: AISummaryStatus; content?: string; keyPoints?: string[]; generatedAt?: string }
  sessionId: string
  messages: ConversationMessage[]
  extractedErrors: string[]
  createdAt: string
  updatedAt?: string
  archivedAt?: string
}

export interface Folder { id: string; spaceId: string; parentId?: string; name: string; fileCount: number; collapsed: boolean; createdAt: string }
export type ApiKeyScope = 'save_conversation' | 'save_error' | 'search_knowledge'
export interface ApiKey { id: string; name: string; key: string; scopes: ApiKeyScope[]; spaceId?: string; usageCount: number; lastUsedAt?: string; expiresAt?: string; createdAt: string; revokedAt?: string }
export interface ApiKeyRecord extends ApiKey { keyHash: string; keyPrefix: string }
export interface KnowledgeMutation extends MutationMetadata { }
