import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { JobStatus } from '@/lib/types/job'
import { ModuleHealthStatus } from '@/lib/types/module'
import { isRecord, parseMutationMetadata } from '@/lib/state/validators'
import type { AuthCallbackResponse } from '@/lib/types/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  if (!isRecord(body.value) || (body.value.type !== 'job' && body.value.type !== 'service') || typeof body.value.id !== 'string' || typeof body.value.code !== 'string' || typeof body.value.provider !== 'string') {
    return jsonError(request, 400, 'INVALID_REQUEST', 'type、id、code、provider 为必填字段', false, {}, requestId)
  }
  if (body.value.code.trim().length === 0 || body.value.code === 'invalid') return jsonError(request, 400, 'INVALID_AUTH_CODE', '授权码无效', false, {}, requestId)
  const metadata = parseMutationMetadata(body.value, requestId)
  if (metadata.error || !metadata.value) return jsonError(request, 400, 'INVALID_REQUEST', metadata.error?.message ?? '请求元数据无效', false, metadata.error?.details ?? {}, requestId)
  const store = getMockStore()
  const type = body.value.type
  const id = body.value.id
  const actor = metadata.value.actor ?? 'mock-user'
  const mutationId = metadata.value.clientMutationId ?? requestId
  const key = mutationKey(`auth:${type}:${id}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)
  const now = new Date().toISOString()
  let message: string
  if (type === 'job') {
    const job = store.jobs.find((item) => item.id === id)
    if (!job) return jsonError(request, 404, 'RESOURCE_NOT_FOUND', '授权资源不存在', false, { type, id }, requestId)
    if (metadata.value.projectId && job.projectId && metadata.value.projectId !== job.projectId) {
      return jsonError(request, 403, 'PROJECT_MISMATCH', '授权 Job 不属于指定项目', false, { id, projectId: metadata.value.projectId }, requestId)
    }
    const auth = job.metadata?.authRequired
    if (job.status !== JobStatus.WAITING_AUTH || !auth) return jsonError(request, 400, 'AUTH_NOT_REQUIRED', '该 Job 当前不需要授权', false, { id, status: job.status }, requestId)
    if (auth.provider !== body.value.provider) return jsonError(request, 400, 'INVALID_AUTH_CODE', '授权 provider 不匹配', false, { expected: auth.provider, received: body.value.provider }, requestId)
    const updated = { ...job, status: JobStatus.RUNNING, updatedAt: now, lastHeartbeat: now, metadata: { ...job.metadata, authCompleted: { provider: body.value.provider, completedAt: now } } }
    store.jobs[store.jobs.indexOf(job)] = updated
    message = `${body.value.provider} 授权成功，任务已继续`
  } else {
    const module = store.modules.find((item) => item.id === id)
    if (!module) return jsonError(request, 404, 'RESOURCE_NOT_FOUND', '授权资源不存在', false, { type, id }, requestId)
    const auth = module.metadata?.authRequired
    if (module.status !== ModuleHealthStatus.PERMISSION_REQUIRED || !auth) return jsonError(request, 400, 'AUTH_NOT_REQUIRED', '该服务当前不需要授权', false, { id, status: module.status }, requestId)
    if (auth.provider !== body.value.provider) return jsonError(request, 400, 'INVALID_AUTH_CODE', '授权 provider 不匹配', false, { expected: auth.provider, received: body.value.provider }, requestId)
    store.modules[store.modules.indexOf(module)] = { ...module, status: ModuleHealthStatus.HEALTHY, statusText: '已授权 · 刚刚', errorMessage: undefined, metadata: { ...module.metadata, authCompleted: { provider: body.value.provider, completedAt: now } } }
    message = `${body.value.provider} 授权成功，服务已恢复`
  }
  const response: AuthCallbackResponse = { success: true, message }
  const responseBody = successBody(request, response, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
