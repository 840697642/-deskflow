import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { KnowledgeRouteContext } from '@/lib/knowledge-api'
export const dynamic = 'force-dynamic'; type Ctx = KnowledgeRouteContext<{ id: string }>
export async function DELETE(request: NextRequest, context: Ctx) { const { id } = await context.params; const key = getMockStore().knowledgeApiKeys.find((item) => item.id === id); if (!key) return jsonError(request, 404, 'API_KEY_NOT_FOUND', 'API Key 不存在', false, { id }); key.revokedAt = new Date().toISOString(); return jsonSuccess(request, { id, revoked: true }) }
