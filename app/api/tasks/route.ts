import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, jsonSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { parseTaskStatus } from '@/lib/api/query'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { validateCreateTask } from '@/lib/state/validators'
import { TaskPriority, TaskStatus, type Task } from '@/lib/types/task'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = parseTaskStatus(searchParams.get('status'))
  if (typeof status === 'object') {
    return jsonError(request, 400, 'INVALID_QUERY', status.message, false, status.details)
  }

  const projectId = searchParams.get('projectId')?.trim()
  const store = getMockStore()
  const tasks = store.tasks.filter((task) => {
    if (status !== undefined && task.status !== status) return false
    if (projectId && task.projectId !== projectId) return false
    return true
  })
  return jsonSuccess(request, tasks, { total: tasks.length })
}

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)

  const parsed = validateCreateTask(body.value, requestId)
  if (parsed.error || !parsed.value) {
    return jsonError(request, 400, 'INVALID_REQUEST', parsed.error?.message ?? '请求体无效', false, parsed.error?.details ?? {}, requestId)
  }

  const store = getMockStore()
  const mutationId = parsed.value.clientMutationId ?? requestId
  const actor = parsed.value.actor ?? 'mock-user'
  const key = mutationKey(`tasks:create:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) {
    return jsonStoredSuccess(previous.body, previous.status)
  }

  const now = new Date().toISOString()
  const task: Task = {
    id: `task-${crypto.randomUUID()}`,
    title: parsed.value.title,
    status: TaskStatus.TODO,
    priority: parsed.value.priority ?? TaskPriority.MEDIUM,
    module: parsed.value.module,
    estimatedTime: parsed.value.estimatedTime ?? '30 分钟',
    projectId: parsed.value.projectId,
    createdAt: now,
    updatedAt: now,
    dueDate: parsed.value.dueDate,
  }
  store.tasks.push(task)
  const responseBody = successBody(request, task, { status: 201, requestId })
  saveMutation(store, key, 201, responseBody)
  return jsonStoredSuccess(responseBody, 201)
}
