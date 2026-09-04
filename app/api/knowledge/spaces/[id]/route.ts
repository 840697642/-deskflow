import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, jsonSuccess, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { mutationMeta, parseObject, requiredString, KnowledgeRouteContext } from '@/lib/knowledge-api'
import type { Space } from '@/lib/types/knowledge'
export const dynamic = 'force-dynamic'
type Ctx = KnowledgeRouteContext<{ id: string }>
function find(id: string) { return getMockStore().knowledgeSpaces.find((space) => space.id === id) }
function withStats(space: Space): Space { const store = getMockStore(); return { ...space, fileCount: store.knowledgeFiles.filter((file) => file.spaceId === space.id).length, pendingCount: store.knowledgeFiles.filter((file) => file.spaceId === space.id && file.priority === 'pending').length } }

export async function GET(request: NextRequest, context: Ctx) { const { id } = await context.params; const space = find(id); return space ? jsonSuccess(request, withStats(space)) : jsonError(request, 404, 'SPACE_NOT_FOUND', '知识库空间不存在', false, { id }) }

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id } = await context.params; const parsed = await parseObject(request); if (parsed.error) return parsed.error; const body = parsed.value!; const space = find(id); if (!space) return jsonError(request, 404, 'SPACE_NOT_FOUND', '知识库空间不存在', false, { id })
  const name = body.name === undefined ? space.name : requiredString(body, 'name', 100); if (!name) return jsonError(request, 400, 'INVALID_REQUEST', 'name 必须是非空字符串', false)
  const meta = mutationMeta(body); const store = getMockStore(); const key = mutationKey(`knowledge-spaces:update:${id}:${meta.actor}`, meta.clientMutationId); const previous = getMutation(store, key); if (previous) return jsonStoredSuccess(previous.body, previous.status)
  const updated = { ...space, name, icon: body.icon === undefined ? space.icon : typeof body.icon === 'string' ? body.icon : undefined, updatedAt: new Date().toISOString() }; store.knowledgeSpaces[store.knowledgeSpaces.indexOf(space)] = updated; const response = successBody(request, withStats(updated)); saveMutation(store, key, 200, response); return jsonStoredSuccess(response, 200)
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const { id } = await context.params; const space = find(id); if (!space) return jsonError(request, 404, 'SPACE_NOT_FOUND', '知识库空间不存在', false, { id }); const parsed = await parseObject(request); if (parsed.error) return parsed.error; const body = parsed.value!; if (body.confirm !== true) return jsonError(request, 400, 'CONFIRMATION_REQUIRED', '删除空间需要 confirm=true', false)
  const store = getMockStore(); if (store.knowledgeFiles.some((file) => file.spaceId === id) || store.knowledgeErrors.some((entry) => entry.spaceId === id) || store.knowledgeConversations.some((conversation) => conversation.spaceId === id)) return jsonError(request, 409, 'SPACE_NOT_EMPTY', '空间仍包含知识库资源', false, { id })
  store.knowledgeSpaces.splice(store.knowledgeSpaces.indexOf(space), 1); return jsonSuccess(request, { id, deleted: true })
}
