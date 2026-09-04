import { createHash, randomBytes } from 'node:crypto'
import type { ApiKey, ApiKeyRecord } from '@/lib/types/knowledge'

export function hashApiKey(value: string): string { return createHash('sha256').update(value).digest('hex') }
export function createRawApiKey(): string { return `sk_live_${randomBytes(24).toString('hex')}` }
export function maskApiKey(keyPrefix: string): string { return `${keyPrefix}****` }
export function publicApiKey(record: ApiKeyRecord): ApiKey {
  const { keyHash: _keyHash, keyPrefix: _keyPrefix, ...publicRecord } = record
  return { ...publicRecord, key: maskApiKey(record.keyPrefix) }
}
