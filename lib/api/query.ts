import { isJobStatus } from '@/lib/state/validators'
import { TaskStatus } from '@/lib/types/task'
import type { ValidationFailure } from '@/lib/state/validators'

export function parseLimit(value: string | null, defaultValue = 20, max = 100): number | ValidationFailure {
  if (value === null || value === '') return defaultValue
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    return {
      message: `limit 必须是 1 到 ${max} 之间的整数`,
      details: { field: 'limit', min: 1, max, received: value },
    }
  }
  return parsed
}

export function parseTaskStatus(value: string | null): TaskStatus | undefined | ValidationFailure {
  if (value === null || value === '') return undefined
  if (Object.values(TaskStatus).includes(value as TaskStatus)) return value as TaskStatus
  return { message: 'status 不是有效的 Task 状态', details: { field: 'status', received: value } }
}

export function parseJobStatus(value: string | null): string | undefined | ValidationFailure {
  if (value === null || value === '') return undefined
  if (isJobStatus(value)) return value
  return { message: 'status 不是有效的 Job 状态', details: { field: 'status', received: value } }
}
