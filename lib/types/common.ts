export const API_SCHEMA_VERSION = '1.0'

export interface ApiSuccess<T> {
  data: T
  requestId: string
  schemaVersion: string
  timestamp: string
  total?: number
}

export interface ApiError {
  code: string
  message: string
  retryable: boolean
  details?: Record<string, unknown>
}

export interface ApiErrorResponse {
  error: ApiError
  requestId: string
  schemaVersion: string
  timestamp: string
}

export interface MutationMetadata {
  actor?: string
  clientMutationId?: string
  schemaVersion?: string
  projectId?: string
}

export interface Conversation {
  id: string
  title: string
  tool: string
  model: string
  status: 'raw' | 'candidate' | 'reviewed' | 'verified'
  updatedAt: string
  projectId?: string
}

export interface Artifact {
  id: string
  name: string
  type: string
  status: 'ready' | 'processing' | 'failed'
  updatedAt: string
  projectId?: string
}

export interface WorkbenchSummary {
  tasks: {
    total: number
    open: number
    completed: number
  }
  jobs: {
    total: number
    active: number
  }
  modules: {
    total: number
    healthy: number
    attention: number
  }
  needsAttention: Array<{
    type: 'module' | 'job'
    id: string
    title: string
    message: string
    retryable: boolean
  }>
  recentConversations: Conversation[]
  recentArtifacts: Artifact[]
}
