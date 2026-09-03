import { NextRequest } from 'next/server'
import { handleJobAction } from '@/lib/api/job-actions'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const job = getMockStore().jobs.find((item) => item.id === id)
  if (!job) return jsonError(request, 404, 'JOB_NOT_FOUND', 'Job 不存在', false, { jobId: id })
  return jsonSuccess(request, job)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  return handleJobAction(request, id)
}
