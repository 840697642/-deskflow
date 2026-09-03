import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { isRecord, parseMutationMetadata } from '@/lib/state/validators'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  if (!isRecord(body.value) || typeof body.value.pinned !== 'boolean') return jsonError(request, 400, 'INVALID_REQUEST', 'pinned 必须是布尔值', false, { field: 'pinned' }, requestId)
  const metadata = parseMutationMetadata(body.value, requestId)
  if (metadata.error || !metadata.value) return jsonError(request, 400, 'INVALID_REQUEST', metadata.error?.message ?? '请求元数据无效', false, metadata.error?.details ?? {}, requestId)
  const store = getMockStore()
  const doc = store.knowledgeDocs.find((item) => item.id === id)
  if (!doc) return jsonError(request, 404, 'DOC_NOT_FOUND', '知识库文档不存在', false, { id }, requestId)
  const actor = metadata.value.actor ?? 'mock-user'
  const mutationId = metadata.value.clientMutationId ?? requestId
  const key = mutationKey(`knowledge-docs:pin:${id}:${actor}:${body.value.pinned}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)
  const updated = { ...doc, pinned: body.value.pinned, updatedAt: new Date().toISOString() }
  store.knowledgeDocs[store.knowledgeDocs.indexOf(doc)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
