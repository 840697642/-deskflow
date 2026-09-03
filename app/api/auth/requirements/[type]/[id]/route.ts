import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess, requestIdFrom } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { JobStatus } from '@/lib/types/job'
import { ModuleHealthStatus } from '@/lib/types/module'
import type { AuthRequirement } from '@/lib/types/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await context.params
  const requestId = requestIdFrom(request)
  if (type !== 'job' && type !== 'service') return jsonError(request, 400, 'INVALID_REQUEST', 'type 必须是 job 或 service', false, { type }, requestId)
  const store = getMockStore()
  if (type === 'job') {
    const job = store.jobs.find((item) => item.id === id)
    if (!job) return jsonError(request, 404, 'RESOURCE_NOT_FOUND', '授权资源不存在', false, { type, id }, requestId)
    const auth = job.metadata?.authRequired
    if (job.status !== JobStatus.WAITING_AUTH || !auth) return jsonError(request, 400, 'AUTH_NOT_REQUIRED', '该 Job 当前不需要授权', false, { id, status: job.status }, requestId)
    const requirement: AuthRequirement = { id, type: 'job', title: job.title, ...auth, authUrl: `http://localhost:3000/auth/mock?provider=${encodeURIComponent(auth.provider)}&target=job%3A${encodeURIComponent(id)}` }
    return jsonSuccess(request, requirement, { requestId })
  }
  const module = store.modules.find((item) => item.id === id)
  if (!module) return jsonError(request, 404, 'RESOURCE_NOT_FOUND', '授权资源不存在', false, { type, id }, requestId)
  const auth = module.metadata?.authRequired
  if (module.status !== ModuleHealthStatus.PERMISSION_REQUIRED || !auth) return jsonError(request, 400, 'AUTH_NOT_REQUIRED', '该服务当前不需要授权', false, { id, status: module.status }, requestId)
  const requirement: AuthRequirement = { id, type: 'service', title: module.name, ...auth, authUrl: `http://localhost:3000/auth/mock?provider=${encodeURIComponent(auth.provider)}&target=service%3A${encodeURIComponent(id)}` }
  return jsonSuccess(request, requirement, { requestId })
}
