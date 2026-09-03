import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { applyJobAction } from '@/lib/state/job-commands'
import { validateJobControl, isRecord } from '@/lib/state/validators'
import type { JobAction } from '@/lib/types/job'

export async function handleJobAction(request: NextRequest, id: string, forcedAction?: JobAction) {
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)

  const input = forcedAction
    ? { ...(isRecord(body.value) ? body.value : {}), action: forcedAction }
    : body.value
  const parsed = validateJobControl(input, requestId)
  if (parsed.error || !parsed.value) {
    return jsonError(request, 400, 'INVALID_REQUEST', parsed.error?.message ?? '请求体无效', false, parsed.error?.details ?? {}, requestId)
  }

  const store = getMockStore()
  const job = store.jobs.find((item) => item.id === id)
  if (!job) return jsonError(request, 404, 'JOB_NOT_FOUND', 'Job 不存在', false, { jobId: id }, requestId)
  if (parsed.value.projectId && job.projectId && parsed.value.projectId !== job.projectId) {
    return jsonError(request, 403, 'PROJECT_MISMATCH', 'Job 不属于指定项目', false, { jobId: id, projectId: parsed.value.projectId }, requestId)
  }

  const actor = parsed.value.actor ?? 'mock-user'
  const mutationId = parsed.value.clientMutationId ?? requestId
  const key = mutationKey(`jobs:${id}:${parsed.value.action}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)

  const result = applyJobAction(job, parsed.value.action, new Date().toISOString())
  if (result.error) {
    const status = result.error.code === 'JOB_NOT_RETRYABLE' ? 409 : 409
    return jsonError(request, status, result.error.code, result.error.message, result.error.retryable, result.error.details, requestId)
  }

  const updated = result.job
  if (!updated) return jsonError(request, 500, 'JOB_UPDATE_FAILED', 'Job 更新失败', true, { jobId: id }, requestId)
  store.jobs[store.jobs.indexOf(job)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
