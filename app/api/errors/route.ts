import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { errorSignature, parseObject, requiredString } from '@/lib/knowledge-api'
import { ErrorSeverity, ErrorStatus, type ErrorEntry } from '@/lib/types/knowledge'
import type { ToolId } from '@/lib/types/creation-tools'

const spaces: Record<ToolId, string> = { video: 'space-ai-video', game: 'space-game-dev', app: 'space-app-dev' }
export async function POST(request: NextRequest) {
  const parsed = await parseObject(request); if (parsed.error) return parsed.error
  const body = parsed.value!; const toolId = body.toolId as ToolId; const title = requiredString(body, 'title', 200); const cardId = requiredString(body, 'cardId', 200)
  if (!spaces[toolId] || !title || !cardId) return jsonError(request, 400, 'INVALID_INPUT', 'toolId、title、cardId 为必填项', false)
  const store = getMockStore(); const source = typeof body.refUrl === 'string' ? body.refUrl : `trimode://${toolId}/card/${cardId}`; const signature = errorSignature(title); const now = new Date().toISOString(); const existing = store.knowledgeErrors.find((entry) => entry.spaceId === spaces[toolId] && entry.signature === signature)
  if (existing) { existing.occurrenceCount += 1; existing.lastOccurredAt = now; existing.contexts.push({ message: title, reproductionPath: source, occurredAt: now }); return jsonSuccess(request, existing) }
  const entry: ErrorEntry = { id: `kerr-${crypto.randomUUID()}`, spaceId: spaces[toolId], title, errorMessage: title, signature, severity: ErrorSeverity.HIGH, reproductionPath: source, status: ErrorStatus.UNRESOLVED, occurrenceCount: 1, contexts: [{ message: title, reproductionPath: source, occurredAt: now }], relatedFileIds: [], firstOccurredAt: now, lastOccurredAt: now }; store.knowledgeErrors.push(entry); return jsonSuccess(request, entry, { status: 201 })
}
