import {
  API_SCHEMA_VERSION,
  type MutationMetadata,
} from '@/lib/types/common'
import {
  JobStatus,
  type JobAction,
  type JobControlRequest,
} from '@/lib/types/job'
import {
  TaskPriority,
  TaskStatus,
  type CreateTaskRequest,
  type UpdateTaskRequest,
} from '@/lib/types/task'
import type { ReconnectModuleRequest } from '@/lib/types/module'

export interface ValidationFailure {
  message: string
  details: Record<string, unknown>
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string, maxLength = 200): string | ValidationFailure {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      message: `${field} 必须是非空字符串`,
      details: { field, reason: 'required' },
    }
  }
  if (value.trim().length > maxLength) {
    return {
      message: `${field} 长度不能超过 ${maxLength} 个字符`,
      details: { field, reason: 'too_long', maxLength },
    }
  }
  return value.trim()
}

function optionalString(value: unknown, field: string, maxLength = 200): string | undefined | ValidationFailure {
  if (value === undefined || value === null || value === '') return undefined
  return requiredString(value, field, maxLength)
}

function enumValue<T extends string>(value: unknown, values: readonly T[], field: string): T | undefined | ValidationFailure {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'string' && values.includes(value as T)) return value as T
  return {
    message: `${field} 不是有效值`,
    details: { field, allowed: values },
  }
}

export function parseMutationMetadata(
  input: Record<string, unknown>,
  fallbackClientMutationId: string,
): { value: MutationMetadata; error?: ValidationFailure } {
  const actor = optionalString(input.actor, 'actor', 100)
  if (typeof actor === 'object') return { value: {}, error: actor }

  const clientMutationId = optionalString(input.clientMutationId, 'clientMutationId', 200)
  if (typeof clientMutationId === 'object') return { value: {}, error: clientMutationId }

  const schemaVersion = optionalString(input.schemaVersion, 'schemaVersion', 20)
  if (typeof schemaVersion === 'object') return { value: {}, error: schemaVersion }
  if (schemaVersion !== undefined && schemaVersion !== API_SCHEMA_VERSION) {
    return {
      value: {},
      error: {
        message: `schemaVersion 必须为 ${API_SCHEMA_VERSION}`,
        details: { field: 'schemaVersion', expected: API_SCHEMA_VERSION, received: schemaVersion },
      },
    }
  }

  const projectId = optionalString(input.projectId, 'projectId', 100)
  if (typeof projectId === 'object') return { value: {}, error: projectId }

  return {
    value: {
      actor: actor ?? 'mock-user',
      clientMutationId: clientMutationId ?? fallbackClientMutationId,
      schemaVersion: schemaVersion ?? API_SCHEMA_VERSION,
      projectId,
    },
  }
}

export function validateCreateTask(input: unknown, fallbackClientMutationId: string): { value?: CreateTaskRequest; error?: ValidationFailure } {
  if (!isRecord(input)) {
    return { error: { message: '请求体必须是 JSON 对象', details: { body: 'object_required' } } }
  }
  const title = requiredString(input.title, 'title')
  if (typeof title === 'object') return { error: title }
  const module = requiredString(input.module, 'module', 100)
  if (typeof module === 'object') return { error: module }
  const priority = enumValue(input.priority, Object.values(TaskPriority), 'priority')
  if (typeof priority === 'object') return { error: priority }
  const estimatedTime = optionalString(input.estimatedTime, 'estimatedTime', 50)
  if (typeof estimatedTime === 'object') return { error: estimatedTime }
  const projectId = optionalString(input.projectId, 'projectId', 100)
  if (typeof projectId === 'object') return { error: projectId }
  const dueDate = optionalString(input.dueDate, 'dueDate', 50)
  if (typeof dueDate === 'object') return { error: dueDate }
  const metadata = parseMutationMetadata(input, fallbackClientMutationId)
  if (metadata.error) return { error: metadata.error }

  return {
    value: {
      title,
      module,
      priority: priority ?? TaskPriority.MEDIUM,
      estimatedTime: estimatedTime ?? '30 分钟',
      projectId: projectId ?? metadata.value.projectId,
      dueDate,
      ...metadata.value,
    },
  }
}

export function validateUpdateTask(input: unknown, fallbackClientMutationId: string): { value?: UpdateTaskRequest; error?: ValidationFailure } {
  if (!isRecord(input)) {
    return { error: { message: '请求体必须是 JSON 对象', details: { body: 'object_required' } } }
  }
  const title = optionalString(input.title, 'title')
  if (typeof title === 'object') return { error: title }
  const status = enumValue(input.status, Object.values(TaskStatus), 'status')
  if (typeof status === 'object') return { error: status }
  const priority = enumValue(input.priority, Object.values(TaskPriority), 'priority')
  if (typeof priority === 'object') return { error: priority }
  const estimatedTime = optionalString(input.estimatedTime, 'estimatedTime', 50)
  if (typeof estimatedTime === 'object') return { error: estimatedTime }
  const dueDate = optionalString(input.dueDate, 'dueDate', 50)
  if (typeof dueDate === 'object') return { error: dueDate }
  if ([title, status, priority, estimatedTime, dueDate].every((value) => value === undefined)) {
    return { error: { message: '至少提供一个可更新字段', details: { fields: 'empty' } } }
  }
  const metadata = parseMutationMetadata(input, fallbackClientMutationId)
  if (metadata.error) return { error: metadata.error }
  return {
    value: { title, status, priority, estimatedTime, dueDate, ...metadata.value },
  }
}

export function validateJobControl(input: unknown, fallbackClientMutationId: string): { value?: JobControlRequest; error?: ValidationFailure } {
  if (!isRecord(input)) {
    return { error: { message: '请求体必须是 JSON 对象', details: { body: 'object_required' } } }
  }
  const action = enumValue(input.action, ['pause', 'resume', 'cancel', 'retry'] as const, 'action')
  if (typeof action === 'object' || action === undefined) {
    return { error: typeof action === 'object' ? action : { message: 'action 为必填项', details: { field: 'action' } } }
  }
  const jobId = optionalString(input.jobId, 'jobId', 100)
  if (typeof jobId === 'object') return { error: jobId }
  const metadata = parseMutationMetadata(input, fallbackClientMutationId)
  if (metadata.error) return { error: metadata.error }
  return { value: { action: action as JobAction, jobId, ...metadata.value } }
}

export function validateReconnectModule(input: unknown, fallbackClientMutationId: string): { value?: ReconnectModuleRequest; error?: ValidationFailure } {
  if (input !== undefined && input !== null && !isRecord(input)) {
    return { error: { message: '请求体必须是 JSON 对象', details: { body: 'object_required' } } }
  }
  const body = isRecord(input) ? input : {}
  const moduleId = optionalString(body.moduleId, 'moduleId', 100)
  if (typeof moduleId === 'object') return { error: moduleId }
  const metadata = parseMutationMetadata(body, fallbackClientMutationId)
  if (metadata.error) return { error: metadata.error }
  return { value: { moduleId, ...metadata.value } }
}

export function isJobStatus(value: string): value is JobStatus {
  return Object.values(JobStatus).includes(value as JobStatus)
}
