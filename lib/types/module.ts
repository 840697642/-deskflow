import type { MutationMetadata } from './common'

export enum ModuleHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  OFFLINE = 'offline',
  PERMISSION_REQUIRED = 'permission_required',
  CHECKING = 'checking',
}

export interface ModuleHealth {
  id: string
  name: string
  status: ModuleHealthStatus
  statusText: string
  lastHeartbeat: string
  canReconnect: boolean
  canStart: boolean
  errorMessage?: string
  metadata?: {
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
}

export interface ReconnectModuleRequest extends MutationMetadata {
  moduleId?: string
}
