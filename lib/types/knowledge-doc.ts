import type { MutationMetadata } from './common'

export type KnowledgeDocType = 'markdown' | 'pdf' | 'notion' | 'spreadsheet' | 'code'

export interface KnowledgeDoc {
  id: string
  title: string
  type: KnowledgeDocType
  path: string
  size: string
  updatedAt: string
  pinned: boolean
  tags?: string[]
  previewText?: string
  icon?: string
}

export interface PinDocRequest extends MutationMetadata {
  pinned: boolean
}
