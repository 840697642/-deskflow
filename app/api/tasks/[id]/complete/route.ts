import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { isRecord, parseMutationMetadata } from '@/lib/state/validators'
import { TaskStatus, type Task } from '@/lib/types/task'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  if (!isRecord(body.value)) return jsonError(request, 400, 'INVALID_REQUEST', '请求体必须是 JSON 对象', false, {}, requestId)
  const metadata = parseMutationMetadata(body.value, requestId)
  if (metadata.error) return jsonError(request, 400, 'INVALID_REQUEST', metadata.error.message, false, metadata.error.details, requestId)

  const store = getMockStore()
  const task = store.tasks.find((item) => item.id === id)
  if (!task) return jsonError(request, 404, 'TASK_NOT_FOUND', 'Task 不存在', false, { taskId: id }, requestId)

  const actor = metadata.value.actor ?? 'mock-user'
  const mutationId = metadata.value.clientMutationId ?? requestId
  const key = mutationKey(`tasks:complete:${id}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)

  const updated: Task = { ...task, status: TaskStatus.DONE, updatedAt: new Date().toISOString() }
  store.tasks[store.tasks.indexOf(task)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
