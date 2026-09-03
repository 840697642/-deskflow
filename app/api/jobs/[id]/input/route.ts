import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { JobStatus, type JobInputRequirement } from '@/lib/types/job'
import { isRecord, parseMutationMetadata } from '@/lib/state/validators'

export const dynamic = 'force-dynamic'

function validateValue(value: string, requirement: JobInputRequirement): string | undefined {
  const validation = requirement.validation
  if (!validation) return undefined
  if (validation.required && value.trim().length === 0) return '输入值不能为空'
  if (validation.minLength !== undefined && value.length < validation.minLength) return `输入值长度不能少于 ${validation.minLength} 个字符`
  if (validation.maxLength !== undefined && value.length > validation.maxLength) return `输入值长度不能超过 ${validation.maxLength} 个字符`
  if (validation.pattern) {
    try {
      if (!new RegExp(validation.pattern).test(value)) return '输入值格式不符合要求'
    } catch {
      return '输入要求中的 pattern 无效'
    }
  }
  if (requirement.type === 'select' && requirement.options && !requirement.options.includes(value)) return '输入值不在可选范围内'
  if (requirement.type === 'number' && value.trim() !== '' && !Number.isFinite(Number(value))) return '输入值必须是数字'
  return undefined
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  if (!isRecord(body.value) || typeof body.value.value !== 'string') {
    return jsonError(request, 400, 'INVALID_REQUEST', 'value 必须是字符串', false, { field: 'value' }, requestId)
  }
  const metadata = parseMutationMetadata(body.value, requestId)
  if (metadata.error || !metadata.value) return jsonError(request, 400, 'INVALID_REQUEST', metadata.error?.message ?? '请求元数据无效', false, metadata.error?.details ?? {}, requestId)

  const store = getMockStore()
  const job = store.jobs.find((item) => item.id === id)
  if (!job) return jsonError(request, 404, 'JOB_NOT_FOUND', 'Job 不存在', false, { jobId: id }, requestId)
  if (metadata.value.projectId && job.projectId && metadata.value.projectId !== job.projectId) {
    return jsonError(request, 403, 'PROJECT_MISMATCH', 'Job 不属于指定项目', false, { jobId: id, projectId: metadata.value.projectId }, requestId)
  }
  if (job.status !== JobStatus.WAITING_INPUT || !job.metadata?.inputRequired) {
    return jsonError(request, 400, 'JOB_NOT_WAITING_INPUT', 'Job 当前不需要输入', false, { jobId: id, status: job.status }, requestId)
  }
  const value = body.value.value
  const validationError = validateValue(value, { jobId: id, ...job.metadata.inputRequired })
  if (validationError) return jsonError(request, 400, 'INVALID_INPUT_VALUE', validationError, false, { jobId: id }, requestId)

  const actor = metadata.value.actor ?? 'mock-user'
  const mutationId = metadata.value.clientMutationId ?? requestId
  const key = mutationKey(`jobs:input:${id}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)
  const now = new Date().toISOString()
  const updated = {
    ...job,
    status: JobStatus.RUNNING,
    eta: undefined,
    updatedAt: now,
    lastHeartbeat: now,
    logs: [...job.logs, `UserInputSubmitted:${value}`],
    metadata: { ...job.metadata, userInput: value },
  }
  store.jobs[store.jobs.indexOf(job)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
