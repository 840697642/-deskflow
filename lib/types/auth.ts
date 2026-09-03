import type { MutationMetadata } from './common'

export type AuthProvider = 'github' | 'google' | 'notion' | 'local' | 'openai' | (string & {})

export interface AuthRequirement {
  id: string
  type: 'job' | 'service'
  title: string
  provider: AuthProvider
  requiredScopes: string[]
  authUrl: string
  description: string
}

export interface AuthCallbackRequest extends MutationMetadata {
  type: 'job' | 'service'
  id: string
  code: string
  provider: string
}

export interface AuthCallbackResponse {
  success: boolean
  message: string
}
