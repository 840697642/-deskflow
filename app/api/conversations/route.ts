import { NextRequest } from 'next/server'
import { parseLimit } from '@/lib/api/query'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get('limit'))
  if (typeof limit === 'object') return jsonError(request, 400, 'INVALID_QUERY', limit.message, false, limit.details)
  const conversations = [...getMockStore().conversations]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
  return jsonSuccess(request, conversations, { total: conversations.length })
}
