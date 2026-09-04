import { jsonError, readJson, requestIdFrom } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { hashApiKey } from '@/lib/knowledge-security'
import type { NextRequest, NextResponse } from 'next/server'
import type { ApiKeyScope, ApiKeyRecord, ConversationMessage, ErrorEntry, ErrorSeverity, Space } from '@/lib/types/knowledge'
import { ErrorStatus, FilePriority, FileSource, ConversationTool } from '@/lib/types/knowledge'

export type KnowledgeRouteContext<T extends Record<string, string>> = { params: Promise<T> }
export type ParsedBody = { value?: Record<string, unknown>; error?: NextResponse }

export async function parseObject(request: NextRequest): Promise<ParsedBody> {
  const body = await readJson(request)
  if (body.error) return { error: jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestIdFrom(request)) }
  if (!body.value || typeof body.value !== 'object' || Array.isArray(body.value)) return { error: jsonError(request, 400, 'INVALID_REQUEST', '请求体必须是 JSON 对象', false, {}, requestIdFrom(request)) }
  return { value: body.value as Record<string, unknown> }
}

export function requiredString(body: Record<string, unknown>, field: string, max = 10000): string | undefined {
  const value = body[field]
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : undefined
}

export function optionalString(body: Record<string, unknown>, field: string, max = 10000): string | undefined {
  const value = body[field]
  return value === undefined || value === null || value === '' ? undefined : (typeof value === 'string' && value.length <= max ? value.trim() : undefined)
}

export function mutationMeta(body: Record<string, unknown>): { actor: string; clientMutationId: string; projectId?: string } {
  return { actor: typeof body.actor === 'string' && body.actor.trim() ? body.actor.trim() : 'mock-user', clientMutationId: typeof body.clientMutationId === 'string' && body.clientMutationId.trim() ? body.clientMutationId.trim() : crypto.randomUUID(), projectId: optionalString(body, 'projectId', 100) }
}

export function spaceById(id: string): Space | undefined { return getMockStore().knowledgeSpaces.find((space) => space.id === id) }
export function requireSpace(request: NextRequest, spaceId: string | undefined): NextResponse | undefined {
  if (!spaceId || spaceById(spaceId)) return undefined
  return jsonError(request, 404, 'SPACE_NOT_FOUND', '知识库空间不存在', false, { spaceId })
}
export function spaceMismatch(request: NextRequest, expected: string, received?: string): NextResponse | undefined {
  if (!received || received === expected) return undefined
  return jsonError(request, 403, 'SPACE_MISMATCH', '资源不属于指定空间', false, { expectedSpaceId: expected, receivedSpaceId: received })
}

export function requestedSpaceMismatch(request: NextRequest, actualSpaceId: string): NextResponse | undefined {
  const requested = new URL(request.url).searchParams.get('spaceId')?.trim()
  return spaceMismatch(request, actualSpaceId, requested)
}

export function parseBoolean(value: unknown): boolean | undefined { return value === undefined ? undefined : typeof value === 'boolean' ? value : undefined }
export function parseArray<T>(value: unknown): T[] | undefined { return Array.isArray(value) ? value as T[] : undefined }

export function authorizeCollector(request: NextRequest, scope: ApiKeyScope, requestedSpaceId?: string): { record?: ApiKeyRecord; spaceId: string; error?: NextResponse } {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return { spaceId: requestedSpaceId ?? 'space-inbox', error: jsonError(request, 401, 'UNAUTHORIZED', '缺少 Authorization 头', false) }
  const token = auth.slice(7).trim()
  const store = getMockStore()
  const record = store.knowledgeApiKeys.find((key) => key.keyHash === hashApiKey(token) && !key.revokedAt)
  if (!record) return { spaceId: requestedSpaceId ?? 'space-inbox', error: jsonError(request, 401, 'INVALID_API_KEY', 'API Key 无效或已撤销', false) }
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return { record, spaceId: requestedSpaceId ?? record.spaceId ?? 'space-inbox', error: jsonError(request, 401, 'INVALID_API_KEY', 'API Key 已过期', false) }
  if (!record.scopes.includes(scope)) return { record, spaceId: requestedSpaceId ?? record.spaceId ?? 'space-inbox', error: jsonError(request, 403, 'INSUFFICIENT_SCOPE', 'API Key 权限不足', false, { requiredScope: scope }) }
  const headerSpace = requestedSpaceId ?? request.headers.get('x-space-id')?.trim() ?? record.spaceId ?? 'space-inbox'
  if (record.spaceId && record.spaceId !== headerSpace) return { record, spaceId: headerSpace, error: jsonError(request, 403, 'SPACE_MISMATCH', 'API Key 不允许写入此空间', false, { allowedSpaceId: record.spaceId, receivedSpaceId: headerSpace }) }
  if (!spaceById(headerSpace)) return { record, spaceId: headerSpace, error: jsonError(request, 404, 'SPACE_NOT_FOUND', '知识库空间不存在', false, { spaceId: headerSpace }) }
  record.usageCount += 1
  record.lastUsedAt = new Date().toISOString()
  return { record, spaceId: headerSpace }
}

export function errorFromMessage(message: string): string | undefined {
  const match = message.match(/(?:Error|Exception|Failed):[^\n]*/i) ?? message.match(/(?:Cannot|undefined is not)[^\n]*/i)
  return match?.[0]?.trim()
}

export function extractErrors(messages: ConversationMessage[]): string[] { return messages.flatMap((message) => { const error = errorFromMessage(message.content); return error ? [error] : [] }) }

export function upsertError(spaceId: string, errorMessage: string, relatedConversationId?: string): ErrorEntry {
  const store = getMockStore(); const now = new Date().toISOString()
  const existing = store.knowledgeErrors.find((entry) => entry.spaceId === spaceId && entry.errorMessage === errorMessage)
  if (existing) { existing.occurrenceCount += 1; existing.lastOccurredAt = now; if (relatedConversationId) existing.relatedConversationId = relatedConversationId; return existing }
  const created: ErrorEntry = { id: `kerr-${crypto.randomUUID()}`, spaceId, title: errorMessage.slice(0, 80), errorMessage, severity: 'high' as ErrorSeverity, reproductionPath: '自动采集', status: ErrorStatus.UNRESOLVED, occurrenceCount: 1, relatedConversationId, relatedFileIds: [], firstOccurredAt: now, lastOccurredAt: now }
  store.knowledgeErrors.push(created); return created
}

export function normalizeMessages(value: unknown): ConversationMessage[] | undefined {
  if (!Array.isArray(value) || value.length > 1000) return undefined
  const messages = value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)).map((item) => ({ role: item.role, content: item.content, timestamp: item.timestamp }))
  if (messages.length !== value.length || messages.some((item) => (item.role !== 'user' && item.role !== 'assistant') || typeof item.content !== 'string' || typeof item.timestamp !== 'string')) return undefined
  return messages as ConversationMessage[]
}

export const validFileSources = Object.values(FileSource)
export const validPriorities = Object.values(FilePriority)
export const validTools = Object.values(ConversationTool)
