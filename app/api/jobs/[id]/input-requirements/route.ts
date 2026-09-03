import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess, requestIdFrom } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { JobStatus, type JobInputRequirement } from '@/lib/types/job'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const requestId = requestIdFrom(request)
  const job = getMockStore().jobs.find((item) => item.id === id)
  if (!job) return jsonError(request, 404, 'JOB_NOT_FOUND', 'Job 不存在', false, { jobId: id }, requestId)
  if (job.status !== JobStatus.WAITING_INPUT || !job.metadata?.inputRequired) {
    return jsonError(request, 400, 'JOB_NOT_WAITING_INPUT', 'Job 当前不需要输入', false, { jobId: id, status: job.status }, requestId)
  }
  const requirement: JobInputRequirement = { jobId: id, ...job.metadata.inputRequired }
  return jsonSuccess(request, requirement, { requestId })
}
