import type { MutationMetadata } from './common'

export enum JobStatus {
  QUEUED = 'queued',
  STARTING = 'starting',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING = 'waiting',
  WAITING_INPUT = 'waiting_input',
  WAITING_FOR_DEPENDENCY = 'waiting_for_dependency',
  WAITING_AUTH = 'waiting_auth',
  FAILED = 'failed',
  SUCCEEDED = 'succeeded',
  CANCELED = 'canceled',
  STALE = 'stale',
}

export type InputType = 'text' | 'select' | 'number' | 'file'

export interface InputValidation {
  required: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
}

export interface JobInputRequirement {
  jobId: string
  prompt: string
  type: InputType
  options?: string[]
  placeholder?: string
  defaultValue?: string
  validation?: InputValidation
}

export interface JobInputMetadata {
  inputRequired?: Omit<JobInputRequirement, 'jobId'>
  userInput?: string
}

export interface JobAuthMetadata {
  authRequired?: {
    provider: string
    requiredScopes: string[]
    description: string
  }
  authCompleted?: {
    provider: string
    completedAt: string
  }
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
  metadata?: JobInputMetadata & JobAuthMetadata
}

export interface JobControlRequest extends MutationMetadata {
  action: JobAction
  jobId?: string
}

export interface SubmitInputRequest extends MutationMetadata {
  value: string
}
