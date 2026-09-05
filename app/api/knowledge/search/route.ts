import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { requireSpace } from '@/lib/knowledge-api'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const spaceId = params.get('spaceId')?.trim() || undefined
  const limit = Number(params.get('limit') ?? '20')
  const badSpace = requireSpace(request, spaceId); if (badSpace) return badSpace
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return jsonError(request, 400, 'INVALID_QUERY', 'limit 必须为 1-100 的整数', false)
  const store = getMockStore()
  if (!q) {
    const results = store.knowledgeFiles.filter((file) => !spaceId || file.spaceId === spaceId).sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt)).slice(0, limit).map((file) => ({ ...file, resultType: 'file' as const, matchScore: 0 }))
    return jsonSuccess(request, { type: 'recent' as const, results, total: results.length })
  }
  const files = store.knowledgeFiles.filter((file) => (!spaceId || file.spaceId === spaceId) && [file.title, file.content, ...file.tags].some((value) => value.toLowerCase().includes(q))).map((file) => ({ ...file, resultType: 'file' as const, matchScore: file.title.toLowerCase().includes(q) ? 10 : 5 }))
  const errors = store.knowledgeErrors.filter((entry) => (!spaceId || entry.spaceId === spaceId) && [entry.title, entry.errorMessage, entry.signature].some((value) => value.toLowerCase().includes(q))).map((entry) => ({ ...entry, resultType: 'error' as const, matchScore: entry.title.toLowerCase().includes(q) ? 10 : 5 }))
  const conversations = store.knowledgeConversations.filter((conversation) => (!spaceId || conversation.spaceId === spaceId) && [conversation.title, conversation.summary?.content ?? '', ...(conversation.summary?.keyPoints ?? [])].some((value) => value.toLowerCase().includes(q))).map(({ messages, ...conversation }) => ({ ...conversation, messagePreview: messages[0]?.content.slice(0, 100), resultType: 'conversation' as const, matchScore: conversation.title.toLowerCase().includes(q) ? 10 : 5 }))
  const all = [...files, ...errors, ...conversations].sort((a, b) => b.matchScore - a.matchScore).slice(0, limit)
  return jsonSuccess(request, { type: 'search' as const, results: all, total: all.length, breakdown: { files: files.length, errors: errors.length, conversations: conversations.length } })
}
