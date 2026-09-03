import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const module = getMockStore().modules.find((item) => item.id === id)
  if (!module) return jsonError(request, 404, 'MODULE_NOT_FOUND', '模块不存在', false, { moduleId: id })
  return jsonSuccess(request, module)
}
