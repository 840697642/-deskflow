import { hashApiKey } from '@/lib/knowledge-security'
import type { ApiKeyRecord } from '@/lib/types/knowledge'
const demo = 'sk_live_demo_knowledge_key'
export const mockKnowledgeApiKeys: ApiKeyRecord[] = [{ id: 'key-demo', name: 'Cursor 采集 Key', key: hashApiKey(demo), keyHash: hashApiKey(demo), keyPrefix: demo.slice(0, 8), scopes: ['save_conversation', 'save_error', 'search_knowledge'], spaceId: 'space-inbox', usageCount: 0, createdAt: '2026-09-04T10:00:00Z' }]
export const MOCK_API_KEYS = mockKnowledgeApiKeys
export const demoKnowledgeApiKey = demo
