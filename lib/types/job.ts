import type { MutationMetadata } from './common'

export enum JobStatus {
  QUEUED = 'queued',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING = 'waiting',
  WAITING_FOR_INPUT = 'waiting_for_input',
  WAITING_FOR_DEPENDENCY = 'waiting_for_dependency',
  FAILED = 'failed',
  SUCCEEDED = 'succeeded',
  CANCELED = 'canceled',
  STALE = 'stale',
}

export type JobAction = 'pause' | 'resume' | 'cancel' | 'retry'

export interface Job {
  id: string
  title: string
  type: string
  status: JobStatus
  progress: number
  eta?: string
  startedAt?: string
  completedAt?: string
  lastHeartbeat: string
  updatedAt: string
  module: string
  projectId?: string
  errorMessage?: string
  errorId?: string
  canRetry: boolean
  logs: string[]
}

export interface JobControlRequest extends MutationMetadata {
  action: JobAction
  jobId?: string
}
