import { JobStatus, type Job, type JobAction } from '@/lib/types/job'

export const jobStateTransitions: Record<JobStatus, readonly JobStatus[]> = {
  [JobStatus.QUEUED]: [JobStatus.STARTING, JobStatus.CANCELED],
  [JobStatus.STARTING]: [JobStatus.RUNNING, JobStatus.FAILED],
  [JobStatus.RUNNING]: [
    JobStatus.PAUSED,
    JobStatus.SUCCEEDED,
    JobStatus.FAILED,
    JobStatus.WAITING_FOR_DEPENDENCY,
    JobStatus.CANCELED,
  ],
  [JobStatus.PAUSED]: [JobStatus.QUEUED, JobStatus.CANCELED],
  [JobStatus.WAITING]: [JobStatus.QUEUED, JobStatus.CANCELED],
  [JobStatus.WAITING_FOR_INPUT]: [JobStatus.QUEUED, JobStatus.CANCELED],
  [JobStatus.WAITING_FOR_DEPENDENCY]: [JobStatus.QUEUED, JobStatus.CANCELED],
  [JobStatus.FAILED]: [JobStatus.QUEUED, JobStatus.CANCELED],
  [JobStatus.SUCCEEDED]: [],
  [JobStatus.CANCELED]: [],
  [JobStatus.STALE]: [JobStatus.QUEUED, JobStatus.CANCELED],
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return jobStateTransitions[from].includes(to)
}

export function getAvailableActions(status: JobStatus): JobAction[] {
  switch (status) {
    case JobStatus.RUNNING:
      return ['pause', 'cancel']
    case JobStatus.PAUSED:
      return ['resume', 'cancel']
    case JobStatus.QUEUED:
    case JobStatus.STARTING:
    case JobStatus.WAITING:
    case JobStatus.WAITING_FOR_INPUT:
    case JobStatus.WAITING_FOR_DEPENDENCY:
      return ['cancel']
    case JobStatus.FAILED:
      return ['retry', 'cancel']
    case JobStatus.STALE:
      return ['resume', 'retry', 'cancel']
    default:
      return []
  }
}

export function targetStatusForAction(job: Job, action: JobAction): JobStatus | null {
  if (action === 'pause' && job.status === JobStatus.RUNNING) return JobStatus.PAUSED
  if (action === 'resume' && [JobStatus.PAUSED, JobStatus.STALE].includes(job.status)) return JobStatus.QUEUED
  if (
    action === 'cancel' &&
    [
      JobStatus.QUEUED,
      JobStatus.STARTING,
      JobStatus.RUNNING,
      JobStatus.PAUSED,
      JobStatus.WAITING,
      JobStatus.WAITING_FOR_INPUT,
      JobStatus.WAITING_FOR_DEPENDENCY,
      JobStatus.FAILED,
      JobStatus.STALE,
    ].includes(job.status)
  ) {
    return JobStatus.CANCELED
  }
  if (action === 'retry' && [JobStatus.FAILED, JobStatus.STALE].includes(job.status) && job.canRetry) {
    return JobStatus.QUEUED
  }
  return null
}

export function transitionJob(job: Job, nextStatus: JobStatus, now: string): Job {
  if (!canTransition(job.status, nextStatus)) {
    throw new Error(`Invalid transition: ${job.status} -> ${nextStatus}`)
  }

  const nextJob: Job = {
    ...job,
    status: nextStatus,
    lastHeartbeat: now,
    updatedAt: now,
    logs: [...job.logs, `JobStatusChanged:${nextStatus}`],
  }

  if (nextStatus === JobStatus.CANCELED || nextStatus === JobStatus.SUCCEEDED) {
    nextJob.completedAt = now
  }

  if (nextStatus === JobStatus.QUEUED) {
    nextJob.errorMessage = undefined
    nextJob.errorId = undefined
  }

  return nextJob
}
