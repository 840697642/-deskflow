import type { MutationMetadata } from './common'

export enum TaskStatus {
  TODO = 'todo',
  DONE = 'done',
  BLOCKED = 'blocked',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  module: string
  estimatedTime: string
  projectId?: string
  createdAt: string
  updatedAt: string
  dueDate?: string
}

export interface CreateTaskRequest extends MutationMetadata {
  title: string
  priority?: TaskPriority
  module: string
  estimatedTime?: string
  dueDate?: string
}

export interface UpdateTaskRequest extends MutationMetadata {
  title?: string
  status?: TaskStatus
  priority?: TaskPriority
  estimatedTime?: string
  dueDate?: string
}

export interface CompleteTaskRequest extends MutationMetadata {
  taskId?: string
}
