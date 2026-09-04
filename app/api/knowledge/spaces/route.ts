import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, jsonSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { mutationMeta, parseObject, requiredString, spaceById } from '@/lib/knowledge-api'
import { SpaceType, type Space } from '@/lib/types/knowledge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const spaces = getMockStore().knowledgeSpaces.map((space) => ({ ...space, fileCount: getMockStore().knowledgeFiles.filter((file) => file.spaceId === space.id).length, pendingCount: getMockStore().knowledgeFiles.filter((file) => file.spaceId === space.id && file.priority === 'pending').length }))
  return jsonSuccess(request, spaces, { total: spaces.length })
}

export async function POST(request: NextRequest) {
  const parsed = await parseObject(request); if (parsed.error) return parsed.error; const body = parsed.value!; const name = requiredString(body, 'name', 100)
  const type = body.type === undefined ? SpaceType.GENERAL : body.type
  if (!name || !Object.values(SpaceType).includes(type as SpaceType)) return jsonError(request, 400, 'INVALID_REQUEST', 'name 和有效的 type 为必填项', false)
  const meta = mutationMeta(body); const store = getMockStore(); const key = mutationKey(`knowledge-spaces:create:${meta.actor}`, meta.clientMutationId); const previous = getMutation(store, key); if (previous) return jsonStoredSuccess(previous.body, previous.status)
  const now = new Date().toISOString(); const space: Space = { id: `space-${crypto.randomUUID()}`, name, type: type as SpaceType, fileCount: 0, pendingCount: 0, icon: typeof body.icon === 'string' ? body.icon : undefined, createdAt: now, updatedAt: now }
  store.knowledgeSpaces.push(space); const response = successBody(request, space, { status: 201 }); saveMutation(store, key, 201, response); return jsonStoredSuccess(response, 201)
}
