import { NextRequest } from 'next/server'
import { jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { JobStatus } from '@/lib/types/job'
import { ModuleHealthStatus } from '@/lib/types/module'
import { TaskStatus } from '@/lib/types/task'
import type { WorkbenchSummary } from '@/lib/types/common'

export const dynamic = 'force-dynamic'

const terminalJobStatuses = new Set<JobStatus>([JobStatus.SUCCEEDED, JobStatus.CANCELED])

export async function GET(request: NextRequest) {
  const store = getMockStore()
  const attention: WorkbenchSummary['needsAttention'] = []

  for (const module of store.modules) {
    if (module.status !== ModuleHealthStatus.HEALTHY) {
      attention.push({
        type: 'module',
        id: module.id,
        title: `${module.name} 状态异常`,
        message: module.errorMessage ?? module.statusText,
        retryable: module.canReconnect || module.canStart,
      })
    }
  }
  for (const job of store.jobs) {
    if (job.status === JobStatus.FAILED || job.status === JobStatus.STALE) {
      attention.push({
        type: 'job',
        id: job.id,
        title: job.title,
        message: job.errorMessage ?? `Job 状态为 ${job.status}`,
        retryable: job.canRetry,
      })
    }
  }

  const summary: WorkbenchSummary = {
    tasks: {
      total: store.tasks.length,
      open: store.tasks.filter((task) => task.status !== TaskStatus.DONE).length,
      completed: store.tasks.filter((task) => task.status === TaskStatus.DONE).length,
    },
    jobs: {
      total: store.jobs.length,
      active: store.jobs.filter((job) => !terminalJobStatuses.has(job.status)).length,
    },
    modules: {
      total: store.modules.length,
      healthy: store.modules.filter((module) => module.status === ModuleHealthStatus.HEALTHY).length,
      attention: attention.filter((item) => item.type === 'module').length,
    },
    needsAttention: attention,
    recentConversations: [...store.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    recentArtifacts: [...store.artifacts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
  }
  return jsonSuccess(request, summary)
}
