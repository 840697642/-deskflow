import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { parseLimit } from '@/lib/api/query'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = parseLimit(searchParams.get('limit'))
  if (typeof limit === 'object') return jsonError(request, 400, 'INVALID_QUERY', limit.message, false, limit.details)
  const pinnedValue = searchParams.get('pinned')
  if (pinnedValue !== null && pinnedValue !== 'true' && pinnedValue !== 'false') {
    return jsonError(request, 400, 'INVALID_QUERY', 'pinned 必须是 true 或 false', false, { field: 'pinned', received: pinnedValue })
  }
  const pinned = pinnedValue === null ? undefined : pinnedValue === 'true'
  const docs = getMockStore().knowledgeDocs.filter((doc) => pinned === undefined || doc.pinned === pinned).slice(0, limit)
  return jsonSuccess(request, docs, { total: docs.length })
}
