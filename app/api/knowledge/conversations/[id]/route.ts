import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import { KnowledgeRouteContext, requestedSpaceMismatch } from '@/lib/knowledge-api'
export const dynamic = 'force-dynamic'; type Ctx = KnowledgeRouteContext<{ id: string }>
export async function GET(request: NextRequest, context: Ctx) { const { id } = await context.params; const item = getMockStore().knowledgeConversations.find((conversation) => conversation.id === id); if (!item) return jsonError(request, 404, 'CONVERSATION_NOT_FOUND', '对话不存在', false, { id }); const mismatch = requestedSpaceMismatch(request, item.spaceId); return mismatch ?? jsonSuccess(request, item) }
export async function DELETE(request: NextRequest, context: Ctx) { const { id } = await context.params; const store = getMockStore(); const item = store.knowledgeConversations.find((conversation) => conversation.id === id); if (!item) return jsonError(request, 404, 'CONVERSATION_NOT_FOUND', '对话不存在', false, { id }); store.knowledgeConversations.splice(store.knowledgeConversations.indexOf(item), 1); return jsonSuccess(request, { id, deleted: true }) }
