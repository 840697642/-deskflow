import type {
  ApiError as ApiErrorPayload,
  ApiSuccess,
  Artifact,
  Conversation,
  MutationMetadata,
  WorkbenchSummary,
} from './types/common'
import type { AuthCallbackRequest, AuthCallbackResponse, AuthRequirement } from './types/auth'
import type { KnowledgeDoc } from './types/knowledge-doc'
import type { ApiKey, ApiKeyScope, Conversation as KnowledgeConversation, ErrorEntry, FilePriority, Folder, KnowledgeFile, Space } from './types/knowledge'
import type { Job, JobAction, JobControlRequest, JobInputRequirement, JobStatus } from './types/job'
import type { ModuleHealth, ModuleHealthStatus } from './types/module'
import type {
  CreateTaskRequest,
  Task,
  TaskPriority,
  TaskStatus,
  UpdateTaskRequest,
} from './types/task'
import type { ChatModel, ChatSession } from './types/chat'
import type { LogEntry } from './types/logs'
import type { Skill } from './types/skills'
import type { SettingsResponse } from './types/settings'
import type { AcceptInboxPayload, CreateInboxItemPayload, InboxItem, SaveAsErrorPayload, StudioCardModel, ToolConnection, ToolId, ToolTimeDay, UsageRecord } from './types/creation-tools'

const API_SCHEMA_VERSION = '1.0'
const DEFAULT_ACTOR = 'claude-code'
const DEFAULT_PROJECT_ID = 'project-tri-mode'

export interface ApiClientOptions {
  /** 服务端调用时必须提供绝对 URL；浏览器调用可省略。 */
  baseUrl?: string
  /** 仅用于测试或自定义运行时，默认使用全局 fetch。 */
  fetchImpl?: typeof fetch
  headers?: HeadersInit
}

export class ApiError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly details: Record<string, unknown>
  readonly status?: number
  readonly requestId?: string
  readonly schemaVersion?: string

  constructor(
    payload: ApiErrorPayload,
    options: { status?: number; requestId?: string; schemaVersion?: string } = {},
  ) {
    super(payload.message)
    this.name = 'ApiError'
    this.code = payload.code
    this.retryable = payload.retryable
    this.details = payload.details ?? {}
    this.status = options.status
    this.requestId = options.requestId
    this.schemaVersion = options.schemaVersion
  }
}

export type TaskQuery = {
  status?: TaskStatus
  projectId?: string
}

export type JobQuery = {
  status?: JobStatus
  module?: string
}

export type InspectorType = 'task' | 'job' | 'module' | 'conversation' | 'artifact'

export type InspectorResponse =
  | { type: 'task'; id: string; item: Task }
  | { type: 'job'; id: string; item: Job }
  | { type: 'module'; id: string; item: ModuleHealth }
  | { type: 'conversation'; id: string; item: Conversation }
  | { type: 'artifact'; id: string; item: Artifact }

export type MutationInput = Partial<MutationMetadata>

export type CreateTaskInput = CreateTaskRequest
export type UpdateTaskInput = UpdateTaskRequest
export type KnowledgeDocQuery = { limit?: number; pinned?: boolean }
export type KnowledgeSpaceQuery = { type?: 'project' | 'general' }
export type KnowledgeFileQuery = { spaceId?: string; priority?: FilePriority; tag?: string[]; folderId?: string; sort?: 'smart' | 'recent' | 'priority' | 'title' | 'updatedAt'; page?: number; limit?: number }
export type KnowledgeErrorQuery = { spaceId?: string; status?: string; severity?: string; sort?: 'severity' | 'lastOccurredAt'; page?: number; limit?: number }
export type KnowledgeConversationQuery = { spaceId?: string; tool?: string; hasErrors?: boolean; summarized?: boolean; page?: number; limit?: number }
export type KnowledgeFolderQuery = { spaceId?: string; parentId?: string }

type RequestInitWithBody = RequestInit & { body?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  if (!isRecord(value)) return false
  return typeof value.code === 'string' && typeof value.message === 'string' && typeof value.retryable === 'boolean'
}

function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  if (!isRecord(value)) return false
  return 'data' in value && typeof value.requestId === 'string' && typeof value.schemaVersion === 'string'
}

function resolveUrl(path: string, baseUrl?: string): string {
  if (baseUrl) {
    try {
      return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString()
    } catch {
      throw new ApiError({
        code: 'INVALID_BASE_URL',
        message: 'baseUrl 必须是有效的绝对 URL',
        retryable: false,
        details: { baseUrl },
      })
    }
  }

  if (typeof window !== 'undefined') return path

  throw new ApiError({
    code: 'BASE_URL_REQUIRED',
    message: '服务端调用 API 客户端时必须提供绝对 baseUrl',
    retryable: false,
    details: { path },
  })
}

function createClientMutationId(): string {
  return crypto.randomUUID()
}

function withMutationDefaults(meta?: MutationInput): Required<Pick<MutationMetadata, 'actor' | 'clientMutationId' | 'schemaVersion' | 'projectId'>> {
  return {
    actor: meta?.actor ?? DEFAULT_ACTOR,
    clientMutationId: meta?.clientMutationId ?? createClientMutationId(),
    schemaVersion: meta?.schemaVersion ?? API_SCHEMA_VERSION,
    projectId: meta?.projectId ?? DEFAULT_PROJECT_ID,
  }
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value)
}

function queryString(values: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ''
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (text.trim() === '') return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

async function requestJson<T>(path: string, init: RequestInitWithBody = {}, options: ApiClientOptions = {}): Promise<T> {
  const url = resolveUrl(path, options.baseUrl)
  const fetcher = options.fetchImpl ?? fetch
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetcher(url, { ...init, headers })
  } catch (cause) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接到本地 API 服务',
      retryable: true,
      details: { cause: cause instanceof Error ? cause.message : String(cause), path },
    })
  }

  const parsed = await parseResponseBody(response)
  if (!response.ok) {
    const payload = isRecord(parsed) && isApiErrorPayload(parsed.error) ? parsed.error : {
      code: 'HTTP_ERROR',
      message: `API 请求失败（HTTP ${response.status}）`,
      retryable: response.status >= 500,
      details: isRecord(parsed) ? parsed : { path },
    }
    throw new ApiError(payload, {
      status: response.status,
      requestId: isRecord(parsed) && typeof parsed.requestId === 'string' ? parsed.requestId : undefined,
      schemaVersion: isRecord(parsed) && typeof parsed.schemaVersion === 'string' ? parsed.schemaVersion : undefined,
    })
  }

  if (!isApiSuccess<T>(parsed)) {
    throw new ApiError({
      code: 'INVALID_API_RESPONSE',
      message: 'API 返回了不符合契约的响应',
      retryable: false,
      details: { path },
    }, { status: response.status })
  }

  return parsed.data
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value)
}

function mutationBody<T extends object>(input: T, meta?: MutationInput): Record<string, unknown> {
  return { ...input, ...withMutationDefaults(meta) }
}

export async function fetchTasks(params?: TaskQuery, options?: ApiClientOptions): Promise<Task[]> {
  return requestJson<Task[]>(`/api/tasks${queryString({ status: params?.status, projectId: params?.projectId })}`, {}, options)
}

export async function fetchTask(id: string, options?: ApiClientOptions): Promise<Task> {
  return requestJson<Task>(`/api/tasks/${encodePathSegment(id)}`, {}, options)
}

export async function createTask(input: CreateTaskInput, options?: ApiClientOptions): Promise<Task> {
  return requestJson<Task>('/api/tasks', {
    method: 'POST',
    body: jsonBody(mutationBody(input, input)),
  }, options)
}

export async function completeTask(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Task> {
  return requestJson<Task>(`/api/tasks/${encodePathSegment(id)}/complete`, {
    method: 'POST',
    body: jsonBody(mutationBody({}, meta)),
  }, options)
}

export async function updateTask(id: string, input: UpdateTaskInput, options?: ApiClientOptions): Promise<Task> {
  return requestJson<Task>(`/api/tasks/${encodePathSegment(id)}`, {
    method: 'PATCH',
    body: jsonBody(mutationBody(input, input)),
  }, options)
}

export async function fetchJobs(params?: JobQuery, options?: ApiClientOptions): Promise<Job[]> {
  return requestJson<Job[]>(`/api/jobs${queryString({ status: params?.status, module: params?.module })}`, {}, options)
}

export async function fetchJob(id: string, options?: ApiClientOptions): Promise<Job> {
  return requestJson<Job>(`/api/jobs/${encodePathSegment(id)}`, {}, options)
}

async function sendJobAction(id: string, action: JobAction, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return requestJson<Job>(`/api/jobs/${encodePathSegment(id)}/${action}`, {
    method: 'POST',
    body: jsonBody(mutationBody({}, meta)),
  }, options)
}

export function pauseJob(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return sendJobAction(id, 'pause', meta, options)
}

export function resumeJob(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return sendJobAction(id, 'resume', meta, options)
}

export function cancelJob(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return sendJobAction(id, 'cancel', meta, options)
}

export function retryJob(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return sendJobAction(id, 'retry', meta, options)
}

export async function fetchInputRequirements(id: string, options?: ApiClientOptions): Promise<JobInputRequirement> {
  return requestJson<JobInputRequirement>(`/api/jobs/${encodePathSegment(id)}/input-requirements`, {}, options)
}

export async function submitJobInput(id: string, value: string, meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return requestJson<Job>(`/api/jobs/${encodePathSegment(id)}/input`, {
    method: 'POST',
    body: jsonBody(mutationBody({ value }, meta)),
  }, options)
}

export async function fetchAuthRequirements(type: AuthRequirement['type'], id: string, options?: ApiClientOptions): Promise<AuthRequirement> {
  return requestJson<AuthRequirement>(`/api/auth/requirements/${encodePathSegment(type)}/${encodePathSegment(id)}`, {}, options)
}

export async function submitAuthCallback(input: Omit<AuthCallbackRequest, keyof MutationMetadata>, meta?: MutationInput, options?: ApiClientOptions): Promise<AuthCallbackResponse> {
  return requestJson<AuthCallbackResponse>('/api/auth/callback', {
    method: 'POST',
    body: jsonBody(mutationBody(input, meta)),
  }, options)
}

export async function controlJob(id: string, action: JobControlRequest['action'], meta?: MutationInput, options?: ApiClientOptions): Promise<Job> {
  return requestJson<Job>(`/api/jobs/${encodePathSegment(id)}`, {
    method: 'PATCH',
    body: jsonBody(mutationBody({ action }, meta)),
  }, options)
}

export async function fetchModules(options?: ApiClientOptions): Promise<ModuleHealth[]> {
  return requestJson<ModuleHealth[]>('/api/modules', {}, options)
}

export async function fetchModuleHealth(options?: ApiClientOptions): Promise<ModuleHealth[]> {
  return requestJson<ModuleHealth[]>('/api/modules/health', {}, options)
}

export async function fetchModule(id: string, options?: ApiClientOptions): Promise<ModuleHealth> {
  return requestJson<ModuleHealth>(`/api/modules/${encodePathSegment(id)}`, {}, options)
}

export async function reconnectModule(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<ModuleHealth> {
  return requestJson<ModuleHealth>(`/api/modules/${encodePathSegment(id)}/reconnect`, {
    method: 'POST',
    body: jsonBody(mutationBody({}, meta)),
  }, options)
}

export async function fetchWorkbenchSummary(options?: ApiClientOptions): Promise<WorkbenchSummary> {
  return requestJson<WorkbenchSummary>('/api/workbench/summary', {}, options)
}

export async function fetchConversations(limit?: number, options?: ApiClientOptions): Promise<Conversation[]> {
  return requestJson<Conversation[]>(`/api/conversations${queryString({ limit: limit?.toString() })}`, {}, options)
}

export async function fetchArtifacts(limit?: number, options?: ApiClientOptions): Promise<Artifact[]> {
  return requestJson<Artifact[]>(`/api/artifacts${queryString({ limit: limit?.toString() })}`, {}, options)
}

export async function fetchKnowledgeDocs(params?: KnowledgeDocQuery, options?: ApiClientOptions): Promise<KnowledgeDoc[]> {
  return requestJson<KnowledgeDoc[]>(`/api/knowledge/docs${queryString({ limit: params?.limit?.toString(), pinned: params?.pinned?.toString() })}`, {}, options)
}

export async function pinKnowledgeDoc(id: string, pinned: boolean, meta?: MutationInput, options?: ApiClientOptions): Promise<KnowledgeDoc> {
  return requestJson<KnowledgeDoc>(`/api/knowledge/docs/${encodePathSegment(id)}/pin`, {
    method: 'POST',
    body: jsonBody(mutationBody({ pinned }, meta)),
  }, options)
}

export async function fetchKnowledgeSpaces(options?: ApiClientOptions): Promise<Space[]> {
  return requestJson<Space[]>('/api/knowledge/spaces', {}, options)
}

export async function fetchKnowledgeFiles(params?: KnowledgeFileQuery, options?: ApiClientOptions): Promise<KnowledgeFile[]> {
  const result = await requestJson<KnowledgeFile[] | { data: KnowledgeFile[] }>(`/api/knowledge/files${queryString({ spaceId: params?.spaceId, priority: params?.priority, tag: params?.tag?.join(','), folderId: params?.folderId, sort: params?.sort, page: params?.page?.toString(), limit: params?.limit?.toString() })}`, {}, options); return Array.isArray(result) ? result : result.data
}

export async function updateKnowledgeFile(id: string, input: Partial<Pick<KnowledgeFile, 'spaceId' | 'folderId' | 'title' | 'tags' | 'priority'>>, meta?: MutationInput, options?: ApiClientOptions): Promise<KnowledgeFile> {
  return requestJson<KnowledgeFile>(`/api/knowledge/files/${encodePathSegment(id)}`, { method: 'PATCH', body: jsonBody(mutationBody(input, meta)) }, options)
}

export async function summarizeKnowledgeFile(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<KnowledgeFile> {
  return requestJson<KnowledgeFile>(`/api/knowledge/files/${encodePathSegment(id)}/summarize`, { method: 'POST', body: jsonBody(mutationBody({}, meta)) }, options)
}

export async function fetchKnowledgeErrors(params?: KnowledgeErrorQuery, options?: ApiClientOptions): Promise<ErrorEntry[]> {
  const result = await requestJson<ErrorEntry[] | { data: ErrorEntry[] }>(`/api/knowledge/errors${queryString({ spaceId: params?.spaceId, status: params?.status, severity: params?.severity, sort: params?.sort, page: params?.page?.toString(), limit: params?.limit?.toString() })}`, {}, options); return Array.isArray(result) ? result : result.data
}

export async function updateKnowledgeError(id: string, input: Partial<Pick<ErrorEntry, 'title' | 'solution' | 'status' | 'severity'>>, meta?: MutationInput, options?: ApiClientOptions): Promise<ErrorEntry> {
  return requestJson<ErrorEntry>(`/api/knowledge/errors/${encodePathSegment(id)}`, { method: 'PATCH', body: jsonBody(mutationBody(input, meta)) }, options)
}

export async function fetchKnowledgeConversations(params?: KnowledgeConversationQuery, options?: ApiClientOptions): Promise<KnowledgeConversation[]> {
  const result = await requestJson<KnowledgeConversation[] | { data: KnowledgeConversation[] }>(`/api/knowledge/conversations${queryString({ spaceId: params?.spaceId, tool: params?.tool, hasErrors: params?.hasErrors?.toString(), summarized: params?.summarized?.toString(), page: params?.page?.toString(), limit: params?.limit?.toString() })}`, {}, options); return Array.isArray(result) ? result : result.data
}

export async function searchKnowledge(query: string, params?: { spaceId?: string; limit?: number }, options?: ApiClientOptions) {
  return requestJson<{ type: string; results: unknown[]; total: number }>(`/api/knowledge/search${queryString({ q: query, spaceId: params?.spaceId, limit: params?.limit?.toString() })}`, {}, options)
}

export async function fetchChatModels(options?: ApiClientOptions): Promise<ChatModel[]> { return requestJson<ChatModel[]>('/api/chat/models', {}, options) }
export async function fetchChatSessions(spaceId?: string, options?: ApiClientOptions): Promise<ChatSession[]> { return requestJson<ChatSession[]>(`/api/chat/sessions${queryString({ spaceId })}`, {}, options) }
export async function createChatSession(input: Pick<ChatSession, 'spaceId' | 'model' | 'mode' | 'contexts'>, meta?: MutationInput, options?: ApiClientOptions): Promise<ChatSession> { return requestJson<ChatSession>('/api/chat/sessions', { method: 'POST', body: jsonBody(mutationBody(input, meta)) }, options) }
export async function fetchSkills(options?: ApiClientOptions): Promise<Skill[]> { return requestJson<Skill[]>('/api/skills', {}, options) }
export async function fetchLogs(params?: { includeDebug?: boolean }, options?: ApiClientOptions): Promise<LogEntry[]> { return requestJson<LogEntry[]>(`/api/logs${queryString({ include_debug: params?.includeDebug ? '1' : undefined })}`, {}, options) }
export async function fetchSettings(scope?: string, options?: ApiClientOptions): Promise<SettingsResponse> { return requestJson<SettingsResponse>(`/api/settings${queryString({ scope })}`, {}, options) }
export async function fetchToolConnection(tool: ToolId, options?: ApiClientOptions): Promise<ToolConnection> { return requestJson<ToolConnection>(`/api/tools/${encodePathSegment(tool)}/connection`, {}, options) }
export async function fetchStudioCards(tool: ToolId, options?: ApiClientOptions): Promise<StudioCardModel[]> { return requestJson<StudioCardModel[]>(`/api/studios/${encodePathSegment(tool)}/cards`, {}, options) }
export async function fetchInboxItems(params?: { status?: string }, options?: ApiClientOptions): Promise<InboxItem[]> { return requestJson<InboxItem[]>(`/api/inbox${queryString({ status: params?.status })}`, {}, options) }
export async function createInboxItem(input: CreateInboxItemPayload, meta?: MutationInput, options?: ApiClientOptions): Promise<InboxItem> { return requestJson<InboxItem>('/api/inbox', { method: 'POST', body: jsonBody(mutationBody(input, meta)) }, options) }
export async function acceptInboxItem(id: string, input: AcceptInboxPayload, meta?: MutationInput, options?: ApiClientOptions): Promise<{ id: string; column: string; priority: string; project: string; title: string }> { return requestJson(`/api/inbox/${encodePathSegment(id)}/accept`, { method: 'POST', body: jsonBody(mutationBody(input, meta)) }, options) }
export async function dismissInboxItem(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<InboxItem> { return requestJson<InboxItem>(`/api/inbox/${encodePathSegment(id)}/dismiss`, { method: 'POST', body: jsonBody(mutationBody({}, meta)) }, options) }
export async function fetchUsageRecords(params?: { from?: string; to?: string; tool?: ToolId }, options?: ApiClientOptions): Promise<UsageRecord[]> { return requestJson<UsageRecord[]>(`/api/usage${queryString({ from: params?.from, to: params?.to, tool: params?.tool })}`, {}, options) }
export async function fetchToolTimeStats(params?: { days?: number }, options?: ApiClientOptions): Promise<ToolTimeDay[]> { return requestJson<ToolTimeDay[]>(`/api/usage/time${queryString({ days: params?.days?.toString() })}`, {}, options) }
export async function saveCardAsError(input: SaveAsErrorPayload, meta?: MutationInput, options?: ApiClientOptions): Promise<ErrorEntry> { return requestJson<ErrorEntry>('/api/errors', { method: 'POST', body: jsonBody(mutationBody(input, meta)) }, options) }

export async function summarizeKnowledgeConversation(id: string, meta?: MutationInput, options?: ApiClientOptions): Promise<KnowledgeConversation> {
  return requestJson<KnowledgeConversation>(`/api/knowledge/conversations/${encodePathSegment(id)}/summarize`, { method: 'POST', body: jsonBody(mutationBody({}, meta)) }, options)
}

export async function archiveKnowledgeConversation(id: string, targetSpaceId: string, meta?: MutationInput, options?: ApiClientOptions): Promise<KnowledgeConversation> {
  return requestJson<KnowledgeConversation>(`/api/knowledge/conversations/${encodePathSegment(id)}/archive`, { method: 'POST', body: jsonBody(mutationBody({ targetSpaceId }, meta)) }, options)
}

export async function fetchKnowledgeFolders(params?: KnowledgeFolderQuery, options?: ApiClientOptions): Promise<Folder[]> {
  return requestJson<Folder[]>(`/api/knowledge/folders${queryString({ spaceId: params?.spaceId, parentId: params?.parentId })}`, {}, options)
}

export async function fetchKnowledgeApiKeys(options?: ApiClientOptions): Promise<ApiKey[]> {
  return requestJson<ApiKey[]>('/api/knowledge/api-keys', {}, options)
}

export async function createKnowledgeApiKey(input: { name: string; scopes: ApiKeyScope[]; spaceId?: string }, meta?: MutationInput, options?: ApiClientOptions): Promise<ApiKey> {
  return requestJson<ApiKey>('/api/knowledge/api-keys', { method: 'POST', body: jsonBody(mutationBody(input, meta)) }, options)
}

export async function fetchInspector(type: InspectorType, id: string, options?: ApiClientOptions): Promise<InspectorResponse> {
  return requestJson<InspectorResponse>(`/api/inspector/${encodePathSegment(type)}/${encodePathSegment(id)}`, {}, options)
}

export const apiClientDefaults = {
  actor: DEFAULT_ACTOR,
  projectId: DEFAULT_PROJECT_ID,
  schemaVersion: API_SCHEMA_VERSION,
} as const

export type { Artifact, AuthCallbackRequest, AuthCallbackResponse, AuthRequirement, Conversation, Job, JobAction, JobInputRequirement, JobStatus, KnowledgeDoc, ModuleHealth, ModuleHealthStatus, Task, TaskPriority, TaskStatus, WorkbenchSummary }
