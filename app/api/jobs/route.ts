import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { parseJobStatus } from '@/lib/api/query'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = parseJobStatus(searchParams.get('status'))
  if (typeof status === 'object') {
    return jsonError(request, 400, 'INVALID_QUERY', status.message, false, status.details)
  }
  const module = searchParams.get('module')?.trim()
  const store = getMockStore()
  const jobs = store.jobs.filter((job) => {
    if (status !== undefined && job.status !== status) return false
    if (module && job.module !== module) return false
    return true
  })
  return jsonSuccess(request, jobs, { total: jobs.length })
}
