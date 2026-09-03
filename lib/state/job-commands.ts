import { targetStatusForAction, transitionJob } from '@/lib/state/job-state-machine'
import { JobStatus, type Job, type JobAction } from '@/lib/types/job'

export interface JobCommandFailure {
  code: string
  message: string
  retryable: boolean
  details: Record<string, unknown>
}

export function applyJobAction(job: Job, action: JobAction, now: string): { job?: Job; error?: JobCommandFailure } {
  if (action === 'retry' && !job.canRetry) {
    return {
      error: {
        code: 'JOB_NOT_RETRYABLE',
        message: '该 Job 不允许重试',
        retryable: false,
        details: { jobId: job.id, status: job.status },
      },
    }
  }

  const nextStatus = targetStatusForAction(job, action)
  if (!nextStatus) {
    return {
      error: {
        code: 'INVALID_STATE_TRANSITION',
        message: `当前状态 ${job.status} 不支持操作 ${action}`,
        retryable: false,
        details: { jobId: job.id, status: job.status, action },
      },
    }
  }

  const nextJob = transitionJob(job, nextStatus, now)
  if (action === 'resume') {
    nextJob.logs = [...nextJob.logs, 'ResumeRequested']
  }
  if (action === 'retry') {
    nextJob.logs = [...nextJob.logs, 'RetryRequested']
    nextJob.progress = 0
    nextJob.startedAt = undefined
    nextJob.completedAt = undefined
  }
  if (nextStatus === JobStatus.CANCELED) {
    nextJob.eta = undefined
  }
  return { job: nextJob }
}
