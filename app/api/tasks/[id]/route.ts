import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, jsonSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { validateUpdateTask } from '@/lib/state/validators'
import type { Task } from '@/lib/types/task'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const task = getMockStore().tasks.find((item) => item.id === id)
  if (!task) return jsonError(request, 404, 'TASK_NOT_FOUND', 'Task 不存在', false, { taskId: id })
  return jsonSuccess(request, task)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  const parsed = validateUpdateTask(body.value, requestId)
  if (parsed.error || !parsed.value) {
    return jsonError(request, 400, 'INVALID_REQUEST', parsed.error?.message ?? '请求体无效', false, parsed.error?.details ?? {}, requestId)
  }

  const store = getMockStore()
  const task = store.tasks.find((item) => item.id === id)
  if (!task) return jsonError(request, 404, 'TASK_NOT_FOUND', 'Task 不存在', false, { taskId: id }, requestId)

  const mutationId = parsed.value.clientMutationId ?? requestId
  const actor = parsed.value.actor ?? 'mock-user'
  const key = mutationKey(`tasks:update:${id}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)

  const updated: Task = {
    ...task,
    ...(parsed.value.title === undefined ? {} : { title: parsed.value.title }),
    ...(parsed.value.status === undefined ? {} : { status: parsed.value.status }),
    ...(parsed.value.priority === undefined ? {} : { priority: parsed.value.priority }),
    ...(parsed.value.estimatedTime === undefined ? {} : { estimatedTime: parsed.value.estimatedTime }),
    ...(parsed.value.dueDate === undefined ? {} : { dueDate: parsed.value.dueDate }),
    updatedAt: new Date().toISOString(),
  }
  store.tasks[store.tasks.indexOf(task)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
